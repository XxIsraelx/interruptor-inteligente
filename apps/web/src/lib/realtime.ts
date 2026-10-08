'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from './api';

let socket: Socket | null = null;

/** Socket único compartilhado pela aplicação (criado sob demanda). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL || undefined, {
      auth: (cb) => cb({ token: getToken() }),
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}

/** Escuta um evento do servidor: 'device:update' | 'reading' | 'event'. */
export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = getSocket();
    const fn = (data: T) => ref.current(data);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event]);
}

/** true quando o navegador está conectado ao tempo real. */
export function useLiveStatus() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const s = getSocket();
    const on = () => setLive(true);
    const off = () => setLive(false);
    setLive(s.connected);
    s.on('connect', on);
    s.on('disconnect', off);
    return () => {
      s.off('connect', on);
      s.off('disconnect', off);
    };
  }, []);
  return live;
}
