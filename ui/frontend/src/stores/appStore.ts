import { create } from 'zustand';
import type { ClaudeExecution } from '../types';

interface AppState {
  // 左サイドバー
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // 右サイドバー（AIチャット/スキル実行）
  rightSidebarOpen: boolean;
  rightSidebarTab: 'chat' | 'skills';
  toggleRightSidebar: () => void;
  setRightSidebarTab: (tab: 'chat' | 'skills') => void;
  openRightSidebar: (tab?: 'chat' | 'skills') => void;

  // Claude実行状態
  executions: ClaudeExecution[];
  currentExecution: ClaudeExecution | null;
  addExecution: (execution: ClaudeExecution) => void;
  updateExecution: (execId: string, updates: Partial<ClaudeExecution>) => void;
  appendOutput: (execId: string, chunk: string) => void;

  // 通知
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export const useAppStore = create<AppState>((set) => ({
  // 左サイドバー
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // 右サイドバー
  rightSidebarOpen: false,
  rightSidebarTab: 'chat',
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  setRightSidebarTab: (tab) => set({ rightSidebarTab: tab }),
  openRightSidebar: (tab) => set((state) => ({
    rightSidebarOpen: true,
    rightSidebarTab: tab ?? state.rightSidebarTab
  })),

  // Claude実行状態
  executions: [],
  currentExecution: null,
  addExecution: (execution) =>
    set((state) => ({
      executions: [execution, ...state.executions],
      currentExecution: execution,
    })),
  updateExecution: (execId, updates) =>
    set((state) => ({
      executions: state.executions.map((e) =>
        e.execId === execId ? { ...e, ...updates } : e
      ),
      currentExecution:
        state.currentExecution?.execId === execId
          ? { ...state.currentExecution, ...updates }
          : state.currentExecution,
    })),
  appendOutput: (execId, chunk) =>
    set((state) => ({
      executions: state.executions.map((e) =>
        e.execId === execId ? { ...e, output: e.output + chunk } : e
      ),
      currentExecution:
        state.currentExecution?.execId === execId
          ? { ...state.currentExecution, output: state.currentExecution.output + chunk }
          : state.currentExecution,
    })),

  // 通知
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: `notif-${Date.now()}` },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
