import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PartyState {
  id: string;
  party_code: string;
  host_id: string;
  guest_id: string | null;
  host_paddle_y: number;
  guest_paddle_y: number;
  ball_x: number;
  ball_y: number;
  ball_dx: number;
  ball_dy: number;
  host_score: number;
  guest_score: number;
  game_status: 'waiting' | 'playing' | 'paused' | 'finished';
  max_players: number;
  current_players: number;
  player_ids: string[];
  player_positions: unknown;
  eliminated_players: string[];
}

const generatePartyCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const generatePlayerId = (): string => {
  return `player_${Math.random().toString(36).substr(2, 9)}`;
};

export const useMultiplayer = () => {
  const [party, setParty] = useState<PartyState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [playerId] = useState(() => generatePlayerId());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const createParty = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    const partyCode = generatePartyCode();
    
    try {
      const { data, error: insertError } = await supabase
        .from('game_parties')
        .insert({
          party_code: partyCode,
          host_id: playerId,
          game_status: 'waiting',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setParty(data as PartyState);
      setIsHost(true);
      setIsConnecting(false);
      return partyCode;
    } catch (err) {
      console.error('Error creating party:', err);
      setError('Failed to create party');
      setIsConnecting(false);
      return null;
    }
  }, [playerId]);

  const joinParty = useCallback(async (code: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Find the party
      const { data: existingParty, error: findError } = await supabase
        .from('game_parties')
        .select()
        .eq('party_code', code.toUpperCase())
        .single();

      if (findError || !existingParty) {
        setError('Party not found');
        setIsConnecting(false);
        return false;
      }

      if (existingParty.guest_id) {
        setError('Party is full');
        setIsConnecting(false);
        return false;
      }

      // Join the party
      const { data, error: updateError } = await supabase
        .from('game_parties')
        .update({
          guest_id: playerId,
          game_status: 'playing',
        })
        .eq('id', existingParty.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setParty(data as PartyState);
      setIsHost(false);
      setIsConnecting(false);
      return true;
    } catch (err) {
      console.error('Error joining party:', err);
      setError('Failed to join party');
      setIsConnecting(false);
      return false;
    }
  }, [playerId]);

  const updatePaddlePosition = useCallback(async (y: number) => {
    if (!party) return;

    const field = isHost ? 'host_paddle_y' : 'guest_paddle_y';
    
    await supabase
      .from('game_parties')
      .update({ [field]: y })
      .eq('id', party.id);
  }, [party, isHost]);

  const updateBallState = useCallback(async (x: number, y: number, dx: number, dy: number) => {
    if (!party || !isHost) return;

    await supabase
      .from('game_parties')
      .update({ 
        ball_x: x, 
        ball_y: y, 
        ball_dx: dx, 
        ball_dy: dy 
      })
      .eq('id', party.id);
  }, [party, isHost]);

  const updateScore = useCallback(async (hostScore: number, guestScore: number) => {
    if (!party || !isHost) return;

    await supabase
      .from('game_parties')
      .update({ 
        host_score: hostScore, 
        guest_score: guestScore 
      })
      .eq('id', party.id);
  }, [party, isHost]);

  const updateGameStatus = useCallback(async (status: 'waiting' | 'playing' | 'paused' | 'finished') => {
    if (!party) return;

    await supabase
      .from('game_parties')
      .update({ game_status: status })
      .eq('id', party.id);
  }, [party]);

  const leaveParty = useCallback(async () => {
    if (!party) return;

    if (isHost) {
      // Delete the party if host leaves
      await supabase
        .from('game_parties')
        .delete()
        .eq('id', party.id);
    } else {
      // Remove guest from party
      await supabase
        .from('game_parties')
        .update({ guest_id: null, game_status: 'waiting' })
        .eq('id', party.id);
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    setParty(null);
    setIsHost(false);
  }, [party, isHost]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!party) return;

    const channel = supabase
      .channel(`party_${party.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_parties',
          filter: `id=eq.${party.id}`,
        },
        (payload) => {
          setParty(payload.new as PartyState);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'game_parties',
          filter: `id=eq.${party.id}`,
        },
        () => {
          // Party was deleted (host left)
          setParty(null);
          setIsHost(false);
          setError('Host left the party');
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [party?.id]);

  return {
    party,
    isHost,
    playerId,
    isConnecting,
    error,
    createParty,
    joinParty,
    updatePaddlePosition,
    updateBallState,
    updateScore,
    updateGameStatus,
    leaveParty,
  };
};
