
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import ZoomTest from "./pages/ZoomTest";
import ZoomDiagnostics from "./pages/ZoomDiagnostics";
import Webinars from "./pages/Webinars";
import Reports from "./pages/Reports";
import SyncCenter from "./pages/SyncCenter";
import Campaigns from "./pages/Campaigns";
import CRMIntegrations from "./pages/CRMIntegrations";
import CSVUpload from "./pages/CSVUpload";
import AIInsights from "./pages/AIInsights";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/zoom-test"
              element={
                <ProtectedRoute>
                  <ZoomTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/zoom-diagnostics"
              element={
                <ProtectedRoute>
                  <ZoomDiagnostics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Webinars />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sync-center"
              element={
                <ProtectedRoute>
                  <SyncCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/email-campaigns"
              element={
                <ProtectedRoute>
                  <Campaigns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <CRMIntegrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/csv-manager"
              element={
                <ProtectedRoute>
                  <CSVUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-analytics"
              element={
                <ProtectedRoute>
                  <AIInsights />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
