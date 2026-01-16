# 品質保証マトリクス

## 品質保証の全体構造

```
【第1層: データ正当性保証】
  └─ project_state/schemas/*.schema.yaml（定義）
  └─ schema-validator agent（実行）

【第2層: 更新時品質保証（予防）】
  └─ Intake Skill
  └─ ProjectMgmt Skill
  └─ DocGen Skill

【第3層: 事後確認・横断チェック】
  └─ Quality-Gate Skill
  └─ State-Reviewer Agent
```

## チェック種別と担当マトリクス

| チェック種別 | チェック内容 | 定義場所 | 予防実行 | 事後実行 |
|------------|------------|---------|---------|---------|
| **A. データフォーマット** |
| A-1 | 必須フィールド（required） | スキーマ | schema-validator → Intake/ProjectMgmt | State-Reviewer |
| A-2 | ID採番ルール（pattern） | スキーマ | schema-validator → Intake/ProjectMgmt | State-Reviewer |
| A-3 | 列挙値（enum） | スキーマ | schema-validator → Intake/ProjectMgmt | State-Reviewer |
| A-4 | 日付フォーマット | スキーマ | schema-validator → Intake/ProjectMgmt | State-Reviewer |
| A-5 | 文字列長（max_length） | スキーマ | schema-validator → Intake/ProjectMgmt | State-Reviewer |
| **B. 参照整合性** |
| B-1 | 参照先ID存在確認 | スキーマ validation.reference_integrity | schema-validator → Intake/ProjectMgmt | State-Reviewer |
| B-2 | 循環参照検出 | スキーマ validation.circular_reference | schema-validator → ProjectMgmt | State-Reviewer |
| B-3 | deliverableファイル存在 | スキーマ validation.reference_integrity | schema-validator → ProjectMgmt | State-Reviewer |
| B-4 | hearingsファイル存在 | スキーマ validation.reference_integrity | schema-validator → Intake | State-Reviewer |
| **C. 日付整合性** |
| C-1 | due >= created_at | スキーマ validation.date_consistency | schema-validator → Intake/ProjectMgmt | State-Reviewer |
| C-2 | 依存タスクのdue整合性 | スキーマ validation.date_consistency | schema-validator → ProjectMgmt | State-Reviewer |
| C-3 | 未来日付のResolved/Done | スキーマ validation.date_consistency | schema-validator → ProjectMgmt | State-Reviewer |
| **D. ビジネスルール** |
| D-1 | Blocked時のblocker必須 | スキーマ validation.business_rules | schema-validator → ProjectMgmt | State-Reviewer |
| D-2 | Resolved時のresolution必須 | スキーマ validation.business_rules | schema-validator → ProjectMgmt | State-Reviewer |
| D-3 | Realized時のissues登録 | スキーマ validation.business_rules | schema-validator → ProjectMgmt | State-Reviewer |
| D-4 | スコア自動計算 | スキーマ score_calculation | schema-validator → ProjectMgmt | State-Reviewer |
| D-5 | Done時のdeliverable存在 | スキーマ validation.business_rules | schema-validator → ProjectMgmt | State-Reviewer |
| **E. 状態遷移** |
| E-1 | 許可された状態遷移のみ | スキーマ state_transitions | schema-validator → ProjectMgmt | State-Reviewer |
| E-2 | final状態からの遷移禁止 | スキーマ state_transitions | schema-validator → ProjectMgmt | State-Reviewer |
| E-3 | 状態遷移時の必須フィールド | スキーマ state_transitions.required_fields | schema-validator → ProjectMgmt | State-Reviewer |
| **F. 抽出精度（Intake固有）** |
| F-1 | 要件/決定/質問/リスク/課題の分類判断 | Intake references | Intake（LLM判断） | - |
| F-2 | 業務課題とIssuesの誤分類防止 | Intake references | Intake（ガイド参照） | Quality-Gate |
| F-3 | ヒアリング内容の正確な構造化 | Intake references | Intake（LLM判断） | - |
| **G. 成果物完全性（DocGen固有）** |
| G-1 | テンプレート必須セクション存在 | completeness-rules | DocGen（生成時確認） | Quality-Gate |
| G-2 | 空セクション検出 | completeness-rules | DocGen（生成時確認） | Quality-Gate |
| G-3 | [TODO][要入力][TBD]マーク検出 | completeness-rules | DocGen（生成時確認） | Quality-Gate |
| G-4 | 必須フィールドの記入 | completeness-rules | DocGen（生成時確認） | Quality-Gate |
| **H. 成果物整合性（横断）** |
| H-1 | decisions矛盾チェック | consistency-rules CON-DEC-* | - | Quality-Gate |
| H-2 | open_questions反映チェック | consistency-rules + completeness-rules | - | Quality-Gate |
| H-3 | 要件→WBS落とし込み確認 | completeness-rules | - | Quality-Gate |
| H-4 | 上位成果物との整合性 | consistency-rules CON-DOC-* | DocGen（簡易確認） | Quality-Gate |
| H-5 | ドキュメント間の基本情報一致 | consistency-rules CON-DOC-003 | - | Quality-Gate |
| **I. 横断整合性（State-Reviewer固有）** |
| I-1 | リスク↔課題の状態整合性 | - | - | State-Reviewer |
| I-2 | project_state間の整合性 | - | - | State-Reviewer |
| I-3 | 長期未更新の検出 | - | - | State-Reviewer |
| I-4 | ID欠番情報提供 | - | - | State-Reviewer |

## スキル別チェック責務

### Intake Skill

**実行タイミング:** ヒアリングメモ取り込み時

**チェック内容:**
1. **F. 抽出精度チェック（Intake独自）**
   - F-1: 要件/決定/質問/リスク/課題の分類判断
   - F-2: 業務課題とIssuesの誤分類防止
   - F-3: ヒアリング内容の正確な構造化

2. **A～E. スキーマバリデーション（schema-validator経由）**
   - 新規追加するREQ, DEC, QST, RSK, ISSのバリデーション
   - データフォーマット、参照整合性、日付整合性、ビジネスルール、状態遷移

**実行ステップ（強化版）:**
```
Step 1: 未処理ヒアリングの特定
Step 2: 構造化抽出（F-1, F-2, F-3を実施）
Step 2.5: スキーマバリデーション（NEW）
  ├─ schema-validator agentを呼び出し
  ├─ 新規追加データをA～Eの観点で検証
  ├─ Critical → 更新中止、修正提案
  └─ Warning → 確認して続行可能
Step 3: project_state更新（バリデーションOKの場合のみ）
Step 4: hearing_digest生成
Step 5: 更新記録
```

### Project Management Skill

**実行タイミング:** WBS/課題/リスク/未決事項の追加・更新時

**チェック内容:**
1. **A～E. スキーマバリデーション（schema-validator経由）**
   - wbs.yaml更新時: wbs.schema.yaml検証
   - issues.yaml更新時: issues.schema.yaml検証
   - risks.yaml更新時: risks.schema.yaml検証
   - open_questions.yaml更新時: open_questions.schema.yaml検証

**実行ステップ（強化版）:**
```
Step 1: 現状把握
Step 2: 操作実行準備
Step 2.5: スキーマバリデーション（NEW）
  ├─ schema-validator agentを呼び出し
  ├─ 追加/更新データをA～Eの観点で検証
  ├─ Critical → 更新中止、修正必須
  ├─ Warning → 確認推奨、判断はユーザー
  └─ Info → 情報提供のみ
Step 3: 整合性チェック（従来通り、軽量版）
Step 4: 更新適用（バリデーションOKの場合のみ）
```

### DocGen Skill

**実行タイミング:** 成果物生成・更新時

**チェック内容:**
1. **G. 成果物完全性チェック（DocGen独自）**
   - G-1: テンプレート必須セクション存在確認
   - G-2: 空セクション検出
   - G-3: [TODO][要入力][TBD]マーク検出
   - G-4: 必須フィールドの記入確認

2. **H-4. 上位成果物との整合性（簡易確認）**
   - 基本情報（顧客名、プロジェクト名等）の一致
   - スコープの大きな矛盾がないか

**実行ステップ（強化版）:**
```
Step 1: データ収集
  ├─ テンプレート読み込み
  ├─ project_state読み込み
  └─ 上位成果物読み込み（存在する場合）
Step 2: セクション別データマッピング
Step 2.5: 上位成果物との整合性確認（NEW）
  ├─ 基本情報の一致確認
  ├─ スコープの矛盾チェック
  └─ 不整合があれば警告表示
Step 3: 生成/更新処理
Step 3.5: 成果物完全性チェック（NEW）
  ├─ G-1～G-4を実施
  ├─ 不足箇所に[要入力]マーク挿入
  └─ 警告を出力（生成は継続）
Step 4: メタデータ付与
Step 5: 更新記録
```

### Quality-Gate Skill

**実行タイミング:** ユーザー指示時、ドキュメント提出前

**チェック内容:**
1. **G. 成果物完全性チェック（全体）**
   - completeness-rules.yaml全体を実行
   - テンプレート必須セクション、空セクション、TODOマーク等

2. **H. 成果物整合性チェック（横断）**
   - H-1: decisions矛盾チェック（CON-DEC-*）
   - H-2: open_questions反映チェック
   - H-3: 要件→WBS落とし込み確認
   - H-4: 上位成果物との整合性（詳細）
   - H-5: ドキュメント間の基本情報一致

**注意:**
- **A～Eのスキーマバリデーションは実行しない**（スキルで実行済み）
- consistency-rulesから重複ルール削除（後述）

### State-Reviewer Agent

**実行タイミング:** 定期実行（週次）、ユーザー指示時

**チェック内容:**
1. **スキーマバリデーション結果の事後確認**
   - Intake/ProjectMgmtスキル実行時にschema-validator agentが検出したエラーの修正状況確認
   - 長期間未修正のエラーがないか（30日以上等）
   - **詳細なスキーマバリデーション（A～E）は実施しない**（schema-validatorが実施済み）

2. **I. 横断整合性チェック（State-Reviewer固有）**
   - **I-1: リスク↔課題の状態整合性**
     - Realized状態のリスクに対応するIssue存在・リンク確認
     - Resolved課題のリンクリスクの状態確認（Mitigated/Closed）
     - リスク顕在化後の長期未解決検出

   - **I-2: project_state間の整合性**
     - requirements_master ↔ wbs.yaml（High優先度要件のWBS反映確認）
     - decisions ↔ open_questions（決定後の未解決質問検出）
     - wbs ↔ issues（Blocked状態とIssueのリンク確認）
     - project_charter.md ↔ requirements_master.mdの整合性

   - **I-3: 長期未更新の検出**
     - InProgress状態が30日以上継続（停滞検出）
     - Open状態の課題/リスクが60日以上未更新（放置検出）
     - last_reviewedが90日以上前（定期レビュー未実施検出）

   - **I-4: ID欠番情報提供**
     - REQ, DEC, QST, RSK, ISS, P*-**の連番欠番検出
     - ID重複チェック（Critical）
     - 情報提供のみ（削除による欠番は正常）

**注意:**
- **読み取り専用**（ファイル変更なし）
- **修正提案のみ**（修正実行はProject Management Skillへ案内）
- **横断整合性に特化**（個別ファイルの詳細チェックはschema-validatorが担当）
- **定期実行推奨**（週1回程度）

## 削除すべき重複ルール

### Quality-Gate consistency-rules.yamlから削除

以下のルールはスキーマバリデーション（A～E）と重複するため削除:

**削除対象:**
- **CON-LINK-001**: wbs.yaml.deliverableの参照先ファイル存在確認
  - → スキーマ validation.reference_integrity で実施
- **CON-LINK-002**: issues.yaml.relatedの参照先存在確認
  - → スキーマ validation.reference_integrity で実施
- **CON-LINK-003**: risks.yaml.relatedの参照先存在確認
  - → スキーマ validation.reference_integrity で実施
- **CON-WBS-001**: depends_onの参照先タスク存在確認
  - → スキーマ validation.reference_integrity で実施
- **CON-WBS-003**: 循環依存チェック
  - → スキーマ validation.circular_reference で実施
- **CON-TIME-001**: due < created_atチェック
  - → スキーマ validation.date_consistency で実施
- **CON-RI-001**: 顕在化したリスクのIssue化チェック
  - → スキーマ validation.business_rules で実施

**残すルール（Quality-Gate固有）:**
- **CON-DEC-001, 002, 003**: decisions矛盾チェック（成果物との整合性）
- **CON-RI-002, 003**: リスク↔課題の状態整合性（ビジネスロジック）
- **CON-WBS-002, 004**: WBS固有のビジネスロジック
- **CON-DOC-001, 002, 003**: ドキュメント間整合性
- **CON-TIME-002, 003**: 時系列整合性（未来日付、change_log順序）

## バリデーション実行フロー

### 更新時の予防的バリデーション（第2層）

```
[Intake/ProjectMgmt Skill実行]
  ↓
[データ準備]
  ↓
[schema-validator agent呼び出し] ← 第1層チェック（A～E）
  ├─ スキーマファイル読み込み
  ├─ データフォーマット検証
  ├─ 参照整合性検証
  ├─ 日付整合性検証
  ├─ ビジネスルール検証
  └─ 状態遷移検証
  ↓
[判定]
  ├─ Critical → 更新中止、修正提案
  ├─ Warning → 確認して続行可
  └─ OK → 更新実行
  ↓
[更新実行]
```

### 事後確認（第3層）

```
[定期実行 or ユーザー指示]
  ↓
[State-Reviewer実行]
  ├─ project_state全体の整合性確認
  ├─ 長期未更新検出
  └─ 横断チェック（I-1～I-4）
  ↓
[Quality-Gate実行]
  ├─ 成果物完全性チェック（G-1～G-4）
  └─ 成果物整合性チェック（H-1～H-5）
  ↓
[レビュー結果出力]
```

## 品質保証の原則

### 1. 単一責任の原則
- 各チェックは1箇所でのみ定義・実行
- スキーマがマスター、他は参照

### 2. 予防優先の原則
- 不正データは更新前に検出
- 事後チェックは確認と横断チェックに特化

### 3. 階層化の原則
- 第1層（定義）→ 第2層（予防）→ 第3層（事後）
- 下位層で検出されたものは上位層で再チェックしない

### 4. 明確な責務分担
- スキーマ: データ正当性（A～E）
- スキル: 更新時バリデーション + スキル固有チェック（F, G）
- 横断チェック: 成果物品質 + 全体整合性（H, I）

## 更新履歴

- 2026-01-15: 初版作成、役割分担とマトリクス定義
