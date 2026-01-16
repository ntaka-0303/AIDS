# バリデーションHook設定ガイド

## 概要

Claude Codeのhooks機能を使用して、`project_state/`配下のYAMLファイルが更新されたときに自動的にスキーマバリデーションを実行します。

## Hook自動実行の仕組み

```
[Claude Code実行中]
  ↓
[Intake/ProjectMgmt Skillがproject_state/wbs.yamlを更新]
  ↓
[Write/Edit tool実行]
  ↓
[Hook トリガー] ← 自動実行
  ↓
[validation/validate_schema.py wbs.yaml を実行]
  ↓
[バリデーション結果を即座に表示]
  ├─ OK → 処理継続
  ├─ Warning → 警告表示、処理継続
  └─ Critical → エラー表示（修正推奨）
```

## 2段階バリデーション

### 第1段階: Hook自動バリデーション（即座）
- **実行タイミング**: ファイル保存時に自動実行
- **チェック内容**: 基本的なスキーマ検証
  - 必須フィールドの存在確認
  - IDフォーマット（pattern）の検証
  - 列挙値（enum）の検証
  - 日付フォーマットの検証
  - ID重複チェック
- **目的**: 明らかなエラーを即座に検出

### 第2段階: schema-validator agent（詳細）
- **実行タイミング**: スキルから明示的に呼び出し
- **チェック内容**: 高度なバリデーション
  - 参照整合性（クロスファイル参照の存在確認）
  - 循環参照検出
  - ビジネスルール（条件付き必須フィールド等）
  - 状態遷移の妥当性
  - 日付の論理的整合性
- **目的**: 複雑なビジネスロジックの検証

## Hook設定方法

### ステップ1: Claude Code設定ファイルを編集

Claude Codeの設定ファイル（`~/.config/claude/config.json` または プロジェクトの `.claude/config.json`）を編集します。

**サンプルファイルからコピー:**

`.claude/config.sample.json` をコピーして使用することもできます:

```bash
# プロジェクトローカルに設定する場合
cp .claude/config.sample.json .claude/config.json

# グローバルに設定する場合（全プロジェクトで有効）
mkdir -p ~/.config/claude
cp .claude/config.sample.json ~/.config/claude/config.json
```

**または、手動で作成:**

```json
{
  "hooks": {
    "tool": {
      "Write": {
        "after": [
          {
            "name": "schema-validation",
            "command": "python3 validation/validate_schema.py \"${file_path}\"",
            "description": "Validate YAML schema after file write",
            "cwd": "${workspace_root}",
            "enabled": true,
            "blocking": false
          }
        ]
      },
      "Edit": {
        "after": [
          {
            "name": "schema-validation",
            "command": "python3 validation/validate_schema.py \"${file_path}\"",
            "description": "Validate YAML schema after file edit",
            "cwd": "${workspace_root}",
            "enabled": true,
            "blocking": false
          }
        ]
      }
    }
  }
}
```

### ステップ2: Hookの有効化

Claude Codeを再起動するか、設定をリロードします。

```bash
# Claude Codeセッションを再起動
# または設定変更が自動的に反映されます
```

### ステップ3: 動作確認

`project_state/`配下のYAMLファイルを編集して、Hookが動作するか確認します。

```bash
# テスト用にファイルを編集
# Claude Codeから以下のように指示:
「wbs.yamlに新しいタスクを追加して」

# Hookが自動実行され、バリデーション結果が表示されます
```

## Hook設定のパラメータ

| パラメータ | 説明 | 推奨値 |
|-----------|------|--------|
| `name` | Hook名（識別用） | `schema-validation` |
| `command` | 実行するコマンド | `python3 validation/validate_schema.py "${file_path}"` |
| `description` | Hookの説明 | 任意の説明文 |
| `cwd` | 作業ディレクトリ | `${workspace_root}` |
| `enabled` | 有効/無効 | `true` |
| `blocking` | ブロッキング実行 | `false`（非推奨: trueにすると処理が遅くなる） |

**重要な変数:**
- `${file_path}`: 更新されたファイルのパス
- `${workspace_root}`: ワークスペースのルートディレクトリ

## blocking設定について

### blocking: false（推奨）
- **動作**: バリデーションを非同期で実行
- **メリット**: Claude Codeの処理が止まらない
- **デメリット**: エラーがあっても処理は継続される
- **用途**: 通常の開発フロー

### blocking: true（非推奨）
- **動作**: バリデーションが完了するまでClaude Codeの処理を待機
- **メリット**: エラーがあれば即座に停止できる
- **デメリット**: 処理が遅くなる
- **用途**: 厳密な品質管理が必要な場合のみ

**推奨**: `blocking: false`で運用し、エラーが検出された場合は後からschema-validator agentで詳細チェック

## Hookの無効化

一時的にHookを無効にしたい場合:

```json
{
  "hooks": {
    "tool": {
      "Write": {
        "after": [
          {
            "name": "schema-validation",
            "enabled": false  // ← falseに変更
          }
        ]
      }
    }
  }
}
```

または、設定ファイルからhooksセクション全体を削除します。

## トラブルシューティング

### Hookが実行されない

**原因1: Pythonが見つからない**
```bash
# Pythonのパスを確認
which python3

# Hookのcommandにフルパスを指定
"command": "/usr/bin/python3 validation/validate_schema.py \"${file_path}\""
```

**原因2: スクリプトが実行可能でない**
```bash
# 実行権限を付与
chmod +x validation/validate_schema.py
```

**原因3: 作業ディレクトリが正しくない**
```bash
# cwdを確認
"cwd": "${workspace_root}"
```

### バリデーションエラーが表示されない

**原因: スクリプトのエラー出力が表示されていない**

Claude CodeのHook出力を確認:
```bash
# Claude Codeのログを確認
# 通常、Hook実行結果はコンソールに表示されます
```

### パフォーマンスの問題

**症状: ファイル保存が遅い**

対処法:
1. `blocking: false`に設定（非同期実行）
2. バリデーションスクリプトを最適化
3. 大きなファイルの場合はHookを一時無効化

## 実行例

### 成功時の出力

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Schema Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: project_state/wbs.yaml
Time: 2026-01-15 14:30:25

✓ All checks passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### エラー検出時の出力

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Schema Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: project_state/wbs.yaml
Time: 2026-01-15 14:32:10

✗ Critical Errors: 2
  [CRITICAL] [P2-05] Required field 'due' is missing
  [CRITICAL] Field 'status' value 'Completed' not in allowed values ['Todo', 'InProgress', 'Done', 'Blocked']

⚠ Warnings: 1
  [WARNING] Field 'title' exceeds max_length 100 (current: 125)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠ Validation failed. Please fix critical errors before proceeding.
💡 Run schema-validator agent for detailed validation and fix suggestions.
```

## 運用フロー

### 通常の運用

1. **Intake/ProjectMgmtスキル実行**
   ```
   ユーザー: 「タスク P2-05 を追加」
   ```

2. **Hook自動実行**
   ```
   [Write tool実行]
     ↓
   [Hook: schema-validation]
     ↓
   [バリデーション結果表示]
   ```

3. **エラー対応**
   - Critical → 即座に修正
   - Warning → 確認して必要に応じて修正
   - OK → 処理継続

4. **詳細チェック（必要時）**
   ```
   ユーザー: 「schema-validator agentでwbs.yamlを詳細チェック」
   ```

### 大規模更新時

複数ファイルを一括更新する場合:

1. **Hook一時無効化**（オプション）
   ```json
   "enabled": false
   ```

2. **更新実行**
   ```
   ユーザー: 「全体更新を実行」
   ```

3. **更新後にまとめて検証**
   ```
   ユーザー: 「schema-validator agentで全ファイルをチェック」
   ```

4. **Hook再有効化**
   ```json
   "enabled": true
   ```

## まとめ

### Hook自動バリデーションの利点

✅ **即座のフィードバック**: ファイル保存時に即座にエラーを検出
✅ **予防的品質保証**: 不正なデータの混入を防ぐ
✅ **開発効率向上**: 後から大量のエラーを修正する手間を削減
✅ **設定不要**: 一度設定すれば自動実行

### schema-validator agentとの使い分け

| 観点 | Hook自動バリデーション | schema-validator agent |
|------|---------------------|----------------------|
| **実行タイミング** | ファイル保存時（自動） | スキルから明示的に呼び出し |
| **チェック内容** | 基本的なスキーマ検証 | 高度なビジネスロジック検証 |
| **処理速度** | 高速 | やや時間がかかる |
| **用途** | 即座のエラー検出 | 詳細な品質保証 |

**推奨運用**: 両方を併用し、Hook→自動検証、必要時にagent→詳細検証
