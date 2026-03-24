import { Layout } from "./Layout";
import { useState } from "react";
import { motion } from "motion/react";

const genres = [
  "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", 
  "Thriller", "Adventure", "Fantasy", "Mystery"
];

const subGenres = [
  "Superhero", "Crime", "War", "Heist", "Space", "Monster",
  "Zombie", "Detective", "Dystopian", "Period"
];

const decades = [
  "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"
];

export function Wheel() {
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedSubGenre, setSelectedSubGenre] = useState<string>("");
  const [selectedDecade, setSelectedDecade] = useState<string>("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);

  const spinWheel = () => {
    if (spinning) return;
    
    setSpinning(true);

    // Random number of full rotations plus a random position
    const spins = 8 + Math.floor(Math.random() * 5); // 8-13 full rotations
    const finalRotation = rotation + (spins * 360) + Math.floor(Math.random() * 360);
    
    // Ball rotates in opposite direction and faster initially, then slows down
    const ballSpins = 12 + Math.floor(Math.random() * 8);
    const finalBallRotation = ballRotation - (ballSpins * 360) - Math.floor(Math.random() * 360);
    
    setRotation(finalRotation);
    setBallRotation(finalBallRotation);

    // End spinning after animation completes
    setTimeout(() => {
      setSpinning(false);
      // Here is where API call will happen to get movie based on filters
    }, 5000);
  };

  const canSpin = selectedGenre && selectedSubGenre && selectedDecade;

  // Create 24 segments (alternating red and black)
  const segments = 24;
  const segmentAngle = 360 / segments;

  return (
    <Layout>
      <div className="absolute bg-[#383232] h-[750px] left-[58px] top-[238px] w-[1324px] overflow-y-auto z-0">
        <div className="flex flex-col items-center pt-8 pb-32 px-8 min-h-[1200px]">
          <h2 className="font-['Rock_Salt:Regular',sans-serif] text-white text-[48px] mb-8">
            Spin the Reelette
          </h2>
          
          {/* Filter Dropdowns */}
          <div className="flex gap-8 mb-12">
            {/* Genre Filter */}
            <div className="flex flex-col items-center">
              <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[20px] mb-2">
                Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[18px] bg-[#5a4a4a] px-6 py-3 rounded-lg border-2 border-yellow-400 cursor-pointer hover:bg-[#6a5a5a] transition-colors w-[200px]"
                disabled={spinning}
              >
                <option value="">Select Genre</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre} className="bg-[#5a4a4a]">
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-Genre Filter */}
            <div className="flex flex-col items-center">
              <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[20px] mb-2">
                Sub-Genre
              </label>
              <select
                value={selectedSubGenre}
                onChange={(e) => setSelectedSubGenre(e.target.value)}
                className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[18px] bg-[#5a4a4a] px-6 py-3 rounded-lg border-2 border-yellow-400 cursor-pointer hover:bg-[#6a5a5a] transition-colors w-[200px]"
                disabled={spinning}
              >
                <option value="">Select Sub-Genre</option>
                {subGenres.map((subGenre) => (
                  <option key={subGenre} value={subGenre} className="bg-[#5a4a4a]">
                    {subGenre}
                  </option>
                ))}
              </select>
            </div>

            {/* Decade Filter */}
            <div className="flex flex-col items-center">
              <label className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[20px] mb-2">
                Decade
              </label>
              <select
                value={selectedDecade}
                onChange={(e) => setSelectedDecade(e.target.value)}
                className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[18px] bg-[#5a4a4a] px-6 py-3 rounded-lg border-2 border-yellow-400 cursor-pointer hover:bg-[#6a5a5a] transition-colors w-[200px]"
                disabled={spinning}
              >
                <option value="">Select Decade</option>
                {decades.map((decade) => (
                  <option key={decade} value={decade} className="bg-[#5a4a4a]">
                    {decade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Big Roulette Wheel */}
          <div className="relative mb-8">
            {/* Outer rim */}
            <div className="w-[450px] h-[450px] rounded-full bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.4)] p-4">
              
              {/* Ball track */}
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-800 to-amber-900 flex items-center justify-center p-3">
                
                {/* Ball */}
                <motion.div
                  className="absolute"
                  style={{
                    top: '50%',
                    left: '50%',
                    marginLeft: '-10px',
                    marginTop: '-10px',
                  }}
                  animate={{ rotate: ballRotation }}
                  transition={{ duration: 5, ease: "easeOut" }}
                >
                  <div 
                    className="w-5 h-5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    style={{ 
                      transform: 'translateX(200px)',
                    }}
                  />
                </motion.div>

                {/* Spinning wheel */}
                <motion.div 
                  className="w-full h-full rounded-full relative overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"
                  animate={{ rotate: rotation }}
                  transition={{ duration: 5, ease: "easeOut" }}
                >
                  {/* Create alternating red and black segments using conic gradient */}
                  <div 
                    className="w-full h-full rounded-full"
                    style={{
                      background: `conic-gradient(
                        from 0deg,
                        #dc2626 0deg 15deg,
                        #1a1a1a 15deg 30deg,
                        #dc2626 30deg 45deg,
                        #1a1a1a 45deg 60deg,
                        #dc2626 60deg 75deg,
                        #1a1a1a 75deg 90deg,
                        #dc2626 90deg 105deg,
                        #1a1a1a 105deg 120deg,
                        #dc2626 120deg 135deg,
                        #1a1a1a 135deg 150deg,
                        #dc2626 150deg 165deg,
                        #1a1a1a 165deg 180deg,
                        #dc2626 180deg 195deg,
                        #1a1a1a 195deg 210deg,
                        #dc2626 210deg 225deg,
                        #1a1a1a 225deg 240deg,
                        #dc2626 240deg 255deg,
                        #1a1a1a 255deg 270deg,
                        #dc2626 270deg 285deg,
                        #1a1a1a 285deg 300deg,
                        #dc2626 300deg 315deg,
                        #1a1a1a 315deg 330deg,
                        #dc2626 330deg 345deg,
                        #1a1a1a 345deg 360deg
                      )`
                    }}
                  >
                    {/* Separator lines between segments */}
                    {[...Array(segments)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-[2px] h-1/2 bg-yellow-600 top-0 left-1/2 origin-bottom"
                        style={{
                          transform: `rotate(${i * segmentAngle}deg)`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Center circle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-yellow-600 to-yellow-700 w-[120px] h-[120px] rounded-full flex items-center justify-center border-4 border-yellow-400 shadow-lg">
                    <button
                      onClick={spinWheel}
                      disabled={spinning || !canSpin}
                      className={`bg-[#1a1a1a] w-[90px] h-[90px] rounded-full flex items-center justify-center ${
                        spinning || !canSpin ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-[#2a2a2a]'
                      } transition-colors`}
                    >
                      <p className="font-['Rock_Salt:Regular',sans-serif] text-yellow-400 text-[24px]">
                        R
                      </p>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
            
            {/* Pointer at top */}
            <div className="absolute top-[5px] left-1/2 transform -translate-x-1/2 z-20">
              <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[35px] border-t-white shadow-lg" />
            </div>
          </div>

          {/* Placeholder for future result display */}
          {spinning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center"
            >
              <p className="font-['Luxurious_Roman:Regular',sans-serif] text-gray-400 text-[16px]">
                Searching with: {selectedGenre} • {selectedSubGenre} • {selectedDecade}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}