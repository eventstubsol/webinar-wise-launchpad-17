
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ZoomConnectionGate } from '@/components/auth/ZoomConnectionGate';

// Public Pages
import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import Unsubscribe from '@/pages/Unsubscribe';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import Support from '@/pages/Support';
import Documentation from '@/pages/Documentation';

// Protected Pages - Core
import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';

// Protected Pages - Zoom Integration
import ZoomTest from '@/pages/ZoomTest';
import ZoomDiagnostics from '@/pages/ZoomDiagnostics';
import ZoomOAuthCallback from '@/pages/auth/zoom/callback';

// Protected Pages - Data Management
import Webinars from '@/pages/Webinars';
import WebinarDetail from '@/pages/WebinarDetail';
import SyncCenter from '@/pages/SyncCenter';
import CSVUpload from '@/pages/CSVUpload';

// Protected Pages - Analytics
import AdvancedAnalytics from '@/pages/AdvancedAnalytics';
import AIInsights from '@/pages/AIInsights';
import EmailAnalytics from '@/pages/EmailAnalytics';
import PredictiveAnalytics from '@/pages/PredictiveAnalytics';

// Protected Pages - Email & Campaigns
import EmailTemplates from '@/pages/EmailTemplates';
import Campaigns from '@/pages/Campaigns';
import Segmentation from '@/pages/Segmentation';
import Personalization from '@/pages/Personalization';

// Protected Pages - Integrations
import CRMIntegrations from '@/pages/CRMIntegrations';
import Integrations from '@/pages/Integrations';

// Protected Pages - Reports
import Reports from '@/pages/Reports';

// Protected Pages - Admin
import UserManagement from '@/pages/admin/UserManagement';
import AccountAnalytics from '@/pages/admin/AccountAnalytics';
import AllWebinars from '@/pages/admin/AllWebinars';

// 404 Page
import NotFound from '@/pages/NotFound';

import { ROUTES } from './routeConfig';

// Helper component to combine ProtectedRoute and ZoomConnectionGate
const ZoomProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute>
    <ZoomConnectionGate>
      {children}
    </ZoomConnectionGate>
  </ProtectedRoute>
);

export const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path={ROUTES.HOME} element={<Landing />} />
    <Route path={ROUTES.LOGIN} element={<Auth />} />
    <Route path={ROUTES.REGISTER} element={<Auth />} />
    <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
    <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
    <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
    <Route path={ROUTES.UNSUBSCRIBE} element={<Unsubscribe />} />
    <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicy />} />
    <Route path={ROUTES.TERMS_OF_SERVICE} element={<TermsOfService />} />
    <Route path={ROUTES.SUPPORT} element={<Support />} />
    <Route path={ROUTES.DOCUMENTATION} element={<Documentation />} />

    {/* Zoom OAuth Callback - needs to be protected but not gated */}
    <Route
      path="/auth/zoom/callback"
      element={
        <ProtectedRoute>
          <ZoomOAuthCallback />
        </ProtectedRoute>
      }
    />

    {/* Protected Routes - Core (No Zoom connection required) */}
    <Route
      path={ROUTES.DASHBOARD}
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.SETTINGS}
      element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      }
    />

    {/* Protected Routes - Zoom Integration (No gating for setup/diagnostics) */}
    <Route
      path={ROUTES.ZOOM_TEST}
      element={
        <ProtectedRoute>
          <ZoomTest />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.ZOOM_DIAGNOSTICS}
      element={
        <ProtectedRoute>
          <ZoomDiagnostics />
        </ProtectedRoute>
      }
    />

    {/* Protected Routes - Data Management (REQUIRES Zoom connection) */}
    <Route
      path={ROUTES.WEBINARS}
      element={
        <ZoomProtectedRoute>
          <Webinars />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.WEBINAR_DETAIL}
      element={
        <ZoomProtectedRoute>
          <WebinarDetail />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.SYNC_CENTER}
      element={
        <ZoomProtectedRoute>
          <SyncCenter />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.CSV_UPLOAD}
      element={
        <ZoomProtectedRoute>
          <CSVUpload />
        </ZoomProtectedRoute>
      }
    />

    {/* Protected Routes - Analytics (REQUIRES Zoom connection) */}
    <Route
      path={ROUTES.ADVANCED_ANALYTICS}
      element={
        <ZoomProtectedRoute>
          <AdvancedAnalytics />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.AI_INSIGHTS}
      element={
        <ZoomProtectedRoute>
          <AIInsights />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.EMAIL_ANALYTICS}
      element={
        <ZoomProtectedRoute>
          <EmailAnalytics />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.PREDICTIVE_ANALYTICS}
      element={
        <ZoomProtectedRoute>
          <PredictiveAnalytics />
        </ZoomProtectedRoute>
      }
    />

    {/* Protected Routes - Email & Campaigns (REQUIRES Zoom connection) */}
    <Route
      path={ROUTES.TEMPLATES}
      element={
        <ZoomProtectedRoute>
          <EmailTemplates />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.CAMPAIGNS}
      element={
        <ZoomProtectedRoute>
          <Campaigns />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.SEGMENTATION}
      element={
        <ZoomProtectedRoute>
          <Segmentation />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.PERSONALIZATION}
      element={
        <ZoomProtectedRoute>
          <Personalization />
        </ZoomProtectedRoute>
      }
    />

    {/* Protected Routes - Integrations (REQUIRES Zoom connection) */}
    <Route
      path={ROUTES.CRM}
      element={
        <ZoomProtectedRoute>
          <CRMIntegrations />
        </ZoomProtectedRoute>
      }
    />
    <Route
      path={ROUTES.INTEGRATIONS}
      element={
        <ZoomProtectedRoute>
          <Integrations />
        </ZoomProtectedRoute>
      }
    />

    {/* Protected Routes - Reports (REQUIRES Zoom connection) */}
    <Route
      path={ROUTES.REPORTS}
      element={
        <ZoomProtectedRoute>
          <Reports />
        </ZoomProtectedRoute>
      }
    />

    {/* Protected Routes - Admin (No Zoom connection required) */}
    <Route
      path="/admin/users"
      element={
        <ProtectedRoute>
          <UserManagement />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/account-analytics"
      element={
        <ProtectedRoute>
          <AccountAnalytics />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/webinars"
      element={
        <ProtectedRoute>
          <AllWebinars />
        </ProtectedRoute>
      }
    />

    {/* Catch-all route for 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);
