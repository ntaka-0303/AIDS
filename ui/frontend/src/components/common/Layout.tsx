import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  FileText,
  Mic,
  MessageSquare,
  Play,
  Menu,
  X,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/wbs', icon: ListTodo, label: 'WBS' },
  { path: '/issues', icon: AlertCircle, label: '課題' },
  { path: '/risks', icon: AlertTriangle, label: 'リスク' },
  { path: '/questions', icon: HelpCircle, label: '未決事項' },
  { path: '/decisions', icon: CheckCircle, label: '決定事項' },
  { divider: true },
  { path: '/documents', icon: FileText, label: 'ドキュメント' },
  { path: '/hearings', icon: Mic, label: 'ヒアリング' },
  { divider: true },
  { path: '/chat', icon: MessageSquare, label: 'AIチャット' },
  { path: '/skills', icon: Play, label: 'スキル実行' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* サイドバー */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-white shadow-lg transition-all duration-300 flex flex-col`}
      >
        {/* ヘッダー */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <h1 className="text-lg font-bold text-gray-800">ProjectOps</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 py-4">
          {navItems.map((item, index) => {
            if ('divider' in item) {
              return <hr key={index} className="my-2 border-gray-200" />;
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* ヘッダー */}
        <header className="h-16 bg-white shadow-sm flex items-center px-6 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find((item) => 'path' in item && item.path === location.pathname)?.label || 'ProjectOps'}
          </h2>
        </header>

        {/* コンテンツ */}
        <div className="flex-1 p-6 min-h-0 min-w-0">
          <div className="h-full w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
