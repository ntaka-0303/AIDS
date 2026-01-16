---
name: quality-gate
description: |
  成果物とproject_stateの品質チェックを実行するSkill。
  抜け漏れと整合性を検証し、修正指示を生成する。
  キーワード: quality gate, 品質チェック, レビュー, 抜け漏れ,
  整合性確認, completeness, consistency, outputs/reviews/
allowed-tools: Read, Write, Glob, Grep
---

# QualityGate Skill - 品質チェック

## 概要
`outputs/`の成果物と`project_state/`の整合性・完全性をチェックし、
`outputs/reviews/*.md`にレビュー結果と修正指示を出力する。

## 役割と責務範囲

**Quality-Gateの役割:**
- **G. 成果物完全性チェック**: テンプレート必須セクション、空セクション、TODOマーク等
- **H. 成果物整合性チェック**: decisions矛盾、open_questions反映、要件→WBS落とし込み、上位成果物との整合性

### DocGenとの役割分担（G. 成果物完全性）

**Quality-GateがG（成果物完全性）の全責任を担う。**
DocGenは軽量チェックのみ実施し、詳細チェックとレポート生成はQuality-Gateで行う。

| チェック項目 | DocGen | Quality-Gate | 備考 |
|------------|--------|-------------|------|
| G-1: 必須セクション存在 | - | **実施** | レポートで修正指示 |
| G-2: 空セクション検出 | マーク挿入 | **実施** | 最終判定はQuality-Gate |
| G-3: TODO/TBDマーク検出 | - | **実施** | レポートで修正指示 |
| G-4: 必須フィールド記入 | - | **実施** | レポートで修正指示 |
| G-5: フェーズ一貫性 | マーク挿入 | - | DocGenのみで完結 |
| レポート生成 | なし | **生成** | outputs/reviews/ |

**設計意図:**
- DocGen: 生成直後の即時フィードバック（マーク挿入で問題箇所を明示）
- Quality-Gate: 提出前の最終品質ゲート（全項目チェック + 修正指示レポート）

**Quality-Gateが実行しないこと:**
- **A～E. スキーマバリデーション**: データフォーマット、参照整合性、日付整合性、ビジネスルール、状態遷移
  - → これらはschema-validator agentがIntake/ProjectMgmtスキル実行時に予防的にチェック済み
  - → 事後確認が必要な場合はState-Reviewer agentが担当

**品質保証の階層における位置づけ:**
```
【第1層: データ正当性保証】
  └─ スキーマ定義 + schema-validator agent

【第2層: 更新時品質保証（予防）】
  └─ Intake/ProjectMgmt/DocGen Skill

【第3層: 事後確認・横断チェック】← Quality-Gateはここ
  └─ Quality-Gate Skill: 成果物固有の品質チェック
  └─ State-Reviewer Agent: project_state横断整合性
```

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

Quality-Gateは **G. 成果物完全性** と **H. 成果物整合性** に特化してチェックを実施。

**重要:** スキーマバリデーション（A～E）は実施しない。これらはschema-validator agentがIntake/ProjectMgmtスキル実行時にチェック済み。

### G. 成果物完全性（Completeness）
詳細は `references/completeness-rules.yaml` を参照。

1. **G-1: 必須セクション存在確認**
   - テンプレートで定義された必須セクションが存在するか
   - 各成果物（proposal, project_plan, requirements）の必須セクション

2. **G-2: 空セクション検出**
   - セクション内容が空、空行のみになっていないか

3. **G-3: [TODO][要入力][TBD]マーク検出**
   - 未入力を示すマークが残っていないか
   - [参照エラー]マークが残っていないか

4. **G-4: 必須フィールドの記入確認**
   - 表紙の顧客名、プロジェクト名、提出日等が記入されているか

5. **未反映open_questionsチェック**
   - `open_questions.yaml`の未解決項目が成果物に反映されているか
   - 関連セクションに「確認中」「TBD」の記載があるか

6. **要件→WBS落とし込みチェック**
   - `requirements_master.md`の各要件に対応するWBSタスクが存在するか
   - 要件IDとWBSのrelated紐づけが正しいか

### H. 成果物整合性（Consistency）
詳細は `references/consistency-rules.yaml` を参照。

**注意:** スキーマバリデーションと重複していたルール（CON-LINK-*, CON-WBS-001/003, CON-TIME-001, CON-RI-001）は削除済み。

1. **H-1: decisions矛盾チェック（CON-DEC-*）**
   - `decisions.yaml`のスコープ外判定と成果物内容の矛盾
   - 決定事項と要件/計画の整合性
   - 不採用技術が計画に含まれていないか

2. **H-2: リスク↔課題の状態整合性（CON-RI-002, 003）**
   - 解決済みIssueに対応するリスクがMitigated/Closedか
   - リスクと課題の相互リンクが成立しているか

3. **H-3: WBS固有のビジネスロジック（CON-WBS-002, 003）**
   - 完了タスクへの依存が残っていないか（Info）
   - due日付の整合性（依存関係を考慮）

4. **H-4: 時系列整合性（CON-TIME-001, 002）**
   - 未来日付のResolved/Doneがないか
   - change_logの時系列順序

5. **H-5: ドキュメント間整合性（CON-DOC-*）**
   - proposal_draftとproject_plan_draftのスコープ一致
   - requirements_draftとproject_plan_draftの要件一致
   - project_charterと各ドキュメントの基本情報一致

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
`outputs/reviews/<filename>_review.md`を生成:

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
  - outputs/reviews/proposal_review.md
  - outputs/reviews/project_plan_review.md
- 推奨アクション: Critical 2件を優先対応
```

## 注意事項

1. **読み取り専用**: このSkillはEditツールを使用しない（指示のみ）
2. **スキーマバリデーション非実施**: A～E（データフォーマット、参照整合性、日付整合性、ビジネスルール、状態遷移）はschema-validator agentがチェック済みのため実施しない
3. **成果物固有チェックに特化**: G（成果物完全性）とH（成果物整合性）のみ実施
4. **全体チェック推奨**: 差分チェックより全体チェックを推奨
5. **定期実行**: ドキュメント更新後、提出前に必ず実行
6. **人の判断**: Critical以外は人が採否を判断

## 他コンポーネントとの役割分担

| チェック種別 | 担当コンポーネント | 実行タイミング |
|------------|------------------|--------------|
| A～E. スキーマバリデーション | schema-validator agent → Intake/ProjectMgmt | 更新時（予防） |
| F. 抽出精度 | Intake Skill | ヒアリング取り込み時 |
| G. 成果物完全性 | **Quality-Gate Skill** | ドキュメント生成後、提出前 |
| H. 成果物整合性 | **Quality-Gate Skill** | ドキュメント生成後、提出前 |
| I. 横断整合性 | State-Reviewer Agent | 定期実行（週次等） |
