# DocGen Skill - テンプレートマッピング定義

各テンプレートのセクションと、対応するproject_stateデータソースのマッピング。

---

## 1. proposal_draft.md（提案書）

**テンプレート**: `templates/proposal.md`
**出力先**: `outputs/proposal_draft.md`

### セクション別マッピング

| セクション | データソース | 抽出内容 |
|-----------|------------|---------|
| 表紙 | project_charter.md | 顧客名、プロジェクト名、提出日 |
| 1. アジェンダ | - | テンプレート固定 |
| 2. 会社紹介 | - | テンプレート固定（必要に応じて手動編集） |
| 3. エグゼクティブサマリー | project_charter.md, requirements_master.md | 目的、主要課題、提案概要 |
| 4. 課題認識 | requirements_master.md | 現状課題、業務上の課題 |
| 5. 解決アプローチ | decisions.yaml, requirements_master.md | 解決方針、採用技術 |
| 6. AIWorkforceプラットフォーム概要 | - | テンプレート固定（製品説明） |
| 7. 提供価値（ROI） | project_charter.md | 期待効果、削減工数 |
| 8. 主要ユースケース | requirements_master.md | 機能要件から主要ユースケースを抽出 |
| 9. 導入ステップ | project_charter.md, wbs.yaml | スケジュール概要、フェーズ構成 |
| 10. プロジェクト体制 | project_charter.md | 体制図、役割分担 |
| 11. リスクと対策 | risks.yaml | 主要リスクと対策 |

### データ抽出ルール

**requirements_master.md から:**
```
課題認識 → 「現状課題」「背景」セクションから抽出
ユースケース → 機能要件（REQ-XXX type=functional）から抽出
```

**risks.yaml から:**
```
impact=高 または probability=高 のリスクを優先表示
status=Open のもののみ表示
最大5件まで
```

---

## 2. project_plan_draft.md（プロジェクト計画書）

**テンプレート**: `templates/project_plan.md`
**出力先**: `outputs/project_plan_draft.md`

### セクション別マッピング

| セクション | データソース | 抽出内容 |
|-----------|------------|---------|
| 表紙 | project_charter.md | プロジェクト名、作成日、バージョン |
| 1. 本計画書の目的 | - | テンプレート固定 |
| 2. プロジェクトゴール | project_charter.md | 目的、成功基準、KPI |
| 3. スコープ定義 | project_charter.md, decisions.yaml | スコープ内/外、スコープ変更決定 |
| 4. プロジェクト体制 | project_charter.md | 体制図、連絡先、RACI |
| 5. フェーズ構成 | wbs.yaml | フェーズ一覧、各フェーズの目的 |
| 6. マスタースケジュール | wbs.yaml | WBSからガントチャート形式で生成 |
| 7. フェーズ別タスク・成果物 | wbs.yaml | タスク詳細、成果物一覧 |
| 8. 環境構成 | requirements_master.md | 非機能要件から環境要件を抽出 |
| 9. コミュニケーション計画 | project_charter.md | 会議体、報告ルール |
| 10. リスクと対策 | risks.yaml | リスク一覧と対策 |
| 11. 変更管理 | - | テンプレート固定 |

### データ抽出ルール

**wbs.yaml から:**
```yaml
# フェーズ構成の生成
フェーズ = tasks.phase の一意な値をリスト化
各フェーズのタスク = tasks[phase == target_phase]

# スケジュール生成
開始日 = min(tasks.due) または tasks[0].due - 見積期間
終了日 = max(tasks.due)
```

**project_charter.md から:**
```
体制 → 「体制」セクションをそのまま転記
スコープ → 「スコープ」「スコープ外」セクションを転記
```

---

## 3. requirements_draft.md（要件定義書）

**テンプレート**: `templates/requirements.md`
**出力先**: `outputs/requirements_draft.md`

### セクション別マッピング

| セクション | データソース | 抽出内容 |
|-----------|------------|---------|
| 表紙 | project_charter.md | プロジェクト名、版数、日付 |
| 1. ドキュメント概要 | - | テンプレート固定 |
| 2. 背景・目的 | project_charter.md | 目的、背景 |
| 3. 用語定義 | requirements_master.md | 用語一覧（あれば） |
| 4. 全体像 | project_charter.md, requirements_master.md | システム概要、業務フロー |
| 5. 業務要件 | requirements_master.md | 業務シナリオ、ユースケース |
| 6. 機能要件 | requirements_master.md | type=functionalの要件一覧 |
| 7. 非機能要件 | requirements_master.md | type=non-functionalの要件一覧 |
| 8. インターフェース要件 | requirements_master.md | 連携要件を抽出 |
| 9. データ要件 | requirements_master.md | データ関連要件を抽出 |
| 10. 制約条件 | project_charter.md, decisions.yaml | 制約、前提条件 |
| 11. リスク・課題 | risks.yaml, issues.yaml | オープンなリスク・課題 |

### データ抽出ルール

**requirements_master.md から:**
```
機能要件 → REQ-XXX where type == "functional"
  - ID、タイトル、概要、詳細、優先度を表形式で出力

非機能要件 → REQ-XXX where type == "non-functional"
  - カテゴリ別（性能、セキュリティ、可用性等）にグループ化
```

**open_questions.yaml から:**
```
status == "Open" の項目を「未決事項」として記載
関連する要件セクションに注記を追加
```

---

## 4. weekly_report_draft.md（週次進捗報告書）

**テンプレート**: `templates/weekly_report.md`
**出力先**: `outputs/weekly_report_draft.md`

### セクション別マッピング

| セクション | データソース | 抽出内容 |
|-----------|------------|---------|
| ヘッダー | - | 報告期間、作成日、作成者 |
| 1.1 概況 | wbs.yaml | 全体ステータス（自動判定） |
| 1.2 タスク消化状況 | wbs.yaml | 当週対象タスクの状態 |
| 1.3 遅延の詳細 | wbs.yaml, issues.yaml | 遅延タスクと原因 |
| 1.4 次週の予定 | wbs.yaml | 次週対象タスク |
| 2.1 課題概況 | issues.yaml | 件数集計 |
| 2.2 課題詳細 | issues.yaml | 新規/継続/解決別一覧 |
| 3. リスク状況 | risks.yaml | 注目リスク |

### データ抽出ルール

**wbs.yaml から:**
```yaml
# 全体ステータス判定
遅延率 = count(due < today AND status != Done) / count(all)
On Track: 遅延率 == 0%
At Risk: 0% < 遅延率 <= 20%
Off Track: 遅延率 > 20%

# 当週タスク
当週タスク = tasks where (due >= 週初 AND due <= 週末) OR status == InProgress

# 遅延タスク
遅延タスク = tasks where due < today AND status != Done
```

**issues.yaml から:**
```yaml
# 件数集計
新規 = count(created_at >= 週初)
解決 = count(status == Resolved AND updated_at >= 週初)
継続 = count(status IN (Open, InProgress) AND created_at < 週初)
```

---

## 共通ルール

### プレースホルダー形式
```markdown
[顧客名]           → project_charter.mdから取得
[プロジェクト名]    → project_charter.mdから取得
[YYYY-MM-DD]       → 現在日付または指定日付
[要入力: 項目名]   → データ未設定時の表示
[TBD]              → 後日決定事項
```

### データ不足時の動作
1. 必須項目が未設定: `[要入力: 項目名]`を挿入
2. 任意項目が未設定: セクションをスキップまたは空欄表示
3. 参照エラー: `[参照エラー: ファイル名]`を挿入し、警告出力

### 差分更新の判定
```
更新必要 =
  source_state.any(file.updated_at > draft.generated_at) OR
  template.updated_at > draft.generated_at
```

### 手動編集の検出
```markdown
<!-- MANUAL START --> ... <!-- MANUAL END -->  → 保護
## セクション名 <!-- MANUAL -->               → セクション全体を保護
```
