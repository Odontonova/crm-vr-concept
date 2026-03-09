import { useState } from "react";
import { GitBranch, Plus, Calendar as CalendarIcon, History, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCadencias, useCadenciaLogs, Cadencia } from "@/hooks/useCadencias";
import { CadenciaModal } from "@/components/cadencias/CadenciaModal";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Cadencias() {
  const [activeTab, setActiveTab] = useState("fluxos");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  
  const { cadencias, isLoading, saveCadencia, deleteCadencia, isSaving } = useCadencias();
  const { data: logs, isLoading: logsLoading } = useCadenciaLogs(dateRange);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCadencia, setEditingCadencia] = useState<Cadencia | null>(null);
  const [cadenciaToDelete, setCadenciaToDelete] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingCadencia(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cadencia: Cadencia) => {
    setEditingCadencia(cadencia);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (cadenciaToDelete) {
      deleteCadencia(cadenciaToDelete);
      setCadenciaToDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Fiel à Imagem */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-[#8c7355]" />
            Cadência de Follow-Up
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Crie fluxos automáticos de mensagens para nutrir seus leads.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3">
          {activeTab === 'monitoramento' && (
            <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full sm:w-[260px]" />
          )}
          <Button onClick={handleCreate} className="bg-[#8c7355] hover:bg-[#7a6448] text-white shadow-sm gap-2">
            <Plus className="h-4 w-4" /> Nova Cadência
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1 mb-6">
          <TabsTrigger value="fluxos" className="gap-2">
            <Activity className="h-4 w-4" /> Biblioteca de Fluxos
          </TabsTrigger>
          <TabsTrigger value="monitoramento" className="gap-2">
            <History className="h-4 w-4" /> Monitoramento de Envios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fluxos" className="outline-none">
          {isLoading ? (
             <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
          ) : cadencias.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center text-muted-foreground bg-muted/10">
              Nenhuma cadência criada ainda. Clique em "Nova Cadência" para começar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cadencias.map(cadencia => (
                <div key={cadencia.id} className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                  <div className="px-3 pt-3 pb-1 border-b bg-muted/10">
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest text-[#8c7355] border-[#8c7355]/30 bg-[#8c7355]/5">
                      Fluxo de Mensagens
                    </Badge>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-1">{cadencia.nome}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mb-4">
                      {cadencia.descricao || "Sem descrição."}
                    </p>

                    <div className="border-t border-dashed pt-4 mt-auto">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 font-medium">
                        <span className="flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> {cadencia.passos?.length || 0} Passos</span>
                        <span className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> {format(new Date(cadencia.criado_em), 'dd/MM/yy')}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {/* Mini visualização dos passos */}
                        <div className="flex items-center gap-1 opacity-70">
                          {cadencia.passos?.slice(0, 3).map((p, i) => (
                            <div key={i} className="flex items-center">
                              <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[9px] font-bold">
                                {p.posicao_ordem}
                              </div>
                              {i < 2 && cadencia.passos!.length > i + 1 && <span className="text-[10px] mx-0.5">→</span>}
                            </div>
                          ))}
                          {(cadencia.passos?.length || 0) > 3 && <span className="text-[10px] ml-1">...</span>}
                        </div>

                        <Button variant="ghost" size="sm" className="h-7 text-xs text-[#8c7355] hover:text-[#7a6448] font-bold px-2" onClick={() => handleEdit(cadencia)}>
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="monitoramento" className="outline-none">
          <div className="border rounded-xl bg-card overflow-hidden">
            {logsLoading ? (
               <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando logs...</div>
            ) : (!logs || logs.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-muted-foreground font-medium">Nenhum registro de envio encontrado no período.</h3>
                <p className="text-xs text-muted-foreground/70 mt-1">Os envios automáticos aparecerão aqui assim que forem processados.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Cadência</TableHead>
                    <TableHead className="text-center">Passo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{format(new Date(log.enviado_em), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{log.leads?.nome || 'Desconhecido'}</div>
                        <div className="text-xs text-muted-foreground">{log.leads?.telefone}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.cadencias?.nome}</TableCell>
                      <TableCell className="text-center font-bold text-xs">{log.passo_ordem}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          log.status === 'sucesso' ? 'bg-green-50 text-green-700 border-green-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }>
                          {log.status === 'sucesso' ? 'Enviado' : 'Falha'}
                        </Badge>
                        {log.mensagem_erro && <div className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={log.mensagem_erro}>{log.mensagem_erro}</div>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CadenciaModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        cadencia={editingCadencia}
        onSave={saveCadencia}
        isSaving={isSaving}
      />

      <AlertDialog open={!!cadenciaToDelete} onOpenChange={() => setCadenciaToDelete(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cadência?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação removerá permanentemente o fluxo. Leads que estão nesta cadência deixarão de receber mensagens dela.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-lg">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}