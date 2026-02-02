import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { ArrowUpDown, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { yamlApi } from '../../services/api';
import { socketService } from '../../services/socket';
import { EditableCell } from './EditableCell';
import type { YamlSchema, FieldDefinition } from '../../types';

interface YamlTableProps {
  fileName: string;
  title: string;
}

export function YamlTable({ fileName, title }: YamlTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [schema, setSchema] = useState<YamlSchema | null>(null);
  const [, setRootKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await yamlApi.readFile(fileName);
      setData(result.data?.[result.rootKey] || []);
      setSchema(result.schema);
      setRootKey(result.rootKey);
      setPendingChanges(new Map());
    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fileName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ファイル変更監視
  useEffect(() => {
    socketService.connect();
    const unsubscribe = socketService.on('file:change', (event: any) => {
      if (event.path.includes(fileName)) {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [fileName, loadData]);

  // セル更新ハンドラ
  const handleCellUpdate = useCallback((rowId: string, columnId: string, value: any) => {
    setData((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [columnId]: value } : row
      )
    );
    setPendingChanges((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(rowId) || {};
      newMap.set(rowId, { ...existing, [columnId]: value });
      return newMap;
    });
  }, []);

  // 変更保存
  const saveChanges = async () => {
    if (pendingChanges.size === 0) return;

    setSaving(true);
    try {
      for (const [rowId, updates] of pendingChanges) {
        await yamlApi.updateEntry(fileName, rowId, updates);
      }
      setPendingChanges(new Map());
    } catch (err) {
      setError('保存に失敗しました');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // 新規行追加
  const addNewRow = async () => {
    try {
      const newEntry = await yamlApi.addEntry(fileName, {});
      setData((prev) => [...prev, newEntry]);
    } catch (err) {
      setError('追加に失敗しました');
      console.error(err);
    }
  };

  // 行削除
  const deleteRow = async (id: string) => {
    if (!confirm('この行を削除しますか？')) return;
    try {
      await yamlApi.deleteEntry(fileName, id);
      setData((prev) => prev.filter((row) => row.id !== id));
      setPendingChanges((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    } catch (err) {
      setError('削除に失敗しました');
      console.error(err);
    }
  };

  // カラム定義を動的に生成
  const columns = useMemo(() => {
    if (!schema?.fields) return [];

    const columnHelper = createColumnHelper<any>();
    const cols: any[] = [];

    // IDカラム（常に最初）
    cols.push(
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (info) => (
          <span className="font-mono text-sm">{info.getValue()}</span>
        ),
        enableSorting: true,
        size: 100,
      })
    );

    // スキーマから残りのカラムを生成
    const fieldEntries = Object.entries(schema.fields).filter(
      ([key]) => key !== 'id'
    );

    // 表示するフィールドを選択（最大10個）
    const displayFields = fieldEntries.slice(0, 10);

    for (const [key, field] of displayFields) {
      cols.push(
        columnHelper.accessor(key, {
          header: ({ column }) => (
            <button
              className="flex items-center gap-1 hover:text-blue-600"
              onClick={() => column.toggleSorting()}
            >
              {(field as FieldDefinition).description || key}
              <ArrowUpDown size={14} />
            </button>
          ),
          cell: (info) => (
            <EditableCell
              value={info.getValue()}
              field={field as FieldDefinition}
              fieldKey={key}
              rowId={info.row.original.id}
              onUpdate={handleCellUpdate}
              schema={schema}
            />
          ),
          enableSorting: true,
        })
      );
    }

    // 操作カラム
    cols.push(
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            onClick={() => deleteRow(info.row.original.id)}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
            title="削除"
          >
            <Trash2 size={16} />
          </button>
        ),
        size: 50,
      })
    );

    return cols;
  }, [schema, handleCellUpdate]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center justify-between">
        <span>{error}</span>
        <button onClick={loadData} className="text-red-600 hover:underline">
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <span className="text-gray-500 text-sm">{data.length} 件</span>
        </div>
        <div className="flex items-center gap-2">
          {pendingChanges.size > 0 && (
            <span className="text-sm text-yellow-600">
              {pendingChanges.size} 件の変更あり
            </span>
          )}
          <button
            onClick={loadData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="再読み込み"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={saveChanges}
            disabled={pendingChanges.size === 0 || saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={addNewRow}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <Plus size={18} />
            追加
          </button>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 ${
                    pendingChanges.has(row.original.id)
                      ? 'bg-yellow-50'
                      : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            データがありません
          </div>
        )}
      </div>
    </div>
  );
}
