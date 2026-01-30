import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModeSelector } from '@/components/game/ModeSelector';
import { GameCanvas } from '@/components/game/GameCanvas';
import { OnlineCanvas } from '@/components/game/OnlineCanvas';
import { ScoreBoard } from '@/components/game/ScoreBoard';
import { GameOver } from '@/components/game/GameOver';
import { PartyLobby } from '@/components/game/PartyLobby';
import { JoinParty } from '@/components/game/JoinParty';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { ArrowLeft, Play, Pause, Wifi } from 'lucide-react';

const WIN_SCORE = 5;

type GameScreen = 'menu' | 'join-party' | 'party-lobby' | 'playing-local' | 'playing-online';

const Index = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [isTwoPlayer, setIsTwoPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const {
    party,
    isHost,
    isConnecting,
    error,
    createParty,
    joinParty,
    updatePaddlePosition,
    updateBallState,
    updateScore,
    updateGameStatus,
    leaveParty,
  } = useMultiplayer();

  const handleSelectMode = async (mode: 'single' | 'local' | 'online-create' | 'online-join') => {
    if (mode === 'single') {
      setIsTwoPlayer(false);
      setScreen('playing-local');
      setIsPlaying(true);
      setScores({ player1: 0, player2: 0 });
      setWinner(null);
    } else if (mode === 'local') {
      setIsTwoPlayer(true);
      setScreen('playing-local');
      setIsPlaying(true);
      setScores({ player1: 0, player2: 0 });
      setWinner(null);
    } else if (mode === 'online-create') {
      const code = await createParty();
      if (code) {
        setScreen('party-lobby');
      }
    } else if (mode === 'online-join') {
      setScreen('join-party');
    }
  };

  const handleJoinParty = async (code: string) => {
    const success = await joinParty(code);
    if (success) {
      setScreen('playing-online');
      setIsPlaying(true);
      setScores({ player1: 0, player2: 0 });
      setWinner(null);
    }
    return success;
  };

  const handleStartOnlineGame = async () => {
    await updateGameStatus('playing');
    setScreen('playing-online');
    setIsPlaying(true);
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
  };

  const handleScoreUpdate = useCallback((player1: number, player2: number) => {
    setScores({ player1, player2 });
  }, []);

  const handleOnlineScore = useCallback(async (hostScore: number, guestScore: number) => {
    setScores({ player1: hostScore, player2: guestScore });
    await updateScore(hostScore, guestScore);
  }, [updateScore]);

  const handleGameOver = useCallback((winnerName: string) => {
    setIsPlaying(false);
    setWinner(winnerName);
  }, []);

  const handleOnlineGameOver = useCallback(async (winnerName: string) => {
    setIsPlaying(false);
    setWinner(winnerName);
    await updateGameStatus('finished');
  }, [updateGameStatus]);

  const handleRestart = () => {
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
    setIsPlaying(true);
    setGameKey(prev => prev + 1);
  };

  const handleMainMenu = async () => {
    if (party) {
      await leaveParty();
    }
    setScreen('menu');
    setIsPlaying(false);
    setWinner(null);
    setScores({ player1: 0, player2: 0 });
  };

  const togglePause = () => {
    setIsPlaying(prev => !prev);
  };

  // Listen for game status changes in online mode
  if (party?.game_status === 'playing' && screen === 'party-lobby') {
    setScreen('playing-online');
    setIsPlaying(true);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="relative z-10"
          >
            <ModeSelector onSelectMode={handleSelectMode} />
          </motion.div>
        )}

        {screen === 'join-party' && (
          <motion.div
            key="join"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <JoinParty
              onJoin={handleJoinParty}
              onBack={() => setScreen('menu')}
              isConnecting={isConnecting}
              error={error}
            />
          </motion.div>
        )}

        {screen === 'party-lobby' && party && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <PartyLobby
              party={party}
              isHost={isHost}
              onStartGame={handleStartOnlineGame}
              onLeave={handleMainMenu}
            />
          </motion.div>
        )}

        {(screen === 'playing-local' || screen === 'playing-online') && (
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

              <div className="flex items-center gap-2">
                {screen === 'playing-online' && (
                  <Wifi className="w-4 h-4 text-accent" />
                )}
                <h2 className="text-xl font-pixel text-accent text-glow-purple">
                  {screen === 'playing-online' 
                    ? `ONLINE ${isHost ? '(HOST)' : '(GUEST)'}`
                    : isTwoPlayer ? 'PVP MODE' : 'VS AI'}
                </h2>
              </div>

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
              isTwoPlayer={screen === 'playing-online' || isTwoPlayer}
              player1Label={screen === 'playing-online' ? 'Host' : undefined}
              player2Label={screen === 'playing-online' ? 'Guest' : undefined}
            />

            {/* Game Canvas */}
            <div className="flex justify-center">
              {screen === 'playing-local' ? (
                <GameCanvas
                  key={gameKey}
                  isTwoPlayer={isTwoPlayer}
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  isPlaying={isPlaying}
                  winScore={WIN_SCORE}
                />
              ) : party ? (
                <OnlineCanvas
                  key={gameKey}
                  party={party}
                  isHost={isHost}
                  isPlaying={isPlaying}
                  onPaddleMove={updatePaddlePosition}
                  onBallUpdate={updateBallState}
                  onScore={handleOnlineScore}
                  onGameOver={handleOnlineGameOver}
                  winScore={WIN_SCORE}
                />
              ) : null}
            </div>

            {/* Instructions */}
            <motion.div 
              className="mt-6 text-center text-sm text-muted-foreground font-orbitron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p>First to <span className="text-accent">{WIN_SCORE}</span> wins!</p>
              {screen === 'playing-online' && (
                <p className="mt-2 text-xs">
                  {isHost ? 'You control the left paddle (W/S)' : 'You control the right paddle (↑/↓ or W/S)'}
                </p>
              )}
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
            onRestart={screen === 'playing-local' ? handleRestart : undefined} 
            onMainMenu={handleMainMenu} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
