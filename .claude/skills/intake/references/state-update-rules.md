# Intake Skill - project_state更新ルール

## スキーマ参照

各YAMLファイルのスキーマ定義は `project_state/schemas/` を参照:
- `wbs.schema.yaml` - WBSタスク管理
- `risks.schema.yaml` - リスク管理
- `issues.schema.yaml` - 課題管理
- `decisions.schema.yaml` - 決定事項
- `open_questions.schema.yaml` - 未決事項・確認事項
- `change_log.schema.yaml` - 変更履歴

## 基本原則

1. **マージ方式**: 既存情報を上書きせず、補完・追記する
2. **参照の保持**: 抽出元ヒアリングファイルへの参照を必ず残す
3. **YAML配列追加**: YAMLファイルは既存配列に新規エントリを追加
4. **重複チェック**: 既存IDとの重複を避け、連番で採番
5. **スキーマ準拠**: 各ファイルはスキーマ定義に従う

---

## ファイル別更新ルール

### project_charter.md（Markdown形式）

**更新方針**: 空欄を埋める形で補完、既存情報は上書きしない

**セクション別ルール**:
| セクション | ルール |
|-----------|--------|
| プロジェクト名 | 未設定なら設定、設定済みなら変更しない |
| 目的 | 未設定なら設定、設定済みなら追記して補完 |
| スコープ | 項目を追加（重複除外） |
| スコープ外 | 項目を追加（重複除外） |
| 体制 | 未記載のメンバーを追加 |
| スケジュール | マイルストーンを追加（重複除外） |
| 前提条件 | 項目を追加（重複除外） |
| 制約条件 | 項目を追加（重複除外） |

---

### requirements_master.md（Markdown形式）

**更新方針**: 新規要件を追記、既存要件は補足情報のみ追加

**構造**:
```markdown
# 要件一覧

## 機能要件

### REQ-001: [要件タイトル]
- **種別**: 機能要件
- **概要**: [概要]
- **詳細**: [詳細説明]
- **優先度**: High / Medium / Low
- **起点**: inputs/hearings/YYYY-MM-DD_topic.md
- **関連**: [関連要件ID]

## 非機能要件

### REQ-010: [要件タイトル]
...
```

**更新ルール**:
1. 新規要件は末尾に追加
2. 既存要件への追加情報は「補足」として追記
3. IDは現在の最大値+1で採番
4. 機能要件と非機能要件は分離して管理

---

### open_questions.yaml（YAML形式）

**スキーマ定義**: `project_state/schemas/open_questions.schema.yaml`

**更新方針**: 新規追加は配列に追加、解決済みはstatus更新

**更新ルール**:
1. 新規質問は`questions`配列の末尾に追加
2. 解決時は以下を更新:
   - `status`: "resolved"
   - `resolution`: 解決内容
   - `resolved_at`: 解決日
   - `resolved_by`: 解決の起点（hearing/decision ref）
3. 先送り時は`status`: "deferred"に更新
4. `related.decisions`に対応する決定事項IDを追加

---

### decisions.yaml（YAML形式）

**スキーマ定義**: `project_state/schemas/decisions.schema.yaml`

**更新方針**: 新規決定を配列に追加（削除・変更は新規エントリで上書き）

**更新ルール**:
1. 新規決定は`decisions`配列の末尾に追加
2. 過去の決定は変更しない
3. 決定の取り消しは新規決定として記録し、旧決定の`status`を"superseded"に更新
4. `superseded_by`に新しいDEC-IDを設定
5. `impact`に影響を受けるrequirements/wbsへの参照を記載

---

### change_log.yaml（YAML形式）

**スキーマ定義**: `project_state/schemas/change_log.schema.yaml`

**更新方針**: 変更エントリを配列に追加

**更新ルール**:
1. 新規エントリは`entries`配列の末尾に追加
2. `id`は`CHG-XXX`形式で連番採番
3. `source`には変更の起点となったファイル/IDを記録
4. `changes`には変更されたファイルとアクションを記録
5. `summary`には変更の概要を1行で記載

---

### risks.yaml（YAML形式）

**スキーマ定義**: `project_state/schemas/risks.schema.yaml`

**更新方針**: 新規リスクは配列に追加、既存は状態・レビュー日を更新

**更新ルール**:
1. 新規リスクは`risks`配列の末尾に追加
2. 既存リスクは`last_reviewed`を更新
3. 状態変化があれば`status`を更新
4. `related.hearings`に起点ファイルを追加
5. `score`は自動計算（高=3, 中=2, 低=1の積）

---

### issues.yaml（YAML形式）

**スキーマ定義**: `project_state/schemas/issues.schema.yaml`

**更新方針**: 新規課題は配列に追加、既存は状態・更新日を更新

**更新ルール**:
1. 新規課題は`issues`配列の末尾に追加
2. 既存課題は`updated_at`を更新
3. 状態変化があれば`status`を更新
4. 解決時は`resolution`に解決内容を記録
5. `related.hearings`に起点ファイルを追加

---

## ID採番ルール

| 種別 | フォーマット | 開始番号 | 例 |
|-----|------------|---------|-----|
| 要件 | `REQ-XXX` | 001 | REQ-001, REQ-012 |
| 決定 | `DEC-XXX` | 001 | DEC-001, DEC-005 |
| 質問 | `QST-XXX` | 001 | QST-001, QST-003 |
| リスク | `RSK-XXX` | 001 | RSK-001, RSK-008 |
| 課題 | `ISS-XXX` | 001 | ISS-001, ISS-015 |
| 変更 | `CHG-XXX` | 001 | CHG-001, CHG-010 |

**採番手順**:
1. 対象ファイルから現在の最大IDを取得
2. 最大ID + 1 で新規IDを採番
3. 連番が欠番にならないよう注意（ただし、削除による欠番は許容）

---

## 整合性維持ルール

### クロスリファレンス
- 新規要件追加時：関連する既存要件への参照を検討
- 決定追加時：影響を受ける要件への参照を`impact`に追加
- 質問解決時：対応する決定事項を`resolved_by`に記録
- 課題追加時：関連するリスク・要件・WBSへの参照を追加
- リスク顕在化時：対応する課題を作成しリンク

### 矛盾検出時
1. 矛盾する情報を両方記録
2. open_questions.yamlに確認事項として追加
3. change_log.yamlに矛盾検出を記録

### 情報の統合
- 同一事項について複数回言及された場合は統合
- 最新の情報を優先しつつ、履歴は保持
- 統合した旨をchange_log.yamlに記録

---

## YAML更新の実装パターン

### 配列への追加
```yaml
# 既存
questions:
  - id: "QST-001"
    ...

# 追加後
questions:
  - id: "QST-001"
    ...
  - id: "QST-002"  # 新規追加
    ...
```

### 既存エントリの更新
```yaml
# 更新前
questions:
  - id: "QST-001"
    status: "open"
    resolution: null

# 更新後
questions:
  - id: "QST-001"
    status: "resolved"
    resolution: "OAuth2.0採用で解決"
    resolved_at: "2026-01-15"
    resolved_by:
      type: "decision"
      ref: "DEC-003"
```

### 上書き決定の記録
```yaml
# 旧決定
decisions:
  - id: "DEC-001"
    status: "superseded"
    superseded_by: "DEC-005"

# 新決定
  - id: "DEC-005"
    content: "DEC-001を変更し、..."
```
