import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const DashboardHome = () => {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-pally-bold text-gray-800">Welcome to your Dashboard</h1>
        <p className="text-gray-600">Manage your events, sales, and more.</p>
      </header>
      {/* Placeholder for actual dashboard content */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-pally-medium text-gray-700 mb-4">Quick Actions</h2>
        <Button className="bg-brand-teal hover:bg-brand-teal/90 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create New Event
        </Button>
        {/* More dashboard widgets will go here */}
      </div>
    </div>
  );
};

export default DashboardHome; 