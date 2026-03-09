import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Clock,
  Send,
  TrendingUp,
  MessageSquare,
  Radio,
  Calendar as CalendarIcon,
  Save,
  Upload,
  X,
  Video,
  Image as ImageIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { AudienceSegmentation } from "@/components/campaigns/AudienceSegmentation";
import { CampaignDetailsModal } from "@/components/campaigns/CampaignDetailsModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";

const availableVariables = [
  "primeiro_nome",
  "nome_lead",
  "telefone",
  "email",
  "origem",
  "data_ultimo_contato",
  "idade",
  "genero",
  "nome_escritorio",
  "dias_sem_contato",
];

export default function Campaigns() {
  const today = new Date();
  const initialDateRange: DateRange = { from: startOfMonth(today), to: endOfMonth(today) };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);

  const { campaigns, isLoading, createCampaign, deleteCampaign } = useCampaigns(dateRange);
  const { templates } = useMessageTemplates();
  const [activeTab, setActiveTab] = useState("active");
  const [isCreating, setIsCreating] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [step, setStep] = useState(1);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    nome: '',
    descricao: '',
    template_mensagem: '',
    status: 'draft',
    segmento_config: { type: 'all', predefined: [], advanced: {} },
    targeted_lead_ids: [],
    media_url: null,
  });
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Tipo de arquivo não suportado.", { description: "Por favor, envie imagens (JPG, PNG) ou vídeos (MP4)." });
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error("Arquivo muito grande.", { description: "O tamanho máximo permitido é 50MB." });
      return;
    }

    setFile(selectedFile);
    setUploading(true);

    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { data: { user } } = await supabase.auth.getUser();
    const filePath = user ? `${user.id}/${fileName}` : fileName;

    try {
      const { error: uploadError } = await supabase.storage
        .from('campaign-media')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setNewCampaign(prev => ({ ...prev, media_url: filePath }));
      toast.success("Mídia anexada com sucesso!");

    } catch (error: any) {
      toast.error("Falha no upload da mídia.", { description: error.message });
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = () => {
    setFile(null);
    setNewCampaign(prev => ({ ...prev, media_url: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateCampaign = () => {
    const campaignData: Partial<Campaign> = {
      ...newCampaign,
      contagem_destinatarios: newCampaign.targeted_lead_ids?.length || 0
    };

    if (campaignData.status === 'scheduled') {
      if (!scheduleDate) {
        toast.error("Por favor, selecione uma data para o agendamento.", { closeButton: true });
        return;
      }
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const combinedDate = new Date(scheduleDate);
      combinedDate.setHours(hours, minutes, 0, 0);

      if (combinedDate < new Date()) {
        toast.error("Não é possível agendar para uma data ou hora no passado.", { closeButton: true });
        return;
      }

      campaignData.data_agendamento = combinedDate.toISOString();
    }

    createCampaign(campaignData as any, {
      onSuccess: (createdCampaign) => {
        if (createdCampaign.status === 'active') {
          toast.info('Campanha ativada. O envio para os alunos foi iniciado em segundo plano.', { closeButton: true });

          supabase.functions.invoke('trigger-campaign', {
            body: { campaignId: createdCampaign.id },
          }).then(({ error }) => {
            if (error) {
              toast.error(`Ocorreu um erro ao processar a campanha: ${error.message}`, { closeButton: true });
            }
          });
        }

        setIsCreating(false);
        setStep(1);
        setNewCampaign({
          nome: '',
          descricao: '',
          template_mensagem: '',
          status: 'draft',
          segmento_config: { type: 'all', predefined: [], advanced: {} },
          targeted_lead_ids: [],
          media_url: null,
        });
        setFile(null);
        setScheduleDate(undefined);
        setScheduleTime('09:00');
      }
    });
  };

  const handleView = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsViewing(true);
  };

  const handleDeleteRequest = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsDeleting(true);
  };

  const confirmDelete = () => {
    if (selectedCampaign) {
      deleteCampaign(selectedCampaign.id);
    }
    setIsDeleting(false);
    setSelectedCampaign(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      active: { label: "Ativa", className: "bg-emerald-100 text-emerald-700" },
      scheduled: { label: "Agendada", className: "bg-blue-100 text-blue-700" },
      completed: { label: "Concluída", className: "bg-gray-100 text-gray-700" },
      draft: { label: "Rascunho", className: "bg-amber-100 text-amber-700" },
      paused: { label: "Pausada", className: "bg-red-100 text-red-700" }
    };
    return variants[status] || variants.draft;
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === "active") return c.status === "active";
    if (activeTab === "scheduled") return c.status === "scheduled";
    if (activeTab === "completed") return c.status === "completed";
    if (activeTab === "drafts") return c.status === "draft";
    return true;
  });

  if (isLoading) {
    return <div>Carregando campanhas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campanhas</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas campanhas de WhatsApp</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Campanha</DialogTitle>
                <DialogDescription>
                  Passo {step} de 3 - {step === 1 ? "Configuração e Público" : step === 2 ? "Mensagem" : "Agendamento e Envio"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="campaign-name">Nome da Campanha *</Label>
                      <Input id="campaign-name" placeholder="Ex: Retorno Semestral - Junho/2025" className="mt-1.5" value={newCampaign.nome} onChange={e => setNewCampaign({ ...newCampaign, nome: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="campaign-desc">Descrição</Label>
                      <Textarea id="campaign-desc" placeholder="Descreva o objetivo desta campanha" className="mt-1.5" value={newCampaign.descricao} onChange={e => setNewCampaign({ ...newCampaign, descricao: e.target.value })} maxLength={200} />
                    </div>
                    <Label>Segmentação de Público</Label>
                    <AudienceSegmentation
                      onConfigChange={(config) => setNewCampaign(prev => ({ ...prev, segmento_config: config }))}
                      onSelectionChange={(selectedIds) => setNewCampaign(prev => ({ ...prev, targeted_lead_ids: selectedIds }))}
                      initialSelectedIds={newCampaign.targeted_lead_ids}
                    />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mídia (Opcional)</Label>
                      {!file && !newCampaign.media_url ? (
                        <>
                          <div
                            className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">Clique para enviar imagem ou vídeo</p>
                            <p className="text-xs text-muted-foreground">JPG (preferencial), PNG ou MP4 (máx 50MB)</p>
                          </div>
                          <Input
                            ref={fileInputRef}
                            id="campaign-media"
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e.target.files ? e.target.files[0] : null)}
                            accept="image/jpeg, image/png, video/mp4"
                          />
                        </>
                      ) : (
                        <div className="relative w-full p-2 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {file?.type.startsWith('image/') ? <ImageIcon className="h-8 w-8 text-muted-foreground" /> : <Video className="h-8 w-8 text-muted-foreground" />}
                            <div className="flex-1">
                              <p className="text-sm font-medium truncate">{file?.name}</p>
                              <p className="text-xs text-muted-foreground">{file && `${(file.size / 1024 / 1024).toFixed(2)} MB`}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRemoveMedia}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {uploading && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/20 rounded-b-lg"><div className="h-1 bg-primary animate-pulse rounded-b-lg"></div></div>}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="mb-2 block">Templates Prontos</Label>
                      <Select onValueChange={value => setNewCampaign({ ...newCampaign, template_mensagem: templates.find(t => t.id === value)?.conteudo || '' })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template ou crie personalizado" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(template => (
                            <SelectItem key={template.id} value={template.id}>{template.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="message">Mensagem da Campanha (Legenda) *</Label>
                      <Textarea
                        id="message"
                        placeholder="Digite sua mensagem aqui. Use variáveis como {{nome_lead}}..."
                        className="mt-1.5 min-h-[150px]"
                        value={newCampaign.template_mensagem}
                        onChange={e => setNewCampaign({ ...newCampaign, template_mensagem: e.target.value })}
                        maxLength={1024}
                      />
                      <div className="text-xs text-muted-foreground mt-1">{newCampaign.template_mensagem?.length || 0}/1024</div>
                    </div>
                    <div>
                      <Label>Variáveis Dinâmicas</Label>
                      <Select onValueChange={value => setNewCampaign({ ...newCampaign, template_mensagem: (newCampaign.template_mensagem || '') + `{{${value}}}` })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Inserir variável" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVariables.map(v => <SelectItem key={v} value={v}>{`{{${v}}}`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <RadioGroup
                      value={newCampaign.status}
                      onValueChange={value => setNewCampaign({ ...newCampaign, status: value })}
                    >
                      <Label className="font-semibold">Quando enviar?</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <RadioGroupItem value="active" id="now" />
                        <Label htmlFor="now" className="font-normal flex items-center gap-2"><Send className="h-4 w-4" /> Enviar imediatamente</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="scheduled" id="schedule" />
                        <Label htmlFor="schedule" className="font-normal flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Agendar para data/hora</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="draft" id="draft" />
                        <Label htmlFor="draft" className="font-normal flex items-center gap-2"><Save className="h-4 w-4" /> Salvar como rascunho</Label>
                      </div>
                    </RadioGroup>

                    {newCampaign.status === 'scheduled' && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t animate-fade-in">
                        <div>
                          <Label>Data de Envio</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start font-normal mt-1.5">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduleDate ? format(scheduleDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={scheduleDate}
                                onSelect={setScheduleDate}
                                disabled={(date) => date < startOfDay(new Date())}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>Horário de Envio</Label>
                          <Input
                            type="time"
                            className="mt-1.5"
                            value={scheduleTime}
                            onChange={e => setScheduleTime(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Math.max(1, step - 1))}
                    disabled={step === 1}
                  >
                    Voltar
                  </Button>
                  {step < 3 ? (
                    <Button onClick={() => setStep(step + 1)} className="bg-primary hover:bg-primary/90">
                      Próximo
                    </Button>
                  ) : (
                    <Button onClick={handleCreateCampaign} className="bg-primary hover:bg-primary/90">
                      <Send className="h-4 w-4 mr-2" />
                      Confirmar e Criar
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar campanhas..." className="pl-10" />
            </div>
            <Tabs value="automations" disabled>
              <TabsList><TabsTrigger value="automations">Automações Ativas</TabsTrigger></TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="active">Ativas</TabsTrigger>
          <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
          <TabsTrigger value="drafts">Rascunhos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma campanha encontrada nesta categoria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCampaigns.map((campaign) => {
                const statusBadge = getStatusBadge(campaign.status);
                return (
                  <Card key={campaign.id} className="hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                          </div>
                          <CardTitle className="text-lg">{campaign.nome}</CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {campaign.status === 'scheduled' && campaign.data_agendamento
                              ? `Agendada para ${format(new Date(campaign.data_agendamento), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}`
                              : `Criada em ${new Date(campaign.criado_em).toLocaleDateString('pt-BR')}`
                            }
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-muted/50 p-3 rounded-lg border">
                        <p className="text-sm text-muted-foreground italic line-clamp-2">{campaign.template_mensagem}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Enviadas</p>
                          <p className="text-lg font-semibold flex items-center justify-center gap-1">{campaign.contagem_enviados || 0} <TrendingUp className="h-4 w-4 text-emerald-500" /></p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Visualizadas</p>
                          <p className="text-lg font-semibold text-blue-600">{campaign.contagem_visualizados || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Responderam</p>
                          <p className="text-lg font-semibold text-amber-600">{campaign.contagem_respostas || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Converteram</p>
                          <p className="text-lg font-semibold text-emerald-600">{campaign.contagem_conversoes || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 justify-between border-t pt-4">
                      <Button variant="outline" size="sm" onClick={() => handleView(campaign)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRequest(campaign)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CampaignDetailsModal
        campaign={selectedCampaign}
        open={isViewing}
        onOpenChange={setIsViewing}
      />

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a campanha "{selectedCampaign?.nome}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Sim, excluir campanha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}