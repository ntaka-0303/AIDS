import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// プロジェクトルートパス（ui/backend/src の3つ上 = main/）
export const PROJECT_ROOT = resolve(__dirname, '../../../');
