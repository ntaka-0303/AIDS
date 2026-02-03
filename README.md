# ProjectOps Agents (for ClaudeCode)

エンタープライズ向け AIエージェント基盤プロダクト導入プロジェクト（提案〜導入）において、  
**ドキュメント作成・進捗管理・品質管理**を ClaudeCode 上で半自動化するための SubAgent / Skill 集です。

本リポジトリは、各案件ごとに作成される `project/` ディレクトリ（案件ワークスペース）を入力として、
「ヒアリング → 状態更新 → 成果物更新 → 品質チェック → 週次報告」の運用を安定的に回すことを目的とします。

---

## 何ができるのか（Capabilities）

### 1. ヒアリングメモを “更新可能な状態” に継続変換する（Intake Skill）
本ツールの Intake は **初回ヒアリング専用ではなく**、  
**顧客ヒアリングを実施する都度** `inputs/hearings/*.md` を取り込み、プロジェクト状態を更新します。

**入力**
- `inputs/hearings/_index.yaml`（未処理のヒアリングメモの把握）
- `inputs/hearings/YYYY-MM-DD_topic.md`（都度追加されるヒアリングメモ）

**更新/出力（常に最新状態を更新）**
- `inputs/hearings/_index.yaml`（追加されたヒアリングメモを一覧へ追加）
- `project_state/project_charter.md`（埋められる範囲の基本情報を継続更新）
- `project_state/requirements_master.md`（要件の統合版を継続更新）
- `project_state/open_questions.yaml`（未決・確認事項の統合/解消を継続更新）
- `project_state/decisions.yaml`（決定事項ログを継続更新）
- `project_state/risks.yaml`（リスクの追加/更新）
- `project_state/issues.yaml`（課題の追加/更新）
- `inputs/hearing_digests/YYYY-MM-DD_topic.yaml`（各回の構造化サマリ）
- `project_state/change_log.yaml`（どのヒアリング起点で何が変わったかの記録）

> 目的：ヒアリングが複数回に分かれて発生しても、  
> **「inputs=時系列ログ」「project_state=単一の真実（最新）」** を維持し、後続工程の自動化を安定させます。

---

### 2. 提案〜導入の主要ドキュメントを Markdown でドラフト生成する
以下をテンプレートに沿って自動生成/更新します（PPTは不要、スライドはドラフト原稿まで）。
- `outputs/proposal_draft.md`（提案書ドラフト）
- `outputs/project_plan_draft.md`（プロジェクト計画書ドラフト）
- `outputs/requirements_draft.md`（要件定義書ドラフト）
- `outputs/weekly_report_draft.md`（週次進捗報告書ドラフト）

テンプレートは `templates/*.md` を参照し、案件固有情報は `project_state/*`（正規化された最新状態）から注入します。

---

### 3. WBS / 課題 / リスクを構造化データとして生成・更新する
- `project_state/wbs.yaml` を生成・更新
  - タスクID、フェーズ、成果物、担当、期限、依存関係、DoD（完了条件）を管理
- `project_state/issues.yaml` を生成・更新
  - 課題ID、Priority、影響、オーナー、期限、状態、関連要件/WBSへの紐づけ
- `project_state/risks.yaml` を生成・更新
  - Impact/Probability/Score、早期兆候、予防策、発生時対応、関連リンク（WBS/課題/ヒアリング）

---

### 4. 「抜け漏れ」と「整合性」を中心に品質チェックし、修正指示を出す
成果物と状態管理ファイルに対して、品質ゲートを実行します。

**抜け漏れ（Completeness）**
- 必須セクションの有無（例：要件定義の目的/範囲/機能一覧…）
- `open_questions.yaml` の項目が未反映のまま放置されていないか
- 要件→WBS（実行計画）への落とし込みが不足していないか

**整合性（Consistency）**
- `decisions.yaml`（スコープ外/方針）と各成果物の矛盾検出
- WBSの成果物リンクが `outputs/` の実ファイルと一致しているか
- 課題/リスクが適切に相互リンクされているか（顕在化したリスクがIssue化されている等）

結果は `outputs/reviews/*.md` として出力し、ドキュメント更新の差分指示を生成します。

**品質保証の3階層構造:**
- **第1層: データ正当性保証**
  - スキーマ定義（`project_state/schemas/*.schema.yaml`）
  - schema-validator agent（スキーマバリデーション実行）
- **第2層: 更新時品質保証（予防）**
  - Intake/ProjectMgmt/DocGen Skillが更新前にschema-validatorを呼び出し
  - 不正データの混入を予防
- **第3層: 事後確認・横断チェック**
  - Quality-Gate Skill: 成果物完全性・整合性チェック
  - State-Reviewer Agent: project_state横断整合性チェック

**🎯 自動バリデーションの設定（推奨）:**

ファイル保存時に自動的にスキーマバリデーションを実行するHookを設定できます。

```json
# ~/.config/claude/config.json または .claude/config.json
{
  "hooks": {
    "tool": {
      "Write": {
        "after": [
          {
            "name": "schema-validation",
            "command": "python3 validation/validate_schema.py \"${file_path}\"",
            "enabled": true
          }
        ]
      }
    }
  }
}
```

詳細な設定方法は [`validation/validation-hooks-setup.md`](validation/validation-hooks-setup.md) を参照してください。

---

### 5. 週次進捗報告書を WBS/課題/リスクから自動ドラフトする
`wbs.yaml / issues.yaml / risks.yaml` から以下を抽出して `weekly_report_draft.md` を生成します。
- 進捗概況（On Track / At Risk / Off Track）
- 当週の消化状況（Done/InProgress/Blocked）
- 遅延の詳細（原因・影響・リカバリー策）
- 次週の予定
- 課題概況（増減・注目課題トップ3）
- Priority/状態別件数
- 課題ごとの発生/対応（新規・継続・解決）
- 注目リスク（上位スコア/影響大）

---

### 6. 変更履歴と証跡を残し、更新の透明性を保つ
- 各実行（生成/更新/レビュー）を `logs/runlog.md` に記録
- 何が、どのヒアリングや決定を起点に変わったかを `project_state/change_log.yaml` に追記
- 後から「この記載の根拠はどの回のヒアリングか？」を追跡可能にします

---

## 想定する利用者（Who it's for）
- エンタープライズ導入案件の **コンサル兼PjM**
- 提案〜導入までの成果物が多く、ヒアリングが複数回にわたり、整合性担保が難しい案件
- 外部ツール連携は前提とせず、まずは **ファイルベースで堅牢に回したい**チーム

---

## 対象外（Out of scope）
- 顧客折衝の最終判断（意思決定そのもの）
- 顧客ヒアリングの実施（会議の実施は人）
- スライドの完成（PPT生成・デザインは対象外。スライド原稿/構成ドラフトまで）
- チケットツール/チャットツール等の外部サービス連携（現時点では対象外）

---

## 期待する運用フロー（例）と自動化範囲

### 1) ヒアリング実施 → メモ作成
- **人が実施**：顧客ヒアリング（会議/打合せ）
- **人が実施**：ヒアリングメモ作成・保存  
  - `inputs/hearings/YYYY-MM-DD_topic.md` を追加（または追記ではなく新規作成）

### 2) Intake Skill 実行（状態更新）
- ✅ **本ツールが自動化**：新規ヒアリングメモを読み取り、`project_state` を更新
  - `project_charter / requirements_master / open_questions / decisions / risks.yaml / issues.yaml` を更新
  - `inputs/hearing_digests/*.yaml` の生成
  - `change_log.md` の追記

### 3) WBS/課題/リスク更新
- ✅ **本ツールが自動化**：ヒアリング差分や要件差分を反映して `wbs.yaml / issues.yaml / risks.yaml` を生成・更新
- ⚠️ **人が関与（推奨）**：重要タスクの担当割当・期限の最終確定（自動提案は可能だが最終責任は人）

### 4) ドキュメント生成（提案/計画/要件/週次）
- ✅ **本ツールが自動化**：`templates` + `project_state` から `outputs/*_draft.md` を生成・更新
- ⚠️ **人が実施（推奨）**：顧客提出前の最終レビュー・表現調整（最終責任は人）

### 5) 品質ゲート（抜け漏れ/整合性チェック）
- ✅ **本ツールが自動化**：チェック実行と指摘の生成（`outputs/reviews/*.md`）
- ⚠️ **人が実施（推奨）**：指摘の採否判断（プロジェクト方針に関わるもの）

### 6) 週次報告の共有
- ✅ **本ツールが自動化**：`weekly_report_draft.md` の生成
- **人が実施**：共有（メール/会議/ポータル掲載等）

---

## ディレクトリ（案件ワークスペース）概略

```
.
├── inputs/                     # 入力データ
│   ├── hearings/              # ヒアリングメモ（イベントログ、都度追加）
│   ├── hearing_digests/       # 各回の構造化サマリ（追跡と差分反映用）
│   └── references/            # 補足資料
├── project_state/              # 最新状態（単一の真実）
│   ├── schemas/               # YAMLスキーマ定義（プロジェクトごとにカスタマイズ可能）
│   ├── project_charter.md     # プロジェクト基本情報
│   ├── requirements_master.md # 要件の統合版
│   ├── open_questions.yaml    # 未決事項・確認事項
│   ├── decisions.yaml         # 決定事項ログ
│   ├── wbs.yaml              # WBS（タスク管理）
│   ├── issues.yaml           # 課題管理
│   ├── risks.yaml            # リスク管理
│   └── change_log.yaml       # 変更履歴
├── templates/                  # ドキュメントテンプレート
├── outputs/                    # 生成されたドラフト
│   └── reviews/               # 品質チェック結果
├── logs/                       # 実行ログ
├── validation/                 # バリデーションツール
│   ├── validate_schema.py     # スキーマバリデーションスクリプト
│   └── validation-hooks-setup.md # Hook設定ガイド
└── .claude/                    # Claude Code設定・スキル・エージェント定義
```

---

## セットアップ（推奨）

### 1. 自動バリデーションの有効化

ファイル保存時に自動的にスキーマバリデーションを実行するHookを設定します。

**ステップ1: Claude Code設定ファイルを編集**

`~/.config/claude/config.json` を作成・編集:

```json
{
  "hooks": {
    "tool": {
      "Write": {
        "after": [
          {
            "name": "schema-validation",
            "command": "python3 validation/validate_schema.py \"${file_path}\"",
            "description": "Validate YAML schema after file write",
            "cwd": "${workspace_root}",
            "enabled": true,
            "blocking": false
          }
        ]
      },
      "Edit": {
        "after": [
          {
            "name": "schema-validation",
            "command": "python3 validation/validate_schema.py \"${file_path}\"",
            "description": "Validate YAML schema after file edit",
            "cwd": "${workspace_root}",
            "enabled": true,
            "blocking": false
          }
        ]
      }
    }
  }
}
```

**ステップ2: 動作確認**

Claude Codeでproject_state/配下のYAMLファイルを編集し、自動バリデーションが実行されることを確認します。

詳細な設定方法とトラブルシューティングは [`validation/validation-hooks-setup.md`](validation/validation-hooks-setup.md) を参照してください。

### 2. 品質保証の仕組み

本ツールは3階層の品質保証を提供します：

1. **第1層: データ正当性保証**
   - スキーマ定義: `project_state/schemas/*.schema.yaml`
   - 実行エージェント: `schema-validator agent`

2. **第2層: 更新時品質保証（予防）**
   - Intake/ProjectMgmt/DocGen Skillが更新前にバリデーション実行
   - Hook自動実行でファイル保存時にも即座にチェック

3. **第3層: 事後確認・横断チェック**
   - Quality-Gate Skill: 成果物完全性・整合性チェック
   - State-Reviewer Agent: project_state横断整合性チェック

詳細は [`.claude/quality-assurance-matrix.md`](.claude/quality-assurance-matrix.md) を参照してください。

---
