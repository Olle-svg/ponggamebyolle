import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModeSelector } from '@/components/game/ModeSelector';
import { GameCanvas } from '@/components/game/GameCanvas';
import { ScoreBoard } from '@/components/game/ScoreBoard';
import { GameOver } from '@/components/game/GameOver';
import { ArrowLeft, Play, Pause } from 'lucide-react';

const WIN_SCORE = 5;

const Index = () => {
  const [gameMode, setGameMode] = useState<'menu' | 'playing'>('menu');
  const [isTwoPlayer, setIsTwoPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const handleSelectMode = (twoPlayer: boolean) => {
    setIsTwoPlayer(twoPlayer);
    setGameMode('playing');
    setIsPlaying(true);
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
  };

  const handleScoreUpdate = useCallback((player1: number, player2: number) => {
    setScores({ player1, player2 });
  }, []);

  const handleGameOver = useCallback((winnerName: string) => {
    setIsPlaying(false);
    setWinner(winnerName);
  }, []);

  const handleRestart = () => {
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
    setIsPlaying(true);
    setGameKey(prev => prev + 1);
  };

  const handleMainMenu = () => {
    setGameMode('menu');
    setIsPlaying(false);
    setWinner(null);
    setScores({ player1: 0, player2: 0 });
  };

  const togglePause = () => {
    setIsPlaying(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {gameMode === 'menu' ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="relative z-10"
          >
            <ModeSelector onSelectMode={handleSelectMode} />
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 w-full max-w-4xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleMainMenu}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted
                           transition-all font-orbitron text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Menu
              </button>

              <h2 className="text-xl font-pixel text-accent text-glow-purple">
                {isTwoPlayer ? 'PVP MODE' : 'VS AI'}
              </h2>

              <button
                onClick={togglePause}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted
                           transition-all font-orbitron text-sm text-muted-foreground hover:text-foreground"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>

            {/* Score */}
            <ScoreBoard 
              player1Score={scores.player1} 
              player2Score={scores.player2}
              isTwoPlayer={isTwoPlayer}
            />

            {/* Game Canvas */}
            <div className="flex justify-center">
              <GameCanvas
                key={gameKey}
                isTwoPlayer={isTwoPlayer}
                onScoreUpdate={handleScoreUpdate}
                onGameOver={handleGameOver}
                isPlaying={isPlaying}
                winScore={WIN_SCORE}
              />
            </div>

            {/* Instructions */}
            <motion.div 
              className="mt-6 text-center text-sm text-muted-foreground font-orbitron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p>First to <span className="text-accent">{WIN_SCORE}</span> wins!</p>
            </motion.div>

            {/* Pause overlay */}
            <AnimatePresence>
              {!isPlaying && !winner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-40"
                  onClick={togglePause}
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-pixel text-accent text-glow-purple"
                  >
                    PAUSED
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {winner && (
          <GameOver 
            winner={winner} 
            onRestart={handleRestart} 
            onMainMenu={handleMainMenu} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
