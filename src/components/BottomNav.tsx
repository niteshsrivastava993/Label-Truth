import React from 'react';
import { NavLink } from 'react-router-dom';
import { Scan as ScanIcon, User } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-gray-950/80 backdrop-blur-xl border-t border-gray-800 flex items-center justify-around px-6 pb-1 z-50">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-500' : 'text-gray-500 hover:text-gray-400'}`}
      >
        <ScanIcon size={22} className="transition-transform active:scale-90" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Scan</span>
      </NavLink>
      <NavLink 
        to="/account" 
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-500' : 'text-gray-500 hover:text-gray-400'}`}
      >
        <User size={22} className="transition-transform active:scale-90" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Account</span>
      </NavLink>
    </nav>
  );
}
