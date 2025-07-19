import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

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

// Protected Pages - Data Management
import CSVUpload from '@/pages/CSVUpload';

// Protected Pages - Analytics
import AdvancedAnalytics from '@/pages/AdvancedAnalytics';
import AIInsights from '@/pages/AIInsights';
import EmailAnalytics from '@/pages/EmailAnalytics';
import PredictiveAnalytics from '@/pages/PredictiveAnalytics';

// Protected Pages - Email & Campaigns
import EmailTemplates from '@/pages/EmailTemplates';
import Campaigns from '@/pages/Campaigns';
// Segmentation page removed
import Personalization from '@/pages/Personalization';

// Protected Pages - Integrations
import CRMIntegrations from '@/pages/CRMIntegrations';
import Integrations from '@/pages/Integrations';

// Protected Pages - Reports
import Reports from '@/pages/Reports';

// Protected Pages - Admin

// 404 Page
import NotFound from '@/pages/NotFound';

import { ROUTES } from './routeConfig';

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

    {/* Protected Routes - Core */}
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

    {/* Protected Routes - Data Management */}
    <Route
      path={ROUTES.CSV_UPLOAD}
      element={
        <ProtectedRoute>
          <CSVUpload />
        </ProtectedRoute>
      }
    />

    {/* Protected Routes - Analytics */}
    <Route
      path={ROUTES.ADVANCED_ANALYTICS}
      element={
        <ProtectedRoute>
          <AdvancedAnalytics />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.AI_INSIGHTS}
      element={
        <ProtectedRoute>
          <AIInsights />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.EMAIL_ANALYTICS}
      element={
        <ProtectedRoute>
          <EmailAnalytics />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.PREDICTIVE_ANALYTICS}
      element={
        <ProtectedRoute>
          <PredictiveAnalytics />
        </ProtectedRoute>
      }
    />

    {/* Protected Routes - Email & Campaigns */}
    <Route
      path={ROUTES.TEMPLATES}
      element={
        <ProtectedRoute>
          <EmailTemplates />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.CAMPAIGNS}
      element={
        <ProtectedRoute>
          <Campaigns />
        </ProtectedRoute>
      }
    />
    {/* Segmentation route removed */}
    <Route
      path={ROUTES.PERSONALIZATION}
      element={
        <ProtectedRoute>
          <Personalization />
        </ProtectedRoute>
      }
    />

    {/* Protected Routes - Integrations */}
    <Route
      path={ROUTES.CRM}
      element={
        <ProtectedRoute>
          <CRMIntegrations />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.INTEGRATIONS}
      element={
        <ProtectedRoute>
          <Integrations />
        </ProtectedRoute>
      }
    />

    {/* Protected Routes - Reports */}
    <Route
      path={ROUTES.REPORTS}
      element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      }
    />

    {/* Protected Routes - Admin */}

    {/* Catch-all route for 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);
