import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Bell, CheckCircle, User, Phone, Trash2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { LeadSelector } from "@/components/notifications/LeadSelector";
import { useAllNotifications, NotificationWithLead } from "@/hooks/useAllNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const NotificationCard = ({ notification, onUpdateStatus }: { notification: NotificationWithLead, onUpdateStatus: (id: string, status: 'pendente' | 'resolvido') => void }) => {
  const timeAgo = formatDistanceToNow(new Date(notification.criado_em), { addSuffix: true, locale: ptBR });

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={notification.status === 'pendente' ? "bg-amber-100 text-amber-600 p-2 rounded-full mt-1 shrink-0" : "bg-muted text-muted-foreground p-2 rounded-full mt-1 shrink-0"}>
              <Bell className="h-5 w-5" />
            </div>
            <div className="space-y-3 flex-1 min-w-0">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {notification.mensagem.replace(/\\n/g, '\n')}
                </ReactMarkdown>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Cliente: {notification.leads?.nome || 'Desconhecido'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>WhatsApp: {notification.leads?.telefone || 'N/A'}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">{timeAgo}</p>
            </div>
          </div>
          {notification.status === 'pendente' && (
            <Button variant="outline" size="sm" onClick={() => onUpdateStatus(notification.id, 'resolvido')} className="flex-shrink-0 ml-2">
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolver
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Notifications() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(today), to: endOfMonth(today) });
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>('todos');
  const [activeTab, setActiveTab] = useState<'pendentes' | 'resolvidas'>('pendentes');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { notifications, isLoading, updateStatus, deleteResolved, isDeletingResolved } = useAllNotifications({ dateRange, leadId: selectedLeadId });

  const { pending, resolved } = useMemo(() => {
    const pending = notifications.filter(n => n.status === 'pendente');
    const resolved = notifications.filter(n => n.status === 'resolvido');
    return { pending, resolved };
  }, [notifications]);

  const handleUpdateStatus = (notificationId: string, status: 'pendente' | 'resolvido') => {
    updateStatus({ notificationId, status });
  };

  const handleClearResolved = () => {
    deleteResolved();
    setIsConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground mt-1">Gerencie os alertas e avisos do sistema.</p>
        </div>
        
        {activeTab === 'resolvidas' && resolved.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsConfirmOpen(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 h-9"
          >
            <Trash2 className="h-4 w-4" />
            Limpar Resolvidas
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center gap-4">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <LeadSelector selectedLeadId={selectedLeadId} setSelectedLeadId={setSelectedLeadId} />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="bg-muted">
          <TabsTrigger value="pendentes">
            Pendentes <Badge className="ml-2 bg-destructive text-destructive-foreground">{isLoading ? '...' : pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resolvidas">
            Resolvidas <Badge variant="secondary" className="ml-2">{isLoading ? '...' : resolved.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-6 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          ) : pending.length > 0 ? (
            pending.map(notification => (
              <NotificationCard key={notification.id} notification={notification} onUpdateStatus={handleUpdateStatus} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma notificação pendente.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="resolvidas" className="mt-6 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          ) : resolved.length > 0 ? (
            resolved.map(notification => (
              <NotificationCard key={notification.id} notification={notification} onUpdateStatus={handleUpdateStatus} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma notificação resolvida neste período.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Alerta de Confirmação para Limpeza */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar notificações resolvidas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente todas as notificações com status "Resolvido" visíveis na lista. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearResolved}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeletingResolved}
            >
              {isDeletingResolved ? "Limpando..." : "Sim, Limpar Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}