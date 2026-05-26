import { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Plus, Trash2, Edit2, ChevronUp, ChevronDown,
  X, Save, Film, Loader2, Lock, Globe, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getUser, getUserRankings, createRanking, updateRanking, deleteRanking, getWatchedMovies,
  type MovieRanking, type RankingMovie, type WatchedMovie,
} from '../services/api';

// ── Rank badge ────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-yellow-400 text-black">1</span>
  );
  if (rank === 2) return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-zinc-300 text-black">2</span>
  );
  if (rank === 3) return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-amber-600 text-white">3</span>
  );
  return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-zinc-800 text-zinc-400">{rank}</span>
  );
}

// ── Ranking editor modal ──────────────────────────────────────────

interface EditorProps {
  initial?: MovieRanking | null;
  watchedMovies: WatchedMovie[];
  onSave: (ranking: MovieRanking) => void;
  onClose: () => void;
}

function RankingEditor({ initial, watchedMovies, onSave, onClose }: EditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [selected, setSelected] = useState<{ movie_id: string; movie_title: string; movie_poster: string }[]>(
    initial?.movies.map(m => ({ movie_id: m.movie_id, movie_title: m.movie_title, movie_poster: m.movie_poster })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const currentUser = getUser();
  const filtered = watchedMovies.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
    && !selected.some(s => s.movie_id === m.movie_id)
  );

  const addMovie = (m: WatchedMovie) => {
    setSelected(prev => [...prev, { movie_id: m.movie_id, movie_title: m.title, movie_poster: m.poster }]);
    setSearch('');
  };

  const removeMovie = (id: string) => setSelected(prev => prev.filter(m => m.movie_id !== id));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelected(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  };

  const moveDown = (idx: number) => {
    setSelected(prev => { if (idx >= prev.length - 1) return prev; const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; });
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Give your ranking a title'); return; }
    if (selected.length < 2) { toast.error('Add at least 2 movies to rank'); return; }
    if (!currentUser) return;
    setSaving(true);
    try {
      if (initial) {
        const res = await updateRanking(initial.ranking_id, {
          title: title.trim(), description: description.trim(), movies: selected, is_public: isPublic,
        });
        if (!res.success) { toast.error(res.message ?? 'Failed to save'); return; }
        toast.success('Ranking updated');
        onSave({ ...initial, title: title.trim(), description: description.trim(), movies: selected.map((m, i) => ({ ...m, rank: i + 1 })), is_public: isPublic, updated_at: new Date().toISOString() });
      } else {
        const res = await createRanking({
          username: currentUser.username,
          title: title.trim(),
          description: description.trim(),
          movies: selected,
          is_public: isPublic,
        });
        if (!res.success) { toast.error(res.message ?? 'Failed to save'); return; }
        toast.success('Ranking created!');
        onSave({
          ranking_id: res.ranking_id ?? '',
          user_id: currentUser.user_id,
          username: currentUser.username,
          title: title.trim(),
          description: description.trim(),
          movies: selected.map((m, i) => ({ ...m, rank: i + 1 })),
          is_public: isPublic,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 py-4">
      <div className="bg-[#111] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white font-semibold text-base">{initial ? 'Edit Ranking' : 'Create Ranking'}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 no-scrollbar">
          {/* Title */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-1.5">Ranking Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Star Wars Ranked, Best MCU Films…"
              maxLength={120}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2e] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none"
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-1.5">Description <span className="normal-case text-zinc-700">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this ranking about?"
              rows={2}
              maxLength={500}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2e] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none resize-none"
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; }}
            />
          </div>

          {/* Current ranking order */}
          {selected.length > 0 && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Your Ranking ({selected.length})</label>
              <div className="space-y-1.5">
                {selected.map((m, idx) => (
                  <div key={m.movie_id} className="flex items-center gap-2.5 bg-[#0d0d0f] border border-white/[0.05] rounded-xl px-3 py-2">
                    <RankBadge rank={idx + 1} />
                    {m.movie_poster
                      ? <img src={m.movie_poster} alt={m.movie_title} className="w-7 h-10 object-cover rounded shrink-0" />
                      : <div className="w-7 h-10 bg-zinc-800 rounded shrink-0 flex items-center justify-center"><Film className="w-3 h-3 text-zinc-600" /></div>
                    }
                    <span className="flex-1 text-white text-sm truncate">{m.movie_title}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0}
                        className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveDown(idx)} disabled={idx === selected.length - 1}
                        className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeMovie(m.movie_id)}
                        className="p-1 text-zinc-600 hover:text-red-400 transition-colors ml-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movie picker from watched list */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">
              Add from Watched {watchedMovies.length > 0 && <span className="text-zinc-700 normal-case">({watchedMovies.length} available)</span>}
            </label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your watched movies & shows…"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2e] rounded-xl px-4 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none mb-2"
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--reel-accent-hex)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; }}
            />
            {watchedMovies.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-4">Mark some movies as watched first.</p>
            ) : filtered.length === 0 && search ? (
              <p className="text-zinc-600 text-sm text-center py-3">No matches in your watched list.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar">
                {(search ? filtered : filtered.slice(0, 30)).map(m => (
                  <button key={m.movie_id} onClick={() => addMovie(m)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-colors text-left group">
                    {m.poster
                      ? <img src={m.poster} alt={m.title} className="w-7 h-10 object-cover rounded shrink-0" />
                      : <div className="w-7 h-10 bg-zinc-800 rounded shrink-0 flex items-center justify-center"><Film className="w-3 h-3 text-zinc-600" /></div>
                    }
                    <span className="flex-1 text-zinc-300 text-sm truncate group-hover:text-white transition-colors">{m.title}</span>
                    <span className="text-zinc-700 text-xs shrink-0">{m.year}</span>
                    <Plus className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => setIsPublic(v => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isPublic ? 'Public' : 'Private'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || selected.length < 2}
              className="flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: 'var(--reel-accent-hex)' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {initial ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ranking card (collapsed view) ────────────────────────────────

interface RankingCardProps {
  ranking: MovieRanking;
  isOwn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  defaultExpanded?: boolean;
}

export function RankingCard({ ranking, isOwn, onEdit, onDelete, defaultExpanded = false }: RankingCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const top3 = ranking.movies.slice(0, 3);

  return (
    <div className="bg-[#0d0d0f] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Poster stack preview */}
        <div className="relative shrink-0 w-12 h-16">
          {top3.slice(0, 3).reverse().map((m, i) => (
            <div
              key={m.movie_id}
              className="absolute rounded-lg overflow-hidden border border-black/50"
              style={{
                width: 36,
                height: 52,
                left: i * 6,
                top: i * 2,
                zIndex: i,
              }}
            >
              {m.movie_poster
                ? <img src={m.movie_poster} alt={m.movie_title} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Film className="w-3 h-3 text-zinc-600" /></div>
              }
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <h3 className="text-white font-semibold text-sm truncate">{ranking.title}</h3>
            {!ranking.is_public && <Lock className="w-3 h-3 text-zinc-600 shrink-0" />}
          </div>
          {!isOwn && (
            <p className="text-zinc-600 text-xs mb-0.5">by @{ranking.username}</p>
          )}
          <p className="text-zinc-500 text-xs">{ranking.movies.length} titles · {expanded ? 'tap to collapse' : 'tap to expand'}</p>
        </div>

        {isOwn && (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={onEdit}
              className="p-1.5 text-zinc-600 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete}
              className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.05]">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </button>

      {/* Expanded movie list */}
      {expanded && (
        <div className="border-t border-white/[0.05] px-4 py-3 space-y-2">
          {ranking.description && (
            <p className="text-zinc-500 text-xs leading-relaxed mb-3">{ranking.description}</p>
          )}
          {ranking.movies.map(m => (
            <div key={m.movie_id} className="flex items-center gap-3">
              <RankBadge rank={m.rank} />
              {m.movie_poster
                ? <img src={m.movie_poster} alt={m.movie_title} className="w-6 h-9 object-cover rounded shrink-0" />
                : <div className="w-6 h-9 bg-zinc-800 rounded shrink-0 flex items-center justify-center"><Film className="w-2.5 h-2.5 text-zinc-600" /></div>
              }
              <span className="text-zinc-200 text-sm truncate">{m.movie_title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main RankingsView ─────────────────────────────────────────────

interface Props {
  userId: string;
}

export function RankingsView({ userId }: Props) {
  const [rankings, setRankings] = useState<MovieRanking[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editTarget, setEditTarget] = useState<MovieRanking | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, w] = await Promise.all([
      getUserRankings(userId),
      getWatchedMovies(userId, 500),
    ]);
    setRankings(r);
    setWatchedMovies(w);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (ranking: MovieRanking) => {
    setRankings(prev => {
      const idx = prev.findIndex(r => r.ranking_id === ranking.ranking_id);
      if (idx >= 0) { const next = [...prev]; next[idx] = ranking; return next; }
      return [ranking, ...prev];
    });
    setShowEditor(false);
    setEditTarget(null);
  };

  const handleDelete = async (ranking_id: string) => {
    if (!confirm('Delete this ranking?')) return;
    setDeletingId(ranking_id);
    const res = await deleteRanking(ranking_id);
    if (res.success) {
      setRankings(prev => prev.filter(r => r.ranking_id !== ranking_id));
      toast.success('Ranking deleted');
    } else {
      toast.error(res.message ?? 'Failed to delete');
    }
    setDeletingId(null);
  };

  const openEdit = (r: MovieRanking) => { setEditTarget(r); setShowEditor(true); };
  const openCreate = () => { setEditTarget(null); setShowEditor(true); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="text-white font-semibold text-base">My Rankings</h2>
          {rankings.length > 0 && (
            <span className="text-zinc-600 text-xs">({rankings.length})</span>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold transition-all hover:brightness-110"
          style={{ background: 'var(--reel-accent-hex)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Create Ranking
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--reel-accent-hex)' }} />
          <span className="text-sm">Loading rankings…</span>
        </div>
      ) : rankings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Trophy className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No rankings yet.</p>
          <p className="text-zinc-700 text-xs max-w-xs">Create your first ranking to sort your watched movies — Star Wars best to worst, MCU films, all-time favorites…</p>
          <button
            onClick={openCreate}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: 'var(--reel-accent-hex)' }}
          >
            <Plus className="w-4 h-4" /> Create your first ranking
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map(r => (
            <div key={r.ranking_id} className={deletingId === r.ranking_id ? 'opacity-40 pointer-events-none' : ''}>
              <RankingCard
                ranking={r}
                isOwn
                onEdit={() => openEdit(r)}
                onDelete={() => handleDelete(r.ranking_id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {showEditor && (
        <RankingEditor
          initial={editTarget}
          watchedMovies={watchedMovies}
          onSave={handleSaved}
          onClose={() => { setShowEditor(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

// ── Friend rankings panel (used in SocialTab) ─────────────────────

interface FriendRankingsPanelProps {
  userId: string;
}

export function FriendRankingsPanel({ userId }: FriendRankingsPanelProps) {
  const [rankings, setRankings] = useState<MovieRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../services/api').then(({ getFriendsRankings }) => {
      getFriendsRankings(userId).then(r => { setRankings(r); setLoading(false); });
    });
  }, [userId]);

  if (loading) return (
    <div className="flex items-center gap-2 text-zinc-600 text-xs py-3">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      Loading…
    </div>
  );

  if (rankings.length === 0) return (
    <p className="text-zinc-700 text-xs py-2">No friend rankings yet.</p>
  );

  return (
    <div className="space-y-2">
      {rankings.slice(0, 5).map(r => (
        <RankingCard key={r.ranking_id} ranking={r} isOwn={false} />
      ))}
    </div>
  );
}
