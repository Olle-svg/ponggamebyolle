import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModeSelector } from '@/components/game/ModeSelector';
import { GameCanvas } from '@/components/game/GameCanvas';
import { OnlineCanvas } from '@/components/game/OnlineCanvas';
import { BattleRoyaleCanvas } from '@/components/game/BattleRoyaleCanvas';
import { ScoreBoard } from '@/components/game/ScoreBoard';
import { GameOver } from '@/components/game/GameOver';
import { PartyLobby } from '@/components/game/PartyLobby';
import { JoinParty } from '@/components/game/JoinParty';
import { PlayerCountSelector } from '@/components/game/PlayerCountSelector';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { ArrowLeft, Play, Pause, Wifi } from 'lucide-react';
import { Difficulty } from '@/components/game/GameCanvas';

const WIN_SCORE = 5;

type GameScreen = 'menu' | 'join-party' | 'party-lobby' | 'player-count' | 'difficulty-select' | 'playing-local' | 'playing-online' | 'playing-battle-royale';

const Index = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [isTwoPlayer, setIsTwoPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

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

  // Battle royale players mock (in real implementation, sync from party)
  const [battlePlayers, setBattlePlayers] = useState<Array<{
    id: string;
    angle: number;
    paddlePos: number;
    isEliminated: boolean;
    color: string;
    name: string;
  }>>([]);

  const handleDifficultySelect = (diff: Difficulty) => {
    setDifficulty(diff);
    setScreen('playing-local');
    setIsPlaying(true);
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
  };

  const handleSelectMode = async (mode: 'single' | 'local' | 'online-create' | 'online-join') => {
    if (mode === 'single') {
      setIsTwoPlayer(false);
      setScreen('difficulty-select');
    } else if (mode === 'local') {
      setIsTwoPlayer(true);
      setScreen('playing-local');
      setIsPlaying(true);
      setScores({ player1: 0, player2: 0 });
      setWinner(null);
    } else if (mode === 'online-create') {
      setScreen('player-count');
    } else if (mode === 'online-join') {
      setScreen('join-party');
    }
  };

  const handleCreateBattleRoyaleParty = async () => {
    const code = await createParty();
    if (code) {
      // Initialize battle royale players — use real playerId for host slot
      const players = Array.from({ length: selectedPlayerCount }, (_, i) => ({
        id: i === 0 ? playerId : `waiting_${i}`,
        angle: (360 / selectedPlayerCount) * i,
        paddlePos: 0,
        isEliminated: false,
        color: ['cyan', 'pink', 'yellow', 'green', 'purple'][i],
        name: i === 0 ? 'Host' : `Player ${i + 1}`,
      }));
      setBattlePlayers(players);
      setScreen('party-lobby');
    }
  };

  const handleJoinParty = async (code: string) => {
    const success = await joinParty(code);
    if (success) {
      // Check if it's a battle royale game
      if (party && party.max_players && party.max_players > 2) {
        setScreen('playing-battle-royale');
      } else {
        setScreen('playing-online');
      }
      setIsPlaying(true);
      setScores({ player1: 0, player2: 0 });
      setWinner(null);
    }
    return success;
  };

  const handleStartOnlineGame = async () => {
    await updateGameStatus('playing');
    
    if (selectedPlayerCount > 2) {
      setScreen('playing-battle-royale');
    } else {
      setScreen('playing-online');
    }
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

  const handlePlayerEliminated = useCallback((playerId: string) => {
    setBattlePlayers(prev => 
      prev.map(p => p.id === playerId ? { ...p, isEliminated: true } : p)
    );
    
    const remaining = battlePlayers.filter(p => !p.isEliminated && p.id !== playerId);
    if (remaining.length === 1) {
      handleGameOver(remaining[0].name);
    }
  }, [battlePlayers, handleGameOver]);

  const handleRestart = () => {
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
    setIsPlaying(true);
    setGameKey(prev => prev + 1);
    setBattlePlayers(prev => prev.map(p => ({ ...p, isEliminated: false })));
  };

  const handleMainMenu = async () => {
    if (party) {
      await leaveParty();
    }
    setScreen('menu');
    setIsPlaying(false);
    setWinner(null);
    setScores({ player1: 0, player2: 0 });
    setBattlePlayers([]);
  };

  const togglePause = () => {
    setIsPlaying(prev => !prev);
  };

  // Listen for game status changes in online mode
  useEffect(() => {
    if (party?.game_status === 'playing' && screen === 'party-lobby') {
      if (selectedPlayerCount > 2) {
        setScreen('playing-battle-royale');
      } else {
        setScreen('playing-online');
      }
      setIsPlaying(true);
    }
  }, [party?.game_status, screen, selectedPlayerCount]);

  // Sync battle royale player IDs from party when guests join
  useEffect(() => {
    if (!party?.player_ids || party.player_ids.length === 0) return;
    setBattlePlayers(prev =>
      prev.map((p, i) => ({
        ...p,
        id: party.player_ids[i] ?? p.id,
        name: i === 0 ? 'Host' : `Player ${i + 1}`,
      }))
    );
  }, [party?.player_ids]);

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

        {screen === 'player-count' && (
          <motion.div
            key="player-count"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <PlayerCountSelector
              selectedCount={selectedPlayerCount}
              onSelect={setSelectedPlayerCount}
              onConfirm={handleCreateBattleRoyaleParty}
              onBack={() => setScreen('menu')}
            />
          </motion.div>
        )}

        {screen === 'difficulty-select' && (
          <motion.div
            key="difficulty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 text-center"
          >
            <h2 className="text-2xl font-pixel text-accent mb-2 text-glow-purple">SELECT DIFFICULTY</h2>
            <p className="text-sm text-muted-foreground font-orbitron mb-8">VS AI mode</p>
            <div className="flex flex-col gap-4 items-center">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => handleDifficultySelect(d)}
                  className="w-48 px-8 py-4 rounded-lg font-pixel text-base uppercase
                             bg-muted/50 hover:bg-accent/20 border border-accent/30
                             hover:border-accent transition-all text-foreground hover:text-accent"
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              onClick={() => setScreen('menu')}
              className="mt-8 flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted
                         transition-all font-orbitron text-sm text-muted-foreground hover:text-foreground mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
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
                  difficulty={isTwoPlayer ? undefined : difficulty}
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

        {screen === 'playing-battle-royale' && (
          <motion.div
            key="battle-royale"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 w-full max-w-3xl"
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
                <Wifi className="w-4 h-4 text-accent" />
                <h2 className="text-xl font-pixel text-accent text-glow-purple">
                  BATTLE ROYALE
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

            {/* Players alive indicator */}
            <div className="flex justify-center gap-4 mb-4">
              {battlePlayers.map((player, i) => (
                <div
                  key={player.id}
                  className={`px-3 py-1 rounded-lg font-orbitron text-xs transition-all
                    ${player.isEliminated 
                      ? 'bg-muted/30 text-muted-foreground line-through' 
                      : 'bg-accent/20 text-accent'}`}
                >
                  {player.name}
                </div>
              ))}
            </div>

            {/* Battle Royale Canvas */}
            <div className="flex justify-center">
              <BattleRoyaleCanvas
                key={gameKey}
                players={battlePlayers}
                isPlaying={isPlaying}
                localPlayerId={playerId}
                onPaddleMove={updatePaddlePosition}
                onBallUpdate={(ball) => updateBallState(ball.x, ball.y, ball.vx, ball.vy)}
                onPlayerEliminated={handlePlayerEliminated}
                isHost={isHost}
              />
            </div>

            {/* Instructions */}
            <motion.div 
              className="mt-6 text-center text-sm text-muted-foreground font-orbitron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p>Use <span className="text-accent">← / A</span> and <span className="text-accent">→ / D</span> to move your paddle</p>
              <p className="text-xs mt-2">Last player standing wins!</p>
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
