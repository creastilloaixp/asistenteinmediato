import { useState } from 'react'
import { ArrowLeft, CreditCard, Banknote, Loader2, WifiOff, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useKioskStore } from '../stores/kioskStore'
import { toast } from 'sonner'
import { offlineQueue } from '../services/offlineQueue'
import { useOfflineStatus } from '../hooks/useOfflineStatus'
import { PaymentMethods, PaymentData } from '../components/PaymentMethods'

type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'MERCADOPAGO' | 'STRIPE'

export function PaymentScreen() {
  const { cart, setScreen, setTransaction, deviceKey } = useKioskStore()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [cashReceived, setCashReceived] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showDigitalPayment, setShowDigitalPayment] = useState(false)
  const { isOnline } = useOfflineStatus()

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0)
  const total = subtotal

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  const change = cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0
  const canPay = selectedMethod === 'CASH' 
    ? parseFloat(cashReceived) >= total 
    : selectedMethod !== null

  const handleCashInput = (value: string) => {
    if (value === '') {
      setCashReceived('')
      return
    }
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      setCashReceived(value)
    }
  }

  const quickCashAmounts = [20, 50, 100, 200, 500]

  const processOfflineTransaction = () => {
    const items = cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }))

    const transactionId = offlineQueue.addTransaction({
      items,
      paymentMethod: 'CASH',
      cashReceived: parseFloat(cashReceived),
      changeGiven: change,
      total
    })

    setTransaction({
      id: transactionId,
      total,
      paymentMethod: 'CASH',
      cashReceived: parseFloat(cashReceived),
      change: change,
      completedAt: new Date().toISOString(),
      items: cart.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
      }))
    })

    toast.success('Pago guardado (Offline)', {
      description: 'Se sincronizará cuando haya conexión',
      icon: '📶',
    })
    setScreen('receipt')
  }

  const handlePayment = async () => {
    if (!canPay) return

    if (!isOnline && selectedMethod === 'CASH') {
      processOfflineTransaction()
      return
    }

    if (!isOnline && selectedMethod !== 'CASH') {
      toast.error('Sin conexión a Internet', {
        description: 'Solo se aceptan pagos en efectivo cuando estás offline'
      })
      return
    }

    if (selectedMethod === 'MERCADOPAGO' || selectedMethod === 'STRIPE' || selectedMethod === 'CARD' || selectedMethod === 'QR') {
      setShowDigitalPayment(true)
      return
    }

    setProcessing(true)

    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))

      const response = await fetch(`${import.meta.env.VITE_API_URL}/kiosk/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': deviceKey || ''
        },
        body: JSON.stringify({
          items,
          paymentMethod: selectedMethod
        })
      })

      if (!response.ok) {
        throw new Error('Error al procesar la transacción')
      }

      const { data } = await response.json()
      
      const completeResponse = await fetch(`${import.meta.env.VITE_API_URL}/kiosk/transactions/${data.transaction.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': deviceKey || ''
        },
        body: JSON.stringify({
          paymentReference: `CASH-${Date.now()}`,
          cashReceived: selectedMethod === 'CASH' ? parseFloat(cashReceived) : null,
          changeGiven: selectedMethod === 'CASH' ? change : null
        })
      })

      if (!completeResponse.ok) {
        throw new Error('Error al confirmar el pago')
      }

      const completeData = await completeResponse.json()
      setTransaction(completeData.data.transaction)
      
      toast.success('Pago procesado correctamente', { icon: '✅' })
      setScreen('receipt')
      
    } catch (error) {
      console.error(error)
      toast.error('Error al procesar el pago', {
        description: 'Por favor intenta de nuevo'
      })
      if (!isOnline && selectedMethod === 'CASH') {
        processOfflineTransaction()
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleDigitalPaymentComplete = (paymentData: PaymentData, isFinalConfirmation: boolean = false) => {
    // Si no es confirmación final y tenemos datos para mostrar UI (QR o Formulario Stripe), solo retornamos
    if (!isFinalConfirmation && (paymentData.qrCodeBase64 || paymentData.qrCode || paymentData.clientSecret)) {
      return;
    }

    setTransaction({
      id: `DIGITAL-${Date.now()}`,
      total,
      paymentMethod: paymentData.provider.toUpperCase() as 'MERCADOPAGO' | 'STRIPE',
      completedAt: new Date().toISOString(),
      items: cart.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
      }))
    })

    toast.success('Pago procesado correctamente', { icon: '✅' })
    setScreen('receipt')
  }

  const handleDigitalPaymentError = (error: string) => {
    toast.error('Error en el pago', { description: error })
    setShowDigitalPayment(false)
  }

  if (showDigitalPayment) {
    return (
      <PaymentMethods 
        total={total} 
        onBack={() => setShowDigitalPayment(false)}
        onPaymentComplete={handleDigitalPaymentComplete}
        onError={handleDigitalPaymentError}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full pb-32">
      <motion.div 
        className="p-8 pb-4 border-b border-gray-100 bg-white z-10 sticky top-0 flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={() => setScreen('cart')}
          className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shadow-sm"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={28} />
        </motion.button>
        <div>
          <h2 className="text-4xl font-black text-blue-950">Método de Pago</h2>
          <p className="text-xl text-gray-500 mt-2 font-medium">Selecciona cómo deseas pagar</p>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-orange-50 border-2 border-orange-200 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm"
          >
            <WifiOff className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-xl text-orange-800">Kiosco sin conexión</h3>
              <p className="text-orange-600 mt-1">Solo se aceptan pagos en efectivo. Las transacciones se guardarán localmente.</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-orange-700 bg-orange-100 px-3 py-1.5 rounded-lg w-max font-medium">
                <Clock className="w-4 h-4" /> {offlineQueue.getPendingTransactions().length} pagos en espera
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setSelectedMethod('CASH')}
            className={`p-6 rounded-[2rem] flex flex-col items-center gap-4 transition-all border-2 shadow-sm ${
              selectedMethod === 'CASH'
                ? 'bg-blue-50 border-blue-500 shadow-blue-100'
                : 'bg-white border-transparent hover:border-gray-200'
            }`}
            whileTap={{ scale: 0.96 }}
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
              selectedMethod === 'CASH' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600'
            }`}>
              <Banknote className="w-10 h-10" />
            </div>
            <div className="text-center">
              <span className="font-bold text-2xl text-blue-950 block mb-1">Efectivo</span>
              <span className="text-gray-500 font-medium">Pagar en la caja</span>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            disabled={!isOnline}
            onClick={() => {
              setSelectedMethod('MERCADOPAGO')
            }}
            className={`p-6 rounded-[2rem] flex flex-col items-center gap-4 transition-all border-2 shadow-sm ${
              !isOnline ? 'opacity-50 cursor-not-allowed grayscale' : ''
            } ${
              selectedMethod === 'MERCADOPAGO' || selectedMethod === 'STRIPE'
                ? 'bg-blue-50 border-blue-500 shadow-blue-100'
                : 'bg-white border-transparent hover:border-gray-200'
            }`}
            whileTap={isOnline ? { scale: 0.96 } : {}}
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
              selectedMethod === 'MERCADOPAGO' || selectedMethod === 'STRIPE' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600'
            }`}>
              <CreditCard className="w-10 h-10" />
            </div>
            <div className="text-center">
              <span className="font-bold text-2xl text-blue-950 block mb-1">Digital</span>
              <span className="text-gray-500 font-medium">Tarjeta o Código QR</span>
            </div>
          </motion.button>
        </div>

        <AnimatePresence>
          {selectedMethod === 'CASH' && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100"
            >
              <h3 className="font-bold text-2xl mb-6 text-blue-950">¿Con cuánto pagas?</h3>
              
              <div className="grid grid-cols-5 gap-3 mb-6">
                {quickCashAmounts.map(amount => (
                  <motion.button
                    key={amount}
                    onClick={() => handleCashInput(amount.toString())}
                    className="py-4 bg-gray-50 rounded-2xl font-bold text-xl hover:bg-blue-50 hover:text-blue-600 border border-gray-200 transition-colors shadow-sm text-gray-700"
                    whileTap={{ scale: 0.9 }}
                  >
                    ${amount}
                  </motion.button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={(e) => handleCashInput(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 text-3xl font-black bg-gray-50 rounded-[2rem] border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-inner text-blue-950"
                />
              </div>

              <AnimatePresence>
                {cashReceived && parseFloat(cashReceived) > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-6 flex justify-between items-center p-6 bg-blue-50 rounded-2xl border border-blue-100"
                  >
                    <span className="text-xl font-bold text-blue-900">Cambio a entregar:</span>
                    <span className={`text-3xl font-black ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatPrice(change)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Bar */}
      <AnimatePresence>
        {selectedMethod && (
          <motion.div 
            initial={{ y: 150 }}
            animate={{ y: 0 }}
            exit={{ y: 150 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="absolute bottom-0 left-0 right-0 bg-white p-8 border-t-2 border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center z-50 rounded-t-[3rem]"
          >
            <div>
              <span className="text-2xl text-gray-500 font-medium block">Total a pagar</span>
              <motion.span 
                className="text-5xl font-black text-blue-950"
                key={subtotal}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
              >
                {formatPrice(subtotal)}
              </motion.span>
            </div>
            
            <motion.button
              onClick={handlePayment}
              disabled={!canPay || processing}
              className="bg-green-500 text-white px-10 py-6 rounded-[2rem] text-2xl font-bold flex items-center gap-4 shadow-xl shadow-green-200 hover:bg-green-600 transition-colors disabled:opacity-50 disabled:shadow-none min-w-[250px] justify-center"
              whileTap={!(!canPay || processing) ? { scale: 0.96 } : {}}
            >
              {processing ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar Pago'
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
