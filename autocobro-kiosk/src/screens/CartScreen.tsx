import { Minus, Plus, Trash2, ShoppingBag, QrCode } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKioskStore } from '../stores/kioskStore'
import { toast } from 'sonner'

export function CartScreen() {
  const { cart, updateQuantity, removeFromCart, setScreen } = useKioskStore()

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  const handleRemove = (productId: string, productName: string) => {
    removeFromCart(productId)
    toast.success(`${productName} eliminado`, {
      icon: '🗑️',
      duration: 2000,
    })
  }

  if (cart.length === 0) {
    return (
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center bg-gray-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="text-8xl mb-6"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          🛒
        </motion.div>
        <motion.h2 
          className="text-3xl font-black text-blue-950 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Tu carrito está vacío
        </motion.h2>
        <motion.p 
          className="text-xl text-gray-500 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Vuelve a la pantalla principal para agregar productos.
        </motion.p>
        <motion.button
          onClick={() => setScreen('search')}
          className="bg-green-500 text-white px-12 py-6 rounded-3xl text-2xl font-bold shadow-xl shadow-green-200 hover:bg-green-600 transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.96 }}
        >
          Buscar productos
        </motion.button>
      </motion.div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 max-h-screen overflow-hidden">
      <div className="p-4 md:p-8 pb-3 md:pb-4 border-b border-gray-100 bg-white z-10 shrink-0">
          <h2 className="text-2xl md:text-4xl font-black text-blue-950">Tu Carrito</h2>
          <p className="text-base md:text-xl text-gray-500 mt-1 md:mt-2 font-medium">{cartCount} artículos listos para pagar</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-5 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {cart.map((item) => (
            <motion.div
              key={item.product.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 100, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white rounded-[2rem] p-4 md:p-6 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-6"
            >
              <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center p-2 shrink-0">
                {item.product.image ? (
                  <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                ) : (
                  <ShoppingBag className="w-6 h-6 md:w-10 md:h-10 text-gray-300" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg md:text-2xl text-gray-800 leading-tight mb-1 md:mb-2 line-clamp-1 md:line-clamp-2">{item.product.name}</h3>
                <p className="text-xl md:text-3xl font-black text-green-500">
                  {formatPrice(Number(item.product.price) * item.quantity)}
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-2 md:gap-4 shrink-0">
                <div className="flex items-center gap-1 md:gap-2 bg-gray-50 border border-gray-200 rounded-full p-1 md:p-1.5 shadow-inner">
                  <motion.button
                    onClick={() => {
                      if (item.quantity === 1) {
                        handleRemove(item.product.id, item.product.name)
                      } else {
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                    }}
                    className="p-2 md:p-4 bg-white rounded-full text-gray-600 shadow-sm active:bg-gray-100"
                    whileTap={{ scale: 0.9 }}
                  >
                    {item.quantity === 1 ? <Trash2 size={18} className="text-red-500 md:w-6 md:h-6" /> : <Minus size={18} className="md:w-6 md:h-6" />}
                  </motion.button>
                  
                  <motion.span 
                    key={item.quantity}
                    className="text-lg md:text-2xl font-bold w-6 md:w-12 text-center text-blue-950"
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                  >
                    {item.quantity}
                  </motion.span>
                  
                  <motion.button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="p-2 md:p-4 bg-green-500 rounded-full text-white shadow-md active:bg-green-600 disabled:opacity-50"
                    whileTap={{ scale: 0.9 }}
                  >
                    <Plus size={18} className="md:w-6 md:h-6" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div 
        className="p-5 md:p-8 bg-white border-t-2 border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] space-y-4 md:space-y-6 z-20 rounded-t-[2rem] md:rounded-t-[3rem] shrink-0"
        initial={{ y: 150 }}
        animate={{ y: 0 }}
      >
        <div className="flex justify-between items-center">
          <span className="text-lg md:text-2xl text-gray-500 font-medium">Total a pagar</span>
          <motion.span 
            className="text-3xl md:text-5xl font-black text-blue-950"
            key={subtotal}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
          >
            {formatPrice(subtotal)}
          </motion.span>
        </div>
        
        <div className="flex gap-3">
          <motion.button
            onClick={() => setScreen('search')}
            className="flex-1 bg-gray-100 text-gray-700 py-4 md:py-6 rounded-2xl md:rounded-[2rem] text-lg md:text-2xl font-bold hover:bg-gray-200 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            Seguir Comprando
          </motion.button>
          <motion.button
            onClick={() => setScreen('payment')}
            className="flex-[1.5] bg-green-500 text-white py-4 md:py-6 rounded-2xl md:rounded-[2rem] text-lg md:text-2xl font-bold shadow-xl shadow-green-200 flex items-center justify-center gap-2 md:gap-4 hover:bg-green-600 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <QrCode size={24} className="md:w-8 md:h-8" />
            Pagar
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
