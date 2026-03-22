import { motion } from 'framer-motion'
import { ShoppingCart, Wifi, ArrowLeft } from 'lucide-react'
import { useKioskStore } from '../stores/kioskStore'

export function KioskHeader() {
  const { currentScreen, cart, setScreen, storeName } = useKioskStore()
  
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  // No mostrar header en la pantalla de inicio o recibo
  if (currentScreen === 'home' || currentScreen === 'receipt') return null

  const handleBack = () => {
    if (currentScreen === 'payment') setScreen('cart')
    else if (currentScreen === 'cart') setScreen('search')
    else setScreen('home')
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm px-6 py-4 flex items-center justify-between border-b border-gray-100">
      <div className="flex items-center gap-4">
        {currentScreen !== 'search' && (
          <button 
            onClick={handleBack} 
            className="p-3 bg-gray-100 rounded-full text-blue-950 active:scale-90 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <div className="flex items-center gap-2 font-black text-2xl text-blue-950">
          <div className="w-8 h-8 rounded-full bg-green-500"></div>
          {storeName || 'TIENDA EXPRESS'}
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">
          <Wifi size={16} className="text-green-500" /> Kiosco #001
      </div>

      <motion.button
        onClick={() => setScreen('cart')}
        className="relative p-4 bg-blue-50 rounded-2xl text-blue-950 transition-colors hover:bg-blue-100"
        whileTap={{ scale: 0.95 }}
      >
        <ShoppingCart size={32} />
        {cartCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            key={cartCount}
            className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full shadow-lg border-2 border-white"
          >
            {cartCount}
          </motion.span>
        )}
      </motion.button>
    </header>
  )
}
