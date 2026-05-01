import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

const FAQS = [
  { q: 'How does Label Truth work?', a: 'We use advanced AI to scan ingredient lists and cross-reference them with your personalized health profile.' },
  { q: 'Is my data private?', a: 'Yes, your health profile and scan history are stored securely and never shared with third parties.' },
  { q: 'Can I use it offline?', a: 'Currently, an internet connection is required to process label analysis using our AI engine.' },
  { q: 'What if a label is blurry?', a: 'For best results, ensure the ingredient list is well-lit and in focus. You can also import high-quality photos from your gallery.' },
];

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-gray-900">
        <button onClick={() => navigate('/account')} className="p-2 hover:bg-gray-900 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-lg">Help & FAQ</h2>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="p-5 bg-gray-900 border border-gray-800 rounded-full text-blue-500 shadow-lg shadow-blue-500/10">
            <HelpCircle size={48} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">How can we help?</h1>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900 border border-gray-800 p-6 space-y-3 rounded-2xl shadow-lg"
            >
              <h3 className="font-bold text-white text-base">{faq.q}</h3>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">{faq.a}</p>
            </motion.div>
          ))}
        </div>

        <a 
          href="mailto:support@labeltruth.com"
          className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] mt-8 group"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
