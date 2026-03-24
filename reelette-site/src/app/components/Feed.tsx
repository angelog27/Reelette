import { Layout } from "./Layout";
import { useState } from "react";
import { Heart, Plus, X, Trash2 } from "lucide-react";

interface Post {
  id: number;
  username: string;
  handle: string;
  content: string;
  movieTitle: string;
  rating: number;
  timestamp: string;
  likes: number;
  avatar: string;
  liked?: boolean;
}

const initialPosts: Post[] = [
  {
    id: 1,
    username: "CinemaLover",
    handle: "@cinemalover",
    content: "Just watched Interstellar for the 10th time and I'm still blown away by the visuals and soundtrack. Nolan is a genius!",
    movieTitle: "Interstellar",
    rating: 5,
    timestamp: "2h ago",
    likes: 142,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
  },
  {
    id: 2,
    username: "MovieBuff23",
    handle: "@moviebuff23",
    content: "Dune Part 2 exceeded all my expectations. The cinematography is absolutely stunning. Denis Villeneuve does it again!",
    movieTitle: "Dune",
    rating: 5,
    timestamp: "4h ago",
    likes: 298,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
  },
  {
    id: 3,
    username: "FilmFanatic",
    handle: "@filmfanatic",
    content: "The Joker is a masterpiece. Joaquin Phoenix's performance is haunting and unforgettable. This movie stays with you.",
    movieTitle: "Joker",
    rating: 5,
    timestamp: "6h ago",
    likes: 523,
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop"
  },
  {
    id: 4,
    username: "ReelTalk",
    handle: "@reeltalk",
    content: "Spider-Man: No Way Home brought back so much nostalgia! The multiverse concept was executed perfectly. Love it!",
    movieTitle: "Spider-Man",
    rating: 4,
    timestamp: "8h ago",
    likes: 687,
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop"
  },
  {
    id: 5,
    username: "NightOwlCinema",
    handle: "@nightowlcinema",
    content: "The Dark Knight still holds up as one of the best superhero movies ever made. Heath Ledger's Joker is iconic.",
    movieTitle: "Batman",
    rating: 5,
    timestamp: "10h ago",
    likes: 892,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
  },
  {
    id: 6,
    username: "PopcornReviews",
    handle: "@popcornreviews",
    content: "Endgame was the perfect conclusion to the Infinity Saga. Emotional, epic, and satisfying. Marvel did it right!",
    movieTitle: "Avengers",
    rating: 5,
    timestamp: "12h ago",
    likes: 1024,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
  }
];

export function Feed() {
  const [posts, setPosts] = useState(initialPosts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movieTitle, setMovieTitle] = useState("");
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId && !post.liked
        ? { ...post, likes: post.likes + 1, liked: true }
        : post
    ));
  };

  const handleDelete = (postId: number) => {
    setPosts(posts.filter(post => post.id !== postId));
  };

  const handleSubmitPost = () => {
    if (!movieTitle.trim() || !content.trim() || rating === 0) {
      alert("Please fill in all fields and select a rating");
      return;
    }

    const newPost: Post = {
      id: posts.length + 1,
      username: "You",
      handle: "@you",
      content: content,
      movieTitle: movieTitle,
      rating: rating,
      timestamp: "Just now",
      likes: 0,
      avatar: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop"
    };

    setPosts([newPost, ...posts]);
    
    // Reset form
    setMovieTitle("");
    setRating(0);
    setContent("");
    setIsModalOpen(false);
  };

  return (
    <Layout>
      <div className="absolute bg-[#383232] h-[750px] left-[58px] top-[238px] w-[1324px] overflow-y-auto z-0">
        <div className="p-6 space-y-4">
          {/* Post Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-[#8d0000] hover:bg-[#6d0000] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[20px] py-4 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-lg"
          >
            <Plus className="w-6 h-6" />
            Create Post
          </button>

          {posts.map((post) => (
            <div key={post.id} className="bg-[#2a2424] rounded-lg p-6 hover:bg-[#312828] transition-colors group">
              {/* User info */}
              <div className="flex items-start gap-4 mb-4">
                <img 
                  src={post.avatar} 
                  alt={post.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[18px]">
                        {post.username}
                      </p>
                      <p className="font-['Luxurious_Roman:Regular',sans-serif] text-gray-400 text-[14px]">
                        {post.handle} · {post.timestamp}
                      </p>
                    </div>
                    {/* Delete button - only show for your own posts */}
                    {post.username === "You" && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-2"
                        title="Delete post"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Movie title and rating */}
                  <div className="flex items-center gap-2 mt-1 mb-3">
                    <p className="font-['Luxurious_Roman:Regular',sans-serif] text-[#8d0000] text-[16px]">
                      {post.movieTitle}
                    </p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-[14px] ${i < post.rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Post content */}
                  <p className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] leading-relaxed mb-4">
                    {post.content}
                  </p>
                  
                  {/* Like button */}
                  <button
                    onClick={() => handleLike(post.id)}
                    disabled={post.liked}
                    className={`flex items-center gap-2 transition-colors group ${
                      post.liked 
                        ? 'text-red-500 cursor-default' 
                        : 'text-gray-400 hover:text-red-500 cursor-pointer'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${post.liked ? 'fill-red-500' : 'group-hover:fill-red-500'}`} />
                    <span className="font-['Luxurious_Roman:Regular',sans-serif] text-[16px]">
                      {post.likes}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Create Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#2a2424] rounded-lg p-8 w-[600px] max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-[#8d0000]">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-['Rock_Salt:Regular',sans-serif] text-white text-[28px]">
                Create Review
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Movie Title Input */}
            <div className="mb-6">
              <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                Movie Title
              </label>
              <input
                type="text"
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                placeholder="Enter movie title..."
                className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[16px] px-4 py-3 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none"
              />
            </div>

            {/* Rating Selection */}
            <div className="mb-6">
              <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="text-[32px] transition-colors"
                  >
                    <span className={star <= (hoveredStar || rating) ? 'text-yellow-400' : 'text-gray-600'}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Review Content */}
            <div className="mb-6">
              <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                Your Review
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts about the movie..."
                rows={6}
                className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[16px] px-4 py-3 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                onClick={handleSubmitPost}
                className="flex-1 bg-[#8d0000] hover:bg-[#6d0000] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[18px] py-3 rounded-lg transition-colors"
              >
                Post Review
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-['Luxurious_Roman:Regular',sans-serif] text-[18px] py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}