import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { VillageState, ServerToClientEvents, ClientToServerEvents } from '@shared/types';

const SERVER_URL = 'http://localhost:3001';

export function useVillageState() {
  const [state, setState] = useState<VillageState>({ projects: [], lastUpdated: '' });
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Village] Connected to server');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[Village] Disconnected from server');
    });

    socket.on('village:state', (newState: VillageState) => {
      setState(newState);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const requestRefresh = useCallback(() => {
    socketRef.current?.emit('village:request-state');
  }, []);

  return { state, connected, requestRefresh, socketRef };
}
