import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, StopCircle, Bot, User } from 'lucide-react';
import { claudeApi } from '../services/api';
import { socketService } from '../services/socket';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentOutput, setCurrentOutput] = useState('');
  const currentOutputRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      },
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

  // プリセットコマンド
  const presetCommands = [
    { label: 'WBSの進捗を確認', command: 'WBSの進捗状況を教えて' },
    { label: '課題一覧', command: 'オープンな課題を一覧して' },
    { label: 'リスク状況', command: '現在のリスク状況を教えて' },
    { label: '未決事項確認', command: '未解決の質問事項を確認して' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4 space-y-4">
        {messages.length === 0 && !currentOutput && (
          <div className="text-center py-12">
            <Bot size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">AIアシスタントに質問や指示をしてください</p>
            <p className="text-sm text-gray-400 mb-6">
              プロジェクトの状態確認、ドキュメントの質問、タスクの更新などができます
            </p>
            {/* プリセットコマンド */}
            <div className="flex flex-wrap justify-center gap-2">
              {presetCommands.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setInput(preset.command)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
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
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {/* ストリーミング出力 */}
        {currentOutput && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot size={18} className="text-blue-600" />
            </div>
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-800">
              <p className="whitespace-pre-wrap">{currentOutput}</p>
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {isLoading && !currentOutput && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot size={18} className="text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <StopCircle size={20} /> : <Send size={20} />}
          </button>
        </div>
      </form>
    </div>
  );
}
