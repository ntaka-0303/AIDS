import { Router, Request, Response } from 'express';
import { MarkdownService } from '../services/markdown.service.js';

const router = Router();
const markdownService = new MarkdownService();

// Markdownファイル一覧取得
router.get('/files', async (req: Request, res: Response) => {
  try {
    const files = await markdownService.listMarkdownFiles();
    res.json(files);
  } catch (error) {
    console.error('Error listing markdown files:', error);
    res.status(500).json({ error: 'Failed to list markdown files' });
  }
});

// Markdownファイル読み込み
router.get('/read', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    const content = await markdownService.readFile(filePath);
    res.json({ content, path: filePath });
  } catch (error) {
    console.error('Error reading markdown file:', error);
    res.status(500).json({ error: 'Failed to read markdown file' });
  }
});

// Markdownファイル保存
router.put('/write', async (req: Request, res: Response) => {
  try {
    const { path, content } = req.body;
    if (!path || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }
    await markdownService.writeFile(path, content);
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing markdown file:', error);
    res.status(500).json({ error: 'Failed to write markdown file' });
  }
});

export { router as markdownRouter };
