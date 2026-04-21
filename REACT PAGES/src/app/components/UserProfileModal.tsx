import { useState, useEffect } from 'react';
import {
  X, Film, BookMarked, Users, UserPlus, UserMinus, Check,
  Loader2, Calendar, Star, Maximize2, ChevronLeft,
} from 'lucide-react';
import {
  getUser, getUserPublicProfile, getFriends, sendFriendRequest,
  removeFriend, getFriendRequests, getWatchedMovies, getWatchLater,
  getMovieDetails,
  type UserPublicProfile, type WatchedMovie,
} from '../services/api';

interface Props {
  userId: string;
  onClose: () => void;
}

interface WatchLaterMovie {
  movie_id: string;
  title: string;
  year: string;
  poster: string | null;
}

function dicebear(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function isOnline(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

// ── Fullscreen MyStuff Overlay ─────────────────────────────────
function MyStuffFullscreen({
  profile,
  avatar,
  onClose,
}: {
  profile: UserPublicProfile;
  avatar: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'watched' | 'watchlater'>('watched');
  const [watched, setWatched] = useState<WatchedMovie[]>([]);
  const [watchLater, setWatchLater] = useState<WatchLaterMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getWatchedMovies(profile.user_id),
      getWatchLater(profile.user_id).then(async (ids) => {
        const details = await Promise.all(
          ids.map((id) =>
            getMovieDetails(id).then((d) => ({
              movie_id: String(id),
              title: d?.title ?? 'Unknown',
              year: d?.release_date ? String(d.release_date).slice(0, 4) : '',
              poster: d?.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
            }))
          )
        );
        return details;
      }),
    ]).then(([w, wl]) => {
      setWatched(w);
      setWatchLater(wl);
      setLoading(false);
    });
  }, [profile.user_id]);

  return (
    <div className="fixed inset-0 bg-black z-[300] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#2A2A2A] bg-[#0A0A0A] shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-[#1C1C1C] hover:bg-[#2A2A2A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#2A2A2A] shrink-0">
          <img src={avatar} alt={profile.username} className="w-full h-full object-cover object-top" />
        </div>
        <div>
          <p className="text-white font-semibold leading-tight">{profile.displayName}</p>
          <p className="text-gray-500 text-xs">@{profile.username} · MyStuff</p>
        </div>
        {/* Tabs */}
        <div className="ml-auto flex gap-1 bg-[#141414] border border-[#2A2A2A] rounded-full p-1">
          <button
            onClick={() => setTab('watched')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'watched' ? 'bg-[#C0392B] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Watched
          </button>
          <button
            onClick={() => setTab('watchlater')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'watchlater' ? 'bg-[#C0392B] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            Watch Later
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : tab === 'watched' ? (
          watched.length === 0 ? (
            <p className="text-gray-500 text-center py-16">No watched movies yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {watched.map((m) => (
                <div key={m.movie_id} className="relative rounded-xl overflow-hidden bg-[#1A1A1A] border border-[#2A2A2A]">
                  {m.poster ? (
                    <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-[#2A2A2A] flex items-center justify-center">
                      <Film className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/70 rounded-full px-1.5 py-0.5">
                    <Star className="w-2.5 h-2.5 fill-[#C0392B] text-[#C0392B]" />
                    <span className="text-white text-[10px] font-semibold">{m.user_rating}</span>
                  </div>
                  <div className="p-2">
                    <p className="text-white text-xs font-medium line-clamp-1">{m.title}</p>
                    <p className="text-gray-500 text-[10px]">{m.year}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          watchLater.length === 0 ? (
            <p className="text-gray-500 text-center py-16">No saved movies yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {watchLater.map((m) => (
                <div key={m.movie_id} className="relative rounded-xl overflow-hidden bg-[#1A1A1A] border border-[#2A2A2A]">
                  {m.poster ? (
                    <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-[#2A2A2A] flex items-center justify-center">
                      <Film className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5 bg-black/70 rounded-full p-1">
                    <BookMarked className="w-2.5 h-2.5 fill-white text-white" />
                  </div>
                  <div className="p-2">
                    <p className="text-white text-xs font-medium line-clamp-1">{m.title}</p>
                    <p className="text-gray-500 text-[10px]">{m.year}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────
export function UserProfileModal({ userId, onClose }: Props) {
  const currentUser = getUser();
  const currentUid = currentUser?.user_id ?? '';
  const currentUsername = currentUser?.username ?? '';

  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [acting, setActing] = useState(false);
  const [myStuffOpen, setMyStuffOpen] = useState(false);

  // Preview watched movies for the "MyStuff" teaser strip
  const [previewWatched, setPreviewWatched] = useState<WatchedMovie[]>([]);
  const [previewWatchLater, setPreviewWatchLater] = useState<WatchLaterMovie[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isOwnProfile = userId === currentUid;

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getUserPublicProfile(userId),
      currentUid ? getFriends(currentUid) : Promise.resolve([]),
      currentUid ? getFriendRequests(userId) : Promise.resolve([]),
    ]).then(([prof, friends, requests]) => {
      setProfile(prof);
      setIsFriend(friends.some((f) => f.friend_id === userId));
      setHasPendingRequest(requests.some((r) => r.from_user_id === currentUid));
      setLoading(false);

      // Load MyStuff preview whenever content is public
      if (prof?.showMyStuffPublicly) {
        setPreviewLoading(true);
        Promise.all([
          getWatchedMovies(userId),
          getWatchLater(userId).then(async (ids) => {
            const slice = ids.slice(0, 6);
            const details = await Promise.all(
              slice.map((id) =>
                getMovieDetails(id).then((d) => ({
                  movie_id: String(id),
                  title: d?.title ?? 'Unknown',
                  year: d?.release_date ? String(d.release_date).slice(0, 4) : '',
                  poster: d?.poster_path
                    ? `https://image.tmdb.org/t/p/w500${d.poster_path}`
                    : null,
                }))
              )
            );
            return details;
          }),
        ]).then(([w, wl]) => {
          setPreviewWatched(w.slice(0, 6));
          setPreviewWatchLater(wl);
          setPreviewLoading(false);
        });
      } else {
        setPreviewLoading(false);
      }
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
  const online = profile?.showOnlineStatus ? isOnline(profile.lastSeen) : false;

  const statBlocks = profile
    ? [
        { icon: <Film className="w-4 h-4" />, value: profile.watchedCount, label: 'Watched' },
        { icon: <BookMarked className="w-4 h-4" />, value: profile.watchlistCount, label: 'Watchlist' },
        { icon: <Users className="w-4 h-4" />, value: profile.friendsCount, label: 'Friends' },
      ]
    : [];

  return (
    <>
      {/* Fullscreen MyStuff overlay */}
      {myStuffOpen && profile && (
        <MyStuffFullscreen
          profile={profile}
          avatar={avatar}
          onClose={() => setMyStuffOpen(false)}
        />
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

          {/* Header banner */}
          <div className="h-28 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black relative rounded-t-2xl shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 to-transparent rounded-t-2xl" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Avatar anchored to bottom-left of banner so it's never clipped */}
            <div className="absolute -bottom-12 left-6 z-10">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full border-4 border-[#1C1C1C] overflow-hidden bg-[#141414] shadow-xl">
                  {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
                    </div>
                  ) : (
                    <img
                      src={avatar}
                      alt={profile?.username}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {!loading && profile?.showOnlineStatus && (
                  <span
                    className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#1C1C1C] ${
                      online ? 'bg-green-500' : 'bg-zinc-600'
                    }`}
                    title={online ? 'Online' : 'Offline'}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 rounded-b-2xl">
            {/* Space for avatar overlap + friend button row */}
            <div className="px-6 pt-14 pb-5">
              <div className="flex items-end justify-between mb-4">
                {/* Spacer so the friend button aligns to the right while avatar is in the banner */}
                <div />

                {/* Friend action */}
                {!isOwnProfile && !loading && (
                  <div>
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

              {/* Profile info */}
              {loading ? (
                <div className="space-y-2">
                  <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-zinc-800 rounded animate-pulse mt-2" />
                </div>
              ) : profile ? (
                <>
                  <h2 className="text-white text-xl font-bold leading-tight">{profile.displayName}</h2>
                  <p className="text-gray-500 text-sm">@{profile.username}</p>
                  {profile.bio && (
                    <p className="text-gray-400 text-sm mt-2 leading-relaxed">{profile.bio}</p>
                  )}
                  {profile.createdAt && (
                    <p className="text-gray-600 text-xs mt-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#2A2A2A]">
                    {statBlocks.map((s) => (
                      <div key={s.label} className="flex flex-col items-center gap-1 p-3 bg-[#141414] rounded-xl border border-[#2A2A2A]">
                        <span className="text-[#C0392B]">{s.icon}</span>
                        <span className="text-white font-bold text-lg">{s.value}</span>
                        <span className="text-gray-600 text-xs">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* MyStuff section — always visible, gated by showMyStuffPublicly */}
                  <div className="mt-5 pt-4 border-t border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white text-sm font-semibold">MyStuff</p>
                      {profile.showMyStuffPublicly && (
                        <button
                          onClick={() => setMyStuffOpen(true)}
                          className="flex items-center gap-1.5 text-xs text-[#C0392B] hover:text-[#E74C3C] transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          View Fullscreen
                        </button>
                      )}
                    </div>

                    {!profile.showMyStuffPublicly ? (
                      <div className="flex items-center gap-3 py-4 px-4 bg-[#141414] rounded-xl border border-[#2A2A2A]">
                        <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center shrink-0">
                          <BookMarked className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Content is private</p>
                          <p className="text-gray-600 text-xs">{profile.displayName} hasn't made their MyStuff public.</p>
                        </div>
                      </div>
                    ) : previewLoading ? (
                      <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <>
                        {/* Watched strip */}
                        {previewWatched.length > 0 && (
                          <div className="mb-4">
                            <p className="text-gray-500 text-xs mb-2 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-[#C0392B] text-[#C0392B]" />
                              Watched ({profile.watchedCount})
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {previewWatched.map((m) => (
                                <div
                                  key={m.movie_id}
                                  className="relative shrink-0 w-16 rounded-lg overflow-hidden border border-[#2A2A2A]"
                                >
                                  {m.poster ? (
                                    <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                                  ) : (
                                    <div className="w-full aspect-[2/3] bg-[#2A2A2A] flex items-center justify-center">
                                      <Film className="w-4 h-4 text-gray-600" />
                                    </div>
                                  )}
                                  <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/70 rounded-full px-1 py-0.5">
                                    <Star className="w-2 h-2 fill-[#C0392B] text-[#C0392B]" />
                                    <span className="text-white text-[9px]">{m.user_rating}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Watch Later strip */}
                        {previewWatchLater.length > 0 && (
                          <div>
                            <p className="text-gray-500 text-xs mb-2 flex items-center gap-1">
                              <BookMarked className="w-3 h-3 text-gray-400" />
                              Watch Later ({profile.watchlistCount})
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {previewWatchLater.map((m) => (
                                <div
                                  key={m.movie_id}
                                  className="relative shrink-0 w-16 rounded-lg overflow-hidden border border-[#2A2A2A]"
                                >
                                  {m.poster ? (
                                    <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                                  ) : (
                                    <div className="w-full aspect-[2/3] bg-[#2A2A2A] flex items-center justify-center">
                                      <Film className="w-4 h-4 text-gray-600" />
                                    </div>
                                  )}
                                  <div className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5">
                                    <BookMarked className="w-2 h-2 fill-white text-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {previewWatched.length === 0 && previewWatchLater.length === 0 && (
                          <p className="text-gray-600 text-xs py-2">Nothing saved yet.</p>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-500">User not found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
