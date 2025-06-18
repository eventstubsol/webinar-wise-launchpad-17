
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Unsubscribe from "./pages/Unsubscribe";
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
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import EmailAnalytics from "./pages/EmailAnalytics";
import EmailTemplates from "./pages/EmailTemplates";
import Integrations from "./pages/Integrations";
import Personalization from "./pages/Personalization";
import PredictiveAnalytics from "./pages/PredictiveAnalytics";
import Segmentation from "./pages/Segmentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />

            {/* Protected Routes - Core Dashboard */}
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

            {/* Protected Routes - Zoom Integration */}
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

            {/* Protected Routes - Data Management */}
            <Route
              path="/webinars"
              element={
                <ProtectedRoute>
                  <Webinars />
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
              path="/csv-manager"
              element={
                <ProtectedRoute>
                  <CSVUpload />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Analytics */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AdvancedAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advanced-analytics"
              element={
                <ProtectedRoute>
                  <AdvancedAnalytics />
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
            <Route
              path="/email-analytics"
              element={
                <ProtectedRoute>
                  <EmailAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/predictive-analytics"
              element={
                <ProtectedRoute>
                  <PredictiveAnalytics />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Email & Campaigns */}
            <Route
              path="/email-campaigns"
              element={
                <ProtectedRoute>
                  <Campaigns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/email-templates"
              element={
                <ProtectedRoute>
                  <EmailTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/segmentation"
              element={
                <ProtectedRoute>
                  <Segmentation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/personalization"
              element={
                <ProtectedRoute>
                  <Personalization />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Integrations */}
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <CRMIntegrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <Integrations />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Reports */}
            <Route
              path="/exports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
