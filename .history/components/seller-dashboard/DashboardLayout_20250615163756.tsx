"use client"; // Ensure this is at the top

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react'; // Hamburger icon

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header / Toggle Button */}
        <header className="md:hidden bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="text-xl font-bold text-blue-600">EventPulse</div>
          <button 
            onClick={toggleMobileSidebar} 
            className="text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
        </header>
        
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 