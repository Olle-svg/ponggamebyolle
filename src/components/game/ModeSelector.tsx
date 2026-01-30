import { motion } from 'framer-motion';
import { User, Users, Wifi } from 'lucide-react';

interface ModeSelectorProps {
  onSelectMode: (mode: 'single' | 'local' | 'online-create' | 'online-join') => void;
}

export const ModeSelector = ({ onSelectMode }: ModeSelectorProps) => {
  return (
    <div className="flex flex-col items-center gap-8">
      <motion.h1 
        className="text-5xl md:text-7xl font-bold font-pixel text-glow-cyan text-primary"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        NEON PONG
      </motion.h1>
      
      <motion.p 
        className="text-lg text-muted-foreground font-orbitron"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Choose your game mode
      </motion.p>

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        <motion.button
          onClick={() => onSelectMode('single')}
          className="group relative px-8 py-6 rounded-xl neon-border bg-card/50 backdrop-blur-sm
                     hover:bg-primary/10 transition-all duration-300 min-w-[200px]"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex flex-col items-center gap-3">
            <User className="w-12 h-12 text-primary group-hover:text-glow-cyan transition-all" />
            <span className="text-xl font-orbitron font-bold text-primary">1 PLAYER</span>
            <span className="text-sm text-muted-foreground">vs AI</span>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onSelectMode('local')}
          className="group relative px-8 py-6 rounded-xl neon-border-pink bg-card/50 backdrop-blur-sm
                     hover:bg-secondary/10 transition-all duration-300 min-w-[200px]"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex flex-col items-center gap-3">
            <Users className="w-12 h-12 text-secondary group-hover:text-glow-pink transition-all" />
            <span className="text-xl font-orbitron font-bold text-secondary">2 PLAYERS</span>
            <span className="text-sm text-muted-foreground">Local PvP</span>
          </div>
        </motion.button>
      </div>

      {/* Online multiplayer section */}
      <motion.div
        className="flex flex-col items-center gap-4 mt-6"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-2 text-accent">
          <Wifi className="w-5 h-5" />
          <span className="text-sm font-orbitron">ONLINE MULTIPLAYER</span>
        </div>

        <div className="flex gap-4">
          <motion.button
            onClick={() => onSelectMode('online-create')}
            className="group relative px-6 py-4 rounded-xl bg-accent/20 hover:bg-accent/30 
                       transition-all duration-300 neon-border"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-lg font-orbitron font-bold text-accent">CREATE PARTY</span>
              <span className="text-xs text-muted-foreground">Host a game</span>
            </div>
          </motion.button>

          <motion.button
            onClick={() => onSelectMode('online-join')}
            className="group relative px-6 py-4 rounded-xl bg-accent/20 hover:bg-accent/30 
                       transition-all duration-300 neon-border"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-lg font-orbitron font-bold text-accent">JOIN PARTY</span>
              <span className="text-xs text-muted-foreground">Enter code</span>
            </div>
          </motion.button>
        </div>
      </motion.div>

      <motion.div 
        className="mt-8 text-center text-sm text-muted-foreground max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p className="mb-2"><span className="text-primary">Player 1:</span> W / S keys</p>
        <p><span className="text-secondary">Player 2:</span> ↑ / ↓ arrow keys</p>
      </motion.div>
    </div>
  );
};
