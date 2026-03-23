import { useState, useEffect } from 'react';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKioskStore } from '../stores/kioskStore';
import { aiService, AISuggestion } from '../services/aiService';

export function AISuggestions() {
  const { cart, products, addToCart } = useKioskStore();
  const [suggestions, setSuggestions] = useState<(AISuggestion & { name: string; price: number; image?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (cart.length === 0) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      const cartItemNames = cart.map(item => item.product.name);
      const availableProducts = products.filter(p => !cart.some(item => item.product.id === p.id));
      
      const aiResults = await aiService.getSuggestions(cartItemNames, availableProducts);
      
      const detailedSuggestions = aiResults
        .map(s => {
          const product = products.find(p => p.id === s.productId);
          if (!product) return null;
          return { 
            productId: s.productId,
            reason: s.reason,
            name: product.name, 
            price: product.price, 
            image: product.image 
          };
        })
        .filter(s => s !== null) as (AISuggestion & { name: string; price: number; image?: string })[];

      setSuggestions(detailedSuggestions);
      setLoading(false);
    };

    const timeoutId = setTimeout(fetchSuggestions, 1000); // Debounce
    return () => clearTimeout(timeoutId);
  }, [cart, products]);

  if (loading && suggestions.length === 0) {
    return (
      <div className="py-6 flex flex-col items-center gap-2 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-gray-500 italic">IA pensando en sugerencias...</p>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center gap-2 px-2">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="font-bold text-xl text-blue-900">Sugerencias para ti</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence>
          {suggestions.map((s) => (
            <motion.div
              key={s.productId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl p-4 shadow-sm border border-blue-50 flex flex-col justify-between gap-3 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full flex items-center justify-end pr-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>

              <div>
                <div className="w-16 h-16 bg-gray-50 rounded-xl mb-3 flex items-center justify-center p-2">
                  {s.image ? (
                    <img src={s.image} alt={s.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{s.name}</h4>
                <p className="text-blue-600 text-[10px] font-medium mt-1 leading-tight">{s.reason}</p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <span className="font-black text-gray-900 text-lg">${s.price}</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const product = products.find(p => p.id === s.productId);
                    if (product) addToCart(product);
                  }}
                  className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md shadow-blue-100"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
