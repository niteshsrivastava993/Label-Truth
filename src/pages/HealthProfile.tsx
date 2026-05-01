import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X, Plus, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { profileService } from '../services/api';

const MOCK_SUGGESTIONS = [
  'Diabetes Type 1',
  'Diabetes Type 2',
  'Celiac Disease',
  'Lactose Intolerance',
  'Peanut Allergy',
  'Shellfish Allergy',
  'Hypertension',
  'Keto Diet',
  'Vegan',
  'Gluten Free',
  'Low Sodium',
  'Nut Allergy',
];

export default function HealthProfile() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        setConditions(profile.healthConditions || []);
        setAllergies(profile.allergies || []);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (search.length > 1) {
      const allActive = [...conditions, ...allergies];
      const filtered = MOCK_SUGGESTIONS.filter(s => 
        s.toLowerCase().includes(search.toLowerCase()) && !allActive.includes(s)
      );
      setSuggestions(filtered);
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [search, conditions, allergies]);

  const addTag = async (tag: string) => {
    let newConditions = [...conditions];
    let newAllergies = [...allergies];

    // Simple heuristic for categorization
    if (tag.toLowerCase().includes('allergy') || tag.toLowerCase().includes('intolerance')) {
      if (!allergies.includes(tag)) {
        newAllergies = [...allergies, tag];
        setAllergies(newAllergies);
      }
    } else {
      if (!conditions.includes(tag)) {
        newConditions = [...conditions, tag];
        setConditions(newConditions);
      }
    }
    
    await profileService.updateProfile(newConditions, newAllergies);
    setSearch('');
    setShowDropdown(false);
  };

  const removeCondition = async (tagToRemove: string) => {
    const newConditions = conditions.filter(t => t !== tagToRemove);
    setConditions(newConditions);
    await profileService.updateProfile(newConditions, allergies);
  };

  const removeAllergy = async (tagToRemove: string) => {
    const newAllergies = allergies.filter(t => t !== tagToRemove);
    setAllergies(newAllergies);
    await profileService.updateProfile(conditions, newAllergies);
  };

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
        <h2 className="font-bold text-lg">Health Profile</h2>
      </header>

      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Sparkles size={18} />
            </div>
            Clinical Nutritionist AI
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your medical profile is encrypted and used solely for analyzing food labels. Added conditions and allergies will be evaluated against product ingredients.
          </p>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search condition or allergy..."
              className="input-field w-full"
              style={{ paddingLeft: '56px' }}
            />
          </div>

          <AnimatePresence>
            {showDropdown && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-30 left-0 right-0 mt-2 border border-gray-800 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => addTag(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800 text-white transition-colors flex items-center justify-between group"
                  >
                    <span>{suggestion}</span>
                    <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Medical Conditions</h4>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {conditions.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm font-medium"
                  >
                    {tag}
                    <button 
                      onClick={() => removeCondition(tag)}
                      className="hover:bg-blue-500/20 rounded-full p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {conditions.length === 0 && (
                <p className="text-gray-600 text-xs italic pl-1">No conditions added.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Allergies</h4>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {allergies.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm font-medium"
                  >
                    {tag}
                    <button 
                      onClick={() => removeAllergy(tag)}
                      className="hover:bg-amber-500/20 rounded-full p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {allergies.length === 0 && (
                <p className="text-gray-600 text-xs italic pl-1">No allergies added.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
