import { useEffect, useRef, useState, useCallback } from 'react';

type TimeoutId = ReturnType<typeof setTimeout>;

const WS_RECONNECT_INTERVAL = 3000;
const WS_MAX_RECONNECT_ATTEMPTS = 10;

export interface RealtimeTransaction {
  id: string;
  total: string;
  subtotal: string;
  tax: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: number;
  }[];
  kiosk?: {
    deviceName: string;
  };
}

export interface WSMessage {
  event: string;
  payload: any;
  storeId?: string;
  timestamp: string;
}

interface UseRealtimeOptions {
  storeId: string;
  token: string;
  onNewTransaction?: (transaction: RealtimeTransaction) => void;
  onLowStockAlert?: (product: any) => void;
  onKioskHeartbeat?: (kiosk: any) => void;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  reconnect: () => void;
}

export function useRealtime({
  storeId,
  token,
  onNewTransaction,
  onLowStockAlert,
  onKioskHeartbeat,
}: UseRealtimeOptions): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<TimeoutId | null>(null);

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = 4000;
    return `${protocol}//${host}:${port}/ws`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = getWebSocketUrl();
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      ws.send(JSON.stringify({
        type: 'SUBSCRIBE_STORE',
        storeId,
        token,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        setLastMessage(message);

        switch (message.event) {
          case 'NEW_TRANSACTION':
            if (onNewTransaction && message.payload.transaction) {
              onNewTransaction(message.payload.transaction);
            }
            break;
          case 'LOW_STOCK_ALERT':
            if (onLowStockAlert && message.payload.product) {
              onLowStockAlert(message.payload.product);
            }
            break;
          case 'KIOSK_HEARTBEAT':
            if (onKioskHeartbeat && message.payload.kiosk) {
              onKioskHeartbeat(message.payload.kiosk);
            }
            break;
          case 'STORE_SUBSCRIBED':
            console.log('📡 Subscribed to store:', message.payload.storeId);
            break;
          case 'CONNECTION_ACK':
            console.log('🫡 Connection acknowledged');
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;

      if (reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        console.log(`🔄 Reconnecting... (attempt ${reconnectAttemptsRef.current}/${WS_MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimeoutRef.current = setTimeout(connect, WS_RECONNECT_INTERVAL);
      } else {
        console.error('❌ Max reconnection attempts reached');
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
  }, [storeId, token, getWebSocketUrl, onNewTransaction, onLowStockAlert, onKioskHeartbeat]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    if (storeId && token) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [storeId, token, connect]);

  return {
    isConnected,
    lastMessage,
    reconnect,
  };
}
