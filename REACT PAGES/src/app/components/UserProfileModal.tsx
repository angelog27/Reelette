import { useState, useEffect } from 'react';
import { X, Film, BookMarked, Users, UserPlus, UserMinus, Check, Loader2, Calendar } from 'lucide-react';
import {
  getUser, getUserPublicProfile, getFriends, sendFriendRequest,
  removeFriend, getFriendRequests,
  type UserPublicProfile,
} from '../services/api';

interface Props {
  userId: string;
  onClose: () => void;
}

function dicebear(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function UserProfileModal({ userId, onClose }: Props) {
  const currentUser = getUser();
  const currentUid = currentUser?.user_id ?? '';
  const currentUsername = currentUser?.username ?? '';

  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // friend state relative to the current user
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [acting, setActing] = useState(false);

  const isOwnProfile = userId === currentUid;

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getUserPublicProfile(userId),
      currentUid ? getFriends(currentUid) : Promise.resolve([]),
      currentUid ? getFriendRequests(userId) : Promise.resolve([]),
    ]).then(([prof, friends, requests]) => {
      setProfile(prof);
      setIsFriend(friends.some(f => f.friend_id === userId));
      // check if current user already sent a request to this person
      setHasPendingRequest(requests.some(r => r.from_user_id === currentUid));
      setLoading(false);
    });
  }, [userId, currentUid]);

  const handleAddFriend = async () => {
    if (!currentUid || acting) return;
    setActing(true);
    const r = await sendFriendRequest(userId, currentUid, currentUsername);
    if (r.success) setHasPendingRequest(true);
    setActing(false);
  };

  const handleRemoveFriend = async () => {
    if (!currentUid || acting) return;
    if (!confirm(`Remove ${profile?.username ?? 'this user'} from your friends?`)) return;
    setActing(true);
    const r = await removeFriend(currentUid, userId);
    if (r.success) setIsFriend(false);
    setActing(false);
  };

  const avatar = profile?.avatarUrl || dicebear(profile?.username ?? userId);

  const statBlocks = profile
    ? [
        { icon: <Film className="w-4 h-4" />, value: profile.watchedCount, label: 'Watched' },
        { icon: <BookMarked className="w-4 h-4" />, value: profile.watchlistCount, label: 'Watchlist' },
        { icon: <Users className="w-4 h-4" />, value: profile.friendsCount, label: 'Friends' },
      ]
    : [];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar — overlaps header */}
        <div className="px-6 -mt-10 pb-5">
          <div className="flex items-end justify-between mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-[#1C1C1C] overflow-hidden bg-[#141414] shadow-xl">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
                </div>
              ) : (
                <img src={avatar} alt={profile?.username} className="w-full h-full object-cover" />
              )}
            </div>

            {/* Friend action */}
            {!isOwnProfile && !loading && (
              <div className="mt-10">
                {isFriend ? (
                  <button
                    onClick={handleRemoveFriend}
                    disabled={acting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2A2A2A] hover:bg-red-900/40 border border-[#333] hover:border-red-700 text-gray-300 hover:text-red-400 rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                    Friends
                  </button>
                ) : hasPendingRequest ? (
                  <span className="flex items-center gap-1.5 px-4 py-2 bg-[#2A2A2A] border border-[#333] text-gray-500 rounded-lg text-sm">
                    <Check className="w-4 h-4 text-green-500" /> Requested
                  </span>
                ) : (
                  <button
                    onClick={handleAddFriend}
                    disabled={acting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#C0392B] hover:bg-[#A93226] text-white rounded-lg text-sm transition-all disabled:opacity-50 shadow-lg shadow-[#C0392B]/20"
                  >
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Add Friend
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-48 bg-zinc-800 rounded animate-pulse mt-2" />
            </div>
          ) : profile ? (
            <>
              <h2 className="text-white text-lg font-bold leading-tight">{profile.displayName}</h2>
              <p className="text-gray-500 text-sm">@{profile.username}</p>
              {profile.bio && <p className="text-gray-400 text-sm mt-2 leading-relaxed">{profile.bio}</p>}
              {profile.createdAt && (
                <p className="text-gray-600 text-xs mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#2A2A2A]">
                {statBlocks.map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-1 p-3 bg-[#141414] rounded-xl border border-[#2A2A2A]">
                    <span className="text-[#C0392B]">{s.icon}</span>
                    <span className="text-white font-bold text-lg">{s.value}</span>
                    <span className="text-gray-600 text-xs">{s.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500">User not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
