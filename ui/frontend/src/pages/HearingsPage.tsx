import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownApi, hearingsApi } from '../services/api';
import type { MarkdownFileInfo, HearingEntry } from '../types';
import {
  FileText,
  ChevronRight,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
} from 'lucide-react';

export function HearingsPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<MarkdownFileInfo[]>([]);
  const [hearings, setHearings] = useState<HearingEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // ファイル一覧とヒアリングメタデータを並行取得
        const [filesData, hearingsData] = await Promise.all([
          markdownApi.listFiles(),
          hearingsApi.list(),
        ]);
        // hearingsカテゴリのファイルのみ抽出
        const hearingFiles = filesData.filter(
          (f: MarkdownFileInfo) => f.category === 'hearings'
        );
        setFiles(hearingFiles);
        setHearings(hearingsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }
    loadData();
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

  // ファイル名からメタデータを取得
  const getHearingMeta = (fileName: string): HearingEntry | undefined => {
    // ファイル名からマッチするエントリを探す
    // 例: 20260112_初回ヒアリング内容.md -> date: 2026-01-12
    const dateMatch = fileName.match(/^(\d{4})(\d{2})(\d{2})_/);
    if (dateMatch) {
      const dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      return hearings.find((h) => h.date === dateStr);
    }
    return undefined;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* ファイルリスト */}
      <div className="w-72 bg-white rounded-lg shadow overflow-y-auto flex flex-col">
        {/* 追加ボタン */}
        <div className="p-3 border-b">
          <button
            onClick={() => navigate('/hearings/add')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            ヒアリングを追加
          </button>
        </div>

        {/* ヒアリング一覧 */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
            ヒアリングメモ ({files.length}件)
          </h3>
          {files.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              ヒアリングメモがありません
            </div>
          ) : (
            <ul>
              {files.map((file) => {
                const meta = getHearingMeta(file.name);
                return (
                  <li key={file.path}>
                    <button
                      onClick={() => handleSelectFile(file.path)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b ${
                        selectedFile === file.path ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <FileText
                          size={16}
                          className={`mt-0.5 flex-shrink-0 ${
                            selectedFile === file.path
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-medium truncate ${
                              selectedFile === file.path ? 'text-blue-600' : ''
                            }`}
                          >
                            {meta?.title || file.name.replace('.md', '')}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {meta?.date && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {meta.date}
                              </span>
                            )}
                            {meta?.processed === 'Yes' ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle size={12} />
                                処理済み
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Clock size={12} />
                                未処理
                              </span>
                            )}
                          </div>
                          {meta?.participants && meta.participants.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                              <Users size={12} />
                              <span className="truncate">
                                {meta.participants.slice(0, 2).join(', ')}
                                {meta.participants.length > 2 && ' ...'}
                              </span>
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          size={14}
                          className="mt-1 opacity-50 flex-shrink-0"
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* コンテンツ表示 */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        {selectedFile ? (
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-mono text-gray-600">
                {selectedFile}
              </span>
              {(() => {
                const fileName = selectedFile.split('/').pop() || '';
                const meta = getHearingMeta(fileName);
                if (meta) {
                  return (
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        meta.processed === 'Yes'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {meta.processed === 'Yes' ? '処理済み' : '未処理'}
                    </span>
                  );
                }
                return null;
              })()}
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
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <FileText size={48} className="mb-4 opacity-50" />
            <p>ヒアリングメモを選択してください</p>
            <p className="text-sm mt-2">
              または
              <button
                onClick={() => navigate('/hearings/add')}
                className="text-blue-500 hover:underline ml-1"
              >
                新しいヒアリングを追加
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
