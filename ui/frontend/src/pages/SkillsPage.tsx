import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, CheckCircle, XCircle, FileText, Upload, ClipboardCheck, Calendar } from 'lucide-react';
import { claudeApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Skill } from '../types';

interface ExecutionLog {
  execId: string;
  skill: Skill;
  status: 'running' | 'completed' | 'error';
  output: string;
  startTime: Date;
  endTime?: Date;
}

// スキルカテゴリの定義
const skillCategories = [
  {
    id: 'intake',
    name: '取り込み',
    icon: Upload,
    color: 'blue',
    skills: ['intake'],
  },
  {
    id: 'docgen',
    name: 'ドキュメント生成',
    icon: FileText,
    color: 'green',
    skills: ['docgen-proposal', 'docgen-plan', 'docgen-requirements'],
  },
  {
    id: 'quality',
    name: '品質管理',
    icon: ClipboardCheck,
    color: 'purple',
    skills: ['quality-gate'],
  },
  {
    id: 'report',
    name: 'レポート',
    icon: Calendar,
    color: 'orange',
    skills: ['weekly-report'],
  },
];

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [runningSkill, setRunningSkill] = useState<string | null>(null);
  const [currentOutput, setCurrentOutput] = useState('');
  const currentOutputRef = useRef('');
  const outputContainerRef = useRef<HTMLPreElement>(null);

  // 出力を更新する際にrefも更新
  const updateOutput = useCallback((chunk: string) => {
    currentOutputRef.current += chunk;
    setCurrentOutput(currentOutputRef.current);
  }, []);

  useEffect(() => {
    async function loadSkills() {
      try {
        const data = await claudeApi.getSkills();
        setSkills(data);
      } catch (error) {
        console.error('Failed to load skills:', error);
      }
    }
    loadSkills();

    socketService.connect();

    const unsubOutput = socketService.on('claude:output', (event: { execId: string; chunk: string }) => {
      updateOutput(event.chunk);
    });

    const unsubComplete = socketService.on('claude:complete', (event: { execId: string }) => {
      setExecutionLogs((prev) =>
        prev.map((log) =>
          log.execId === event.execId
            ? { ...log, status: 'completed', output: currentOutputRef.current, endTime: new Date() }
            : log
        )
      );
      setRunningSkill(null);
      currentOutputRef.current = '';
      setCurrentOutput('');
    });

    const unsubError = socketService.on('claude:error', (event: { execId: string; error: string }) => {
      setExecutionLogs((prev) =>
        prev.map((log) =>
          log.execId === event.execId
            ? { ...log, status: 'error', output: event.error, endTime: new Date() }
            : log
        )
      );
      setRunningSkill(null);
      currentOutputRef.current = '';
      setCurrentOutput('');
    });

    return () => {
      unsubOutput();
      unsubComplete();
      unsubError();
    };
  }, [updateOutput]);

  // 自動スクロール
  useEffect(() => {
    if (outputContainerRef.current) {
      outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
    }
  }, [currentOutput]);

  const handleExecuteSkill = async (skill: Skill) => {
    if (runningSkill) return;

    setRunningSkill(skill.id);
    currentOutputRef.current = '';
    setCurrentOutput('');

    const execId = `exec-${Date.now()}`;
    const newLog: ExecutionLog = {
      execId,
      skill,
      status: 'running',
      output: '',
      startTime: new Date(),
    };

    setExecutionLogs((prev) => [newLog, ...prev]);

    try {
      await claudeApi.execute(skill.command, execId);
    } catch (error) {
      console.error('Skill execution error:', error);
      setExecutionLogs((prev) =>
        prev.map((log) =>
          log.execId === execId
            ? { ...log, status: 'error', output: String(error), endTime: new Date() }
            : log
        )
      );
      setRunningSkill(null);
    }
  };

  const getSkillsByCategory = (categorySkillIds: string[]) => {
    return skills.filter((s) => categorySkillIds.includes(s.id));
  };

  const colorClasses: Record<string, string> = {
    blue: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
    green: 'border-green-200 hover:border-green-400 hover:bg-green-50',
    purple: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50',
    orange: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50',
  };

  const iconColorClasses: Record<string, string> = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
  };

  return (
    <div className="space-y-6">
      {/* スキルカテゴリ */}
      {skillCategories.map((category) => {
        const categorySkills = getSkillsByCategory(category.skills);
        if (categorySkills.length === 0) return null;

        const Icon = category.icon;

        return (
          <div key={category.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon size={20} className={iconColorClasses[category.color]} />
              {category.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorySkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleExecuteSkill(skill)}
                  disabled={runningSkill !== null}
                  className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
                    runningSkill === skill.id
                      ? 'bg-blue-50 border-blue-300'
                      : runningSkill
                      ? 'opacity-50 cursor-not-allowed border-gray-200'
                      : colorClasses[category.color]
                  }`}
                >
                  <div className="mt-1">
                    {runningSkill === skill.id ? (
                      <Loader2 size={20} className="animate-spin text-blue-500" />
                    ) : (
                      <Play size={20} className={iconColorClasses[category.color]} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{skill.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* 実行中の出力 */}
      {runningSkill && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            実行中...
          </h3>
          <pre
            ref={outputContainerRef}
            className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto"
          >
            {currentOutput || 'Waiting for output...'}
          </pre>
        </div>
      )}

      {/* 実行履歴 */}
      {executionLogs.filter((log) => log.status !== 'running').length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">実行履歴</h3>
          <div className="space-y-4">
            {executionLogs
              .filter((log) => log.status !== 'running')
              .slice(0, 10)
              .map((log) => (
                <details
                  key={log.execId}
                  className="border rounded-lg overflow-hidden"
                >
                  <summary
                    className={`px-4 py-2 flex items-center justify-between cursor-pointer ${
                      log.status === 'completed'
                        ? 'bg-green-50 hover:bg-green-100'
                        : 'bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {log.status === 'completed' ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <XCircle size={16} className="text-red-500" />
                      )}
                      <span className="font-medium">{log.skill.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {log.startTime.toLocaleTimeString()}
                      {log.endTime && ` - ${log.endTime.toLocaleTimeString()}`}
                    </span>
                  </summary>
                  {log.output && (
                    <pre className="bg-gray-900 text-gray-100 p-4 text-sm max-h-64 overflow-y-auto">
                      {log.output}
                    </pre>
                  )}
                </details>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
