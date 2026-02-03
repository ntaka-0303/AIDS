import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Play,
  Send,
  StopCircle,
  Bot,
  User,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { claudeApi } from '../../services/api';
import { socketService } from '../../services/socket';
import type { Skill } from '../../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExecutionLog {
  execId: string;
  skill: Skill;
  status: 'running' | 'completed' | 'error';
  output: string;
  startTime: Date;
  endTime?: Date;
}

// コンパクトなチャットパネル
function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentOutput, setCurrentOutput] = useState('');
  const currentOutputRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const updateOutput = useCallback((chunk: string) => {
    currentOutputRef.current += chunk;
    setCurrentOutput(currentOutputRef.current);
  }, []);

  useEffect(() => {
    socketService.connect();

    const unsubOutput = socketService.on('claude:output', (event: { execId: string; chunk: string }) => {
      updateOutput(event.chunk);
    });

    const unsubComplete = socketService.on('claude:complete', () => {
      if (currentOutputRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: currentOutputRef.current,
            timestamp: new Date(),
          },
        ]);
      }
      currentOutputRef.current = '';
      setCurrentOutput('');
      setIsLoading(false);
    });

    const unsubError = socketService.on('claude:error', (event: { execId: string; error: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `エラー: ${event.error}`,
          timestamp: new Date(),
        },
      ]);
      currentOutputRef.current = '';
      setCurrentOutput('');
      setIsLoading(false);
    });

    return () => {
      unsubOutput();
      unsubComplete();
      unsubError();
    };
  }, [updateOutput]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentOutput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date() },
    ]);

    setIsLoading(true);
    currentOutputRef.current = '';
    setCurrentOutput('');

    try {
      await claudeApi.chat(userMessage);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'エラーが発生しました。再度お試しください。',
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const presetCommands = [
    { label: 'WBS確認', command: 'WBSの進捗状況を教えて' },
    { label: '課題', command: 'オープンな課題を一覧して' },
    { label: 'リスク', command: '現在のリスク状況を教えて' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && !currentOutput && (
          <div className="text-center py-6">
            <Bot size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 mb-3">質問や指示をしてください</p>
            <div className="flex flex-wrap justify-center gap-1">
              {presetCommands.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setInput(preset.command)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {currentOutput && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-blue-600" />
            </div>
            <div className="max-w-[85%] rounded-lg px-3 py-2 bg-gray-100 text-gray-800 text-sm">
              <p className="whitespace-pre-wrap break-words">{currentOutput}</p>
              <span className="inline-block w-1.5 h-3 bg-blue-500 animate-pulse ml-0.5" />
            </div>
          </div>
        )}

        {isLoading && !currentOutput && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力フォーム - 最下部に固定 */}
      <form onSubmit={handleSubmit} className="p-3 border-t flex-shrink-0 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <StopCircle size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}

// コンパクトなスキル実行パネル
function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [runningSkill, setRunningSkill] = useState<string | null>(null);
  const [currentOutput, setCurrentOutput] = useState('');
  const currentOutputRef = useRef('');
  const outputContainerRef = useRef<HTMLPreElement>(null);

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* スキル一覧 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          スキル一覧
        </h4>
        {skills.map((skill) => (
          <button
            key={skill.id}
            onClick={() => handleExecuteSkill(skill)}
            disabled={runningSkill !== null}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
              runningSkill === skill.id
                ? 'bg-blue-50 border-blue-300'
                : runningSkill
                ? 'opacity-50 cursor-not-allowed border-gray-200'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {runningSkill === skill.id ? (
              <Loader2 size={16} className="animate-spin text-blue-500" />
            ) : (
              <Play size={16} className="text-blue-500" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{skill.name}</div>
              <div className="text-xs text-gray-500 truncate">{skill.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* 実行中の出力 */}
      {runningSkill && (
        <div className="border-t p-3">
          <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            実行中
          </h4>
          <pre
            ref={outputContainerRef}
            className="bg-gray-900 text-gray-100 p-2 rounded text-xs max-h-32 overflow-y-auto"
          >
            {currentOutput || 'Waiting...'}
          </pre>
        </div>
      )}

      {/* 実行履歴（最新3件） */}
      {executionLogs.filter((log) => log.status !== 'running').length > 0 && (
        <div className="border-t p-3">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">実行履歴</h4>
          <div className="space-y-1">
            {executionLogs
              .filter((log) => log.status !== 'running')
              .slice(0, 3)
              .map((log) => (
                <details key={log.execId} className="border rounded text-xs">
                  <summary
                    className={`px-2 py-1 flex items-center gap-1 cursor-pointer ${
                      log.status === 'completed' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {log.status === 'completed' ? (
                      <CheckCircle size={12} className="text-green-500" />
                    ) : (
                      <XCircle size={12} className="text-red-500" />
                    )}
                    <span className="truncate">{log.skill.name}</span>
                  </summary>
                  {log.output && (
                    <pre className="bg-gray-900 text-gray-100 p-2 text-xs max-h-24 overflow-y-auto">
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

// 右サイドバー本体
export function RightSidebar() {
  const { rightSidebarOpen, rightSidebarTab, toggleRightSidebar, setRightSidebarTab } = useAppStore();

  return (
    <>
      {/* 開閉ボタン（閉じている時） */}
      {!rightSidebarOpen && (
        <button
          onClick={toggleRightSidebar}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-white shadow-lg rounded-l-lg p-2 hover:bg-gray-50 transition-colors border border-r-0"
          title="AIパネルを開く"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
      )}

      {/* サイドバー本体 */}
      <aside
        className={`${
          rightSidebarOpen ? 'w-80' : 'w-0'
        } h-screen bg-white shadow-lg transition-all duration-300 flex flex-col overflow-hidden border-l`}
      >
        {rightSidebarOpen && (
          <>
            {/* ヘッダー - 常に上部に固定 */}
            <div className="h-16 flex items-center justify-between px-3 border-b flex-shrink-0 bg-white z-10">
              {/* タブ切り替え */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setRightSidebarTab('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    rightSidebarTab === 'chat'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare size={16} />
                  チャット
                </button>
                <button
                  onClick={() => setRightSidebarTab('skills')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    rightSidebarTab === 'skills'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Play size={16} />
                  スキル
                </button>
              </div>

              {/* 閉じるボタン */}
              <button
                onClick={toggleRightSidebar}
                className="p-1.5 rounded-lg hover:bg-gray-100"
                title="パネルを閉じる"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-hidden min-h-0">
              {rightSidebarTab === 'chat' ? <ChatPanel /> : <SkillsPanel />}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
