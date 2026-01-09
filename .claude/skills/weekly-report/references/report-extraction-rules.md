# WeeklyReport Skill - 抽出・集計ルール

## 期間の定義

```
報告期間: period_start 〜 period_end
前週期間: prev_start 〜 prev_end（7日前シフト）
次週期間: next_start 〜 next_end（7日後シフト）
```

---

## Section 1: 進捗状況

### 1.1 概況

**全体ステータス判定:**
```yaml
input:
  tasks: wbs.yaml.tasks
  today: 現在日付

calculation:
  due_tasks: tasks where due <= today
  delayed_tasks: tasks where due < today AND status != "Done"
  delay_rate: count(delayed_tasks) / count(due_tasks) * 100

judgment:
  - "On Track": delay_rate == 0
  - "At Risk": 0 < delay_rate <= 20
  - "Off Track": delay_rate > 20

special_cases:
  - due_tasks == 0: "進行中タスクなし"
  - any(status == "Blocked"): 最低でも "At Risk"
```

**ハイライト抽出:**
```yaml
source: wbs.yaml.tasks
filter: status == "Done" AND (updated_at >= period_start AND updated_at <= period_end)
output:
  - task_id
  - title
  - deliverable
sort: due ASC
limit: 5
```

**リスク/懸念抽出:**
```yaml
# 未解決High課題
issues_high:
  source: issues.yaml.issues
  filter: priority == "High" AND status IN ("Open", "InProgress")
  output: id, title, owner, due

# 高スコアリスク
risks_high:
  source: risks.yaml.risks
  filter: status == "Open" AND (impact == "高" OR score >= 6)
  output: id, title, impact, probability, owner
  sort: score DESC
  limit: 3
```

### 1.2 タスク消化状況

**当週タスク抽出:**
```yaml
source: wbs.yaml.tasks
filter: |
  (due >= period_start AND due <= period_end) OR
  status == "InProgress"
output:
  - id
  - title
  - owner
  - planned: {start: due - duration, end: due}  # durationは推定
  - actual: {start: updated_at when InProgress, end: updated_at when Done}
  - status
  - notes: definition_of_done[0] if any
```

**状態別集計:**
```yaml
summary:
  Done: count(status == "Done" AND updated_at in period)
  InProgress: count(status == "InProgress")
  Blocked: count(status == "Blocked")
  Todo: count(status == "Todo" AND due in period)
```

### 1.3 遅延の詳細

**遅延タスク抽出:**
```yaml
source: wbs.yaml.tasks
filter: due < today AND status != "Done"
output:
  - id
  - title
  - original_due: due
  - current_due: due（変更あれば新しい値）
  - delay_reason: |
      related_issues.first.title if related.issues exists
      else "要確認"
  - impact: |
      depends_on先のタスクへの影響を記載
  - recovery: "要検討"
  - support_needed: ""
sort: due ASC
```

### 1.4 次週の予定

**次週タスク抽出:**
```yaml
source: wbs.yaml.tasks
filter: due >= next_start AND due <= next_end
output:
  - id
  - title
  - owner
  - due
  - definition_of_done: definition_of_done[0..2]  # 最大3項目
  - dependencies: |
      depends_on.map(dep_id => tasks[dep_id].title).join(", ")
sort: due ASC
```

---

## Section 2: 課題状況

### 2.1 概況と件数

**件数集計:**
```yaml
source: issues.yaml.issues

new_issues:
  filter: created_at >= period_start AND created_at <= period_end
  group_by: priority
  output: {High: N, Medium: N, Low: N, total: N}

resolved_issues:
  filter: status == "Resolved" AND updated_at >= period_start AND updated_at <= period_end
  group_by: priority
  output: {High: N, Medium: N, Low: N, total: N}

ongoing_issues:
  filter: status IN ("Open", "InProgress") AND created_at < period_start
  group_by: priority
  output: {High: N, Medium: N, Low: N, total: N}
```

**Priority/状態マトリクス:**
```yaml
matrix:
  rows: [High, Medium, Low]
  columns: [Open, InProgress, Resolved, Deferred]
  cell: count(priority == row AND status == column)
  row_total: sum(row)
  column_total: sum(column)
  grand_total: count(all)
```

### 2.2 課題詳細

**新規発生:**
```yaml
source: issues.yaml.issues
filter: created_at >= period_start AND created_at <= period_end
output:
  - id
  - title
  - priority
  - impact: description から抽出または "要確認"
  - action: action または "検討中"
  - owner
  - due
  - status
sort: priority_order ASC, created_at DESC
# priority_order: High=1, Medium=2, Low=3
```

**継続:**
```yaml
source: issues.yaml.issues
filter: |
  status IN ("Open", "InProgress") AND
  created_at < period_start
output:
  - id
  - title
  - priority
  - current_status: description から現状を抽出
  - this_week_action: "対応内容を記載"（手動補足用）
  - next_action: action
  - owner
  - due
  - status
sort: priority_order ASC, due ASC
```

**解決:**
```yaml
source: issues.yaml.issues
filter: |
  status == "Resolved" AND
  updated_at >= period_start AND updated_at <= period_end
output:
  - id
  - title
  - priority
  - resolution
  - resolved_date: updated_at
  - notes: ""
sort: updated_at DESC
```

---

## Section 3: リスク状況

**注目リスク抽出:**
```yaml
source: risks.yaml.risks
filter: status == "Open" AND (score >= 6 OR impact == "高")
output:
  - id
  - title
  - impact
  - probability
  - score
  - status_change: |
      "新規" if last_reviewed >= period_start
      "継続" otherwise
  - early_signals_status: "兆候あり" / "兆候なし"
  - mitigation_plan: mitigation_plan[0]
  - owner
sort: score DESC
limit: 5
```

**スコア計算:**
```yaml
score_matrix:
  impact:
    高: 3
    中: 2
    低: 1
  probability:
    高: 3
    中: 2
    低: 1
  score: impact_value * probability_value
  # 最大9, 最小1
```

---

## 空データ時の表示

| セクション | 空の場合の表示 |
|-----------|---------------|
| ハイライト | 「今週完了したタスクはありません」 |
| リスク/懸念 | 「特記事項なし」 |
| タスク消化 | 「今週対象のタスクはありません」 |
| 遅延詳細 | 「遅延タスクはありません」 |
| 次週予定 | 「来週予定のタスクはありません」 |
| 課題詳細 | 「該当する課題はありません」 |
| 注目リスク | 「注目すべきリスクはありません」 |

---

## 前週比（--compare-previous オプション）

```yaml
comparison:
  tasks:
    done_diff: this_week.done - prev_week.done
    blocked_diff: this_week.blocked - prev_week.blocked
  issues:
    new_diff: this_week.new - prev_week.new
    resolved_diff: this_week.resolved - prev_week.resolved
    total_open_diff: this_week.total_open - prev_week.total_open
  risks:
    high_score_diff: count(score >= 6) の増減

format:
  positive: "+N"
  negative: "-N"
  zero: "±0"
```
