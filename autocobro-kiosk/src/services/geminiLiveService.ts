const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private playbackContext: AudioContext | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private visionInterval: any = null;
  
  public onTranscript?: (text: string) => void;
  public onAction?: (action: 'add' | 'remove' | 'checkout', productId: string) => void;
  public onStateChange?: (state: 'idle' | 'listening' | 'speaking') => void;
  public onError?: (msg: string) => void;

  async start(products: any[]) {
    try {
      if (!API_KEY) {
        this.onError?.('Falta la llave API de Gemini (VITE_GEMINI_API_KEY).');
        return;
      }

      this.onStateChange?.('listening');
      
      // 1. Iniciar captura de audio y VISIÓN inmediatamente (más rápido para el usuario)
      this.initAudioCapture();
      this.initVisionCapture();

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[GeminiLive] Connected to Gemini. Sending setup...');
        this.ws?.send(JSON.stringify({
          setup: {
            model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
            generationConfig: { responseModalities: ["AUDIO"] },
            systemInstruction: {
              parts: [{ text: "Eres Elisa, la asistente IA del Kiosco. Puedes VER (cámara) y ESCUCHAR. Sé proactiva y simpática comentando lo que ves. Tareas: manage_cart y checkout_cart." }]
            },
            tools: [{
              functionDeclarations: [
                {
                  name: "manage_cart",
                  description: "Gestiona el carrito",
                  parameters: {
                    type: "object",
                    properties: {
                      action: { type: "string", enum: ["add", "remove"] },
                      productName: { type: "string" }
                    },
                    required: ["action", "productName"]
                  }
                },
                {
                  name: "checkout_cart",
                  description: "Cobrar productos",
                  parameters: { type: "object", properties: {} }
                }
              ]
            }]
          }
        }));
      };

      this.ws.onmessage = async (e) => {
        let data = e.data;
        if (data instanceof Blob) data = await data.text();
        
        try {
          const msg = JSON.parse(data);
          
          // Manejar Audio de respuesta
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) this.playAudio(part.inlineData.data);
            }
          }

          // Manejar Herramientas
          if (msg.serverContent?.modelTurn?.parts?.[0]?.functionCall) {
            const call = msg.serverContent.modelTurn.parts[0].functionCall;
            
            if (call.name === 'manage_cart') {
              const requestedName = call.args.productName.toLowerCase();
              const found = products.find(p => p.name.toLowerCase().includes(requestedName));
              if (found) {
                this.onAction?.(call.args.action, found.id);
                this.onTranscript?.(`${call.args.action === 'add' ? 'Añadí' : 'Quité'}: ${found.name}`);
              }
              this.sendToolResponse("manage_cart", { result: found ? "success" : "not_found" });
            } else if (call.name === 'checkout_cart') {
              this.onAction?.('checkout', '');
              this.sendToolResponse("checkout_cart", { result: "success" });
            }
          }
        } catch (err) { console.error("WS error", err); }
      };

      this.ws.onerror = () => this.onError?.('Error de conexión con Google.');
      this.ws.onclose = (ev) => {
        if (ev.code === 1008) this.onError?.('API Key inválida.');
        this.stop();
      };

    } catch (error) {
       this.onError?.('Error al iniciar el servicio.');
       this.stop();
    }
  }

  private sendToolResponse(name: string, response: any) {
    this.ws?.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ functionResponse: { name, response } }]
        }],
        turnComplete: true
      }
    }));
  }

  private workletNode: AudioWorkletNode | null = null;
  private async initAudioCapture() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          constructor() { super(); this.buffer = new Int16Array(512); this.cursor = 0; }
          process(inputs) {
            const channelData = inputs[0]?.[0];
            if (channelData) {
              for (let i = 0; i < channelData.length; i++) {
                this.buffer[this.cursor++] = Math.min(1, Math.max(-1, channelData[i])) * 0x7FFF;
                if (this.cursor >= 512) { this.port.postMessage(this.buffer); this.buffer = new Int16Array(512); this.cursor = 0; }
              }
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      
      const url = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
      await this.audioContext.audioWorklet.addModule(url);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
      this.workletNode.port.onmessage = (e) => {
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        const base64 = window.btoa(String.fromCharCode(...new Uint8Array(e.data.buffer)));
        this.ws.send(JSON.stringify({
          realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64 }] }
        }));
      };
      source.connect(this.workletNode);
    } catch(e) { console.error("Audio error", e); }
  }

  private nextPlayTime: number = 0;
  private playAudio(base64: string) {
     this.onStateChange?.('speaking');
     const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
     if (!this.playbackContext || this.playbackContext.state === 'closed') {
         this.playbackContext = new AudioContext({ sampleRate: 24000 });
         this.nextPlayTime = this.playbackContext.currentTime;
     }
     const int16 = new Int16Array(bytes.buffer);
     const float32 = new Float32Array(int16.length);
     for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
     
     const buffer = this.playbackContext.createBuffer(1, float32.length, 24000);
     buffer.getChannelData(0).set(float32);
     const source = this.playbackContext.createBufferSource();
     source.buffer = buffer;
     source.connect(this.playbackContext.destination);
     if (this.nextPlayTime < this.playbackContext.currentTime) this.nextPlayTime = this.playbackContext.currentTime;
     source.start(this.nextPlayTime);
     this.nextPlayTime += buffer.duration;
     source.onended = () => {
         if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.1) this.onStateChange?.('listening');
     };
  }

  private async initVisionCapture() {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 270 } });
      this.videoElement = document.getElementById('elisa-vision-preview') as HTMLVideoElement || document.createElement('video');
      this.videoElement.srcObject = videoStream;
      this.videoElement.play();
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 480; this.canvasElement.height = 270;
      const ctx = this.canvasElement.getContext('2d');

      this.visionInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN && ctx && this.videoElement) {
          ctx.drawImage(this.videoElement, 0, 0, 480, 270);
          const base64 = this.canvasElement!.toDataURL('image/jpeg', 0.5).split(',')[1];
          this.ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "image/jpeg", data: base64 }] } }));
        }
      }, 2000);
    } catch (e: any) {
      this.onError?.('Error de cámara: ' + e.name);
    }
  }

  stop() {
    this.ws?.close();
    this.workletNode?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    if (this.visionInterval) clearInterval(this.visionInterval);
    if (this.videoElement?.srcObject) (this.videoElement.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    this.ws = null; this.onStateChange?.('idle');
  }
}

export const liveService = new GeminiLiveService();
