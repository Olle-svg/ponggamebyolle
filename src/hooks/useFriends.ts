import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from './useAuth';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface FriendWithProfile extends Friendship {
  friend: Profile;
}

export interface GameInvite {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  party_code: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  from_profile?: Profile;
}

export const useFriends = (profileId: string | undefined) => {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!profileId) return;

    // Fetch all friendships
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);

    if (error) {
      console.error('Error fetching friendships:', error);
      return;
    }

    // Get all unique profile IDs
    const friendIds = new Set<string>();
    friendships?.forEach(f => {
      friendIds.add(f.requester_id);
      friendIds.add(f.addressee_id);
    });
    friendIds.delete(profileId);

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(friendIds));

    const profileMap = new Map(profiles?.map(p => [p.id, p as Profile]));

    // Sort into categories
    const accepted: FriendWithProfile[] = [];
    const pending: FriendWithProfile[] = [];
    const sent: FriendWithProfile[] = [];

    friendships?.forEach(f => {
      const friendId = f.requester_id === profileId ? f.addressee_id : f.requester_id;
      const friendProfile = profileMap.get(friendId);
      
      if (!friendProfile) return;

      const friendWithProfile: FriendWithProfile = {
        ...f,
        status: f.status as 'pending' | 'accepted' | 'rejected',
        friend: friendProfile,
      };

      if (f.status === 'accepted') {
        accepted.push(friendWithProfile);
      } else if (f.status === 'pending') {
        if (f.addressee_id === profileId) {
          pending.push(friendWithProfile);
        } else {
          sent.push(friendWithProfile);
        }
      }
    });

    setFriends(accepted);
    setPendingRequests(pending);
    setSentRequests(sent);
    setLoading(false);
  }, [profileId]);

  const fetchInvites = useCallback(async () => {
    if (!profileId) return;

    const { data, error } = await supabase
      .from('game_invites')
      .select('*')
      .eq('to_profile_id', profileId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching invites:', error);
      return;
    }

    // Fetch sender profiles
    const fromIds = data?.map(i => i.from_profile_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', fromIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p as Profile]));

    const invitesWithProfiles: GameInvite[] = data?.map(i => ({
      ...i,
      status: i.status as 'pending' | 'accepted' | 'declined' | 'expired',
      from_profile: profileMap.get(i.from_profile_id),
    })) || [];

    setGameInvites(invitesWithProfiles);
  }, [profileId]);

  const sendFriendRequest = async (username: string) => {
    if (!profileId) return { error: 'Not logged in' };

    // Find user by username
    const { data: targetProfile, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (findError || !targetProfile) {
      return { error: 'User not found' };
    }

    if (targetProfile.id === profileId) {
      return { error: "You can't add yourself" };
    }

    // Check if already friends or pending
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(requester_id.eq.${profileId},addressee_id.eq.${targetProfile.id}),and(requester_id.eq.${targetProfile.id},addressee_id.eq.${profileId})`)
      .maybeSingle();

    if (existing) {
      return { error: 'Already friends or request pending' };
    }

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: profileId,
        addressee_id: targetProfile.id,
        status: 'pending',
      });

    if (error) {
      return { error: error.message };
    }

    await fetchFriends();
    return { error: null };
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    await fetchFriends();
  };

  const declineRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    await fetchFriends();
  };

  const removeFriend = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    await fetchFriends();
  };

  const sendGameInvite = async (toProfileId: string, partyCode: string) => {
    if (!profileId) return { error: 'Not logged in' };

    const { error } = await supabase
      .from('game_invites')
      .insert({
        from_profile_id: profileId,
        to_profile_id: toProfileId,
        party_code: partyCode,
      });

    return { error: error?.message || null };
  };

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    await supabase
      .from('game_invites')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', inviteId);

    await fetchInvites();
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!profileId) return;

    fetchFriends();
    fetchInvites();

    const friendsChannel = supabase
      .channel(`friends_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => fetchFriends()
      )
      .subscribe();

    const invitesChannel = supabase
      .channel(`invites_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invites',
        },
        () => fetchInvites()
      )
      .subscribe();

    // Subscribe to friend status changes
    const statusChannel = supabase
      .channel('profile_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => fetchFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(invitesChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [profileId, fetchFriends, fetchInvites]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    gameInvites,
    loading,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    sendGameInvite,
    respondToInvite,
    fetchInvites,
  };
};
