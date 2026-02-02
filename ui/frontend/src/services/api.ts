const API_BASE = 'http://localhost:3001/api';

// YAML API
export const yamlApi = {
  async listFiles() {
    const res = await fetch(`${API_BASE}/yaml/files`);
    return res.json();
  },

  async listSchemas() {
    const res = await fetch(`${API_BASE}/yaml/schemas`);
    return res.json();
  },

  async getSchema(name: string) {
    const res = await fetch(`${API_BASE}/yaml/schemas/${name}`);
    return res.json();
  },

  async readFile(fileName: string) {
    const res = await fetch(`${API_BASE}/yaml/${fileName}`);
    return res.json();
  },

  async updateEntry(fileName: string, id: string, updates: any) {
    const res = await fetch(`${API_BASE}/yaml/${fileName}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async addEntry(fileName: string, entry: any) {
    const res = await fetch(`${API_BASE}/yaml/${fileName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return res.json();
  },

  async deleteEntry(fileName: string, id: string) {
    const res = await fetch(`${API_BASE}/yaml/${fileName}/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};

// Markdown API
export const markdownApi = {
  async listFiles() {
    const res = await fetch(`${API_BASE}/markdown/files`);
    return res.json();
  },

  async readFile(path: string) {
    const res = await fetch(`${API_BASE}/markdown/read?path=${encodeURIComponent(path)}`);
    return res.json();
  },

  async writeFile(path: string, content: string) {
    const res = await fetch(`${API_BASE}/markdown/write`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    return res.json();
  },
};

// Claude API
export const claudeApi = {
  async getSkills() {
    const res = await fetch(`${API_BASE}/claude/skills`);
    return res.json();
  },

  async execute(command: string, sessionId?: string) {
    const res = await fetch(`${API_BASE}/claude/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, sessionId }),
    });
    return res.json();
  },

  async chat(message: string, sessionId?: string) {
    const res = await fetch(`${API_BASE}/claude/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }),
    });
    return res.json();
  },

  async stop(execId: string) {
    const res = await fetch(`${API_BASE}/claude/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execId }),
    });
    return res.json();
  },
};
