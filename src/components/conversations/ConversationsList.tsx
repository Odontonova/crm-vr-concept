"use client";

import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, Mic, Image as ImageIcon, Video, FileText, Filter, X, Calendar as CalendarIcon, Tag, Globe, CheckCircle2, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationsList, Conversation } from "@/hooks/useConversations";
import { format, isToday, isYesterday, isValid, parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TAG_COLORS, useTags } from "@/hooks/useTags";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadModal } from "@/components/leads/LeadModal";
import { UserPlus, MoreVertical, GitBranch, Zap, Bot, Trash2, CheckSquare, Square } from "lucide-react";
import { useStages } from "@/hooks/useStages";
import { useCadencias } from "@/hooks/useCadencias";
import { useLeads } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatLastMessageTime = (timestamp?: string | null) => {
  if (!timestamp) return '';
  try {
    let date = parseISO(timestamp);
    if (!isValid(date)) date = new Date(timestamp.replace(' ', 'T'));
    if (!isValid(date)) return '';

    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem';

    const sevenDaysAgo = subDays(new Date(), 7);
    if (isWithinInterval(date, { start: sevenDaysAgo, end: new Date() })) {
      return format(date, 'EEE', { locale: ptBR }).replace('.', '');
    }
    return format(date, 'dd/MM/yy');
  } catch (e) {
    return '';
  }
};

const MessagePreview = ({ content, type, sender }: { content?: string, type?: string, sender?: string }) => {
  if (!content && !type) return <span className="italic opacity-60">Nenhuma mensagem</span>;

  const isOutgoing = sender === 'agente' || sender === 'bot' || sender === 'agente_crm';

  if (type === 'audio') return <div className="flex items-center gap-1"><Mic className="h-3 w-3" /> <span>Áudio</span></div>;
  if (type === 'imagem') return <div className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> <span>Foto</span></div>;
  if (type === 'video') return <div className="flex items-center gap-1"><Video className="h-3 w-3" /> <span>Vídeo</span></div>;
  if (type === 'pdf' || type === 'arquivo') return <div className="flex items-center gap-1"><FileText className="h-3 w-3" /> <span>Documento</span></div>;

  if (content === 'Nenhuma mensagem ainda') return <span className="italic opacity-60">{content}</span>;

  return (
    <div className="flex items-center gap-1 w-full min-w-0">
      {isOutgoing && <span className="font-medium text-primary shrink-0">Você:</span>}
      <span className="truncate">{content}</span>
    </div>
  );
};

const ConversationItem = ({
  conversation,
  isSelected,
  onSelect,
  isSelectionMode
}: {
  conversation: Conversation,
  isSelected: boolean,
  onSelect: (id: string) => void,
  isSelectionMode: boolean
}) => {
  const { leadId } = useParams();
  const isActive = leadId === conversation.id;
  const lastTime = formatLastMessageTime(conversation.last_message_timestamp);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_60px_1fr] h-[72px] items-center border-b border-border/40 transition-colors relative",
        isActive ? "bg-muted border-l-4 border-l-primary" : "hover:bg-muted/30",
        isSelected && "bg-primary/5"
      )}
    >
      <div className={cn("pl-4 flex items-center justify-center transition-all", isSelectionMode ? "w-10 opacity-100" : "w-0 opacity-0 overflow-hidden")}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(conversation.id)}
          className="h-5 w-5 data-[state=checked]:bg-[#8c7355] data-[state=checked]:border-[#8c7355]"
        />
      </div>
      <Link
        to={`/conversas/${conversation.id}`}
        className="contents"
        onClick={(e) => {
          if (isSelectionMode) {
            e.preventDefault();
            onSelect(conversation.id);
          }
        }}
      >
        <div className="flex justify-center">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className={cn("text-sm font-semibold", isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
              {getInitials(conversation.nome)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col pr-4 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="font-bold text-[15px] text-foreground truncate min-w-0">
                {conversation.nome || conversation.telefone}
              </span>
              {conversation.origem === 'marketing' ? (
                <span title="Marketing (Ads)"><Megaphone className="h-3 w-3 text-primary shrink-0" /></span>
              ) : (
                <span title="Orgânico"><Globe className="h-3 w-3 text-muted-foreground/60 shrink-0" /></span>
              )}
            </div>
            <span className={cn(
              "text-[11px] font-medium shrink-0",
              isActive ? "text-primary" : "text-muted-foreground/70"
            )}>
              {lastTime}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
            <div className="text-[13px] text-muted-foreground/90 truncate flex-1 min-w-0">
              <MessagePreview
                content={conversation.last_message_content}
                type={conversation.last_message_type}
                sender={conversation.last_message_sender}
              />
            </div>

            {conversation.tags?.length > 0 && (
              <div className="shrink-0 flex gap-0.5">
                {conversation.tags.slice(0, 2).map(tag => {
                  const isHex = tag.color?.startsWith('#');
                  const preset = TAG_COLORS.find(c => c.name === tag.color);
                  return (
                    <div
                      key={tag.id}
                      className={cn("w-2 h-2 rounded-full border border-black/5", !isHex && preset?.selector)}
                      style={isHex ? { backgroundColor: tag.color } : undefined}
                      title={tag.name}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export function ConversationsList() {
  const { data: conversations, isLoading } = useConversationsList();
  const { availableTags } = useTags();
  const { stages } = useStages();
  const { cadencias } = useCadencias();
  const { updateLead, deleteLead } = useLeads();
  const [searchTerm, setSearchTerm] = useState("");

  // Seleção
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Estado de Filtros
  const [filters, setFilters] = useState({
    origin: "all",
    tagId: "all",
    status: "all",
    dateRange: undefined as DateRange | undefined,
  });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.origin !== "all") count++;
    if (filters.tagId !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.dateRange?.from) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      origin: "all",
      tagId: "all",
      status: "all",
      dateRange: undefined,
    });
  };

  const filtered = useMemo(() => {
    if (!conversations) return [];

    return conversations.filter(c => {
      // Filtro de Busca
      const searchTermMatch =
        (c.nome && c.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.telefone.includes(searchTerm);

      if (!searchTermMatch) return false;

      // Filtro de Origem
      if (filters.origin !== "all" && c.origem !== filters.origin) return false;

      // Filtro de Etiquetas
      if (filters.tagId !== "all") {
        const hasTag = c.tags && c.tags.some(tag => tag.id === filters.tagId);
        if (!hasTag) return false;
      }

      // Filtro de Status
      if (filters.status !== "all" && c.status !== filters.status) return false;

      // Filtro de Data (Criação do Lead)
      if (filters.dateRange?.from) {
        const createdDate = parseISO(c.criado_em);
        const start = startOfDay(filters.dateRange.from);
        const end = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from);

        try {
          if (!isWithinInterval(createdDate, { start, end })) return false;
        } catch (e) {
          return false;
        }
      }

      return true;
    });
  }, [conversations, searchTerm, filters]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handleBulkStage = async (stagePos: number) => {
    try {
      const { error } = await supabase
        .from('leads' as any)
        .update({ posicao_pipeline: stagePos } as any)
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} leads movidos para a nova etapa.`);
      clearSelection();
    } catch (e: any) {
      toast.error('Erro ao mover leads: ' + e.message);
    }
  };

  const handleBulkTag = async (tagId: string) => {
    try {
      // Para cada lead, insere a tag (ignora se já tiver - upsert ou ignore se possível)
      const records = selectedIds.map(id => ({ lead_id: id, tag_id: tagId }));
      const { error } = await supabase.from('leads_tags' as any).upsert(records as any, { onConflict: 'lead_id,tag_id' });

      if (error) throw error;
      toast.success('Etiqueta adicionada aos leads selecionados.');
      clearSelection();
    } catch (e: any) {
      toast.error('Erro ao adicionar etiquetas: ' + e.message);
    }
  };

  const handleBulkCadence = async (cadenceId: string) => {
    try {
      // Enrola leads na cadência
      const records = selectedIds.map(id => ({
        lead_id: id,
        cadencia_id: cadenceId,
        status: 'ativo',
        passo_atual_ordem: 0,
        proxima_execucao: new Date().toISOString()
      }));

      const { error } = await supabase.from('lead_cadencias' as any).upsert(records as any, { onConflict: 'lead_id,cadencia_id' });

      if (error) throw error;
      toast.success('Leads matriculados na cadência com sucesso.');
      clearSelection();
    } catch (e: any) {
      toast.error('Erro ao matricular leads: ' + e.message);
    }
  };

  const handleBulkIA = async (active: boolean) => {
    try {
      const { error } = await supabase
        .from('leads' as any)
        .update({ ia_ativa: active } as any)
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`IA ${active ? 'ativada' : 'desativada'} para ${selectedIds.length} leads.`);
      clearSelection();
    } catch (e: any) {
      toast.error('Erro ao alterar status da IA: ' + e.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deseja realmente excluir ${selectedIds.length} leads? Esta ação não pode ser desfeita.`)) return;

    try {
      const { error } = await supabase.from('leads' as any).delete().in('id', selectedIds);
      if (error) throw error;
      toast.success('Leads excluídos com sucesso.');
      clearSelection();
    } catch (e: any) {
      toast.error('Erro ao excluir leads: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-r w-full overflow-hidden relative">
      {/* Barra de Ações em Massa */}
      {selectedIds.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-[#8c7355] text-white animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 h-8 w-8"
                onClick={() => setSelectedIds([])}
              >
                <X className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold">{selectedIds.length} selecionados</span>
            </div>
          </div>
          <div className="flex items-center justify-around p-2 pb-3">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center gap-1 hover:bg-white/10 p-1.5 rounded transition-colors group">
                  <GitBranch className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Etapa</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="center">
                <div className="flex flex-col gap-1">
                  {stages.sort((a, b) => a.posicao_ordem - b.posicao_ordem).map(stage => (
                    <Button
                      key={stage.id}
                      variant="ghost"
                      className="justify-start text-xs h-8"
                      onClick={() => handleBulkStage(stage.posicao_ordem)}
                    >
                      {stage.nome}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center gap-1 hover:bg-white/10 p-1.5 rounded transition-colors group">
                  <Tag className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Etiqueta</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="center">
                <div className="flex flex-col gap-1">
                  {availableTags.map(tag => (
                    <Button
                      key={tag.id}
                      variant="ghost"
                      className="justify-start text-xs h-8"
                      onClick={() => handleBulkTag(tag.id)}
                    >
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tag.color.startsWith('#') ? tag.color : undefined }} />
                      {tag.name}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center gap-1 hover:bg-white/10 p-1.5 rounded transition-colors group">
                  <Zap className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Cadência</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="center">
                <div className="flex flex-col gap-1">
                  {cadencias.map(cad => (
                    <Button
                      key={cad.id}
                      variant="ghost"
                      className="justify-start text-xs h-8 truncate"
                      onClick={() => handleBulkCadence(cad.id)}
                    >
                      {cad.nome}
                    </Button>
                  ))}
                  {cadencias.length === 0 && <p className="text-[10px] text-muted-foreground p-2">Nenhuma cadência disponível.</p>}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center gap-1 hover:bg-white/10 p-1.5 rounded transition-colors group">
                  <Bot className="h-4 w-4" />
                  <span className="text-[10px] font-bold">IA</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="center">
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" className="justify-start text-xs h-8 text-green-600" onClick={() => handleBulkIA(true)}>
                    Ativar IA
                  </Button>
                  <Button variant="ghost" className="justify-start text-xs h-8 text-red-600" onClick={() => handleBulkIA(false)}>
                    Desativar IA
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <button onClick={handleBulkDelete} className="flex flex-col items-center gap-1 hover:bg-white/10 p-1.5 rounded transition-colors group text-red-100 hover:text-red-200">
              <Trash2 className="h-4 w-4" />
              <span className="text-[10px] font-bold">Excluir</span>
            </button>
          </div>
        </div>
      )}

      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Conversas</h2>
            {!isLoading && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-primary/10 text-primary border-none">
                {filtered.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setIsLeadModalOpen(true)}
              title="Adicionar Lead"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 text-muted-foreground", isSelectionMode && "text-primary bg-primary/10")}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (!isSelectionMode) setSelectedIds([]);
              }}
              title="Seleção em massa"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-10 h-10 bg-muted/30 border-muted-foreground/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeFiltersCount > 0 ? "default" : "outline"}
                size="icon"
                className={cn("h-10 w-10 shrink-0", activeFiltersCount > 0 ? "bg-primary" : "")}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4" align="end">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-2">
                  <Globe className="h-3 w-3" /> Origem
                </Label>
                <Select
                  value={filters.origin}
                  onValueChange={(v) => setFilters(f => ({ ...f, origin: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as origens</SelectItem>
                    <SelectItem value="marketing">Marketing (Ads)</SelectItem>
                    <SelectItem value="organico">Orgânico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-2">
                  <Tag className="h-3 w-3" /> Etiquetas
                </Label>
                <Select
                  value={filters.tagId}
                  onValueChange={(v) => setFilters(f => ({ ...f, tagId: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as etiquetas</SelectItem>
                    {availableTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color.startsWith('#') ? tag.color : undefined }} />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" /> Status
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Convertido">Convertido</SelectItem>
                    <SelectItem value="Perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" /> Data de Cadastro
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 text-xs justify-start px-3 font-normal">
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          `${format(filters.dateRange.from, 'dd/MM')} - ${format(filters.dateRange.to, 'dd/MM')}`
                        ) : format(filters.dateRange.from, 'dd/MM/yy')
                      ) : "Selecionar período"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={filters.dateRange}
                      onSelect={(range) => setFilters(f => ({ ...f, dateRange: range }))}
                      initialFocus
                      locale={ptBR}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {activeFiltersCount > 0 && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-muted-foreground hover:text-destructive px-2"
              onClick={clearFilters}
            >
              Limpar Filtros ({activeFiltersCount})
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col min-w-0">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-b border-border/40">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex justify-between items-center"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-8" /></div>
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : filtered && filtered.length > 0 ? (
            filtered.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedIds.includes(conversation.id)}
                onSelect={toggleSelection}
                isSelectionMode={isSelectionMode}
              />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Search className="h-8 w-8 opacity-20" />
              <p>Nenhuma conversa encontrada com os filtros atuais.</p>
              {activeFiltersCount > 0 && (
                <Button variant="link" onClick={clearFilters} className="text-primary h-auto p-0">Limpar filtros</Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
      <LeadModal
        open={isLeadModalOpen}
        onOpenChange={setIsLeadModalOpen}
        mode="create"
      />
    </div>
  );
}