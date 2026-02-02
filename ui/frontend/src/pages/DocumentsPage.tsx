import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownApi } from '../services/api';
import type { MarkdownFileInfo } from '../types';
import { FileText, ChevronRight } from 'lucide-react';

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

  // カテゴリ別にグループ化
  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.category]) {
      acc[file.category] = [];
    }
    acc[file.category].push(file);
    return acc;
  }, {} as Record<string, MarkdownFileInfo[]>);

  const categoryLabels: Record<string, string> = {
    project_state: 'プロジェクト状態',
    outputs: '成果物',
    reviews: 'レビュー',
    hearings: 'ヒアリング',
    templates: 'テンプレート',
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* ファイルリスト */}
      <div className="w-64 bg-white rounded-lg shadow overflow-y-auto">
        {Object.entries(groupedFiles).map(([category, categoryFiles]) => (
          <div key={category} className="border-b last:border-b-0">
            <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
              {categoryLabels[category] || category}
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
        ))}
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
