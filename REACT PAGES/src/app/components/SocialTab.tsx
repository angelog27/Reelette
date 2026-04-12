import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart, MessageCircle, Plus, Star, Trash2, Users, UserPlus, UserMinus,
  Search, Check, X, Film, ChevronRight, Shuffle, Popcorn, Crown, LogOut
} from 'lucide-react';
import {
  getFeed, createPost, likePost, deletePost, getUser, timeAgo,
  getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest,
  rejectFriendRequest, removeFriend, searchUsers,
  getUserGroups, createGroup, getGroup, addGroupMember, removeGroupMember,
  addToGroupWatchlist, removeFromGroupWatchlist, deleteGroup,
  spinGroupReelette,
} from '../services/api';
import type { FeedPost, Friend, FriendRequest, MovieGroup, GroupMovie } from '../services/api';

// ── Colour palette for wheel segments ──────────────────────────
const WHEEL_COLORS = [
  '#C0392B', '#8E44AD', '#2471A3', '#1E8449', '#D68910',
  '#784212', '#717D7E', '#C0392B', '#6C3483', '#1A5276',
  '#1D6A39', '#B7950B', '#6E2F1A', '#2C3E50',
];

// ── SVG Spinning Wheel ──────────────────────────────────────────
function SpinWheel({ items, onSpinEnd }: { items: GroupMovie[]; onSpinEnd: (movie: GroupMovie) => void }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<GroupMovie | null>(null);
  const wheelRef = useRef<SVGGElement>(null);

  const cx = 200, cy = 200, r = 185;
  const n = items.length;
  const segAngle = 360 / n;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const handleSpin = useCallback(() => {
    if (spinning || n === 0) return;
    const winnerIdx = Math.floor(Math.random() * n);
    // angle needed so winner segment midpoint aligns with pointer (top, -90° in SVG)
    const targetAngle = ((-(winnerIdx * segAngle + segAngle / 2)) % 360 + 360) % 360;
    const currentPos = rotation % 360;
    let delta = targetAngle - currentPos;
    if (delta <= 0) delta += 360;
    const newRotation = rotation + delta + 5 * 360;
    setRotation(newRotation);
    setSpinning(true);
    setPendingWinner(items[winnerIdx]);
  }, [spinning, n, items, rotation, segAngle]);

  // Fire callback after CSS transition ends
  const handleTransitionEnd = useCallback(() => {
    setSpinning(false);
    if (pendingWinner) onSpinEnd(pendingWinner);
  }, [pendingWinner, onSpinEnd]);

  if (n === 0) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pointer arrow at top */}
      <div className="relative">
        {/* Triangle pointer */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10"
          style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '22px solid #C0392B' }}
        />
        <svg
          width="400"
          height="400"
          viewBox="0 0 400 400"
          className="drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 24px rgba(192,57,43,0.4))' }}
        >
          {/* Outer ring */}
          <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#2A2A2A" strokeWidth="8" />
          {/* Wheel segments */}
          <g
            ref={wheelRef}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {items.map((item, i) => {
              const startDeg = i * segAngle - 90;
              const endDeg = (i + 1) * segAngle - 90;
              const startRad = toRad(startDeg);
              const endRad = toRad(endDeg);
              const x1 = cx + r * Math.cos(startRad);
              const y1 = cy + r * Math.sin(startRad);
              const x2 = cx + r * Math.cos(endRad);
              const y2 = cy + r * Math.sin(endRad);
              const largeArc = segAngle > 180 ? 1 : 0;
              const path = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
              const midDeg = startDeg + segAngle / 2;
              const midRad = toRad(midDeg);
              const textR = r * 0.62;
              const textX = cx + textR * Math.cos(midRad);
              const textY = cy + textR * Math.sin(midRad);
              const label = item.movie_title.length > 14 ? item.movie_title.slice(0, 13) + '…' : item.movie_title;
              return (
                <g key={item.movie_id}>
                  <path d={path} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="#0A0A0A" strokeWidth="2" />
                  <text
                    x={textX}
                    y={textY}
                    fill="white"
                    fontSize={n <= 6 ? '13' : n <= 10 ? '11' : '9'}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midDeg + 90}, ${textX}, ${textY})`}
                    style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
            {/* Center cap */}
            <circle cx={cx} cy={cy} r={28} fill="#1C1C1C" stroke="#2A2A2A" strokeWidth="3" />
            <circle cx={cx} cy={cy} r={10} fill="#C0392B" />
          </g>
        </svg>
      </div>

      <button
        onClick={handleSpin}
        disabled={spinning}
        className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] disabled:opacity-50 text-white font-bold text-lg rounded-full shadow-2xl shadow-[#C0392B]/40 transition-all hover:scale-105 disabled:scale-100"
      >
        <Shuffle className="w-6 h-6" />
        {spinning ? 'Spinning…' : 'Spin!'}
      </button>
    </div>
  );
}

// ── Post Card ───────────────────────────────────────────────────
function PostCard({ post, currentUserId, onLike, onDelete }: {
  post: FeedPost; currentUserId: string;
  onLike: (id: string) => void; onDelete: (id: string) => void;
}) {
  const isLiked = post.liked_by.includes(currentUserId);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(post.username)}`;
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#333333] transition-colors">
      <div className="flex items-start gap-4">
        <img src={avatarUrl} alt={post.username} className="w-12 h-12 rounded-full bg-[#141414] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-medium">{post.username}</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{timeAgo(post.created_at)}</span>
              {post.user_id === currentUserId && (
                <button onClick={() => onDelete(post.post_id)} className="text-gray-600 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-gray-400 mb-3">{post.message}</p>
          <div className="bg-[#141414] rounded-lg p-3 mb-4 border border-[#2A2A2A]">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium truncate">{post.movie_title}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="text-white font-medium">{post.rating}/10</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => onLike(post.post_id)}
              className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-[#C0392B]' : 'text-gray-500 hover:text-[#C0392B]'}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#C0392B]' : ''}`} />
              <span>{post.likes}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-gray-400 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Friends Panel ───────────────────────────────────────────────
function FriendsPanel() {
  const currentUser = getUser();
  const uid = currentUser?.user_id ?? '';
  const uname = currentUser?.username ?? '';

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ user_id: string; username: string; displayName: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    const [f, r] = await Promise.all([getFriends(uid), getFriendRequests(uid)]);
    setFriends(f);
    setRequests(r);
    setLoading(false);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchUsers(searchQuery.trim(), uid);
    // Filter out already-friends
    const friendIds = new Set(friends.map(f => f.friend_id));
    setSearchResults(results.filter(u => !friendIds.has(u.user_id)));
    setSearching(false);
  };

  const handleSendRequest = async (toUserId: string) => {
    if (!uid) return;
    const r = await sendFriendRequest(toUserId, uid, uname);
    if (r.success) setSentTo(prev => new Set(prev).add(toUserId));
  };

  const handleAccept = async (req: FriendRequest) => {
    const r = await acceptFriendRequest(uid, uname, req.from_user_id, req.from_username);
    if (r.success) load();
  };

  const handleReject = async (from_id: string) => {
    const r = await rejectFriendRequest(uid, from_id);
    if (r.success) load();
  };

  const handleRemove = async (friend_id: string) => {
    if (!confirm('Remove this friend?')) return;
    const r = await removeFriend(uid, friend_id);
    if (r.success) load();
  };

  const avatarUrl = (name: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Pending Requests */}
      {requests.length > 0 && (
        <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#C0392B]" />
            Friend Requests
            <span className="ml-1 bg-[#C0392B] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requests.length}</span>
          </h3>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.from_user_id} className="flex items-center gap-3">
                <img src={avatarUrl(req.from_username)} alt={req.from_username} className="w-10 h-10 rounded-full bg-[#141414]" />
                <div className="flex-1">
                  <p className="text-white font-medium">@{req.from_username}</p>
                  <p className="text-xs text-gray-500">{timeAgo(req.created_at)}</p>
                </div>
                <button onClick={() => handleAccept(req)} className="p-2 bg-green-600/20 hover:bg-green-600 border border-green-600/50 hover:border-green-600 text-green-400 hover:text-white rounded-lg transition-all">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => handleReject(req.from_user_id)} className="p-2 bg-red-600/20 hover:bg-red-600 border border-red-600/50 hover:border-red-600 text-red-400 hover:text-white rounded-lg transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search to Add */}
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-[#C0392B]" />
          Find Friends
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search by username…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2.5 bg-[#C0392B] hover:bg-[#A93226] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {searching ? '…' : <Search className="w-5 h-5" />}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map(u => (
              <div key={u.user_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                <img src={avatarUrl(u.username)} alt={u.username} className="w-9 h-9 rounded-full" />
                <div className="flex-1">
                  <p className="text-white font-medium">{u.displayName}</p>
                  <p className="text-xs text-gray-500">@{u.username}</p>
                </div>
                {sentTo.has(u.user_id) ? (
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Sent</span>
                ) : (
                  <button
                    onClick={() => handleSendRequest(u.user_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C0392B]/20 hover:bg-[#C0392B] border border-[#C0392B]/50 hover:border-[#C0392B] text-[#C0392B] hover:text-white rounded-lg text-sm transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {searchResults.length === 0 && searchQuery && !searching && (
          <p className="text-gray-500 text-sm text-center py-2">No users found for "{searchQuery}"</p>
        )}
      </section>

      {/* Friends List */}
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#C0392B]" />
          My Friends
          {!loading && <span className="text-gray-500 text-sm font-normal">({friends.length})</span>}
        </h3>
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading…</p>
        ) : friends.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No friends yet — search above to connect!</p>
        ) : (
          <div className="space-y-3">
            {friends.map(f => (
              <div key={f.friend_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                <img src={avatarUrl(f.friend_username)} alt={f.friend_username} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <p className="text-white font-medium">@{f.friend_username}</p>
                  <p className="text-xs text-gray-600">Friends since {timeAgo(f.since)}</p>
                </div>
                <button
                  onClick={() => handleRemove(f.friend_id)}
                  className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                  title="Remove friend"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Group Detail View ──────────────────────────────────────────
function GroupDetail({ group: initial, currentUserId, currentUsername, onBack, onUpdate }: {
  group: MovieGroup; currentUserId: string; currentUsername: string;
  onBack: () => void; onUpdate: () => void;
}) {
  const [group, setGroup] = useState<MovieGroup>(initial);
  const [movieInput, setMovieInput] = useState('');
  const [addingMovie, setAddingMovie] = useState(false);
  const [addMovieError, setAddMovieError] = useState('');
  const [winner, setWinner] = useState<GroupMovie | null>(null);
  const [showWheel, setShowWheel] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState<{ user_id: string; username: string; displayName: string }[]>([]);
  const [addingMember, setAddingMember] = useState<string | null>(null);

  const isCreator = group.created_by === currentUserId;

  const refresh = async () => {
    const updated = await getGroup(group.group_id);
    if (updated) { setGroup(updated); onUpdate(); }
  };

  const handleAddMovie = async () => {
    if (!movieInput.trim()) return;
    setAddingMovie(true);
    setAddMovieError('');
    const r = await addToGroupWatchlist(group.group_id, Date.now().toString(), movieInput.trim(), currentUserId, currentUsername);
    if (r.success) { setMovieInput(''); refresh(); }
    else setAddMovieError(r.message || 'Failed to add movie');
    setAddingMovie(false);
  };

  const handleRemoveMovie = async (movie_id: string) => {
    await removeFromGroupWatchlist(group.group_id, movie_id);
    refresh();
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    const r = await removeGroupMember(group.group_id, currentUserId);
    if (r.success) onBack();
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Permanently delete this group? This cannot be undone.')) return;
    const r = await deleteGroup(group.group_id, currentUserId);
    if (r.success) onBack();
  };

  const handleFriendSearch = async () => {
    if (!friendSearch.trim()) return;
    const results = await searchUsers(friendSearch.trim(), currentUserId);
    const memberSet = new Set(group.members);
    setFriendResults(results.filter(u => !memberSet.has(u.user_id)));
  };

  const handleAddMember = async (u: { user_id: string; username: string }) => {
    setAddingMember(u.user_id);
    const r = await addGroupMember(group.group_id, u.user_id, u.username);
    if (r.success) { setFriendSearch(''); setFriendResults([]); refresh(); }
    setAddingMember(null);
  };

  const handleRemoveMember = async (member_id: string) => {
    if (!confirm('Remove this member?')) return;
    await removeGroupMember(group.group_id, member_id);
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-1">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex-1">
          <h2 className="text-white text-xl font-bold">{group.name}</h2>
          {group.description && <p className="text-gray-500 text-sm">{group.description}</p>}
        </div>
        <div className="flex gap-2">
          {isCreator ? (
            <button onClick={handleDeleteGroup} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-600 border border-red-800 hover:border-red-600 text-red-400 hover:text-white rounded-lg text-sm transition-all">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          ) : (
            <button onClick={handleLeave} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition-all">
              <LogOut className="w-4 h-4" /> Leave
            </button>
          )}
        </div>
      </div>

      {/* Reelette Wheel */}
      {group.watchlist.length > 0 && (
        <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Popcorn className="w-5 h-5 text-[#C0392B]" />
              Group Reelette
            </h3>
            <button
              onClick={() => { setShowWheel(w => !w); setWinner(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] text-white rounded-lg text-sm font-medium transition-all hover:scale-105"
            >
              <Shuffle className="w-4 h-4" />
              {showWheel ? 'Hide Wheel' : 'Spin the Wheel'}
            </button>
          </div>

          {showWheel && (
            <div className="flex flex-col items-center gap-6 py-4">
              {winner ? (
                <div className="text-center space-y-4 py-4">
                  <div className="text-6xl animate-bounce">🎬</div>
                  <div className="bg-gradient-to-r from-[#C0392B] to-[#E74C3C] rounded-2xl p-6 shadow-2xl shadow-[#C0392B]/30 max-w-sm mx-auto">
                    <p className="text-white/80 text-sm mb-1">Tonight you're watching…</p>
                    <h3 className="text-white text-2xl font-bold">{winner.movie_title}</h3>
                    <p className="text-white/60 text-sm mt-2">Added by @{winner.added_by_username}</p>
                  </div>
                  <button
                    onClick={() => setWinner(null)}
                    className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    Spin Again
                  </button>
                </div>
              ) : (
                <SpinWheel items={group.watchlist} onSpinEnd={setWinner} />
              )}
            </div>
          )}
        </section>
      )}

      {/* Group Watchlist */}
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-[#C0392B]" />
          Movie Watchlist
          <span className="text-gray-500 text-sm font-normal">({group.watchlist.length})</span>
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Add a movie title…"
            value={movieInput}
            onChange={e => setMovieInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddMovie()}
            className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none"
          />
          <button
            onClick={handleAddMovie}
            disabled={addingMovie}
            className="px-4 py-2.5 bg-[#C0392B] hover:bg-[#A93226] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {addMovieError && <p className="text-red-400 text-sm mb-3">{addMovieError}</p>}
        {group.watchlist.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No movies yet — add some above to spin the wheel!</p>
        ) : (
          <div className="space-y-2">
            {group.watchlist.map((m, i) => (
              <div key={m.movie_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                <span className="text-gray-600 text-sm w-5 text-right shrink-0">{i + 1}</span>
                <Film className="w-4 h-4 text-gray-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{m.movie_title}</p>
                  <p className="text-xs text-gray-600">by @{m.added_by_username}</p>
                </div>
                <button onClick={() => handleRemoveMovie(m.movie_id)} className="text-gray-600 hover:text-red-500 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Members */}
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#C0392B]" />
          Members
          <span className="text-gray-500 text-sm font-normal">({group.members.length})</span>
        </h3>
        {/* Invite */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search username to invite…"
            value={friendSearch}
            onChange={e => setFriendSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFriendSearch()}
            className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none"
          />
          <button onClick={handleFriendSearch} className="px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 rounded-lg transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>
        {friendResults.length > 0 && (
          <div className="mb-4 space-y-2 border border-[#2A2A2A] rounded-lg p-3 bg-[#141414]">
            {friendResults.map(u => (
              <div key={u.user_id} className="flex items-center gap-2">
                <p className="flex-1 text-white text-sm">@{u.username}</p>
                <button
                  onClick={() => handleAddMember(u)}
                  disabled={addingMember === u.user_id}
                  className="text-sm px-3 py-1 bg-[#C0392B]/20 hover:bg-[#C0392B] border border-[#C0392B]/50 text-[#C0392B] hover:text-white rounded-lg transition-all disabled:opacity-50"
                >
                  {addingMember === u.user_id ? '…' : 'Invite'}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {group.members.map(member_id => {
            const uname = group.member_usernames[member_id] || member_id;
            const isOwner = member_id === group.created_by;
            return (
              <div key={member_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uname)}`} alt={uname} className="w-9 h-9 rounded-full" />
                <p className="flex-1 text-white text-sm">@{uname}</p>
                {isOwner && <Crown className="w-4 h-4 text-yellow-500" title="Creator" />}
                {isCreator && !isOwner && (
                  <button onClick={() => handleRemoveMember(member_id)} className="text-gray-600 hover:text-red-500 transition-colors">
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Groups Panel ────────────────────────────────────────────────
function GroupsPanel() {
  const currentUser = getUser();
  const uid = currentUser?.user_id ?? '';
  const uname = currentUser?.username ?? '';

  const [groups, setGroups] = useState<MovieGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<MovieGroup | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!uid) return;
    const g = await getUserGroups(uid);
    setGroups(g);
    setLoading(false);
  }, [uid]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreateGroup = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const r = await createGroup(newName.trim(), newDesc.trim(), uid, uname);
    if (r.success) {
      setNewName(''); setNewDesc('');
      setShowCreate(false);
      await loadGroups();
    }
    setCreating(false);
  };

  const handleOpenGroup = async (g: MovieGroup) => {
    const full = await getGroup(g.group_id);
    setActiveGroup(full ?? g);
  };

  if (activeGroup) {
    return (
      <GroupDetail
        group={activeGroup}
        currentUserId={uid}
        currentUsername={uname}
        onBack={() => { setActiveGroup(null); loadGroups(); }}
        onUpdate={async () => {
          const updated = await getGroup(activeGroup.group_id);
          if (updated) setActiveGroup(updated);
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Group */}
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C0392B]" />
            Movie Groups
          </h3>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C0392B] hover:bg-[#A93226] text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Group
          </button>
        </div>
        {showCreate && (
          <div className="space-y-3 mb-2">
            <input
              type="text"
              placeholder="Group name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none"
            />
            <input
              type="text"
              placeholder="Description (optional)…"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 px-4 py-2.5 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateGroup} disabled={creating || !newName.trim()} className="flex-1 bg-[#C0392B] hover:bg-[#A93226] text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Groups List */}
      {loading ? (
        <p className="text-gray-500 text-center py-16">Loading groups…</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Popcorn className="w-12 h-12 text-gray-700 mx-auto" />
          <p className="text-gray-500">No groups yet — create one and invite friends!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <button
              key={g.group_id}
              onClick={() => handleOpenGroup(g)}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] hover:border-[#C0392B]/50 rounded-xl p-5 text-left transition-all hover:bg-[#222]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold">{g.name}</h4>
                    {g.created_by === uid && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  {g.description && <p className="text-gray-500 text-sm">{g.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{g.members.length} member{g.members.length !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Film className="w-4 h-4" />{g.watchlist.length} movie{g.watchlist.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main SocialTab ──────────────────────────────────────────────
export function SocialTab() {
  type Tab = 'feed' | 'friends' | 'groups';
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newRating, setNewRating] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const currentUser = getUser();
  const currentUserId = currentUser?.user_id ?? '';

  useEffect(() => {
    if (activeTab === 'feed') {
      setLoading(true);
      getFeed().then(p => { setPosts(p); setLoading(false); });
    }
  }, [activeTab]);

  const handleLike = async (post_id: string) => {
    if (!currentUserId) return;
    const result = await likePost(post_id, currentUserId);
    if (result.success) {
      setPosts(prev => prev.map(p => {
        if (p.post_id !== post_id) return p;
        const liked = p.liked_by.includes(currentUserId);
        return { ...p, likes: liked ? p.likes - 1 : p.likes + 1, liked_by: liked ? p.liked_by.filter(id => id !== currentUserId) : [...p.liked_by, currentUserId] };
      }));
    }
  };

  const handleDelete = async (post_id: string) => {
    if (!currentUserId) return;
    const result = await deletePost(post_id, currentUserId);
    if (result.success) setPosts(prev => prev.filter(p => p.post_id !== post_id));
  };

  const handleCreatePost = async () => {
    if (!currentUser) { setPostError('You must be logged in to post.'); return; }
    if (!newMovieTitle.trim() || !newMessage.trim()) { setPostError('Movie title and message are required.'); return; }
    const rating = parseFloat(newRating);
    if (isNaN(rating) || rating < 0 || rating > 10) { setPostError('Rating must be 0–10.'); return; }
    setPosting(true); setPostError('');
    const result = await createPost({ user_id: currentUser.user_id, username: currentUser.username, message: newMessage.trim(), movie_title: newMovieTitle.trim(), rating });
    if (result.success) {
      const updated = await getFeed();
      setPosts(updated);
      setNewMovieTitle(''); setNewRating(''); setNewMessage('');
      setShowNewPostDialog(false);
    } else { setPostError(result.message || 'Failed to create post.'); }
    setPosting(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'feed', label: 'Feed', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'friends', label: 'Friends', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'groups', label: 'Groups', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Page title */}
      <div className="text-2xl font-bold text-white mb-6 relative inline-block">
        Social
        <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-8 bg-[#141414] border border-[#2A2A2A] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-[#C0392B] to-[#E74C3C] text-white shadow-lg shadow-[#C0392B]/20'
                : 'text-gray-400 hover:text-white hover:bg-[#1C1C1C]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed Tab */}
      {activeTab === 'feed' && (
        <div className="max-w-3xl mx-auto space-y-6 relative pb-20">
          {loading ? (
            <p className="text-gray-500 text-center py-16">Loading feed…</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-500 text-center py-16">No posts yet. Be the first to share!</p>
          ) : (
            posts.map(post => (
              <PostCard key={post.post_id} post={post} currentUserId={currentUserId} onLike={handleLike} onDelete={handleDelete} />
            ))
          )}
          <button
            onClick={() => setShowNewPostDialog(true)}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-[#C0392B]/30 transition-all hover:scale-110"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && <FriendsPanel />}

      {/* Groups Tab */}
      {activeTab === 'groups' && <GroupsPanel />}

      {/* New Post Dialog */}
      {showNewPostDialog && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] p-6 max-w-lg w-full">
            <h2 className="text-2xl text-white font-semibold mb-4">Create New Post</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Movie title…" value={newMovieTitle} onChange={e => setNewMovieTitle(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none" />
              <input type="number" placeholder="Your rating (0–10)" min="0" max="10" step="0.5" value={newRating} onChange={e => setNewRating(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none" />
              <textarea placeholder="Share your thoughts…" rows={4} value={newMessage} onChange={e => setNewMessage(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none resize-none" />
              {postError && <p className="text-red-400 text-sm">{postError}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setShowNewPostDialog(false); setPostError(''); }}
                  className="flex-1 bg-[#2A2A2A] hover:bg-[#333333] text-white px-6 py-3 rounded-lg transition-colors font-medium">Cancel</button>
                <button onClick={handleCreatePost} disabled={posting}
                  className="flex-1 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] text-white px-6 py-3 rounded-lg transition-all font-medium disabled:opacity-50">
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
