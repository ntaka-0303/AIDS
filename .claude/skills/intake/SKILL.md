---
name: intake
description: |
  ヒアリングメモを取り込んでプロジェクト状態を更新するSkill。
  inputs/hearings/のメモを処理し、project_state/を最新化する。
  キーワード: intake, ヒアリング, hearing, メモ取り込み, 状態更新,
  inputs/hearings, project_state更新, hearing_digests生成
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Intake Skill - ヒアリングメモ取り込み

## 概要
`inputs/hearings/`に追加されたヒアリングメモを読み取り、
`project_state/`の各ファイルを更新し、構造化サマリを生成する。

## 実行トリガー
- 「intakeを実行」
- 「ヒアリングメモを取り込んで」
- 「hearingを処理して」
- `inputs/hearings/`に新規ファイル追加後

## 実行ステップ

### Step 1: 未処理ヒアリングの特定
1. `inputs/hearings/_index.yaml`を読み込む
2. `processed: No`のエントリを特定
3. 対応する`YYYY-MM-DD_topic.md`ファイルを読み込む

もし`_index.yaml`に未登録のmdファイルがあれば、先に登録を促す。

### Step 2: 構造化抽出
ヒアリングメモから以下を抽出する。
詳細スキーマは `references/hearing-schema.yaml` を参照。

**抽出項目:**
- **要件（Requirements）**: 機能要件、非機能要件
- **決定事項（Decisions）**: 合意された方針、スコープ判断
- **未決事項（Questions）**: 確認が必要な項目、宿題
- **リスク（Risks）**: 懸念事項、プロジェクトリスクの兆候
- **課題（Issues）**: 顕在化した問題、対応が必要な事項
- **基本情報（Charter）**: プロジェクト名、目的、体制、スケジュール等

### Step 3: project_state更新
以下のファイルを更新する。
詳細ルールは `references/state-update-rules.md` を参照。
**スキーマ定義は `project_state/schemas/*.schema.yaml` を参照。**

| ファイル | 形式 | スキーマ | 更新方針 |
|---------|------|---------|---------|
| `project_charter.md` | Markdown | - | 基本情報をマージ（上書きではなく補完） |
| `requirements_master.md` | Markdown | - | 新規要件を追記、既存要件は更新 |
| `open_questions.yaml` | YAML | `schemas/open_questions.schema.yaml` | 新規追加、解決済みはstatus: resolved |
| `decisions.yaml` | YAML | `schemas/decisions.schema.yaml` | 新規決定を配列に追加 |
| `risks.yaml` | YAML | `schemas/risks.schema.yaml` | 新規リスク追加、既存は状態更新 |
| `issues.yaml` | YAML | `schemas/issues.schema.yaml` | 新規課題追加、既存は状態更新 |
| `change_log.yaml` | YAML | `schemas/change_log.schema.yaml` | 変更エントリを配列に追加 |

**ID採番ルールは各スキーマファイルの`id_generation`セクションを参照。**
- 要件: `REQ-XXX`（連番、001から開始）
- 決定: `DEC-XXX`
- 質問: `QST-XXX`
- リスク: `RSK-XXX`
- 課題: `ISS-XXX`
- 変更: `CHG-XXX`

### Step 4: hearing_digest生成
`processing/hearing_digests/YYYY-MM-DD_topic.yaml`を生成する。

```yaml
source: "inputs/hearings/YYYY-MM-DD_topic.md"
processed_at: "YYYY-MM-DD HH:MM"
extracted:
  requirements:
    - id: "REQ-XXX"
      type: "functional"
      summary: "要件の概要"
  decisions:
    - id: "DEC-XXX"
      summary: "決定内容"
      rationale: "根拠"
  questions:
    - id: "QST-XXX"
      summary: "確認事項"
      owner: "担当者"
  risks:
    - id: "RSK-XXX"
      summary: "リスク概要"
  issues:
    - id: "ISS-XXX"
      summary: "課題概要"
changes_made:
  - file: "project_state/requirements_master.md"
    action: "added"
    items: ["REQ-001", "REQ-002"]
  - file: "project_state/decisions.yaml"
    action: "added"
    items: ["DEC-001"]
```

### Step 5: 更新記録
1. `inputs/hearings/_index.yaml`: `processed: Yes`に更新
2. `project_state/change_log.yaml`: 変更エントリを追加
3. `logs/runlog.md`: 実行ログを追記

**change_log.yaml エントリ形式:**
```yaml
- id: "CHG-001"
  date: "2026-01-10"
  source:
    type: "hearing"
    ref: "2026-01-10_kickoff.md"
  changes:
    - target: "project_state/requirements_master.md"
      action: "added"
      items: ["REQ-001", "REQ-002", "REQ-003"]
    - target: "project_state/decisions.yaml"
      action: "added"
      items: ["DEC-001"]
    - target: "project_state/open_questions.yaml"
      action: "added"
      items: ["QST-001", "QST-002"]
  summary: "キックオフヒアリングから要件3件、決定1件、質問2件を追加"
```

**runlog.md フォーマット:**
```markdown
## YYYY-MM-DD HH:MM - Intake実行
- **処理ファイル**: 2026-01-10_kickoff.md
- **結果**: 成功
- **更新ファイル**: 5件
- **新規ID**: REQ-001〜REQ-003, DEC-001, QST-001〜QST-002
```

## エラー処理

| エラー | 対応 |
|-------|-----|
| ヒアリングメモが空 | 警告を出力し、スキップ |
| 必須情報の欠落 | open_questions.yamlに確認事項として追加 |
| 矛盾する情報の検出 | 警告を出力し、open_questions.yamlに追加 |
| ファイル書き込み失敗 | エラーを出力し、処理を中断 |

## 出力例

実行完了後のサマリ出力:
```
[Intake完了]
- 処理ファイル: 2026-01-10_kickoff.md
- 更新ファイル:
  - project_state/project_charter.md
  - project_state/requirements_master.md
  - project_state/open_questions.yaml
  - project_state/decisions.yaml
  - project_state/change_log.yaml
- 新規追加:
  - 要件: REQ-001〜REQ-005
  - 決定: DEC-001
  - 質問: QST-001〜QST-003
  - 変更ログ: CHG-001
- 生成ファイル:
  - processing/hearing_digests/2026-01-10_kickoff.yaml
```

## 注意事項

1. **マージ方式**: 既存情報は上書きせず、補完・追記する
2. **重複チェック**: 既存のIDと重複しないよう確認
3. **参照保持**: 抽出した情報には元のヒアリングファイルへの参照を保持
4. **YAML配列追加**: 既存のYAML配列に新規エントリを追加する形式で更新
