import { Router, Request, Response } from 'express';
import { YamlService } from '../services/yaml.service.js';

const router = Router();
const yamlService = new YamlService();

// YAMLファイル一覧取得
router.get('/files', async (req: Request, res: Response) => {
  try {
    const files = await yamlService.listYamlFiles();
    res.json(files);
  } catch (error) {
    console.error('Error listing YAML files:', error);
    res.status(500).json({ error: 'Failed to list YAML files' });
  }
});

// スキーマ一覧取得
router.get('/schemas', async (req: Request, res: Response) => {
  try {
    const schemas = await yamlService.listSchemas();
    res.json(schemas);
  } catch (error) {
    console.error('Error listing schemas:', error);
    res.status(500).json({ error: 'Failed to list schemas' });
  }
});

// 特定のスキーマ取得
router.get('/schemas/:name', async (req: Request, res: Response) => {
  try {
    const schema = await yamlService.getSchema(req.params.name);
    res.json(schema);
  } catch (error) {
    console.error('Error getting schema:', error);
    res.status(500).json({ error: 'Failed to get schema' });
  }
});

// YAMLファイル読み込み
router.get('/:file', async (req: Request, res: Response) => {
  try {
    const data = await yamlService.readYamlFile(req.params.file);
    res.json(data);
  } catch (error) {
    console.error('Error reading YAML file:', error);
    res.status(500).json({ error: 'Failed to read YAML file' });
  }
});

// YAMLファイル全体更新
router.put('/:file', async (req: Request, res: Response) => {
  try {
    await yamlService.writeYamlFile(req.params.file, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing YAML file:', error);
    res.status(500).json({ error: 'Failed to write YAML file' });
  }
});

// 単一エントリ更新（PATCH）
router.patch('/:file/:id', async (req: Request, res: Response) => {
  try {
    await yamlService.updateEntry(req.params.file, req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// 新規エントリ追加
router.post('/:file', async (req: Request, res: Response) => {
  try {
    const newEntry = await yamlService.addEntry(req.params.file, req.body);
    res.json(newEntry);
  } catch (error) {
    console.error('Error adding entry:', error);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

// エントリ削除
router.delete('/:file/:id', async (req: Request, res: Response) => {
  try {
    await yamlService.deleteEntry(req.params.file, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export { router as yamlRouter };
