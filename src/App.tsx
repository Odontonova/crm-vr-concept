import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import Reports from "./pages/Reports";
import Marketing from "./pages/Marketing";
import Campaigns from "./pages/Campaigns";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import AiSettings from "./pages/AiSettings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Conversations from "./pages/Conversas";
import Notifications from "./pages/Notifications";
import Vendas from "./pages/Vendas";
import QuickMessagesPage from "./pages/QuickMessagesPage";
import Cadencias from "./pages/Cadencias";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { useLocalStorage } from "./hooks/use-local-storage";
import { cn } from "./lib/utils";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('sidebar-collapsed', false);
  const location = useLocation();
  const isConversationsPage = location.pathname.startsWith('/conversas');

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
      </div>
      
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <Header 
        onMenuClick={() => setMobileMenuOpen(true)} 
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <main className={cn(
        "pt-16 transition-all duration-300",
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      )}>
        <div className={cn(
          "h-[calc(100vh-4rem)]",
          !isConversationsPage && "p-6"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><AppLayout><Leads /></AppLayout></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><AppLayout><Pipeline /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
            <Route path="/marketing" element={<ProtectedRoute><AppLayout><Marketing /></AppLayout></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><AppLayout><Campaigns /></AppLayout></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><AppLayout><Templates /></AppLayout></ProtectedRoute>} />
            <Route path="/quick-messages" element={<ProtectedRoute><AppLayout><QuickMessagesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/cadencias" element={<ProtectedRoute><AppLayout><Cadencias /></AppLayout></ProtectedRoute>} />
            <Route path="/ia" element={<ProtectedRoute><AppLayout><AiSettings /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
            <Route path="/conversas" element={<ProtectedRoute><AppLayout><Conversations /></AppLayout></ProtectedRoute>} />
            <Route path="/conversas/:leadId" element={<ProtectedRoute><AppLayout><Conversations /></AppLayout></ProtectedRoute>} />
            <Route path="/notificacoes" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
            <Route path="/vendas" element={<ProtectedRoute><AppLayout><Vendas /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;