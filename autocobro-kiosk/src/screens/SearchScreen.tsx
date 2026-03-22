import { useState, useMemo } from 'react'
import { Search as SearchIcon, ShoppingCart, ArrowRight } from 'lucide-react'
import { motion, Variants, AnimatePresence } from 'framer-motion'
import { useKioskStore, Product } from '../stores/kioskStore'
import { RecommendationBanner } from '../components/RecommendationBanner'
import { toast } from 'sonner'

export function SearchScreen() {
  const { products, addToCart, setScreen, cart } = useKioskStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
    return cats.sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    let result = products
    
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory)
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
      )
    }
    
    return result
  }, [products, searchQuery, selectedCategory])

  const getCartQuantity = (productId: string) => {
    const item = cart.find(i => i.product.id === productId)
    return item?.quantity || 0
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  const handleProductClick = (product: Product) => {
    if (product.stock > 0) {
      addToCart(product)
      toast.success(`${product.name} agregado`, {
        icon: '🛒',
        duration: 2000,
      })
    } else {
      toast.error('Producto agotado', {
        icon: '❌',
        duration: 2000,
      })
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden relative">
      <motion.div 
        className="bg-white p-6 shadow-sm z-10 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-400" />
            <input
              type="text"
              placeholder="Busca Coca-Cola, Sabritas, Pan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-6 text-2xl bg-gray-50 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-blue-100 border-2 border-gray-100 focus:border-blue-500 transition-all shadow-inner"
              autoFocus
            />
          </div>
        </div>

        <motion.div 
          className="flex gap-3 mt-6 overflow-x-auto pb-2 no-scrollbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            onClick={() => setSelectedCategory(null)}
            className={`px-8 py-4 rounded-full whitespace-nowrap font-bold text-xl transition-all shadow-sm ${
              selectedCategory === null 
                ? 'bg-blue-900 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            Todos
          </motion.button>
          {categories.map(cat => (
            <motion.button
              key={cat}
              onClick={() => setSelectedCategory(cat || null)}
              className={`px-8 py-4 rounded-full whitespace-nowrap font-bold text-xl transition-all shadow-sm ${
                selectedCategory === cat 
                  ? 'bg-blue-900 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {cat}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      <RecommendationBanner />

      <div className="flex-1 overflow-y-auto p-6 pb-40">
        {filteredProducts.length === 0 ? (
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-8xl mb-6">🔍</div>
            <p className="text-gray-500 text-2xl font-medium">No se encontraron productos</p>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredProducts.map((product) => {
              const qty = getCartQuantity(product.id)
              const outOfStock = product.stock <= 0
              
              return (
                <motion.button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  disabled={outOfStock}
                  variants={itemVariants}
                  whileHover={{ scale: outOfStock ? 1 : 1.02 }}
                  whileTap={{ scale: outOfStock ? 1 : 0.96 }}
                  className={`bg-white rounded-3xl p-5 text-left shadow-sm hover:shadow-xl transition-all flex flex-col items-center gap-3 border border-gray-100 h-full ${
                    outOfStock ? 'opacity-50' : ''
                  }`}
                >
                  <div className="w-full aspect-[4/3] bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden p-4 shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-5xl">📦</span>
                    )}
                  </div>
                  
                  <div className="w-full flex-grow flex flex-col justify-between mt-2">
                    <h3 className="font-bold text-lg md:text-xl text-gray-800 line-clamp-2 leading-tight min-h-[3.5rem]">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center justify-between w-full mt-4">
                      <div className="text-2xl md:text-3xl font-black text-blue-900">
                        {formatPrice(Number(product.price))}
                      </div>
                      
                      {qty > 0 && (
                        <motion.div 
                          className="bg-green-500 text-white w-10 h-10 flex items-center justify-center rounded-full text-lg font-black shadow-lg"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          key={qty}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                          {qty}
                        </motion.div>
                      )}
                      
                      {outOfStock && (
                        <div className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold">
                          Agotado
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div 
            initial={{ y: 150 }}
            animate={{ y: 0 }}
            exit={{ y: 150 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="absolute bottom-0 left-0 right-0 bg-white p-6 md:p-8 border-t-2 border-gray-100 shadow-[0_-15px_40px_rgba(0,0,0,0.1)] flex justify-between items-center z-50 rounded-t-[2.5rem]"
          >
            <div className="flex items-center gap-4 md:gap-6 px-2 md:px-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center relative shadow-inner">
                <ShoppingCart size={28} className="md:w-8 md:h-8" />
                <motion.div 
                  className="absolute -top-3 -right-3 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-4 border-white shadow-sm"
                  key={cartCount}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                >
                  {cartCount}
                </motion.div>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-slate-900">{formatPrice(cartTotal)}</p>
                <p className="text-sm md:text-lg text-slate-500 font-medium">{cartCount} productos en carrito</p>
              </div>
            </div>
            <motion.button
              onClick={() => setScreen('cart')}
              className="bg-emerald-500 text-white px-8 md:px-10 py-5 md:py-6 rounded-[2rem] text-xl md:text-2xl font-bold flex items-center gap-3 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
              whileTap={{ scale: 0.96 }}
            >
              Revisar y Pagar <ArrowRight size={28} className="md:w-8 md:h-8" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
