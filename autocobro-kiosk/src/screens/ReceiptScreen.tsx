import { useEffect, useState } from 'react'
import { CheckCircle, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKioskStore } from '../stores/kioskStore'
import { printReceipt, openCashDrawer } from '../services/printerService'

export function ReceiptScreen() {
  const { currentTransaction, clearCart, setScreen, storeName } = useKioskStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular un pequeño tiempo de procesamiento (como en el diseño original)
    const timer = setTimeout(() => {
      setLoading(false)
      
      if (currentTransaction) {
        if (currentTransaction.paymentMethod === 'CASH') {
          openCashDrawer()
        }
        
        setTimeout(() => {
          handleAutoPrint()
        }, 500)

        // Auto return to home after 10 seconds of showing the success screen
        setTimeout(() => {
          handleNewSale()
        }, 10000)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [currentTransaction])

  const handleAutoPrint = async () => {
    if (!currentTransaction) return
    
    try {
      await printReceipt({
        storeName: storeName || 'Mi Tienda',
        transactionId: currentTransaction.id,
        items: currentTransaction.items,
        subtotal: currentTransaction.total,
        total: currentTransaction.total,
        paymentMethod: currentTransaction.paymentMethod,
        cashReceived: currentTransaction.cashReceived,
        change: currentTransaction.change,
        date: currentTransaction.completedAt 
          ? new Date(currentTransaction.completedAt).toLocaleString('es-MX')
          : new Date().toLocaleString('es-MX')
      })
    } catch (err) {
      console.warn('Print failed:', err)
    }
  }

  const handleNewSale = () => {
    clearCart()
    setScreen('home')
  }

  if (!currentTransaction) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 h-full">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">No hay transacción activa</h2>
        <button
          onClick={handleNewSale}
          className="bg-blue-500 text-white px-8 py-4 rounded-2xl text-xl font-bold"
        >
          Volver al Inicio
        </button>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="flex-grow flex flex-col items-center justify-center p-10 bg-white text-center h-full"
    >
      <AnimatePresence mode='wait'>
        {loading ? (
          <motion.div key="loading" className='flex flex-col items-center gap-6' exit={{opacity: 0, scale: 0.9}}>
            <div className="w-24 h-24 border-8 border-gray-100 border-t-green-500 rounded-full animate-spin"></div>
            <p className='text-2xl font-bold text-gray-600'>Procesando tu pago...</p>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{opacity:0, scale: 0.8}} animate={{opacity: 1, scale: 1}} className='flex flex-col items-center w-full max-w-lg'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-32 h-32 rounded-full bg-green-50 flex items-center justify-center mb-10 shadow-inner border-[12px] border-green-100"
            >
              <CheckCircle size={64} className="text-green-500" strokeWidth={4} />
            </motion.div>
            
            <h1 className="text-6xl font-black text-blue-950 mb-4">¡Pago Exitoso!</h1>
            <p className="text-5xl font-black text-green-500 mb-12">
              ${currentTransaction.total.toFixed(2)} <span className="text-2xl font-bold text-gray-400">MXN</span>
            </p>
            
            <div className='bg-gray-50 border border-gray-100 p-8 rounded-3xl mb-16 space-y-4 w-full shadow-sm'>
              <p className='text-xl text-gray-700 font-bold flex items-center justify-center gap-3'>
                <Printer className="text-gray-400" />
                Imprimiendo ticket...
              </p>
              <p className='text-lg text-gray-500'>Toma tu ticket de la impresora situada debajo de la pantalla.</p>
              <div className='w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-6'>
                <motion.div 
                  initial={{x: '-100%'}} 
                  animate={{x: '100%'}} 
                  transition={{duration: 2, repeat: Infinity, ease: 'linear'}} 
                  className="w-1/2 h-full bg-blue-900 rounded-full"
                ></motion.div>
              </div>
            </div>

            <motion.button 
              onClick={handleNewSale} 
              className="bg-blue-950 text-white hover:bg-blue-900 rounded-[2rem] font-bold transition-colors w-full py-6 text-2xl shadow-xl flex items-center justify-center"
              whileTap={{ scale: 0.96 }}
            >
              Finalizar Compra
            </motion.button>
            <p className="text-gray-400 mt-6 text-lg">La pantalla se reiniciará en unos segundos...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}