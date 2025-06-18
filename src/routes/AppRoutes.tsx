
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicRoutes } from './PublicRoutes';
import { CoreRoutes } from './CoreRoutes';
import { ZoomRoutes } from './ZoomRoutes';
import { DataRoutes } from './DataRoutes';
import { AnalyticsRoutes } from './AnalyticsRoutes';
import { CampaignRoutes } from './CampaignRoutes';
import { IntegrationRoutes } from './IntegrationRoutes';
import { ReportRoutes } from './ReportRoutes';
import NotFound from '@/pages/NotFound';

export const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <PublicRoutes />

    {/* Protected Routes - Core */}
    <CoreRoutes />

    {/* Protected Routes - Zoom Integration */}
    <ZoomRoutes />

    {/* Protected Routes - Data Management */}
    <DataRoutes />

    {/* Protected Routes - Analytics */}
    <AnalyticsRoutes />

    {/* Protected Routes - Email & Campaigns */}
    <CampaignRoutes />

    {/* Protected Routes - Integrations */}
    <IntegrationRoutes />

    {/* Protected Routes - Reports */}
    <ReportRoutes />

    {/* Catch-all route for 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);
