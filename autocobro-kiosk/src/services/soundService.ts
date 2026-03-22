const sounds = {
  add: () => playTone(800, 0.1, 'sine'),
  success: () => playTone(1000, 0.15, 'sine'),
  error: () => playTone(200, 0.3, 'square'),
  beep: () => playTone(600, 0.08, 'sine'),
  scan: () => {
    playTone(1200, 0.05, 'sine')
    setTimeout(() => playTone(1400, 0.05, 'sine'), 50)
    setTimeout(() => playTone(1600, 0.08, 'sine'), 100)
  },
  cash: () => {
    playTone(400, 0.1, 'triangle')
    setTimeout(() => playTone(500, 0.1, 'triangle'), 100)
    setTimeout(() => playTone(600, 0.15, 'triangle'), 200)
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.type = type
    oscillator.frequency.value = frequency
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)
    
    setTimeout(() => audioContext.close(), duration * 1000 + 100)
  } catch (e) {
    console.warn('Audio not supported:', e)
  }
}

export const soundService = sounds

export function useSound() {
  return sounds
}
