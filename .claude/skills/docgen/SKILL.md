---
name: docgen
description: |
  テンプレートとproject_stateから成果物ドラフトを生成・更新するSkill。
  templates/とproject_state/を使ってoutputs/にドキュメントを生成。
  キーワード: docgen, ドキュメント生成, 提案書, 計画書, 要件定義書,
  proposal, project_plan, requirements, draft生成, テンプレート適用
allowed-tools: Read, Write, Edit, Glob, Grep
---

# DocGen Skill - ドキュメント生成

## 概要
`templates/`のテンプレートと`project_state/`の最新状態から、
`outputs/*_draft.md`を生成または更新する。

## 実行トリガー
- 「提案書を生成」「docgen proposal」
- 「計画書を生成」「docgen project_plan」
- 「要件定義書を生成」「docgen requirements」
- 「全ドキュメントを更新」
- 「ドキュメント生成」

## 対応ドキュメント

| テンプレート | 出力先 | 主要データソース |
|------------|--------|----------------|
| templates/proposal.md | outputs/proposal_draft.md | charter, requirements, decisions, risks |
| templates/project_plan.md | outputs/project_plan_draft.md | charter, wbs.yaml, risks.yaml, decisions |
| templates/requirements.md | outputs/requirements_draft.md | requirements_master, decisions, open_questions |
| templates/weekly_report.md | outputs/weekly_report_draft.md | wbs.yaml, issues.yaml, risks.yaml |

詳細なマッピングは `references/template-mapping.md` を参照。

## 実行ステップ

### Step 1: データ収集
1. 対象テンプレートを読み込む
2. 必要な`project_state/`ファイルを全て読み込む
3. 既存ドラフトがあれば読み込む（差分更新用）

### Step 2: セクション別データマッピング
テンプレートの各セクションに対応するデータソースから情報を抽出し、
プレースホルダーを実データで置換する。

**マッピング例（proposal_draft.md）:**
- 表紙 ← project_charter.md（顧客名、プロジェクト名、日付）
- 課題認識 ← requirements_master.md（現状課題、非機能要件）
- ユースケース ← requirements_master.md（機能要件）
- リスク ← risks.yaml
- 体制 ← project_charter.md

### Step 3: 生成/更新処理

**新規生成の場合:**
- テンプレート構造に従い全セクションを生成
- データが不足するセクションは「[要入力]」「[TBD]」マーク

**差分更新の場合:**
- 変更があったセクションのみ更新
- 手動編集箇所（`<!-- MANUAL -->`マーク）は保持
- メタデータで変更検出（ソースファイルのハッシュ比較）

### Step 4: メタデータ付与
生成ファイルの先頭にメタデータを追加:

```markdown
<!--
generated_at: YYYY-MM-DD HH:MM
generator: docgen skill
source_state:
  - project_state/project_charter.md (updated: YYYY-MM-DD)
  - project_state/requirements_master.md (updated: YYYY-MM-DD)
  - project_state/risks.yaml (updated: YYYY-MM-DD)
template: templates/proposal.md
-->
```

### Step 5: 更新記録
- `logs/runlog.md`: 生成/更新ログを追記

## オプション

| オプション | 説明 |
|-----------|------|
| `--full` | 全セクション再生成（手動編集を上書き） |
| `--section <name>` | 特定セクションのみ更新 |
| `--dry-run` | 変更内容のプレビューのみ |
| `--all` | 全4種類のドキュメントを生成 |

## 手動編集の保護

手動で編集した箇所を保護するには、以下のマークを使用:

```markdown
<!-- MANUAL START -->
この部分は手動編集。docgenでは更新されない。
<!-- MANUAL END -->
```

または、セクション単位で保護:

```markdown
## 3. エグゼクティブサマリー <!-- MANUAL -->
手動で記述した内容...
```

## 不足データの扱い

| 状況 | 対応 |
|-----|------|
| 必須データが未設定 | `[要入力: 項目名]`を挿入 |
| 任意データが未設定 | セクションをスキップまたは空欄 |
| 参照先が存在しない | 警告を出力し、`[参照エラー]`を挿入 |

## 出力例

```
[DocGen完了]
- 対象: proposal_draft.md
- モード: 差分更新
- 更新セクション:
  - 4. 課題認識（データ更新検出）
  - 8. ユースケース（新規要件追加）
- スキップ:
  - 3. エグゼクティブサマリー（MANUALマーク）
- 警告:
  - 6.3 予算概要: データ未設定
- 生成元:
  - project_charter.md (2026-01-10)
  - requirements_master.md (2026-01-10)
  - risks.yaml (2026-01-10)
```

## 注意事項

1. **テンプレートは編集禁止**: テンプレート変更は別途レビュー後に実施
2. **差分更新優先**: 可能な限り既存内容を保持し、変更箇所のみ更新
3. **データ優先順位**: 最新のproject_stateを常に正とする
4. **手動編集の尊重**: MANUALマークの箇所は自動更新しない
