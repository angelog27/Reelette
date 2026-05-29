import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { StreamingSetup } from './StreamingSetup';
import logoImage from '../../assets/Full_Reelette_upscaled.png';
import {
  login,
  register,
  forgotPassword,
  saveUser,
  getUserStreaming,
  saveServices,
  hasServicesConfigured,
} from '../services/api';
import { loginWithOAuth } from '../services/api';
import { signInWithGooglePopup } from '../lib/firebase';

type View = 'login' | 'register' | 'forgot-password' | 'ask-streaming' | 'setup-streaming';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialView?: View;
}

const INPUT_CLASS =
  'w-full bg-[#0d0d0d] border-white/10 text-white placeholder:text-white/30 rounded-xl h-12 focus:border-[#7C5DBD] focus:ring-1 focus:ring-[#7C5DBD]/40 transition-all duration-200';

const LABEL_CLASS = 'text-sm font-medium text-white/50';

const SUBMIT_CLASS =
  'w-full bg-[#7C5DBD] hover:bg-[#8F6FD4] active:scale-[0.98] text-white h-12 rounded-xl font-medium transition-all duration-150 disabled:opacity-40';

const DIVIDER = (
  <div className="flex items-center gap-3 my-4">
    <span className="flex-1 h-px bg-white/10" />
    <span className="text-xs text-white/30 font-medium">or</span>
    <span className="flex-1 h-px bg-white/10" />
  </div>
);

// Google SVG mark
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}


export function AuthModal({ isOpen, onClose, initialView = 'login' }: Props) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>(initialView);

  const [pendingUserId, setPendingUserId] = useState('');
  const [pendingUsername, setPendingUsername] = useState('');
  const [existingServices, setExistingServices] = useState<Record<string, boolean>>({});

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // OAuth
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setLoginError('');
      setRegError('');
      setForgotError('');
      setForgotMessage('');
      setOauthError('');
    }
  }, [isOpen, initialView]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const goQuiz = () => {
    onClose();
    navigate('/quiz');
  };

  const afterLogin = async (userId: string, username: string, userEmail: string) => {
    const services = await getUserStreaming(userId);
    saveServices(services);
    setPendingUserId(userId);
    setPendingUsername(username);
    setExistingServices(services);
    if (hasServicesConfigured(services)) {
      setView('ask-streaming');
    } else {
      setView('setup-streaming');
    }
    void userEmail;
  };

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
      localStorage.setItem('user_id', result.user_id);
      localStorage.setItem('email', result.email);
      localStorage.setItem('username', result.username);
      saveUser({ user_id: result.user_id, username: result.username, email: result.email });
      await afterLogin(result.user_id, result.username, result.email);
    } catch {
      setLoginError('Could not connect to the server. Make sure the backend is running.');
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
      setView('setup-streaming');
    } catch {
      setRegError('Could not connect to the server. Make sure the backend is running.');
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
      setForgotMessage('Reset email sent. Check your inbox (and spam folder).');
    } catch {
      setForgotError('Could not connect to the server.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthError('');
    setOauthLoading(true);
    try {
      const { user: fbUser } = await signInWithGooglePopup();
      const result = await loginWithOAuth('google', {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
      });

      if (!result.success) {
        setOauthError(result.message || 'Google sign-in failed');
        return;
      }

      localStorage.setItem('user_id', result.user_id);
      localStorage.setItem('email', result.email ?? fbUser.email ?? '');
      localStorage.setItem('username', result.username);
      saveUser({ user_id: result.user_id, username: result.username, email: result.email ?? fbUser.email ?? '' });
      await afterLogin(result.user_id, result.username, result.email ?? '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed')) {
        setOauthError('Google sign-in failed. Try again or use email.');
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const OAuthButtons = (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={oauthLoading}
        className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 text-white h-12 rounded-xl font-medium text-sm transition-all duration-150 disabled:opacity-40"
      >
        {oauthLoading ? (
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>
      {oauthError && <p className="text-red-400 text-sm text-center">{oauthError}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl shadow-2xl pointer-events-auto overflow-y-auto max-h-[90dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-150 z-10"
              >
                <X size={16} />
              </button>

              <div className="p-8">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                  <img
                    src={logoImage}
                    alt="Reelette"
                    className="h-16 w-auto object-contain"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(124, 93, 189, 0.5))' }}
                  />
                </div>

                {/* Login view */}
                {view === 'login' && (
                  <div className="space-y-4">
                    <h2 className="text-white text-xl font-semibold text-center mb-6">Sign in</h2>
                    {OAuthButtons}
                    {DIVIDER}
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className={LABEL_CLASS}>Email</label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className={INPUT_CLASS}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={LABEL_CLASS}>Password</label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Your password"
                          className={INPUT_CLASS}
                          required
                        />
                      </div>
                      {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
                      <Button type="submit" disabled={loginLoading} className={SUBMIT_CLASS}>
                        {loginLoading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>
                    <div className="pt-3 border-t border-white/8 space-y-2 text-center">
                      <p className="text-sm text-white/40">
                        No account?{' '}
                        <button
                          type="button"
                          onClick={() => setView('register')}
                          className="text-[#9B8FD0] hover:text-white transition-colors"
                        >
                          Sign up free
                        </button>
                      </p>
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(email); setView('forgot-password'); }}
                        className="text-sm text-white/40 hover:text-white/70 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                )}

                {/* Register view */}
                {view === 'register' && (
                  <div className="space-y-4">
                    <h2 className="text-white text-xl font-semibold text-center mb-6">Create account</h2>
                    {OAuthButtons}
                    {DIVIDER}
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className={LABEL_CLASS}>Username</label>
                        <Input
                          type="text"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="Choose a username"
                          className={INPUT_CLASS}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={LABEL_CLASS}>Email</label>
                        <Input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="your@email.com"
                          className={INPUT_CLASS}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={LABEL_CLASS}>Password</label>
                        <Input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Choose a password"
                          className={INPUT_CLASS}
                          required
                        />
                      </div>
                      {regError && <p className="text-red-400 text-sm text-center">{regError}</p>}
                      <Button type="submit" disabled={regLoading} className={SUBMIT_CLASS}>
                        {regLoading ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </form>
                    <div className="pt-3 border-t border-white/8 text-center">
                      <p className="text-sm text-white/40">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setView('login')}
                          className="text-[#9B8FD0] hover:text-white transition-colors"
                        >
                          Sign in
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {/* Forgot password view */}
                {view === 'forgot-password' && (
                  <div className="space-y-4">
                    <h2 className="text-white text-xl font-semibold text-center mb-2">Reset password</h2>
                    <p className="text-white/40 text-sm text-center mb-6">
                      Enter your email and we'll send you a reset link.
                    </p>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className={LABEL_CLASS}>Email</label>
                        <Input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="your@email.com"
                          className={INPUT_CLASS}
                          required
                        />
                      </div>
                      {forgotError && <p className="text-red-400 text-sm text-center">{forgotError}</p>}
                      {forgotMessage && <p className="text-green-400 text-sm text-center">{forgotMessage}</p>}
                      <Button type="submit" disabled={forgotLoading} className={SUBMIT_CLASS}>
                        {forgotLoading ? 'Sending...' : 'Send Reset Email'}
                      </Button>
                    </form>
                    <div className="pt-3 border-t border-white/8 text-center">
                      <button
                        type="button"
                        onClick={() => { setForgotError(''); setForgotMessage(''); setView('login'); }}
                        className="text-sm text-white/40 hover:text-white/70 transition-colors"
                      >
                        Back to sign in
                      </button>
                    </div>
                  </div>
                )}

                {/* Ask streaming view */}
                {view === 'ask-streaming' && (
                  <div className="text-center space-y-6">
                    <h2 className="text-white text-xl font-semibold">
                      Welcome back, {pendingUsername}.
                    </h2>
                    <p className="text-white/50 text-sm">
                      Want to update your streaming service preferences?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={goQuiz}
                        className="flex-1 bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 text-white px-6 py-3 rounded-xl transition-all duration-150 font-medium text-sm"
                      >
                        No, take me in
                      </button>
                      <button
                        onClick={() => setView('setup-streaming')}
                        className="flex-1 bg-[#7C5DBD] hover:bg-[#8F6FD4] active:scale-[0.98] text-white px-6 py-3 rounded-xl transition-all duration-150 font-medium text-sm"
                      >
                        Yes, update
                      </button>
                    </div>
                  </div>
                )}

                {/* Streaming setup view */}
                {view === 'setup-streaming' && (
                  <StreamingSetup
                    userId={pendingUserId}
                    initialServices={existingServices}
                    onDone={goQuiz}
                    onSkip={goQuiz}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
