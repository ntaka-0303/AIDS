import { io, Socket } from 'socket.io-client';
import type { FileChangeEvent, ClaudeOutputEvent, ClaudeCompleteEvent } from '../types';

const SOCKET_URL = 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL);

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // ファイル変更イベント
    this.socket.on('file:change', (event: FileChangeEvent) => {
      this.emit('file:change', event);
    });

    // Claude出力イベント
    this.socket.on('claude:start', (event: { execId: string; command: string }) => {
      this.emit('claude:start', event);
    });

    this.socket.on('claude:output', (event: ClaudeOutputEvent) => {
      this.emit('claude:output', event);
    });

    this.socket.on('claude:complete', (event: ClaudeCompleteEvent) => {
      this.emit('claude:complete', event);
    });

    this.socket.on('claude:error', (event: { execId: string; error: string }) => {
      this.emit('claude:error', event);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // クリーンアップ関数を返す
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }
}

export const socketService = new SocketService();
