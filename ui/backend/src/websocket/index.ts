import { Server, Socket } from 'socket.io';
import chokidar from 'chokidar';
import { resolve } from 'path';
import { PROJECT_ROOT } from '../config.js';

export function setupWebSocket(io: Server) {
  // ファイル監視設定
  const watchPaths = [
    resolve(PROJECT_ROOT, 'project_state/**/*.yaml'),
    resolve(PROJECT_ROOT, 'project_state/**/*.md'),
    resolve(PROJECT_ROOT, 'outputs/**/*.md'),
    resolve(PROJECT_ROOT, 'inputs/hearings/**/*.md'),
    resolve(PROJECT_ROOT, 'inputs/hearings/_index.yaml'),
    resolve(PROJECT_ROOT, 'inputs/hearing_digests/**/*.yaml'),
  ];

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  // ファイル変更をクライアントに通知
  watcher.on('change', (path) => {
    console.log(`File changed: ${path}`);
    io.emit('file:change', {
      type: 'change',
      path: path.replace(PROJECT_ROOT + '/', ''),
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('add', (path) => {
    console.log(`File added: ${path}`);
    io.emit('file:change', {
      type: 'add',
      path: path.replace(PROJECT_ROOT + '/', ''),
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('unlink', (path) => {
    console.log(`File removed: ${path}`);
    io.emit('file:change', {
      type: 'unlink',
      path: path.replace(PROJECT_ROOT + '/', ''),
      timestamp: new Date().toISOString(),
    });
  });

  // クライアント接続ハンドリング
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  console.log('File watcher started');
}
