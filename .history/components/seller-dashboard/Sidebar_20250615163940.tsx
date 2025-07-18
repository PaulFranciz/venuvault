"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Ticket, BarChart2, MessageSquare, Users, Settings, X, Tag } from 'lucide-react';

const navItems = [
  { href: '/seller', label: 'Dashboard Home', icon: LayoutDashboard },
  { href: '/seller/events', label: 'Event Management', icon: CalendarDays },
  { href: '/seller/ticketing', label: 'Ticketing', icon: Ticket },
  { href: '/seller/discounts', label: 'Discount Codes', icon: Tag },
  { href: '/seller/analytics', label: 'Sales & Analytics', icon: BarChart2 },
  { href: '/seller/communication', label: 'Communication', icon: MessageSquare },
  { href: '/seller/staff', label: 'Staffing', icon: Users },
  { href: '/seller/settings', label: 'Financial Settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 p-4 space-y-6 flex flex-col shadow-lg transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-none
                  ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            EventPulse
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 md:hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1" aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-grow overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.label}>
                  <Link href={item.href} legacyBehavior>
                    <a
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors 
                                  ${isActive
                                    ? 'bg-[#F96521] text-white font-medium shadow-md'
                                    : 'hover:bg-[#F96521]/10 hover:text-[#F96521]'}`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#F9F6F0]/70'}`} />
                      {item.label}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="border-t border-[#F96521]/30 pt-4">
          <Link href="/seller/profile" legacyBehavior>
            <a
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors 
                          ${pathname === '/seller/profile'
                            ? 'bg-[#F96521] text-white font-medium shadow-md'
                            : 'hover:bg-[#F96521]/10 hover:text-[#F96521]'}`}
            >
              <Users className={`w-5 h-5 flex-shrink-0 ${pathname === '/seller/profile' ? 'text-white' : 'text-[#F9F6F0]/70'}`} />
              Organizer Profile
            </a>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 