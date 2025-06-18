
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import AdvancedAnalytics from '@/pages/AdvancedAnalytics';
import AIInsights from '@/pages/AIInsights';
import EmailAnalytics from '@/pages/EmailAnalytics';
import PredictiveAnalytics from '@/pages/PredictiveAnalytics';
import { ROUTES } from './routeConfig';

export const AnalyticsRoutes = () => (
  <>
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
  </>
);
