import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

export const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button 
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3.5 mb-1 text-[15px] font-medium rounded-xl transition-all duration-200 ${
      active 
        ? 'text-blue-600 bg-blue-50/80' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon size={20} className={`mr-3 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    {label}
  </button>
);
