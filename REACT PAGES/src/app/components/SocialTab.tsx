import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart, MessageCircle, Plus, Star, Trash2, Users, UserPlus, UserMinus,
  Search, Check, X, Film, ChevronRight, Shuffle, Popcorn, Crown, LogOut,
  Tv, Wifi, WifiOff, Loader2, Sparkles, Clapperboard,
} from 'lucide-react';
import {
  getFeed, createPost, likePost, deletePost, getUser, timeAgo,
  getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest,
  rejectFriendRequest, removeFriend, searchUsers,
  getUserGroups, createGroup, getGroup, addGroupMember, removeGroupMember,
  addToGroupWatchlist, removeFromGroupWatchlist, deleteGroup,
  spinGroupReelette, getGroupMemberProfiles, getGroupMemberServices,
  updateLastSeen, searchMovies, discoverMovies,
  type FeedPost, type Friend, type FriendRequest, type MovieGroup,
  type GroupMovie, type MemberProfile, type MemberServiceEntry,
  SERVICE_DISPLAY, getUserPublicProfile,
} from '../services/api';
import { UserProfileModal } from './UserProfileModal';

// ── Constants ──────────────────────────────────────────────────
const SERVICE_KEYS = ['netflix', 'hulu', 'disneyPlus', 'hboMax', 'amazonPrime', 'appleTV', 'paramount', 'peacock'] as const;

const WHEEL_COLORS = [
  '#C0392B', '#8E44AD', '#2471A3', '#1E8449', '#D68910',
  '#784212', '#717D7E', '#6C3483', '#1A5276', '#1D6A39',
  '#B7950B', '#6E2F1A', '#2C3E50', '#512E5F',
];

// ── Helpers ────────────────────────────────────────────────────
function dicebear(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function isOnline(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000; // 5 min
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1C1C1C] ${online ? 'bg-green-500' : 'bg-zinc-600'}`}
      title={online ? 'Online' : 'Offline'}
    />
  );
}

function UserAvatar({ username, avatarUrl, size = 40, lastSeen, onClick }: {
  username: string; avatarUrl?: string; size?: number;
  lastSeen?: string; onClick?: () => void;
}) {
  const src = avatarUrl || dicebear(username);
  const online = lastSeen !== undefined ? isOnline(lastSeen) : undefined;
  return (
    <div
      className={`relative shrink-0 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <img
        src={src}
        alt={username}
        className="w-full h-full rounded-full object-cover bg-[#141414]"
      />
      {online !== undefined && <OnlineDot online={online} />}
    </div>
  );
}

// ── Service overlap utilities ──────────────────────────────────
function computeIntersection(map: Record<string, MemberServiceEntry>): Record<string, boolean> {
  const members = Object.values(map);
  if (!members.length) return {};
  return Object.fromEntries(
    SERVICE_KEYS.map(k => [k, members.every(m => !!m.services[k])])
  );
}

function computeUnion(map: Record<string, MemberServiceEntry>): Record<string, boolean> {
  const members = Object.values(map);
  return Object.fromEntries(
    SERVICE_KEYS.map(k => [k, members.some(m => !!m.services[k])])
  );
}

// Which user IDs have a given service
function membersWithService(map: Record<string, MemberServiceEntry>, key: string): string[] {
  return Object.entries(map)
    .filter(([, v]) => !!v.services[key])
    .map(([, v]) => v.username);
}

// ── SVG Spinning Wheel ─────────────────────────────────────────
function SpinWheel({ items, onSpinEnd }: { items: GroupMovie[]; onSpinEnd: (m: GroupMovie) => void }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<GroupMovie | null>(null);

  const cx = 200, cy = 200, r = 185;
  const n = items.length;
  const segAngle = 360 / n;
  const toRad = (d: number) => d * Math.PI / 180;

  const handleSpin = useCallback(() => {
    if (spinning || !n) return;
    const idx = Math.floor(Math.random() * n);
    const target = ((-(idx * segAngle + segAngle / 2)) % 360 + 360) % 360;
    const cur = rotation % 360;
    let delta = target - cur;
    if (delta <= 0) delta += 360;
    setRotation(rotation + delta + 5 * 360);
    setSpinning(true);
    setPendingWinner(items[idx]);
  }, [spinning, n, items, rotation, segAngle]);

  if (!n) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10"
          style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '22px solid #C0392B' }} />
        <svg width="400" height="400" viewBox="0 0 400 400"
          style={{ filter: 'drop-shadow(0 0 24px rgba(192,57,43,0.4))' }}>
          <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#2A2A2A" strokeWidth="8" />
          <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none' }}
            onTransitionEnd={() => { setSpinning(false); if (pendingWinner) onSpinEnd(pendingWinner); }}>
            {items.map((item, i) => {
              const s = toRad(i * segAngle - 90), e = toRad((i + 1) * segAngle - 90);
              const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
              const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
              const mid = toRad(i * segAngle + segAngle / 2 - 90);
              const tx = cx + r * 0.62 * Math.cos(mid), ty = cy + r * 0.62 * Math.sin(mid);
              const label = item.movie_title.length > 14 ? item.movie_title.slice(0, 13) + '…' : item.movie_title;
              return (
                <g key={item.movie_id}>
                  <path d={`M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${segAngle > 180 ? 1 : 0},1 ${x2},${y2} Z`}
                    fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="#0A0A0A" strokeWidth="2" />
                  <text x={tx} y={ty} fill="white" fontSize={n <= 6 ? '13' : n <= 10 ? '11' : '9'}
                    fontWeight="600" textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${i * segAngle + segAngle / 2 - 90 + 90 * (180 / Math.PI) / (180 / Math.PI)}, ${tx}, ${ty})`}
                    style={{ pointerEvents: 'none' }}>
                    {label}
                  </text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r={28} fill="#1C1C1C" stroke="#2A2A2A" strokeWidth="3" />
            <circle cx={cx} cy={cy} r={10} fill="#C0392B" />
          </g>
        </svg>
      </div>
      <button onClick={handleSpin} disabled={spinning}
        className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] disabled:opacity-50 text-white font-bold text-lg rounded-full shadow-2xl shadow-[#C0392B]/40 transition-all hover:scale-105 disabled:scale-100">
        <Shuffle className="w-6 h-6" />{spinning ? 'Spinning…' : 'Spin!'}
      </button>
    </div>
  );
}

// ── Watch Mode Panel ───────────────────────────────────────────
type WatchMode = 'separately' | 'together';

function WatchModePanel({ groupId }: { groupId: string }) {
  const [mode, setMode] = useState<WatchMode | null>(null);
  const [memberServices, setMemberServices] = useState<Record<string, MemberServiceEntry>>({});
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<{ id: string; title: string; year: number; poster: string; streamingService: string }[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedGroupMovie, setSelectedGroupMovie] = useState<string | null>(null);

  const currentUser = getUser();

  const fetchAndDiscover = useCallback(async (m: WatchMode) => {
    setLoading(true);
    setMovies([]);
    const svcMap = await getGroupMemberServices(groupId);
    setMemberServices(svcMap);

    const filter = m === 'separately' ? computeIntersection(svcMap) : computeUnion(svcMap);
    const hasAny = Object.values(filter).some(Boolean);

    if (!hasAny) { setLoading(false); return; }

    setDiscovering(true);
    const results = await discoverMovies({ services_filter: filter, sort_by: 'popularity', page: 1 });
    setMovies(results.slice(0, 20));
    setDiscovering(false);
    setLoading(false);
  }, [groupId]);

  const handleMode = (m: WatchMode) => {
    setMode(m);
    fetchAndDiscover(m);
  };

  const activeFilter = mode ? (mode === 'separately' ? computeIntersection(memberServices) : computeUnion(memberServices)) : {};
  const activeServices = SERVICE_KEYS.filter(k => activeFilter[k]);

  return (
    <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <Tv className="w-5 h-5 text-[#C0392B]" /> Movie Night
      </h3>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleMode('separately')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'separately' ? 'border-[#C0392B] bg-[#C0392B]/10' : 'border-[#2A2A2A] hover:border-[#444]'}`}>
          <div className="flex items-center gap-2 mb-1">
            <WifiOff className="w-4 h-4 text-blue-400" />
            <span className="text-white font-medium text-sm">Watch Separately</span>
          </div>
          <p className="text-gray-500 text-xs">Finds movies everyone can stream on their own device — shows only services all members share.</p>
        </button>
        <button onClick={() => handleMode('together')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'together' ? 'border-[#C0392B] bg-[#C0392B]/10' : 'border-[#2A2A2A] hover:border-[#444]'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-white font-medium text-sm">Watch Together</span>
          </div>
          <p className="text-gray-500 text-xs">Shows all movies across everyone's combined services — use anyone's account.</p>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking member services…
        </div>
      )}

      {/* Service summary */}
      {mode && !loading && activeServices.length > 0 && (
        <div className="space-y-2">
          <p className="text-gray-400 text-sm font-medium">
            {mode === 'separately'
              ? `Shared by all members (${activeServices.length} service${activeServices.length !== 1 ? 's' : ''})`
              : `Combined across all members (${activeServices.length} service${activeServices.length !== 1 ? 's' : ''})`}
          </p>
          <div className="flex flex-wrap gap-2">
            {activeServices.map(k => {
              const who = membersWithService(memberServices, k);
              return (
                <div key={k} className="group relative">
                  <span className="px-3 py-1.5 bg-[#2A2A2A] border border-[#333] text-gray-300 rounded-lg text-xs cursor-default">
                    {SERVICE_DISPLAY[k] ?? k}
                    {mode === 'together' && <span className="text-gray-500 ml-1">({who.length})</span>}
                  </span>
                  {mode === 'together' && (
                    <div className="absolute bottom-full left-0 mb-1 bg-[#141414] border border-[#333] rounded-lg p-2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                      {who.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode && !loading && activeServices.length === 0 && (
        <p className="text-yellow-500/80 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          {mode === 'separately'
            ? 'No services are shared by all members. Try "Watch Together" instead.'
            : 'No members have set up streaming services yet.'}
        </p>
      )}

      {/* Movie results */}
      {discovering && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Finding movies…
        </div>
      )}

      {movies.length > 0 && (
        <div>
          <p className="text-gray-400 text-sm mb-3">
            {movies.length} movies available — click to add to the group watchlist
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
            {movies.map(m => (
              <button
                key={m.id}
                onClick={async () => {
                  if (!currentUser) return;
                  setSelectedGroupMovie(m.id);
                  await addToGroupWatchlist(groupId, m.id, m.title, currentUser.user_id, currentUser.username);
                  setSelectedGroupMovie(null);
                }}
                disabled={selectedGroupMovie === m.id}
                className="relative group rounded-lg overflow-hidden border border-[#2A2A2A] hover:border-[#C0392B] transition-all"
                title={`${m.title} (${m.year}) — Add to watchlist`}
              >
                {m.poster
                  ? <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                  : <div className="w-full aspect-[2/3] bg-[#141414] flex items-center justify-center"><Film className="w-6 h-6 text-gray-600" /></div>
                }
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  {selectedGroupMovie === m.id
                    ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                    : <Plus className="w-6 h-6 text-white" />}
                </div>
                <div className="p-1.5">
                  <p className="text-white text-xs font-medium truncate leading-tight">{m.title}</p>
                  <p className="text-gray-600 text-xs">{m.year}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Post Card ──────────────────────────────────────────────────
function PostCard({ post, currentUserId, onLike, onDelete, onOpenProfile }: {
  post: FeedPost; currentUserId: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const isLiked = post.liked_by.includes(currentUserId);
  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#333333] transition-colors">
      <div className="flex items-start gap-4">
        <UserAvatar
          username={post.username}
          avatarUrl={post.avatarUrl}
          size={48}
          onClick={() => onOpenProfile(post.user_id)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => onOpenProfile(post.user_id)}
              className="text-white font-medium hover:text-[#C0392B] transition-colors"
            >
              {post.username}
            </button>
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
            <button onClick={() => onLike(post.post_id)}
              className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-[#C0392B]' : 'text-gray-500 hover:text-[#C0392B]'}`}>
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

// ── Friends Panel ──────────────────────────────────────────────
function FriendsPanel({ onOpenProfile }: { onOpenProfile: (uid: string) => void }) {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Pending Requests */}
      {requests.length > 0 && (
        <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#C0392B]" /> Friend Requests
            <span className="ml-1 bg-[#C0392B] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requests.length}</span>
          </h3>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.from_user_id} className="flex items-center gap-3">
                <UserAvatar username={req.from_username} size={40} onClick={() => onOpenProfile(req.from_user_id)} />
                <div className="flex-1">
                  <button onClick={() => onOpenProfile(req.from_user_id)} className="text-white font-medium hover:text-[#C0392B] transition-colors">
                    @{req.from_username}
                  </button>
                  <p className="text-xs text-gray-500">{timeAgo(req.created_at)}</p>
                </div>
                <button onClick={() => handleAccept(req)} className="p-2 bg-green-600/20 hover:bg-green-600 border border-green-600/50 hover:border-green-600 text-green-400 hover:text-white rounded-lg transition-all"><Check className="w-4 h-4" /></button>
                <button onClick={() => handleReject(req.from_user_id)} className="p-2 bg-red-600/20 hover:bg-red-600 border border-red-600/50 hover:border-red-600 text-red-400 hover:text-white rounded-lg transition-all"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-[#C0392B]" /> Find Friends</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="Search by username…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none" />
          <button onClick={handleSearch} disabled={searching}
            className="px-4 py-2.5 bg-[#C0392B] hover:bg-[#A93226] text-white rounded-lg transition-colors disabled:opacity-50">
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
        {searchResults.map(u => (
          <div key={u.user_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A] mb-2">
            <UserAvatar username={u.username} size={36} onClick={() => onOpenProfile(u.user_id)} />
            <div className="flex-1">
              <button onClick={() => onOpenProfile(u.user_id)} className="text-white font-medium hover:text-[#C0392B] transition-colors block">{u.displayName}</button>
              <p className="text-xs text-gray-500">@{u.username}</p>
            </div>
            {sentTo.has(u.user_id)
              ? <span className="text-xs text-gray-500 flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Sent</span>
              : <button onClick={() => handleSendRequest(u.user_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C0392B]/20 hover:bg-[#C0392B] border border-[#C0392B]/50 hover:border-[#C0392B] text-[#C0392B] hover:text-white rounded-lg text-sm transition-all">
                  <UserPlus className="w-4 h-4" />Add
                </button>}
          </div>
        ))}
        {searchResults.length === 0 && searchQuery && !searching && (
          <p className="text-gray-500 text-sm text-center py-2">No users found for "{searchQuery}"</p>
        )}
      </section>

      {/* Friends List */}
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#C0392B]" /> My Friends
          {!loading && <span className="text-gray-500 text-sm font-normal">({friends.length})</span>}
        </h3>
        {loading ? <p className="text-gray-500 text-center py-4">Loading…</p>
          : friends.length === 0 ? <p className="text-gray-500 text-center py-8">No friends yet — search above to connect!</p>
          : (
            <div className="space-y-3">
              {friends.map(f => (
                <div key={f.friend_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                  <UserAvatar username={f.friend_username} size={40} onClick={() => onOpenProfile(f.friend_id)} />
                  <div className="flex-1">
                    <button onClick={() => onOpenProfile(f.friend_id)} className="text-white font-medium hover:text-[#C0392B] transition-colors">@{f.friend_username}</button>
                    <p className="text-xs text-gray-600">Friends since {timeAgo(f.since)}</p>
                  </div>
                  <button onClick={() => handleRemove(f.friend_id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors" title="Remove friend">
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

// ── TMDB Movie Search for group watchlist ──────────────────────
function TMDBMovieSearch({ groupId, onAdded }: { groupId: string; onAdded: () => void }) {
  const currentUser = getUser();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; title: string; year: number; poster: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const movies = await searchMovies(query.trim());
      setResults(movies.slice(0, 8).map(m => ({ id: m.id, title: m.title, year: m.year, poster: m.poster })));
      setSearching(false);
    }, 400);
  }, [query]);

  const handleAdd = async (m: { id: string; title: string }) => {
    if (!currentUser) return;
    setAddingId(m.id);
    await addToGroupWatchlist(groupId, m.id, m.title, currentUser.user_id, currentUser.username);
    setAddingId(null);
    setQuery('');
    setResults([]);
    onAdded();
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search TMDB for a movie to add…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />}
        </div>
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl z-20 overflow-hidden max-h-72 overflow-y-auto">
          {results.map(m => (
            <button
              key={m.id}
              onClick={() => handleAdd(m)}
              disabled={addingId === m.id}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1C1C1C] transition-colors text-left border-b border-[#2A2A2A] last:border-0"
            >
              {m.poster
                ? <img src={m.poster} alt={m.title} className="w-9 h-14 object-cover rounded shrink-0" />
                : <div className="w-9 h-14 bg-[#2A2A2A] rounded shrink-0 flex items-center justify-center"><Film className="w-4 h-4 text-gray-600" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{m.title}</p>
                <p className="text-gray-500 text-xs">{m.year}</p>
              </div>
              {addingId === m.id
                ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
                : <Plus className="w-4 h-4 text-[#C0392B] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Group Detail ───────────────────────────────────────────────
function GroupDetail({ group: initial, currentUserId, currentUsername, onBack, onUpdate }: {
  group: MovieGroup; currentUserId: string; currentUsername: string;
  onBack: () => void; onUpdate: () => void;
}) {
  const [group, setGroup] = useState<MovieGroup>(initial);
  const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([]);
  const [winner, setWinner] = useState<GroupMovie | null>(null);
  const [showWheel, setShowWheel] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState<{ user_id: string; username: string }[]>([]);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const isCreator = group.created_by === currentUserId;

  const refresh = useCallback(async () => {
    const [updated, profiles] = await Promise.all([
      getGroup(group.group_id),
      getGroupMemberProfiles(group.group_id),
    ]);
    if (updated) { setGroup(updated); onUpdate(); }
    setMemberProfiles(profiles);
  }, [group.group_id, onUpdate]);

  // Load member profiles on mount and poll every 60s for online status
  useEffect(() => {
    refresh();
    const interval = setInterval(() => getGroupMemberProfiles(group.group_id).then(setMemberProfiles), 60_000);
    return () => clearInterval(interval);
  }, [group.group_id, refresh]);

  const profileFor = (member_id: string): MemberProfile | undefined =>
    memberProfiles.find(p => p.user_id === member_id);

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
    if (!confirm('Permanently delete this group?')) return;
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

  const onlineCount = memberProfiles.filter(p => isOnline(p.lastSeen)).length;

  return (
    <>
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-1">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex-1">
            <h2 className="text-white text-xl font-bold">{group.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {group.description && <span className="text-gray-500 text-sm">{group.description}</span>}
              {onlineCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  {onlineCount} online
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isCreator
              ? <button onClick={handleDeleteGroup} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-600 border border-red-800 hover:border-red-600 text-red-400 hover:text-white rounded-lg text-sm transition-all"><Trash2 className="w-4 h-4" />Delete</button>
              : <button onClick={handleLeave} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition-all"><LogOut className="w-4 h-4" />Leave</button>}
          </div>
        </div>

        {/* Movie Night — Watch Together/Separately */}
        <WatchModePanel groupId={group.group_id} />

        {/* Reelette Wheel */}
        {group.watchlist.length > 0 && (
          <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2"><Popcorn className="w-5 h-5 text-[#C0392B]" />Group Reelette</h3>
              <button onClick={() => { setShowWheel(w => !w); setWinner(null); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] text-white rounded-lg text-sm font-medium transition-all hover:scale-105">
                <Shuffle className="w-4 h-4" />{showWheel ? 'Hide Wheel' : 'Spin the Wheel'}
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
                    <button onClick={() => setWinner(null)} className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 rounded-lg text-sm transition-colors">Spin Again</button>
                  </div>
                ) : <SpinWheel items={group.watchlist} onSpinEnd={setWinner} />}
              </div>
            )}
          </section>
        )}

        {/* Watchlist with TMDB search */}
        <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-[#C0392B]" /> Group Watchlist
            <span className="text-gray-500 text-sm font-normal">({group.watchlist.length})</span>
          </h3>
          <div className="mb-4">
            <TMDBMovieSearch groupId={group.group_id} onAdded={refresh} />
          </div>
          {group.watchlist.length === 0
            ? <p className="text-gray-500 text-center py-8">No movies yet — search above or use Movie Night to find something!</p>
            : (
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

        {/* Members with online status */}
        <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C0392B]" /> Members
            <span className="text-gray-500 text-sm font-normal">({group.members.length})</span>
            {onlineCount > 0 && <span className="text-green-500 text-xs">• {onlineCount} online</span>}
          </h3>

          {/* Invite search */}
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Search username to invite…" value={friendSearch}
              onChange={e => setFriendSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFriendSearch()}
              className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none" />
            <button onClick={handleFriendSearch} className="px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 rounded-lg transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
          {friendResults.length > 0 && (
            <div className="mb-4 space-y-2 border border-[#2A2A2A] rounded-lg p-3 bg-[#141414]">
              {friendResults.map(u => (
                <div key={u.user_id} className="flex items-center gap-2">
                  <p className="flex-1 text-white text-sm">@{u.username}</p>
                  <button onClick={() => handleAddMember(u)} disabled={addingMember === u.user_id}
                    className="text-sm px-3 py-1 bg-[#C0392B]/20 hover:bg-[#C0392B] border border-[#C0392B]/50 text-[#C0392B] hover:text-white rounded-lg transition-all disabled:opacity-50">
                    {addingMember === u.user_id ? '…' : 'Invite'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {group.members.map(member_id => {
              const prof = profileFor(member_id);
              const uname = prof?.username || group.member_usernames[member_id] || member_id;
              const online = prof ? isOnline(prof.lastSeen) : false;
              const isOwner = member_id === group.created_by;
              return (
                <div key={member_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                  <UserAvatar
                    username={uname}
                    avatarUrl={prof?.avatarUrl}
                    size={40}
                    lastSeen={prof?.lastSeen}
                    onClick={() => setProfileUserId(member_id)}
                  />
                  <div className="flex-1">
                    <button onClick={() => setProfileUserId(member_id)} className="text-white text-sm hover:text-[#C0392B] transition-colors">@{uname}</button>
                    <p className="text-xs text-gray-600">{online ? 'Online now' : prof?.lastSeen ? `Last seen ${timeAgo(prof.lastSeen)}` : 'Offline'}</p>
                  </div>
                  {isOwner && <Crown className="w-4 h-4 text-yellow-500 shrink-0" title="Creator" />}
                  {isCreator && !isOwner && (
                    <button onClick={() => handleRemoveMember(member_id)} className="text-gray-600 hover:text-red-500 transition-colors shrink-0">
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

// ── Groups Panel ───────────────────────────────────────────────
function GroupsPanel({ onOpenProfile }: { onOpenProfile: (uid: string) => void }) {
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

  // Heartbeat — update lastSeen while user is in groups panel
  useEffect(() => {
    if (!uid) return;
    updateLastSeen(uid);
    const hb = setInterval(() => updateLastSeen(uid), 2 * 60 * 1000);
    return () => clearInterval(hb);
  }, [uid]);

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
    if (r.success) { setNewName(''); setNewDesc(''); setShowCreate(false); await loadGroups(); }
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
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-[#C0392B]" />Movie Groups</h3>
          <button onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C0392B] hover:bg-[#A93226] text-white rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" />New Group
          </button>
        </div>
        {showCreate && (
          <div className="space-y-3 mb-2">
            <input type="text" placeholder="Group name…" value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none" />
            <input type="text" placeholder="Description (optional)…" value={newDesc} onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 px-4 py-2.5 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateGroup} disabled={creating || !newName.trim()}
                className="flex-1 bg-[#C0392B] hover:bg-[#A93226] text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </section>

      {loading ? <p className="text-gray-500 text-center py-16">Loading groups…</p>
        : groups.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Popcorn className="w-12 h-12 text-gray-700 mx-auto" />
            <p className="text-gray-500">No groups yet — create one and invite friends!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => {
              const onlineMembers = 0; // refreshed inside GroupDetail
              return (
                <button key={g.group_id} onClick={() => handleOpenGroup(g)}
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] hover:border-[#C0392B]/50 rounded-xl p-5 text-left transition-all hover:bg-[#222]">
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
              );
            })}
          </div>
        )}
    </div>
  );
}

// ── Main SocialTab ─────────────────────────────────────────────
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const currentUser = getUser();
  const currentUserId = currentUser?.user_id ?? '';

  useEffect(() => {
    if (activeTab === 'feed') {
      setLoading(true);
      getFeed().then(async (feedPosts) => {
        // If backend already returns avatarUrl on posts, nothing extra needed.
        // Otherwise, batch-fetch avatars for every unique poster.
        const needsAvatars = feedPosts.some(p => !p.avatarUrl);
        if (needsAvatars) {
          const uniqueIds = [...new Set(feedPosts.map(p => p.user_id))];
          const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
          const avatarMap: Record<string, string> = {};
          uniqueIds.forEach((id, i) => {
            const url = profiles[i]?.avatarUrl;
            if (url) avatarMap[id] = url;
          });
          setPosts(feedPosts.map(p => ({ ...p, avatarUrl: p.avatarUrl ?? avatarMap[p.user_id] })));
        } else {
          setPosts(feedPosts);
        }
        setLoading(false);
      });
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
      const needsAvatars = updated.some(p => !p.avatarUrl);
      if (needsAvatars) {
        const uniqueIds = [...new Set(updated.map(p => p.user_id))];
        const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
        const avatarMap: Record<string, string> = {};
        uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
        setPosts(updated.map(p => ({ ...p, avatarUrl: p.avatarUrl ?? avatarMap[p.user_id] })));
      } else {
        setPosts(updated);
      }
      setNewMovieTitle(''); setNewRating(''); setNewMessage('');
      setShowNewPostDialog(false);
    } else setPostError(result.message || 'Failed to create post.');
    setPosting(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'feed',    label: 'Feed',    icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'friends', label: 'Friends', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'groups',  label: 'Groups',  icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      <div className="text-2xl font-bold text-white mb-6 relative inline-block">
        Social
        <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-8 bg-[#141414] border border-[#2A2A2A] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-gradient-to-r from-[#C0392B] to-[#E74C3C] text-white shadow-lg shadow-[#C0392B]/20' : 'text-gray-400 hover:text-white hover:bg-[#1C1C1C]'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {activeTab === 'feed' && (
        <div className="max-w-3xl mx-auto space-y-6 relative pb-20">
          {loading ? <p className="text-gray-500 text-center py-16">Loading feed…</p>
            : posts.length === 0 ? <p className="text-gray-500 text-center py-16">No posts yet. Be the first to share!</p>
            : posts.map(post => (
              <PostCard key={post.post_id} post={post} currentUserId={currentUserId}
                onLike={handleLike} onDelete={handleDelete}
                onOpenProfile={setProfileUserId} />
            ))}
          <button onClick={() => setShowNewPostDialog(true)}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-[#C0392B]/30 transition-all hover:scale-110">
            <Plus className="w-8 h-8" />
          </button>
        </div>
      )}

      {activeTab === 'friends' && <FriendsPanel onOpenProfile={setProfileUserId} />}
      {activeTab === 'groups' && <GroupsPanel onOpenProfile={setProfileUserId} />}

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
