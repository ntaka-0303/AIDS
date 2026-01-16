---
name: project-management
description: |
  WBS/課題/リスク/未決事項のYAMLファイルを生成・更新するSkill。
  wbs.yaml, issues.yaml, risks.yaml, open_questions.yamlの追加・更新・整合性維持を行う。
  キーワード: WBS, タスク管理, 課題管理, リスク管理, タスク追加,
  課題登録, リスク追加, wbs.yaml, issues.yaml, risks.yaml
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Project Management Skill - WBS/課題/リスク/未決事項管理

## 概要
`project_state/`のwbs.yaml, issues.yaml, risks.yaml, open_questions.yamlの
生成・更新・整合性維持を行う。日常のプロジェクト進捗管理を担当。

## 実行トリガー
- 「WBSを更新」「タスクを追加」
- 「課題を登録」「課題を更新」「課題を解決」
- 「リスクを追加」「リスクを更新」
- 「質問を解決」「未決事項を更新」
- 「project management」

## 対象ファイルとスキーマ
**スキーマ定義は `project_state/schemas/*.schema.yaml` を参照。**

| データ | スキーマファイル |
|-------|----------------|
| WBS | `project_state/schemas/wbs.schema.yaml` |
| 課題 | `project_state/schemas/issues.schema.yaml` |
| リスク | `project_state/schemas/risks.schema.yaml` |
| 未決事項 | `project_state/schemas/open_questions.schema.yaml` |

### wbs.yaml
スキーマ: `project_state/schemas/wbs.schema.yaml`

主要フィールド:
- `id`: タスクID（P1-01形式）
- `phase`: フェーズ名
- `title`: タスクタイトル
- `status`: Todo/InProgress/Done/Blocked
- `due`: 期限日
- `depends_on`: 依存タスクID

### issues.yaml
スキーマ: `project_state/schemas/issues.schema.yaml`

主要フィールド:
- `id`: 課題ID（ISS-001形式）
- `title`: 課題タイトル
- `priority`: High/Medium/Low
- `status`: Open/InProgress/Resolved/Deferred
- `resolution`: 解決内容

### risks.yaml
スキーマ: `project_state/schemas/risks.schema.yaml`

主要フィールド:
- `id`: リスクID（RSK-001形式）
- `title`: リスクタイトル
- `status`: Open/Monitoring/Mitigated/Realized/Closed
- `impact/probability`: 高/中/低
- `score`: 自動計算

### open_questions.yaml
スキーマ: `project_state/schemas/open_questions.schema.yaml`

主要フィールド:
- `id`: 質問ID（QST-001形式）
- `question`: 質問内容
- `status`: open/resolved/deferred
- `answer`: 回答内容（resolved時）
- `owner`: 担当者

## 操作タイプ

### 1. 初期生成
- `requirements_master.md`から要件を読み取り
- フェーズ別にタスクを自動生成
- 標準的なリスクテンプレートを適用

### 2. タスク追加/更新
```
「タスクを追加: P2-05 PoC環境構築」
「タスク P1-03 の状態を InProgress に更新」
「タスク P2-01 に依存 P1-05 を追加」
```
- ID自動採番（指定なしの場合）
- depends_on指定時は依存先の存在確認
- 状態変更時はupdated_at自動更新

#### 成果物作成タスクの自動レビュー生成ルール
成果物作成タスク（`deliverable`フィールドが設定されているタスク）を追加する際、**必ず**対応する顧客レビュータスクを自動生成する。

**自動生成されるレビュータスクの仕様:**
- **タイトル**: `"{元タスクのtitle}の顧客レビュー"` または `"{deliverable名}の顧客レビュー"`
  - 例: 元タスク「提案書ドラフト作成」→ レビュータスク「提案書ドラフト作成の顧客レビュー」
- **ID**: 同一フェーズ内で次の連番を自動採番
  - 例: 元タスクがP1-01なら、レビュータスクはP1-02
- **phase**: 元タスクと同じフェーズ
- **deliverable**: null（レビュータスク自体は成果物を生成しない）
- **owner**: デフォルト「PMO」（プロジェクト管理者が顧客レビューを調整）
- **status**: デフォルト「Todo」
- **depends_on**: `[元タスクのID]`（元タスク完了後にレビュー可能）
- **due**: 元タスクのdue + 5営業日（デフォルト、後で調整可能）
- **definition_of_done**:
  - "顧客レビュー日程が確定"
  - "レビュー実施完了"
  - "指摘事項が記録された"
- **related**: 元タスクのrelated情報を継承（requirements, decisions等）

**例:**
```yaml
# 元タスク
- id: "P1-01"
  phase: "提案"
  title: "提案書ドラフト作成"
  deliverable: "outputs/proposal_draft.md"
  owner: "PMO"
  status: "InProgress"
  due: "2026-01-20"
  depends_on: []

# 自動生成されるレビュータスク
- id: "P1-02"
  phase: "提案"
  title: "提案書ドラフト作成の顧客レビュー"
  deliverable: null
  owner: "PMO"
  status: "Todo"
  due: "2026-01-27"  # 元タスク + 5営業日
  depends_on:
    - "P1-01"
  definition_of_done:
    - "顧客レビュー日程が確定"
    - "レビュー実施完了"
    - "指摘事項が記録された"
```

**注意事項:**
- レビュータスクの自動生成は**成果物作成タスク追加時のみ**実行
- 既存タスクのdeliverableを後から追加した場合は手動でレビュータスクを追加
- レビュータスクの期限やownerは後から調整可能

### 3. 課題追加/更新
```
「課題を登録: 認証方式が未確定 優先度High」
「課題 ISS-003 を解決: OAuth2.0を採用」
「課題 ISS-005 の優先度を Medium に変更」
```
- ID自動採番
- related指定時は参照先の存在確認
- 解決時はresolutionとupdated_atを更新

### 4. リスク追加/更新
```
「リスクを追加: 顧客レビュー遅延 影響高 確率中」
「リスク RSK-002 の状態を Realized に変更」
「リスク RSK-003 に対応課題 ISS-010 をリンク」
```
- ID自動採番
- impact/probabilityからscore自動計算
- status=Realized時はIssue化を提案

### 5. 未決事項の状態更新
```
「質問 QST-003 を解決: OAuth2.0を採用することで合意」
「質問 QST-005 を保留に変更」
```
- 解決時はanswer/resolved_at/resolved_byを更新
- 保留時はstatus=deferredに変更
- **新規追加はIntake Skillで行う**（ヒアリング起点）

### 6. 整合性維持
- 孤立した参照の検出と修正提案
- 完了タスクの依存関係整理
- 解決済み課題・リスクのリンク更新

## 実行ステップ

### Step 1: 現状把握
1. 対象YAMLファイルを読み込む
2. 既存ID一覧を取得
3. 参照関係を把握

### Step 2: 操作実行
1. ユーザー指示を解析
2. 該当する操作を実行
3. 自動採番・計算を適用

### Step 2.5: スキーマバリデーション（NEW）

追加/更新するデータをschema-validator agentで検証する。

**バリデーション対象:**
- wbs.yaml更新の場合: wbs.schema.yaml
- issues.yaml更新の場合: issues.schema.yaml
- risks.yaml更新の場合: risks.schema.yaml
- open_questions.yaml更新の場合: open_questions.schema.yaml

**バリデーション種別（A～E）:**
1. **A. データフォーマット**: required, pattern, enum, 日付フォーマット、ID採番ルール、文字列長
2. **B. 参照整合性**: reference_integrity（depends_on, related.*の参照先存在確認、循環参照検出）
3. **C. 日付整合性**: date_consistency（due >= created_at、依存タスクのdue整合性）
4. **D. ビジネスルール**: business_rules（Blocked時のblocker必須、Resolved時のresolution必須、Realized時のissues登録、スコア自動計算、Done時のdeliverable存在）
5. **E. 状態遷移**: state_transitions（許可された状態遷移のみ、final状態からの遷移禁止、状態遷移時の必須フィールド）

**実行例（WBS更新時）:**
```
[schema-validator agentを呼び出し]
- 対象: wbs.yaml P2-05（新規追加 or 更新内容）
- スキーマ: wbs.schema.yaml

結果:
- Critical: 1件
  - [CRITICAL] P2-05のdeliverable "outputs/poc_report.md"が存在しません
  - ビジネスルール: status == 'Done' implies deliverable file exists

判定:
- Critical → 更新中止、ユーザーに通知
```

**実行例（リスク更新時）:**
```
[schema-validator agentを呼び出し]
- 対象: risks.yaml RSK-002（status: Monitoring → Realized）
- スキーマ: risks.schema.yaml

結果:
- Critical: 1件
  - [CRITICAL] status=Realizedですが、related.issuesが空です
  - ビジネスルール: status == 'Realized' implies related.issues is not empty

判定:
- Critical → 更新中止、Issue作成を促す
```

**エラー時の対応:**
| エラーレベル | 対応 |
|------------|-----|
| Critical | 更新を中止し、修正必須。ユーザーに具体的な修正方法を提示 |
| Warning | 警告内容を表示し、続行確認をユーザーに求める |
| Info | 情報提供のみ（ID欠番等）、更新継続 |

### Step 3: 簡易整合性チェック（軽量版）

**注意:** スキーマバリデーション（A～E）はStep 2.5で実施済みのため、ここでは軽量なチェックのみ実施。

- 更新後の全体的な一貫性確認（簡易版）
- 明らかな論理矛盾がないかの最終確認

### Step 4: 更新適用
1. YAMLファイルを更新
2. `change_log.yaml`に変更を記録
3. `logs/runlog.md`に実行ログを追記

## ID採番ルール

| 種別 | フォーマット | 採番方法 |
|-----|------------|---------|
| WBSタスク | `P<phase>-XX` | 各フェーズ内で連番 |
| 課題 | `ISS-XXX` | 全体で連番 |
| リスク | `RSK-XXX` | 全体で連番 |

```
P1 = 提案フェーズ
P2 = 計画フェーズ
P3 = 設計フェーズ
P4 = 実装フェーズ
P5 = 移行フェーズ
```

## スコア計算

```
impact_value = {高: 3, 中: 2, 低: 1}
probability_value = {高: 3, 中: 2, 低: 1}
score = impact_value * probability_value
```

| 組み合わせ | スコア |
|-----------|--------|
| 高×高 | 9 |
| 高×中 | 6 |
| 高×低 | 3 |
| 中×高 | 6 |
| 中×中 | 4 |
| 中×低 | 2 |
| 低×高 | 3 |
| 低×中 | 2 |
| 低×低 | 1 |

## オプション

| オプション | 説明 |
|-----------|------|
| `--init` | 初期生成モード |
| `--validate` | バリデーションのみ実行 |
| `--dry-run` | 変更内容のプレビュー |

## 出力例

```
[Project Management完了]
- 操作: タスク追加
- 追加: P2-05 "PoC環境構築"
  - owner: 自社エンジニア
  - status: Todo
  - due: 2026-01-25
- 自動更新:
  - P2-04: depends_onにP2-05追加
- 整合性チェック: OK
- 記録: change_log.yaml, runlog.md
```

## 注意事項

1. **バックアップ推奨**: 大量更新前はgit commitを推奨
2. **整合性優先**: 参照先が存在しない場合は警告
3. **手動補足**: 自動生成後はオーナー・期限の確認推奨
4. **Realized→Issue**: リスク顕在化時は必ずIssue化を提案

## 他スキルとの責務分担

| 対象 | Intakeの責務 | Project Mgmtの責務 |
|------|-------------|-------------------|
| **wbs.yaml** | - | 作成・更新・状態管理（全操作） |
| **issues.yaml** | ヒアリング起点の初期登録 | 手動追加、状態更新、解決 |
| **risks.yaml** | ヒアリング起点の初期登録 | 手動追加、状態更新、顕在化対応 |
| **open_questions.yaml** | ヒアリング起点の初期登録 | 状態更新（resolved/deferred） |

**重要**:
- Intakeは「ヒアリングからの情報抽出・初期登録」に専念
- Project Managementは「日常の進捗管理・状態更新」を担当
- ヒアリング起点でない課題・リスクの新規追加もProject Managementで行う
