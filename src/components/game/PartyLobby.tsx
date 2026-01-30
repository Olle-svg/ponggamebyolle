import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { PartyState } from '@/hooks/useMultiplayer';

interface PartyLobbyProps {
  party: PartyState;
  isHost: boolean;
  onStartGame: () => void;
  onLeave: () => void;
}

export const PartyLobby = ({ party, isHost, onStartGame, onLeave }: PartyLobbyProps) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(party.party_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isReady = party.guest_id !== null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card/50 backdrop-blur-sm neon-border"
    >
      <div className="flex items-center gap-2 text-accent">
        <Users className="w-6 h-6" />
        <h2 className="text-2xl font-pixel">PARTY LOBBY</h2>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground font-orbitron">Share this code with your friend:</p>
        <motion.button
          onClick={copyCode}
          className="flex items-center gap-3 px-6 py-4 rounded-xl bg-primary/20 hover:bg-primary/30 
                     transition-all neon-border group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-3xl font-pixel text-primary tracking-[0.3em]">
            {party.party_code}
          </span>
          {copied ? (
            <Check className="w-5 h-5 text-green-400" />
          ) : (
            <Copy className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
          )}
        </motion.button>
      </div>

      <div className="flex flex-col items-center gap-4 mt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-orbitron text-primary">You (Host)</span>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isReady ? 'bg-secondary/20' : 'bg-muted/20'
          }`}>
            {isReady ? (
              <>
                <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                <span className="text-sm font-orbitron text-secondary">Guest Connected</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                <span className="text-sm font-orbitron text-muted-foreground">Waiting for guest...</span>
              </>
            )}
          </div>
        </div>

        {isHost && isReady && (
          <motion.button
            onClick={onStartGame}
            className="px-8 py-3 rounded-xl bg-accent hover:bg-accent/80 transition-all
                       font-orbitron text-accent-foreground font-bold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            START GAME
          </motion.button>
        )}

        {!isHost && (
          <div className="text-sm text-muted-foreground font-orbitron">
            Waiting for host to start...
          </div>
        )}
      </div>

      <motion.button
        onClick={onLeave}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted
                   transition-all font-orbitron text-sm text-muted-foreground hover:text-foreground mt-4"
        whileHover={{ x: -5 }}
      >
        <ArrowLeft className="w-4 h-4" />
        Leave Party
      </motion.button>
    </motion.div>
  );
};
