import { motion } from 'framer-motion';

interface ScoreBoardProps {
  player1Score: number;
  player2Score: number;
  isTwoPlayer: boolean;
}

export const ScoreBoard = ({ player1Score, player2Score, isTwoPlayer }: ScoreBoardProps) => {
  return (
    <div className="flex items-center justify-center gap-8 md:gap-16 mb-6">
      <motion.div 
        className="text-center"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <p className="text-sm md:text-base font-orbitron text-primary mb-1">PLAYER 1</p>
        <motion.p 
          className="text-4xl md:text-6xl font-pixel text-primary text-glow-cyan"
          key={player1Score}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {player1Score}
        </motion.p>
      </motion.div>

      <div className="text-3xl md:text-5xl font-pixel text-accent text-glow-purple">VS</div>

      <motion.div 
        className="text-center"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <p className="text-sm md:text-base font-orbitron text-secondary mb-1">
          {isTwoPlayer ? 'PLAYER 2' : 'AI'}
        </p>
        <motion.p 
          className="text-4xl md:text-6xl font-pixel text-secondary text-glow-pink"
          key={player2Score}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {player2Score}
        </motion.p>
      </motion.div>
    </div>
  );
};
