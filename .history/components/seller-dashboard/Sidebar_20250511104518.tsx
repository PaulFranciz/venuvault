import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, CalendarDays, Ticket, BarChart2, MessageSquare, Users, Settings } from 'lucide-react';

const navItems = [
  { href: '/seller', label: 'Dashboard Home', icon: LayoutDashboard },
  { href: '/seller/events', label: 'Event Management', icon: CalendarDays },
  { href: '/seller/ticketing', label: 'Ticketing & Discounts', icon: Ticket },
  { href: '/seller/analytics', label: 'Sales & Analytics', icon: BarChart2 },
  { href: '/seller/communication', label: 'Communication', icon: MessageSquare },
  { href: '/seller/staff', label: 'Staffing', icon: Users },
  { href: '/seller/settings', label: 'Financial Settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-200 p-4 space-y-6 flex flex-col shadow-lg">
      <div className="text-2xl font-pally-bold text-white text-center px-2 py-3 border-b border-slate-700">
        EventPulse
      </div>
      <nav className="flex-grow">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link href={item.href} legacyBehavior>
                <a className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-slate-700 hover:text-white transition-colors">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-slate-700 pt-4">
        <Link href="/seller/profile" legacyBehavior>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-slate-700 hover:text-white transition-colors">
            <Users className="w-5 h-5 flex-shrink-0" />
            Organizer Profile
          </a>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar; 