import { useState, useEffect, useRef } from 'react';
import type { FieldDefinition, YamlSchema } from '../../types';

interface EditableCellProps {
  value: any;
  field: FieldDefinition;
  fieldKey: string;
  rowId: string;
  onUpdate: (rowId: string, columnId: string, value: any) => void;
  schema?: YamlSchema;
}

export function EditableCell({
  value,
  field,
  fieldKey,
  rowId,
  onUpdate,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue !== value) {
      onUpdate(rowId, fieldKey, editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  // enumフィールド（ドロップダウン）
  if (field.enum) {
    return isEditing ? (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={editValue || ''}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">選択してください</option>
        {field.enum.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ) : (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full text-left"
      >
        <StatusBadge value={value} />
      </button>
    );
  }

  // 日付フィールド
  if (field.type === 'date' || (field as any).format === 'date') {
    return isEditing ? (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={editValue || ''}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    ) : (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full text-left font-mono text-sm hover:bg-gray-100 rounded px-1"
      >
        {value || <span className="text-gray-400">-</span>}
      </button>
    );
  }

  // 配列フィールド
  if (field.type === 'array' || Array.isArray(value)) {
    const arrayValue = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1">
        {arrayValue.slice(0, 3).map((item, i) => (
          <span
            key={i}
            className="inline-flex px-2 py-0.5 text-xs bg-gray-100 rounded"
          >
            {typeof item === 'object' ? JSON.stringify(item) : item}
          </span>
        ))}
        {arrayValue.length > 3 && (
          <span className="text-xs text-gray-500">+{arrayValue.length - 3}</span>
        )}
      </div>
    );
  }

  // オブジェクトフィールド
  if (field.type === 'object' || (value && typeof value === 'object')) {
    return (
      <span className="text-xs text-gray-500">
        {JSON.stringify(value).slice(0, 30)}...
      </span>
    );
  }

  // テキストフィールド（長いテキストはtextarea）
  const isLongText = field.max_length && field.max_length > 100;

  if (isLongText) {
    return isEditing ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={editValue || ''}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        rows={3}
        className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    ) : (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full text-left hover:bg-gray-100 rounded px-1"
        title={value}
      >
        {value ? (
          value.length > 50 ? `${value.slice(0, 50)}...` : value
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </button>
    );
  }

  // 通常のテキストフィールド
  return isEditing ? (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={editValue || ''}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  ) : (
    <button
      onClick={() => setIsEditing(true)}
      className="w-full text-left hover:bg-gray-100 rounded px-1 min-h-[1.5rem]"
    >
      {value !== undefined && value !== null && value !== '' ? (
        String(value)
      ) : (
        <span className="text-gray-400">-</span>
      )}
    </button>
  );
}

// ステータスバッジコンポーネント
function StatusBadge({ value }: { value: any }) {
  if (!value) return <span className="text-gray-400">-</span>;

  const statusColors: Record<string, string> = {
    // WBS
    Todo: 'bg-gray-100 text-gray-700',
    InProgress: 'bg-blue-100 text-blue-700',
    Done: 'bg-green-100 text-green-700',
    Blocked: 'bg-red-100 text-red-700',
    // Issues
    Open: 'bg-yellow-100 text-yellow-700',
    Resolved: 'bg-green-100 text-green-700',
    Deferred: 'bg-gray-100 text-gray-700',
    // Risks
    Monitoring: 'bg-blue-100 text-blue-700',
    Mitigated: 'bg-green-100 text-green-700',
    Realized: 'bg-red-100 text-red-700',
    Closed: 'bg-gray-100 text-gray-700',
    // Priority
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
    // Questions
    open: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    deferred: 'bg-gray-100 text-gray-700',
    // Decisions
    active: 'bg-green-100 text-green-700',
    superseded: 'bg-gray-100 text-gray-700',
    revoked: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
        statusColors[value] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {value}
    </span>
  );
}
