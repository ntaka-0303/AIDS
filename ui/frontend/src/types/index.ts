// YAML関連の型定義
export interface YamlFileInfo {
  name: string;
  path: string;
  schemaName?: string;
}

export interface YamlSchema {
  schema: {
    version: string;
    name: string;
    description: string;
    root_key: string;
  };
  fields: Record<string, FieldDefinition>;
  id_generation?: {
    prefix: string;
    format: string;
  };
  state_transitions?: Record<string, string[]>;
}

export interface FieldDefinition {
  type: string;
  required?: boolean;
  description?: string;
  enum?: string[];
  pattern?: string;
  max_length?: number;
  items?: {
    type: string;
    pattern?: string;
  };
  fields?: Record<string, FieldDefinition>;
}

// Hearing関連の型定義
export interface HearingEntry {
  id: string;
  title: string;
  date: string;
  participants?: string[];
  summary?: string;
  add_date: string;
  processed: 'Yes' | 'No';
}

export interface HearingAddResult {
  success: boolean;
  entry: HearingEntry;
  fileName: string;
  filePath: string;
}

export interface HearingAnalyzeResult {
  suggestedDate: string;
  suggestedTitle: string;
  suggestedParticipants: string[];
  suggestedSummary: string;
}

// Markdown関連の型定義
export interface MarkdownFileInfo {
  name: string;
  path: string;
  category: 'project_state' | 'outputs' | 'hearings' | 'reviews' | 'templates';
}

// Claude CLI関連の型定義
export interface Skill {
  id: string;
  name: string;
  command: string;
  description: string;
}

export interface ClaudeExecution {
  execId: string;
  command: string;
  status: 'running' | 'completed' | 'error';
  output: string;
  startTime: Date;
  endTime?: Date;
}

// WebSocket イベント
export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: string;
}

export interface ClaudeOutputEvent {
  execId: string;
  chunk: string;
}

export interface ClaudeCompleteEvent {
  execId: string;
  result: string;
}
