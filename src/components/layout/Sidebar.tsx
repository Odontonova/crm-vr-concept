import { SidebarContent } from "./SidebarContent";

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, toggleCollapse }: SidebarProps) {
  return (
    <div className={`fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <SidebarContent isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
    </div>
  );
}