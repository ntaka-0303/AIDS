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

**抽出項目と定義:**

| 項目 | 定義 | 具体例 |
|-----|------|-------|
| **要件（Requirements）** | システム/サービスが実現すべき機能・性能・制約 | 「承認ワークフロー機能」「レスポンス3秒以内」 |
| **決定事項（Decisions）** | ヒアリング時に合意・決定された方針 | 「OAuth2.0を採用」「Phase1は基本機能のみ」 |
| **未決事項（Questions）** | ヒアリング時に**決まらなかった**確認事項 | 「データ移行範囲は？（持ち帰り検討）」 |
| **リスク（Risks）** | プロジェクト推進上の将来の脅威（未顕在） | 「レビュー遅延の可能性」「キーマン離任リスク」 |
| **課題（Issues）** | **プロジェクト推進上の顕在化した問題** | 「担当者未アサイン」「環境構築遅延」 |
| **基本情報（Charter）** | プロジェクト名、目的、背景、体制、スケジュール等 | - |

**⚠️ 重要：分類判断基準**

```
ヒアリング内容の分類フロー:

「現在の業務でXXXが問題」「XXXに困っている」
  └─→ 【要件の背景】または【プロジェクト憲章の背景】
      ※ issues.yaml には登録しない

「システムでXXXしたい」「XXX機能が必要」
  └─→ 【Requirements】requirements_master.md

「XXXはどうしますか？」「XXXを決めたい」
  └─→ 【Questions】open_questions.yaml
      （決定済みなら【Decisions】decisions.yaml）

「XXXの懸念がある」「XXXになる可能性」
  └─→ 【Risks】risks.yaml

「プロジェクトでXXXが障害」「体制がXXX」「進捗がXXX」
  └─→ 【Issues】issues.yaml
      ※ プロジェクト推進上の問題のみ
```

**誤分類の例:**
| ヒアリング内容 | ❌ 誤 | ✅ 正 |
|--------------|------|------|
| 「現行システムの処理が遅くて困っている」 | Issues | Requirements背景 または Charter背景 |
| 「例外処理のフローが複雑で属人化している」 | Issues | Requirements背景 または Charter背景 |
| 「データの二重入力が発生している」 | Issues | Requirements背景 |
| 「担当者がアサインされていない」 | - | Issues（プロジェクト推進の問題） |
| 「検証環境の構築が遅れている」 | - | Issues（プロジェクト推進の問題） |

### Step 2.5: スキーマバリデーション（NEW）

抽出した構造化データをschema-validator agentで検証する。

**バリデーション対象:**
- 新規追加するREQ, DEC, QST, RSK, ISSの全データ
- project_state/schemas/*.schema.yamlで定義されたルールに準拠

**バリデーション種別（A～E）:**
1. **A. データフォーマット**: required, pattern, enum, 日付フォーマット、ID採番ルール
2. **B. 参照整合性**: reference_integrity（参照先ID存在確認）
3. **C. 日付整合性**: date_consistency（due >= created_at等）
4. **D. ビジネスルール**: business_rules（条件付き必須フィールド等）
5. **E. 状態遷移**: state_transitions（許可された状態遷移のみ）

**実行方法:**
```
[schema-validator agentを呼び出し]
- 対象: 新規追加データ
- スキーマ: decisions.schema.yaml, open_questions.schema.yaml,
           risks.schema.yaml, issues.schema.yaml

結果:
- Critical: 0件, Warning: 1件
  - [WARNING] QST-004のownerが未設定

判定:
- Critical → 更新中止、修正必須
- Warning → ユーザーに確認、続行可能
- OK → Step 3へ進む
```

**エラー時の対応:**
| エラーレベル | 対応 |
|------------|-----|
| Critical | 更新を中止し、修正提案を表示。ユーザーに修正を依頼 |
| Warning | 警告内容を表示し、続行確認をユーザーに求める |
| Info | 情報提供のみ、更新継続 |

### Step 3: project_state更新
以下のファイルを更新する。
詳細ルールは `references/state-update-rules.md` を参照。
**スキーマ定義は `project_state/schemas/*.schema.yaml` を参照。**

| ファイル | 形式 | スキーマ | 更新方針 |
|---------|------|---------|---------|
| `project_charter.md` | Markdown | - | 基本情報をマージ（上書きではなく補完） |
| `requirements_master.md` | Markdown | - | 新規要件を追記、既存要件は更新 |
| `open_questions.yaml` | YAML | `schemas/open_questions.schema.yaml` | **新規追加のみ**（状態更新はProject Mgmtで） |
| `decisions.yaml` | YAML | `schemas/decisions.schema.yaml` | 新規決定を配列に追加 |
| `risks.yaml` | YAML | `schemas/risks.schema.yaml` | **新規リスクの初期登録のみ**（状態更新はProject Mgmtで） |
| `issues.yaml` | YAML | `schemas/issues.schema.yaml` | **新規課題の初期登録のみ**（状態更新はProject Mgmtで） |
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

## 他スキルとの責務分担

| 対象 | Intakeの責務 | Project Mgmtの責務 |
|------|-------------|-------------------|
| **issues.yaml** | ヒアリング起点の初期登録 | 手動追加、状態更新、解決 |
| **risks.yaml** | ヒアリング起点の初期登録 | 手動追加、状態更新、顕在化対応 |
| **open_questions.yaml** | ヒアリング起点の初期登録 | 状態更新（resolved/deferred） |

**重要**: Intakeは「ヒアリングからの情報抽出・初期登録」に専念し、
日常の進捗管理（状態更新）はProject Management Skillで行う。
