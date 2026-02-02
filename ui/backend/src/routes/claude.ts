import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { ClaudeService } from '../services/claude.service.js';

export function createClaudeRouter(io: Server) {
  const router = Router();
  const claudeService = new ClaudeService();

  // 利用可能なスキル一覧
  router.get('/skills', (req: Request, res: Response) => {
    const skills = claudeService.getAvailableSkills();
    res.json(skills);
  });

  // スキル実行
  router.post('/execute', async (req: Request, res: Response) => {
    const { command, sessionId } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const execId = sessionId || `exec-${Date.now()}`;

    try {
      // 実行開始を通知
      io.emit('claude:start', { execId, command });

      // Claude CLI実行（ストリーミング）
      const result = await claudeService.execute(command, (chunk) => {
        io.emit('claude:output', { execId, chunk });
      });

      // 実行完了を通知
      io.emit('claude:complete', { execId, result });

      res.json({ execId, status: 'completed', result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      io.emit('claude:error', { execId, error: errorMessage });
      res.status(500).json({ execId, status: 'error', error: errorMessage });
    }
  });

  // チャットメッセージ送信
  router.post('/chat', async (req: Request, res: Response) => {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const execId = sessionId || `chat-${Date.now()}`;

    try {
      io.emit('claude:start', { execId, command: message });

      const result = await claudeService.chat(message, (chunk) => {
        io.emit('claude:output', { execId, chunk });
      });

      io.emit('claude:complete', { execId, result });

      res.json({ execId, status: 'completed', result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      io.emit('claude:error', { execId, error: errorMessage });
      res.status(500).json({ execId, status: 'error', error: errorMessage });
    }
  });

  // 実行中のプロセスを停止
  router.post('/stop', (req: Request, res: Response) => {
    const { execId } = req.body;
    claudeService.stop(execId);
    res.json({ success: true });
  });

  return router;
}
