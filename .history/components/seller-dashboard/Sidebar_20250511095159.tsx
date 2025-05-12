import React from 'react';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white p-4 space-y-6">
      <div className="text-2xl font-pally-bold">EventPulse</div>
      <nav>
        <ul>
          <li className="mb-2">
            <a href="#" className="block p-2 hover:bg-gray-700 rounded">Dashboard Home</a>
          </li>
          <li className="mb-2">
            <a href="#" className="block p-2 hover:bg-gray-700 rounded">Event Management</a>
          </li>
          <li className="mb-2">
            <a href="#" className="block p-2 hover:bg-gray-700 rounded">Ticketing & Discounts</a>
          </li>
          <li className="mb-2">
            <a href="#" className="block p-2 hover:bg-gray-700 rounded">Sales & Analytics</a>
          </li>
          <li className="mb-2">
            <a href="#" className="block p-2 hover:bg-gray-700 rounded">Communication & Staffing</a>
          </li>
          <li className="mb-2">
            <a href="#" className="block p-2 hover:bg-gray-700 rounded">Financial Settings</a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 