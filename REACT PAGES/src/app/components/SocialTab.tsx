import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Plus, Star, Trash2 } from 'lucide-react';
import { getFeed, createPost, likePost, deletePost, getUser, timeAgo } from '../services/api';
import type { FeedPost } from '../services/api';

interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
  onLike: (post_id: string) => void;
  onDelete: (post_id: string) => void;
}

function PostCard({ post, currentUserId, onLike, onDelete }: PostCardProps) {
  const isLiked = post.liked_by.includes(currentUserId);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(post.username)}`;

  return (
    <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#333333] transition-colors">
      <div className="flex items-start gap-4 mb-4">
        <img
          src={avatarUrl}
          alt={post.username}
          className="w-12 h-12 rounded-full bg-[#141414]"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-medium">{post.username}</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{timeAgo(post.created_at)}</span>
              {post.user_id === currentUserId && (
                <button
                  onClick={() => onDelete(post.post_id)}
                  className="text-gray-600 hover:text-red-500 transition-colors"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p className="text-gray-400 mb-3">{post.message}</p>

          {/* Movie Rating */}
          <div className="bg-[#141414] rounded-lg p-3 mb-4 border border-[#2A2A2A]">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{post.movie_title}</span>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="text-white font-medium">{post.rating}/10</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onLike(post.post_id)}
              className={`flex items-center gap-2 transition-colors ${
                isLiked ? 'text-[#C0392B]' : 'text-gray-500 hover:text-[#C0392B]'
              }`}
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

export function SocialTab() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);

  // New post form state
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newRating, setNewRating] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const currentUser = getUser();
  const currentUserId = currentUser?.user_id ?? '';

  useEffect(() => {
    getFeed().then((p) => {
      setPosts(p);
      setLoading(false);
    });
  }, []);

  const handleLike = async (post_id: string) => {
    if (!currentUserId) return;
    const result = await likePost(post_id, currentUserId, currentUser?.username ?? '');
    if (result.success) {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.post_id !== post_id) return p;
          const alreadyLiked = p.liked_by.includes(currentUserId);
          return {
            ...p,
            likes: alreadyLiked ? p.likes - 1 : p.likes + 1,
            liked_by: alreadyLiked
              ? p.liked_by.filter((id) => id !== currentUserId)
              : [...p.liked_by, currentUserId],
          };
        })
      );
    }
  };

  const handleDelete = async (post_id: string) => {
    if (!currentUserId) return;
    const result = await deletePost(post_id, currentUserId);
    if (result.success) {
      setPosts((prev) => prev.filter((p) => p.post_id !== post_id));
    }
  };

  const handleCreatePost = async () => {
    if (!currentUser) {
      setPostError('You must be logged in to post.');
      return;
    }
    if (!newMovieTitle.trim() || !newMessage.trim()) {
      setPostError('Movie title and message are required.');
      return;
    }
    const rating = parseFloat(newRating);
    if (isNaN(rating) || rating < 0 || rating > 10) {
      setPostError('Rating must be a number between 0 and 10.');
      return;
    }

    setPosting(true);
    setPostError('');
    const result = await createPost({
      user_id: currentUser.user_id,
      username: currentUser.username,
      message: newMessage.trim(),
      movie_title: newMovieTitle.trim(),
      rating,
    });

    if (result.success) {
      // Refresh feed to show new post
      const updated = await getFeed();
      setPosts(updated);
      setNewMovieTitle('');
      setNewRating('');
      setNewMessage('');
      setShowNewPostDialog(false);
    } else {
      setPostError(result.message || 'Failed to create post.');
    }
    setPosting(false);
  };

  return (
    <div className = "min-h-screen bg-[#0A0A0A] text-white">
      <div className="text-2xl font-bold text-white mb-6 relative inline-block">
        Social Feed
        <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-transparent"></div>
      </div>


    <div className="max-w-3xl mx-auto space-y-6 relative pb-20">
      {loading ? (
        <div className="text-gray-500 text-center py-16">Loading feed...</div>
      ) : posts.length === 0 ? (
        <div className="text-gray-500 text-center py-16">No posts yet. Be the first to share!</div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.post_id}
            post={post}
            currentUserId={currentUserId}
            onLike={handleLike}
            onDelete={handleDelete}
          />
        ))
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowNewPostDialog(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-[#C0392B]/30 transition-all hover:scale-110"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* New Post Dialog */}
      {showNewPostDialog && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] p-6 max-w-lg w-full">
            <h2 className="text-2xl text-white font-semibold mb-4">Create New Post</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Movie title..."
                value={newMovieTitle}
                onChange={(e) => setNewMovieTitle(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none"
              />
              <input
                type="number"
                placeholder="Your rating (0-10)"
                min="0"
                max="10"
                step="0.5"
                value={newRating}
                onChange={(e) => setNewRating(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none"
              />
              <textarea
                placeholder="Share your thoughts..."
                rows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-[#C0392B] focus:outline-none resize-none"
              />
              {postError && (
                <p className="text-red-400 text-sm">{postError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowNewPostDialog(false); setPostError(''); }}
                  className="flex-1 bg-[#2A2A2A] hover:bg-[#333333] text-white px-6 py-3 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={posting}
                  className="flex-1 bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] text-white px-6 py-3 rounded-lg transition-all font-medium disabled:opacity-50"
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
