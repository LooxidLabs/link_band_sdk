import { useEffect, useRef, useState, useCallback } from 'react';

interface SensorData {
  eeg?: Array<any>;
  ppg?: Array<any>;
  acc?: Array<any>;
}

interface WebSocketMessage {
  type: string;
  event_type?: string;
  data?: any;
  eeg?: Array<any>;
  ppg?: Array<any>;
  acc?: Array<any>;
}

interface SendMessageOptions {
  command: string;
  payload?: any;
}

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
      const socket = new WebSocket('ws://localhost:8765');

      socket.onopen = () => {
        console.log('WebSocket Connected');
        setIsConnected(true);
      };

      socket.onclose = () => {
        console.log('WebSocket Disconnected');
        setIsConnected(false);
        // Try to reconnect after 1 second
        setTimeout(connect, 1000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current = socket;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((options: SendMessageOptions) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(options));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}; 