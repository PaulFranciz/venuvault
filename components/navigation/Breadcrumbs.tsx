"use client";

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={item.href} className="inline-flex items-center">
              {index > 0 && (
                <ChevronRight className="mx-1 h-4 w-4 text-gray-400" />
              )}
              
              {isLast ? (
                <span className="text-sm font-medium text-gray-500" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link 
                  href={item.href}
                  className="text-sm font-medium text-[#F96521] hover:text-[#F96521]/80"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
