import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  Calendar,
  Users,
  FileUp,
  ClipboardPaste,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { hearingsApi } from '../services/api';
import type { HearingAddResult, HearingAnalyzeResult } from '../types';

type Mode = 'select' | 'paste' | 'file';

export function HearingAddPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HearingAddResult | null>(null);

  // フォーム状態
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [filePath, setFilePath] = useState('');

  // ファイルドロップ処理
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.md')) {
        // ファイル内容を読み込む
        const text = await file.text();
        setContent(text);
        setMode('paste');

        // メタデータを推測
        try {
          const analysis: HearingAnalyzeResult = await hearingsApi.analyze({
            content: text,
            fileName: file.name,
          });
          if (analysis.suggestedDate) setDate(analysis.suggestedDate);
          if (analysis.suggestedTitle) setTitle(analysis.suggestedTitle);
          if (analysis.suggestedParticipants?.length) {
            setParticipants(analysis.suggestedParticipants.join(', '));
          }
          if (analysis.suggestedSummary) setSummary(analysis.suggestedSummary);
        } catch (err) {
          console.error('Failed to analyze content:', err);
        }
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // 内容貼付モードで保存
  const handleSubmitPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !title || !content) {
      setError('日付、タイトル、内容は必須です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const participantsList = participants
        .split(/[,、]/)
        .map((p) => p.trim())
        .filter((p) => p);

      const res = await hearingsApi.add({
        date,
        title,
        participants: participantsList,
        summary,
        content,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setResult(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // ファイル指定モードで保存
  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath || !date || !title) {
      setError('ファイルパス、日付、タイトルは必須です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const participantsList = participants
        .split(/[,、]/)
        .map((p) => p.trim())
        .filter((p) => p);

      const res = await hearingsApi.addFromFile({
        sourcePath: filePath,
        date,
        title,
        participants: participantsList,
        summary,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setResult(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 成功画面
  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ヒアリングを登録しました
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
            <dl className="space-y-2">
              <div className="flex">
                <dt className="w-24 text-gray-500">ID:</dt>
                <dd className="font-medium">{result.entry.id}</dd>
              </div>
              <div className="flex">
                <dt className="w-24 text-gray-500">ファイル:</dt>
                <dd className="font-medium">{result.fileName}</dd>
              </div>
              <div className="flex">
                <dt className="w-24 text-gray-500">タイトル:</dt>
                <dd className="font-medium">{result.entry.title}</dd>
              </div>
              <div className="flex">
                <dt className="w-24 text-gray-500">実施日:</dt>
                <dd>{result.entry.date}</dd>
              </div>
              <div className="flex">
                <dt className="w-24 text-gray-500">状態:</dt>
                <dd>
                  <span className="inline-block px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                    未処理 (processed: No)
                  </span>
                </dd>
              </div>
            </dl>
          </div>
          <p className="text-gray-600 mb-6">
            「intakeを実行」でヒアリング内容を取り込み、project_stateを更新できます
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/skills')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              スキル実行へ
            </button>
            <button
              onClick={() => {
                setResult(null);
                setMode('select');
                setTitle('');
                setParticipants('');
                setSummary('');
                setContent('');
                setFilePath('');
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              続けて追加
            </button>
          </div>
        </div>
      </div>
    );
  }

  // モード選択画面
  if (mode === 'select') {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">ヒアリングを追加</h1>

        {/* ドロップエリア */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-gray-600 mb-2">
            Markdownファイルをドラッグ&ドロップ
          </p>
          <p className="text-sm text-gray-400">または下のボタンから選択</p>
        </div>

        {/* モード選択ボタン */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('paste')}
            className="flex flex-col items-center gap-3 p-6 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <ClipboardPaste size={32} className="text-blue-500" />
            <span className="font-medium">内容を貼り付け</span>
            <span className="text-sm text-gray-500 text-center">
              Markdown内容を直接入力
            </span>
          </button>
          <button
            onClick={() => setMode('file')}
            className="flex flex-col items-center gap-3 p-6 border rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <FileUp size={32} className="text-green-500" />
            <span className="font-medium">ファイルパス指定</span>
            <span className="text-sm text-gray-500 text-center">
              既存ファイルを登録
            </span>
          </button>
        </div>
      </div>
    );
  }

  // 入力フォーム（共通部分）
  const renderMetadataForm = () => (
    <div className="space-y-4 mb-6">
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Calendar size={16} />
          ヒアリング実施日 *
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <FileText size={16} />
          タイトル *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 要件詳細ヒアリング"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Users size={16} />
          参加者（カンマ区切り）
        </label>
        <input
          type="text"
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
          placeholder="例: 山田太郎, 佐藤花子"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          概要
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="ヒアリングの概要（1-2文）"
          rows={2}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => setMode('select')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={20} />
        戻る
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          {mode === 'paste' ? (
            <>
              <ClipboardPaste size={24} className="text-blue-500" />
              内容を貼り付けて追加
            </>
          ) : (
            <>
              <FileUp size={24} className="text-green-500" />
              ファイルパスを指定して追加
            </>
          )}
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <form onSubmit={mode === 'paste' ? handleSubmitPaste : handleSubmitFile}>
          {renderMetadataForm()}

          {mode === 'paste' ? (
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                ヒアリング内容（Markdown形式）*
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# ヒアリングメモ&#10;&#10;## 概要&#10;..."
                rows={15}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                required
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                ファイルパス *
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="例: /tmp/hearing_notes.md"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                プロジェクトルートからの相対パスまたは絶対パスを入力
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  ヒアリングを登録
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
