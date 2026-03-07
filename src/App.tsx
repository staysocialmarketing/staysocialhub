import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import AdminClients from "./pages/admin/AdminClients";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProfileUpdates from "./pages/admin/AdminProfileUpdates";
import AdminContent from "./pages/admin/AdminContent";
import AdminMarketplace from "./pages/admin/AdminMarketplace";
import AdminMedia from "./pages/admin/AdminMedia";
import ThinkTank from "./pages/team/ThinkTank";
import Projects from "./pages/team/Projects";
import Tasks from "./pages/team/Tasks";
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
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workflow" element={<AdminRoute><Workflow /></AdminRoute>} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/approvals/:postId" element={<PostDetail />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/content-library" element={<ContentLibrary />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/whats-new" element={<WhatsNew />} />
              <Route path="/admin/clients" element={<AdminRoute><AdminClients /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/profile-updates" element={<AdminRoute><AdminProfileUpdates /></AdminRoute>} />
              <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
              <Route path="/admin/marketplace" element={<AdminRoute><AdminMarketplace /></AdminRoute>} />
              <Route path="/admin/media" element={<AdminRoute><AdminMedia /></AdminRoute>} />
              <Route path="/team/think-tank" element={<AdminRoute><ThinkTank /></AdminRoute>} />
              <Route path="/team/projects" element={<AdminRoute><Projects /></AdminRoute>} />
              <Route path="/team/tasks" element={<AdminRoute><Tasks /></AdminRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
