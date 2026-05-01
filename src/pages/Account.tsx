import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, History, ShieldCheck, HelpCircle, Info, LogIn, UserPlus, ChevronRight, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { authService } from '../services/api';

export default function Account() {
  const navigate = useNavigate();
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LogIn, label: 'Login', path: '/login', bgColor: 'bg-blue-500/10', iconColor: 'text-blue-500', hide: !!user },
    { icon: UserPlus, label: 'Signup', path: '/signup', bgColor: 'bg-indigo-500/10', iconColor: 'text-indigo-500', hide: !!user },
    { icon: History, label: 'Scan History', path: '/history', bgColor: 'bg-purple-500/10', iconColor: 'text-purple-500' },
    { icon: ShieldCheck, label: 'Health Profile', path: '/health-profile', bgColor: 'bg-teal-500/10', iconColor: 'text-teal-500' },
    { icon: HelpCircle, label: 'Help & FAQ', path: '/help', bgColor: 'bg-amber-500/10', iconColor: 'text-amber-500' },
    { icon: Info, label: 'About Label Truth', path: '/about', bgColor: 'bg-rose-500/10', iconColor: 'text-rose-500' },
  ];

  return (
    <div className="flex-1 p-6 flex flex-col bg-gray-950">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Account</h1>
        <p className="text-gray-400 text-sm">
          {user ? `Logged in as ${user.email}` : 'Manage your preferences and history.'}
        </p>
      </header>

      <div className="space-y-3">
        {menuItems.filter(item => !item.hide).map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={item.path}
              className="bg-gray-900 border border-gray-800 p-4 flex items-center justify-between hover:bg-gray-800 transition-colors group rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${item.bgColor} ${item.iconColor}`}>
                  <item.icon size={22} />
                </div>
                <span className="font-medium text-gray-200">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
            </Link>
          </motion.div>
        ))}

        {user && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleLogout}
            className="w-full bg-gray-900 border border-gray-800 p-4 flex items-center justify-between hover:bg-red-500/10 hover:border-red-500/20 transition-all group rounded-2xl shadow-lg mt-4"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
                <LogOut size={22} />
              </div>
              <span className="font-medium text-red-500">Logout</span>
            </div>
            <ChevronRight size={18} className="text-gray-600 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
          </motion.button>
        )}
      </div>

      {!user && (
        <div className="mt-auto pt-8 text-center">
          <p className="text-xs text-gray-600">Logged in as guest</p>
        </div>
      )}
    </div>
  );
}
