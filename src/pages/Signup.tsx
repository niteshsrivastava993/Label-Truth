import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { authService } from '../services/api';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 8;
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    return minLength && hasNumber && hasSpecial;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid professional email');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be 8+ chars with a number and special char');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await authService.register({ name, email, password });
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
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
        <h2 className="font-bold text-lg">Create Account</h2>
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
              <h1 className="text-3xl font-bold text-white mb-2">Join Label Truth</h1>
              <p className="text-gray-400">Start your journey to healthier living.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="input-field w-full"
                    style={{ paddingLeft: '56px' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => !validateEmail(email) && email && setError('Please enter a valid professional email')}
                    placeholder="name@example.com"
                    className={`input-field w-full ${error && email && !validateEmail(email) ? 'border-red-500/50 focus:ring-red-500/20' : ''}`}
                    style={{ paddingLeft: '56px' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Password</label>
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

              <button 
                type="submit" 
                disabled={isLoading}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-500 font-semibold hover:underline">
                Log In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
