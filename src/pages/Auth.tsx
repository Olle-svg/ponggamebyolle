import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores');

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (isSignUp) {
        usernameSchema.parse(username);
      }
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, username);
      if (error) {
        if (error.message?.includes('already registered')) {
          setError('This email is already registered. Try logging in instead.');
        } else if (error.message?.includes('duplicate key') || error.message?.includes('username')) {
          setError('This username is already taken. Please choose another.');
        } else {
          setError(error.message || 'Failed to sign up');
        }
        setLoading(false);
        return;
      }
      setSuccess(true);
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message?.includes('Invalid login')) {
          setError('Invalid email or password');
        } else {
          setError(error.message || 'Failed to sign in');
        }
        setLoading(false);
        return;
      }
      navigate('/');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-2xl bg-card/50 backdrop-blur-sm neon-border text-center max-w-md"
        >
          <h2 className="text-2xl font-pixel text-primary mb-4">Check Your Email!</h2>
          <p className="text-muted-foreground font-orbitron mb-6">
            We've sent a confirmation link to <span className="text-primary">{email}</span>.
            Please verify your email to complete registration.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-lg bg-primary/20 hover:bg-primary/30 
                       transition-all font-orbitron text-primary"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted
                     transition-all font-orbitron text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Game
        </button>

        <motion.div
          className="p-8 rounded-2xl bg-card/50 backdrop-blur-sm neon-border"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h1 className="text-3xl font-pixel text-primary text-glow-cyan text-center mb-2">
            {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
          </h1>
          <p className="text-sm text-muted-foreground font-orbitron text-center mb-8">
            {isSignUp ? 'Join the neon arena' : 'Sign in to continue'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-orbitron text-muted-foreground">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="neon_player"
                    className="w-full pl-11 pr-4 py-3 bg-background/50 rounded-lg neon-border
                               text-foreground font-orbitron placeholder:text-muted-foreground/50
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-orbitron text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@neonpong.com"
                  className="w-full pl-11 pr-4 py-3 bg-background/50 rounded-lg neon-border
                             text-foreground font-orbitron placeholder:text-muted-foreground/50
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-orbitron text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-background/50 rounded-lg neon-border
                             text-foreground font-orbitron placeholder:text-muted-foreground/50
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/20 border border-destructive/50"
              >
                <p className="text-sm text-destructive font-orbitron">{error}</p>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary hover:bg-primary/80 transition-all
                         font-orbitron text-primary-foreground font-bold flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isSignUp ? 'Creating...' : 'Signing in...'}
                </>
              ) : (
                isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground font-orbitron">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-accent hover:underline"
                disabled={loading}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
