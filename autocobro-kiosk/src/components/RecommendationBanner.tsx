import { useState, useEffect } from 'react';
import { Sparkles, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKioskStore } from '../stores/kioskStore';
import { toast } from 'sonner';

interface Recommendation {
  productId: string;
  productName: string;
  price: number;
  reason: string;
  type: 'upsell' | 'cross-sell' | 'complement';
}

export function RecommendationBanner({ visible = true, onClose }: { visible?: boolean; onClose?: () => void }) {
  const { cart, products, addToCart, deviceKey } = useKioskStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchRecommendations = async () => {
    if (cart.length === 0 || dismissed) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    try {
      const cartProducts = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        category: item.product.category
      }));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/kiosks/recommendations`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Device-Key': deviceKey || ''
          },
          body: JSON.stringify({ cartProducts })
        }
      );

      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const cartIds = new Set(cart.map(c => c.product.id));
        const filtered = data.data.filter((r: Recommendation) => !cartIds.has(r.productId));
        setRecommendations(filtered);
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchRecommendations();
    }, 800);
    return () => clearTimeout(debounce);
  }, [cart]);

  const handleAddRecommendation = (rec: Recommendation) => {
    const product = products.find(p => p.id === rec.productId);
    if (product) {
      addToCart(product);
      toast.success('¡Excelente elección!', {
        description: `Agregaste ${product.name}`,
        icon: '✨'
      });
      setRecommendations(prev => prev.filter(r => r.productId !== rec.productId));
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setRecommendations([]);
    onClose?.();
  };

  if (!visible || dismissed) {
    return null;
  }

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(price));
  }

  return (
    <AnimatePresence>
      {loading ? (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mx-6 mt-4 mb-2 flex items-center gap-3 bg-amber-50 rounded-[2rem] p-4 border border-amber-100"
        >
          <div className="w-8 h-8 rounded-full bg-amber-200 animate-pulse flex items-center justify-center">
            <Sparkles size={16} className="text-amber-600 animate-spin" />
          </div>
          <span className="text-amber-800 font-bold">La IA está analizando tu carrito...</span>
        </motion.div>
      ) : recommendations.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0, height: 0, y: -20 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, scale: 0.95 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          className="mx-6 mt-4 mb-2 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-100 to-yellow-50 border-2 border-amber-200 rounded-[2rem] p-6 shadow-lg shadow-amber-500/10 relative">
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 bg-white/50 hover:bg-white rounded-full flex items-center justify-center text-amber-700 transition-colors"
            >
              <X size={18} strokeWidth={3} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-md">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <h3 className="font-black text-amber-900 text-xl tracking-tight">Sugerencias Inteligentes</h3>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pt-2 snap-x">
              {recommendations.slice(0, 3).map((rec, i) => (
                <motion.div 
                  key={rec.productId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + (i * 0.1) }}
                  className="flex-shrink-0 w-[280px] bg-white rounded-3xl p-5 shadow-sm border border-amber-100 snap-center flex flex-col justify-between h-[180px]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 text-lg leading-tight pr-2 line-clamp-1">{rec.productName}</h4>
                      <span className="font-black text-amber-600 text-lg">{formatPrice(rec.price)}</span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium leading-snug mb-4 line-clamp-2">
                      "{rec.reason}"
                    </p>
                  </div>
                  
                  <motion.button 
                    onClick={() => handleAddRecommendation(rec)}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors mt-auto"
                  >
                    <Plus size={20} />
                    Agregar
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
