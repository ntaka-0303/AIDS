# WeeklyReport Skill - 抽出・集計ルール

## 設計方針

各種一覧（WBS、課題、リスク等）はExcelで別途クライアントに提示。
本報告書は**概況と重要事項**に特化：
- 遅延タスク（Section 1.3）
- 今週中に意思決定が必要な未決事項（Section 3.2）
- 高スコアリスクの監視状況（Section 4.2）

## 期間の定義

```
報告期間: period_start 〜 period_end
前週期間: prev_start 〜 prev_end（7日前シフト）
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
empty_message: "今週完了したタスクはありません"
```

**意思決定・確認依頼抽出:**
```yaml
# High優先度未解決課題
issues_high:
  source: issues.yaml.issues
  filter: priority == "High" AND status IN ("Open", "InProgress")
  output: id, title, owner, due
  limit: 3

# 回答期限が今週内の未決事項
questions_urgent:
  source: open_questions.yaml.questions
  filter: status == "open" AND due <= period_end
  output: id, title, owner, due
  limit: 3

empty_message: "特記事項なし"
```

### 1.2 タスク消化サマリ

**集計:**
```yaml
source: wbs.yaml.tasks

summary:
  当週完了: count(status == "Done" AND updated_at >= period_start AND updated_at <= period_end)
  当週着手: count(status == "InProgress")
  ブロック中: count(status == "Blocked")
```

### 1.3 遅延タスク

**遅延タスク抽出:**
```yaml
source: wbs.yaml.tasks
filter: due < today AND status != "Done"
output:
  - id
  - title
  - owner
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
empty_message: "遅延タスクはありません"
```

---

## Section 2: 課題状況

### 2.1 概況

**全体概況判定:**
```yaml
source: issues.yaml.issues

judgment:
  - "クリティカル課題あり": any(priority == "High" AND status == "Open")
  - "増加傾向": new_count > resolved_count
  - "収束傾向": resolved_count > new_count
  - "安定": otherwise
```

**件数集計:**
```yaml
source: issues.yaml.issues

new_issues:
  filter: created_at >= period_start AND created_at <= period_end
  group_by: priority
  output: {High: N, Medium: N, Low: N, total: N}

resolved_issues:
  filter: status == "Resolved" AND updated_at >= period_start AND updated_at <= period_end
  output: {total: N}

ongoing_issues:
  filter: status IN ("Open", "InProgress")
  group_by: priority
  output: {High: N, Medium: N, Low: N, total: N}
```

**意思決定・支援依頼:**
```yaml
source: issues.yaml.issues
filter: priority == "High" AND status IN ("Open", "InProgress") AND owner == "顧客"
output: id, title, action
limit: 3
empty_message: "特記事項なし"
```

---

## Section 3: 未決事項

### 3.1 概況

**全体概況判定:**
```yaml
source: open_questions.yaml.questions

judgment:
  - "意思決定遅延あり": any(status == "open" AND due < today)
  - "回答待ち多数": count(status == "open") > 5
  - "収束傾向": resolved_count > new_count
  - "安定": otherwise
```

**件数集計:**
```yaml
source: open_questions.yaml.questions

new_questions:
  filter: created_at >= period_start AND created_at <= period_end
  output: {total: N}

resolved_questions:
  filter: status == "resolved" AND resolved_at >= period_start AND resolved_at <= period_end
  output: {total: N}

ongoing_questions:
  filter: status == "open"
  group_by: priority
  output: {High: N, Medium: N, Low: N, total: N}
```

### 3.2 今週中に意思決定が必要な未決事項

**抽出ルール:**
```yaml
source: open_questions.yaml.questions
filter: status == "open" AND due <= period_end
output:
  - id
  - title
  - category
  - priority
  - due (MM-DD形式)
  - owner
  - related_wbs: related.wbs[0] if exists else "-"
  - impact_if_not_resolved: |
      関連WBSタスクがBlockedになる可能性を記載
      または "要確認"
sort: due ASC, priority_order ASC
# priority_order: High=1, Medium=2, Low=3
empty_message: "今週中に意思決定が必要な未決事項はありません"
```

---

## Section 4: リスク状況

### 4.1 概況

**全体概況判定:**
```yaml
source: risks.yaml.risks

judgment:
  - "顕在化リスクあり": any(status == "Realized")
  - "高リスク増加": count(score >= 7) increased from prev_week
  - "収束傾向": count(status IN ("Mitigated", "Closed")) > count(status == "Open")
  - "安定": otherwise
```

**件数集計:**
```yaml
source: risks.yaml.risks

new_risks:
  filter: 期間内に登録（created_atまたはlast_reviewed == 期間内かつ新規）
  output: {total: N}

status_changes:
  filter: status変更があったもの
  output:
    Monitoring化: N
    Mitigated: N
    顕在化: N

closed_risks:
  filter: status == "Closed" AND 期間内にクローズ
  output: {total: N}

high_score_risks:
  filter: status IN ("Open", "Monitoring") AND score >= 7
  output: {total: N}
```

### 4.2 高スコアリスクの監視状況

**抽出ルール:**
```yaml
source: risks.yaml.risks
filter: status IN ("Open", "Monitoring") AND score >= 7
output:
  - id
  - title
  - impact
  - probability
  - score
  - owner
  - early_signals_status: |
      "あり" if early_signals has any detected
      "なし" otherwise
  - this_week_action: |
      mitigation_plan実施状況（手動補足用）
      または "継続監視"
  - next_action: |
      mitigation_plan[0] または contingency_plan[0]
      または "継続監視"
sort: score DESC
empty_message: "高スコアリスク（7-9）はありません"
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
  # 高スコア: 7-9（高×高=9, 高×中=6, 中×高=6 → 7以上が対象）
  # 注: 実際には score >= 7 は 高×高(9), 高×中(6は対象外), 中×高(6は対象外)
  # 閾値を6に下げる場合は filter を score >= 6 に変更
```

---

## Section 5: スコープ/要件変更

### 5.1 概況

**変更有無判定:**
```yaml
source: change_log.yaml.entries
filter: date >= period_start AND date <= period_end

has_changes: count > 0

change_count:
  added: count(changes[].action == "added" AND target contains "requirements")
  modified: count(changes[].action == "modified" AND target contains "requirements")
  removed: count(changes[].action == "removed" AND target contains "requirements")
```

**スコープ影響判定:**
```yaml
judgment:
  - "要再見積": any major scope change detected
  - "大": added >= 3 OR removed >= 1
  - "中程度": added >= 1 OR modified >= 2
  - "軽微": modified == 1
  - "なし": no changes
```

**備考抽出:**
```yaml
source: change_log.yaml.entries
filter: date >= period_start AND date <= period_end
output:
  - summary（各エントリのサマリを箇条書き）
empty_message: "今週のスコープ/要件変更はありません"
```

---

## 空データ時の表示

| セクション | 空の場合の表示 |
|-----------|---------------|
| 1.1 ハイライト | 「今週完了したタスクはありません」 |
| 1.1 意思決定・確認依頼 | 「特記事項なし」 |
| 1.3 遅延タスク | 「遅延タスクはありません」 |
| 2.1 意思決定・支援依頼 | 「特記事項なし」 |
| 3.2 意思決定必要な未決事項 | 「今週中に意思決定が必要な未決事項はありません」 |
| 4.2 高スコアリスク | 「高スコアリスク（7-9）はありません」 |
| 5.1 備考 | 「今週のスコープ/要件変更はありません」 |

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
  questions:
    open_diff: this_week.open - prev_week.open
  risks:
    high_score_diff: count(score >= 7) の増減

format:
  positive: "+N"
  negative: "-N"
  zero: "±0"
```
