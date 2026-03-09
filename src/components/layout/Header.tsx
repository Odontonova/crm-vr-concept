import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsBell } from "./NotificationsBell";

export function Header({ onMenuClick, isSidebarCollapsed }: { onMenuClick: () => void; isSidebarCollapsed: boolean }) {
  const { user, signOut } = useAuth();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className={`fixed right-0 top-0 h-16 bg-card border-b border-border z-10 transition-all duration-300 ${isSidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'}`}>
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="h-6 w-6" />
          </Button>
          {/* A barra de pesquisa foi removida daqui */}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user ? getInitials(user.email || '') : 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Minha Conta</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}