# ProjectOps Agents

エンタープライズ向けAIエージェント基盤プロダクト導入プロジェクトの
ドキュメント作成・進捗管理・品質管理を半自動化するためのワークスペース。

## ディレクトリ構造

```
inputs/hearings/     # ヒアリングメモ（イベントログ、都度追加）
project_state/       # 最新状態（単一の真実）
  schemas/           # YAMLスキーマ定義（プロジェクトごとにカスタマイズ可能）
processing/          # 構造化抽出物（hearing_digests等）
templates/           # ドキュメントテンプレート（変更禁止）
outputs/             # 生成されたドラフト
reviews/             # 品質チェック結果
logs/                # 実行ログ
```

## クイックコマンド

### ヒアリング取り込み（Intake）
```
「intakeを実行」
「ヒアリングメモを取り込んで」
「hearingを処理」
```

### ドキュメント生成（DocGen）
```
「提案書を生成」
「計画書を生成」
「要件定義書を生成」
「docgen proposal」
「全ドキュメントを更新」
```

### 品質チェック（QualityGate）
```
「品質チェックを実行」
「quality gateを実行」
「提案書をレビュー」
「整合性を確認」
```

### 週次報告（WeeklyReport）
```
「週次報告を生成」
「週報を作成」
「weekly report」
```

### WBS/課題/リスク管理
```
「タスクを追加」
「課題を登録」
「リスクを追加」
「WBSを更新」
```

### 運用フロー一括実行
```
「ヒアリング後の全体更新を実行」  # Intake → WBS → DocGen → QualityGate
「週次サイクルを回して」          # WBS更新 → WeeklyReport → QualityGate
```

## ID採番規則

| 種別 | フォーマット | 例 |
|-----|------------|-----|
| 要件 | `REQ-XXX` | REQ-001, REQ-012 |
| WBSタスク | `P<phase>-XX` | P1-01, P2-05 |
| 課題 | `ISS-XXX` | ISS-001, ISS-023 |
| リスク | `RSK-XXX` | RSK-001, RSK-015 |
| 決定事項 | `DEC-XXX` | DEC-001, DEC-008 |
| 質問/確認 | `QST-XXX` | QST-001, QST-005 |
| 変更ログ | `CHG-XXX` | CHG-001, CHG-010 |

## 状態遷移ルール

### タスク（wbs.yaml）
`Todo` → `InProgress` → `Done` / `Blocked`

### 課題（issues.yaml）
`Open` → `InProgress` → `Resolved` / `Deferred`

### リスク（risks.yaml）
`Open` → `Monitoring` → `Mitigated` / `Realized` / `Closed`

### 質問（open_questions.yaml）
`open` → `resolved` / `deferred`

### 決定（decisions.yaml）
`active` → `superseded` / `revoked`

## ファイル命名規則

| ファイル種別 | 命名規則 | 例 |
|------------|---------|-----|
| ヒアリングメモ | `YYYY-MM-DD_topic.md` | 2026-01-10_kickoff.md |
| 出力ドラフト | `*_draft.md` | proposal_draft.md |
| レビュー結果 | `*_review.md` | proposal_review.md |
| ヒアリング構造化 | `YYYY-MM-DD_topic.yaml` | 2026-01-10_kickoff.yaml |

## 更新時の記録ルール

1. **変更はchange_log.yamlに追記**
   - どのヒアリング/決定を起点に何が変わったかを記録
   - YAML形式でエントリを追加

2. **実行はlogs/runlog.mdに記録**
   - Skill実行の都度、実行内容と結果を追記

## project_state ファイル形式

| ファイル | 形式 | スキーマ | 用途 |
|---------|------|---------|------|
| project_charter.md | Markdown | - | プロジェクト基本情報 |
| requirements_master.md | Markdown | - | 要件の統合版 |
| open_questions.yaml | YAML | `schemas/open_questions.schema.yaml` | 未決事項・確認事項 |
| decisions.yaml | YAML | `schemas/decisions.schema.yaml` | 決定事項ログ |
| change_log.yaml | YAML | `schemas/change_log.schema.yaml` | 変更履歴 |
| wbs.yaml | YAML | `schemas/wbs.schema.yaml` | WBS（タスク管理） |
| issues.yaml | YAML | `schemas/issues.schema.yaml` | 課題管理 |
| risks.yaml | YAML | `schemas/risks.schema.yaml` | リスク管理 |

## YAMLスキーマ定義

`project_state/schemas/`にYAMLスキーマ定義ファイルを配置。
**プロジェクトごとにカスタマイズ可能。**

| スキーマファイル | 内容 |
|-----------------|------|
| `wbs.schema.yaml` | WBSタスクのフィールド定義、状態遷移、バリデーションルール |
| `risks.schema.yaml` | リスクのフィールド定義、スコア計算、状態遷移 |
| `issues.schema.yaml` | 課題のフィールド定義、状態遷移 |
| `decisions.schema.yaml` | 決定事項のフィールド定義、状態遷移 |
| `open_questions.schema.yaml` | 未決事項のフィールド定義、状態遷移 |
| `change_log.schema.yaml` | 変更履歴のフィールド定義 |

**スキーマファイルの構成:**
- `schema`: バージョン、名前、説明、ルートキー
- `fields`: フィールド定義（type, required, enum, pattern等）
- `id_generation`: ID採番ルール
- `state_transitions`: 状態遷移ルール
- `validation`: バリデーションルール（参照整合性、日付整合性、ビジネスルール）
- `example`: サンプルデータ

## 禁止事項

- `templates/`の直接編集（変更はレビュー後のみ）
- ID採番の手動割り当て（自動採番を使用）
- `project_state/`の構造化ファイル（yaml）の手動編集（Skill経由で更新）

## 重要な参照ファイル

- @README.md - プロジェクト全体像
- @templates/proposal.md - 提案書テンプレート
- @templates/project_plan.md - 計画書テンプレート
- @templates/requirements.md - 要件定義書テンプレート
- @templates/weekly_report.md - 週次報告テンプレート
