import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import express from 'express';

export const WS_EVENTS = {
  NEW_TRANSACTION: 'NEW_TRANSACTION',
  KIOSK_HEARTBEAT: 'KIOSK_HEARTBEAT',
  LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;

export type WSEventType = typeof WS_EVENTS[keyof typeof WS_EVENTS];

export interface WSMessage {
  event: WSEventType;
  payload: any;
  storeId?: string;
  timestamp: string;
}

interface ConnectedClient {
  ws: WebSocket;
  storeId?: string;
  userId?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private heartbeatIntervals: Map<WebSocket, ReturnType<typeof setInterval>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('🔌 Client connected from:', req.socket.remoteAddress);
      
      this.send(ws, { event: 'CONNECTION_ACK' as WSEventType, payload: { connected: true }, timestamp: new Date().toISOString() });

      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.ping();
          } catch (e) {
            console.log('Ping failed, closing');
            ws.close();
          }
        }
      }, 30000);

      this.heartbeatIntervals.set(ws, heartbeat);

      ws.on('pong', () => {
        console.log('🫀 Client responded to heartbeat');
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (err) {
          console.error('Invalid WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected');
        this.removeClient(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        this.removeClient(ws);
      });
    });

    console.log('✅ WebSocket server initialized');
  }

  private handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'SUBSCRIBE_STORE':
        if (message.storeId) {
          this.clients.set(ws, {
            ...this.clients.get(ws),
            storeId: message.storeId,
            ws,
          });
          console.log(`📡 Client subscribed to store: ${message.storeId}`);
          this.send(ws, {
            event: 'STORE_SUBSCRIBED' as WSEventType,
            payload: { storeId: message.storeId },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'KIOSK_HEARTBEAT':
        this.emit(message.payload.storeId, {
          event: WS_EVENTS.KIOSK_HEARTBEAT,
          payload: message.payload,
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private removeClient(ws: WebSocket) {
    const interval = this.heartbeatIntervals.get(ws);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(ws);
    }
    this.clients.delete(ws);
  }

  private send(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  emit(storeId: string | undefined, message: WSMessage) {
    if (!this.wss) return;

    const broadcastMessage = JSON.stringify({
      ...message,
      storeId,
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const clientInfo = this.clients.get(client);
        if (!clientInfo?.storeId || clientInfo.storeId === storeId) {
          client.send(broadcastMessage);
        }
      }
    });
  }

  broadcastToStore(storeId: string, event: WSEventType, payload: any) {
    this.emit(storeId, {
      event,
      payload,
      storeId,
      timestamp: new Date().toISOString(),
    });
  }

  emitNewTransaction(storeId: string, transaction: any) {
    this.broadcastToStore(storeId, WS_EVENTS.NEW_TRANSACTION, {
      transaction,
      type: 'sale',
    });
    console.log(`📤 NEW_TRANSACTION emitted for store ${storeId}`);
  }

  emitLowStockAlert(storeId: string, product: any) {
    this.broadcastToStore(storeId, WS_EVENTS.LOW_STOCK_ALERT, {
      product,
      type: 'alert',
    });
  }

  emitKioskHeartbeat(storeId: string, kiosk: any) {
    this.broadcastToStore(storeId, WS_EVENTS.KIOSK_HEARTBEAT, {
      kiosk,
      type: 'heartbeat',
    });
  }

  emitPaymentCompleted(storeId: string, transaction: any) {
    this.broadcastToStore(storeId, WS_EVENTS.PAYMENT_COMPLETED, {
      transaction,
      type: 'payment_completed',
    });
    console.log(`📤 PAYMENT_COMPLETED emitted for store ${storeId}`);
  }

  emitPaymentFailed(storeId: string, transaction: any, error?: string) {
    this.broadcastToStore(storeId, WS_EVENTS.PAYMENT_FAILED, {
      transaction,
      error,
      type: 'payment_failed',
    });
    console.log(`📤 PAYMENT_FAILED emitted for store ${storeId}`);
  }

  getConnectedClientsCount(): number {
    return this.wss?.clients.size || 0;
  }

  getStoreSubscribersCount(storeId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.storeId === storeId) count++;
    });
    return count;
  }
}

export const wsService = new WebSocketService();

export function setupWebSocket(app: express.Application, server: Server) {
  wsService.initialize(server);
  return wsService;
}
