import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
  ChevronLeft,
  FileText,
  MessageSquare,
  Bell,
  ShoppingCart,
  Bot,
  Target,
  Zap,
  GitMerge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Painel", icon: LayoutDashboard, path: "/" },
  { title: "Leads", icon: Users, path: "/leads" },
  { title: "Pipeline", icon: GitBranch, path: "/pipeline" },
  { title: "Conversas", icon: MessageSquare, path: "/conversas" },
  { title: "Notificações", icon: Bell, path: "/notificacoes" },
  { title: "Vendas", icon: ShoppingCart, path: "/vendas" },
  { title: "Relatórios", icon: BarChart3, path: "/reports" },
  { title: "Marketing", icon: Target, path: "/marketing" },
  { title: "Campanhas", icon: Megaphone, path: "/campaigns" },
  { title: "Templates", icon: FileText, path: "/templates" },
  { title: "Msgs Rápidas", icon: Zap, path: "/quick-messages" },
  { title: "Cadências", icon: GitMerge, path: "/cadencias" },
  { title: "IA", icon: Bot, path: "/ia" },
  { title: "Configurações", icon: Settings, path: "/settings" },
];

interface SidebarContentProps {
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

export function SidebarContent({ isCollapsed = false, toggleCollapse }: SidebarContentProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { profile } = useProfile();

  const getInitials = (name?: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-sidebar">
        {/* Logo & Toggle */}
        <div className={`flex items-center transition-all h-20 flex-shrink-0 ${isCollapsed ? 'px-2 justify-center' : 'pl-3 pr-2'}`}>
          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
            {/* Logo Icon - Sempre visível ou ajustado */}
            <img
              src="https://izhbmjqyoglagooosmoc.supabase.co/storage/v1/object/public/media-mensagens/Logo/Logo%20VR%20Concept%20Dourada.png"
              alt="Logo VR Concept"
              className={`h-9 w-auto object-contain transition-all duration-300 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}
            />

            {/* Logo Text - Colapsável */}
            <div className={`flex flex-col whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
              <h1 className="text-[13px] font-bold text-sidebar-foreground uppercase tracking-wider font-serif leading-none mb-0.5">VR CONCEPT</h1>
              <p className="text-[9px] text-sidebar-primary tracking-wide uppercase font-medium">Educação & Cursos</p>
            </div>
          </div>

          {toggleCollapse && !isCollapsed && (
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ml-1 h-8 w-8 flex-shrink-0" onClick={toggleCollapse}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Toggle Button for Collapsed State (Centered) */}
        {toggleCollapse && isCollapsed && (
          <div className="flex justify-center pb-2">
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8" onClick={toggleCollapse}>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}

        {/* Menu Items */}
        <nav className={`flex-1 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-accent/20 scrollbar-track-transparent ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');
            const Icon = item.icon;

            const linkClasses = `flex items-center gap-3 py-2.5 rounded-lg transition-all ${isCollapsed
              ? 'justify-center px-2'
              : 'px-3'
              } ${isActive
                ? 'bg-sidebar-accent text-sidebar-primary font-medium border-l-2 border-sidebar-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground'
              }`;

            return isCollapsed ? (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link to={item.path} className={linkClasses}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            ) : (
              <Link key={item.path} to={item.path} className={linkClasses}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-sidebar-border flex-shrink-0`}>
          <div className={`flex items-center gap-3 mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-9 w-9 flex-shrink-0 border border-sidebar-border">
              <AvatarImage src={profile?.url_avatar || ''} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-primary font-serif text-xs">
                {getInitials(profile?.nome_completo)}
              </AvatarFallback>
            </Avatar>
            <div className={`flex-1 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
              <p className="text-sm font-medium text-sidebar-foreground truncate" title={profile?.nome_completo || 'Usuário'}>
                {profile?.nome_completo || 'Colaborador'}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate" title={user?.email || ''}>
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className={`w-full h-9 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            onClick={signOut}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className={`ml-2 text-xs whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>Sair</span>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}