import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface JoinPartyProps {
  onJoin: (code: string) => Promise<boolean>;
  onBack: () => void;
  isConnecting: boolean;
  error: string | null;
}

export const JoinParty = ({ onJoin, onBack, isConnecting, error }: JoinPartyProps) => {
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 5) {
      await onJoin(code);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 5) {
      setCode(value);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card/50 backdrop-blur-sm neon-border-pink"
    >
      <h2 className="text-2xl font-pixel text-secondary">JOIN PARTY</h2>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground font-orbitron">Enter party code:</p>
        
        <input
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="XXXXX"
          className="w-64 px-6 py-4 text-center text-3xl font-pixel tracking-[0.3em] 
                     bg-background/50 rounded-xl neon-border-pink text-secondary
                     placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 
                     focus:ring-secondary/50 transition-all uppercase"
          autoFocus
          disabled={isConnecting}
        />

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-400 font-orbitron"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={code.length !== 5 || isConnecting}
          className="px-8 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all
                     font-orbitron text-secondary-foreground font-bold disabled:opacity-50 
                     disabled:cursor-not-allowed flex items-center gap-2"
          whileHover={{ scale: code.length === 5 ? 1.05 : 1 }}
          whileTap={{ scale: code.length === 5 ? 0.98 : 1 }}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Joining...
            </>
          ) : (
            'JOIN GAME'
          )}
        </motion.button>
      </form>

      <motion.button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted
                   transition-all font-orbitron text-sm text-muted-foreground hover:text-foreground mt-2"
        whileHover={{ x: -5 }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>
    </motion.div>
  );
};
