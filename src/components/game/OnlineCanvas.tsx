import { useEffect, useRef, useCallback, useState } from 'react';
import { PartyState } from '@/hooks/useMultiplayer';
import { soundEngine } from '@/lib/sound';

interface OnlineCanvasProps {
  party: PartyState;
  isHost: boolean;
  isPlaying: boolean;
  onPaddleMove: (y: number) => void;
  onBallUpdate: (x: number, y: number, dx: number, dy: number) => void;
  onScore: (hostScore: number, guestScore: number) => void;
  onGameOver: (winner: string) => void;
  winScore: number;
}

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 12;
const BALL_SIZE = 14;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 6;
const MAX_BALL_SPEED = 12;

export const OnlineCanvas = ({
  party,
  isHost,
  isPlaying,
  onPaddleMove,
  onBallUpdate,
  onScore,
  onGameOver,
  winScore,
}: OnlineCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Local ball state for host (smooth physics)
  const localBallRef = useRef({
    x: 400,
    y: 250,
    vx: INITIAL_BALL_SPEED,
    vy: 0,
    speed: INITIAL_BALL_SPEED,
  });

  const localPaddleRef = useRef({ y: 200 });
  const paddleUpdateRef = useRef(0); // separate throttle ref for paddle
  const ballUpdateRef = useRef(0);   // separate throttle ref for ball

  const resetBall = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    localBallRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      vy: INITIAL_BALL_SPEED * (Math.random() - 0.5),
      speed: INITIAL_BALL_SPEED,
    };
  }, []);

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;

    const { width, height } = canvas;
    const keys = keysRef.current;
    const now = Date.now();

    // Update local paddle
    if (isHost) {
      if (keys.has('w') || keys.has('W')) {
        localPaddleRef.current.y = Math.max(localPaddleRef.current.y - PADDLE_SPEED, 0);
      }
      if (keys.has('s') || keys.has('S')) {
        localPaddleRef.current.y = Math.min(localPaddleRef.current.y + PADDLE_SPEED, height - PADDLE_HEIGHT);
      }
    } else {
      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) {
        localPaddleRef.current.y = Math.max(localPaddleRef.current.y - PADDLE_SPEED, 0);
      }
      if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) {
        localPaddleRef.current.y = Math.min(localPaddleRef.current.y + PADDLE_SPEED, height - PADDLE_HEIGHT);
      }
    }

    // Throttle paddle updates — send normalized 0-100 percentage, not raw pixels
    if (now - paddleUpdateRef.current > 50) {
      onPaddleMove((localPaddleRef.current.y / height) * 100);
      paddleUpdateRef.current = now;
    }

    // Only host handles ball physics
    if (isHost) {
      const ball = localBallRef.current;

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Ball collision with top/bottom
      if (ball.y <= BALL_SIZE / 2 || ball.y >= height - BALL_SIZE / 2) {
        ball.vy *= -1;
        ball.y = Math.max(BALL_SIZE / 2, Math.min(height - BALL_SIZE / 2, ball.y));
        soundEngine.wallBounce();
      }

      const paddle1Right = 30 + PADDLE_WIDTH;
      const paddle2Left = width - 30 - PADDLE_WIDTH;

      // Host paddle (left) — use local position for accurate collision
      const hostPaddleY = localPaddleRef.current.y;
      if (
        ball.x - BALL_SIZE / 2 <= paddle1Right &&
        ball.x + BALL_SIZE / 2 >= 30 &&
        ball.y >= hostPaddleY &&
        ball.y <= hostPaddleY + PADDLE_HEIGHT &&
        ball.vx < 0
      ) {
        const hitPos = (ball.y - hostPaddleY) / PADDLE_HEIGHT - 0.5;
        ball.vx = Math.abs(ball.vx) * 1.05;
        ball.vy = hitPos * 10;
        ball.speed = Math.min(ball.speed * 1.05, MAX_BALL_SPEED);
        ball.x = paddle1Right + BALL_SIZE / 2;
        soundEngine.paddleHit();
      }

      // Guest paddle (right) — read normalized value from party state
      const guestPaddleY = (party.guest_paddle_y / 100) * height || height / 2 - PADDLE_HEIGHT / 2;
      if (
        ball.x + BALL_SIZE / 2 >= paddle2Left &&
        ball.x - BALL_SIZE / 2 <= width - 30 &&
        ball.y >= guestPaddleY &&
        ball.y <= guestPaddleY + PADDLE_HEIGHT &&
        ball.vx > 0
      ) {
        const hitPos = (ball.y - guestPaddleY) / PADDLE_HEIGHT - 0.5;
        ball.vx = -Math.abs(ball.vx) * 1.05;
        ball.vy = hitPos * 10;
        ball.speed = Math.min(ball.speed * 1.05, MAX_BALL_SPEED);
        ball.x = paddle2Left - BALL_SIZE / 2;
        soundEngine.paddleHit();
      }

      // Scoring
      let hostScore = party.host_score;
      let guestScore = party.guest_score;

      if (ball.x < 0) {
        guestScore++;
        onScore(hostScore, guestScore);
        soundEngine.score();
        if (guestScore >= winScore) {
          soundEngine.gameOver(false);
          onGameOver('Guest');
          return;
        }
        resetBall();
      }

      if (ball.x > width) {
        hostScore++;
        onScore(hostScore, guestScore);
        soundEngine.score();
        if (hostScore >= winScore) {
          soundEngine.gameOver(true);
          onGameOver('Host');
          return;
        }
        resetBall();
      }

      // Send ball updates on a separate throttle
      if (now - ballUpdateRef.current > 30) {
        onBallUpdate(
          (ball.x / width) * 100,
          (ball.y / height) * 100,
          ball.vx,
          ball.vy,
        );
        ballUpdateRef.current = now;
      }
    }
  }, [isHost, isPlaying, party, onPaddleMove, onBallUpdate, onScore, onGameOver, winScore, resetBall]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { width, height } = canvas;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'hsl(240, 20%, 4%)');
    gradient.addColorStop(0.5, 'hsl(240, 20%, 6%)');
    gradient.addColorStop(1, 'hsl(240, 20%, 4%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.setLineDash([20, 15]);
    ctx.strokeStyle = 'hsla(180, 100%, 50%, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowBlur = 25;

    // Host paddle (left - cyan)
    const hostPaddleY = isHost
      ? localPaddleRef.current.y
      : (party.host_paddle_y / 100) * height;
    ctx.shadowColor = 'hsl(180, 100%, 50%)';
    ctx.fillStyle = 'hsl(180, 100%, 50%)';
    ctx.fillRect(30, hostPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Guest paddle (right - pink)
    const guestPaddleY = !isHost
      ? localPaddleRef.current.y
      : (party.guest_paddle_y / 100) * height;
    ctx.shadowColor = 'hsl(320, 100%, 60%)';
    ctx.fillStyle = 'hsl(320, 100%, 60%)';
    ctx.fillRect(width - 30 - PADDLE_WIDTH, guestPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball
    const ballX = isHost
      ? localBallRef.current.x
      : (party.ball_x / 100) * width;
    const ballY = isHost
      ? localBallRef.current.y
      : (party.ball_y / 100) * height;

    ctx.shadowColor = 'hsl(50, 100%, 50%)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'hsl(50, 100%, 50%)';
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = 'hsla(270, 100%, 65%, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);
  }, [party, isHost]);

  const gameLoop = useCallback(() => {
    update();
    draw();
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 40, 900);
        const height = Math.min(width * 0.6, 500);
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      localPaddleRef.current.y = (canvas.height - PADDLE_HEIGHT) / 2;
      localBallRef.current = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        vy: INITIAL_BALL_SPEED * (Math.random() - 0.5),
        speed: INITIAL_BALL_SPEED,
      };
    }
  }, [dimensions]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="rounded-lg neon-border"
    />
  );
};
