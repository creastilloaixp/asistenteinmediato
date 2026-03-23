import { useState, useEffect } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKioskStore } from '../stores/kioskStore';
import { liveService } from '../services/geminiLiveService';
import { toast } from 'sonner';

export function ElisaAssistant() {
  const { products, addToCart, removeFromCart, setScreen } = useKioskStore();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Inicializar WebSocket y Live API
  useEffect(() => {
    liveService.onStateChange = (state) => {
      setIsListening(state === 'listening');
      setIsSpeaking(state === 'speaking');
      if (state === 'idle') {
         setIsListening(false);
         setIsSpeaking(false);
      }
    };

    liveService.onTranscript = (text) => {
      setTranscript(text);
    };

    liveService.onError = (msg) => {
      toast.error(msg);
      setLoading(false);
      setIsListening(false);
    };

    liveService.onAction = (action, productId) => {
      if (action === 'checkout') {
        setScreen('cart');
        setTranscript('¡Claro! Vamos a pagar.');
        toast.info("Redirigiendo al pago...");
        return;
      }

      const product = products.find(p => p.id === productId);
      if (product) {
        if (action === 'add') {
          addToCart(product);
          toast.success(`Añadido: ${product.name}`);
        } else if (action === 'remove') {
          removeFromCart(productId);
          toast.info(`Eliminado: ${product.name}`);
        }
      }
    };

    return () => {
      liveService.stop();
    };
  }, [products, addToCart, removeFromCart, setScreen]);

  const startListening = () => {
    setLoading(true);
    setTranscript('Conectando con Elisa...');
    liveService.start(products).then(() => {
       setLoading(false);
       setTranscript('');
    });
  };

  const stopListening = () => {
    setLoading(false);
    liveService.stop();
    setTranscript('Conexión cerrada.');
  };

  return (
    <>
      {/* Botón Flotante de Elisa */}
      <motion.button
        className="fixed bottom-24 right-8 w-20 h-20 rounded-full bg-white shadow-2xl border-4 border-blue-500 z-50 overflow-hidden flex items-center justify-center group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsVisible(!isVisible)}
      >
        <img 
          src="/assets/elisa.png" 
          alt="Elisa" 
          className={`w-full h-full object-cover transition-all duration-500 ${isSpeaking ? 'scale-110 brightness-110' : ''}`} 
        />
        <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-transparent transition-colors" />
        
        {/* Indicador de escucha (Pulso) */}
        {isListening && (
          <motion.div 
            className="absolute inset-0 border-4 border-blue-400 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.button>

      {/* Panel de Interacción */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-48 right-8 w-80 bg-white rounded-[2.5rem] shadow-2xl border border-blue-100 z-50 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white relative">
              <button 
                onClick={() => setIsVisible(false)}
                className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden bg-white">
                  <img src="/assets/elisa.png" alt="Elisa" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight text-white">Elisa</h3>
                  <p className="text-[10px] text-blue-200">Tu asistente inmediato</p>
                </div>
              </div>
              <p className="text-sm text-blue-50/80 font-medium">"¿En qué puedo ayudarte hoy?"</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Transcript */}
              <div className="min-h-[60px] flex flex-col justify-center">
                {transcript ? (
                  <p className="text-gray-700 text-sm italic">"{transcript}"</p>
                ) : (
                  <p className="text-gray-400 text-xs text-center">Toca el micro y cuéntame qué productos buscas...</p>
                )}
                
                {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 self-center mt-2" />}
              </div>

              {/* Controles */}
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={isListening ? stopListening : startListening}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white'
                  }`}
                >
                  {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                </motion.button>
              </div>

              <div className="text-[10px] text-center text-gray-400">
                Puedes decir: "Añade un Gansito" o "¿Dónde están los lácteos?"
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className={className}
    >
      <div className="w-full h-full border-2 border-t-transparent border-blue-500 rounded-full" />
    </motion.div>
  );
}
