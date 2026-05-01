import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import {
  Heart, MessageCircle, Plus, Star, Trash2, Users, UserPlus, UserMinus,
  Search, Check, X, Film, Shuffle, Popcorn, Crown, LogOut,
  Tv, Wifi, WifiOff, Loader2, Clapperboard, Send, RefreshCw,
  Clock, TrendingUp, ArrowLeft,
} from 'lucide-react';
import {
  getFeed, getFeedSince, bustFeedCache, createPost, likePost, deletePost, getUser, timeAgo,
  getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest,
  rejectFriendRequest, searchUsers,
  getUserGroups, createGroup, getGroup, addGroupMember, removeGroupMember,
  addToGroupWatchlist, removeFromGroupWatchlist, deleteGroup,
  getGroupMemberProfiles, getGroupMemberServices,
  updateLastSeen, searchMovies, discoverMovies, getMovieDetails,
  getReplies, addReply,
  getGroupChat, sendGroupMessage,
  getTrendingMovies, getWatchedMovies,
  type FeedPost, type Friend, type FriendRequest, type MovieGroup,
  type GroupMovie, type MemberProfile, type MemberServiceEntry, type PostReply,
  type GroupMessage, type Movie, type WatchedMovie,
  SERVICE_DISPLAY, getUserPublicProfile,
} from '../services/api';
import { db, signInFirebase } from '../lib/firebase';
import { collection, query as fbQuery, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { UserProfileModal } from './UserProfileModal';
import { MovieDetailModal } from './MovieDetailModal';

// ── Module-level feed cache — survives tab navigation ──────────
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
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0A0A0A] ${online ? 'bg-emerald-500' : 'bg-zinc-700'}`}
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
      <img src={src} alt={username} className="w-full h-full rounded-full object-cover bg-[#141416]" />
      {online !== undefined && <OnlineDot online={online} />}
    </div>
  );
}

// ── Service overlap utilities ──────────────────────────────────
function computeIntersection(map: Record<string, MemberServiceEntry>): Record<string, boolean> {
  const members = Object.values(map);
  if (!members.length) return {};
  return Object.fromEntries(SERVICE_KEYS.map(k => [k, members.every(m => !!m.services[k])]));
}

function computeUnion(map: Record<string, MemberServiceEntry>): Record<string, boolean> {
  const members = Object.values(map);
  return Object.fromEntries(SERVICE_KEYS.map(k => [k, members.some(m => !!m.services[k])]));
}

function membersWithService(map: Record<string, MemberServiceEntry>, key: string): string[] {
  return Object.entries(map).filter(([, v]) => !!v.services[key]).map(([, v]) => v.username);
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
          <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#2a2a2e" strokeWidth="8" />
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
            <circle cx={cx} cy={cy} r={28} fill="#141416" stroke="#2a2a2e" strokeWidth="3" />
            <circle cx={cx} cy={cy} r={10} fill="#7C5DBD" />
          </g>
        </svg>
      </div>
      <button onClick={handleSpin} disabled={spinning}
        className="flex items-center gap-3 px-10 py-4 bg-[#7C5DBD] hover:bg-[#6B4DAD] disabled:opacity-50 text-white font-bold text-lg rounded-full shadow-xl shadow-[#7C5DBD]/30 transition-all hover:scale-105 disabled:scale-100">
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

  const handleMode = (m: WatchMode) => { setMode(m); fetchAndDiscover(m); };
  const activeFilter = mode ? (mode === 'separately' ? computeIntersection(memberServices) : computeUnion(memberServices)) : {};
  const activeServices = SERVICE_KEYS.filter(k => activeFilter[k]);

  return (
    <section className="bg-[#141416] border border-[#2a2a2e] rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <Tv className="w-5 h-5 text-[#7C5DBD]" /> Movie Night
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleMode('separately')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'separately' ? 'border-[#7C5DBD] bg-[#7C5DBD]/10' : 'border-[#2a2a2e] hover:border-[#3a3a3e]'}`}>
          <div className="flex items-center gap-2 mb-1">
            <WifiOff className="w-4 h-4 text-blue-400" />
            <span className="text-white font-medium text-sm">Watch Separately</span>
          </div>
          <p className="text-zinc-500 text-xs">Services all members share.</p>
        </button>
        <button onClick={() => handleMode('together')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'together' ? 'border-[#7C5DBD] bg-[#7C5DBD]/10' : 'border-[#2a2a2e] hover:border-[#3a3a3e]'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-medium text-sm">Watch Together</span>
          </div>
          <p className="text-zinc-500 text-xs">All services across everyone.</p>
        </button>
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking member services…
        </div>
      )}
      {mode && !loading && activeServices.length > 0 && (
        <div className="space-y-2">
          <p className="text-zinc-400 text-sm font-medium">
            {mode === 'separately' ? `Shared by all (${activeServices.length})` : `Combined (${activeServices.length})`}
          </p>
          <div className="flex flex-wrap gap-2">
            {activeServices.map(k => {
              const who = membersWithService(memberServices, k);
              return (
                <div key={k} className="group relative">
                  <span className="px-3 py-1.5 bg-[#2a2a2e] border border-[#333] text-zinc-300 rounded-lg text-xs cursor-default">
                    {SERVICE_DISPLAY[k] ?? k}
                    {mode === 'together' && <span className="text-zinc-500 ml-1">({who.length})</span>}
                  </span>
                  {mode === 'together' && (
                    <div className="absolute bottom-full left-0 mb-1 bg-[#141416] border border-[#333] rounded-lg p-2 text-xs text-zinc-400 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
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
          {mode === 'separately' ? 'No shared services. Try "Watch Together".' : 'No services configured yet.'}
        </p>
      )}
      {discovering && (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Finding movies…
        </div>
      )}
      {movies.length > 0 && (
        <div>
          <p className="text-zinc-400 text-sm mb-3">{movies.length} movies available</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto no-scrollbar pr-1">
            {movies.map(m => (
              <button key={m.id}
                onClick={async () => {
                  if (!currentUser) return;
                  setSelectedGroupMovie(m.id);
                  await addToGroupWatchlist(groupId, m.id, m.title, currentUser.user_id, currentUser.username, m.poster);
                  setSelectedGroupMovie(null);
                }}
                disabled={selectedGroupMovie === m.id}
                className="relative group rounded-lg overflow-hidden border border-[#2a2a2e] hover:border-[#7C5DBD] transition-all"
                title={`${m.title} (${m.year})`}>
                {m.poster
                  ? <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                  : <div className="w-full aspect-[2/3] bg-[#141416] flex items-center justify-center"><Film className="w-6 h-6 text-zinc-600" /></div>}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  {selectedGroupMovie === m.id ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Plus className="w-6 h-6 text-white" />}
                </div>
                <div className="p-1.5">
                  <p className="text-white text-xs font-medium truncate leading-tight">{m.title}</p>
                  <p className="text-zinc-600 text-xs">{m.year}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Mention-aware message renderer ────────────────────────────
function renderMessage(message: string, onOpenProfile: (userId: string) => void) {
  const parts = message.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const uname = part.slice(1);
      return (
        <button key={i}
          onClick={async () => {
            const results = await searchUsers(uname, '');
            const match = results.find((r: { username: string; user_id: string }) => r.username.toLowerCase() === uname.toLowerCase());
            if (match) onOpenProfile(match.user_id);
          }}
          className="text-[#7C5DBD] font-semibold hover:underline cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 0 }}>
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Activity Skeleton ─────────────────────────────────────────
function ActivitySkeleton() {
  return (
    <div className="mb-3 rounded-2xl bg-[#0d0d0f] overflow-hidden">
      <div className="px-4 py-3 flex gap-3">
        <div className="w-10 h-10 bg-[#1a1a1e] rounded-full animate-pulse shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-32 bg-[#1a1a1e] rounded-full animate-pulse" />
          <div className="h-3 w-full bg-[#1a1a1e] rounded-full animate-pulse" />
          <div className="h-3 w-4/5 bg-[#1a1a1e] rounded-full animate-pulse" />
        </div>
        <div className="w-12 h-16 bg-[#1a1a1e] rounded-lg animate-pulse shrink-0" />
      </div>
    </div>
  );
}

// ── Post Movie Search ──────────────────────────────────────────
type MovieOption = { id: string; title: string; year: number; poster: string };

function PostMovieSearch({ onSelect, selected }: { onSelect: (m: MovieOption | null) => void; selected: MovieOption | null }) {
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
      <div className="flex items-center gap-3 bg-[#141416] border border-[#7C5DBD]/50 rounded-xl p-3">
        {selected.poster
          ? <img src={selected.poster} alt={selected.title} className="w-10 h-[60px] object-cover rounded-lg shrink-0" />
          : <div className="w-10 h-[60px] bg-[#2a2a2e] rounded-lg shrink-0 flex items-center justify-center"><Film className="w-4 h-4 text-zinc-600" /></div>}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{selected.title}</p>
          <p className="text-zinc-500 text-xs">{selected.year}</p>
        </div>
        <button onClick={() => onSelect(null)} className="text-zinc-600 hover:text-red-400 transition-colors p-1 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input type="text" placeholder="Search for a movie…" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full bg-[#141416] border border-[#2a2a2e] rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:border-[#7C5DBD]/50 focus:outline-none transition-colors" />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#141416] border border-[#2a2a2e] rounded-xl shadow-2xl z-20 overflow-hidden max-h-60 overflow-y-auto no-scrollbar">
          {results.map(m => (
            <button key={m.id} onClick={() => { onSelect(m); setQuery(''); setResults([]); }}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1e] transition-colors text-left border-b border-[#2a2a2e] last:border-0">
              {m.poster
                ? <img src={m.poster} alt={m.title} className="w-8 h-12 object-cover rounded-lg shrink-0" />
                : <div className="w-8 h-12 bg-[#2a2a2e] rounded-lg shrink-0 flex items-center justify-center"><Film className="w-3 h-3 text-zinc-600" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{m.title}</p>
                <p className="text-zinc-500 text-xs">{m.year}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline Compose Box ─────────────────────────────────────────
function ComposeBox({ currentUser, onPostCreated }: {
  currentUser: { user_id: string; username: string; avatarUrl?: string } | null;
  onPostCreated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieOption | null>(null);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [movieSearchOpen, setMovieSearchOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ user_id: string; username: string; displayName: string }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        if (!message && !selectedMovie && rating === null) {
          setExpanded(false);
          setMovieSearchOpen(false);
          setRatingOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded, message, selectedMovie, rating]);

  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const q = match[1];
      setMentionQuery(q);
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
      mentionDebounceRef.current = setTimeout(async () => {
        if (!q || !currentUser) { setMentionResults([]); return; }
        const results = await searchUsers(q, currentUser.user_id);
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
    const cursor = textarea.selectionStart ?? message.length;
    const before = message.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (!match) return;
    const start = cursor - match[0].length;
    const newText = message.slice(0, start) + `@${username} ` + message.slice(cursor);
    setMessage(newText);
    setMentionQuery(null);
    setMentionResults([]);
    setTimeout(() => {
      textarea.focus();
      const pos = start + username.length + 2;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!selectedMovie) { setPostError('Tag a movie first.'); return; }
    setPosting(true);
    setPostError('');
    const result = await createPost({
      user_id: currentUser.user_id,
      username: currentUser.username,
      message: message.trim(),
      movie_title: selectedMovie.title,
      movie_id: selectedMovie.id,
      movie_poster: selectedMovie.poster,
      rating: rating ?? 0,
    });
    if (result.success) {
      bustFeedCache();
      _feedCache.clear();
      _feedNewestAt = '';
      setSelectedMovie(null);
      setMessage('');
      setRating(null);
      setExpanded(false);
      setMovieSearchOpen(false);
      setRatingOpen(false);
      onPostCreated();
    } else {
      setPostError(result.message || 'Failed to post.');
    }
    setPosting(false);
  };

  const handleReset = () => {
    setExpanded(false);
    setSelectedMovie(null);
    setMessage('');
    setRating(null);
    setRatingOpen(false);
    setMovieSearchOpen(false);
    setPostError('');
    setMentionQuery(null);
    setMentionResults([]);
  };

  if (!currentUser) return null;

  return (
    <div ref={boxRef}>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#0f0f11] transition-colors text-left"
        >
          <UserAvatar 
          username={currentUser.username} 
          avatarUrl={currentUser.avatarUrl}
          size={38} />
          <span className="flex-1 text-zinc-600 text-[15px]">What movie did you watch?</span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#7C5DBD]/20 text-[#9B7BD7] border border-[#7C5DBD]/30">
            Post
          </span>
        </button>
      ) : (
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="flex gap-3">
            <UserAvatar 
            username={currentUser.username}
            avatarUrl={currentUser.avatarUrl }
            
            size={38} />
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                autoFocus
                placeholder="What movie did you watch?"
                rows={3}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={e => { if (e.key === 'Escape') { setMentionQuery(null); setMentionResults([]); } }}
                className="w-full bg-transparent text-white text-[15px] placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed"
              />
              {mentionQuery !== null && mentionResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#141416] border border-[#2a2a2e] rounded-xl shadow-2xl z-30 overflow-hidden">
                  {mentionResults.map(u => (
                    <button key={u.user_id} onMouseDown={e => { e.preventDefault(); handleMentionSelect(u.username); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a1a1e] transition-colors text-left">
                      <span className="text-white text-sm font-medium">@{u.username}</span>
                      {u.displayName !== u.username && <span className="text-zinc-500 text-xs">{u.displayName}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Movie card preview */}
          {selectedMovie && (
            <div className="ml-[50px]">
              <div className="flex items-center gap-3 bg-[#141416] border border-[#7C5DBD]/30 rounded-xl p-3">
                {selectedMovie.poster
                  ? <img src={selectedMovie.poster} alt={selectedMovie.title} className="w-9 h-[54px] object-cover rounded-lg shrink-0" />
                  : <div className="w-9 h-[54px] bg-[#2a2a2e] rounded-lg shrink-0 flex items-center justify-center"><Film className="w-4 h-4 text-zinc-600" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{selectedMovie.title}</p>
                  <p className="text-zinc-500 text-xs">{selectedMovie.year}</p>
                  {rating !== null && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-yellow-400 text-xs font-bold">{rating}/10</span>
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedMovie(null)} className="text-zinc-600 hover:text-red-400 transition-colors p-1 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Movie search panel */}
          {movieSearchOpen && (
            <div className="ml-[50px]">
              <PostMovieSearch onSelect={m => { setSelectedMovie(m); setMovieSearchOpen(false); }} selected={null} />
            </div>
          )}

          {/* Rating picker */}
          {ratingOpen && (
            <div className="ml-[50px]">
              <div className="bg-[#141416] border border-[#2a2a2e] rounded-xl p-3">
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2.5">Rating</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => { setRating(rating === n ? null : n); }}
                      className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                        rating === n
                          ? 'bg-yellow-400 text-black'
                          : 'bg-[#2a2a2e] text-zinc-400 hover:bg-[#3a3a3e] hover:text-white'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
                {rating !== null && (
                  <button onClick={() => setRating(null)} className="text-xs text-zinc-600 hover:text-zinc-400 mt-2 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {postError && <p className="text-red-400 text-sm ml-[50px]">{postError}</p>}

          {/* Action row */}
          <div className="flex items-center justify-between ml-[50px] pt-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setMovieSearchOpen(v => !v); setRatingOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  movieSearchOpen || selectedMovie ? 'text-[#9B7BD7] bg-[#7C5DBD]/15' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                {selectedMovie ? selectedMovie.title.length > 14 ? selectedMovie.title.slice(0, 13) + '…' : selectedMovie.title : 'Tag a Movie'}
              </button>
              <button
                onClick={() => { setRatingOpen(v => !v); setMovieSearchOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  ratingOpen || rating !== null ? 'text-yellow-400 bg-yellow-400/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${rating !== null ? 'fill-yellow-400' : ''}`} />
                {rating !== null ? `${rating}/10` : 'Rate It'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={posting || !selectedMovie}
                className="px-4 py-1.5 bg-[#7C5DBD] hover:bg-[#6B4DAD] disabled:opacity-40 text-white text-sm font-semibold rounded-full transition-colors">
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reaction helpers (module-level so they survive tab switches) ─
const _reactionsCache = new Map<string, Record<string, string[]>>();
const REACTION_EMOJIS = ['😂', '❤️', '😮', '🔥', '👏', '😢'];

function loadReactions(postId: string): Record<string, string[]> {
  if (_reactionsCache.has(postId)) return _reactionsCache.get(postId)!;
  try { const r = localStorage.getItem(`reelette_rxn_${postId}`); const d = r ? JSON.parse(r) : {}; _reactionsCache.set(postId, d); return d; } catch { return {}; }
}
function saveReactions(postId: string, data: Record<string, string[]>) {
  _reactionsCache.set(postId, data);
  try { localStorage.setItem(`reelette_rxn_${postId}`, JSON.stringify(data)); } catch {}
}

// ── Activity Card ─────────────────────────────────────────────
function ActivityCard({ post, currentUserId, currentUsername, onLike, onDelete, onOpenProfile }: {
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
  const [likeAnim, setLikeAnim] = useState(false);
  const [movieMeta, setMovieMeta] = useState<{ year: string; genres: string[]; runtime: number; voteAverage: number; overview: string } | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>(() => loadReactions(post.post_id));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [openMovieId, setOpenMovieId] = useState<string | null>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post.movie_id) return;
    getMovieDetails(post.movie_id).then(d => {
      const year = d.release_date ? String(d.release_date).slice(0, 4) : '';
      const genres = Array.isArray(d.genres) ? (d.genres as { name: string }[]).slice(0, 2).map(g => g.name) : [];
      const runtime = typeof d.runtime === 'number' ? d.runtime : 0;
      const voteAverage = typeof d.vote_average === 'number' ? d.vote_average : 0;
      const overview = typeof d.overview === 'string' ? d.overview : '';
      setMovieMeta({ year, genres, runtime, voteAverage, overview });
    }).catch(() => {});
  }, [post.movie_id]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  const handleReact = (emoji: string) => {
    const next = { ...reactions };
    const users = next[emoji] ?? [];
    if (users.includes(currentUserId)) {
      next[emoji] = users.filter(id => id !== currentUserId);
      if (next[emoji].length === 0) delete next[emoji];
    } else {
      next[emoji] = [...users, currentUserId];
    }
    setReactions(next);
    saveReactions(post.post_id, next);
    setShowEmojiPicker(false);
  };

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

  const handleLikeClick = () => {
    setLikeAnim(true);
    onLike(post.post_id);
    setTimeout(() => setLikeAnim(false), 320);
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
    <article className="mb-0 transition-colors duration-150 hover:bg-[#0f0f11]">
      {/* Rating strip */}
      {post.rating > 0 && (
        <div className="px-4 pt-3 pb-0 flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => {
              const filled = (post.rating / 2) >= (i + 1);
              const half = !filled && (post.rating / 2) > i;
              return (
                <Star key={i} className={`w-3 h-3 ${filled || half ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700'}`} />
              );
            })}
          </div>
          <span className="text-yellow-400 font-bold text-xs tabular-nums">{post.rating}/10</span>
        </div>
      )}

      <div className="px-4 pt-3 pb-2 flex gap-3">
        {/* Avatar */}
        <UserAvatar username={post.username} avatarUrl={post.avatarUrl} size={38} onClick={() => onOpenProfile(post.user_id)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <button onClick={() => onOpenProfile(post.user_id)}
                className="text-white text-sm font-semibold hover:text-[#9B7BD7] transition-colors leading-none shrink-0">
                {(post as { displayName?: string }).displayName || post.username}
              </button>
              <span className="text-zinc-600 text-xs shrink-0">@{post.username}</span>
              <span className="text-zinc-700 text-xs shrink-0">· {timeAgo(post.created_at)}</span>
            </div>
            {post.user_id === currentUserId && (
              <button onClick={() => onDelete(post.post_id)} className="shrink-0 text-zinc-700 hover:text-red-500 transition-colors p-0.5">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {post.message && (
            <p className="text-zinc-300 text-[14px] leading-relaxed mb-2">
              {renderMessage(post.message, onOpenProfile)}
            </p>
          )}

          {/* Movie card */}
          {post.movie_title && (
            <div className="flex gap-3 mb-3">
              {post.movie_poster
                ? <img src={post.movie_poster} alt={post.movie_title}
                    className="w-[76px] h-[114px] object-cover rounded-xl shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setOpenMovieId(post.movie_id)} />
                : <div className="w-[76px] h-[114px] bg-[#1a1a1e] rounded-xl shrink-0 flex items-center justify-center cursor-pointer" onClick={() => setOpenMovieId(post.movie_id)}>
                    <Film className="w-6 h-6 text-zinc-600" />
                  </div>}
              <div className="flex-1 min-w-0 flex flex-col justify-start gap-1.5 pt-0.5">
                <p className="text-white text-sm font-medium leading-snug line-clamp-2">{post.movie_title}</p>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {movieMeta?.year && <span className="text-zinc-500">{movieMeta.year}</span>}
                  {movieMeta?.runtime > 0 && <span className="text-zinc-600">{movieMeta.runtime}m</span>}
                </div>
                {movieMeta && movieMeta.voteAverage > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-amber-400 text-xs font-semibold">{movieMeta.voteAverage.toFixed(1)}</span>
                    <span className="text-zinc-600 text-[11px]">Fan Rating</span>
                  </div>
                )}
                {movieMeta?.genres && movieMeta.genres.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {movieMeta.genres.map(g => (
                      <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C5DBD]/10 text-[#9B7BD7] border border-[#7C5DBD]/20">{g}</span>
                    ))}
                  </div>
                )}
                {movieMeta?.overview && (
                  <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-3">{movieMeta.overview}</p>
                )}
              </div>
            </div>
          )}
          {openMovieId && <MovieDetailModal movieId={openMovieId} onClose={() => setOpenMovieId(null)} />}

          {/* Action row */}
          <div className="flex items-center gap-0.5 -ml-2 flex-wrap">
            <button onClick={toggleReplies}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-blue-500/[0.08] hover:text-blue-400 ${showReplies ? 'text-blue-400' : 'text-zinc-600'}`}>
              <MessageCircle className="w-[14px] h-[14px]" />
              {(showReplies ? replies.length : localReplyCount) > 0 && (
                <span className="tabular-nums">{showReplies ? replies.length : localReplyCount}</span>
              )}
            </button>
            <button onClick={handleLikeClick}
              style={{ transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)', transform: likeAnim ? 'scale(1.4)' : 'scale(1)' }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[#7C5DBD]/[0.08] hover:text-[#9B7BD7] ${isLiked ? 'text-[#7C5DBD]' : 'text-zinc-600'}`}>
              <Heart className={`w-[14px] h-[14px] ${isLiked ? 'fill-[#7C5DBD]' : ''}`} />
              {post.likes > 0 && <span className="tabular-nums">{post.likes}</span>}
            </button>

            {/* Emoji reaction trigger */}
            <div className="relative" ref={emojiRef}>
              <button onClick={() => setShowEmojiPicker(s => !s)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors">
                <span className="text-sm leading-none">😊</span>
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl px-2 py-1.5 shadow-xl z-20">
                  {REACTION_EMOJIS.map(e => (
                    <button key={e} onClick={() => handleReact(e)}
                      className={`text-base hover:scale-125 transition-transform px-0.5 rounded ${reactions[e]?.includes(currentUserId) ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reaction pills */}
            {Object.entries(reactions).filter(([, users]) => users.length > 0).map(([emoji, users]) => (
              <button key={emoji} onClick={() => handleReact(emoji)}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-all ${users.includes(currentUserId) ? 'bg-[#7C5DBD]/15 border-[#7C5DBD]/30 text-[#9B7BD7]' : 'bg-white/[0.03] border-white/[0.07] text-zinc-400 hover:border-white/20'}`}>
                <span className="text-sm leading-none">{emoji}</span>
                <span className="tabular-nums">{users.length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Replies */}
      {showReplies && (
        <div className="px-4 pb-3 pl-[62px] space-y-3 ">
          <div className="pt-3">
            {loadingReplies ? (
              <div className="flex items-center gap-2 text-zinc-600 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
            ) : replies.length === 0 ? (
              <p className="text-zinc-700 text-xs">No replies yet.</p>
            ) : (
              <div className="space-y-2.5">
                {replies.map(r => (
                  <div key={r.reply_id} className="flex items-start gap-2">
                    <UserAvatar username={r.username} avatarUrl={r.avatarUrl} size={26} onClick={() => onOpenProfile(r.user_id)} />
                    <div className="flex-1 bg-[#141416] rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <button onClick={() => onOpenProfile(r.user_id)} className="text-white text-xs font-semibold hover:text-[#9B7BD7] transition-colors">@{r.username}</button>
                        <span className="text-zinc-700 text-xs">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-zinc-400 text-sm leading-snug">{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <input type="text" placeholder="Reply…" value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmitReply()}
                className="flex-1 bg-[#141416] rounded-full px-4 py-1.5 text-white text-sm placeholder:text-zinc-700 focus:border-[#7C5DBD]/40 focus:outline-none" />
              <button onClick={handleSubmitReply} disabled={submittingReply || !replyText.trim()}
                className="p-2 bg-[#7C5DBD] hover:bg-[#6B4DAD] disabled:opacity-40 text-white rounded-full transition-colors">
                {submittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input type="text" placeholder="Search TMDB to add…" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full bg-[#141416] border border-[#2a2a2e] rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-[#7C5DBD]/50 focus:outline-none" />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#141416] border border-[#2a2a2e] rounded-xl shadow-2xl z-20 overflow-hidden max-h-72 overflow-y-auto no-scrollbar">
          {results.map(m => (
            <button key={m.id} onClick={() => handleAdd(m)} disabled={addingId === m.id}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1e] transition-colors text-left border-b border-[#2a2a2e] last:border-0">
              {m.poster
                ? <img src={m.poster} alt={m.title} className="w-9 h-14 object-cover rounded-lg shrink-0" />
                : <div className="w-9 h-14 bg-[#2a2a2e] rounded-lg shrink-0 flex items-center justify-center"><Film className="w-4 h-4 text-zinc-600" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{m.title}</p>
                <p className="text-zinc-500 text-xs">{m.year}</p>
              </div>
              {addingId === m.id ? <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0" /> : <Plus className="w-4 h-4 text-[#7C5DBD] shrink-0" />}
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
  const [innerTab, setInnerTab] = useState<'group' | 'chat'>('group');
  const [chatMessages, setChatMessages] = useState<GroupMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatUnsubRef = useRef<(() => void) | null>(null);
  const chatInitedRef = useRef(false);

  useEffect(() => {
    return () => { chatUnsubRef.current?.(); chatUnsubRef.current = null; chatInitedRef.current = false; };
  }, [group.group_id]);

  useEffect(() => {
    if (innerTab !== 'chat' || chatInitedRef.current) return;
    chatInitedRef.current = true;
    getGroupChat(group.group_id).then(setChatMessages);
    (async () => {
      const authed = await signInFirebase();
      if (!authed) return;
      const q = fbQuery(collection(db, 'groups', group.group_id, 'chat'), orderBy('sent_at', 'asc'), limit(60));
      chatUnsubRef.current = onSnapshot(q, snap => {
        setChatMessages(snap.docs.map(d => ({
          message_id: d.id,
          sender_id: d.data().sender_id as string,
          sender_username: d.data().sender_username as string,
          text: d.data().text as string,
          sent_at: (d.data().sent_at?.toDate?.()?.toISOString?.() ?? d.data().sent_at ?? '') as string,
        })));
      });
    })();
  }, [innerTab, group.group_id]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

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
    const [updated, profiles] = await Promise.all([getGroup(group.group_id), getGroupMemberProfiles(group.group_id)]);
    if (updated) { setGroup(updated); onUpdate(); }
    setMemberProfiles(profiles);
  }, [group.group_id, onUpdate]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => getGroupMemberProfiles(group.group_id).then(setMemberProfiles), 300_000);
    return () => clearInterval(interval);
  }, [group.group_id, refresh]);

  const profileFor = (member_id: string): MemberProfile | undefined => memberProfiles.find(p => p.user_id === member_id);

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
    const servicesFilter = watchMode
      ? (watchMode === 'separately' ? computeIntersection(watchMemberServices) : computeUnion(watchMemberServices))
      : undefined;
    try {
      let movies = await discoverMovies({ services_filter: servicesFilter, page: randomPage });
      if (movies.length === 0) movies = await discoverMovies({ services_filter: servicesFilter, page: 1 });
      if (movies.length === 0) { setRandomError('Could not find a movie. Try again.'); }
      else {
        const pick = movies[Math.floor(Math.random() * movies.length)];
        setRandomMovieId(pick.id);
        setRandomMovieOpen(true);
      }
    } catch { setRandomError('Something went wrong. Please try again.'); }
    finally { setRandomSpinning(false); }
  };

  const onlineCount = memberProfiles.filter(p => isOnline(p.lastSeen)).length;

  return (
    <>
      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}
      {randomMovieOpen && randomMovieId && <MovieDetailModal movieId={randomMovieId} onClose={() => setRandomMovieOpen(false)} />}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-white text-xl font-bold">{group.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {group.description && <span className="text-zinc-500 text-sm">{group.description}</span>}
              {onlineCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{onlineCount} online
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isCreator
              ? <button onClick={handleDeleteGroup} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-600 border border-red-800 hover:border-red-600 text-red-400 hover:text-white rounded-lg text-sm transition-all"><Trash2 className="w-4 h-4" />Delete</button>
              : <button onClick={handleLeave} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141416] hover:bg-[#2a2a2e] border border-[#2a2a2e] text-zinc-400 hover:text-white rounded-lg text-sm transition-all"><LogOut className="w-4 h-4" />Leave</button>}
          </div>
        </div>

        <div className="flex border-b border-[#1a1a1e]">
          {(['group', 'chat'] as const).map(t => (
            <button key={t} onClick={() => setInnerTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors relative capitalize ${innerTab === t ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {t === 'group' ? <Clapperboard className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              {t === 'group' ? 'Group' : 'Chat'}
              {innerTab === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-[#7C5DBD] rounded-full" />}
            </button>
          ))}
        </div>

        {innerTab === 'group' && (
          <div className="space-y-5">
            <WatchModePanel groupId={group.group_id} onModeChange={(m, svcMap) => { setWatchMode(m); setWatchMemberServices(svcMap); }} />

            <section className="bg-[#141416] border border-[#2a2a2e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2"><Popcorn className="w-5 h-5 text-[#7C5DBD]" />Group Reelette</h3>
                <div className="flex gap-2">
                  <button onClick={handleRandomSpin} disabled={randomSpinning}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2e] hover:bg-[#333] border border-[#3a3a3e] text-zinc-300 hover:text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                    <Shuffle className={`w-4 h-4 ${randomSpinning ? 'animate-spin' : ''}`} />
                    {randomSpinning ? 'Finding…' : 'Random'}
                  </button>
                  {group.watchlist.length > 0 && (
                    <button onClick={() => { setShowWheel(w => !w); setWinner(null); }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#7C5DBD] hover:bg-[#6B4DAD] text-white rounded-lg text-sm font-medium transition-all hover:scale-105">
                      <Shuffle className="w-4 h-4" />{showWheel ? 'Hide Wheel' : 'Spin the Wheel'}
                    </button>
                  )}
                </div>
              </div>
              {randomError && <p className="text-yellow-500 text-sm text-center mb-3">{randomError}</p>}
              {randomMovieId && (
                <div className="mb-4 p-4 bg-[#0d0d0f] border border-[#7C5DBD]/30 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-zinc-400 text-xs mb-1">Random pick</p>
                    <button onClick={() => setRandomMovieOpen(true)} className="text-white font-semibold hover:text-[#9B7BD7] transition-colors text-left">Click to view</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setRandomMovieOpen(true)} className="px-3 py-1.5 bg-[#7C5DBD] hover:bg-[#9B7BD7] text-white rounded-lg text-sm transition-colors">View</button>
                    <button onClick={() => { setRandomMovieId(null); setRandomMovieOpen(false); }} className="p-1.5 text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
              {showWheel && group.watchlist.length > 0 && (
                <div className="flex flex-col items-center gap-6 py-4">
                  {winner ? (
                    <div className="text-center space-y-4 py-4">
                      <div className="text-5xl">🎬</div>
                      <div className="bg-[#7C5DBD] rounded-2xl p-6 shadow-xl shadow-[#7C5DBD]/30 max-w-sm mx-auto">
                        <p className="text-white/70 text-sm mb-1">Tonight you're watching…</p>
                        <h3 className="text-white text-2xl font-bold">{winner.movie_title}</h3>
                        <p className="text-white/50 text-sm mt-2">Added by @{winner.added_by_username}</p>
                      </div>
                      <button onClick={() => setWinner(null)} className="px-6 py-2 bg-[#2a2a2e] hover:bg-[#333] text-zinc-300 rounded-lg text-sm transition-colors">Spin Again</button>
                    </div>
                  ) : <SpinWheel items={group.watchlist} onSpinEnd={setWinner} />}
                </div>
              )}
              {group.watchlist.length === 0 && !randomMovieId && (
                <p className="text-zinc-600 text-sm text-center py-2">Add movies below, or hit <span className="text-zinc-400">Random</span> to discover something.</p>
              )}
            </section>

            <section className="bg-[#141416] border border-[#2a2a2e] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Clapperboard className="w-5 h-5 text-[#7C5DBD]" />Watchlist <span className="text-zinc-500 text-sm font-normal">({group.watchlist.length})</span></h3>
              <div className="mb-4"><TMDBMovieSearch groupId={group.group_id} onAdded={refresh} /></div>
              {group.watchlist.length === 0
                ? <p className="text-zinc-500 text-center py-8">No movies yet</p>
                : (
                  <div className="space-y-2">
                    {group.watchlist.map((m, i) => (
                      <div key={m.movie_id} className="flex items-center gap-3 p-3 bg-[#0d0d0f] rounded-xl border border-[#1a1a1e]">
                        <span className="text-zinc-600 text-sm w-5 text-right shrink-0">{i + 1}</span>
                        {m.movie_poster ? <img src={m.movie_poster} alt={m.movie_title} className="w-8 h-12 object-cover rounded-lg shrink-0" /> : <Film className="w-4 h-4 text-zinc-600 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white truncate text-sm">{m.movie_title}</p>
                          <p className="text-xs text-zinc-600">by @{m.added_by_username}</p>
                        </div>
                        <button onClick={() => handleRemoveMovie(m.movie_id)} className="text-zinc-600 hover:text-red-500 transition-colors shrink-0"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
            </section>

            <section className="bg-[#141416] border border-[#2a2a2e] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#7C5DBD]" />Members <span className="text-zinc-500 text-sm font-normal">({group.members.length})</span>
                {onlineCount > 0 && <span className="text-emerald-500 text-xs">· {onlineCount} online</span>}
              </h3>
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="Search to invite…" value={friendSearch} onChange={e => setFriendSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFriendSearch()}
                  className="flex-1 bg-[#0d0d0f] border border-[#1a1a1e] rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-[#7C5DBD]/40 focus:outline-none" />
                <button onClick={handleFriendSearch} className="px-4 py-2.5 bg-[#2a2a2e] hover:bg-[#333] text-zinc-300 rounded-xl transition-colors"><Search className="w-5 h-5" /></button>
              </div>
              {friendResults.length > 0 && (
                <div className="mb-4 space-y-2 border border-[#2a2a2e] rounded-xl p-3 bg-[#0d0d0f]">
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
                    <div key={member_id} className="flex items-center gap-3 p-3 bg-[#0d0d0f] rounded-xl border border-[#1a1a1e]">
                      <UserAvatar username={uname} avatarUrl={prof?.avatarUrl} size={38} lastSeen={prof?.lastSeen} onClick={() => setProfileUserId(member_id)} />
                      <div className="flex-1">
                        <button onClick={() => setProfileUserId(member_id)} className="text-white text-sm hover:text-[#7C5DBD] transition-colors">@{uname}</button>
                        <p className="text-xs text-zinc-600">{online ? 'Online now' : prof?.lastSeen ? `Last seen ${timeAgo(prof.lastSeen)}` : 'Offline'}</p>
                      </div>
                      {isOwner && <span title="Creator"><Crown className="w-4 h-4 text-yellow-500 shrink-0" /></span>}
                      {isCreator && !isOwner && (
                        <button onClick={() => handleRemoveMember(member_id)} className="text-zinc-600 hover:text-red-500 transition-colors shrink-0"><UserMinus className="w-4 h-4" /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {innerTab === 'chat' && (
          <div className="flex flex-col bg-[#0d0d0f] border border-[#1a1a1e] rounded-2xl overflow-hidden" style={{ height: 520 }}>
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 no-scrollbar">
              {chatMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-zinc-600 text-sm">No messages yet — say something!</p>
                </div>
              )}
              {chatMessages.map(msg => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.message_id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && (
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(msg.sender_username)}`}
                        alt={msg.sender_username} className="w-7 h-7 rounded-full bg-[#141416] shrink-0" />
                    )}
                    <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && <span className="text-[10px] text-zinc-600 px-1">@{msg.sender_username}</span>}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${isMine ? 'bg-[#7C5DBD] text-white rounded-br-sm' : 'bg-[#1a1a1e] text-zinc-200 rounded-bl-sm'}`}>
                        {msg.text}
                      </div>
                      {msg.sent_at && <span className="text-[9px] text-zinc-700 px-1">{timeAgo(msg.sent_at)}</span>}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <div className="shrink-0 px-3 py-3 border-t border-[#1a1a1e] flex items-center gap-2">
              <input ref={chatInputRef} value={chatDraft} onChange={e => setChatDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Message the group…"
                className="flex-1 bg-[#141416] border border-[#2a2a2e] rounded-full px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C5DBD]/40" />
              <button onClick={handleChatSend} disabled={!chatDraft.trim() || chatSending}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#7C5DBD] hover:bg-[#9B7BD7] disabled:opacity-40 transition-colors shrink-0">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Left Sidebar ───────────────────────────────────────────────
type SidebarView = 'feed' | 'recent';

function LeftSidebar({ view, onViewChange, groups, groupsLoading, activeGroupId, onGroupSelect, onCreateGroup, currentUserId }: {
  view: SidebarView;
  onViewChange: (v: SidebarView) => void;
  groups: MovieGroup[];
  groupsLoading: boolean;
  activeGroupId?: string;
  onGroupSelect: (g: MovieGroup) => void;
  onCreateGroup: () => void;
  currentUserId: string;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const currentUser = getUser();

  const handleCreate = async () => {
    if (!newName.trim() || !currentUser) return;
    setCreating(true);
    const r = await createGroup(newName.trim(), newDesc.trim(), currentUser.user_id, currentUser.username);
    if (r.success) {
      setNewName('');
      setNewDesc('');
      setShowCreateForm(false);
      onCreateGroup();
    }
    setCreating(false);
  };

  const navItems: { id: SidebarView; label: string; icon: React.ReactNode }[] = [
    { id: 'feed', label: 'Feed', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'recent', label: 'Recent Watches', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-[220px] shrink-0 flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar">
      {/* Nav section */}
      <div className="px-3 pt-5 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-2 mb-2">Navigation</p>
        <nav className="space-y-0.5">
          {navItems.map(item => (
            <button key={item.id} onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                view === item.id && !activeGroupId
                  ? 'bg-[#7C5DBD]/15 text-[#9B7BD7]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-[#1a1a1e]" />

      {/* Movie Groups */}
      <div className="px-3 pt-4 pb-5 flex-1">
        <div className="flex items-center justify-between px-2 mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Movie Groups</p>
          <button onClick={() => setShowCreateForm(v => !v)}
            className="w-5 h-5 rounded-md bg-[#2a2a2e] hover:bg-[#7C5DBD]/30 text-zinc-500 hover:text-[#9B7BD7] flex items-center justify-center transition-colors"
            title="New group">
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-3 space-y-2 p-2 bg-[#141416] border border-[#2a2a2e] rounded-xl">
            <input type="text" placeholder="Group name" value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full bg-[#0d0d0f] border border-[#2a2a2e] rounded-lg px-3 py-2 text-white text-xs placeholder:text-zinc-600 focus:border-[#7C5DBD]/40 focus:outline-none" />
            <input type="text" placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-[#0d0d0f] border border-[#2a2a2e] rounded-lg px-3 py-2 text-white text-xs placeholder:text-zinc-600 focus:border-[#7C5DBD]/40 focus:outline-none" />
            <div className="flex gap-1.5">
              <button onClick={() => { setShowCreateForm(false); setNewName(''); setNewDesc(''); }}
                className="flex-1 bg-[#2a2a2e] text-zinc-400 text-xs py-1.5 rounded-lg transition-colors hover:bg-[#333]">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()}
                className="flex-1 bg-[#7C5DBD] text-white text-xs py-1.5 rounded-lg transition-colors disabled:opacity-40 hover:bg-[#6B4DAD]">
                {creating ? '…' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {groupsLoading ? (
          <div className="space-y-1.5">
            {[1,2,3].map(i => <div key={i} className="h-9 bg-[#141416] rounded-xl animate-pulse" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-6">
            <Popcorn className="w-7 h-7 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-600 text-xs">No groups yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {groups.map((g, i) => (
              <button key={g.group_id} onClick={() => onGroupSelect(g)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                  activeGroupId === g.group_id
                    ? 'bg-[#7C5DBD]/15 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
                />
                <span className="text-sm font-medium truncate">{g.name}</span>
                {g.created_by === currentUserId && <Crown className="w-3 h-3 text-yellow-500 shrink-0 ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Recent Watches View ────────────────────────────────────────
interface FriendWatchEntry extends WatchedMovie {
  friend_id: string;
  friend_username: string;
  friend_avatarUrl?: string;
}

function RecentWatchesView({ currentUserId, onOpenProfile }: { currentUserId: string; onOpenProfile: (uid: string) => void }) {
  const [entries, setEntries] = useState<FriendWatchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      setLoading(true);
      const friends = await getFriends(currentUserId);
      if (friends.length === 0) { setLoading(false); return; }

      const profileResults = await Promise.all(friends.slice(0, 8).map(f => getUserPublicProfile(f.friend_id)));
      const avatarMap: Record<string, string> = {};
      friends.slice(0, 8).forEach((f, i) => {
        const url = profileResults[i]?.avatarUrl;
        if (url) avatarMap[f.friend_id] = url;
      });

      const watchLists = await Promise.all(
        friends.slice(0, 8).map(f => getWatchedMovies(f.friend_id, 5).catch(() => []))
      );

      const all: FriendWatchEntry[] = [];
      friends.slice(0, 8).forEach((f, i) => {
        watchLists[i].forEach(m => {
          all.push({ ...m, friend_id: f.friend_id, friend_username: f.friend_username, friend_avatarUrl: avatarMap[f.friend_id] });
        });
      });

      all.sort((a, b) => b.watched_at.localeCompare(a.watched_at));
      setEntries(all.slice(0, 30));
      setLoading(false);
    })();
  }, [currentUserId]);

  if (loading) return (
    <div className="divide-y divide-[#1a1a1e]">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-4 py-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1a1a1e] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-32 bg-[#1a1a1e] rounded-full animate-pulse" />
            <div className="h-3 w-full bg-[#1a1a1e] rounded-full animate-pulse" />
          </div>
          <div className="w-10 h-14 bg-[#1a1a1e] rounded-lg animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  );

  if (entries.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Clock className="w-10 h-10 text-zinc-700" />
      <p className="text-zinc-600 text-sm text-center">No recent watches from friends yet.</p>
    </div>
  );

  return (
    <div className="divide-y divide-[#1a1a1e]">
      {entries.map((entry, idx) => (
        <div key={`${entry.friend_id}-${entry.movie_id}-${idx}`}
          className="px-4 py-4 flex gap-3 hover:bg-[#0f0f11] transition-colors">
          <UserAvatar username={entry.friend_username} avatarUrl={entry.friend_avatarUrl} size={38} onClick={() => onOpenProfile(entry.friend_id)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <button onClick={() => onOpenProfile(entry.friend_id)} className="text-white text-sm font-semibold hover:text-[#9B7BD7] transition-colors">
                @{entry.friend_username}
              </button>
              <span className="text-zinc-600 text-xs">watched</span>
              <span className="text-zinc-400 text-xs font-medium truncate">{entry.title}</span>
              <span className="text-zinc-700 text-xs shrink-0">· {timeAgo(entry.watched_at)}</span>
            </div>
            {entry.user_rating > 0 && (
              <div className="flex items-center gap-1.5 mb-1">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${(entry.user_rating / 2) >= (i + 1) ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700'}`} />
                  ))}
                </div>
                <span className="text-yellow-400 text-xs font-bold tabular-nums">{entry.user_rating}/10</span>
              </div>
            )}
            {entry.comment && (
              <p className="text-zinc-500 text-xs leading-relaxed italic">"{entry.comment}"</p>
            )}
          </div>
          {(entry as { poster?: string }).poster && (
            <img src={(entry as { poster?: string }).poster} alt={entry.title} className="w-10 h-[60px] object-cover rounded-lg shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Right Sidebar ──────────────────────────────────────────────
function RightSidebar({ currentUserId, currentUsername, onOpenProfile }: {
  currentUserId: string;
  currentUsername: string;
  onOpenProfile: (uid: string) => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [suggested, setSuggested] = useState<{ user_id: string; username: string; displayName: string; avatarUrl?: string }[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [friendAvatars, setFriendAvatars] = useState<Record<string, string>>({});
  const [reqAvatars, setReqAvatars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    const [f, r, t] = await Promise.all([
      getFriends(currentUserId),
      getFriendRequests(currentUserId),
      getTrendingMovies('week'),
    ]);

    const allFriendIds = [...new Set([...f.map(x => x.friend_id), ...r.map(x => x.from_user_id)])];
    const profiles = await Promise.all(allFriendIds.map(id => getUserPublicProfile(id)));
    const avatarMap: Record<string, string> = {};
    allFriendIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });

    setFriends(f);
    setRequests(r);
    setFriendAvatars(Object.fromEntries(f.map(fr => [fr.friend_id, avatarMap[fr.friend_id] ?? ''])));
    setReqAvatars(Object.fromEntries(r.map(req => [req.from_user_id, avatarMap[req.from_user_id] ?? ''])));
    setTrending(t.slice(0, 5));

    const friendSet = new Set(f.map(fr => fr.friend_id));
    try {
      const users = await searchUsers('a', currentUserId);
      const filtered = users.filter(u => !friendSet.has(u.user_id)).slice(0, 4);
      const suggestProfiles = await Promise.all(filtered.map(u => getUserPublicProfile(u.user_id)));
      setSuggested(filtered.map((u, i) => ({ ...u, avatarUrl: suggestProfiles[i]?.avatarUrl })));
    } catch { /* non-critical */ }

    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (req: FriendRequest) => {
    await acceptFriendRequest(currentUserId, currentUsername, req.from_user_id, req.from_username);
    load();
  };

  const handleReject = async (req: FriendRequest) => {
    await rejectFriendRequest(currentUserId, req.from_user_id, req.from_username);
    load();
  };

  const handleFollow = async (userId: string) => {
    await sendFriendRequest(userId, currentUserId, currentUsername);
    setSentTo(prev => new Set(prev).add(userId));
  };

  if (loading) return (
    <aside className="w-[270px] shrink-0 overflow-y-auto px-4 py-5 space-y-4 no-scrollbar">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#141416] rounded-xl animate-pulse" />)}
    </aside>
  );

  return (
    <aside className="w-[270px] shrink-0 overflow-y-auto no-scrollbar">

      {/* Friend Requests */}
      {requests.length > 0 && (
        <section className="px-4 pt-5 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3 flex items-center gap-2">
            Requests
            <span className="bg-[#7C5DBD] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{requests.length}</span>
          </p>
          <div className="space-y-2.5">
            {requests.map(req => (
              <div key={req.from_user_id} className="flex items-center gap-2.5">
                <UserAvatar username={req.from_username} avatarUrl={reqAvatars[req.from_user_id]} size={34} onClick={() => onOpenProfile(req.from_user_id)} />
                <div className="flex-1 min-w-0">
                  <button onClick={() => onOpenProfile(req.from_user_id)} className="text-white text-xs font-semibold hover:text-[#9B7BD7] transition-colors truncate block">@{req.from_username}</button>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleAccept(req)} className="p-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 rounded-lg transition-all">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleReject(req)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[#1a1a1e]" />
        </section>
      )}

      {/* Friends */}
      <section className="px-4 pt-5 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3">
          Friends {friends.length > 0 && <span className="text-zinc-700 normal-case tracking-normal font-normal">({friends.length})</span>}
        </p>
        {friends.length === 0 ? (
          <p className="text-zinc-700 text-xs">No friends yet.</p>
        ) : (
          <div className="space-y-2.5">
            {friends.slice(0, 6).map(f => (
              <button key={f.friend_id} onClick={() => onOpenProfile(f.friend_id)}
                className="w-full flex items-center gap-2.5 hover:bg-white/[0.03] rounded-xl p-1.5 -mx-1.5 transition-colors text-left">
                <UserAvatar username={f.friend_username} avatarUrl={friendAvatars[f.friend_id]} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">@{f.friend_username}</p>
                  <p className="text-zinc-600 text-[11px]">Friends since {timeAgo(f.since)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="mx-4 border-t border-[#1a1a1e]" />

      {/* Suggested Adds */}
      {suggested.length > 0 && (
        <section className="px-4 pt-4 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3">Suggested</p>
          <div className="space-y-2.5">
            {suggested.map(u => (
              <div key={u.user_id} className="flex items-center gap-2.5">
                <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size={34} onClick={() => onOpenProfile(u.user_id)} />
                <div className="flex-1 min-w-0">
                  <button onClick={() => onOpenProfile(u.user_id)} className="text-white text-xs font-semibold hover:text-[#9B7BD7] transition-colors truncate block">
                    {u.displayName}
                  </button>
                  <p className="text-zinc-600 text-[11px]">@{u.username}</p>
                </div>
                {sentTo.has(u.user_id)
                  ? <span className="text-[10px] text-zinc-600 flex items-center gap-1 shrink-0"><Check className="w-3 h-3 text-emerald-500" /></span>
                  : <button onClick={() => handleFollow(u.user_id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#7C5DBD]/15 hover:bg-[#7C5DBD] border border-[#7C5DBD]/40 hover:border-[#7C5DBD] text-[#9B7BD7] hover:text-white rounded-lg text-[11px] font-semibold transition-all shrink-0">
                      <UserPlus className="w-3 h-3" />Follow
                    </button>
                }
              </div>
            ))}
          </div>
        </section>
      )}

      {suggested.length > 0 && <div className="mx-4 border-t border-[#1a1a1e]" />}

      {/* Trending Films */}
      <section className="px-4 pt-4 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" />Trending This Week
        </p>
        {trending.length === 0 ? (
          <p className="text-zinc-700 text-xs">Loading trends…</p>
        ) : (
          <div className="space-y-2.5">
            {trending.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <span className="text-zinc-700 text-xs font-bold w-4 text-center shrink-0">{i + 1}</span>
                {m.poster
                  ? <img src={m.poster} alt={m.title} className="w-9 h-[54px] object-cover rounded-lg shrink-0" />
                  : <div className="w-9 h-[54px] bg-[#141416] rounded-lg shrink-0 flex items-center justify-center"><Film className="w-3 h-3 text-zinc-700" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{m.title}</p>
                  <p className="text-zinc-600 text-[11px]">{m.year}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

// ── Main SocialTab ─────────────────────────────────────────────
export function SocialTab() {
  const [sidebarView, setSidebarView] = useState<SidebarView>('feed');
  const [feedMode, setFeedMode] = useState<'all' | 'friends'>('all');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<MovieGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<MovieGroup | null>(null);

  const currentUser = getUser();
  const currentUserId = currentUser?.user_id ?? '';
  const currentUsername = currentUser?.username ?? '';
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | undefined>(currentUser?.avatarUrl);

  useEffect(() => {
    if (!currentUserId) return;
    getUserPublicProfile(currentUserId).then(p => { if (p?.avatarUrl) setCurrentUserAvatarUrl(p.avatarUrl); });
  }, [currentUserId]);

  // Heartbeat
  useEffect(() => {
    if (!currentUserId) return;
    updateLastSeen(currentUserId);
    const hb = setInterval(() => updateLastSeen(currentUserId), 2 * 60 * 1000);
    return () => clearInterval(hb);
  }, [currentUserId]);

  // Load groups
  const loadGroups = useCallback(async () => {
    if (!currentUserId) return;
    const g = await getUserGroups(currentUserId);
    setGroups(g);
    setGroupsLoading(false);
  }, [currentUserId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // Load feed
  useEffect(() => {
    if (_feedCache.size > 0) {
      setPosts(sortedFeedPosts());
      setLoading(false);
      return;
    }
    setLoading(true);
    getFeed().then(async feedPosts => {
      const uniqueIds = [...new Set(feedPosts.map(p => p.user_id))];
      const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
      const avatarMap: Record<string, string> = {};
      uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
      mergeFeedPosts(feedPosts.map(p => ({ ...p, avatarUrl: p.avatarUrl ?? avatarMap[p.user_id] })));
      setPosts(sortedFeedPosts());
      setLoading(false);
    });
  }, []);

  // Load friend IDs for friends-only feed
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
      const newPosts = _feedNewestAt ? await getFeedSince(_feedNewestAt) : await getFeed();
      if (newPosts.length > 0) {
        const uniqueIds = [...new Set(newPosts.map(p => p.user_id))];
        const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
        const avatarMap: Record<string, string> = {};
        uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
        mergeFeedPosts(newPosts.map(p => ({ ...p, avatarUrl: p.avatarUrl ?? avatarMap[p.user_id] })));
        setPosts(sortedFeedPosts());
      }
    } finally { setRefreshing(false); }
  }, [refreshing]);

  const handlePostCreated = useCallback(async () => {
    const updated = await getFeed();
    const uniqueIds = [...new Set(updated.map(p => p.user_id))];
    const profiles = await Promise.all(uniqueIds.map(id => getUserPublicProfile(id)));
    const avatarMap: Record<string, string> = {};
    uniqueIds.forEach((id, i) => { const url = profiles[i]?.avatarUrl; if (url) avatarMap[id] = url; });
    mergeFeedPosts(updated.map(p => ({ ...p, avatarUrl: p.avatarUrl ?? avatarMap[p.user_id] })));
    setPosts(sortedFeedPosts());
  }, []);

  const handleGroupSelect = async (g: MovieGroup) => {
    const full = await getGroup(g.group_id);
    setActiveGroup(full ?? g);
  };

  const handleGroupBack = () => {
    setActiveGroup(null);
    loadGroups();
  };

  return (
    <div
      className="text-white -mx-6 -mt-8 pt-6 flex overflow-hidden"
      style={{ height: 'calc(100vh - 52px)' }}
    >
      <style>{`
        @keyframes feedCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      {/* Left Sidebar */}
      <LeftSidebar
        view={sidebarView}
        onViewChange={(v) => { setSidebarView(v); setActiveGroup(null); }}
        groups={groups}
        groupsLoading={groupsLoading}
        activeGroupId={activeGroup?.group_id}
        onGroupSelect={handleGroupSelect}
        onCreateGroup={loadGroups}
        currentUserId={currentUserId}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto  no-scrollbar min-w-0">
        {activeGroup ? (
          <GroupDetail
            group={activeGroup}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            onBack={handleGroupBack}
            onUpdate={async () => {
              const updated = await getGroup(activeGroup.group_id);
              if (updated) setActiveGroup(updated);
            }}
          />
        ) : sidebarView === 'recent' ? (
          <>
            {/* Recent Watches header */}
            <div className="sticky top-0 z-10 px-4 py-3.5 bg-[#0A0A0A]/95 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <h2 className="text-white font-semibold text-[15px]">Recent Watches</h2>
                <span className="text-zinc-600 text-xs">· friends' latest logs</span>
              </div>
            </div>
            <RecentWatchesView currentUserId={currentUserId} onOpenProfile={setProfileUserId} />
          </>
        ) : (
          <>
            {/* Feed tab bar */}
            <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-sm">
              <div className="flex items-center">
                <button onClick={() => setFeedMode('all')}
                  className={`flex-1 py-3.5 text-sm font-semibold relative transition-colors ${feedMode === 'all' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  For You
                  {feedMode === 'all' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#7C5DBD] rounded-full" />}
                </button>
                <button onClick={() => setFeedMode('friends')}
                  className={`flex-1 py-3.5 text-sm font-semibold relative transition-colors ${feedMode === 'friends' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  Friends
                  {feedMode === 'friends' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#7C5DBD] rounded-full" />}
                </button>
                <button onClick={handleRefresh} disabled={refreshing} title="Refresh"
                  className="px-4 py-3.5 text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-40">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Compose */}
            <div className="px-8">
              <ComposeBox currentUser={currentUser ? { ...currentUser, avatarUrl: currentUserAvatarUrl } : null} onPostCreated={handlePostCreated} />
            </div>

            {/* Posts */}
            <div className="px-8">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <ActivitySkeleton key={i} />)
                : displayedPosts.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                      <Popcorn className="w-9 h-9 text-zinc-700" />
                      <p className="text-zinc-600 text-sm text-center">
                        {feedMode === 'friends' ? 'No posts from friends yet.' : 'No posts yet. Be the first to share!'}
                      </p>
                    </div>
                  )
                  : displayedPosts.map((post, idx) => (
                    <div key={post.post_id}
                      style={{
                        animation: 'feedCardIn 0.28s cubic-bezier(0.23,1,0.32,1) both',
                        animationDelay: `${Math.min(idx * 40, 250)}ms`,
                      }}>
                      <ActivityCard post={post} currentUserId={currentUserId}
                        currentUsername={currentUsername}
                        onLike={handleLike} onDelete={handleDelete}
                        onOpenProfile={setProfileUserId} />
                    </div>
                  ))
              }
            </div>
          </>
        )}
      </main>

      {/* Right Sidebar */}
      <RightSidebar
        currentUserId={currentUserId}
        currentUsername={currentUsername}
        onOpenProfile={setProfileUserId}
      />
    </div>
  );
}
