import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Filter, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLeads, Lead } from "@/hooks/useLeads";
import { useStages } from "@/hooks/useStages";
import { LeadModal } from "@/components/leads/LeadModal";
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
import { format, parseISO } from "date-fns";
import { useLeadSources } from "@/hooks/useLeadSources";
import { useTags } from "@/hooks/useTags";

const getStatusColor = (status: string) => {
  switch (status) {
    case "Ativo":
      return "bg-success text-success-foreground";
    case "Inativo":
      return "bg-muted text-muted-foreground";
    case "Convertido":
      return "bg-info text-info-foreground";
    case "Perdido":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const ITEMS_PER_PAGE = 50;

export default function Leads() {
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);

  const { leads, isLoading: leadsLoading, deleteLead } = useLeads();
  const { stages, isLoading: stagesLoading } = useStages();
  const { allSources } = useLeadSources();
  const { availableTags } = useTags();

  const isLoading = leadsLoading || stagesLoading;

  const [filters, setFilters] = useState({
    searchTerm: "",
    status: "Todos",
    posicao_pipeline: "Todos",
    origem: "Todos", // Isso aqui agora filtra o TIPO (Marketing/Organico)
    fonte: "",       // Novo filtro para a FONTE
    genero: "Todos",
    criativo: "",
    idade: "",
    cadastroMes: "",
    tagId: "Todos",
    procedimento: "",
  });

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // Reseta a página para 1 quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const getStageByPosition = (position: number) => {
    return stages.find(s => s.posicao_ordem === position);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const searchTermMatch =
        (lead.nome && lead.nome.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        lead.telefone.includes(filters.searchTerm);

      const statusMatch = filters.status === "Todos" || lead.status === filters.status;
      const etapaMatch = filters.posicao_pipeline === "Todos" || lead.posicao_pipeline.toString() === filters.posicao_pipeline;

      // Filtros de Origem
      const origemMatch = filters.origem === "Todos" || lead.origem === filters.origem;
      const fonteMatch = !filters.fonte || (lead.fonte && lead.fonte.toLowerCase().includes(filters.fonte.toLowerCase()));

      const generoMatch = filters.genero === "Todos" || lead.genero === filters.genero;
      const criativoMatch = !filters.criativo || (lead.criativo_id && lead.criativo_id.toLowerCase().includes(filters.criativo.toLowerCase()));
      const idadeMatch = !filters.idade || (lead.idade?.toString() === filters.idade);
      const cadastroMesMatch = !filters.cadastroMes || (lead.criado_em && lead.criado_em.startsWith(filters.cadastroMes));

      const procedimentoMatch = !filters.procedimento ||
        (lead.procedimento_interesse && lead.procedimento_interesse.toLowerCase().includes(filters.procedimento.toLowerCase()));

      const tagMatch = filters.tagId === "Todos" ||
        (lead.leads_tags && lead.leads_tags.some(lt => lt.tags && lt.tags.id === filters.tagId));

      return searchTermMatch && statusMatch && etapaMatch && origemMatch && fonteMatch && generoMatch && criativoMatch && idadeMatch && cadastroMesMatch && tagMatch && procedimentoMatch;
    });
  }, [leads, filters]);

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedLead(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleting(true);
  };

  const confirmDelete = () => {
    if (selectedLead) {
      deleteLead(selectedLead.id);
    }
    setIsDeleting(false);
    setSelectedLead(null);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

    if (diff < 1) return 'agora';
    if (diff < 60) return `há ${diff} min`;
    if (diff < 1440) return `há ${Math.floor(diff / 60)}h`;
    return `há ${Math.floor(diff / 1440)} dias`;
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return '-';
    try {
      const date = parseISO(timestamp);
      return format(date, 'dd/MM/yyyy');
    } catch (e) {
      return '-';
    }
  };

  const handleModalOpenChange = useCallback((open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedLead(null);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Leads</h1>
          <p className="text-muted-foreground mt-1">Total: {leads.length} leads</p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                className="pl-10"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Convertido">Convertido</SelectItem>
                    <SelectItem value="Perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa do Funil</Label>
                <Select value={filters.posicao_pipeline} onValueChange={(v) => handleFilterChange('posicao_pipeline', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas</SelectItem>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.posicao_ordem.toString()}>{stage.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Origem (Tipo)</Label>
                <Select value={filters.origem} onValueChange={(v) => handleFilterChange('origem', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="organico">Orgânico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fonte (Detalhe)</Label>
                <Input value={filters.fonte} onChange={(e) => handleFilterChange('fonte', e.target.value)} placeholder="Ex: Facebook" />
              </div>
              <div>
                <Label>Curso de Interesse</Label>
                <Input
                  placeholder="Ex: Botox"
                  value={filters.procedimento}
                  onChange={(e) => handleFilterChange('procedimento', e.target.value)}
                />
              </div>
              <div>
                <Label>Gênero</Label>
                <Select value={filters.genero} onValueChange={(v) => handleFilterChange('genero', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mês de Cadastro</Label>
                <Input
                  type="month"
                  value={filters.cadastroMes}
                  onChange={(e) => handleFilterChange('cadastroMes', e.target.value)}
                />
              </div>
              <div>
                <Label>Etiqueta</Label>
                <Select value={filters.tagId} onValueChange={(v) => handleFilterChange('tagId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas as Etiquetas</SelectItem>
                    {availableTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Checkbox /></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                {/* Removido Idade/Gênero */}
                <TableHead>Origem</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Curso de Interesse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead>Último Contato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <p className="text-muted-foreground">Nenhum lead encontrado com os filtros aplicados</p>
                  </TableCell>
                </TableRow>
              ) : (
                currentLeads.map((lead) => {
                  const stage = getStageByPosition(lead.posicao_pipeline);
                  return (
                    <TableRow key={lead.id} className="hover:bg-muted/50">
                      <TableCell><Checkbox /></TableCell>
                      <TableCell><p className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => handleEdit(lead)}>{lead.nome}</p></TableCell>
                      <TableCell><p className="text-sm text-muted-foreground">{lead.telefone}</p></TableCell>

                      {/* Novas colunas */}
                      <TableCell>
                        <Badge variant="outline" className={lead.origem === 'marketing' ? 'border-primary text-primary' : ''}>
                          {lead.origem === 'marketing' ? 'Marketing' : 'Orgânico'}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{lead.fonte || '-'}</span></TableCell>

                      <TableCell><span className="text-sm font-medium text-primary">{lead.procedimento_interesse || '-'}</span></TableCell>
                      <TableCell><Badge className={getStatusColor(lead.status)}>{lead.status}</Badge></TableCell>
                      <TableCell>{stage && <Badge style={{ backgroundColor: stage.cor, color: 'white' }}>{stage.nome}</Badge>}</TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{formatDate(lead.criado_em)}</span></TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{formatTime(lead.ultimo_contato)}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(lead)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRequest(lead)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Controls */}
        {filteredLeads.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredLeads.length)} de {filteredLeads.length} leads
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <LeadModal open={isModalOpen} onOpenChange={handleModalOpenChange} lead={selectedLead} mode={modalMode} />

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o lead "{selectedLead?.nome}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Sim, excluir lead</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}