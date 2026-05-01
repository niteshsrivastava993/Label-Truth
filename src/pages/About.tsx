import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-gray-900">
        <button onClick={() => navigate('/account')} className="p-2 hover:bg-gray-900 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-lg">About</h2>
      </header>

      <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-8 p-6 bg-gray-900 border border-gray-800 rounded-full text-blue-500 shadow-lg shadow-blue-500/10">
          <Shield size={64} strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Label Truth</h1>
        <p className="text-blue-500 font-mono text-sm mb-12 uppercase tracking-widest">v1.0.0-pro</p>
        
        <div className="bg-gray-900 border border-gray-800 p-8 w-full max-w-sm space-y-6 rounded-[24px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <p className="text-gray-300 text-sm leading-relaxed text-justify">
            Label Truth was envisioned and developed by <span className="text-white font-semibold">Nitesh Srivastava</span> with a strong mission to promote health awareness and transparency. The core motivation behind this platform is to empower everyday consumers to decode complex food labels, avoid hidden harmful ingredients, and make informed, healthier dietary choices.
          </p>
          <div className="h-px bg-gray-800 w-full" />
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
            © 2024 Label Truth. Crafted for transparency.
          </p>
        </div>

        <div className="mt-12 max-w-sm">
          <h3 className="text-xs font-bold text-red-500/80 uppercase tracking-widest mb-3">Medical Disclaimer</h3>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Label Truth provides information based on AI-powered OCR and public health guidelines. This is NOT medical advice. Our analysis may contain errors due to image quality or AI limitations. Always consult a healthcare professional. We do not guarantee 100% accuracy for life-threatening allergies.
          </p>
        </div>
      </div>
    </div>
  );
}
