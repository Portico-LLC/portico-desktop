import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MainTitleBar } from '@/components/MainTitleBar';
import { SidebarProvider } from '@/components/SidebarContext';
import { TeamChatSocketProvider } from '@/components/TeamChatSocketProvider';
import { ArcadeSocketProvider } from '@/components/ArcadeSocketProvider';
import { CommandPaletteProvider } from '@/components/CommandPaletteProvider';
import { ActionToast } from '@/components/ActionToast';
import { Layout } from '@/components/Layout';
import { ProtectedRoute, ClientProtectedRoute, OwnerOnlyRoute } from '@/components/ProtectedRoute';
import { ModuleGuard } from '@/components/ModuleGuard';
import { SuperAdminRoute } from '@/components/SuperAdminRoute';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { AuthLayout } from '@/components/AuthLayout';
import { ElectronAuthLayout } from '@/components/ElectronAuthLayout';
import { ClientLayout } from '@/components/ClientLayout';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { AcceptInvite } from '@/pages/AcceptInvite';
import { Dashboard } from '@/pages/Dashboard';
import { Pulse } from '@/pages/Pulse';
import { Radar } from '@/pages/Radar';
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
import { SuperAdminLogin } from '@/pages/super-admin/SuperAdminLogin';
import { Companies as SuperAdminCompanies } from '@/pages/super-admin/Companies';
import { CompanyDetail as SuperAdminCompanyDetail } from '@/pages/super-admin/CompanyDetail';
import { SignupRequests as SuperAdminSignupRequests } from '@/pages/super-admin/SignupRequests';
import { Inquiries as SuperAdminInquiries } from '@/pages/super-admin/Inquiries';
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

// Lazy-loaded: canvas rendering + per-game data (word bank, dictionary) is meaningfully
// heavier than a typical page — only fetched when someone actually visits Arcade.
const ArcadeHub = lazy(() => import('@/pages/arcade/ArcadeHub').then((m) => ({ default: m.ArcadeHub })));
const ArcadeRoom = lazy(() => import('@/pages/arcade/ArcadeRoom').then((m) => ({ default: m.ArcadeRoom })));
const ArcadeLeaderboard = lazy(() => import('@/pages/arcade/ArcadeLeaderboard').then((m) => ({ default: m.ArcadeLeaderboard })));
const ArcadeHistory = lazy(() => import('@/pages/arcade/ArcadeHistory').then((m) => ({ default: m.ArcadeHistory })));

function LazyPageFallback() {
  return <div className="flex h-64 items-center justify-center text-sm text-ink-400">Loading…</div>;
}

export default function App() {
  return (
    <Router>
      <SidebarProvider>
      <TeamChatSocketProvider>
      <ArcadeSocketProvider>
        <CommandPaletteProvider />
        <ActionToast />
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
              <Route element={<ModuleGuard module="radar" />}>
                <Route path="/radar" element={<Radar />} />
              </Route>
              <Route path="/inbox" element={<Inbox />} />
              <Route element={<ModuleGuard module="projects" />}>
                <Route path="/projects" element={<Projects />} />
              </Route>
              <Route element={<ModuleGuard module="tasks" />}>
                <Route path="/tasks" element={<Tasks />} />
              </Route>
              <Route element={<ModuleGuard module="teamChat" />}>
                <Route path="/team-chat" element={<TeamChat />} />
              </Route>
              <Route element={<ModuleGuard module="games" />}>
                <Route
                  path="/arcade"
                  element={
                    <Suspense fallback={<LazyPageFallback />}>
                      <ArcadeHub />
                    </Suspense>
                  }
                />
                <Route
                  path="/arcade/leaderboard"
                  element={
                    <Suspense fallback={<LazyPageFallback />}>
                      <ArcadeLeaderboard />
                    </Suspense>
                  }
                />
                <Route
                  path="/arcade/history"
                  element={
                    <Suspense fallback={<LazyPageFallback />}>
                      <ArcadeHistory />
                    </Suspense>
                  }
                />
                <Route
                  path="/arcade/rooms/:roomId"
                  element={
                    <Suspense fallback={<LazyPageFallback />}>
                      <ArcadeRoom />
                    </Suspense>
                  }
                />
              </Route>
              <Route element={<ModuleGuard module="vault" />}>
                <Route path="/vault" element={<Vault />} />
              </Route>
              <Route element={<ModuleGuard module="documents" />}>
                <Route
                  path="/documents"
                  element={
                    <Suspense fallback={<LazyPageFallback />}>
                      <Documents />
                    </Suspense>
                  }
                />
              </Route>
              <Route path="/settings" element={<Settings />} />

              <Route element={<OwnerOnlyRoute />}>
                <Route element={<ModuleGuard module="calendar" />}>
                  <Route path="/calendar" element={<Calendar />} />
                </Route>
                <Route element={<ModuleGuard module="brain" />}>
                  <Route path="/brain" element={<Brain />} />
                  <Route path="/brain/graph" element={<Brain />} />
                </Route>
                <Route element={<ModuleGuard module="automations" />}>
                  <Route path="/automations" element={<Automations />} />
                  <Route path="/automations/:id" element={<AutomationBuilder />} />
                </Route>
                <Route path="/clients" element={<Clients />} />
                <Route element={<ModuleGuard module="invoices" />}>
                  <Route path="/invoices" element={<Invoices />} />
                </Route>
                <Route path="/team" element={<Team />} />
                <Route element={<ModuleGuard module="projectTemplates" />}>
                  <Route path="/project-templates" element={<ProjectTemplates />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route element={<SuperAdminRoute />}>
            <Route element={<SuperAdminLayout />}>
              <Route path="/super-admin" element={<SuperAdminCompanies />} />
              <Route path="/super-admin/companies/:id" element={<SuperAdminCompanyDetail />} />
              <Route path="/super-admin/requests" element={<SuperAdminSignupRequests />} />
              <Route path="/super-admin/inquiries" element={<SuperAdminInquiries />} />
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
      </ArcadeSocketProvider>
      </TeamChatSocketProvider>
      </SidebarProvider>
    </Router>
  );
}
