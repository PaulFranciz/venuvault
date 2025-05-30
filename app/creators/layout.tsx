import React from 'react';

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0C090C] text-white min-h-screen">
      {children}
    </div>
  );
}
