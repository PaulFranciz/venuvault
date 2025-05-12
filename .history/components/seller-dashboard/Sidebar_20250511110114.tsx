import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Ticket, BarChart2, MessageSquare, Users, Settings, X } from 'lucide-react';

const navItems = [
  { href: '/seller', label: 'Dashboard Home', icon: LayoutDashboard },
  { href: '/seller/events', label: 'Event Management', icon: CalendarDays },
  { href: '/seller/ticketing', label: 'Ticketing & Discounts', icon: Ticket },
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
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-200 p-4 space-y-6 flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-lg
                  ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div className="text-2xl font-pally-bold text-white text-center px-2 py-1">
            EventPulse
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white md:hidden" aria-label="Close sidebar">
            <X size={24} />
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
                                    ? 'bg-brand-teal text-white font-pally-medium shadow-md'
                                    : 'hover:bg-slate-700 hover:text-white'}`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {item.label}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="border-t border-slate-700 pt-4">
          <Link href="/seller/profile" legacyBehavior>
            <a
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors 
                          ${pathname === '/seller/profile'
                            ? 'bg-brand-teal text-white font-pally-medium shadow-md'
                            : 'hover:bg-slate-700 hover:text-white'}`}
            >
              <Users className={`w-5 h-5 flex-shrink-0 ${pathname === '/seller/profile' ? 'text-white' : 'text-slate-400'}`} />
              Organizer Profile
            </a>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 