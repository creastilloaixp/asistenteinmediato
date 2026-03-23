import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKioskStore } from '../stores/kioskStore';
import { aiService } from '../services/aiService';
import { toast } from 'sonner';

export function ElisaAssistant() {
  const { products, addToCart, removeFromCart, setScreen } = useKioskStore();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  // Inicializar Reconocimiento de Voz
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'es-MX';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleVoiceCommand(text);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('No pude escucharte bien. Intenta de nuevo.');
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setResponse('');
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      toast.error('Tu navegador no soporta reconocimiento de voz.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 1;
    utterance.pitch = 1.1; // Un poco más aguda para que suene amigable

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceCommand = async (text: string) => {
    setLoading(true);
    const result = await aiService.parseVoiceCommand(text, products);
    setLoading(false);
    
    setResponse(result.response);
    speak(result.response);

    if (result.action === 'add' && result.productId) {
      const product = products.find(p => p.id === result.productId);
      if (product) {
        addToCart(product);
        toast.success(`Añadido: ${product.name}`);
      }
    } else if (result.action === 'remove' && result.productId) {
      removeFromCart(result.productId);
      toast.info('Producto eliminado del carrito');
    } else if (result.action === 'question') {
      // Solo responde con la IA
    }
  };

  const [loading, setLoading] = useState(false);

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
                
                {response && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="mt-3 text-blue-700 font-bold text-sm bg-blue-50 p-3 rounded-2xl border border-blue-100"
                  >
                    {response}
                  </motion.p>
                )}
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
