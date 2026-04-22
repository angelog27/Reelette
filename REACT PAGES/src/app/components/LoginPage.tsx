import { useState, useEffect, useRef } from 'react';
import { Mail, Facebook, Apple } from 'lucide-react';
import { Spotlight } from '@/components/ui/spotlight';
import { useNavigate } from 'react-router-dom';
import logoImage from '../../assets/Full_Reelette_upscaled.png';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { StreamingSetup } from './StreamingSetup';
import { signInWithGoogle, signInWithFacebook } from '../services/socialAuth';
import {
  login,
  register,
  saveUser,
  getUserStreaming,
  saveServices,
  hasServicesConfigured,
  forgotPassword,
  socialLogin
} from '../services/api';

// Real TMDB movie poster images
const moviePosters = [
  'https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg', // Jurassic Park  G
  'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', // Star Wars: A New Hope  G
  'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg', // The Batman   G
  'https://image.tmdb.org/t/p/original/ierOUpBnzqEEVykLKxLeLZ9zKc.jpg', // Avatar Fire and Ash    Y
  'https://image.tmdb.org/t/p/original/8PWiwMBccJ67Ng7STjJSgr92qSJ.jpg', // Tron Legacy              Y
  'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', // No way home        G
  'https://image.tmdb.org/t/p/original/ceG9VzoRAVGwivFU403Wc3AHRys.jpg', // Indiana Jones            Y
  'https://image.tmdb.org/t/p/original/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg', // The Empire Strikes Back  N
  'https://image.tmdb.org/t/p/original/eJGWx219ZcEMVQJhAgMiqo8tYY.jpg', // Mario
  'https://image.tmdb.org/t/p/original/dMc96Rn0XutMaIYJNwkJ5yO9oTh.jpg', // Iron Man                 N
  'https://image.tmdb.org/t/p/original/7sfbEnaARXDDhKm0CZ7D7uc2sbo.jpg', //inglorious bastards
  'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', // The Dark Knight          Y
];

type View = 'login' | 'register' | 'forgot-password' | 'ask-streaming' | 'setup-streaming' | 'social';

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
            className="poster-card h-40 w-28 flex-shrink-0 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-300"
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

  const interBubbleRef = useRef<HTMLDivElement>(null);

  const [socialMode, setSocialMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const interBubble = interBubbleRef.current;
    if (!interBubble) return;
    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;
    let animFrameId: number;
    function move() {
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      interBubble!.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      animFrameId = requestAnimationFrame(move);
    }
    const handleMouseMove = (event: MouseEvent) => {
      tgX = event.clientX;
      tgY = event.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    move();
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

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

  const handleGoogleSignIn = async () => {
    setLoginError('');

    try {
      const userCredential = await signInWithGoogle();

      const idToken = await userCredential.user.getIdToken(); // 🔥 FIX

      const result = await socialLogin(idToken, 'google');

      if (!result.success) {
        setLoginError(result.message || 'Google sign-in failed');
        return;
      }

      const user = {
        user_id: result.user_id,
        username: result.username,
        email: result.email,
      };

      saveUser(user);

      const services = await getUserStreaming(result.user_id);
      saveServices(services);

      setPendingUserId(result.user_id);
      setPendingUsername(result.username);
      setExistingServices(services);

      navigate('/home'); // simplify
    } catch (error) {
      console.error(error);
      setLoginError('Google sign-in failed. Please try again.');
    }
  };

const handleFacebookSignIn = async () => {
    setLoginError('');

    try {
      const userCredential = await signInWithFacebook();

      const idToken = await userCredential.user.getIdToken(); // 🔥 FIX

      const result = await socialLogin(idToken, 'facebook');

      if (!result.success) {
        setLoginError(result.message || 'Facebook sign-in failed');
        return;
      }

      const user = {
        user_id: result.user_id,
        username: result.username,
        email: result.email,
      };

      saveUser(user);

      const services = await getUserStreaming(result.user_id);
      saveServices(services);

      setPendingUserId(result.user_id);
      setPendingUsername(result.username);
      setExistingServices(services);

      navigate('/home');
    } catch (error) {
      console.error(error);
      setLoginError('Facebook sign-in failed. Please try again.');
    }
  };

  const handleAppleUnavailable = () => {
    alert('This feature will be implemented in the future');
  };

  const goHome = () => navigate('/home/roulette');

  const scrollingSection = (
    <div className="poster-grid hidden lg:flex lg:w-1/2 flex-col justify-center p-8 relative overflow-hidden">
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
        :root {
          --color-bg1: rgb(26, 15, 10);
          --color-bg2: rgb(10, 10, 10);
          --color1: 255, 69, 0;
          --color2: 220, 38, 38;
          --color3: 255, 87, 34;
          --color4: 251, 191, 36;
          --color5: 180, 30, 30;
          --color-interactive: 255, 87, 34;
          --circle-size: 80%;
          --blending: hard-light;
        }
        .reel-input:focus {
          border-color: #ff5722 !important;
          box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.2) !important;
          outline: none;
        }

        /* ── Part 1: Poster grid grounding ── */
        .poster-card {
          box-shadow: 0 15px 30px rgba(0,0,0,0.8), 0 5px 15px rgba(0,0,0,0.6);
        }
        .poster-grid {
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
          transform: perspective(900px) rotateY(6deg);
          transform-origin: left center;
        }
        .poster-grid::before {
          content: '';
          position: absolute; inset: 0;
          box-shadow: inset 0 0 120px 40px rgba(0,0,0,0.85);
          pointer-events: none;
          z-index: 2;
        }
        .poster-grid::after {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(255,69,0,0.12) 100%);
          pointer-events: none;
          z-index: 1;
        }
        @media (max-width: 768px) {
          .poster-grid { transform: none; }
        }

        /* ── Part 2: Spotlight on logo (Aceternity Spotlight component) ── */
        .login-side {
          position: relative;
          background: transparent;
          overflow: hidden;
        }
        .logo-container {
          position: relative;
          z-index: 2;
        }
        .reelette-logo {
          filter: drop-shadow(0 0 25px rgba(255,193,7,0.5))
                  drop-shadow(0 0 10px rgba(255,140,30,0.4));
        }
        @keyframes moveInCircle {
          0%   { transform: rotate(0deg); }
          50%  { transform: rotate(180deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes moveVertical {
          0%   { transform: translateY(-50%); }
          50%  { transform: translateY(50%); }
          100% { transform: translateY(-50%); }
        }
        @keyframes moveHorizontal {
          0%   { transform: translateX(-50%) translateY(-10%); }
          50%  { transform: translateX(50%) translateY(10%); }
          100% { transform: translateX(-50%) translateY(-10%); }
        }
        .gradient-bg {
          background:
            radial-gradient(ellipse 600px 400px at 25% 45%, rgba(80,20,8,0.55) 0%, transparent 70%),
            radial-gradient(ellipse 500px 350px at 75% 55%, rgba(60,15,5,0.45) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 50% 80%, rgba(90,25,10,0.3) 0%, transparent 70%),
            #060303;
          overflow: hidden;
        }
        .gradient-bg > svg {
          position: fixed; top: 0; left: 0; width: 0; height: 0;
        }
        .gradients-container {
          filter: url(#goo) blur(40px);
          position: absolute; inset: 0;
        }
        .g1 {
          position: absolute;
          background: radial-gradient(circle at center, rgba(var(--color1), 0.8) 0, rgba(var(--color1), 0) 50%) no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size); height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2);
          left: calc(50% - var(--circle-size) / 2);
          transform-origin: center center;
          animation: moveVertical 30s ease infinite;
        }
        .g2 {
          position: absolute;
          background: radial-gradient(circle at center, rgba(var(--color2), 0.8) 0, rgba(var(--color2), 0) 50%) no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size); height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2);
          left: calc(50% - var(--circle-size) / 2);
          transform-origin: calc(50% - 400px);
          animation: moveInCircle 20s reverse infinite;
        }
        .g3 {
          position: absolute;
          background: radial-gradient(circle at center, rgba(var(--color3), 0.8) 0, rgba(var(--color3), 0) 50%) no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size); height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2 + 200px);
          left: calc(50% - var(--circle-size) / 2 - 500px);
          transform-origin: calc(50% + 400px);
          animation: moveInCircle 40s linear infinite;
        }
        .g4 {
          position: absolute;
          background: radial-gradient(circle at center, rgba(var(--color4), 0.8) 0, rgba(var(--color4), 0) 50%) no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size); height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2);
          left: calc(50% - var(--circle-size) / 2);
          transform-origin: calc(50% - 200px);
          animation: moveHorizontal 40s ease infinite;
          opacity: 0.7;
        }
        .g5 {
          position: absolute;
          background: radial-gradient(circle at center, rgba(var(--color5), 0.8) 0, rgba(var(--color5), 0) 50%) no-repeat;
          mix-blend-mode: var(--blending);
          width: calc(var(--circle-size) * 2); height: calc(var(--circle-size) * 2);
          top: calc(50% - var(--circle-size));
          left: calc(50% - var(--circle-size));
          transform-origin: calc(50% - 800px) calc(50% + 200px);
          animation: moveInCircle 20s ease infinite;
        }
        .interactive {
          position: absolute;
          background: radial-gradient(circle at center, rgba(var(--color-interactive), 0.8) 0, rgba(var(--color-interactive), 0) 50%) no-repeat;
          mix-blend-mode: var(--blending);
          width: 100%; height: 100%;
          top: -50%; left: -50%;
          opacity: 0.7;
        }
      `}</style>

      <div className="gradient-bg min-h-screen w-full flex relative">
        <svg xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>
        <div className="gradients-container">
          <div className="g1" />
          <div className="g2" />
          <div className="g3" />
          <div className="g4" />
          <div className="g5" />
          <div ref={interBubbleRef} className="interactive" />
        </div>

        <div className="relative z-10 flex w-full">
          {scrollingSection}

          <div className="login-side w-full lg:w-1/2 flex items-center justify-center p-8">
          <Spotlight
            className="-top-40 left-0 md:-top-20 md:left-60"
            fill="#ff9933"
          />
          <div className="relative z-10 w-full max-w-md flex flex-col items-center">
            <div className="logo-container mb-6">
                <img src={logoImage} alt="Reelette" className="reelette-logo h-56 w-auto scale-[2] origin-top pointer-events-none" />
            </div>
            <p className="text-center mb-10 px-4 text-lg">
              <span className="text-[#fbbf24]">
                The ultimate way to discover, rate, and share movies
              </span>
              <span className="text-[#f5f5f5]/70"> with friends.</span>
            </p>

            {/* ── Login ── */}
            {view === 'login' && (
              <div className="w-full bg-[rgba(15,15,15,0.75)] backdrop-blur-[12px] border border-[rgba(255,87,34,0.2)] rounded-2xl p-8 shadow-2xl">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="reel-input w-full bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-500 rounded-lg h-12"
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
                      className="reel-input w-full bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-500 rounded-lg h-12"
                      required
                    />
                  </div>
                  {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-gradient-to-r from-[#ff5722] to-[#dc2626] hover:from-[#ff6d3a] hover:to-[#ef4444] text-white h-12 rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                  {loginLoading ? 'Signing in...' : 'Login'}
                  </Button>

                  <div className="text-center pt-4 border-t border-[rgba(255,87,34,0.15)] space-y-2">

                    {/* Sign up */}
                    <p className="text-sm text-gray-400">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setView('register')}
                        className="text-yellow-400 hover:text-[#ff5722] transition-colors"
                      >
                        Sign up
                      </button>
                    </p>

                    {/* Login with credentials */}
                    <p className="text-sm text-gray-400 text-center">
                      Login with credentials?{' '}
                      <button
                        type="button"
                        onClick={() => setView('social')}
                        className="text-[#fbbf24] hover:text-[#ff5722] transition-colors"
                      >
                        Click here
                      </button>
                    </p>

                    {/* Forgot password */}
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotError('');
                        setForgotMessage('');
                        setView('forgot-password');
                      }}
                      className="block w-full text-sm text-yellow-400 font-normal hover:text-[#ff5722] transition-colors"
                    >
                      Forgot your password?
                    </button>

                  </div>
                </form>
              </div>
            )}

            {/* ── Register ── */}
            {view === 'register' && (
              <div className="w-full bg-[rgba(15,15,15,0.75)] backdrop-blur-[12px] border border-[rgba(255,87,34,0.2)] rounded-2xl p-8 shadow-2xl">
                <h2 className="text-white text-xl font-semibold mb-6 text-center">Create Account</h2>
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Username</label>
                    <Input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="reel-input w-full bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-500 rounded-lg h-12"
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
                      className="reel-input w-full bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-500 rounded-lg h-12"
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
                      className="reel-input w-full bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-500 rounded-lg h-12"
                      required
                    />
                  </div>
                  {regError && <p className="text-red-400 text-sm text-center">{regError}</p>}
                  <Button
                    type="submit"
                    disabled={regLoading}
                    className="w-full bg-gradient-to-r from-[#ff5722] to-[#dc2626] hover:from-[#ff6d3a] hover:to-[#ef4444] text-white h-12 rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {regLoading ? 'Creating account...' : 'Sign Up'}
                  </Button>

                  <div className="pt-1">
                    <div className="border-t border-gray-800" />
                  </div>

                  {/* --- Social Login Section --- */}
                  <div className="mt-6 flex flex-col items-center gap-4">

                    {/* Login / Sign up with credentials link */}
                    <p className="text-sm text-gray-400 text-center">
                      {view === 'register'
                        ? 'Sign up with credentials? '
                        : 'Login with credentials? '}
                      <button
                        type="button"
                        onClick={() => {
                          setSocialMode('register');
                          setView('social');
                        }}
                        className="text-[#fbbf24] hover:text-[#ff5722] transition-colors"
                      >
                        Click here
                      </button>
                    </p>

                  </div>

                  <div className="text-center pt-1">
                    <p className="text-sm text-gray-400">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setView('login')}
                        className="text-[#fbbf24] hover:text-[#ff5722] transition-colors"
                      >
                        Log in
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            )}

            {/* ── Social Login Page ── */}
            {view === 'social' && (
              <div className="w-full bg-[rgba(15,15,15,0.75)] backdrop-blur-[12px] border border-[rgba(255,87,34,0.2)] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">

                <h2 className="text-white text-xl font-semibold text-center">
                  {socialMode === 'login'
                    ? 'Login with Social Accounts'
                    : 'Sign up with Social Accounts'}
                </h2>

                {/* ONE LINE ICONS */}
                <div className="flex justify-center items-center gap-6">

                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-12 h-12 rounded-full border border-gray-700 bg-gray-900/60 hover:border-red-500 flex items-center justify-center transition-all"
                  >
                    <img
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                      alt="Google"
                      className="w-6 h-6"
                    />
                  </button>

                  {/* Apple */}
                  <button
                    type="button"
                    onClick={handleAppleUnavailable}
                    className="w-12 h-12 rounded-full border border-gray-700 bg-gray-900/60 hover:border-red-500 flex items-center justify-center transition-all"
                  >
                    <Apple size={22} />
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    onClick={handleFacebookSignIn}
                    className="w-12 h-12 rounded-full border border-gray-700 bg-gray-900/60 hover:border-red-500 flex items-center justify-center transition-all"
                  >
                    <img
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg"
                      alt="Facebook"
                      className="w-6 h-6"
                    />
                  </button>

                </div>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setView(socialMode)}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  ← Back
                </button>

              </div>
            )}

            {view === 'forgot-password' && (
              <div className="w-full bg-[rgba(15,15,15,0.75)] backdrop-blur-[12px] border border-[rgba(255,87,34,0.2)] rounded-2xl p-8 shadow-2xl">
                <h2 className="text-white text-xl font-semibold mb-6 text-center">Reset Password</h2>
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Email</label>
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="reel-input w-full bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-500 rounded-lg h-12"
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
                    className="w-full bg-gradient-to-r from-[#ff5722] to-[#dc2626] hover:from-[#ff6d3a] hover:to-[#ef4444] text-white h-12 rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Email'}
                  </Button>

                  <div className="text-center pt-4 border-t border-[rgba(255,87,34,0.15)]">
                    <p className="text-sm text-gray-400">
                      Remember your password?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setForgotError('');
                          setForgotMessage('');
                          setView('login');
                        }}
                        className="text-[#fbbf24] hover:text-[#ff5722] transition-colors"
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
              <div className="w-full bg-[rgba(15,15,15,0.75)] backdrop-blur-[12px] border border-[rgba(255,87,34,0.2)] rounded-2xl p-8 shadow-2xl text-center">
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
                    className="flex-1 bg-gradient-to-r from-[#ff5722] to-[#dc2626] hover:from-[#ff6d3a] hover:to-[#ef4444] text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium"
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
      </div>
    </>
  );
}
