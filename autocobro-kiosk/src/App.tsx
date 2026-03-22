import { useState, useEffect } from 'react'
import { useKioskStore } from './stores/kioskStore'
import { useBarcodeScanner } from './hooks/useBarcodeScanner'
import { OfflineIndicator } from './hooks/useOfflineStatus'
import { HomeScreen } from './screens/HomeScreen'
import { SearchScreen } from './screens/SearchScreen'
import { CartScreen } from './screens/CartScreen'
import { PaymentScreen } from './screens/PaymentScreen'
import { ReceiptScreen } from './screens/ReceiptScreen'
import { HardwareStatus } from './components/HardwareStatus'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { Loader2 } from 'lucide-react'

function App() {
  const { currentScreen, initialize, isInitialized, storeName, products, addToCart } = useKioskStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      await initialize()
      setLoading(false)
    }
    init()
  }, [initialize])

  useBarcodeScanner({
    onScan: (barcode) => {
      const product = products.find(p => p.barcode === barcode || p.id === barcode)
      if (product) {
        addToCart(product)
        toast.success(`${product.name} agregado`, {
          icon: '🛒',
          duration: 2000,
        })
      } else {
        toast.error('Producto no encontrado', {
          icon: '❌',
          duration: 2000,
        })
      }
    }
  })

  if (loading) {
    return (
      <div className="kiosk-screen items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-24 h-24 text-white mx-auto mb-6" />
          </motion.div>
          <motion.h1 
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            AutoCobro
          </motion.h1>
          <motion.p 
            className="text-white/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Inicializando...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="kiosk-screen items-center justify-center bg-gradient-to-br from-red-600 to-red-800">
        <motion.div 
          className="text-center p-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="text-6xl mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ⚠️
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-4">Error de Configuración</h1>
          <p className="text-white/80 mb-6">No se pudo conectar con el servidor</p>
          <motion.button 
            onClick={() => window.location.reload()}
            className="bg-white text-red-700 px-8 py-4 rounded-xl font-bold text-xl btn-touch"
            whileTap={{ scale: 0.97 }}
          >
            Reintentar
          </motion.button>
        </motion.div>
      </div>
    )
  }

  const screens = {
    home: HomeScreen,
    search: SearchScreen,
    cart: CartScreen,
    payment: PaymentScreen,
    receipt: ReceiptScreen,
  } as const

  const CurrentScreen = screens[currentScreen]

  return (
    <div className="kiosk-screen">
      <Toaster 
        position="top-center"
        richColors
        closeButton
        expand={false}
      />
      <OfflineIndicator />
      <HardwareStatus />
      {storeName && (
        <motion.div 
          className="absolute top-4 left-4 z-50 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <span className="text-white font-medium">{storeName}</span>
        </motion.div>
      )}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          className="flex-1 min-h-0 flex flex-col relative"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <CurrentScreen />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default App
