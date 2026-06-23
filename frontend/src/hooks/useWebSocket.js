import { useEffect, useRef, useCallback } from 'react';
import { createWebSocket } from '../utils/api';

export function useWebSocket(onMessage) {
  const wsRef = useRef(null);
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return;

    const ws = createWebSocket((msg) => cbRef.current(msg));

    ws.onclose = () => {
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
}
