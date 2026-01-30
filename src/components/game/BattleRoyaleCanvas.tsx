import { useEffect, useRef, useCallback, useState } from 'react';

interface Player {
  id: string;
  angle: number; // Position on the hexagon (0-360 degrees)
  paddlePos: number; // -1 to 1 along their edge
  isEliminated: boolean;
  color: string;
  name: string;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

interface BattleRoyaleCanvasProps {
  players: Player[];
  isPlaying: boolean;
  localPlayerId: string;
  onPaddleMove: (pos: number) => void;
  onBallUpdate?: (ball: Ball) => void;
  onPlayerEliminated?: (playerId: string) => void;
  onScoreUpdate?: (scores: Record<string, number>) => void;
  isHost: boolean;
  remoteBall?: { x: number; y: number; vx: number; vy: number };
}

const PLAYER_COLORS = [
  'hsl(180, 100%, 50%)',  // Cyan
  'hsl(320, 100%, 60%)',  // Pink
  'hsl(50, 100%, 50%)',   // Yellow
  'hsl(120, 100%, 40%)',  // Green
  'hsl(270, 100%, 60%)',  // Purple
];

const PADDLE_LENGTH = 60;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 12;
const INITIAL_BALL_SPEED = 4;
const MAX_BALL_SPEED = 10;

export const BattleRoyaleCanvas = ({
  players,
  isPlaying,
  localPlayerId,
  onPaddleMove,
  onBallUpdate,
  onPlayerEliminated,
  isHost,
  remoteBall,
}: BattleRoyaleCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  
  const localPaddleRef = useRef(0);
  const ballRef = useRef<Ball>({
    x: 300,
    y: 300,
    vx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    vy: INITIAL_BALL_SPEED * (Math.random() - 0.5),
    speed: INITIAL_BALL_SPEED,
  });
  const lastUpdateRef = useRef(0);

  const activePlayers = players.filter(p => !p.isEliminated);
  const numSides = Math.max(activePlayers.length, 3);
  const angleStep = (2 * Math.PI) / numSides;

  const getPolygonPoints = useCallback((centerX: number, centerY: number, radius: number, sides: number) => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }
    return points;
  }, []);

  const getEdgeMidpoint = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }, pos: number) => {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (dx / len) * pos * (len / 2 - PADDLE_LENGTH / 2);
    const offsetY = (dy / len) * pos * (len / 2 - PADDLE_LENGTH / 2);
    return { x: midX + offsetX, y: midY + offsetY, dx: dx / len, dy: dy / len };
  }, []);

  const resetBall = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const angle = Math.random() * 2 * Math.PI;
    ballRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: INITIAL_BALL_SPEED * Math.cos(angle),
      vy: INITIAL_BALL_SPEED * Math.sin(angle),
      speed: INITIAL_BALL_SPEED,
    };
  }, []);

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    const keys = keysRef.current;
    const now = Date.now();

    // Update local paddle
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
      localPaddleRef.current = Math.max(localPaddleRef.current - 0.05, -1);
    }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
      localPaddleRef.current = Math.min(localPaddleRef.current + 0.05, 1);
    }

    // Throttle paddle updates
    if (now - lastUpdateRef.current > 50) {
      onPaddleMove(localPaddleRef.current);
      lastUpdateRef.current = now;
    }

    // Only host handles ball physics
    if (isHost) {
      const ball = ballRef.current;
      
      ball.x += ball.vx;
      ball.y += ball.vy;

      const points = getPolygonPoints(centerX, centerY, radius, numSides);

      // Check collision with each edge
      for (let i = 0; i < numSides; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % numSides];
        const player = activePlayers[i];

        // Edge normal (pointing inward)
        const edgeDx = p2.x - p1.x;
        const edgeDy = p2.y - p1.y;
        const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
        const normalX = -edgeDy / edgeLen;
        const normalY = edgeDx / edgeLen;

        // Distance from ball to edge line
        const dx = ball.x - p1.x;
        const dy = ball.y - p1.y;
        const dist = dx * normalX + dy * normalY;

        if (dist < BALL_SIZE / 2 && dist > -20) {
          // Check if within edge bounds
          const t = (dx * edgeDx + dy * edgeDy) / (edgeLen * edgeLen);
          
          if (t >= 0 && t <= 1) {
            // Get paddle position for this player
            const paddlePos = player?.id === localPlayerId 
              ? localPaddleRef.current 
              : (player?.paddlePos || 0);
            
            const paddleT = (paddlePos + 1) / 2; // Convert -1..1 to 0..1
            const paddleStart = paddleT - (PADDLE_LENGTH / edgeLen) / 2;
            const paddleEnd = paddleT + (PADDLE_LENGTH / edgeLen) / 2;

            // Check if hit paddle
            if (t >= Math.max(0, paddleStart) && t <= Math.min(1, paddleEnd)) {
              // Bounce off paddle
              const dot = ball.vx * normalX + ball.vy * normalY;
              ball.vx -= 2 * dot * normalX;
              ball.vy -= 2 * dot * normalY;
              
              // Speed up
              ball.speed = Math.min(ball.speed * 1.05, MAX_BALL_SPEED);
              const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
              ball.vx = (ball.vx / currentSpeed) * ball.speed;
              ball.vy = (ball.vy / currentSpeed) * ball.speed;
              
              // Move ball away from edge
              ball.x += normalX * 10;
              ball.y += normalY * 10;
            } else if (player && !player.isEliminated) {
              // Missed paddle - player eliminated
              onPlayerEliminated?.(player.id);
              resetBall();
            }
          }
        }
      }

      // Update remote ball
      if (now - lastUpdateRef.current > 30) {
        onBallUpdate?.(ball);
      }
    } else if (remoteBall) {
      // Sync ball from host
      ballRef.current = { ...ballRef.current, ...remoteBall, speed: ballRef.current.speed };
    }
  }, [isPlaying, isHost, localPlayerId, numSides, activePlayers, onPaddleMove, onBallUpdate, onPlayerEliminated, resetBall, getPolygonPoints, remoteBall]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Background
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'hsl(240, 20%, 8%)');
    gradient.addColorStop(1, 'hsl(240, 20%, 3%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const points = getPolygonPoints(centerX, centerY, radius, numSides);

    // Draw arena border
    ctx.strokeStyle = 'hsla(270, 100%, 65%, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw each player's edge and paddle
    for (let i = 0; i < activePlayers.length; i++) {
      const player = activePlayers[i];
      const p1 = points[i];
      const p2 = points[(i + 1) % numSides];
      const color = PLAYER_COLORS[i % PLAYER_COLORS.length];

      // Draw edge glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Draw paddle
      const paddlePos = player.id === localPlayerId 
        ? localPaddleRef.current 
        : player.paddlePos;
      
      const edgeDx = p2.x - p1.x;
      const edgeDy = p2.y - p1.y;
      const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
      const normalX = -edgeDy / edgeLen;
      const normalY = edgeDx / edgeLen;
      
      const paddleCenter = ((paddlePos + 1) / 2) * edgeLen;
      const paddleCenterX = p1.x + (edgeDx / edgeLen) * paddleCenter;
      const paddleCenterY = p1.y + (edgeDy / edgeLen) * paddleCenter;

      ctx.shadowBlur = 25;
      ctx.fillStyle = color;
      ctx.beginPath();
      
      // Draw paddle as a rectangle along the edge
      const hw = PADDLE_LENGTH / 2;
      const hd = PADDLE_WIDTH / 2;
      const paddlePoints = [
        { x: paddleCenterX - (edgeDx / edgeLen) * hw + normalX * hd, y: paddleCenterY - (edgeDy / edgeLen) * hw + normalY * hd },
        { x: paddleCenterX + (edgeDx / edgeLen) * hw + normalX * hd, y: paddleCenterY + (edgeDy / edgeLen) * hw + normalY * hd },
        { x: paddleCenterX + (edgeDx / edgeLen) * hw - normalX * hd, y: paddleCenterY + (edgeDy / edgeLen) * hw - normalY * hd },
        { x: paddleCenterX - (edgeDx / edgeLen) * hw - normalX * hd, y: paddleCenterY - (edgeDy / edgeLen) * hw - normalY * hd },
      ];
      
      ctx.moveTo(paddlePoints[0].x, paddlePoints[0].y);
      for (const pt of paddlePoints.slice(1)) {
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fill();

      // Draw player name
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.font = '12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      const labelX = centerX + (centerX - points[i].x) * -0.15 + (p1.x + p2.x) / 2 * 0.15;
      const labelY = centerY + (centerY - points[i].y) * -0.15 + (p1.y + p2.y) / 2 * 0.15;
      ctx.fillText(player.name, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 20);
    }

    // Draw ball
    const ball = ballRef.current;
    ctx.shadowColor = 'hsl(50, 100%, 50%)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'hsl(50, 100%, 50%)';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }, [activePlayers, numSides, localPlayerId, getPolygonPoints]);

  const gameLoop = useCallback(() => {
    update();
    draw();
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const size = Math.min(container.clientWidth - 40, 600);
        setDimensions({ width: size, height: size });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      ballRef.current = {
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
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
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
      className="rounded-xl neon-border"
    />
  );
};
