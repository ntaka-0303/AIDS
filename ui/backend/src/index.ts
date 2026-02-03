import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PROJECT_ROOT } from './config.js';
import { setupWebSocket } from './websocket/index.js';
import { yamlRouter } from './routes/yaml.js';
import { markdownRouter } from './routes/markdown.js';
import { createClaudeRouter } from './routes/claude.js';
import { hearingsRouter } from './routes/hearings.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO設定
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// ミドルウェア
app.use(cors({
  origin: 'http://localhost:5173',
}));
app.use(express.json());

// ルート
app.use('/api/yaml', yamlRouter);
app.use('/api/markdown', markdownRouter);
app.use('/api/claude', createClaudeRouter(io));
app.use('/api/hearings', hearingsRouter);

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', projectRoot: PROJECT_ROOT });
});

// WebSocket設定
setupWebSocket(io);

// サーバー起動
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Project root: ${PROJECT_ROOT}`);
});

export { io };
