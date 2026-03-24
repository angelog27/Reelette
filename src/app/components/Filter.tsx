import { Layout } from "./Layout";
import { useState } from "react";
import { Search, X } from "lucide-react";

interface MovieResult {
  id: number;
  title: string;
  year: number;
  genre: string;
  subGenre: string;
  rating: number;
  runtime: number;
  director: string;
  actors: string[];
  poster: string;
}

// Mock movie data
const mockMovies: MovieResult[] = [
  { id: 1, title: "Inception", year: 2010, genre: "Sci-Fi", subGenre: "Action", rating: 8.8, runtime: 148, director: "Christopher Nolan", actors: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"], poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&h=450&fit=crop" },
  { id: 2, title: "The Dark Knight", year: 2008, genre: "Action", subGenre: "Crime", rating: 9.0, runtime: 152, director: "Christopher Nolan", actors: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"], poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=450&fit=crop" },
  { id: 3, title: "Parasite", year: 2019, genre: "Thriller", subGenre: "Drama", rating: 8.6, runtime: 132, director: "Bong Joon-ho", actors: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"], poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450&fit=crop" },
  { id: 4, title: "Amélie", year: 2001, genre: "Romance", subGenre: "Comedy", rating: 8.3, runtime: 122, director: "Jean-Pierre Jeunet", actors: ["Audrey Tautou", "Mathieu Kassovitz", "Rufus"], poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=450&fit=crop" },
  { id: 5, title: "The Shawshank Redemption", year: 1994, genre: "Drama", subGenre: "Crime", rating: 9.3, runtime: 142, director: "Frank Darabont", actors: ["Tim Robbins", "Morgan Freeman", "Bob Gunton"], poster: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=450&fit=crop" },
  { id: 6, title: "Spirited Away", year: 2001, genre: "Animation", subGenre: "Fantasy", rating: 8.6, runtime: 125, director: "Hayao Miyazaki", actors: ["Rumi Hiiragi", "Miyu Irino", "Yuko Tanaka"], poster: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&h=450&fit=crop" },
  { id: 7, title: "Pulp Fiction", year: 1994, genre: "Crime", subGenre: "Action", rating: 8.9, runtime: 154, director: "Quentin Tarantino", actors: ["John Travolta", "Uma Thurman", "Samuel L. Jackson"], poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=450&fit=crop" },
  { id: 8, title: "The Godfather", year: 1972, genre: "Crime", subGenre: "Drama", rating: 9.2, runtime: 175, director: "Francis Ford Coppola", actors: ["Marlon Brando", "Al Pacino", "James Caan"], poster: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=300&h=450&fit=crop" },
  { id: 9, title: "Interstellar", year: 2014, genre: "Sci-Fi", subGenre: "Adventure", rating: 8.6, runtime: 169, director: "Christopher Nolan", actors: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"], poster: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=300&h=450&fit=crop" },
  { id: 10, title: "Your Name", year: 2016, genre: "Animation", subGenre: "Romance", rating: 8.4, runtime: 106, director: "Makoto Shinkai", actors: ["Ryûnosuke Kamiki", "Mone Kamishiraishi", "Ryo Narita"], poster: "https://images.unsplash.com/photo-1574267432644-f610f4b98c89?w=300&h=450&fit=crop" },
  { id: 11, title: "Mad Max: Fury Road", year: 2015, genre: "Action", subGenre: "Adventure", rating: 8.1, runtime: 120, director: "George Miller", actors: ["Tom Hardy", "Charlize Theron", "Nicholas Hoult"], poster: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&h=450&fit=crop" },
  { id: 12, title: "La La Land", year: 2016, genre: "Romance", subGenre: "Musical", rating: 8.0, runtime: 128, director: "Damien Chazelle", actors: ["Ryan Gosling", "Emma Stone", "John Legend"], poster: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=300&h=450&fit=crop" },
  { id: 13, title: "The Exorcist", year: 1973, genre: "Horror", subGenre: "Supernatural", rating: 8.1, runtime: 122, director: "William Friedkin", actors: ["Max von Sydow", "Ellen MacLain", "Linda Blair"], poster: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=300&h=450&fit=crop" },
  { id: 14, title: "Superbad", year: 2007, genre: "Comedy", subGenre: "Teen", rating: 7.6, runtime: 113, director: "Greg Mottola", actors: ["Jonah Hill", "Michael C. Hall", "Seth Rogen"], poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=450&fit=crop" },
  { id: 15, title: "The Conjuring", year: 2013, genre: "Horror", subGenre: "Paranormal", rating: 7.5, runtime: 112, director: "James Wan", actors: ["Vera Farmiga", "Patrick Wilson", "Ron Livingston"], poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=450&fit=crop" },
  { id: 16, title: "John Wick", year: 2014, genre: "Action", subGenre: "Thriller", rating: 7.4, runtime: 101, director: "Chad Stahelski", actors: ["Keanu Reeves", "Michael Nyqvist", "Alfie Allen"], poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450&fit=crop" },
  { id: 17, title: "A Quiet Place", year: 2018, genre: "Horror", subGenre: "Thriller", rating: 7.5, runtime: 90, director: "John Krasinski", actors: ["Emily Blunt", "John Krasinski", "Millicent Simmonds"], poster: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=300&h=450&fit=crop" },
  { id: 18, title: "The Grand Budapest Hotel", year: 2014, genre: "Comedy", subGenre: "Adventure", rating: 8.1, runtime: 99, director: "Wes Anderson", actors: ["Ralph Fiennes", "F. Murray Abraham", "Tilda Swinton"], poster: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&h=450&fit=crop" },
  { id: 19, title: "Oldboy", year: 2003, genre: "Thriller", subGenre: "Mystery", rating: 8.4, runtime: 120, director: "Park Chan-wook", actors: ["Choi Min-sik", "Song Kang-ho", "Yoo Ji-tae"], poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=450&fit=crop" },
  { id: 20, title: "The Notebook", year: 2004, genre: "Romance", subGenre: "Drama", rating: 7.8, runtime: 123, director: "Nick Cassavetes", actors: ["Rachel McAdams", "Ryan Gosling", "James Garner"], poster: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=300&h=450&fit=crop" },
  { id: 21, title: "Blade Runner 2049", year: 2017, genre: "Sci-Fi", subGenre: "Mystery", rating: 8.0, runtime: 164, director: "Denis Villeneuve", actors: ["Ryan Gosling", "Harrison Ford", "Ana de Armas"], poster: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=300&h=450&fit=crop" },
  { id: 22, title: "The Lion King", year: 1994, genre: "Animation", subGenre: "Musical", rating: 8.5, runtime: 88, director: "Roger Allers", actors: ["Jonathan Taylor Thomas", "Matthew Broderick", "Jeremy Irons"], poster: "https://images.unsplash.com/photo-1574267432644-f610f4b98c89?w=300&h=450&fit=crop" },
  { id: 23, title: "Heat", year: 1995, genre: "Crime", subGenre: "Thriller", rating: 8.3, runtime: 170, director: "Michael Mann", actors: ["Al Pacino", "Robert De Niro", "Val Kilmer"], poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=450&fit=crop" },
  { id: 24, title: "Forrest Gump", year: 1994, genre: "Drama", subGenre: "Romance", rating: 8.8, runtime: 142, director: "Robert Zemeckis", actors: ["Tom Hanks", "Rebecca Whitaker", "Gary Sinise"], poster: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=450&fit=crop" },
];

export function Filter() {
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSubGenre, setSelectedSubGenre] = useState("");
  const [selectedDecade, setSelectedDecade] = useState("");
  const [selectedDirector, setSelectedDirector] = useState("");
  const [selectedActor, setSelectedActor] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [maxRuntime, setMaxRuntime] = useState(300);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState<MovieResult[]>([]);

  const genres = ["All", "Action", "Animation", "Crime", "Drama", "Romance", "Sci-Fi", "Thriller", "Horror", "Comedy"];
  const decades = ["All", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
  
  // Get unique directors from movies
  const directors = ["All", ...Array.from(new Set(mockMovies.map(m => m.director))).sort()];
  
  // Get unique actors from all movies
  const actors = ["All", ...Array.from(new Set(mockMovies.flatMap(m => m.actors))).sort()];

  // Sub-genres based on selected genre
  const subGenreMap: { [key: string]: string[] } = {
    Action: ["All", "Adventure", "Crime", "Thriller", "Superhero"],
    Animation: ["All", "Fantasy", "Romance", "Musical", "Adventure"],
    Crime: ["All", "Action", "Drama", "Thriller", "Heist"],
    Drama: ["All", "Crime", "Romance", "Historical", "Biographical"],
    Romance: ["All", "Comedy", "Drama", "Musical", "Teen"],
    "Sci-Fi": ["All", "Action", "Adventure", "Mystery", "Dystopian"],
    Thriller: ["All", "Drama", "Mystery", "Crime", "Psychological"],
    Horror: ["All", "Supernatural", "Paranormal", "Thriller", "Slasher"],
    Comedy: ["All", "Teen", "Adventure", "Romance", "Dark"],
  };

  const availableSubGenres = selectedGenre && selectedGenre !== "All" ? subGenreMap[selectedGenre] || ["All"] : ["All"];

  const handleSearch = () => {
    let results = mockMovies.filter(movie => {
      const matchesGenre = !selectedGenre || selectedGenre === "All" || movie.genre === selectedGenre;
      const matchesSubGenre = !selectedSubGenre || selectedSubGenre === "All" || movie.subGenre === selectedSubGenre;
      const matchesDirector = !selectedDirector || selectedDirector === "All" || movie.director === selectedDirector;
      const matchesActor = !selectedActor || selectedActor === "All" || movie.actors.includes(selectedActor);
      const matchesRating = movie.rating >= minRating;
      const matchesRuntime = movie.runtime <= maxRuntime;
      const matchesQuery = !searchQuery || movie.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesDecade = true;
      if (selectedDecade && selectedDecade !== "All") {
        const decadeStart = parseInt(selectedDecade.slice(0, 4));
        matchesDecade = movie.year >= decadeStart && movie.year < decadeStart + 10;
      }
      
      return matchesGenre && matchesSubGenre && matchesDirector && matchesActor && matchesRating && matchesRuntime && matchesQuery && matchesDecade;
    });
    
    setFilteredResults(results);
  };

  const handleClearFilters = () => {
    setSelectedGenre("");
    setSelectedSubGenre("");
    setSelectedDecade("");
    setSelectedDirector("");
    setSelectedActor("");
    setMinRating(0);
    setMaxRuntime(300);
    setSearchQuery("");
    setFilteredResults([]);
  };

  return (
    <Layout>
      <div className="absolute bg-[#383232] h-[750px] left-[58px] top-[238px] w-[1324px] overflow-y-auto z-0">
        <div className="p-8 pb-64">{/* Significantly increased bottom padding for full scrolling */}
          <h2 className="font-['Rock_Salt:Regular',sans-serif] text-white text-[36px] mb-8 text-center">
            Search by Filter
          </h2>

          {/* Filter Panel */}
          <div className="bg-[#2a2424] rounded-lg p-6 mb-6 shadow-lg">
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Search Query */}
              <div className="col-span-2">
                <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                  Movie Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by movie title..."
                    className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[16px] px-4 py-3 pl-12 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>

              {/* Genre Filter */}
              <div>
                <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                  Genre
                </label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[16px] px-4 py-3 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none cursor-pointer"
                >
                  <option value="">Select genre...</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              {/* Sub-genre Filter */}
              <div>
                <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                  Sub-genre
                </label>
                <select
                  value={selectedSubGenre}
                  onChange={(e) => setSelectedSubGenre(e.target.value)}
                  className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[16px] px-4 py-3 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none cursor-pointer"
                >
                  <option value="">Select sub-genre...</option>
                  {availableSubGenres.map((subGenre) => (
                    <option key={subGenre} value={subGenre}>{subGenre}</option>
                  ))}
                </select>
              </div>

              {/* Decade Filter */}
              <div>
                <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                  Decade
                </label>
                <select
                  value={selectedDecade}
                  onChange={(e) => setSelectedDecade(e.target.value)}
                  className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[16px] px-4 py-3 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none cursor-pointer"
                >
                  <option value="">Select decade...</option>
                  {decades.map((decade) => (
                    <option key={decade} value={decade}>{decade}</option>
                  ))}
                </select>
              </div>

              {/* Director Filter */}
              <div>
                <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                  Director
                </label>
                <select
                  value={selectedDirector}
                  onChange={(e) => setSelectedDirector(e.target.value)}
                  className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[16px] px-4 py-3 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none cursor-pointer"
                >
                  <option value="">Select director...</option>
                  {directors.map((director) => (
                    <option key={director} value={director}>{director}</option>
                  ))}
                </select>
              </div>

              {/* Actor Filter */}
              <div>
                <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                  Actor
                </label>
                <select
                  value={selectedActor}
                  onChange={(e) => setSelectedActor(e.target.value)}
                  className="w-full bg-[#383232] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[16px] px-4 py-3 rounded-lg border border-gray-600 focus:border-[#8d0000] focus:outline-none cursor-pointer"
                >
                  <option value="">Select actor...</option>
                  {actors.map((actor) => (
                    <option key={actor} value={actor}>{actor}</option>
                  ))}
                </select>
              </div>

              {/* Minimum Rating */}
              <div>
                <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                  Minimum Rating: {minRating.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#8d0000]"
                />
                <div className="flex justify-between text-gray-400 text-sm mt-1">
                  <span>0.0</span>
                  <span>10.0</span>
                </div>
              </div>

              {/* Maximum Runtime */}
              <div className="col-span-2">
                <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[16px] block mb-2">
                  Maximum Runtime: {maxRuntime} minutes
                </label>
                <input
                  type="range"
                  min="60"
                  max="300"
                  step="10"
                  value={maxRuntime}
                  onChange={(e) => setMaxRuntime(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#8d0000]"
                />
                <div className="flex justify-between text-gray-400 text-sm mt-1">
                  <span>60 min</span>
                  <span>300 min</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSearch}
                className="flex-1 bg-[#8d0000] hover:bg-[#6d0000] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[18px] py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Search Movies
              </button>
              <button
                onClick={handleClearFilters}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-['Luxurious_Roman:Regular',sans-serif] text-[18px] py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Clear Filters
              </button>
            </div>
          </div>

          {/* Results Section */}
          {filteredResults.length > 0 && (
            <div>
              <h3 className="font-['Rock_Salt:Regular',sans-serif] text-white text-[24px] mb-4">
                Found {filteredResults.length} {filteredResults.length === 1 ? 'movie' : 'movies'}
              </h3>
              <div className="grid grid-cols-4 gap-6">
                {filteredResults.map((movie) => (
                  <div key={movie.id} className="bg-[#2a2424] rounded-lg overflow-hidden hover:transform hover:scale-105 transition-all shadow-lg">
                    <img 
                      src={movie.poster} 
                      alt={movie.title}
                      className="w-full h-[300px] object-cover"
                    />
                    <div className="p-4">
                      <h4 className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[18px] mb-2 truncate">
                        {movie.title}
                      </h4>
                      <div className="space-y-1 text-gray-400 text-[14px]">
                        <p className="font-['Luxurious_Roman:Regular',sans-serif]">{movie.year} • {movie.genre}</p>
                        <p className="font-['Luxurious_Roman:Regular',sans-serif]">{movie.runtime} min</p>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">★</span>
                          <span className="font-['Luxurious_Roman:Regular',sans-serif] text-white">{movie.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {filteredResults.length === 0 && searchQuery === "" && selectedGenre === "" && selectedDecade === "" && (
            <div className="text-center py-12">
              <p className="font-['Luxurious_Roman:Regular',sans-serif] text-gray-400 text-[20px]">
                Select filters and click "Search Movies" to find your perfect film
              </p>
            </div>
          )}

          {filteredResults.length === 0 && (searchQuery !== "" || selectedGenre !== "" || selectedDecade !== "") && (
            <div className="text-center py-12">
              <p className="font-['Luxurious_Roman:Regular',sans-serif] text-gray-400 text-[20px]">
                No movies found matching your filters. Try adjusting your criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}