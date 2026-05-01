import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { authService } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    const token = localStorage.getItem('token');
    if (user && token) {
      setIsLoggedIn(true);
    }
  }, []);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      );
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(forgotEmail)) {
      toast.error('Enter a valid email');
      return;
    }
    setIsSubmittingForgot(true);
    // Mocking API call for forgot password
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmittingForgot(false);
    setShowForgotModal(false);
    setForgotEmail('');
    toast.success('Check your email for the reset link!', {
      icon: '📧',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setIsLoading(true);
    
    try {
      const response = await authService.login({ email, password });
      toast.success(`Welcome back, ${response.email.split('@')[0]}!`);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-gray-900">
        <button onClick={() => navigate('/account')} className="p-2 hover:bg-gray-900 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-lg">Login</h2>
      </header>

      <div className="p-6 flex-1 flex flex-col justify-center">
        {isLoggedIn ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-500">
                <CheckCircle2 size={64} />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">Already Logged In</h1>
              <p className="text-gray-400">You are currently signed in to your account.</p>
            </div>
            <button 
              onClick={() => navigate('/account')}
              className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center gap-2"
            >
              Go to Account
            </button>
          </motion.div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-gray-400">Sign in to access your health profile.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => !validateEmail(email) && email && setError('Please enter a valid email address')}
                    placeholder="name@example.com"
                    className={`input-field w-full ${error ? 'border-red-500/50 focus:ring-red-500/20' : ''}`}
                    style={{ paddingLeft: '56px' }}
                  />
                </div>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1.5 ml-1"
                  >
                    <AlertCircle size={12} />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-medium text-gray-400">Password</label>
                  <button 
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-blue-500 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field w-full"
                    style={{ paddingLeft: '56px' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-gray-500 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-500 font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </>
        )}
      </div>

      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Mail size={80} className="text-blue-500" />
              </div>

              <div className="relative space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Reset Password</h3>
                  <p className="text-gray-400 text-sm">Enter your email and we'll send you a recovery link.</p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                      <input
                        type="text"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="input-field w-full"
                        style={{ paddingLeft: '56px' }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowForgotModal(false)}
                      className="btn-secondary flex-1 py-2"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmittingForgot}
                      className="btn-primary flex-1 py-2 flex items-center justify-center gap-2"
                    >
                      {isSubmittingForgot ? <Loader2 className="animate-spin" size={18} /> : 'Send Link'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
