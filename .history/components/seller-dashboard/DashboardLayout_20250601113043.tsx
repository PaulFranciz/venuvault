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
    <div className="flex h-screen bg-[#F9F6F0]">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header / Toggle Button */}
        <header className="md:hidden bg-[#0C090C] shadow-md p-4 flex items-center justify-between">
          <div className="text-xl font-bold text-[#F96521]">EventPulse</div>
          <button 
            onClick={toggleMobileSidebar} 
            className="text-[#F9F6F0] hover:text-[#F96521] focus:outline-none"
            aria-label="Open sidebar"
          >
            <Menu size={28} />
          </button>
        </header>
        
        <main className="flex-1 p-6 overflow-y-auto bg-[#F9F6F0]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 