import { Layout } from "./Layout";

const trendingMovies = [
  {
    id: 1,
    title: "Interstellar",
    poster: "https://images.unsplash.com/photo-1659835347242-97835d671db7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbnRlcnN0ZWxsYXIlMjBtb3ZpZSUyMHBvc3RlcnxlbnwxfHx8fDE3NzI0MDIyOTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 2,
    title: "Dune",
    poster: "https://images.unsplash.com/photo-1623038318872-d11e84a7e421?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkdW5lJTIwbW92aWUlMjBwb3N0ZXJ8ZW58MXx8fHwxNzcyNDEyNTAyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 3,
    title: "Avengers",
    poster: "https://images.unsplash.com/photo-1569701813229-33284b643e3c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdmVuZ2VycyUyMG1vdmllJTIwcG9zdGVyfGVufDF8fHx8MTc3MjQxMjgyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 4,
    title: "Joker",
    poster: "https://images.unsplash.com/photo-1571763348529-801775d87153?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqb2tlciUyMG1vdmllJTIwcG9zdGVyfGVufDF8fHx8MTc3MjQxMjgyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 5,
    title: "Spider-Man",
    poster: "https://images.unsplash.com/photo-1642456074142-92f75cb84533?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGlkZXJtYW4lMjBjaW5lbWElMjBwb3N0ZXJ8ZW58MXx8fHwxNzcyNDEyODI4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 6,
    title: "Batman",
    poster: "https://images.unsplash.com/photo-1628432136678-43ff9be34064?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXRtYW4lMjBmaWxtJTIwcG9zdGVyfGVufDF8fHx8MTc3MjQxMjgyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 7,
    title: "Marvel Heroes",
    poster: "https://images.unsplash.com/photo-1708376368427-ede2b537d494?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJ2ZWwlMjBzdXBlcmhlcm8lMjBwb3N0ZXJ8ZW58MXx8fHwxNzcyNDEyODI4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 8,
    title: "Star Wars",
    poster: "https://images.unsplash.com/photo-1569793667639-dae11573b34f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFyJTIwd2FycyUyMGZpbG0lMjBwb3N0ZXJ8ZW58MXx8fHwxNzcyNDEyODI4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 9,
    title: "Oppenheimer",
    poster: "https://images.unsplash.com/photo-1692528673971-356bc4800482?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcHBlbmhlaW1lciUyMGZpbG0lMjBwb3N0ZXJ8ZW58MXx8fHwxNzcyNDEzNTUwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 10,
    title: "Avatar",
    poster: "https://images.unsplash.com/photo-1702129751366-d60f2d10c2ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdmF0YXIlMjBmaWxtJTIwcG9zdGVyfGVufDF8fHx8MTc3MjQxMzU1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 11,
    title: "Gladiator",
    poster: "https://images.unsplash.com/photo-1609044761005-98fa57f4d793?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnbGFkaWF0b3IlMjBtb3ZpZSUyMHBvc3RlcnxlbnwxfHx8fDE3NzIzMDY1MzV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 12,
    title: "Titanic",
    poster: "https://images.unsplash.com/photo-1764037047635-25e8357bbc4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aXRhbmljJTIwZmlsbSUyMHBvc3RlcnxlbnwxfHx8fDE3NzI0MTM1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 13,
    title: "Lord of the Rings",
    poster: "https://images.unsplash.com/photo-1767219077120-1aa6d2398717?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb3JkJTIwcmluZ3MlMjBtb3ZpZSUyMHBvc3RlcnxlbnwxfHx8fDE3NzI0MTM1NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 14,
    title: "Harry Potter",
    poster: "https://images.unsplash.com/photo-1619967945958-60addef2f651?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXJyeSUyMHBvdHRlciUyMGZpbG0lMjBwb3N0ZXJ8ZW58MXx8fHwxNzcyNDEzNTUyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 15,
    title: "The Godfather",
    poster: "https://images.unsplash.com/photo-1628432136678-43ff9be34064?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2RmYXRoZXIlMjBtb3ZpZSUyMHBvc3RlcnxlbnwxfHx8fDE3NzIzNDM2MTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 16,
    title: "Jurassic Park",
    poster: "https://images.unsplash.com/photo-1747007695506-cf83e164bb6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqdXJhc3NpYyUyMHBhcmslMjBtb3ZpZXxlbnwxfHx8fDE3NzI0MTM1NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 17,
    title: "Terminator",
    poster: "https://images.unsplash.com/photo-1710988486821-9af47f60d62b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZXJtaW5hdG9yJTIwZmlsbXxlbnwxfHx8fDE3NzI0MTM1NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 18,
    title: "Alien",
    poster: "https://images.unsplash.com/photo-1767048264833-5b65aacd1039?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbGllbiUyMG1vdmllJTIwcG9zdGVyfGVufDF8fHx8MTc3MjQxMzU1N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  }
];

export function Home() {
  return (
    <Layout>
      <div className="absolute bg-[#383232] h-[750px] left-[58px] top-[238px] w-[1324px] overflow-y-auto z-0">
        <div className="grid grid-cols-4 gap-6 p-6">
          {trendingMovies.map((movie) => (
            <div key={movie.id} className="flex flex-col">
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 hover:scale-105 transition-transform cursor-pointer">
                <img 
                  src={movie.poster} 
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-white text-center mt-2 font-['Luxurious_Roman:Regular',sans-serif] text-[18px]">{movie.title}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}