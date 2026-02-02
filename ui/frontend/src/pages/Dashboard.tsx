import { useEffect, useState } from 'react';
import { yamlApi } from '../services/api';

export function Dashboard() {
  const [stats, setStats] = useState({
    wbs: { total: 0, done: 0, inProgress: 0 },
    issues: { total: 0, open: 0 },
    risks: { total: 0, open: 0 },
    questions: { total: 0, open: 0 },
  });

  useEffect(() => {
    async function loadStats() {
      try {
        // WBS統計
        const wbsData = await yamlApi.readFile('wbs.yaml');
        const tasks = wbsData.data?.tasks || [];
        setStats((prev) => ({
          ...prev,
          wbs: {
            total: tasks.length,
            done: tasks.filter((t: any) => t.status === 'Done').length,
            inProgress: tasks.filter((t: any) => t.status === 'InProgress').length,
          },
        }));

        // Issues統計
        const issuesData = await yamlApi.readFile('issues.yaml');
        const issues = issuesData.data?.issues || [];
        setStats((prev) => ({
          ...prev,
          issues: {
            total: issues.length,
            open: issues.filter((i: any) => i.status === 'Open' || i.status === 'InProgress').length,
          },
        }));

        // Risks統計
        const risksData = await yamlApi.readFile('risks.yaml');
        const risks = risksData.data?.risks || [];
        setStats((prev) => ({
          ...prev,
          risks: {
            total: risks.length,
            open: risks.filter((r: any) => r.status === 'Open' || r.status === 'Monitoring').length,
          },
        }));

        // Questions統計
        const questionsData = await yamlApi.readFile('open_questions.yaml');
        const questions = questionsData.data?.questions || [];
        setStats((prev) => ({
          ...prev,
          questions: {
            total: questions.length,
            open: questions.filter((q: any) => q.status === 'open').length,
          },
        }));
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }

    loadStats();
  }, []);

  const progressPercent = stats.wbs.total > 0
    ? Math.round((stats.wbs.done / stats.wbs.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 進捗サマリ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">プロジェクト進捗</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className="text-2xl font-bold text-blue-600">{progressPercent}%</span>
        </div>
        <p className="mt-2 text-gray-600">
          {stats.wbs.done} / {stats.wbs.total} タスク完了
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="WBSタスク"
          value={stats.wbs.total}
          subValue={`${stats.wbs.inProgress} 進行中`}
          color="blue"
        />
        <StatCard
          title="課題"
          value={stats.issues.total}
          subValue={`${stats.issues.open} オープン`}
          color="red"
        />
        <StatCard
          title="リスク"
          value={stats.risks.total}
          subValue={`${stats.risks.open} 監視中`}
          color="yellow"
        />
        <StatCard
          title="未決事項"
          value={stats.questions.total}
          subValue={`${stats.questions.open} 未解決`}
          color="purple"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subValue,
  color,
}: {
  title: string;
  value: number;
  subValue: string;
  color: 'blue' | 'red' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <h4 className="text-sm font-medium opacity-80">{title}</h4>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-sm mt-1 opacity-70">{subValue}</p>
    </div>
  );
}
