---
name: quality-gate
description: |
  成果物とproject_stateの品質チェックを実行するSkill。
  抜け漏れと整合性を検証し、修正指示を生成する。
  キーワード: quality gate, 品質チェック, レビュー, 抜け漏れ,
  整合性確認, completeness, consistency, reviews/
allowed-tools: Read, Write, Glob, Grep
---

# QualityGate Skill - 品質チェック

## 概要
`outputs/`の成果物と`project_state/`の整合性・完全性をチェックし、
`reviews/*.md`にレビュー結果と修正指示を出力する。

## 実行トリガー
- 「品質チェックを実行」
- 「quality gateを実行」
- 「提案書をレビュー」
- 「整合性を確認」
- 「抜け漏れチェック」

## スキーマ参照

各YAMLファイルのスキーマ定義は `project_state/schemas/` を参照:
- `wbs.schema.yaml` - WBSタスク管理
- `risks.schema.yaml` - リスク管理
- `issues.schema.yaml` - 課題管理
- `decisions.schema.yaml` - 決定事項
- `open_questions.schema.yaml` - 未決事項・確認事項
- `change_log.schema.yaml` - 変更履歴

## チェック観点

### A. 抜け漏れ（Completeness）
詳細は `references/completeness-rules.yaml` を参照。

1. **必須セクションチェック**
   - テンプレートで定義された必須セクションが存在するか
   - セクション内容が空、「TODO」、「[要入力]」のままでないか

2. **未反映open_questionsチェック**
   - `open_questions.yaml`の未解決項目が成果物に反映されているか
   - 関連セクションに「確認中」「TBD」の記載があるか

3. **要件→WBS落とし込みチェック**
   - `requirements_master.md`の各要件に対応するWBSタスクが存在するか
   - 要件IDとWBSのrelated紐づけが正しいか

### B. 整合性（Consistency）
詳細は `references/consistency-rules.yaml` を参照。
**バリデーションルールは各スキーマファイルの`validation`セクションも参照。**

1. **decisions矛盾チェック**
   - `decisions.yaml`のスコープ外判定と成果物内容の矛盾
   - 決定事項と要件/計画の整合性

2. **リンク一致チェック**
   - `wbs.yaml`のdeliverableが`outputs/`に実在するか
   - issues/risksのrelated参照が実在するか
   - スキーマの`reference_integrity`ルールに基づく検証

3. **相互リンクチェック**
   - 顕在化したリスク（status=Realized）がIssue化されているか
   - 解決済みIssueに対応するリスクがMitigated/Closedか
   - スキーマの`business_rules`に基づく検証

## 実行ステップ

### Step 1: 対象ファイル収集
```
チェック対象:
- outputs/*.md（生成されたドラフト）
- project_state/*（状態管理ファイル）

参照用:
- templates/*.md（必須セクション定義として）
```

### Step 2: ルール別チェック実行
各ルールを順次適用し、違反を収集。
重大度レベル: Critical / Warning / Info

### Step 3: レビュー結果生成
`reviews/<filename>_review.md`を生成:

```markdown
# proposal_draft.md レビュー結果

## 実行日時
YYYY-MM-DD HH:MM

## サマリ
| カテゴリ | Critical | Warning | Info |
|---------|----------|---------|------|
| 抜け漏れ | 1 | 2 | 0 |
| 整合性 | 0 | 2 | 1 |
| **合計** | **1** | **4** | **1** |

## 詳細

### [CRITICAL] COM-001: 必須セクション欠落
- **対象**: 6.2 プラットフォーム特徴
- **内容**: セクション内容が空です
- **修正指示**: project_state/requirements_master.mdの機能要件を元に記載してください
- **関連**: REQ-003, REQ-005

### [WARNING] COM-002: 未反映open_question
- **対象**: 10. セキュリティ・ガバナンス
- **内容**: QST-003「認証方式の確定」が未反映
- **修正指示**: 確定後に更新するか、「確認中」と明記してください
- **関連**: QST-003

### [WARNING] CON-001: 参照リンク不一致
...
```

### Step 4: 修正指示生成
各指摘に対する具体的な修正アクションを記載:
- 対象ファイル/セクション
- 問題の内容
- 具体的な修正方法
- 関連するID（REQ, DEC, QST等）

### Step 5: 更新記録
- `logs/runlog.md`: チェック実行ログを追記

## 重大度レベル

| レベル | 定義 | 例 |
|-------|-----|-----|
| Critical | 成果物として不完全、顧客提出不可 | 必須セクション欠落、重大な矛盾 |
| Warning | 確認・修正が望ましい | 未反映open_question、軽微な不整合 |
| Info | 参考情報、改善提案 | 欠番ID、推奨事項 |

## オプション

| オプション | 説明 |
|-----------|------|
| `--target <file>` | 特定ファイルのみチェック |
| `--rule <category>` | 特定カテゴリのみ（completeness/consistency） |
| `--severity <level>` | 指定レベル以上のみ表示 |

## 出力例

```
[QualityGate完了]
- 対象ファイル:
  - outputs/proposal_draft.md
  - outputs/project_plan_draft.md
- 検出件数:
  - Critical: 2件
  - Warning: 5件
  - Info: 3件
- 出力:
  - reviews/proposal_review.md
  - reviews/project_plan_review.md
- 推奨アクション: Critical 2件を優先対応
```

## 注意事項

1. **読み取り専用**: このSkillはEditツールを使用しない（指示のみ）
2. **全体チェック推奨**: 差分チェックより全体チェックを推奨
3. **定期実行**: ドキュメント更新後、提出前に必ず実行
4. **人の判断**: Critical以外は人が採否を判断
