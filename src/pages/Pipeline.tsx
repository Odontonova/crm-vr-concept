import { useState, useEffect, useCallback, useMemo } from "react";
import { MessageSquare, FileText, Phone, Calendar as CalendarIcon, Clock, BarChart3, Kanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  defaultDropAnimationSideEffects,
  DropAnimation
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LeadModal } from "@/components/leads/LeadModal";
import { useLeads, Lead } from "@/hooks/useLeads";
import { useStages } from "@/hooks/useStages";
import { formatDistanceToNow, startOfMonth, endOfMonth, format, isToday, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { FunnelMetricsTab } from "@/components/pipeline/FunnelMetricsTab";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// Configuração de animação para tornar o drop mais suave
const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

function StageColumn({
  stage,
  leads,
  onCardClick,
  onUpdateLead
}: {
  stage: { id: number; nome: string; cor: string; posicao_ordem: number };
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.posicao_ordem}`, // ID agora é baseado na ordem
    data: {
      type: 'Column',
      stageOrder: stage.posicao_ordem // Passando a ordem
    }
  });

  return (
    <div className="w-80 flex-shrink-0 flex flex-col h-full">
      <Card
        ref={setNodeRef}
        className={cn(
          "h-full flex flex-col transition-all duration-300 ease-out border-2",
          isOver
            ? "bg-primary/5 border-primary/50 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)] ring-1 ring-primary/20"
            : "bg-muted/30 border-transparent shadow-sm hover:border-border/60"
        )}
      >
        <CardHeader
          className="bg-card/50 rounded-t-lg border-l-4 flex-shrink-0 transition-colors"
          style={{ borderColor: stage.cor }}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground/90">{stage.nome}</CardTitle>
            <Badge variant="secondary" className="font-mono text-xs bg-background/80 shadow-sm text-secondary font-bold">
              {leads.length}
            </Badge>
          </div>
        </CardHeader>
        <div
          className="flex-1 p-2 space-y-3 overflow-y-auto min-h-[150px] scrollbar-thin scrollbar-thumb-muted-foreground/10"
        >
          <SortableContext
            items={leads.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onCardClick(lead)}
                onUpdateLead={onUpdateLead}
              />
            ))}
          </SortableContext>
        </div>
      </Card>
    </div>
  );
}

function LeadCard({
  lead,
  onClick,
  onUpdateLead,
  isOverlay = false
}: {
  lead: Lead;
  onClick?: () => void;
  onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: lead.id,
    data: {
      type: 'Lead',
      lead
    }
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const lastContactTime = lead.ultimo_contato
    ? formatDistanceToNow(new Date(lead.ultimo_contato), { locale: ptBR, addSuffix: true })
    : 'Nunca contatado';

  const handleDateSelect = (date: Date | undefined) => {
    setIsCalendarOpen(false);
    if (onUpdateLead) {
      if (date) {
        const adjustedDate = new Date(date);
        adjustedDate.setHours(12, 0, 0, 0);
        onUpdateLead(lead.id, { agendamento: adjustedDate.toISOString() });
      } else {
        onUpdateLead(lead.id, { agendamento: null as any });
      }
    }
  };

  const getScheduleBadge = () => {
    if (!lead.agendamento) return null;
    const date = parseISO(lead.agendamento);
    const isLate = isPast(date) && !isToday(date);
    const isForToday = isToday(date);

    return (
      <div className={cn(
        "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border",
        isLate ? "bg-red-50 text-red-700 border-red-200" :
          isForToday ? "bg-green-50 text-green-700 border-green-200" :
            "bg-blue-50 text-blue-700 border-blue-200"
      )}>
        <CalendarIcon className="h-3 w-3" />
        {format(date, "dd/MM", { locale: ptBR })}
      </div>
    );
  };

  if (isOverlay) {
    return (
      <Card className="shadow-2xl cursor-grabbing bg-card ring-2 ring-primary/50 rotate-2 scale-105 z-50 pointer-events-none relative border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-foreground truncate">{lead.nome}</p>
                {getScheduleBadge()}
              </div>
              <p className="text-xs text-muted-foreground">{lead.telefone}</p>
            </div>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {lead.nome?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-sm text-foreground line-clamp-2 min-h-[40px] prose prose-sm max-w-none">
            {lead.resumo ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  p: ({ node, ...props }) => <p className="inline" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                }}
              >
                {lead.resumo.replace(/\\n/g, '\n')}
              </ReactMarkdown>
            ) : (
              <span className="text-muted-foreground italic">Nenhum resumo disponível.</span>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant="outline" className="text-xs font-normal max-w-[120px] truncate">
              {lead.origem || 'Sem origem'}
            </Badge>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-sm text-muted-foreground">{lastContactTime}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing bg-card group hover:border-primary/30"
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-foreground truncate">{lead.nome}</p>
                {getScheduleBadge()}
              </div>
              <p className="text-xs text-muted-foreground">{lead.telefone}</p>
            </div>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {lead.nome?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="text-sm text-foreground line-clamp-2 min-h-[40px] prose prose-sm max-w-none">
            {lead.resumo ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  p: ({ node, ...props }) => <p className="inline" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                }}
              >
                {lead.resumo.replace(/\\n/g, '\n')}
              </ReactMarkdown>
            ) : (
              <span className="text-muted-foreground italic">Nenhum resumo disponível.</span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant="outline" className="text-xs font-normal max-w-[120px] truncate">
              {lead.origem || 'Sem origem'}
            </Badge>

            <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7 transition-colors", lead.agendamento ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
                  <Calendar
                    mode="single"
                    selected={lead.agendamento ? parseISO(lead.agendamento) : undefined}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={ptBR}
                  />
                  {lead.agendamento && (
                    <div className="p-2 border-t text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-7 text-destructive hover:text-destructive"
                        onClick={() => handleDateSelect(undefined)}
                      >
                        Remover Agendamento
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-sm text-muted-foreground">{lastContactTime}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Pipeline() {
  const today = new Date();
  const initialDateRange: DateRange = {
    from: startOfMonth(today),
    to: endOfMonth(today)
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [activeTab, setActiveTab] = useState("kanban");

  const { leads, isLoading: leadsLoading, updateLead } = useLeads(dateRange);
  const { stages, isLoading: stagesLoading } = useStages();

  // Estado local otimista para UI fluida
  const [optimisticLeads, setOptimisticLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Sincroniza o estado local com o backend quando os dados chegam
  useEffect(() => {
    if (leads) {
      setOptimisticLeads(leads);
    }
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px para evitar cliques acidentais mas ser responsivo
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = optimisticLeads.find(l => l.id === active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveALead = active.data.current?.type === 'Lead';
    const isOverALead = over.data.current?.type === 'Lead';
    const isOverAColumn = over.data.current?.type === 'Column';

    if (!isActiveALead) return;

    // Cenário 1: Arrastando sobre outro Lead (Reordenação ou mudança de coluna)
    if (isActiveALead && isOverALead) {
      setOptimisticLeads((leads) => {
        const activeIndex = leads.findIndex((l) => l.id === activeId);
        const overIndex = leads.findIndex((l) => l.id === overId);

        if (leads[activeIndex].posicao_pipeline !== leads[overIndex].posicao_pipeline) {
          // Mudou de coluna: Atualiza a posicao_pipeline
          const newLeads = [...leads];
          newLeads[activeIndex] = {
            ...newLeads[activeIndex],
            posicao_pipeline: leads[overIndex].posicao_pipeline // USA POSICAO AGORA
          };
          return arrayMove(newLeads, activeIndex, overIndex);
        }

        return arrayMove(leads, activeIndex, overIndex);
      });
    }

    // Cenário 2: Arrastando sobre uma Coluna
    if (isActiveALead && isOverAColumn) {
      setOptimisticLeads((leads) => {
        const activeIndex = leads.findIndex((l) => l.id === activeId);
        const newStageOrder = over.data.current?.stageOrder; // USA ORDER AGORA

        if (leads[activeIndex].posicao_pipeline === newStageOrder) return leads;

        const newLeads = [...leads];
        newLeads[activeIndex] = {
          ...newLeads[activeIndex],
          posicao_pipeline: newStageOrder
        };
        return arrayMove(newLeads, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;

    // Identificar a nova posição
    let newStageOrder: number | undefined;

    if (over.data.current?.type === 'Column') {
      newStageOrder = over.data.current.stageOrder;
    } else if (over.data.current?.type === 'Lead') {
      const overLead = optimisticLeads.find(l => l.id === over.id);
      newStageOrder = overLead?.posicao_pipeline;
    }

    const originalLead = leads.find(l => l.id === leadId);

    if (newStageOrder && originalLead && originalLead.posicao_pipeline !== newStageOrder) {
      // Persiste a mudança usando posicao_pipeline
      updateLead({ id: leadId, posicao_pipeline: newStageOrder });
    } else {
      setOptimisticLeads(leads);
    }
  };

  const handleCardClick = (lead: Lead) => {
    setViewingLead(lead);
    setModalOpen(true);
  };

  const handleUpdateLead = (leadId: string, updates: Partial<Lead>) => {
    updateLead({ id: leadId, ...updates });
  };

  if (leadsLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pipeline de Vendas</h1>
          <p className="text-muted-foreground mt-1">Visualize e gerencie seu funil</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          {activeTab === 'kanban' && (
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold text-foreground">{optimisticLeads.length}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 mb-4">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2"><Kanban className="h-4 w-4" /> Quadro Kanban</TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2"><BarChart3 className="h-4 w-4" /> Métricas do Funil</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kanban" className="flex-1 h-full overflow-hidden">
          {/* Kanban Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            measuring={{
              droppable: {
                strategy: 1, // AlwaysMeasureStrategy
              }
            }}
          >
            <div className="overflow-x-auto pb-4 h-full">
              <div className="flex gap-4 min-w-max h-full pb-2 px-1">
                {stages.map((stage) => {
                  const stageLeads = optimisticLeads.filter(l => l.posicao_pipeline === stage.posicao_ordem);

                  return (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      leads={stageLeads}
                      onCardClick={handleCardClick}
                      onUpdateLead={handleUpdateLead}
                    />
                  );
                })}
              </div>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
              {activeLead ? (
                <LeadCard
                  lead={activeLead}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 overflow-y-auto">
          <FunnelMetricsTab dateRange={dateRange} />
        </TabsContent>
      </Tabs>

      {/* Lead Modal */}
      <LeadModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setViewingLead(null);
        }}
        lead={viewingLead}
        mode="view"
      />
    </div>
  );
}