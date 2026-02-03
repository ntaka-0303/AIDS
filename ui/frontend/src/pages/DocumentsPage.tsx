import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownApi } from '../services/api';
import type { MarkdownFileInfo } from '../types';
import { FileText, ChevronRight, BookOpen, FileCheck, ClipboardList, CalendarDays } from 'lucide-react';

export function DocumentsPage() {
  const [files, setFiles] = useState<MarkdownFileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFiles() {
      try {
        const data = await markdownApi.listFiles();
        setFiles(data);
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    }
    loadFiles();
  }, []);

  const handleSelectFile = async (path: string) => {
    setSelectedFile(path);
    setLoading(true);
    try {
      const data = await markdownApi.readFile(path);
      setContent(data.content);
    } catch (error) {
      console.error('Failed to load file:', error);
      setContent('ファイルの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ドキュメントページ用にフィルタリング
  // - プロジェクト概要: project_charter.mdのみ
  // - 成果物: outputs/（weekly_report*を除く）
  // - 週次進捗報告書: weekly_report*.md
  // - レビュー: reviews/
  const filteredFiles = files.filter((file) => {
    if (file.category === 'project_state') {
      return file.name === 'project_charter.md';
    }
    return file.category === 'outputs' || file.category === 'reviews';
  });

  // カテゴリ別にグループ化
  const groupedFiles = filteredFiles.reduce((acc, file) => {
    let category = file.category;

    // project_charter.mdは「プロジェクト概要」として表示
    if (file.category === 'project_state' && file.name === 'project_charter.md') {
      category = 'overview' as any;
    }
    // weekly_report*.mdは「週次進捗報告書」として表示
    else if (file.category === 'outputs' && file.name.startsWith('weekly_report')) {
      category = 'weekly_reports' as any;
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(file);
    return acc;
  }, {} as Record<string, MarkdownFileInfo[]>);

  const categoryConfig: Record<string, { label: string; icon: typeof FileText }> = {
    overview: { label: 'プロジェクト概要', icon: BookOpen },
    outputs: { label: '成果物', icon: FileCheck },
    weekly_reports: { label: '週次進捗報告書', icon: CalendarDays },
    reviews: { label: 'レビュー', icon: ClipboardList },
  };

  // 表示順序
  const categoryOrder = ['overview', 'outputs', 'weekly_reports', 'reviews'];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* ファイルリスト */}
      <div className="w-64 bg-white rounded-lg shadow overflow-y-auto">
        {categoryOrder.map((category) => {
          const categoryFiles = groupedFiles[category];
          if (!categoryFiles || categoryFiles.length === 0) return null;

          const config = categoryConfig[category];
          const Icon = config?.icon || FileText;

          return (
            <div key={category} className="border-b last:border-b-0">
              <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 flex items-center gap-2">
                <Icon size={14} />
                {config?.label || category}
              </h3>
              <ul>
                {categoryFiles.map((file) => (
                  <li key={file.path}>
                    <button
                      onClick={() => handleSelectFile(file.path)}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedFile === file.path ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      <FileText size={16} />
                      <span className="truncate">{file.name}</span>
                      <ChevronRight size={14} className="ml-auto opacity-50" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {filteredFiles.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            ドキュメントがありません
          </div>
        )}
      </div>

      {/* コンテンツ表示 */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        {selectedFile ? (
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 border-b bg-gray-50">
              <span className="text-sm font-mono text-gray-600">
                {selectedFile}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : (
                <article className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </article>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            ファイルを選択してください
          </div>
        )}
      </div>
    </div>
  );
}
