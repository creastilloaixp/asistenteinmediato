const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private playbackContext: AudioContext | null = null;
  
  public onTranscript?: (text: string) => void;
  public onAction?: (action: 'add' | 'remove', productId: string) => void;
  public onStateChange?: (state: 'idle' | 'listening' | 'speaking') => void;
  public onError?: (msg: string) => void;

  async start(products: any[]) {
    try {
      this.onStateChange?.('listening');
      
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Enviar configuración inicial (modelo 2.5 y tools)
        this.ws?.send(JSON.stringify({
          setup: {
            model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
            systemInstruction: {
              parts: [{ text: "Eres Elisa, asistente virtual de AutoCobro. Responde brevemente (máximo 1 oración) con voz muy amable. Usa tus herramientas para agregar o quitar cosas del carrito si el usuario te lo pide." }]
            },
            tools: [{
              functionDeclarations: [
                {
                  name: "manageCart",
                  description: "Agrega o quita productos del carrito del usuario.",
                  parameters: {
                    type: "object",
                    properties: {
                      action: { type: "string", description: "add o remove" },
                      productName: { type: "string", description: "El nombre aproximado del producto" }
                    },
                    required: ["action", "productName"]
                  }
                }
              ]
            }]
          }
        }));
        // Iniciar captura real-time de micrófono
        this.initAudioCapture();
      };

      this.ws.onmessage = async (e) => {
        let data = e.data;
        if (data instanceof Blob) {
          data = await data.text();
        }
        
        try {
          const msg = JSON.parse(data);

          // 1. Manejar el AUDIO y TEXTO de respuesta
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.data) {
                // Reproducir el Base64 que manda Gemini (Voz natural 2.5)
                this.playAudio(part.inlineData.data);
              }
            }
          }

          // 2. Manejar Herramientas (Carrito)
          if (msg.serverContent?.modelTurn?.parts?.[0]?.functionCall) {
            const call = msg.serverContent.modelTurn.parts[0].functionCall;
            if (call.name === 'manageCart') {
               const requestedName = call.args.productName.toLowerCase();
               // Búsqueda del producto
               const found = products.find(p => p.name.toLowerCase().includes(requestedName));
               
               if (found) {
                  this.onAction?.(call.args.action, found.id);
                  this.onTranscript?.(`${call.args.action === 'add' ? 'Añadí' : 'Quité'}: ${found.name}`);
               } else {
                  this.onTranscript?.(`No encontré: ${call.args.productName}`);
               }
               
               // Devolver la confirmación a Gemini para que termine de hablar
               this.ws?.send(JSON.stringify({
                 clientContent: {
                   turns: [{
                     role: "user",
                     parts: [{
                       functionResponse: {
                         name: "manageCart",
                         response: { result: found ? "success" : "not_found" }
                       }
                     }]
                   }],
                   turnComplete: true
                 }
               }));
            }
          }
        } catch (err) {
          console.error("Error parseando WebSocket msg", err);
        }
      };

      this.ws.onerror = () => {
        this.onError?.('Error en la conexión con los servidores de Google.');
        this.stop();
      };

    } catch (error) {
       console.error(error);
       this.onError?.('Permisos de micrófono denegados o error de sistema.');
       this.stop();
    }
  }

  private workletNode: AudioWorkletNode | null = null;

  // --- CAPTURA DE AUDIO DEL KIOSCO (16kHz PCM para que Gemini lo entienda) --- //
  private async initAudioCapture() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Crear el AudioWorklet inline para procesar el audio sin afectar el hilo principal (Evita warnings de deprecación)
    const workletCode = `
      class PCMProcessor extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0];
          if (input && input.length > 0) {
            const channelData = input[0];
            const pcm16 = new Int16Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
              pcm16[i] = Math.min(1, Math.max(-1, channelData[i])) * 0x7FFF;
            }
            this.port.postMessage(pcm16);
          }
          return true;
        }
      }
      registerProcessor('pcm-processor', PCMProcessor);
    `;
    
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    
    await this.audioContext.audioWorklet.addModule(url);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
    
    this.workletNode.port.onmessage = (e) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;

      const pcm16 = e.data;
      const buffer = new Uint8Array(pcm16.buffer);
      
      let binary = '';
      for (let i = 0; i < buffer.byteLength; i++) {
          binary += String.fromCharCode(buffer[i]);
      }
      const base64 = window.btoa(binary);
      
      this.ws?.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: "audio/pcm;rate=16000",
            data: base64
          }]
        }
      }));
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
  }

  // --- REPRODUCCIÓN DE LA VOZ DE GEMINI (24kHz PCM) --- //
  private playAudio(base64: string) {
     this.onStateChange?.('speaking');
     const binary = window.atob(base64);
     const len = binary.length;
     const bytes = new Uint8Array(len);
     for (let i = 0; i < len; i++) {
         bytes[i] = binary.charCodeAt(i);
     }
     
     if (!this.playbackContext) {
         this.playbackContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
     }
     
     const int16 = new Int16Array(bytes.buffer);
     const float32 = new Float32Array(int16.length);
     for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
     }
     
     const audioBuffer = this.playbackContext!.createBuffer(1, float32.length, 24000);
     audioBuffer.getChannelData(0).set(float32);
     
     const source = this.playbackContext!.createBufferSource();
     source.buffer = audioBuffer;
     source.connect(this.playbackContext!.destination);
     source.onended = () => {
         this.onStateChange?.('listening');
     };
     source.start(0);
  }

  stop() {
    this.ws?.close();
    this.workletNode?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close().catch(() => {});
    this.playbackContext?.close().catch(() => {});
    this.ws = null;
    this.stream = null;
    this.workletNode = null;
    this.onStateChange?.('idle');
  }
}

export const liveService = new GeminiLiveService();
