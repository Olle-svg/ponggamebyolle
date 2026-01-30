import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, X, Check, Clock, Send, 
  Circle, Gamepad2, Trash2, Loader2 
} from 'lucide-react';
import { useFriends, FriendWithProfile, GameInvite } from '@/hooks/useFriends';
import { Profile } from '@/hooks/useAuth';

interface FriendsPanelProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onInviteFriend: (friendProfileId: string) => void;
  partyCode?: string;
}

const StatusDot = ({ status }: { status: string }) => {
  const colors = {
    online: 'bg-green-400',
    'in-game': 'bg-accent',
    offline: 'bg-muted-foreground/50',
  };

  return (
    <Circle 
      className={`w-3 h-3 ${colors[status as keyof typeof colors] || colors.offline}`}
      fill="currentColor"
    />
  );
};

export const FriendsPanel = ({ 
  profile, 
  isOpen, 
  onClose, 
  onInviteFriend,
  partyCode 
}: FriendsPanelProps) => {
  const [addUsername, setAddUsername] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'invites'>('friends');

  const {
    friends,
    pendingRequests,
    sentRequests,
    gameInvites,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    sendGameInvite,
    respondToInvite,
  } = useFriends(profile.id);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;

    setAddError(null);
    setAddLoading(true);

    const { error } = await sendFriendRequest(addUsername.trim());
    
    if (error) {
      setAddError(error);
    } else {
      setAddUsername('');
    }
    
    setAddLoading(false);
  };

  const handleInvite = async (friendProfileId: string) => {
    if (!partyCode) return;
    await sendGameInvite(friendProfileId, partyCode);
    onInviteFriend(friendProfileId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-md 
                       border-l border-primary/20 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-pixel text-primary">FRIENDS</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Friend Form */}
            <form onSubmit={handleAddFriend} className="p-4 border-b border-primary/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="Add by username"
                  className="flex-1 px-3 py-2 bg-background/50 rounded-lg text-sm font-orbitron
                             placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 
                             focus:ring-primary/50"
                  disabled={addLoading}
                />
                <button
                  type="submit"
                  disabled={!addUsername.trim() || addLoading}
                  className="px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 
                             transition-all disabled:opacity-50"
                >
                  {addLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-primary" />
                  )}
                </button>
              </div>
              {addError && (
                <p className="mt-2 text-xs text-destructive font-orbitron">{addError}</p>
              )}
            </form>

            {/* Tabs */}
            <div className="flex border-b border-primary/20">
              {(['friends', 'requests', 'invites'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-orbitron transition-colors relative
                    ${activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.toUpperCase()}
                  {tab === 'requests' && pendingRequests.length > 0 && (
                    <span className="absolute top-1 right-2 w-2 h-2 bg-accent rounded-full" />
                  )}
                  {tab === 'invites' && gameInvites.length > 0 && (
                    <span className="absolute top-1 right-2 w-2 h-2 bg-secondary rounded-full" />
                  )}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2">
              <AnimatePresence mode="wait">
                {activeTab === 'friends' && (
                  <motion.div
                    key="friends"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {friends.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground font-orbitron py-8">
                        No friends yet
                      </p>
                    ) : (
                      friends.map((f) => (
                        <FriendItem
                          key={f.id}
                          friendship={f}
                          showInvite={!!partyCode}
                          onInvite={() => handleInvite(f.friend.id)}
                          onRemove={() => removeFriend(f.id)}
                        />
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === 'requests' && (
                  <motion.div
                    key="requests"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {pendingRequests.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground font-orbitron mb-2 px-2">
                          RECEIVED
                        </p>
                        <div className="space-y-2">
                          {pendingRequests.map((f) => (
                            <RequestItem
                              key={f.id}
                              friendship={f}
                              onAccept={() => acceptRequest(f.id)}
                              onDecline={() => declineRequest(f.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {sentRequests.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground font-orbitron mb-2 px-2">
                          SENT
                        </p>
                        <div className="space-y-2">
                          {sentRequests.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">
                                  {f.friend.username[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-orbitron">{f.friend.username}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Pending
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingRequests.length === 0 && sentRequests.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground font-orbitron py-8">
                        No pending requests
                      </p>
                    )}
                  </motion.div>
                )}

                {activeTab === 'invites' && (
                  <motion.div
                    key="invites"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {gameInvites.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground font-orbitron py-8">
                        No game invites
                      </p>
                    ) : (
                      gameInvites.map((invite) => (
                        <InviteItem
                          key={invite.id}
                          invite={invite}
                          onAccept={() => respondToInvite(invite.id, true)}
                          onDecline={() => respondToInvite(invite.id, false)}
                        />
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const FriendItem = ({ 
  friendship, 
  showInvite,
  onInvite, 
  onRemove 
}: { 
  friendship: FriendWithProfile;
  showInvite: boolean;
  onInvite: () => void;
  onRemove: () => void;
}) => {
  const { friend } = friendship;

  return (
    <motion.div
      layout
      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {friend.username[0].toUpperCase()}
          </span>
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <StatusDot status={friend.status} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-orbitron truncate">{friend.username}</p>
        <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
          {friend.status === 'in-game' && <Gamepad2 className="w-3 h-3" />}
          {friend.status}
        </p>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {showInvite && friend.status !== 'offline' && (
          <button
            onClick={onInvite}
            className="p-1.5 rounded bg-accent/20 hover:bg-accent/30 transition-colors"
            title="Invite to game"
          >
            <Send className="w-4 h-4 text-accent" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1.5 rounded bg-destructive/20 hover:bg-destructive/30 transition-colors"
          title="Remove friend"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
    </motion.div>
  );
};

const RequestItem = ({ 
  friendship, 
  onAccept, 
  onDecline 
}: { 
  friendship: FriendWithProfile;
  onAccept: () => void;
  onDecline: () => void;
}) => (
  <motion.div
    layout
    className="flex items-center gap-3 p-2 rounded-lg bg-accent/10"
  >
    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
      <span className="text-sm font-bold text-accent">
        {friendship.friend.username[0].toUpperCase()}
      </span>
    </div>

    <div className="flex-1">
      <p className="text-sm font-orbitron">{friendship.friend.username}</p>
      <p className="text-xs text-muted-foreground">wants to be friends</p>
    </div>

    <div className="flex gap-1">
      <button
        onClick={onAccept}
        className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 transition-colors"
      >
        <Check className="w-4 h-4 text-green-400" />
      </button>
      <button
        onClick={onDecline}
        className="p-1.5 rounded bg-destructive/20 hover:bg-destructive/30 transition-colors"
      >
        <X className="w-4 h-4 text-destructive" />
      </button>
    </div>
  </motion.div>
);

const InviteItem = ({ 
  invite, 
  onAccept, 
  onDecline 
}: { 
  invite: GameInvite;
  onAccept: () => void;
  onDecline: () => void;
}) => (
  <motion.div
    layout
    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/30"
  >
    <Gamepad2 className="w-8 h-8 text-secondary" />

    <div className="flex-1">
      <p className="text-sm font-orbitron text-secondary">
        {invite.from_profile?.username || 'Someone'}
      </p>
      <p className="text-xs text-muted-foreground">invites you to play!</p>
      <p className="text-xs text-accent font-mono mt-1">Code: {invite.party_code}</p>
    </div>

    <div className="flex flex-col gap-1">
      <button
        onClick={onAccept}
        className="px-3 py-1 rounded bg-secondary/20 hover:bg-secondary/30 
                   transition-colors text-xs font-orbitron text-secondary"
      >
        JOIN
      </button>
      <button
        onClick={onDecline}
        className="px-3 py-1 rounded bg-muted/50 hover:bg-muted 
                   transition-colors text-xs font-orbitron text-muted-foreground"
      >
        Decline
      </button>
    </div>
  </motion.div>
);
