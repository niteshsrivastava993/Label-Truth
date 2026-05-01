import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { scanService } from '../services/api';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await scanService.getHistory();
        setHistory(data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-gray-900">
        <button onClick={() => navigate('/account')} className="p-2 hover:bg-gray-900 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-lg">Scan History</h2>
      </header>

      <div className="p-6 space-y-4 pb-24">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="p-4 rounded-full bg-gray-900 text-gray-600">
              <Clock size={48} />
            </div>
            <div>
              <h3 className="text-white font-semibold">No scans yet</h3>
              <p className="text-gray-500 text-sm">Your recent label scans will appear here.</p>
            </div>
          </div>
        ) : (
          history.map((item, index) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-800 transition-all cursor-pointer group"
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                ['Safe', 'SAFE'].includes(item.verdict) ? 'bg-green-500/10 text-green-500' :
                ['Caution', 'MODERATE'].includes(item.verdict) ? 'bg-amber-500/10 text-amber-500' :
                'bg-red-500/10 text-red-500'
              }`}>
                {['Safe', 'SAFE'].includes(item.verdict) ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-white font-semibold truncate">{item.productName}</h3>
                  {item.healthScore && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                      item.healthScore >= 7 ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                      item.healthScore >= 4 ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' :
                      'border-red-500/30 text-red-500 bg-red-500/5'
                    }`}>
                      {item.healthScore}/10
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                  <Clock size={12} />
                  {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <ChevronRight size={20} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
