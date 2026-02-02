import { spawn, ChildProcess } from 'child_process';
import { PROJECT_ROOT } from '../config.js';

interface Skill {
  id: string;
  name: string;
  command: string;
  description: string;
}

export class ClaudeService {
  private runningProcesses: Map<string, ChildProcess> = new Map();

  getAvailableSkills(): Skill[] {
    return [
      {
        id: 'intake',
        name: 'ヒアリング取り込み',
        command: 'intakeを実行',
        description: 'inputs/hearings/のメモを処理し、project_state/を更新',
      },
      {
        id: 'docgen-proposal',
        name: '提案書生成',
        command: '提案書を生成',
        description: 'テンプレートとproject_stateから提案書ドラフトを生成',
      },
      {
        id: 'docgen-plan',
        name: '計画書生成',
        command: '計画書を生成',
        description: 'テンプレートとproject_stateから計画書ドラフトを生成',
      },
      {
        id: 'docgen-requirements',
        name: '要件定義書生成',
        command: '要件定義書を生成',
        description: 'テンプレートとproject_stateから要件定義書ドラフトを生成',
      },
      {
        id: 'quality-gate',
        name: '品質チェック',
        command: 'quality gateを実行',
        description: '成果物とproject_stateの整合性・完全性をチェック',
      },
      {
        id: 'weekly-report',
        name: '週次報告書生成',
        command: '週次報告を生成',
        description: 'WBS/課題/リスクから週次報告書を生成',
      },
      {
        id: 'project-mgmt-wbs',
        name: 'WBS更新',
        command: 'WBSを更新',
        description: 'WBSタスクの状態を更新',
      },
    ];
  }

  async execute(
    command: string,
    onOutput: (chunk: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const execId = `exec-${Date.now()}`;
      let output = '';

      // Claude CLIを--printモードで実行
      const proc = spawn('claude', ['--print', command], {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          // 必要に応じて環境変数を追加
        },
        shell: true,
      });

      this.runningProcesses.set(execId, proc);

      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        onOutput(chunk);
      });

      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        onOutput(chunk);
      });

      proc.on('close', (code) => {
        this.runningProcesses.delete(execId);
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        this.runningProcesses.delete(execId);
        reject(error);
      });
    });
  }

  async chat(
    message: string,
    onOutput: (chunk: string) => void
  ): Promise<string> {
    // チャットも同じ仕組みで実行
    return this.execute(message, onOutput);
  }

  stop(execId: string): boolean {
    const proc = this.runningProcesses.get(execId);
    if (proc) {
      proc.kill('SIGTERM');
      this.runningProcesses.delete(execId);
      return true;
    }
    return false;
  }
}
