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
      className="relative w-full min-h-screen overflow-y-auto overflow-x-hidden bg-gray-50 font-sans"
    >
      {/* ================= FONDOS (CAPA BASE) ================= */}
      {/* Fondo Azul Oscuro Superior (Cálido y tecnológico) */}
      <div className="absolute top-0 left-0 w-full h-[62vh] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-b-[4rem] shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-0">
        {/* Subtle tech glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      </div>
      {/* Fondo Inferior Blanco/Grisáceo (Ya es el fondo del padre) */}


      {/* ================= CONTENIDO (CAPA SUPERIOR) ================= */}
      <div className="relative z-10 w-full min-h-screen flex flex-col pt-8 md:pt-14 pb-8 px-4 md:px-8">
        
        {/* 1. Header / Logo */}
        <div className="flex flex-col items-center justify-center mb-6 md:mb-10 mt-2 md:mt-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-white font-black text-3xl md:text-[2.5rem] leading-[0.9] tracking-tight">TIENDA</span>
              <span className="text-white font-black text-3xl md:text-[2.5rem] leading-[0.9] tracking-tight">EXPRESS</span>
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 border-[4px] md:border-[7px] border-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"></div>
          </div>
        </div>

        {/* 2. Textos de Bienvenida */}
        <div className="text-center mb-6 md:mb-10 shrink-0">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="text-4xl md:text-[3.5rem] font-black text-emerald-400 mb-2 tracking-tight drop-shadow-md"
          >
            ¡BIENVENIDO!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-2xl text-slate-200 font-medium tracking-wide leading-tight"
          >
            Toca para empezar a comprar
          </motion.p>
        </div>

        {/* 3. Tarjetas Principales (Blancas, sobrelapando el borde) */}
        {/* Usamos un margen inferior negativo o flex-grow para posicionar correctamente */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full mb-6 md:mb-8 shrink-0 justify-center">
          <motion.button 
            onClick={() => setScreen('search')}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-[2rem] p-4 md:p-8 flex flex-row md:flex-col items-center justify-start md:justify-center gap-4 md:gap-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border-2 border-transparent hover:border-emerald-100 transition-all group w-full md:w-1/2"
          >
            <div className="bg-slate-50 p-4 md:p-6 rounded-3xl group-hover:bg-emerald-50 transition-colors shrink-0">
              <ScanLine className="w-8 h-8 md:w-16 md:h-16 text-slate-800 group-hover:text-emerald-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-slate-800 font-black text-lg md:text-2xl text-left md:text-center leading-tight">
              ESCANEADO<br className="hidden md:block"/> RÁPIDO
            </span>
          </motion.button>

          <motion.button 
            onClick={() => setScreen('search')}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-[2rem] p-4 md:p-8 flex flex-row md:flex-col items-center justify-start md:justify-center gap-4 md:gap-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border-2 border-transparent hover:border-emerald-100 transition-all group w-full md:w-1/2"
          >
            <div className="bg-slate-50 p-4 md:p-6 rounded-3xl group-hover:bg-emerald-50 transition-colors shrink-0">
              <Search className="w-8 h-8 md:w-16 md:h-16 text-slate-800 group-hover:text-emerald-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-slate-800 font-black text-lg md:text-2xl text-left md:text-center leading-tight">
              BUSCAR<br className="hidden md:block"/> PRODUCTOS
            </span>
          </motion.button>
        </div>

        {/* 4. Grid de Categorías (Botones Verdes) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full mb-6 shrink-0"
        >
          {topCategories.map((catName, index) => {
            const Icon = categoryIcons[index % categoryIcons.length];
            return (
              <motion.button
                key={catName}
                onClick={() => setScreen('search')}
                whileTap={{ scale: 0.92 }}
                className="bg-emerald-500 rounded-2xl md:rounded-3xl h-24 md:h-40 flex flex-row md:flex-col items-center justify-center gap-2 md:gap-3 p-2 md:p-3 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors border border-emerald-400/50 w-full"
              >
                <Icon className="w-6 h-6 md:w-10 md:h-10 text-white shrink-0" strokeWidth={2} />
                <span className="text-white font-black text-[11px] sm:text-sm text-center tracking-wide line-clamp-1">{catName.toUpperCase()}</span>
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
                className="bg-emerald-500 rounded-2xl md:rounded-3xl h-24 md:h-40 flex flex-row md:flex-col items-center justify-center gap-2 md:gap-3 p-2 md:p-3 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors border border-emerald-400/50 w-full"
              >
                <Icon className="w-6 h-6 md:w-10 md:h-10 text-white shrink-0" strokeWidth={2} />
                <span className="text-white font-black text-[11px] sm:text-sm text-center tracking-wide">VER TODOS</span>
              </motion.button>
             )
          })}
        </motion.div>

        {/* 5. Paginación Dots */}
        <div className="flex justify-center gap-3 my-4 shrink-0">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
        </div>

        {/* 6. Bottom Bar Verde */}
        {/* mt-auto pushes this to the bottom IF the screen is taller than the content */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
          className="mt-auto shrink-0 w-full bg-emerald-500 rounded-[2rem] md:rounded-[2.5rem] p-1 md:p-2 flex shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] border border-emerald-400/50 overflow-hidden"
        >
          {/* Botón Carrito */}
          <motion.button 
            onClick={() => setScreen('cart')}
            className="flex-1 flex flex-col items-center justify-center py-3 md:py-5 relative group"
            whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="relative mb-1 md:mb-2">
              <ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-2 -right-3 md:-top-3 md:-right-4 bg-slate-900 text-white text-[10px] md:text-xs font-black w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full border-2 border-emerald-500 shadow-md"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className="text-white font-black text-[10px] md:text-sm tracking-wide">CARRITO ({cartCount})</span>
            {/* Divider */}
            <div className="absolute right-0 top-[20%] bottom-[20%] w-[1px] md:w-[2px] bg-white/20 rounded-full"></div>
          </motion.button>
          
          {/* Botón Ayuda */}
          <motion.button 
            className="flex-1 flex flex-col items-center justify-center py-3 md:py-5 relative group"
            whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-white mb-1 md:mb-2 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <span className="text-white font-black text-[10px] md:text-sm max-w-[80px] md:max-w-[100px] text-center leading-[1.1] md:leading-tight tracking-wide">SOLICITAR AYUDA</span>
            {/* Divider */}
            <div className="absolute right-0 top-[20%] bottom-[20%] w-[1px] md:w-[2px] bg-white/20 rounded-full"></div>
          </motion.button>
          
          {/* Botón Pagar */}
          <motion.button 
            onClick={() => cartCount > 0 ? setScreen('payment') : null}
            className={`flex-1 flex flex-col items-center justify-center py-3 md:py-5 group ${cartCount === 0 ? 'opacity-60' : ''}`}
            whileTap={cartCount > 0 ? { scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
          >
            <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-white mb-1 md:mb-2 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <span className="text-white font-black text-[10px] md:text-sm tracking-wide">PAGAR</span>
          </motion.button>
        </motion.div>

      </div>
    </motion.div>
  )
}
