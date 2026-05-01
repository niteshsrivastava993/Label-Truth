import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

// Pages
import Scan from './pages/Scan';
import Account from './pages/Account';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HealthProfile from './pages/HealthProfile';
import History from './pages/History';
import Help from './pages/Help';
import About from './pages/About';

// Components
import BottomNav from './components/BottomNav';

function AnimatedRoutes() {
  const location = useLocation();
  const showNav = ['/', '/account'].includes(location.pathname);

  return (
    <div className="mobile-container">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div 
          key={location.pathname}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <Routes location={location}>
            <Route path="/" element={<PageWrapper><Scan /></PageWrapper>} />
            <Route path="/account" element={<PageWrapper><Account /></PageWrapper>} />
            <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
            <Route path="/signup" element={<PageWrapper><Signup /></PageWrapper>} />
            <Route path="/health-profile" element={<PageWrapper><HealthProfile /></PageWrapper>} />
            <Route path="/history" element={<PageWrapper><History /></PageWrapper>} />
            <Route path="/help" element={<PageWrapper><Help /></PageWrapper>} />
            <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {showNav && <BottomNav />}
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col overflow-y-auto"
    >
      {children}
    </motion.div>
  );
}

import { Toaster } from 'react-hot-toast';
import { authService } from './services/api';

export default function App() {
  return (
    <Router>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#111827',
            color: '#fff',
            border: '1px solid #1f2937',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
      <AnimatedRoutes />
    </Router>
  );
}
