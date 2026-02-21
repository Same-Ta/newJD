import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  dataTour?: string;
  collapsed?: boolean;
}

export const SidebarItem = ({ icon: Icon, label, active, onClick, dataTour, collapsed }: SidebarItemProps) => (
  <button 
    onClick={onClick}
    data-tour={dataTour}
    title={collapsed ? label : undefined}
    className={`flex items-center w-full ${collapsed ? 'justify-center px-2' : 'px-4'} py-3.5 mb-1 text-[15px] font-medium rounded-xl transition-all duration-200 ${
      active 
        ? 'text-blue-600 bg-blue-50/80' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon size={20} className={`${collapsed ? '' : 'mr-3'} ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    {!collapsed && label}
  </button>
);
