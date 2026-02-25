import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface PlayerCountSelectorProps {
  selectedCount: number;
  onSelect: (count: number) => void;
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const PlayerCountSelector = ({
  selectedCount,
  onSelect,
  onConfirm,
  onBack,
  isLoading = false,
  error = null,
}: PlayerCountSelectorProps) => {
  const playerCounts = [2, 3, 4, 5];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card/50 backdrop-blur-sm neon-border"
    >
      <div className="flex items-center gap-2 text-accent">
        <Users className="w-6 h-6" />
        <h2 className="text-2xl font-pixel">BATTLE ROYALE</h2>
      </div>

      <p className="text-sm text-muted-foreground font-orbitron text-center max-w-xs">
        Choose how many players will battle in the arena. Each player defends their side of the polygon!
      </p>

      <div className="flex gap-3">
        {playerCounts.map((count) => (
          <motion.button
            key={count}
            onClick={() => onSelect(count)}
            className={`w-16 h-16 rounded-xl font-pixel text-2xl transition-all
              ${selectedCount === count 
                ? 'bg-accent text-accent-foreground neon-border' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {count}
          </motion.button>
        ))}
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground font-orbitron mb-1">
          {selectedCount} players = {selectedCount}-sided arena
        </p>
        <p className="text-xs text-muted-foreground font-orbitron">
          Last player standing wins!
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive font-orbitron">{error}</p>
      )}

      <div className="flex gap-4">
        <motion.button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 rounded-lg bg-muted/50 hover:bg-muted transition-all
                     font-orbitron text-muted-foreground disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Back
        </motion.button>

        <motion.button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-8 py-3 rounded-lg bg-accent hover:bg-accent/80 transition-all
                     font-orbitron text-accent-foreground font-bold disabled:opacity-70"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? 'CREATING...' : 'CREATE PARTY'}
        </motion.button>
      </div>
    </motion.div>
  );
};
