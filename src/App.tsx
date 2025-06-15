
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { UserSettingsProvider } from '@/contexts/UserSettingsContext';
import Settings from '@/pages/Settings';
import VerifyEmail from '@/pages/VerifyEmail';
import Webinars from '@/pages/Webinars';
import WebinarDetailView from '@/components/zoom/webinar/WebinarDetailView';
import AdvancedAnalytics from '@/pages/AdvancedAnalytics';
import CSVUpload from '@/pages/CSVUpload';
import ZoomCallbackHandler from '@/pages/auth/zoom/callback';
import Unsubscribe from '@/pages/Unsubscribe';
import EmailTemplates from '@/pages/EmailTemplates';
import Campaigns from '@/pages/Campaigns';
import EmailAnalytics from '@/pages/EmailAnalytics';
import Personalization from '@/pages/Personalization';
import Segmentation from '@/pages/Segmentation';
import PredictiveAnalytics from '@/pages/PredictiveAnalytics';
import Reports from '@/pages/Reports';
import Integrations from '@/pages/Integrations';
import AIInsights from '@/pages/AIInsights';

const App = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <ProfileProvider>
          <UserSettingsProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />

                {/* Core Webinar Features */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/webinars" element={<ProtectedRoute><Webinars /></ProtectedRoute>} />
                <Route path="/webinars/:id" element={<ProtectedRoute><WebinarDetailView /></ProtectedRoute>} />
                <Route path="/advanced-analytics" element={<ProtectedRoute><AdvancedAnalytics /></ProtectedRoute>} />

                {/* Email Marketing */}
                <Route path="/templates" element={<ProtectedRoute><EmailTemplates /></ProtectedRoute>} />
                <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                <Route path="/email-analytics" element={<ProtectedRoute><EmailAnalytics /></ProtectedRoute>} />
                
                {/* Data Management */}
                <Route path="/csv-upload" element={<ProtectedRoute><CSVUpload /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />

                {/* AI & Advanced Features */}
                <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
                <Route path="/personalization" element={<ProtectedRoute><Personalization /></ProtectedRoute>} />
                <Route path="/segmentation" element={<ProtectedRoute><Segmentation /></ProtectedRoute>} />
                <Route path="/predictive-analytics" element={<ProtectedRoute><PredictiveAnalytics /></ProtectedRoute>} />
                
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                <Route path="/auth/zoom/callback" element={<ProtectedRoute><ZoomCallbackHandler /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
            <Toaster />
          </UserSettingsProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
