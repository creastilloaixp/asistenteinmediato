import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete, Loader2, UserPlus, Gift } from 'lucide-react';
import { useKioskStore } from '../stores/kioskStore';
import { toast } from 'sonner';

export function CustomerLoyaltyModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { deviceKey, setCustomer } = useKioskStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'register' | 'success'>('phone');
  const [name, setName] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any>(null);

  const handleNumber = (num: string) => {
    if (phone.length < 10) setPhone(prev => prev + num);
  };

  const handleDelete = () => {
    setPhone(prev => prev.slice(0, -1));
  };

  const handleSearch = async () => {
    if (phone.length !== 10) {
      toast.error('Ingresa un número de 10 dígitos', { icon: '📱' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/kiosks/customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': deviceKey
        },
        body: JSON.stringify({ phone })
      });
      
      const json = await res.json();
      
      if (json.success && json.data) {
        setFoundCustomer(json.data);
        setCustomer(json.data);
        setStep('success');
      } else {
        setStep('register');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error conectando con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (name.trim().length < 3) {
      toast.error('Ingresa tu nombre completo');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/kiosks/customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': deviceKey
        },
        body: JSON.stringify({ phone, name })
      });
      
      const json = await res.json();
      if (json.success && json.data) {
        setFoundCustomer(json.data);
        setCustomer(json.data);
        setStep('success');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error registrando usuario');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end md:justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <X size={24} />
        </button>

        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.div key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-amber-100 rounded-[2rem] flex items-center justify-center text-amber-500 shadow-inner">
                  <Gift size={40} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-center text-slate-800 mb-2">Acumula Puntos</h2>
              <p className="text-slate-500 text-center mb-8 font-medium">Ingresa tu celular para ganar recompensas</p>

              <div className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-6 mb-8 text-center text-4xl font-black tracking-widest text-slate-700 min-h-[90px] flex items-center justify-center shadow-inner">
                {phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') || '000-000-0000'}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumber(num.toString())}
                    className="aspect-square bg-white border border-slate-200 rounded-[2rem] text-3xl font-bold text-slate-700 shadow-sm active:scale-90 active:bg-slate-100 transition-all"
                  >
                    {num}
                  </button>
                ))}
                <div className="aspect-square"></div>
                <button
                  onClick={() => handleNumber('0')}
                  className="aspect-square bg-white border border-slate-200 rounded-[2rem] text-3xl font-bold text-slate-700 shadow-sm active:scale-90 active:bg-slate-100 transition-all"
                >
                  0
                </button>
                <button
                  onClick={handleDelete}
                  className="aspect-square bg-slate-100 rounded-[2rem] text-xl font-bold text-slate-600 shadow-sm active:scale-90 active:bg-slate-200 transition-all flex items-center justify-center"
                >
                  <Delete size={32} />
                </button>
              </div>

              <button
                onClick={handleSearch}
                disabled={phone.length !== 10 || loading}
                className="w-full bg-emerald-500 text-white py-6 rounded-[2rem] text-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-slate-300 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={32} /> : 'Continuar'}
              </button>
            </motion.div>
          )}

          {step === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
               <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-[2rem] flex items-center justify-center text-blue-500 shadow-inner">
                  <UserPlus size={40} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-center text-slate-800 mb-2">¡Eres nuevo!</h2>
              <p className="text-slate-500 text-center mb-8 font-medium">¿Cómo te llamas para registrar tus puntos?</p>

              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-6 mb-10 text-center text-3xl font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-inner"
                autoFocus
              />

              <button
                onClick={handleRegister}
                disabled={name.length < 3 || loading}
                className="w-full bg-blue-600 text-white py-6 rounded-[2rem] text-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-slate-300 shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={32} /> : 'Registrar y Continuar'}
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10">
              <div className="flex justify-center mb-8">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }} 
                  animate={{ scale: 1, rotate: 0 }} 
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-32 h-32 bg-emerald-100 rounded-[3rem] flex items-center justify-center text-emerald-500 border-[8px] border-emerald-50 shadow-inner"
                >
                  <Gift size={64} />
                </motion.div>
              </div>
              <h2 className="text-4xl font-black text-center text-slate-800 mb-4 tracking-tight">¡Hola, {foundCustomer?.name.split(' ')[0]}!</h2>
              <div className="bg-amber-50 rounded-[2rem] p-6 text-center border border-amber-100 mb-10">
                <p className="text-amber-800 font-medium mb-1">Actualmente tienes</p>
                <p className="text-5xl font-black text-amber-600">{foundCustomer?.loyaltyPoints} pts</p>
              </div>
              
              <button
                onClick={onClose}
                className="w-full bg-slate-900 text-white py-6 rounded-[2rem] text-2xl font-bold flex items-center justify-center shadow-xl active:scale-95 transition-all"
              >
                Pagar la compra
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}