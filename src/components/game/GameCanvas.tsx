import { useEffect, useRef, useCallback, useState } from 'react';

interface GameCanvasProps {
  isTwoPlayer: boolean;
  onScoreUpdate: (player1: number, player2: number) => void;
  onGameOver: (winner: string) => void;
  isPlaying: boolean;
  winScore: number;
}

interface GameState {
  ball: { x: number; y: number; vx: number; vy: number; speed: number };
  paddle1: { y: number; score: number };
  paddle2: { y: number; score: number };
}

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 12;
const BALL_SIZE = 14;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 6;
const MAX_BALL_SPEED = 12;

export const GameCanvas = ({ 
  isTwoPlayer, 
  onScoreUpdate, 
  onGameOver, 
  isPlaying,
  winScore 
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    gameStateRef.current = {
      ball: {
        x: width / 2,
        y: height / 2,
        vx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        vy: INITIAL_BALL_SPEED * (Math.random() - 0.5),
        speed: INITIAL_BALL_SPEED,
      },
      paddle1: { y: height / 2 - PADDLE_HEIGHT / 2, score: 0 },
      paddle2: { y: height / 2 - PADDLE_HEIGHT / 2, score: 0 },
    };
  }, []);

  const resetBall = useCallback(() => {
    const canvas = canvasRef.current;
    const state = gameStateRef.current;
    if (!canvas || !state) return;

    state.ball.x = canvas.width / 2;
    state.ball.y = canvas.height / 2;
    state.ball.speed = INITIAL_BALL_SPEED;
    state.ball.vx = INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    state.ball.vy = INITIAL_BALL_SPEED * (Math.random() - 0.5);
  }, []);

  const updateAI = useCallback((state: GameState, height: number) => {
    const paddle = state.paddle2;
    const ball = state.ball;
    const paddleCenter = paddle.y + PADDLE_HEIGHT / 2;
    const aiSpeed = PADDLE_SPEED * 0.7;

    if (ball.vx > 0) {
      if (paddleCenter < ball.y - 30) {
        paddle.y = Math.min(paddle.y + aiSpeed, height - PADDLE_HEIGHT);
      } else if (paddleCenter > ball.y + 30) {
        paddle.y = Math.max(paddle.y - aiSpeed, 0);
      }
    } else {
      const centerY = height / 2 - PADDLE_HEIGHT / 2;
      if (paddle.y < centerY - 10) {
        paddle.y += aiSpeed * 0.5;
      } else if (paddle.y > centerY + 10) {
        paddle.y -= aiSpeed * 0.5;
      }
    }
  }, []);

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    const state = gameStateRef.current;
    if (!canvas || !state || !isPlaying) return;

    const { width, height } = canvas;
    const keys = keysRef.current;

    // Update paddle 1 (left) - W/S keys
    if (keys.has('w') || keys.has('W')) {
      state.paddle1.y = Math.max(state.paddle1.y - PADDLE_SPEED, 0);
    }
    if (keys.has('s') || keys.has('S')) {
      state.paddle1.y = Math.min(state.paddle1.y + PADDLE_SPEED, height - PADDLE_HEIGHT);
    }

    // Update paddle 2 (right) - Arrow keys or AI
    if (isTwoPlayer) {
      if (keys.has('ArrowUp')) {
        state.paddle2.y = Math.max(state.paddle2.y - PADDLE_SPEED, 0);
      }
      if (keys.has('ArrowDown')) {
        state.paddle2.y = Math.min(state.paddle2.y + PADDLE_SPEED, height - PADDLE_HEIGHT);
      }
    } else {
      updateAI(state, height);
    }

    // Update ball
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    // Ball collision with top/bottom
    if (state.ball.y <= BALL_SIZE / 2 || state.ball.y >= height - BALL_SIZE / 2) {
      state.ball.vy *= -1;
      state.ball.y = Math.max(BALL_SIZE / 2, Math.min(height - BALL_SIZE / 2, state.ball.y));
    }

    // Ball collision with paddles
    const paddle1Right = 30 + PADDLE_WIDTH;
    const paddle2Left = width - 30 - PADDLE_WIDTH;

    // Left paddle collision
    if (
      state.ball.x - BALL_SIZE / 2 <= paddle1Right &&
      state.ball.x + BALL_SIZE / 2 >= 30 &&
      state.ball.y >= state.paddle1.y &&
      state.ball.y <= state.paddle1.y + PADDLE_HEIGHT &&
      state.ball.vx < 0
    ) {
      const hitPos = (state.ball.y - state.paddle1.y) / PADDLE_HEIGHT - 0.5;
      state.ball.vx = Math.abs(state.ball.vx) * 1.05;
      state.ball.vy = hitPos * 10;
      state.ball.speed = Math.min(state.ball.speed * 1.05, MAX_BALL_SPEED);
      state.ball.x = paddle1Right + BALL_SIZE / 2;
    }

    // Right paddle collision
    if (
      state.ball.x + BALL_SIZE / 2 >= paddle2Left &&
      state.ball.x - BALL_SIZE / 2 <= width - 30 &&
      state.ball.y >= state.paddle2.y &&
      state.ball.y <= state.paddle2.y + PADDLE_HEIGHT &&
      state.ball.vx > 0
    ) {
      const hitPos = (state.ball.y - state.paddle2.y) / PADDLE_HEIGHT - 0.5;
      state.ball.vx = -Math.abs(state.ball.vx) * 1.05;
      state.ball.vy = hitPos * 10;
      state.ball.speed = Math.min(state.ball.speed * 1.05, MAX_BALL_SPEED);
      state.ball.x = paddle2Left - BALL_SIZE / 2;
    }

    // Scoring
    if (state.ball.x < 0) {
      state.paddle2.score++;
      onScoreUpdate(state.paddle1.score, state.paddle2.score);
      if (state.paddle2.score >= winScore) {
        onGameOver(isTwoPlayer ? 'Player 2' : 'AI');
        return;
      }
      resetBall();
    }

    if (state.ball.x > width) {
      state.paddle1.score++;
      onScoreUpdate(state.paddle1.score, state.paddle2.score);
      if (state.paddle1.score >= winScore) {
        onGameOver('Player 1');
        return;
      }
      resetBall();
    }
  }, [isTwoPlayer, isPlaying, onScoreUpdate, onGameOver, resetBall, updateAI, winScore]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = gameStateRef.current;
    if (!canvas || !ctx || !state) return;

    const { width, height } = canvas;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'hsl(240, 20%, 4%)');
    gradient.addColorStop(0.5, 'hsl(240, 20%, 6%)');
    gradient.addColorStop(1, 'hsl(240, 20%, 4%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.setLineDash([20, 15]);
    ctx.strokeStyle = 'hsla(180, 100%, 50%, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles with glow
    ctx.shadowBlur = 25;
    
    // Paddle 1 (Cyan)
    ctx.shadowColor = 'hsl(180, 100%, 50%)';
    ctx.fillStyle = 'hsl(180, 100%, 50%)';
    ctx.fillRect(30, state.paddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // Paddle 2 (Pink)
    ctx.shadowColor = 'hsl(320, 100%, 60%)';
    ctx.fillStyle = 'hsl(320, 100%, 60%)';
    ctx.fillRect(width - 30 - PADDLE_WIDTH, state.paddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball with glow
    ctx.shadowColor = 'hsl(50, 100%, 50%)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'hsl(50, 100%, 50%)';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw arena border
    ctx.strokeStyle = 'hsla(270, 100%, 65%, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);
  }, []);

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
    initGame();
  }, [initGame, dimensions]);

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
