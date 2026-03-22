import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore, ToastType } from '../stores/toastStore'

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-6 h-6" />,
  error: <XCircle className="w-6 h-6" />,
  warning: <AlertCircle className="w-6 h-6" />,
  info: <Info className="w-6 h-6" />
}

const styles: Record<ToastType, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white'
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles[toast.type]} rounded-xl p-4 shadow-lg flex items-center gap-3 animate-fade-in`}
        >
          {icons[toast.type]}
          <span className="flex-1 font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const { addToast } = useToastStore()

  return {
    success: (message: string) => addToast({ type: 'success', message }),
    error: (message: string) => addToast({ type: 'error', message }),
    warning: (message: string) => addToast({ type: 'warning', message }),
    info: (message: string) => addToast({ type: 'info', message })
  }
}
