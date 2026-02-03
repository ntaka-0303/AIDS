import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/common/Layout';
import { Dashboard } from './pages/Dashboard';
import { YamlTablePage } from './pages/YamlTablePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ChatPage } from './pages/ChatPage';
import { SkillsPage } from './pages/SkillsPage';
import { HearingsPage } from './pages/HearingsPage';
import { HearingAddPage } from './pages/HearingAddPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wbs" element={<YamlTablePage type="wbs" />} />
            <Route path="/issues" element={<YamlTablePage type="issues" />} />
            <Route path="/risks" element={<YamlTablePage type="risks" />} />
            <Route path="/questions" element={<YamlTablePage type="questions" />} />
            <Route path="/decisions" element={<YamlTablePage type="decisions" />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/hearings" element={<HearingsPage />} />
            <Route path="/hearings/add" element={<HearingAddPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
