import { ScanLine, Search, ShoppingCart, HelpCircle, CreditCard, CupSoda, Cookie, Package, Coffee } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKioskStore } from '../stores/kioskStore'

export function HomeScreen() {
  const { setScreen, cart, products } = useKioskStore()
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Obtener las 4 categorías con más productos dinámicamente
  const topCategories = Array.from(
    products.reduce((acc, p) => {
      if (p.category) {
        acc.set(p.category, (acc.get(p.category) || 0) + 1);
      }
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(entry => entry[0]);

  const categoryIcons = [CupSoda, Cookie, Package, Coffee]; // Iconos de fallback

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full overflow-hidden bg-gray-50 font-sans"
    >
      {/* ================= FONDOS (CAPA BASE) ================= */}
      {/* Fondo Azul Oscuro Superior (Cálido y tecnológico) */}
      <div className="absolute top-0 left-0 w-full h-[62%] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-b-[4rem] shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-0">
        {/* Subtle tech glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      </div>
      {/* Fondo Inferior Blanco/Grisáceo (Ya es el fondo del padre) */}


      {/* ================= CONTENIDO (CAPA SUPERIOR) ================= */}
      <div className="relative z-10 w-full h-full flex flex-col pt-14 pb-8 px-8">
        
        {/* 1. Header / Logo */}
        <div className="flex flex-col items-center justify-center mb-10 mt-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-white font-black text-[2.5rem] leading-[0.9] tracking-tight">TIENDA</span>
              <span className="text-white font-black text-[2.5rem] leading-[0.9] tracking-tight">EXPRESS</span>
            </div>
            <div className="w-14 h-14 border-[7px] border-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"></div>
          </div>
        </div>

        {/* 2. Textos de Bienvenida */}
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="text-[3.5rem] font-black text-emerald-400 mb-2 tracking-tight drop-shadow-md"
          >
            ¡BIENVENIDO!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl text-slate-200 font-medium tracking-wide"
          >
            Toca para empezar a comprar
          </motion.p>
        </div>

        {/* 3. Tarjetas Principales (Blancas, sobrelapando el borde) */}
        {/* Usamos un margen inferior negativo o flex-grow para posicionar correctamente */}
        <div className="grid grid-cols-2 gap-6 w-full mb-8">
          <motion.button 
            onClick={() => setScreen('search')}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border-2 border-transparent hover:border-emerald-100 transition-all group aspect-[4/3]"
          >
            <div className="bg-slate-50 p-6 rounded-3xl group-hover:bg-emerald-50 transition-colors">
              <ScanLine size={64} className="text-slate-800 group-hover:text-emerald-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-slate-800 font-black text-2xl text-center leading-tight">
              ESCANEADO<br/>RÁPIDO
            </span>
          </motion.button>

          <motion.button 
            onClick={() => setScreen('search')}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border-2 border-transparent hover:border-emerald-100 transition-all group aspect-[4/3]"
          >
            <div className="bg-slate-50 p-6 rounded-3xl group-hover:bg-emerald-50 transition-colors">
              <Search size={64} className="text-slate-800 group-hover:text-emerald-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-slate-800 font-black text-2xl text-center leading-tight">
              BUSCAR<br/>PRODUCTOS
            </span>
          </motion.button>
        </div>

        {/* 4. Grid de Categorías (Botones Verdes) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-4 gap-4 w-full mb-6"
        >
          {topCategories.map((catName, index) => {
            const Icon = categoryIcons[index % categoryIcons.length];
            return (
              <motion.button
                key={catName}
                onClick={() => setScreen('search')}
                whileTap={{ scale: 0.92 }}
                className="bg-emerald-500 rounded-3xl aspect-square flex flex-col items-center justify-center gap-3 p-3 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors border border-emerald-400/50"
              >
                <Icon size={38} className="text-white" strokeWidth={2} />
                <span className="text-white font-black text-[10px] sm:text-xs text-center tracking-wide line-clamp-1">{catName.toUpperCase()}</span>
              </motion.button>
            );
          })}
          
          {/* Rellenar si no hay 4 categorías en la DB */}
          {Array.from({ length: Math.max(0, 4 - topCategories.length) }).map((_, i) => {
             const Icon = categoryIcons[(topCategories.length + i) % categoryIcons.length];
             return (
              <motion.button
                key={`empty-${i}`}
                onClick={() => setScreen('search')}
                whileTap={{ scale: 0.92 }}
                className="bg-emerald-500 rounded-3xl aspect-square flex flex-col items-center justify-center gap-3 p-3 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors border border-emerald-400/50"
              >
                <Icon size={38} className="text-white" strokeWidth={2} />
                <span className="text-white font-black text-xs text-center tracking-wide">VER TODOS</span>
              </motion.button>
             )
          })}
        </motion.div>

        {/* 5. Paginación Dots */}
        <div className="flex justify-center gap-3 my-auto">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
        </div>

        {/* 6. Bottom Bar Verde */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
          className="mt-auto w-full bg-emerald-500 rounded-[2.5rem] p-2 flex shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] border border-emerald-400/50 overflow-hidden"
        >
          {/* Botón Carrito */}
          <motion.button 
            onClick={() => setScreen('cart')}
            className="flex-1 flex flex-col items-center justify-center py-5 relative group"
            whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="relative mb-2">
              <ShoppingCart size={32} className="text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-3 -right-4 bg-slate-900 text-white text-xs font-black w-7 h-7 flex items-center justify-center rounded-full border-2 border-emerald-500 shadow-md"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className="text-white font-black text-sm tracking-wide">CARRITO ({cartCount})</span>
            {/* Divider */}
            <div className="absolute right-0 top-[20%] bottom-[20%] w-[2px] bg-white/20 rounded-full"></div>
          </motion.button>
          
          {/* Botón Ayuda */}
          <motion.button 
            className="flex-1 flex flex-col items-center justify-center py-5 relative group"
            whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <HelpCircle size={32} className="text-white mb-2 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <span className="text-white font-black text-sm max-w-[100px] text-center leading-tight tracking-wide">SOLICITAR AYUDA</span>
            {/* Divider */}
            <div className="absolute right-0 top-[20%] bottom-[20%] w-[2px] bg-white/20 rounded-full"></div>
          </motion.button>
          
          {/* Botón Pagar */}
          <motion.button 
            onClick={() => cartCount > 0 ? setScreen('payment') : null}
            className={`flex-1 flex flex-col items-center justify-center py-5 group ${cartCount === 0 ? 'opacity-60' : ''}`}
            whileTap={cartCount > 0 ? { scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
          >
            <CreditCard size={32} className="text-white mb-2 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <span className="text-white font-black text-sm tracking-wide">PAGAR</span>
          </motion.button>
        </motion.div>

      </div>
    </motion.div>
  )
}
