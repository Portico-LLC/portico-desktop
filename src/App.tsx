import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MainTitleBar } from '@/components/MainTitleBar';
import { SidebarProvider } from '@/components/SidebarContext';
import { TeamChatSocketProvider } from '@/components/TeamChatSocketProvider';
import { CommandPaletteProvider } from '@/components/CommandPaletteProvider';
import { Layout } from '@/components/Layout';
import { ProtectedRoute, ClientProtectedRoute, OwnerOnlyRoute } from '@/components/ProtectedRoute';
import { AuthLayout } from '@/components/AuthLayout';
import { ElectronAuthLayout } from '@/components/ElectronAuthLayout';
import { ClientLayout } from '@/components/ClientLayout';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { AcceptInvite } from '@/pages/AcceptInvite';
import { Dashboard } from '@/pages/Dashboard';
import { Pulse } from '@/pages/Pulse';
import { Inbox } from '@/pages/Inbox';
import { Clients } from '@/pages/Clients';
import { Projects } from '@/pages/Projects';
import { Tasks } from '@/pages/Tasks';
import { Invoices } from '@/pages/Invoices';
import { Settings } from '@/pages/Settings';
import { Brain } from '@/pages/Brain';
import { Calendar } from '@/pages/Calendar';
import { Automations } from '@/pages/Automations';
import { AutomationBuilder } from '@/pages/AutomationBuilder';
import { Team } from '@/pages/Team';
import { ProjectTemplates } from '@/pages/ProjectTemplates';
import { TeamChat } from '@/pages/TeamChat';
import { Vault } from '@/pages/Vault';
import { ClientDashboard } from '@/pages/portal/ClientDashboard';
import { ClientProjects } from '@/pages/portal/ClientProjects';
import { ClientProjectDetail } from '@/pages/portal/ClientProjectDetail';
import { ClientTasks } from '@/pages/portal/ClientTasks';
import { ClientInvoices } from '@/pages/portal/ClientInvoices';
import { ClientBrain } from '@/pages/portal/ClientBrain';
import { ClientVault } from '@/pages/portal/ClientVault';
import { Terms } from '@/pages/legal/Terms';
import { Privacy } from '@/pages/legal/Privacy';
import { Panel } from '@/pages/Panel';
import { SourcePicker } from '@/pages/SourcePicker';
import { isElectron } from '@/lib/isElectron';

const AuthWrapper = isElectron ? ElectronAuthLayout : AuthLayout;
// Electron loads the packaged build from a file:// URL, where BrowserRouter can't
// resolve routes from window.location.pathname. HashRouter sidesteps that entirely.
const Router = isElectron ? HashRouter : BrowserRouter;

// Every full-height layout (Sidebar/Layout/ClientSidebar/ClientLayout/
// ElectronAuthLayout) reads this to know how much of the viewport the custom
// title bar below is taking up — 0px everywhere except the main Electron
// window, so it's a no-op on web. Set once at module scope since `isElectron`
// never changes at runtime.
if (isElectron) {
  document.documentElement.classList.add('has-electron-titlebar');
}

// The panel and source-picker windows are separate frameless BrowserWindows
// with their own already-correct custom headers — they must not get a second
// title bar stacked on top.
const CHROMELESS_ROUTES = ['/panel', '/source-picker'];

function ElectronChrome({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (!isElectron || CHROMELESS_ROUTES.includes(pathname)) return <>{children}</>;
  return (
    <div className="flex h-screen flex-col">
      <MainTitleBar />
      {/* overflow-y-auto here (not on individual pages) is what keeps the title
          bar pinned even for pages like Terms/Privacy that rely on natural
          document scroll rather than managing their own internal overflow. */}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

// Lazy-loaded: pulls in Tiptap + pdfjs-dist, which are large enough to keep out of
// the main bundle — only fetched when someone actually visits a Documents page.
const Documents = lazy(() => import('@/pages/Documents').then((m) => ({ default: m.Documents })));
const ClientDocuments = lazy(() => import('@/pages/portal/ClientDocuments').then((m) => ({ default: m.ClientDocuments })));

function LazyPageFallback() {
  return <div className="flex h-64 items-center justify-center text-sm text-ink-400">Loading…</div>;
}

export default function App() {
  return (
    <Router>
      <SidebarProvider>
      <TeamChatSocketProvider>
        <CommandPaletteProvider />
        <ElectronChrome>
        <Routes>
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/panel" element={<Panel />} />
          <Route path="/source-picker" element={<SourcePicker />} />
          <Route
            path="/login"
            element={
              <AuthWrapper>
                <Login />
              </AuthWrapper>
            }
          />
          <Route
            path="/signup"
            element={
              <AuthWrapper>
                <Signup />
              </AuthWrapper>
            }
          />
          <Route
            path="/accept-invite/:token"
            element={
              <AuthWrapper>
                <AcceptInvite />
              </AuthWrapper>
            }
          />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pulse" element={<Pulse />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/team-chat" element={<TeamChat />} />
              <Route path="/vault" element={<Vault />} />
              <Route
                path="/documents"
                element={
                  <Suspense fallback={<LazyPageFallback />}>
                    <Documents />
                  </Suspense>
                }
              />
              <Route path="/settings" element={<Settings />} />

              <Route element={<OwnerOnlyRoute />}>
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/brain" element={<Brain />} />
                <Route path="/brain/graph" element={<Brain />} />
                <Route path="/automations" element={<Automations />} />
                <Route path="/automations/:id" element={<AutomationBuilder />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/team" element={<Team />} />
                <Route path="/project-templates" element={<ProjectTemplates />} />
              </Route>
            </Route>
          </Route>

          <Route element={<ClientProtectedRoute />}>
            <Route element={<ClientLayout />}>
              <Route path="/portal" element={<ClientDashboard />} />
              <Route path="/portal/brain" element={<ClientBrain />} />
              <Route path="/portal/brain/graph" element={<ClientBrain />} />
              <Route path="/portal/projects" element={<ClientProjects />} />
              <Route path="/portal/projects/:id" element={<ClientProjectDetail />} />
              <Route path="/portal/tasks" element={<ClientTasks />} />
              <Route path="/portal/invoices" element={<ClientInvoices />} />
              <Route path="/portal/team-chat" element={<TeamChat />} />
              <Route path="/portal/vault" element={<ClientVault />} />
              <Route
                path="/portal/documents"
                element={
                  <Suspense fallback={<LazyPageFallback />}>
                    <ClientDocuments />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Routes>
        </ElectronChrome>
      </TeamChatSocketProvider>
      </SidebarProvider>
    </Router>
  );
}
