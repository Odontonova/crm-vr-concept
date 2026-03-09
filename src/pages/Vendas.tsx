import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, TrendingUp, ShoppingCart, Percent, Pencil, Trash2, Calendar as CalendarIcon, User, CreditCard } from "lucide-react";
import { useVendas, Venda } from "@/hooks/useVendas";
import { VendaModal } from "@/components/vendas/VendaModal";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function Vendas() {
  const today = new Date();
  const initialDateRange: DateRange = { 
    from: startOfMonth(today), 
    to: endOfMonth(today) 
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const { vendas, isLoading, deleteVenda } = useVendas(dateRange);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [isDeleting, setIsDeleting] = useState<Venda | null>(null);

  const metrics = useMemo(() => {
    if (isLoading || vendas.length === 0) {
      return { totalFaturado: 0, ticketMedio: 0, vendasNoPeriodo: 0, taxaConversao: 0 };
    }

    const totalFaturado = vendas.reduce((acc, venda) => acc + venda.valor_fechado, 0);
    const ticketMedio = totalFaturado / vendas.length;
    
    const vendasNoPeriodo = vendas.length;

    const vendasComOrcamento = vendas.filter(v => v.valor_orcado && v.valor_orcado > 0);
    const totalOrcado = vendasComOrcamento.reduce((acc, v) => acc + (v.valor_orcado || 0), 0);
    const totalFechadoDeOrcados = vendasComOrcamento.reduce((acc, v) => acc + v.valor_fechado, 0);
    const taxaConversao = totalOrcado > 0 ? (totalFechadoDeOrcados / totalOrcado) * 100 : 0;

    return { totalFaturado, ticketMedio, vendasNoPeriodo, taxaConversao };
  }, [vendas, isLoading]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleEdit = (venda: Venda) => {
    setEditingVenda(venda);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    if (!open) {
      setEditingVenda(null);
    }
    setIsModalOpen(open);
  };

  const handleDeleteRequest = (venda: Venda) => {
    setIsDeleting(venda);
  };

  const confirmDelete = () => {
    if (isDeleting) {
      deleteVenda(isDeleting.id);
    }
    setIsDeleting(null);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Responsivo */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Vendas</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Controle de contratos e faturamento.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full" />
          </div>
          <Button onClick={() => handleCloseModal(true)} className="gap-2 w-full sm:w-auto h-10 shadow-sm">
            <Plus className="h-4 w-4" />
            Registrar Venda
          </Button>
        </div>
      </div>

      {/* Cards de Métricas com grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalFaturado)}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.ticketMedio)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendas (Período)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.vendasNoPeriodo}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa Conversão</CardTitle>
            <Percent className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.taxaConversao.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-none sm:border sm:shadow-sm sm:bg-card overflow-hidden">
        <CardHeader className="hidden sm:block">
          <CardTitle>Histórico de Vendas</CardTitle>
          <CardDescription>Todos os contratos fechados registrados no sistema.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-0 sm:p-6">
          {/* Visualização Mobile: Cartões (Apenas visível em telas menores que md) */}
          <div className="grid grid-cols-1 gap-4 md:hidden px-4 sm:px-0">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg bg-card animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-full"></div>
                </div>
              ))
            ) : vendas.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                Nenhuma venda registrada no período.
              </div>
            ) : (
              vendas.map(venda => (
                <div key={venda.id} className="p-4 border rounded-xl bg-card shadow-sm space-y-4 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="font-bold text-foreground truncate">{venda.leads?.nome || 'Cliente não encontrado'}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        {format(parseISO(venda.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(venda)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRequest(venda)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-muted/30 p-2 rounded-lg border border-border/50">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">Valor Fechado</span>
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(venda.valor_fechado)}</span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-lg border border-border/50">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">Pagamento</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CreditCard className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium truncate">{venda.forma_pagamento || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {venda.valor_orcado && venda.valor_orcado > 0 && (
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-muted-foreground italic">Valor Orçado: {formatCurrency(venda.valor_orcado)}</span>
                      <Badge variant="outline" className="text-[10px] h-5 py-0">
                        {((venda.valor_fechado / venda.valor_orcado) * 100).toFixed(0)}% do orçado
                      </Badge>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Visualização Desktop: Tabela (Oculta em mobile) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Fechado</TableHead>
                  <TableHead>Data Fechamento</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Valor Orçado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : vendas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma venda registrada no período.</TableCell></TableRow>
                ) : (
                  vendas.map(venda => (
                    <TableRow key={venda.id} className="group">
                      <TableCell className="font-medium">{venda.leads?.nome || 'Cliente não encontrado'}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">{formatCurrency(venda.valor_fechado)}</TableCell>
                      <TableCell>{format(parseISO(venda.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-muted/50 font-normal">{venda.forma_pagamento || 'N/A'}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{venda.valor_orcado ? formatCurrency(venda.valor_orcado) : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEdit(venda)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteRequest(venda)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <VendaModal 
        open={isModalOpen} 
        onOpenChange={handleCloseModal} 
        venda={editingVenda}
      />

      {/* AlertDialog para Confirmação de Exclusão */}
      <AlertDialog open={!!isDeleting} onOpenChange={() => setIsDeleting(null)}>
        <AlertDialogContent className="w-[90vw] max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a venda de {isDeleting?.leads?.nome || 'este cliente'} no valor de {isDeleting?.valor_fechado ? formatCurrency(isDeleting.valor_fechado) : 'R$ 0,00'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              Sim, excluir venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}