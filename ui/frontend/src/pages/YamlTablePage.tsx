import { YamlTable } from '../components/yaml-editor/YamlTable';

// ファイル名とルートキーのマッピング
const fileConfig: Record<string, { title: string; fileName: string }> = {
  wbs: { title: 'WBS', fileName: 'wbs.yaml' },
  issues: { title: '課題', fileName: 'issues.yaml' },
  risks: { title: 'リスク', fileName: 'risks.yaml' },
  questions: { title: '未決事項', fileName: 'open_questions.yaml' },
  decisions: { title: '決定事項', fileName: 'decisions.yaml' },
};

interface YamlTablePageProps {
  type: string;
}

export function YamlTablePage({ type }: YamlTablePageProps) {
  const config = fileConfig[type];

  if (!config) {
    return <div className="p-4 text-red-500">不明なページタイプ: {type}</div>;
  }

  return <YamlTable fileName={config.fileName} title={config.title} />;
}
