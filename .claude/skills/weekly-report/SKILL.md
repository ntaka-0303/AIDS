---
name: weekly-report
description: |
  WBS/課題/リスク/未決事項から週次進捗報告書を自動生成するSkill。
  wbs.yaml, issues.yaml, risks.yaml, open_questions.yamlを集計して
  weekly_report_draft.mdを生成。概況と重要事項（遅延・意思決定必要・高リスク）に特化。
  キーワード: weekly report, 週次報告, 週報, 進捗報告, 週次レポート,
  wbs.yaml, issues.yaml, risks.yaml, open_questions.yaml, weekly_report_draft
allowed-tools: Read, Write, Edit, Glob, Grep
---

# WeeklyReport Skill - 週次報告書生成

## 概要
`project_state/`のwbs.yaml, issues.yaml, risks.yaml, open_questions.yaml, change_log.yamlから、
週次進捗報告書（`outputs/weekly_report_draft.md`）を自動生成する。

**設計方針**: 各種一覧（WBS、課題、リスク等）はExcelで別途提示。
本報告書は概況と重要事項（遅延タスク、意思決定必要な未決事項、高スコアリスク）に特化。

## 実行トリガー
- 「週次報告を生成」
- 「週報を作成」
- 「weekly report」
- 「進捗報告を生成」

## データソース

| ファイル | 用途 |
|---------|------|
| project_state/wbs.yaml | タスク進捗、遅延状況 |
| project_state/issues.yaml | 課題状況 |
| project_state/risks.yaml | リスク状況 |
| project_state/open_questions.yaml | 未決事項状況 |
| project_state/change_log.yaml | スコープ/要件変更 |

詳細な抽出ルールは `references/report-extraction-rules.md` を参照。

## レポート構成

| セクション | 内容 | 一覧表示 |
|-----------|------|---------|
| 1. 進捗状況 | 概況 + タスク消化サマリ + 遅延タスク | 遅延のみ |
| 2. 課題状況 | 概況のみ | なし |
| 3. 未決事項 | 概況 + 意思決定必要な未決事項 | 意思決定必要のみ |
| 4. リスク状況 | 概況 + 高スコアリスク監視 | 高スコアのみ |
| 5. スコープ/要件変更 | 概況のみ | なし |

## 実行ステップ

### Step 1: 期間設定
デフォルト: 直近の月曜〜日曜（当週）
オプション指定時: `--from YYYY-MM-DD --to YYYY-MM-DD`

```
報告期間の自動計算:
- 今日が月〜金: 今週月曜〜今週日曜
- 今日が土〜日: 今週月曜〜今週日曜
```

### Step 2: データ抽出と集計

**進捗状況（Section 1）:**

1.1 概況
- **全体ステータス自動判定**:
  ```
  遅延率 = count(due < today AND status != Done) / count(due <= today)
  On Track: 遅延率 == 0%
  At Risk: 0% < 遅延率 <= 20%
  Off Track: 遅延率 > 20%
  ```
- **ハイライト**: 当週status=Doneになったタスク（上位5件）
- **意思決定・確認依頼**: High優先度の未解決Issue、回答期限が近い未決事項

1.2 タスク消化サマリ
- 当週完了: count(status=Done AND updated_at in period)
- 当週着手: count(status=InProgress)
- ブロック中: count(status=Blocked)

1.3 遅延タスク
- 遅延タスク = due < today AND status != Done
- 遅延原因: 関連Issueがあればその内容、なければ「要確認」

**課題状況（Section 2）:**

2.1 概況
- 全体概況: 状態に応じて自動判定
- 新規 = created_at が期間内
- 解決 = status=Resolved AND updated_at が期間内
- 継続 = status IN (Open, InProgress) AND created_at < 期間開始

**未決事項（Section 3）:**

3.1 概況
- 新規 = created_at が期間内
- 解決 = status=resolved AND resolved_at が期間内
- 継続 = status=open AND created_at < 期間開始

3.2 今週中に意思決定が必要な未決事項
- 抽出条件: status=open AND due <= period_end
- 関連するWBSタスクへの影響を記載

**リスク状況（Section 4）:**

4.1 概況
- 新規 = 期間内に登録
- 状態変更 = status変更があったもの
- 高スコアリスク = score >= 7

4.2 高スコアリスクの監視状況
- 抽出条件: status IN (Open, Monitoring) AND score >= 7
- 早期兆候の有無、今週の対応、次アクションを記載

**スコープ/要件変更（Section 5）:**

5.1 概況
- change_log.yamlから期間内の変更を集計
- 変更件数（追加/変更/削除）
- スコープへの影響度

### Step 3: レポート生成
`templates/weekly_report.md`の構造に従い、
`outputs/weekly_report_draft.md`を生成。

空セクションには「該当なし」または「なし」を記載。

### Step 4: メタデータ付与
```markdown
<!--
generated_at: YYYY-MM-DD HH:MM
report_period: YYYY-MM-DD 〜 YYYY-MM-DD
generator: weekly-report skill
source_data:
  - wbs.yaml (tasks: N件)
  - issues.yaml (issues: N件)
  - risks.yaml (risks: N件)
  - open_questions.yaml (questions: N件)
  - change_log.yaml (entries: N件)
-->
```

### Step 5: 更新記録
- `logs/runlog.md`: 生成ログを追記

## オプション

| オプション | 説明 |
|-----------|------|
| `--from <date>` | 報告期間の開始日 |
| `--to <date>` | 報告期間の終了日 |
| `--compare-previous` | 前週比を含める |

## 全体ステータス判定ロジック

```
【データ】
- 期限到来タスク: due <= today のタスク
- 遅延タスク: due < today AND status != Done

【計算】
遅延率 = 遅延タスク数 / 期限到来タスク数 × 100%

【判定】
On Track  : 遅延率 = 0%（遅延なし）
At Risk   : 0% < 遅延率 <= 20%（軽微な遅延）
Off Track : 遅延率 > 20%（重大な遅延）

【例外】
- 期限到来タスクが0件: 「進行中タスクなし」と表示
- Blockedタスクあり: 自動的に「At Risk」以上
```

## 出力例

```
[WeeklyReport完了]
- 報告期間: 2026-01-06 〜 2026-01-12
- 全体ステータス: At Risk
  - 期限到来: 10件
  - 完了: 8件
  - 遅延: 2件（遅延率20%）
- タスク:
  - Done: 5件
  - InProgress: 3件
  - Blocked: 1件
- 課題:
  - 新規: 2件 / 解決: 1件 / 継続: 4件
- 未決事項:
  - 継続: 3件 / 意思決定必要: 1件
- リスク:
  - 高スコア（7-9）: 2件
- スコープ変更:
  - なし
- 出力: outputs/weekly_report_draft.md
```

## 注意事項

1. **データ鮮度**: 実行前にwbs.yaml等の状態が最新か確認推奨
2. **空データ対応**: タスク/課題/リスクが0件でも生成可能
3. **定期実行**: 週末または週初に実行を推奨
4. **手動補足**: 生成後、ハイライト等は手動で補足可能
5. **一覧はExcel**: 詳細な一覧はExcelで別途提示（報告書には概況のみ）
