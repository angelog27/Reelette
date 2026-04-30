import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import {
  Heart, MessageCircle, Plus, Star, Trash2, Users, UserPlus, UserMinus,
  Search, Check, X, Film, ChevronRight, Shuffle, Popcorn, Crown, LogOut,
  Tv, Wifi, WifiOff, Loader2, Sparkles, Clapperboard, Send, RefreshCw,
} from 'lucide-react';
import {
  getFeed, getFeedSince, bustFeedCache, createPost, likePost, deletePost, getUser, timeAgo,
  getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest,
  rejectFriendRequest, removeFriend, searchUsers,
  getUserGroups, createGroup, getGroup, addGroupMember, removeGroupMember,
  addToGroupWatchlist, removeFromGroupWatchlist, deleteGroup,
  spinGroupReelette, getGroupMemberProfiles, getGroupMemberServices,
  updateLastSeen, searchMovies, discoverMovies,
  getReplies, addReply,
  getGroupChat, sendGroupMessage,
  type FeedPost, type Friend, type FriendRequest, type MovieGroup,
  type GroupMovie, type MemberProfile, type MemberServiceEntry, type PostReply,
  type GroupMessage,
  SERVICE_DISPLAY, getUserPublicProfile,
} from '../services/api';
import { db, signInFirebase } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { UserProfileModal } from './UserProfileModal';
import { MovieDetailModal } from './MovieDetailModal';

// ── Module-level feed cache — survives tab navigation ──────────
// Keyed by post_id so merging new posts never creates duplicates.
const _feedCache = new Map<string, FeedPost>();
let _feedNewestAt = '';

function mergeFeedPosts(posts: FeedPost[]) {
  for (const p of posts) {
    _feedCache.set(p.post_id, p);
    if (!_feedNewestAt || p.created_at > _feedNewestAt) _feedNewestAt = p.created_at;
  }
}

function sortedFeedPosts(): FeedPost[] {
  return [..._feedCache.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ── Constants ──────────────────────────────────────────────────
const SERVICE_KEYS = ['netflix', 'hulu', 'disneyPlus', 'hboMax', 'amazonPrime', 'appleTV', 'paramount', 'peacock'] as const;

const WHEEL_COLORS = [
  '#7C5DBD', '#8E44AD', '#2471A3', '#1E8449', '#D68910',
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
          style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '22px solid #7C5DBD' }} />
        <svg width="400" height="400" viewBox="0 0 400 400"
          style={{ filter: 'drop-shadow(0 0 24px rgba(124,93,189,0.4))' }}>
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
            <circle cx={cx} cy={cy} r={10} fill="#7C5DBD" />
          </g>
        </svg>
      </div>
      <button onClick={handleSpin} disabled={spinning}
        className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#7C5DBD] to-[#9B7BD7] hover:from-[#6B4DAD] hover:to-[#7C5DBD] disabled:opacity-50 text-white font-bold text-lg rounded-full shadow-2xl shadow-[#7C5DBD]/40 transition-all hover:scale-105 disabled:scale-100">
        <Shuffle className="w-6 h-6" />{spinning ? 'Spinning…' : 'Spin!'}
      </button>
    </div>
  );
}

// ── Watch Mode Panel ───────────────────────────────────────────
type WatchMode = 'separately' | 'together';

function WatchModePanel({ groupId, onModeChange }: {
  groupId: string;
  onModeChange?: (mode: WatchMode | null, memberServices: Record<string, MemberServiceEntry>) => void;
}) {
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
    onModeChange?.(m, svcMap);

    const filter = m === 'separately' ? computeIntersection(svcMap) : computeUnion(svcMap);
    const hasAny = Object.values(filter).some(Boolean);

    if (!hasAny) { setLoading(false); return; }

    setDiscovering(true);
    const results = await discoverMovies({ services_filter: filter, sort_by: 'popularity', page: 1 });
    setMovies(results.slice(0, 20));
    setDiscovering(false);
    setLoading(false);
  }, [groupId, onModeChange]);

  const handleMode = (m: WatchMode) => {
    setMode(m);
    fetchAndDiscover(m);
  };

  const activeFilter = mode ? (mode === 'separately' ? computeIntersection(memberServices) : computeUnion(memberServices)) : {};
  const activeServices = SERVICE_KEYS.filter(k => activeFilter[k]);

  return (
    <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <Tv className="w-5 h-5 text-[#7C5DBD]" /> Movie Night
      </h3>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleMode('separately')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'separately' ? 'border-[#7C5DBD] bg-[#7C5DBD]/10' : 'border-[#2A2A2A] hover:border-[#444]'}`}>
          <div className="flex items-center gap-2 mb-1">
            <WifiOff className="w-4 h-4 text-blue-400" />
            <span className="text-white font-medium text-sm">Watch Separately</span>
          </div>
          <p className="text-gray-500 text-xs">Finds movies everyone can stream on their own device — shows only services all members share.</p>
        </button>
        <button onClick={() => handleMode('together')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'together' ? 'border-[#7C5DBD] bg-[#7C5DBD]/10' : 'border-[#2A2A2A] hover:border-[#444]'}`}>
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
                  await addToGroupWatchlist(groupId, m.id, m.title, currentUser.user_id, currentUser.username, m.poster);
                  setSelectedGroupMovie(null);
                }}
                disabled={selectedGroupMovie === m.id}
                className="relative group rounded-lg overflow-hidden border border-[#2A2A2A] hover:border-[#7C5DBD] transition-all"
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
// ── Movie Search for Post Dialog ───────────────────────────────
type MovieOption = { id: string; title: string; year: number; poster: string };

function PostMovieSearch({ onSelect, selected }: {
  onSelect: (movie: MovieOption | null) => void;
  selected: MovieOption | null;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieOption[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const movies = await searchMovies(query.trim());
      setResults(movies.slice(0, 6).map(m => ({ id: m.id, title: m.title, year: m.year, poster: m.poster })));
      setSearching(false);
    }, 400);
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 bg-[#141414] border border-[#7C5DBD] rounded-lg p-3">
        {selected.poster
          ? <img src={selected.poster} alt={selected.title} className="w-10 h-14 object-cover rounded shrink-0" />
          : <div className="w-10 h-14 bg-[#2A2A2A] rounded shrink-0 flex items-center justify-center"><Film className="w-4 h-4 text-gray-600" /></div>}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{selected.title}</p>
          <p className="text-gray-500 text-xs">{selected.year}</p>
        </div>
        <button onClick={() => onSelect(null)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search for a movie…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl z-20 overflow-hidden max-h-64 overflow-y-auto">
          {results.map(m => (
            <button
              key={m.id}
              onClick={() => { onSelect(m); setQuery(''); setResults([]); }}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1C1C1C] transition-colors text-left border-b border-[#2A2A2A] last:border-0"
            >
              {m.poster
                ? <img src={m.poster} alt={m.title} className="w-8 h-12 object-cover rounded shrink-0" />
                : <div className="w-8 h-12 bg-[#2A2A2A] rounded shrink-0 flex items-center justify-center"><Film className="w-4 h-4 text-gray-600" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{m.title}</p>
                <p className="text-gray-500 text-xs">{m.year}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mention-aware message renderer ────────────────────────────
function renderMessage(message: string, onOpenProfile: (userId: string) => void) {
  const parts = message.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const uname = part.slice(1);
      return (
        <button
          key={i}
          onClick={async () => {
            const results = await searchUsers(uname, '');
            const match = results.find((r: { username: string; user_id: string }) => r.username.toLowerCase() === uname.toLowerCase());
            if (match) onOpenProfile(match.user_id);
          }}
          className="text-[#7C5DBD] font-semibold hover:underline cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Post Card ──────────────────────────────────────────────────
function PostCard({ post, currentUserId, currentUsername, onLike, onDelete, onOpenProfile }: {
  post: FeedPost; currentUserId: string; currentUsername: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const isLiked = post.liked_by.includes(currentUserId);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [localReplyCount, setLocalReplyCount] = useState(post.reply_count ?? 0);

  const loadReplies = useCallback(async () => {
    setLoadingReplies(true);
    const fetched = await getReplies(post.post_id);
    const uniqueIds = [...new Set(fetched.map(r => r.user_id))];
    const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
    const avatarMap: Record<string, string> = {};
    uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
    setReplies(fetched.map(r => ({ ...r, avatarUrl: avatarMap[r.user_id] })));
    setLoadingReplies(false);
  }, [post.post_id]);

  const toggleReplies = () => {
    if (!showReplies) loadReplies();
    setShowReplies(s => !s);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !currentUserId) return;
    setSubmittingReply(true);
    const result = await addReply(post.post_id, currentUserId, currentUsername, replyText.trim());
    if (result.success) {
      setReplyText('');
      setLocalReplyCount((c: number) => c + 1);
      loadReplies();
    }
    setSubmittingReply(false);
  };

  return (
    <article className="border-b border-[#1A1A1A] px-4 py-4 hover:bg-[#0d0d0d] transition-colors">
      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          <UserAvatar username={post.username} avatarUrl={post.avatarUrl} size={44} onClick={() => onOpenProfile(post.user_id)} />
        </div>
        <div className="flex-1 min-w-0">

          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <button onClick={() => onOpenProfile(post.user_id)}
                className="font-bold text-[15px] text-white hover:underline truncate">
                {post.username}
              </button>
              <span className="text-gray-500 text-sm shrink-0">· {timeAgo(post.created_at)}</span>
            </div>
            {post.user_id === currentUserId && (
              <button onClick={() => onDelete(post.post_id)}
                className="shrink-0 p-1 -mr-1 text-gray-600 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Message */}
          <p className="text-[15px] text-gray-200 leading-relaxed mb-3">
            {renderMessage(post.message, onOpenProfile)}
          </p>

          {/* Movie card */}
          {post.movie_id ? (
            <a href={`https://www.themoviedb.org/movie/${post.movie_id}`} target="_blank" rel="noopener noreferrer"
              className="flex rounded-2xl border border-[#242424] overflow-hidden hover:border-[#3a3a3a] transition-colors group mb-3">
              {post.movie_poster ? (
                <img src={post.movie_poster} alt={post.movie_title}
                  className="w-20 shrink-0 object-cover" style={{ aspectRatio: '2/3' }} />
              ) : (
                <div className="w-20 shrink-0 bg-[#1a1a1a] flex items-center justify-center" style={{ aspectRatio: '2/3' }}>
                  <Film className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div className="flex flex-col justify-center px-4 py-3 min-w-0 gap-1.5">
                <span
                  className="text-white leading-tight line-clamp-2 group-hover:text-[#9B7BD7] transition-colors"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: 700, fontSize: '0.9rem' }}
                >
                  {post.movie_title}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500 text-xs font-bold tracking-wide">
                    {'★'.repeat(Math.round(post.rating / 2))}{'☆'.repeat(5 - Math.round(post.rating / 2))}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">{post.rating}/10</span>
                </div>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <Film className="w-4 h-4 shrink-0" />
              <span className="truncate">{post.movie_title}</span>
              <span className="shrink-0 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />{post.rating}/10
              </span>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 -ml-2">
            <button onClick={toggleReplies}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm transition-colors hover:bg-blue-500/10 hover:text-blue-400 ${showReplies ? 'text-blue-400' : 'text-gray-500'}`}>
              <MessageCircle className="w-[18px] h-[18px]" />
              {(showReplies ? replies.length : localReplyCount) > 0 && (
                <span>{showReplies ? replies.length : localReplyCount}</span>
              )}
            </button>
            <button onClick={() => onLike(post.post_id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm transition-colors hover:bg-[#7C5DBD]/10 hover:text-[#7C5DBD] ${isLiked ? 'text-[#7C5DBD]' : 'text-gray-500'}`}>
              <Heart className={`w-[18px] h-[18px] ${isLiked ? 'fill-[#7C5DBD]' : ''}`} />
              {post.likes > 0 && <span>{post.likes}</span>}
            </button>
          </div>

          {/* Replies */}
          {showReplies && (
            <div className="mt-3 pt-3 border-t border-[#1A1A1A] space-y-3">
              {loadingReplies ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading replies…
                </div>
              ) : replies.length === 0 ? (
                <p className="text-gray-600 text-sm">No replies yet.</p>
              ) : (
                replies.map(r => (
                  <div key={r.reply_id} className="flex items-start gap-2">
                    <UserAvatar username={r.username} avatarUrl={r.avatarUrl} size={30} onClick={() => onOpenProfile(r.user_id)} />
                    <div className="flex-1 bg-[#111] rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <button onClick={() => onOpenProfile(r.user_id)} className="text-white text-xs font-bold hover:underline">{r.username}</button>
                        <span className="text-gray-600 text-xs">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{r.message}</p>
                    </div>
                  </div>
                ))
              )}
              {currentUserId && (
                <div className="flex gap-2 pt-1">
                  <input type="text" placeholder="Reply…"
                    value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmitReply()}
                    className="flex-1 bg-[#111] border border-[#242424] rounded-full px-4 py-2 text-white text-sm placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none" />
                  <button onClick={handleSubmitReply} disabled={submittingReply || !replyText.trim()}
                    className="p-2 bg-[#7C5DBD] hover:bg-[#6B4DAD] disabled:opacity-50 text-white rounded-full transition-colors">
                    {submittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
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
  const [searchResults, setSearchResults] = useState<{ user_id: string; username: string; displayName: string; avatarUrl?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    const [f, r] = await Promise.all([getFriends(uid), getFriendRequests(uid)]);

    const allIds = [...new Set([...f.map(x => x.friend_id), ...r.map(x => x.from_user_id)])];
    const profiles = await Promise.all(allIds.map(id => getUserPublicProfile(id)));
    const avatarMap: Record<string, string> = {};
    allIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });

    setFriends(f.map(x => ({ ...x, avatarUrl: avatarMap[x.friend_id] })));
    setRequests(r.map(x => ({ ...x, avatarUrl: avatarMap[x.from_user_id] })));
    setLoading(false);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchUsers(searchQuery.trim(), uid);
    const friendIds = new Set(friends.map(f => f.friend_id));
    const filtered = results.filter(u => !friendIds.has(u.user_id));
    const profiles = await Promise.all(filtered.map(u => getUserPublicProfile(u.user_id)));
    const avatarMap: Record<string, string> = {};
    filtered.forEach((u, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[u.user_id] = url; });
    setSearchResults(filtered.map(u => ({ ...u, avatarUrl: avatarMap[u.user_id] })));
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

  const handleReject = async (req: FriendRequest) => {
    const r = await rejectFriendRequest(uid, req.from_user_id, req.from_username);
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
            <UserPlus className="w-5 h-5 text-[#7C5DBD]" /> Friend Requests
            <span className="ml-1 bg-[#7C5DBD] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requests.length}</span>
          </h3>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.from_user_id} className="flex items-center gap-3">
                <UserAvatar username={req.from_username} avatarUrl={req.avatarUrl} size={40} onClick={() => onOpenProfile(req.from_user_id)} />
                <div className="flex-1">
                  <button onClick={() => onOpenProfile(req.from_user_id)} className="text-white font-medium hover:text-[#7C5DBD] transition-colors">
                    @{req.from_username}
                  </button>
                  <p className="text-xs text-gray-500">{timeAgo(req.created_at)}</p>
                </div>
                <button onClick={() => handleAccept(req)} className="p-2 bg-green-600/20 hover:bg-green-600 border border-green-600/50 hover:border-green-600 text-green-400 hover:text-white rounded-lg transition-all"><Check className="w-4 h-4" /></button>
                <button onClick={() => handleReject(req)} className="p-2 bg-red-600/20 hover:bg-red-600 border border-red-600/50 hover:border-red-600 text-red-400 hover:text-white rounded-lg transition-all"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-[#7C5DBD]" /> Find Friends</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="Search by username…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none" />
          <button onClick={handleSearch} disabled={searching}
            className="px-4 py-2.5 bg-[#7C5DBD] hover:bg-[#6B4DAD] text-white rounded-lg transition-colors disabled:opacity-50">
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
        {searchResults.map(u => (
          <div key={u.user_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A] mb-2">
            <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size={36} onClick={() => onOpenProfile(u.user_id)} />
            <div className="flex-1">
              <button onClick={() => onOpenProfile(u.user_id)} className="text-white font-medium hover:text-[#7C5DBD] transition-colors block">{u.displayName}</button>
              <p className="text-xs text-gray-500">@{u.username}</p>
            </div>
            {sentTo.has(u.user_id)
              ? <span className="text-xs text-gray-500 flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Sent</span>
              : <button onClick={() => handleSendRequest(u.user_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7C5DBD]/20 hover:bg-[#7C5DBD] border border-[#7C5DBD]/50 hover:border-[#7C5DBD] text-[#7C5DBD] hover:text-white rounded-lg text-sm transition-all">
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
          <Users className="w-5 h-5 text-[#7C5DBD]" /> My Friends
          {!loading && <span className="text-gray-500 text-sm font-normal">({friends.length})</span>}
        </h3>
        {loading ? <p className="text-gray-500 text-center py-4">Loading…</p>
          : friends.length === 0 ? <p className="text-gray-500 text-center py-8">No friends yet — search above to connect!</p>
          : (
            <div className="space-y-3">
              {friends.map(f => (
                <div key={f.friend_id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                  <UserAvatar username={f.friend_username} avatarUrl={f.avatarUrl} size={40} onClick={() => onOpenProfile(f.friend_id)} />
                  <div className="flex-1">
                    <button onClick={() => onOpenProfile(f.friend_id)} className="text-white font-medium hover:text-[#7C5DBD] transition-colors">@{f.friend_username}</button>
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

  const handleAdd = async (m: { id: string; title: string; poster: string }) => {
    if (!currentUser) return;
    setAddingId(m.id);
    await addToGroupWatchlist(groupId, m.id, m.title, currentUser.user_id, currentUser.username, m.poster);
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
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none"
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
                : <Plus className="w-4 h-4 text-[#7C5DBD] shrink-0" />}
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
  const [randomMovieId, setRandomMovieId] = useState<string | null>(null);
  const [randomMovieOpen, setRandomMovieOpen] = useState(false);
  const [randomSpinning, setRandomSpinning] = useState(false);
  const [randomError, setRandomError] = useState('');
  const [watchMode, setWatchMode] = useState<WatchMode | null>(null);
  const [watchMemberServices, setWatchMemberServices] = useState<Record<string, MemberServiceEntry>>({});

  // ── Group Chat ────────────────────────────────────────────────
  const [innerTab, setInnerTab]     = useState<'group' | 'chat'>('group');
  const [chatMessages, setChatMessages] = useState<GroupMessage[]>([]);
  const [chatDraft, setChatDraft]   = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef  = useRef<HTMLInputElement>(null);
  const chatUnsubRef  = useRef<(() => void) | null>(null);
  // Tracks whether we've already started the subscription for this group session.
  // Prevents re-subscribing (and paying 60 reads) every time the user toggles tabs.
  const chatInitedRef = useRef(false);

  // Tear down subscription when group changes, reset init flag
  useEffect(() => {
    return () => {
      chatUnsubRef.current?.();
      chatUnsubRef.current = null;
      chatInitedRef.current = false;
    };
  }, [group.group_id]);

  // Lazy-init once on first Chat tab open; subscription stays alive until group changes
  useEffect(() => {
    if (innerTab !== 'chat' || chatInitedRef.current) return;
    chatInitedRef.current = true;

    getGroupChat(group.group_id).then(setChatMessages);

    (async () => {
      const authed = await signInFirebase();
      if (!authed) return;
      const q = query(
        collection(db, 'groups', group.group_id, 'chat'),
        orderBy('sent_at', 'asc'),
        limit(60),
      );
      chatUnsubRef.current = onSnapshot(q, snap => {
        setChatMessages(snap.docs.map(d => ({
          message_id:      d.id,
          sender_id:       d.data().sender_id as string,
          sender_username: d.data().sender_username as string,
          text:            d.data().text as string,
          sent_at:         (d.data().sent_at?.toDate?.()?.toISOString?.() ?? d.data().sent_at ?? '') as string,
        })));
      });
    })();
  }, [innerTab, group.group_id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSend = async () => {
    if (!chatDraft.trim() || chatSending) return;
    const text = chatDraft.trim();
    setChatDraft('');
    setChatSending(true);
    try { await sendGroupMessage(group.group_id, currentUserId, currentUsername, text); }
    finally { setChatSending(false); chatInputRef.current?.focus(); }
  };

  const isCreator = group.created_by === currentUserId;

  const refresh = useCallback(async () => {
    const [updated, profiles] = await Promise.all([
      getGroup(group.group_id),
      getGroupMemberProfiles(group.group_id),
    ]);
    if (updated) { setGroup(updated); onUpdate(); }
    setMemberProfiles(profiles);
  }, [group.group_id, onUpdate]);

  // Load member profiles on mount and poll every 5 min for online status
  useEffect(() => {
    refresh();
    const interval = setInterval(() => getGroupMemberProfiles(group.group_id).then(setMemberProfiles), 300_000);
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

  const handleRandomSpin = async () => {
    setRandomSpinning(true);
    setRandomMovieId(null);
    setRandomError('');
    const randomPage = Math.floor(Math.random() * 5) + 1;

    // Build streaming filter if a watch mode is active
    const servicesFilter = watchMode
      ? (watchMode === 'separately'
          ? computeIntersection(watchMemberServices)
          : computeUnion(watchMemberServices))
      : undefined;

    try {
      let movies = await discoverMovies({ services_filter: servicesFilter, page: randomPage });
      if (movies.length === 0) movies = await discoverMovies({ services_filter: servicesFilter, page: 1 });
      if (movies.length === 0) {
        setRandomError('Could not find a movie. Try again.');
      } else {
        const pick = movies[Math.floor(Math.random() * movies.length)];
        setRandomMovieId(pick.id);
        setRandomMovieOpen(true);
      }
    } catch {
      setRandomError('Something went wrong. Please try again.');
    } finally {
      setRandomSpinning(false);
    }
  };

  const onlineCount = memberProfiles.filter(p => isOnline(p.lastSeen)).length;

  return (
    <>
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}
      {randomMovieOpen && randomMovieId && (
        <MovieDetailModal movieId={randomMovieId} onClose={() => setRandomMovieOpen(false)} />
      )}

      <div className="max-w-3xl mx-auto space-y-4">
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

        {/* Inner tab bar */}
        <div className="flex border-b border-[#1A1A1A]">
          {(['group', 'chat'] as const).map(t => (
            <button key={t} onClick={() => setInnerTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors relative capitalize ${
                innerTab === t ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}>
              {t === 'group' ? <Clapperboard className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              {t === 'group' ? 'Group' : 'Chat'}
              {innerTab === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-[#7C5DBD] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Group content */}
        {innerTab === 'group' && <div className="space-y-6">

        {/* Movie Night — Watch Together/Separately */}
        <WatchModePanel
          groupId={group.group_id}
          onModeChange={(m, svcMap) => { setWatchMode(m); setWatchMemberServices(svcMap); }}
        />

        {/* Reelette Wheel */}
        <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Popcorn className="w-5 h-5 text-[#7C5DBD]" />Group Reelette
            </h3>
            <div className="flex gap-2">
              {/* Random Reelette — always available */}
              <button
                onClick={handleRandomSpin}
                disabled={randomSpinning}
                className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#333] border border-[#3A3A3A] text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                title={watchMode
                  ? `Pick a random movie from ${watchMode === 'separately' ? 'shared' : 'all member'} streaming services`
                  : 'Pick a totally random movie from all of TMDB'}
              >
                <Shuffle className={`w-4 h-4 ${randomSpinning ? 'animate-spin' : ''}`} />
                {randomSpinning
                  ? 'Finding…'
                  : watchMode === 'separately'
                    ? 'Random (Shared Services)'
                    : watchMode === 'together'
                      ? 'Random (All Services)'
                      : 'Random Movie'}
              </button>

              {/* Watchlist spin — only when watchlist has movies */}
              {group.watchlist.length > 0 && (
                <button
                  onClick={() => { setShowWheel(w => !w); setWinner(null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C5DBD] to-[#9B7BD7] hover:from-[#6B4DAD] hover:to-[#7C5DBD] text-white rounded-lg text-sm font-medium transition-all hover:scale-105"
                >
                  <Shuffle className="w-4 h-4" />{showWheel ? 'Hide Wheel' : 'Spin the Wheel'}
                </button>
              )}
            </div>
          </div>

          {randomError && <p className="text-yellow-500 text-sm text-center mb-3">{randomError}</p>}

          {/* Random movie result */}
          {randomMovieId && (
            <div className="mb-4 p-4 bg-[#141414] border border-[#7C5DBD]/30 rounded-xl flex items-center justify-between gap-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Random pick for the group</p>
                <button
                  onClick={() => setRandomMovieOpen(true)}
                  className="text-white font-semibold hover:text-[#9B7BD7] transition-colors text-left"
                >
                  Click to view
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRandomMovieOpen(true)}
                  className="px-3 py-1.5 bg-[#7C5DBD] hover:bg-[#9B7BD7] text-white rounded-lg text-sm transition-colors"
                >
                  View Movie
                </button>
                <button onClick={() => { setRandomMovieId(null); setRandomMovieOpen(false); }} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Watchlist wheel */}
          {showWheel && group.watchlist.length > 0 && (
            <div className="flex flex-col items-center gap-6 py-4">
              {winner ? (
                <div className="text-center space-y-4 py-4">
                  <div className="text-6xl animate-bounce">🎬</div>
                  <div className="bg-gradient-to-r from-[#7C5DBD] to-[#9B7BD7] rounded-2xl p-6 shadow-2xl shadow-[#7C5DBD]/30 max-w-sm mx-auto">
                    <p className="text-white/80 text-sm mb-1">Tonight you're watching…</p>
                    <h3 className="text-white text-2xl font-bold">{winner.movie_title}</h3>
                    <p className="text-white/60 text-sm mt-2">Added by @{winner.added_by_username}</p>
                  </div>
                  <button onClick={() => setWinner(null)} className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 rounded-lg text-sm transition-colors">Spin Again</button>
                </div>
              ) : <SpinWheel items={group.watchlist} onSpinEnd={setWinner} />}
            </div>
          )}

          {group.watchlist.length === 0 && !randomMovieId && (
            <p className="text-gray-600 text-sm text-center py-2">
              Add movies to the watchlist below to use the wheel, or hit <span className="text-gray-400">Random Movie</span> to discover something new.
            </p>
          )}
        </section>

        {/* Watchlist with TMDB search */}
        <section className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-[#7C5DBD]" /> Group Watchlist
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
                    {m.movie_poster
                      ? <img src={m.movie_poster} alt={m.movie_title} className="w-8 h-12 object-cover rounded shrink-0" />
                      : <Film className="w-4 h-4 text-gray-600 shrink-0" />}
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
            <Users className="w-5 h-5 text-[#7C5DBD]" /> Members
            <span className="text-gray-500 text-sm font-normal">({group.members.length})</span>
            {onlineCount > 0 && <span className="text-green-500 text-xs">• {onlineCount} online</span>}
          </h3>

          {/* Invite search */}
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Search username to invite…" value={friendSearch}
              onChange={e => setFriendSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFriendSearch()}
              className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none" />
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
                    className="text-sm px-3 py-1 bg-[#7C5DBD]/20 hover:bg-[#7C5DBD] border border-[#7C5DBD]/50 text-[#7C5DBD] hover:text-white rounded-lg transition-all disabled:opacity-50">
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
                    <button onClick={() => setProfileUserId(member_id)} className="text-white text-sm hover:text-[#7C5DBD] transition-colors">@{uname}</button>
                    <p className="text-xs text-gray-600">{online ? 'Online now' : prof?.lastSeen ? `Last seen ${timeAgo(prof.lastSeen)}` : 'Offline'}</p>
                  </div>
                  {isOwner && <span title="Creator"><Crown className="w-4 h-4 text-yellow-500 shrink-0" /></span>}
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
        </div>}

        {/* Chat panel */}
        {innerTab === 'chat' && (
          <div className="flex flex-col bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden" style={{ height: 520 }}>
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {chatMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600 text-sm">No messages yet — say something!</p>
                </div>
              )}
              {chatMessages.map(msg => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.message_id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && (
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(msg.sender_username)}`}
                        alt={msg.sender_username} className="w-7 h-7 rounded-full bg-[#141414] shrink-0" />
                    )}
                    <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && <span className="text-[10px] text-gray-600 px-1">@{msg.sender_username}</span>}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                        isMine ? 'bg-[#7C5DBD] text-white rounded-br-sm' : 'bg-[#1e1e1e] text-gray-200 rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                      {msg.sent_at && <span className="text-[9px] text-gray-700 px-1">{timeAgo(msg.sent_at)}</span>}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <div className="shrink-0 px-3 py-3 border-t border-[#1e1e1e] flex items-center gap-2">
              <input
                ref={chatInputRef}
                value={chatDraft}
                onChange={e => setChatDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Message the group…"
                className="flex-1 bg-[#1a1a1a] border border-[#2A2A2A] rounded-full px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C5DBD]/50"
              />
              <button onClick={handleChatSend} disabled={!chatDraft.trim() || chatSending}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#7C5DBD] hover:bg-[#9B7BD7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
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
          <h3 className="text-white font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-[#7C5DBD]" />Movie Groups</h3>
          <button onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7C5DBD] hover:bg-[#6B4DAD] text-white rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" />New Group
          </button>
        </div>
        {showCreate && (
          <div className="space-y-3 mb-2">
            <input type="text" placeholder="Group name…" value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none" />
            <input type="text" placeholder="Description (optional)…" value={newDesc} onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 px-4 py-2.5 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateGroup} disabled={creating || !newName.trim()}
                className="flex-1 bg-[#7C5DBD] hover:bg-[#6B4DAD] text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
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
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] hover:border-[#7C5DBD]/50 rounded-xl p-5 text-left transition-all hover:bg-[#222]">
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
  type FeedMode = 'all' | 'friends';
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [feedMode, setFeedMode] = useState<FeedMode>('all');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<{ id: string; title: string; year: number; poster: string } | null>(null);
  const [newRating, setNewRating] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ user_id: string; username: string; displayName: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUser = getUser();
  const currentUserId = currentUser?.user_id ?? '';

  useEffect(() => {
    if (activeTab === 'feed') {
      // Serve from module cache instantly — no loading flash on repeat tab visits
      if (_feedCache.size > 0) {
        setPosts(sortedFeedPosts());
        setLoading(false);
        return;
      }
      setLoading(true);
      getFeed().then(async (feedPosts) => {
        const needsAvatars = feedPosts.some(p => !p.avatarUrl);
        let resolved = feedPosts;
        if (needsAvatars) {
          const uniqueIds = [...new Set(feedPosts.map(p => p.user_id))];
          const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
          const avatarMap: Record<string, string> = {};
          uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
          resolved = feedPosts.map(p => ({ ...p, avatarUrl: p.avatarUrl ?? avatarMap[p.user_id] }));
        }
        mergeFeedPosts(resolved);
        setPosts(sortedFeedPosts());
        setLoading(false);
      });
    }
  }, [activeTab]);

  // Load friend IDs when friends-only feed is selected
  useEffect(() => {
    if (feedMode !== 'friends' || friendsLoaded || !currentUserId) return;
    getFriends(currentUserId).then(f => {
      setFriendIds(new Set(f.map(fr => fr.friend_id)));
      setFriendsLoaded(true);
    });
  }, [feedMode, friendsLoaded, currentUserId]);

  const displayedPosts = feedMode === 'friends'
    ? posts.filter(p => p.user_id === currentUserId || friendIds.has(p.user_id))
    : posts;

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

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // If we have a cached newest timestamp, only fetch posts since then
      const newPosts = _feedNewestAt ? await getFeedSince(_feedNewestAt) : await getFeed();
      if (newPosts.length > 0) {
        const uniqueIds = [...new Set(newPosts.map(p => p.user_id))];
        const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
        const avatarMap: Record<string, string> = {};
        uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
        mergeFeedPosts(newPosts.map(p => ({ ...p, avatarUrl: p.avatarUrl ?? avatarMap[p.user_id] })));
        setPosts(sortedFeedPosts());
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const q = match[1];
      setMentionQuery(q);
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
      mentionDebounceRef.current = setTimeout(async () => {
        if (!q) { setMentionResults([]); return; }
        const results = await searchUsers(q, currentUserId);
        setMentionResults(results.slice(0, 5));
      }, 300);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const handleMentionSelect = (username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? newMessage.length;
    const before = newMessage.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (!match) return;
    const start = cursor - match[0].length;
    const newText = newMessage.slice(0, start) + `@${username} ` + newMessage.slice(cursor);
    setNewMessage(newText);
    setMentionQuery(null);
    setMentionResults([]);
    setTimeout(() => {
      textarea.focus();
      const pos = start + username.length + 2;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleCreatePost = async () => {
    if (!currentUser) { setPostError('You must be logged in to post.'); return; }
    if (!selectedMovie) { setPostError('Please search and select a movie.'); return; }
    if (!newMessage.trim()) { setPostError('Message is required.'); return; }
    const rating = parseFloat(newRating);
    if (isNaN(rating) || rating < 0 || rating > 10) { setPostError('Rating must be 0–10.'); return; }
    setPosting(true); setPostError('');
    const result = await createPost({
      user_id: currentUser.user_id,
      username: currentUser.username,
      message: newMessage.trim(),
      movie_title: selectedMovie.title,
      movie_id: selectedMovie.id,
      movie_poster: selectedMovie.poster,
      rating,
    });
    if (result.success) {
      // Bust TTL cache so getFeed() hits the network, then reset module cache for a clean reload
      bustFeedCache();
      _feedCache.clear();
      _feedNewestAt = '';
      const updated = await getFeed();
      const needsAvatars = updated.some(p => !p.avatarUrl);
      let resolved = updated;
      if (needsAvatars) {
        const uniqueIds = [...new Set(updated.map(p => p.user_id))];
        const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
        const avatarMap: Record<string, string> = {};
        uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
        resolved = updated.map(p => ({ ...p, avatarUrl: p.avatarUrl ?? avatarMap[p.user_id] }));
      }
      mergeFeedPosts(resolved);
      setPosts(sortedFeedPosts());
      setSelectedMovie(null); setNewRating(''); setNewMessage('');
      setShowNewPostDialog(false);
    } else setPostError(result.message || 'Failed to create post.');
    setPosting(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'feed',    label: 'Feed',    icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'friends', label: 'Friends', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'groups',  label: 'Movie Groups',  icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="text-white -mx-6 -mt-8">
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      {/* ── Cinema header ── */}
      <div className="full-bleed relative overflow-hidden" style={{ marginBottom: 0 }}>
        {/* Film strip — top */}
        <div className="absolute top-0 inset-x-0 h-[22px] bg-[#0c0c0c] border-b border-[#1a1a1a] flex items-center z-20 overflow-hidden">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="shrink-0 flex-1 px-[3px]">
              <div className="h-[13px] rounded-[2px] bg-[#050505]" />
            </div>
          ))}
        </div>
        {/* Film strip — bottom */}
        <div className="absolute bottom-0 inset-x-0 h-[22px] bg-[#0c0c0c] border-t border-[#1a1a1a] flex items-center z-20 overflow-hidden">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="shrink-0 flex-1 px-[3px]">
              <div className="h-[13px] rounded-[2px] bg-[#050505]" />
            </div>
          ))}
        </div>

        {/* Glow flush with nav */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(124,93,189,0.22) 0%, rgba(124,93,189,0.06) 45%, transparent 75%)' }} />

        {/* Spotlight beams */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute" style={{ top: 0, left: '50%', width: 500, height: '110%', transform: 'translateX(-80%) rotate(-18deg)', transformOrigin: 'top center', background: 'linear-gradient(to bottom, rgba(255,255,255,0.028) 0%, transparent 65%)' }} />
          <div className="absolute" style={{ top: 0, left: '50%', width: 500, height: '110%', transform: 'translateX(-20%) rotate(18deg)', transformOrigin: 'top center', background: 'linear-gradient(to bottom, rgba(255,255,255,0.028) 0%, transparent 65%)' }} />
        </div>

        {/* Side curtains */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/70 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/70 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-10 px-6" style={{ paddingTop: 48, paddingBottom: 40 }}>
          {/* NOW SCREENING badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#7C5DBD]/60" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-[#7C5DBD] uppercase" style={{ fontFamily: "'Courier New', monospace" }}>
              Now Screening
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C5DBD] animate-pulse" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#7C5DBD]/60" />
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif", fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.8)', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            The Screening Room
          </h1>
          <p className="mt-2 text-gray-400" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '1rem', letterSpacing: '0.03em' }}>
            Share your take on what you've watched.
          </p>

          <div className="flex items-center gap-3 mt-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#7C5DBD]/50" />
            <span className="text-[#7C5DBD]/60 text-xs tracking-widest">✦</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#7C5DBD]/50" />
          </div>
        </div>
      </div>

      <div>

        {/* Primary tab bar */}
        <div className="flex border-b border-[#1A1A1A]">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-[15px] transition-colors relative ${
                activeTab === t.id ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
              style={{ fontFamily: activeTab === t.id ? "'Playfair Display', Georgia, serif" : undefined, fontWeight: activeTab === t.id ? 700 : 600 }}
            >
              {t.icon}{t.label}
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-[#7C5DBD] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Feed ── */}
        {activeTab === 'feed' && (
          <>
            {/* For You / Friends + wheel refresh */}
            <div className="flex items-center border-b border-[#1A1A1A]">
              <button onClick={() => setFeedMode('all')}
                className={`flex-1 py-3.5 text-sm font-semibold relative transition-colors ${
                  feedMode === 'all' ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`}>
                For You
                {feedMode === 'all' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#7C5DBD] rounded-full" />}
              </button>
              <button onClick={() => setFeedMode('friends')}
                className={`flex-1 py-3.5 text-sm font-semibold relative transition-colors ${
                  feedMode === 'friends' ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`}>
                Friends
                {feedMode === 'friends' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#7C5DBD] rounded-full" />}
              </button>
              <button onClick={handleRefresh} disabled={refreshing} title="Refresh feed"
                className="px-5 py-3.5 text-gray-500 hover:text-white transition-colors disabled:opacity-40">
                <RefreshCw className={`w-[18px] h-[18px] ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Inline compose */}
            {currentUser && (
              <div className="border-b border-[#1A1A1A] px-4 py-3 flex gap-3 cursor-pointer hover:bg-[#0a0a0a] transition-colors"
                onClick={() => setShowNewPostDialog(true)}>
                <UserAvatar username={currentUser.username} size={44} />
                <div className="flex-1 min-w-0 pointer-events-none">
                  <p className="text-gray-600 text-[17px] py-2">What movie are you watching?</p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A] mt-1">
                    <Film className="w-5 h-5 text-[#7C5DBD]" />
                    <span className="bg-[#7C5DBD] text-white font-bold text-sm rounded-full px-5 py-1.5">
                      Post
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Posts */}
            <div>
              {loading
                ? <p className="text-gray-500 text-center py-16">Loading feed…</p>
                : displayedPosts.length === 0
                  ? <p className="text-gray-500 text-center py-16">
                      {feedMode === 'friends' ? 'No posts from friends yet. Add some friends!' : 'No posts yet. Be the first to share!'}
                    </p>
                  : displayedPosts.map(post => (
                      <PostCard key={post.post_id} post={post} currentUserId={currentUserId}
                        currentUsername={currentUser?.username ?? ''}
                        onLike={handleLike} onDelete={handleDelete}
                        onOpenProfile={setProfileUserId} />
                    ))
              }
            </div>
          </>
        )}

        {activeTab === 'friends' && (
          <div className="py-6 px-4">
            <FriendsPanel onOpenProfile={setProfileUserId} />
          </div>
        )}
        {activeTab === 'groups' && (
          <div className="py-6 px-4">
            <GroupsPanel onOpenProfile={setProfileUserId} />
          </div>
        )}

      </div>

      {/* New Post Dialog */}
      {showNewPostDialog && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] rounded-2xl border border-[#1e1e1e] p-6 max-w-lg w-full">
            {/* Dialog cinema header */}
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#7C5DBD]/40" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#7C5DBD] uppercase" style={{ fontFamily: "'Courier New', monospace" }}>New Review</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#7C5DBD]/40" />
            </div>
            <h2 className="text-center mb-5" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.5rem', color: '#fff' }}>
              What did you screen?
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Movie</label>
                <PostMovieSearch onSelect={setSelectedMovie} selected={selectedMovie} />
              </div>
              <input type="number" placeholder="Your rating (0–10)" min="0" max="10" step="0.5" value={newRating} onChange={e => setNewRating(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none" />
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  placeholder="Share your thoughts… use @ to mention someone"
                  rows={4}
                  value={newMessage}
                  onChange={handleMessageChange}
                  onKeyDown={e => { if (e.key === 'Escape') { setMentionQuery(null); setMentionResults([]); } }}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#7C5DBD] focus:outline-none resize-none"
                />
                {mentionQuery !== null && mentionResults.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl z-10 overflow-hidden">
                    {mentionResults.map(u => (
                      <button
                        key={u.user_id}
                        onMouseDown={e => { e.preventDefault(); handleMentionSelect(u.username); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1C1C1C] transition-colors text-left border-b border-[#2A2A2A] last:border-0"
                      >
                        <span className="text-white text-sm font-medium">@{u.username}</span>
                        {u.displayName !== u.username && <span className="text-gray-500 text-xs">{u.displayName}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {postError && <p className="text-red-400 text-sm">{postError}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setShowNewPostDialog(false); setPostError(''); setSelectedMovie(null); setNewRating(''); setNewMessage(''); setMentionQuery(null); setMentionResults([]); }}
                  className="flex-1 bg-[#2A2A2A] hover:bg-[#333333] text-white px-6 py-3 rounded-lg transition-colors font-medium">Cancel</button>
                <button onClick={handleCreatePost} disabled={posting}
                  className="flex-1 bg-gradient-to-r from-[#7C5DBD] to-[#9B7BD7] hover:from-[#6B4DAD] hover:to-[#7C5DBD] text-white px-6 py-3 rounded-lg transition-all font-medium disabled:opacity-50">
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
