import { useEffect, useCallback, useRef } from 'react'

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void
  minLength?: number
  maxLength?: number
  scanTimeout?: number
}

export function useBarcodeScanner({ 
  onScan, 
  minLength = 4,
  maxLength = 50,
  scanTimeout = 50 
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLikelyBarcode = useCallback((buffer: string): boolean => {
    if (buffer.length < minLength) return false
    
    const allDigits = /^\d+$/.test(buffer)
    const hasLetters = /[a-zA-Z]/.test(buffer)
    const isMixed = allDigits || (!hasLetters && buffer.length > 8)
    
    return allDigits || isMixed
  }, [minLength])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (event.key === 'Enter') {
      if (bufferRef.current.length >= minLength && bufferRef.current.length <= maxLength) {
        if (isLikelyBarcode(bufferRef.current)) {
          event.preventDefault()
          onScan(bufferRef.current)
        }
      }
      bufferRef.current = ''
      return
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const expectedDelay = bufferRef.current.length === 0 ? 500 : scanTimeout
      
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = ''
      }, expectedDelay)

      bufferRef.current += event.key
    }
  }, [onScan, minLength, maxLength, scanTimeout, isLikelyBarcode])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleKeyDown])
}
