import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { resolve, join, relative } from 'path';
import { PROJECT_ROOT } from '../config.js';

interface MarkdownFileInfo {
  name: string;
  path: string;
  category: 'project_state' | 'outputs' | 'hearings' | 'reviews' | 'templates';
}

export class MarkdownService {
  async listMarkdownFiles(): Promise<MarkdownFileInfo[]> {
    const files: MarkdownFileInfo[] = [];

    // project_state内のMarkdownファイル
    const projectStateFiles = await this.getFilesInDir(
      resolve(PROJECT_ROOT, 'project_state'),
      '*.md'
    );
    for (const f of projectStateFiles) {
      files.push({
        name: f.name,
        path: f.path,
        category: 'project_state',
      });
    }

    // outputs内のMarkdownファイル
    const outputFiles = await this.getFilesInDir(
      resolve(PROJECT_ROOT, 'outputs'),
      '*.md'
    );
    for (const f of outputFiles) {
      files.push({
        name: f.name,
        path: f.path,
        category: 'outputs',
      });
    }

    // outputs/reviews内のMarkdownファイル
    const reviewFiles = await this.getFilesInDir(
      resolve(PROJECT_ROOT, 'outputs/reviews'),
      '*.md'
    );
    for (const f of reviewFiles) {
      files.push({
        name: f.name,
        path: f.path,
        category: 'reviews',
      });
    }

    // inputs/hearings内のMarkdownファイル
    const hearingFiles = await this.getFilesInDir(
      resolve(PROJECT_ROOT, 'inputs/hearings'),
      '*.md'
    );
    for (const f of hearingFiles) {
      files.push({
        name: f.name,
        path: f.path,
        category: 'hearings',
      });
    }

    // templates内のMarkdownファイル
    const templateFiles = await this.getFilesInDir(
      resolve(PROJECT_ROOT, 'templates'),
      '*.md'
    );
    for (const f of templateFiles) {
      files.push({
        name: f.name,
        path: f.path,
        category: 'templates',
      });
    }

    return files;
  }

  async readFile(relativePath: string): Promise<string> {
    // パストラバーサル対策
    const safePath = this.sanitizePath(relativePath);
    const fullPath = resolve(PROJECT_ROOT, safePath);

    return await readFile(fullPath, 'utf-8');
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    // パストラバーサル対策
    const safePath = this.sanitizePath(relativePath);
    const fullPath = resolve(PROJECT_ROOT, safePath);

    // templates/は書き込み禁止
    if (safePath.startsWith('templates/')) {
      throw new Error('Cannot write to templates directory');
    }

    await writeFile(fullPath, content, 'utf-8');
  }

  private async getFilesInDir(
    dirPath: string,
    pattern: string
  ): Promise<{ name: string; path: string }[]> {
    const files: { name: string; path: string }[] = [];

    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);

        if (stats.isFile() && entry.endsWith('.md')) {
          files.push({
            name: entry,
            path: relative(PROJECT_ROOT, fullPath),
          });
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は空配列を返す
      console.warn(`Directory not found: ${dirPath}`);
    }

    return files;
  }

  private sanitizePath(inputPath: string): string {
    // パストラバーサル対策
    const normalized = inputPath
      .replace(/\.\./g, '')
      .replace(/\/\//g, '/')
      .replace(/^\//, '');

    return normalized;
  }
}
