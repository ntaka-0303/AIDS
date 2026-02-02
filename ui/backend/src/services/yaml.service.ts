import { readFile, writeFile, readdir } from 'fs/promises';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { PROJECT_ROOT } from '../config.js';

interface YamlFileInfo {
  name: string;
  path: string;
  schemaName?: string;
}

interface SchemaInfo {
  name: string;
  path: string;
}

export class YamlService {
  private projectStatePath = resolve(PROJECT_ROOT, 'project_state');
  private schemasPath = resolve(PROJECT_ROOT, 'project_state/schemas');

  // YAMLファイルとスキーマのマッピング
  private fileSchemaMap: Record<string, string> = {
    'wbs.yaml': 'wbs.schema.yaml',
    'issues.yaml': 'issues.schema.yaml',
    'risks.yaml': 'risks.schema.yaml',
    'decisions.yaml': 'decisions.schema.yaml',
    'open_questions.yaml': 'open_questions.schema.yaml',
    'change_log.yaml': 'change_log.schema.yaml',
  };

  // ルートキーのマッピング
  private fileRootKeyMap: Record<string, string> = {
    'wbs.yaml': 'tasks',
    'issues.yaml': 'issues',
    'risks.yaml': 'risks',
    'decisions.yaml': 'decisions',
    'open_questions.yaml': 'questions',
    'change_log.yaml': 'changes',
  };

  async listYamlFiles(): Promise<YamlFileInfo[]> {
    const files = await readdir(this.projectStatePath);
    return files
      .filter((f) => f.endsWith('.yaml') && !f.endsWith('.schema.yaml'))
      .map((name) => ({
        name,
        path: `project_state/${name}`,
        schemaName: this.fileSchemaMap[name],
      }));
  }

  async listSchemas(): Promise<SchemaInfo[]> {
    const files = await readdir(this.schemasPath);
    return files
      .filter((f) => f.endsWith('.schema.yaml'))
      .map((name) => ({
        name,
        path: `project_state/schemas/${name}`,
      }));
  }

  async getSchema(name: string): Promise<any> {
    const schemaPath = resolve(this.schemasPath, name);
    const content = await readFile(schemaPath, 'utf-8');
    return yaml.load(content);
  }

  async readYamlFile(fileName: string): Promise<any> {
    const filePath = resolve(this.projectStatePath, fileName);
    const content = await readFile(filePath, 'utf-8');
    const data = yaml.load(content);

    // スキーマ情報も一緒に返す
    const schemaName = this.fileSchemaMap[fileName];
    let schema = null;
    if (schemaName) {
      try {
        schema = await this.getSchema(schemaName);
      } catch (e) {
        console.warn(`Schema not found for ${fileName}`);
      }
    }

    return {
      data,
      rootKey: this.fileRootKeyMap[fileName],
      schema,
    };
  }

  async writeYamlFile(fileName: string, data: any): Promise<void> {
    const filePath = resolve(this.projectStatePath, fileName);
    const content = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
    await writeFile(filePath, content, 'utf-8');
  }

  async updateEntry(fileName: string, id: string, updates: any): Promise<void> {
    const { data, rootKey } = await this.readYamlFile(fileName);

    if (!rootKey || !data[rootKey]) {
      throw new Error(`Invalid file structure for ${fileName}`);
    }

    const entries = data[rootKey] as any[];
    const index = entries.findIndex((e) => e.id === id);

    if (index === -1) {
      throw new Error(`Entry with id ${id} not found`);
    }

    entries[index] = { ...entries[index], ...updates };
    await this.writeYamlFile(fileName, data);
  }

  async addEntry(fileName: string, entry: any): Promise<any> {
    const { data, rootKey, schema } = await this.readYamlFile(fileName);

    if (!rootKey || !data[rootKey]) {
      throw new Error(`Invalid file structure for ${fileName}`);
    }

    // ID自動採番
    if (!entry.id && schema?.id_generation) {
      entry.id = this.generateId(data[rootKey], schema.id_generation);
    }

    data[rootKey].push(entry);
    await this.writeYamlFile(fileName, data);

    return entry;
  }

  async deleteEntry(fileName: string, id: string): Promise<void> {
    const { data, rootKey } = await this.readYamlFile(fileName);

    if (!rootKey || !data[rootKey]) {
      throw new Error(`Invalid file structure for ${fileName}`);
    }

    const entries = data[rootKey] as any[];
    const index = entries.findIndex((e) => e.id === id);

    if (index === -1) {
      throw new Error(`Entry with id ${id} not found`);
    }

    entries.splice(index, 1);
    await this.writeYamlFile(fileName, data);
  }

  private generateId(entries: any[], idGeneration: any): string {
    const { prefix, format } = idGeneration;

    // 既存IDから最大番号を取得
    const existingIds = entries
      .map((e) => e.id)
      .filter((id) => id && id.startsWith(prefix));

    let maxNum = 0;
    for (const id of existingIds) {
      const numPart = id.replace(prefix, '').replace('-', '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }

    const nextNum = maxNum + 1;

    // フォーマットに応じてIDを生成
    if (format === '{prefix}-{seq:3}') {
      return `${prefix}-${String(nextNum).padStart(3, '0')}`;
    }

    return `${prefix}-${String(nextNum).padStart(2, '0')}`;
  }
}
