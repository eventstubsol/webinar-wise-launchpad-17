
import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';
import { AnimatedSidebar } from '@/components/ui/animated-sidebar';

const Dashboard = () => {
  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <AnimatedSidebar />
      <div className="flex-1 flex flex-col ml-12">
        <DashboardHeader />
        <main className="flex-1 p-6 space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Analytics Overview
              </h2>
              <MetricsCards />
            </div>

            <ChartsSection />

            <DataTables />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
