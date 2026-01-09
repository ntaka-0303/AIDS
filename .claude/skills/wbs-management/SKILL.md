---
name: wbs-management
description: |
  WBS/課題/リスクのYAMLファイルを生成・更新するSkill。
  wbs.yaml, issues.yaml, risks.yamlの追加・更新・整合性維持を行う。
  キーワード: WBS, タスク管理, 課題管理, リスク管理, タスク追加,
  課題登録, リスク追加, wbs.yaml, issues.yaml, risks.yaml
allowed-tools: Read, Write, Edit, Glob, Grep
---

# WBS Management Skill - WBS/課題/リスク管理

## 概要
`project_state/`のwbs.yaml, issues.yaml, risks.yamlの
生成・更新・整合性維持を行う。

## 実行トリガー
- 「WBSを更新」「タスクを追加」
- 「課題を登録」「課題を更新」
- 「リスクを追加」「リスクを更新」
- 「wbs management」

## 対象ファイルとスキーマ
**スキーマ定義は `project_state/schemas/*.schema.yaml` を参照。**

| データ | スキーマファイル |
|-------|----------------|
| WBS | `project_state/schemas/wbs.schema.yaml` |
| 課題 | `project_state/schemas/issues.schema.yaml` |
| リスク | `project_state/schemas/risks.schema.yaml` |

補足情報は `references/yaml-schemas.yaml` にも記載。

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

### 5. 整合性維持
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

### Step 3: 整合性チェック
- related参照の存在確認
- ID重複チェック
- 必須フィールド確認

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
[WBS Management完了]
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
