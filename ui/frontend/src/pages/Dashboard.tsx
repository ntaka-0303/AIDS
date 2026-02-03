import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { yamlApi } from '../services/api';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  HelpCircle,
  Calendar,
  AlertCircle,
} from 'lucide-react';

// 型定義
interface Task {
  id: string;
  title: string;
  phase: string;
  owner: string;
  status: string;
  due: string;
}

interface Issue {
  id: string;
  title: string;
  priority: string;
  owner: string;
  status: string;
  due?: string;
}

interface Risk {
  id: string;
  title: string;
  impact: string;
  probability: string;
  status: string;
  owner: string;
  score: number;
}

interface Question {
  id: string;
  title: string;
  priority: string;
  owner: string;
  status: string;
  due?: string;
}

// 今週の範囲を取得
function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// 日付が今週内かどうか
function isThisWeek(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const { start, end } = getThisWeekRange();
  return date >= start && date <= end;
}

// 日付が過去かどうか
function isPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function Dashboard() {
  const [stats, setStats] = useState({
    wbs: { total: 0, done: 0, inProgress: 0 },
    issues: { total: 0, open: 0 },
    risks: { total: 0, open: 0 },
    questions: { total: 0, open: 0 },
  });

  // 詳細リスト用のstate
  const [thisWeekTasks, setThisWeekTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [thisWeekIssues, setThisWeekIssues] = useState<Issue[]>([]);
  const [thisWeekQuestions, setThisWeekQuestions] = useState<Question[]>([]);
  const [highRisks, setHighRisks] = useState<Risk[]>([]);

  useEffect(() => {
    async function loadStats() {
      try {
        // WBS統計
        const wbsData = await yamlApi.readFile('wbs.yaml');
        const tasks: Task[] = wbsData.data?.tasks || [];
        setStats((prev) => ({
          ...prev,
          wbs: {
            total: tasks.length,
            done: tasks.filter((t) => t.status === 'Done').length,
            inProgress: tasks.filter((t) => t.status === 'InProgress').length,
          },
        }));

        // 今週予定のタスク（status が Done 以外で due が今週）
        setThisWeekTasks(
          tasks.filter((t) => t.status !== 'Done' && isThisWeek(t.due))
        );

        // 遅延タスク（status が Done 以外で due が過去）
        setOverdueTasks(
          tasks.filter((t) => t.status !== 'Done' && isPast(t.due))
        );

        // Issues統計
        const issuesData = await yamlApi.readFile('issues.yaml');
        const issues: Issue[] = issuesData.data?.issues || [];
        setStats((prev) => ({
          ...prev,
          issues: {
            total: issues.length,
            open: issues.filter((i) => i.status === 'Open' || i.status === 'InProgress').length,
          },
        }));

        // 今週期限の課題
        setThisWeekIssues(
          issues.filter(
            (i) => (i.status === 'Open' || i.status === 'InProgress') && i.due && isThisWeek(i.due)
          )
        );

        // Risks統計
        const risksData = await yamlApi.readFile('risks.yaml');
        const risks: Risk[] = risksData.data?.risks || [];
        setStats((prev) => ({
          ...prev,
          risks: {
            total: risks.length,
            open: risks.filter((r) => r.status === 'Open' || r.status === 'Monitoring').length,
          },
        }));

        // 高リスク（impact または probability が「高」、かつ Open/Monitoring）
        setHighRisks(
          risks.filter(
            (r) =>
              (r.status === 'Open' || r.status === 'Monitoring') &&
              (r.impact === '高' || r.probability === '高')
          )
        );

        // Questions統計
        const questionsData = await yamlApi.readFile('open_questions.yaml');
        const questions: Question[] = questionsData.data?.questions || [];
        setStats((prev) => ({
          ...prev,
          questions: {
            total: questions.length,
            open: questions.filter((q) => q.status === 'open').length,
          },
        }));

        // 今週中に解決したい未決事項
        setThisWeekQuestions(
          questions.filter((q) => q.status === 'open' && q.due && isThisWeek(q.due))
        );
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
    <div className="space-y-6 h-full overflow-auto">
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

      {/* 今週の概況 */}
      <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        今週の概況
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 遅延タスク */}
        <DetailSection
          title="遅延タスク"
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          items={overdueTasks}
          emptyMessage="遅延タスクはありません"
          linkTo="/wbs"
          color="red"
          renderItem={(task) => (
            <div key={task.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <Clock className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-red-600">{task.id}</span>
                  <StatusBadge status={task.status} type="task" />
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>期限: {task.due}</span>
                  <span>担当: {task.owner}</span>
                </div>
              </div>
            </div>
          )}
        />

        {/* 今週予定のタスク */}
        <DetailSection
          title="今週予定のタスク"
          icon={<CheckCircle className="w-5 h-5 text-blue-500" />}
          items={thisWeekTasks}
          emptyMessage="今週予定のタスクはありません"
          linkTo="/wbs"
          color="blue"
          renderItem={(task) => (
            <div key={task.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-blue-600">{task.id}</span>
                  <StatusBadge status={task.status} type="task" />
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>期限: {task.due}</span>
                  <span>担当: {task.owner}</span>
                </div>
              </div>
            </div>
          )}
        />

        {/* 今週期限の課題 */}
        <DetailSection
          title="今週期限の課題"
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          items={thisWeekIssues}
          emptyMessage="今週期限の課題はありません"
          linkTo="/issues"
          color="orange"
          renderItem={(issue) => (
            <div key={issue.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-orange-600">{issue.id}</span>
                  <PriorityBadge priority={issue.priority} />
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{issue.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>期限: {issue.due}</span>
                  <span>担当: {issue.owner}</span>
                </div>
              </div>
            </div>
          )}
        />

        {/* 今週解決したい未決事項 */}
        <DetailSection
          title="今週解決したい未決事項"
          icon={<HelpCircle className="w-5 h-5 text-purple-500" />}
          items={thisWeekQuestions}
          emptyMessage="今週期限の未決事項はありません"
          linkTo="/questions"
          color="purple"
          renderItem={(question) => (
            <div key={question.id} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <HelpCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-purple-600">{question.id}</span>
                  <PriorityBadge priority={question.priority} />
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{question.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>期限: {question.due}</span>
                  <span>担当: {question.owner}</span>
                </div>
              </div>
            </div>
          )}
        />
      </div>

      {/* 高リスク（フル幅） */}
      <DetailSection
        title="注意が必要なリスク（影響度・発生確率 高）"
        icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
        items={highRisks}
        emptyMessage="高リスクはありません"
        linkTo="/risks"
        color="yellow"
        renderItem={(risk) => (
          <div key={risk.id} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-yellow-700">{risk.id}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-200 text-yellow-800">
                  影響: {risk.impact}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-200 text-yellow-800">
                  確率: {risk.probability}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                  スコア: {risk.score}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-1">{risk.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>担当: {risk.owner}</span>
                <StatusBadge status={risk.status} type="risk" />
              </div>
            </div>
          </div>
        )}
      />
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

// 詳細セクションコンポーネント
function DetailSection<T>({
  title,
  icon,
  items,
  emptyMessage,
  linkTo,
  color,
  renderItem,
}: {
  title: string;
  icon: React.ReactNode;
  items: T[];
  emptyMessage: string;
  linkTo: string;
  color: 'blue' | 'red' | 'yellow' | 'purple' | 'orange';
  renderItem: (item: T) => React.ReactNode;
}) {
  const borderColors = {
    blue: 'border-blue-200',
    red: 'border-red-200',
    yellow: 'border-yellow-200',
    purple: 'border-purple-200',
    orange: 'border-orange-200',
  };

  return (
    <div className={`bg-white rounded-lg shadow border ${borderColors[color]}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {items.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {items.length}件
            </span>
          )}
        </div>
        <Link
          to={linkTo}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          詳細を見る →
        </Link>
      </div>
      <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{emptyMessage}</p>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
}

// ステータスバッジ
function StatusBadge({ status, type }: { status: string; type: 'task' | 'risk' }) {
  const taskColors: Record<string, string> = {
    Todo: 'bg-gray-100 text-gray-700',
    InProgress: 'bg-blue-100 text-blue-700',
    Done: 'bg-green-100 text-green-700',
    Blocked: 'bg-red-100 text-red-700',
  };

  const riskColors: Record<string, string> = {
    Open: 'bg-red-100 text-red-700',
    Monitoring: 'bg-yellow-100 text-yellow-700',
    Mitigated: 'bg-green-100 text-green-700',
    Realized: 'bg-purple-100 text-purple-700',
    Closed: 'bg-gray-100 text-gray-700',
  };

  const colors = type === 'task' ? taskColors : riskColors;
  const colorClass = colors[status] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colorClass}`}>
      {status}
    </span>
  );
}

// 優先度バッジ
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
  };

  const colorClass = colors[priority] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colorClass}`}>
      {priority}
    </span>
  );
}
