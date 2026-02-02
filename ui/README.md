# ProjectOps UI

プロジェクト管理ワークスペース用のWebベースUI。

## セットアップ

```bash
cd ui
npm install
```

## 開発サーバー起動

```bash
# 一括起動（フロントエンド + バックエンド）
npm run dev
```

個別起動する場合:
```bash
# ターミナル1: バックエンド (http://localhost:3001)
npm run dev --workspace=backend

# ターミナル2: フロントエンド (http://localhost:5173)
npm run dev --workspace=frontend
```

## アクセス

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:3001

## 機能一覧

### 1. Dashboard
プロジェクト進捗の概要表示
- WBS完了率
- 課題/リスク/未決事項の統計

### 2. YAML表編集（WBS/課題/リスク/未決事項/決定事項）
- 表形式での参照・編集
- インライン編集（クリックして直接編集）
- ステータスのドロップダウン選択
- 日付ピッカー
- 変更の保存/リセット
- 行の追加/削除
- ファイル変更の自動検知

### 3. ドキュメント参照
- project_state/, outputs/, inputs/hearings/のMarkdownファイル閲覧
- カテゴリ別ファイルリスト
- Markdownレンダリング

### 4. スキル実行
カテゴリ別にスキルボタンを配置
- **取り込み**: ヒアリング取り込み（Intake）
- **ドキュメント生成**: 提案書/計画書/要件定義書生成
- **品質管理**: Quality Gate
- **レポート**: 週次報告書生成

実行中の出力をリアルタイム表示、実行履歴の保存

### 5. AIチャット
- Claude Codeへの自由な指示
- プリセットコマンド（WBS確認、課題一覧など）
- ストリーミングレスポンス表示

## 技術スタック

### フロントエンド
- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- TanStack Table（表編集）
- React Query（データフェッチ）
- Zustand（状態管理）
- Socket.io-client（リアルタイム通信）

### バックエンド
- Node.js + Express
- TypeScript
- Socket.io（WebSocket）
- js-yaml（YAML読み書き）
- chokidar（ファイル監視）

## ディレクトリ構成

```
ui/
├── package.json              # ワークスペースルート
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # Layout等
│   │   │   └── yaml-editor/  # YamlTable, EditableCell
│   │   ├── pages/            # Dashboard, YamlTablePage等
│   │   ├── services/         # API, Socket
│   │   ├── stores/           # Zustand store
│   │   └── types/
│   └── ...
└── backend/
    ├── src/
    │   ├── routes/           # yaml, markdown, claude
    │   ├── services/         # 各種サービス
    │   └── websocket/        # ファイル監視・通知
    └── ...
```

## API エンドポイント

### YAML API
- `GET /api/yaml/files` - ファイル一覧
- `GET /api/yaml/:file` - ファイル読み込み（スキーマ付き）
- `PATCH /api/yaml/:file/:id` - エントリ更新
- `POST /api/yaml/:file` - エントリ追加
- `DELETE /api/yaml/:file/:id` - エントリ削除

### Markdown API
- `GET /api/markdown/files` - ファイル一覧
- `GET /api/markdown/read?path=...` - ファイル読み込み

### Claude API
- `GET /api/claude/skills` - スキル一覧
- `POST /api/claude/execute` - スキル実行
- `POST /api/claude/chat` - チャット

### WebSocket Events
- `file:change` - ファイル変更通知
- `claude:start/output/complete/error` - Claude実行状態
