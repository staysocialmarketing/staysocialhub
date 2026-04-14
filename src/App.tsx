import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ClientFilterProvider } from "@/contexts/ClientFilterContext";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Workflow from "./pages/Workflow";
import Approvals from "./pages/Approvals";
import PostDetail from "./pages/PostDetail";
import Requests from "./pages/Requests";
import Profile from "./pages/Profile";
import WhatsNew from "./pages/WhatsNew";
import Plan from "./pages/Plan";
import ContentLibrary from "./pages/ContentLibrary";
import MarketingCalendar from "./pages/MarketingCalendar";
import SuccessCenter from "./pages/client/SuccessCenter";
import AIInterview from "./pages/client/AIInterview";
import ContentGenerator from "./pages/client/ContentGenerator";
import BrandTwinPage from "./pages/client/BrandTwin";
import AdminClients from "./pages/admin/AdminClients";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProfileUpdates from "./pages/admin/AdminProfileUpdates";
import AdminContent from "./pages/admin/AdminContent";
import AdminMarketplace from "./pages/admin/AdminMarketplace";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminVersions from "./pages/admin/AdminVersions";
import ClientStrategy from "./pages/admin/ClientStrategy";
import ClientBrain from "./pages/admin/ClientBrain";
import TeamDashboard from "./pages/admin/TeamDashboard";
import TeamRoles from "./pages/admin/TeamRoles";
import TeamRevenue from "./pages/admin/TeamRevenue";
import TeamGrowth from "./pages/admin/TeamGrowth";
import TeamWins from "./pages/admin/TeamWins";
import ThinkTank from "./pages/team/ThinkTank";
import AdminAutomations from "./pages/admin/AdminAutomations";
import MeetingNotes from "./pages/admin/MeetingNotes";
import Projects from "./pages/team/Projects";
import Tasks from "./pages/team/Tasks";
import UniversalInbox from "./pages/team/UniversalInbox";
import CorporateStrategy from "./pages/admin/CorporateStrategy";
import AgentOffice from "./pages/admin/AgentOffice";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isSSRole, loading } = useAuth();
  if (loading) return null;
  if (!isSSRole) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function SSAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSSAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isSSAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AuthRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClientFilterProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workflow" element={<AdminRoute><Workflow /></AdminRoute>} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/calendar" element={<MarketingCalendar />} />
              <Route path="/approvals/:postId" element={<PostDetail />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/content-library" element={<ContentLibrary />} />
              <Route path="/client/success" element={<SuccessCenter />} />
              <Route path="/client/ai-interview" element={<AIInterview />} />
              <Route path="/client/generate" element={<ContentGenerator />} />
              <Route path="/client/brand-twin" element={<BrandTwinPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/whats-new" element={<WhatsNew />} />
              <Route path="/admin/clients" element={<AdminRoute><AdminClients /></AdminRoute>} />
              <Route path="/admin/users" element={<SSAdminRoute><AdminUsers /></SSAdminRoute>} />
              <Route path="/admin/profile-updates" element={<AdminRoute><AdminProfileUpdates /></AdminRoute>} />
              <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
              <Route path="/admin/marketplace" element={<AdminRoute><AdminMarketplace /></AdminRoute>} />
              <Route path="/admin/media" element={<AdminRoute><AdminMedia /></AdminRoute>} />
              <Route path="/admin/versions" element={<SSAdminRoute><AdminVersions /></SSAdminRoute>} />
              <Route path="/admin/client-strategy/:clientId" element={<AdminRoute><ClientStrategy /></AdminRoute>} />
              <Route path="/admin/client-brain/:clientId" element={<AdminRoute><ClientBrain /></AdminRoute>} />
              <Route path="/admin/team" element={<AdminRoute><TeamDashboard /></AdminRoute>} />
              <Route path="/admin/team/roles" element={<AdminRoute><TeamRoles /></AdminRoute>} />
              <Route path="/admin/team/revenue" element={<AdminRoute><TeamRevenue /></AdminRoute>} />
              <Route path="/admin/team/growth" element={<AdminRoute><TeamGrowth /></AdminRoute>} />
              <Route path="/admin/team/wins" element={<AdminRoute><TeamWins /></AdminRoute>} />
              <Route path="/admin/automations" element={<AdminRoute><AdminAutomations /></AdminRoute>} />
              <Route path="/admin/meeting-notes" element={<AdminRoute><MeetingNotes /></AdminRoute>} />
              <Route path="/team/think-tank" element={<AdminRoute><ThinkTank /></AdminRoute>} />
              <Route path="/team/projects" element={<AdminRoute><Projects /></AdminRoute>} />
              <Route path="/team/tasks" element={<AdminRoute><Tasks /></AdminRoute>} />
              <Route path="/team/inbox" element={<AdminRoute><UniversalInbox /></AdminRoute>} />
              <Route path="/corporate/strategy" element={<AdminRoute><CorporateStrategy /></AdminRoute>} />
              <Route path="/agent-office" element={<AdminRoute><AgentOffice /></AdminRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ClientFilterProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
