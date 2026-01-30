import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home } from 'lucide-react';

interface GameOverProps {
  winner: string;
  onRestart?: () => void;
  onMainMenu: () => void;
}

export const GameOver = ({ winner, onRestart, onMainMenu }: GameOverProps) => {
  const isPlayer1 = winner === 'Player 1' || winner === 'Host';

  return (
    <motion.div 
      className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="text-center p-8 rounded-2xl bg-card/80 neon-border max-w-md mx-4"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
      >
        <motion.div
          initial={{ rotate: -20, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
        >
          <Trophy className={`w-20 h-20 mx-auto mb-4 ${isPlayer1 ? 'text-primary' : 'text-secondary'}`} />
        </motion.div>

        <motion.h2 
          className="text-3xl md:text-4xl font-pixel mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className={isPlayer1 ? 'text-primary text-glow-cyan' : 'text-secondary text-glow-pink'}>
            {winner}
          </span>
        </motion.h2>

        <motion.p 
          className="text-2xl font-orbitron text-foreground mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          WINS!
        </motion.p>

        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {onRestart && (
            <button
              onClick={onRestart}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg neon-border
                         bg-primary/20 hover:bg-primary/30 transition-all font-orbitron text-primary"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </button>
          )}
          
          <button
            onClick={onMainMenu}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg neon-border-pink
                       bg-secondary/20 hover:bg-secondary/30 transition-all font-orbitron text-secondary"
          >
            <Home className="w-5 h-5" />
            Main Menu
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
