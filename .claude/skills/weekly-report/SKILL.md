---
name: weekly-report
description: |
  WBS/課題/リスクから週次進捗報告書を自動生成するSkill。
  wbs.yaml, issues.yaml, risks.yamlを集計してweekly_report_draft.mdを生成。
  キーワード: weekly report, 週次報告, 週報, 進捗報告, 週次レポート,
  wbs.yaml, issues.yaml, risks.yaml, weekly_report_draft
allowed-tools: Read, Write, Edit, Glob, Grep
---

# WeeklyReport Skill - 週次報告書生成

## 概要
`project_state/`のwbs.yaml, issues.yaml, risks.yamlから、
週次進捗報告書（`outputs/weekly_report_draft.md`）を自動生成する。

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

詳細な抽出ルールは `references/report-extraction-rules.md` を参照。

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
- **ハイライト**: 当週status=Doneになったタスク
- **リスク/懸念**: High優先度の未解決Issue、高スコアRisk

1.2 タスク消化状況
- 当週対象タスク = due が期間内 OR status=InProgress
- 状態別集計: Done / InProgress / Blocked / Todo

1.3 遅延の詳細
- 遅延タスク = due < today AND status != Done
- 遅延原因: 関連Issueがあればその内容、なければ「要確認」

1.4 次週の予定
- 次週対象タスク = due が次週期間内
- depends_onから依存関係を記載

**課題状況（Section 2）:**

2.1 概況と件数
- 新規 = created_at が期間内
- 解決 = status=Resolved AND updated_at が期間内
- 継続 = status IN (Open, InProgress) AND created_at < 期間開始

2.2 Priority/状態別集計
- High/Medium/Low × Open/InProgress/Resolved/Deferred のマトリクス

2.3 課題詳細
- 新規発生: 期間内に作成された課題
- 継続: 期間前から継続中の課題
- 解決: 期間内に解決された課題

**リスク状況（Section 3）:**
- 注目リスク = score上位3件 OR impact=高
- 新規兆候 = early_signalsに該当する状況

### Step 3: レポート生成
`templates/weekly_report.md`の構造に従い、
`outputs/weekly_report_draft.md`を生成。

空セクションには「該当なし」を記載。

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
| `--summary-only` | サマリのみ生成 |

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
  - 新規: 2件
  - 解決: 1件
  - 継続: 4件
- リスク:
  - 注目: 2件（高スコア）
- 出力: outputs/weekly_report_draft.md
```

## 注意事項

1. **データ鮮度**: 実行前にwbs.yaml等の状態が最新か確認推奨
2. **空データ対応**: タスク/課題/リスクが0件でも生成可能
3. **定期実行**: 週末または週初に実行を推奨
4. **手動補足**: 生成後、ハイライト等は手動で補足可能
