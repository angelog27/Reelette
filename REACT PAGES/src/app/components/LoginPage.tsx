import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from '../../assets/Full_Reelette_upscaled.png';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { StreamingSetup } from './StreamingSetup';
import {
  login,
  register,
  saveUser,
  getUserStreaming,
  saveServices,
  hasServicesConfigured,
  forgotPassword,
} from '../services/api';

// Real TMDB movie poster images
const moviePosters = [
  'https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg', // Jurassic Park  G
  'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', // Star Wars: A New Hope  G
  'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg', // The Batman   G
  'https://image.tmdb.org/t/p/w500/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg', // The Dark Knight Rises    Y
  'https://image.tmdb.org/t/p/original/8PWiwMBccJ67Ng7STjJSgr92qSJ.jpg', // Tron Legacy              Y
  'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', // Avengers Endgame         G
  'https://image.tmdb.org/t/p/original/ceG9VzoRAVGwivFU403Wc3AHRys.jpg', // Indiana Jones            Y
  'https://image.tmdb.org/t/p/original/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg', // The Empire Strikes Back  N
  'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', // Spider-Man No Way Home   Y
  'https://image.tmdb.org/t/p/original/dMc96Rn0XutMaIYJNwkJ5yO9oTh.jpg', // Iron Man                 N
  'https://image.tmdb.org/t/p/original/7sfbEnaARXDDhKm0CZ7D7uc2sbo.jpg', //inglorious bastards
  'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', // The Dark Knight          Y
];

type View = 'login' | 'register' | 'forgot-password' | 'ask-streaming' | 'setup-streaming';

interface ScrollingRowProps {
  images: string[];
  direction?: 'left' | 'right';
  speed?: number;
}

function ScrollingRow({ images, direction = 'left', speed = 30 }: ScrollingRowProps) {
  const duplicated = [...images, ...images, ...images];
  return (
    <div className="relative overflow-hidden h-40 mb-4">
      <div
        className="flex gap-4 absolute"
        style={{
          animation: `scroll-${direction} ${speed}s linear infinite`,
          width: 'max-content',
        }}
      >
        {duplicated.map((img, idx) => (
          <div
            key={idx}
            className="h-40 w-28 flex-shrink-0 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300"
          >
            <img src={img} alt="Movie poster" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');

  // Shared across login/register flows
  const [pendingUserId, setPendingUserId] = useState('');
  const [pendingUsername, setPendingUsername] = useState('');
  const [existingServices, setExistingServices] = useState<Record<string, boolean>>({});

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const row1 = moviePosters.slice(0, 3);
  const row2 = moviePosters.slice(3, 6);
  const row3 = moviePosters.slice(6, 9);
  const row4 = moviePosters.slice(9, 12);

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setLoginError(result.message || 'Login failed');
        return;
      }

     // Save user info locally for app usage
    localStorage.setItem('user_id', result.user_id);
    localStorage.setItem('email', result.email);
    localStorage.setItem('username', result.username);


    saveUser({ user_id: result.user_id, username: result.username, email: result.email });

      // Fetch + cache their streaming services
      const services = await getUserStreaming(result.user_id);
      saveServices(services);

      setPendingUserId(result.user_id);
      setPendingUsername(result.username);
      setExistingServices(services);

      if (hasServicesConfigured(services)) {
        // Has services set — ask if they want to update them
        setView('ask-streaming');
      } else {
        // Brand new or never set services — go straight to setup
        setView('setup-streaming');
      }
    } catch {
      setLoginError('Could not connect to server. Make sure the backend is running.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);
    try {
      const result = await register(regEmail, regPassword, regUsername);
      if (!result.success) {
        setRegError(result.message || 'Registration failed');
        return;
      }

      // Auto-login
      const loginResult = await login(regEmail, regPassword);
      if (!loginResult.success) {
        setRegError('Account created but login failed. Please log in.');
        setView('login');
        return;
      }

      localStorage.setItem('user_id', loginResult.user_id);
      localStorage.setItem('email', loginResult.email);
      localStorage.setItem('username', loginResult.username);

      saveUser({ user_id: loginResult.user_id, username: loginResult.username, email: loginResult.email });
      saveServices({});

      setPendingUserId(loginResult.user_id);
      setPendingUsername(loginResult.username);
      // New account — always show streaming setup
      setView('setup-streaming');
    } catch {
      setRegError('Could not connect to server. Make sure the backend is running.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);

    try {
      const result = await forgotPassword(forgotEmail);

      if (!result.success) {
        setForgotError(result.message || 'Failed to send reset email');
        return;
      }

      setForgotMessage('Reset email sent. Check your inbox.');
    } catch {
      setForgotError('Could not connect to server. Make sure the backend is running.');
    } finally {
      setForgotLoading(false);
    }
  };

  const goHome = () => navigate('/home/discover');

  const scrollingSection = (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/60 z-10 pointer-events-none" />
      <ScrollingRow images={row1} direction="left" speed={40} />
      <ScrollingRow images={row2} direction="right" speed={35} />
      <ScrollingRow images={row3} direction="left" speed={45} />
      <ScrollingRow images={row4} direction="right" speed={38} />
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes scroll-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes scroll-right {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="min-h-screen w-full bg-gradient-to-r from-[#2d0a0a] via-[#1a0000] via-30% via-[#0f0000] via-60% to-black flex">
        {scrollingSection}

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="mb-6">
                <img src={logoImage} alt="Reelette" className="h-56 w-auto scale-[2] origin-top" />
            </div>
            <p className="text-center mb-10 px-4 text-lg">
              <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                The ultimate way to discover, rate, and share movies
              </span>
              <span className="text-gray-400"> with friends.</span>
            </p>

            {/* ── Login ── */}
            {view === 'login' && (
              <div className="w-full bg-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500 rounded-lg h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Password</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500 rounded-lg h-12"
                      required
                    />
                  </div>
                  {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-12 rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {loginLoading ? 'Signing in...' : 'Login'}
                  </Button>
                  <div className="text-center pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setView('register')}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        Sign up
                      </button>
                    </p>

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setForgotError('');
                          setForgotMessage('');
                          setView('forgot-password');
                        }}
                        className="text-sm text-red-500 hover:text-red-400 transition-colors"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* ── Register ── */}
            {view === 'register' && (
              <div className="w-full bg-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-white text-xl font-semibold mb-6 text-center">Create Account</h2>
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Username</label>
                    <Input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500 rounded-lg h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Email</label>
                    <Input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500 rounded-lg h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Password</label>
                    <Input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Choose a password"
                      className="w-full bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500 rounded-lg h-12"
                      required
                    />
                  </div>
                  {regError && <p className="text-red-400 text-sm text-center">{regError}</p>}
                  <Button
                    type="submit"
                    disabled={regLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-12 rounded-lg disabled:opacity-50"
                  >
                    {regLoading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                  <div className="text-center pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setView('login')}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        Log in
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            )}

            {view === 'forgot-password' && (
              <div className="w-full bg-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-white text-xl font-semibold mb-6 text-center">Reset Password</h2>
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Email</label>
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500 rounded-lg h-12"
                      required
                    />
                  </div>

                  <p className="text-sm text-gray-400 text-center">
                    Enter your email and we’ll send you a reset link. Make sure to check spam folder.
                  </p>

                  {forgotError && <p className="text-red-400 text-sm text-center">{forgotError}</p>}
                  {forgotMessage && <p className="text-green-400 text-sm text-center">{forgotMessage}</p>}

                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-12 rounded-lg disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Email'}
                  </Button>

                  <div className="text-center pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400">
                      Remember your password?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setForgotError('');
                          setForgotMessage('');
                          setView('login');
                        }}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        Log in
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            )}

            {/* ── Ask existing user about services ── */}
            {view === 'ask-streaming' && (
              <div className="w-full bg-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
                <h2 className="text-white text-xl font-semibold mb-3">
                  Welcome back, {pendingUsername}!
                </h2>
                <p className="text-gray-400 mb-8">
                  Would you like to update your streaming service preferences?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={goHome}
                    className="flex-1 bg-[#2A2A2A] hover:bg-[#333333] text-white px-6 py-3 rounded-lg transition-colors font-medium"
                  >
                    No, go to app
                  </button>
                  <button
                    onClick={() => setView('setup-streaming')}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-lg transition-all font-medium"
                  >
                    Yes, update
                  </button>
                </div>
              </div>
            )}

            {/* ── Streaming setup ── */}
            {view === 'setup-streaming' && (
              <StreamingSetup
                userId={pendingUserId}
                initialServices={existingServices}
                onDone={goHome}
                onSkip={goHome}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
