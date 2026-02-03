import { Router, Request, Response } from 'express';
import { readFile, writeFile, readdir, copyFile, access } from 'fs/promises';
import { resolve, basename } from 'path';
import yaml from 'js-yaml';
import { PROJECT_ROOT } from '../config.js';

const router = Router();
const hearingsPath = resolve(PROJECT_ROOT, 'inputs/hearings');
const indexPath = resolve(hearingsPath, '_index.yaml');

interface HearingEntry {
  id: string;
  title: string;
  date: string;
  participants?: string[];
  summary?: string;
  add_date: string;
  processed: 'Yes' | 'No';
}

interface HearingsIndex {
  hearings: HearingEntry[];
}

// _index.yamlを読み込む
async function readIndex(): Promise<HearingsIndex> {
  try {
    const content = await readFile(indexPath, 'utf-8');
    const data = yaml.load(content) as HearingsIndex;
    return data || { hearings: [] };
  } catch (error) {
    return { hearings: [] };
  }
}

// _index.yamlを保存
async function writeIndex(data: HearingsIndex): Promise<void> {
  // コメントを保持するためにヘッダーを追加
  const header = '# ヒアリングメモの一覧\n\n';
  const yamlContent = yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  await writeFile(indexPath, header + yamlContent, 'utf-8');
}

// 次のIDを生成
function generateNextId(entries: HearingEntry[]): string {
  const existingIds = entries
    .map((e) => e.id)
    .filter((id) => id && id.startsWith('HEAR-'));

  let maxNum = 0;
  for (const id of existingIds) {
    const numPart = id.replace('HEAR-', '');
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  return `HEAR-${String(maxNum + 1).padStart(3, '0')}`;
}

// ファイル名を生成（重複チェック付き）
async function generateFileName(date: string, topic: string): Promise<string> {
  const dateStr = date.replace(/-/g, '');
  // トピック名をサニタイズ（特殊文字を除去、空白をアンダースコアに）
  const sanitizedTopic = topic
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();

  let fileName = `${dateStr}_${sanitizedTopic}.md`;
  let counter = 1;

  // 重複チェック
  while (true) {
    const filePath = resolve(hearingsPath, fileName);
    try {
      await access(filePath);
      // ファイルが存在する場合、サフィックスを追加
      counter++;
      fileName = `${dateStr}_${sanitizedTopic}_${counter}.md`;
    } catch {
      // ファイルが存在しない場合、このファイル名を使用
      break;
    }
  }

  return fileName;
}

// ヒアリング一覧を取得
router.get('/', async (req: Request, res: Response) => {
  try {
    const data = await readIndex();
    res.json(data.hearings || []);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// ヒアリングファイル一覧を取得（Markdownファイル）
router.get('/files', async (req: Request, res: Response) => {
  try {
    const files = await readdir(hearingsPath);
    const mdFiles = files
      .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
      .map((f) => ({
        name: f,
        path: `inputs/hearings/${f}`,
      }));
    res.json(mdFiles);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// 新しいヒアリングを追加（内容貼付モード）
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, title, topic, participants, summary, content } = req.body;

    if (!date || !title || !content) {
      return res.status(400).json({
        error: 'date, title, and content are required',
      });
    }

    // ファイル名を生成
    const topicForFileName = topic || title;
    const fileName = await generateFileName(date, topicForFileName);
    const filePath = resolve(hearingsPath, fileName);

    // Markdownファイルを保存
    await writeFile(filePath, content, 'utf-8');

    // _index.yamlを更新
    const indexData = await readIndex();
    const newEntry: HearingEntry = {
      id: generateNextId(indexData.hearings),
      title,
      date,
      participants: participants || [],
      summary: summary || '',
      add_date: new Date().toISOString().split('T')[0],
      processed: 'No',
    };

    indexData.hearings.push(newEntry);
    await writeIndex(indexData);

    res.json({
      success: true,
      entry: newEntry,
      fileName,
      filePath: `inputs/hearings/${fileName}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// ファイルからヒアリングを追加（ファイル指定モード）
router.post('/from-file', async (req: Request, res: Response) => {
  try {
    const { sourcePath, date, title, topic, participants, summary } = req.body;

    if (!sourcePath || !date || !title) {
      return res.status(400).json({
        error: 'sourcePath, date, and title are required',
      });
    }

    // ソースファイルを読み込む
    const absoluteSourcePath = resolve(PROJECT_ROOT, sourcePath);
    let content: string;
    try {
      content = await readFile(absoluteSourcePath, 'utf-8');
    } catch {
      return res.status(400).json({
        error: `File not found: ${sourcePath}`,
      });
    }

    // ファイル名を生成
    const topicForFileName = topic || title;
    const fileName = await generateFileName(date, topicForFileName);
    const destPath = resolve(hearingsPath, fileName);

    // ファイルをコピー
    await writeFile(destPath, content, 'utf-8');

    // _index.yamlを更新
    const indexData = await readIndex();
    const newEntry: HearingEntry = {
      id: generateNextId(indexData.hearings),
      title,
      date,
      participants: participants || [],
      summary: summary || '',
      add_date: new Date().toISOString().split('T')[0],
      processed: 'No',
    };

    indexData.hearings.push(newEntry);
    await writeIndex(indexData);

    res.json({
      success: true,
      entry: newEntry,
      fileName,
      filePath: `inputs/hearings/${fileName}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// ファイル内容からメタデータを推測
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { content, fileName } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    // 日付の推測（ファイル名から、または内容から）
    let suggestedDate = new Date().toISOString().split('T')[0];
    if (fileName) {
      const dateMatch = fileName.match(/^(\d{4})[-]?(\d{2})[-]?(\d{2})/);
      if (dateMatch) {
        suggestedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }
    }

    // 内容から日付パターンを検索
    const contentDateMatch = content.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (contentDateMatch) {
      const month = contentDateMatch[2].padStart(2, '0');
      const day = contentDateMatch[3].padStart(2, '0');
      suggestedDate = `${contentDateMatch[1]}-${month}-${day}`;
    }

    // タイトルの推測（最初の見出しから）
    let suggestedTitle = '';
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      suggestedTitle = headingMatch[1].trim();
    } else {
      // ファイル名からトピックを抽出
      if (fileName) {
        const topicMatch = fileName.match(/\d{8}_(.+)\.md$/);
        if (topicMatch) {
          suggestedTitle = topicMatch[1].replace(/_/g, ' ');
        }
      }
    }

    // 参加者の推測（「参加者」「出席者」などのキーワードの後）
    const suggestedParticipants: string[] = [];
    const participantsMatch = content.match(/[参加者|出席者|メンバー][：:]\s*(.+)/);
    if (participantsMatch) {
      const participantsList = participantsMatch[1]
        .split(/[,、、]/)
        .map((p) => p.trim())
        .filter((p) => p);
      suggestedParticipants.push(...participantsList);
    }

    // サマリの推測（「概要」「目的」の後、または最初の段落）
    let suggestedSummary = '';
    const summaryMatch = content.match(/[概要|目的|サマリ][：:]\s*(.+)/);
    if (summaryMatch) {
      suggestedSummary = summaryMatch[1].trim().slice(0, 200);
    }

    res.json({
      suggestedDate,
      suggestedTitle,
      suggestedParticipants,
      suggestedSummary,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

export { router as hearingsRouter };
