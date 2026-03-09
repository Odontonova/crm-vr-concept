"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { Send, Smile, AlertTriangle, CheckCircle, Phone, User, Users, Bot, ChevronDown, Trash2, Mic, Zap, MoreVertical, ChevronLeft, Sparkles, Megaphone, Globe, FileText, Image as ImageIcon, ExternalLink, BarChart3, Target, Pencil, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLead, useLeads } from "@/hooks/useLeads";
import { useMessages, useSendMessage, Message, Attachment, useDeleteMessage, useSendAudioMessage, useSendAttachments } from "@/hooks/useConversations";
import { useNotifications, useUpdateNotificationStatus } from "@/hooks/useNotifications";
import { useStages } from "@/hooks/useStages";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import EmojiPicker from 'emoji-picker-react';
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AudioMessage } from "./AudioMessage";
import { MediaMessage } from "./MediaMessage";
import { FileMessage } from "./FileMessage";
import { NotificationMessage } from "./NotificationMessage";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiLockControl } from "./AiLockControl";
import { LeadCadenceControl } from "./LeadCadenceControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TagManager } from "@/components/tags/TagManager";
import { AudioRecorder } from "./AudioRecorder";
import { useNavigate } from "react-router-dom";
import { useMarketing, Criativo } from "@/hooks/useMarketing";
import { Badge } from "@/components/ui/badge";
import { LeadModal } from "@/components/leads/LeadModal";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";

// --- COMPONENTES AUXILIARES ---

const DateSeparator = ({ dateString }: { dateString: string }) => {
  const date = parseISO(dateString);
  let displayDate: string;

  if (isToday(date)) displayDate = 'Hoje';
  else if (isYesterday(date)) displayDate = 'Ontem';
  else if (date.getTime() > new Date().getTime() - 7 * 24 * 60 * 60 * 1000) displayDate = format(date, 'EEEE', { locale: ptBR });
  else displayDate = format(date, 'dd/MM/yyyy', { locale: ptBR });

  return (
    <div className="flex justify-center my-4 sticky top-0 z-10">
      <div className="bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground shadow-sm uppercase">{displayDate}</div>
    </div>
  );
};

const AttachmentRenderer = ({ attachment, isOutgoing }: { attachment: Attachment; isOutgoing: boolean }) => {
  const type = attachment.file_type?.toLowerCase() || 'arquivo';
  const path = attachment.file_path;

  if (type.includes('audio') || type.includes('áudio')) return <AudioMessage filePath={path} variant={isOutgoing ? 'outgoing' : 'incoming'} />;

  if (type.includes('imagem') || type.includes('image') || type.includes('foto') || type.includes('video')) {
    const mediaType = type.includes('video') ? 'video' : 'imagem';
    return <MediaMessage path={path} type={mediaType} />;
  }

  if (type.includes('pdf') || type.includes('document') || type.includes('application')) {
    return <FileMessage path={path} fileName="Documento PDF" />;
  }

  return <div className="p-2 bg-muted/20 border rounded text-xs text-muted-foreground mb-1 break-all">Anexo: {path}</div>;
};

const LegacyAttachmentRenderer = ({ content, isOutgoing }: { content: string; isOutgoing: boolean }) => {
  const attachmentBlockIndex = content.toLowerCase().indexOf('attachments:');
  if (attachmentBlockIndex === -1) return null;

  const attachmentBlock = content.substring(attachmentBlockIndex);
  const attachmentLines = attachmentBlock.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.substring(1).trim());

  return (
    <div className="flex flex-col gap-2 mb-1">
      {attachmentLines.map((line, index) => {
        const pathMatch = line.match(/^(.*?)\s+\(/);
        const typeMatch = line.match(/\((.*?)\)/);
        if (!pathMatch || !typeMatch) return null;

        const path = pathMatch[1].trim();
        const type = typeMatch[1].trim();
        const attachment = { id: `legacy-${index}`, message_id: 'legacy', file_path: path, file_type: type as any } as Attachment;
        return <AttachmentRenderer key={attachment.id} attachment={attachment} isOutgoing={isOutgoing} />;
      })}
    </div>
  );
};

const groupMessagesByDay = (messages: Message[]) => {
  const grouped: (Message | { type: 'separator', date: string })[] = [];
  let lastDate = '';

  messages.forEach(msg => {
    const currentDate = format(parseISO(msg.criado_em), 'yyyy-MM-dd');
    if (currentDate !== lastDate) {
      grouped.push({ type: 'separator', date: msg.criado_em });
      lastDate = currentDate;
    }
    grouped.push(msg);
  });

  return grouped;
};

const CreativeMiniCard = ({ criativo }: { criativo: Criativo }) => {
  const metrics = criativo.platform_metrics;
  const stats = criativo.stats || { contagem_leads: 0, contagem_vendas: 0, faturamento: 0 };

  const creativeName = criativo.nome || criativo.titulo || '';
  const redirectUrl = `/marketing?tab=creatives&search=${encodeURIComponent(creativeName)}`;

  return (
    <div className="w-72 p-4 overflow-hidden rounded-xl border border-border shadow-xl bg-card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-sm leading-tight text-foreground truncate">{criativo.nome || criativo.titulo || 'Criativo sem nome'}</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">Desempenho Marketing</p>
        </div>
        <Badge className="bg-black/60 text-white border-none text-[9px] h-4 shrink-0">
          {criativo.aplicativo || 'ADS'}
        </Badge>
      </div>

      {metrics && metrics.spend > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50/50 p-2 rounded border border-blue-100/50 text-center">
            <span className="text-[9px] text-blue-600 block font-bold uppercase">Investimento</span>
            <span className="text-xs font-bold">R$ {metrics.spend.toFixed(2)}</span>
          </div>
          <div className="bg-blue-50/50 p-2 rounded border border-blue-100/50 text-center">
            <span className="text-[9px] text-blue-600 block font-bold uppercase">CTR</span>
            <span className="text-xs font-bold">{metrics.ctr.toFixed(2)}%</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-primary/5 p-2 rounded border border-primary/10 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] text-primary font-bold uppercase">
            <Users className="h-2.5 w-2.5" /> Leads
          </div>
          <span className="text-sm font-bold">{stats.contagem_leads}</span>
        </div>
        <div className="bg-green-50 p-2 rounded border border-green-100 text-center">
          <div className="flex items-center justify-center gap-1 text-[9px] text-green-700 font-bold uppercase">
            <Target className="h-2.5 w-2.5" /> Vendas
          </div>
          <span className="text-sm font-bold">{stats.contagem_vendas}</span>
        </div>
      </div>

      {criativo.conteudo && (
        <div className="bg-muted/20 p-2 rounded text-[11px] text-muted-foreground line-clamp-3 leading-relaxed italic border border-dashed">
          "{criativo.conteudo}"
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full h-8 text-[10px] gap-1.5" asChild>
        <a href={redirectUrl}>
          Ver detalhes no Marketing <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

interface ActiveConversationProps {
  leadId: string;
  isSidebarOpen?: boolean;
  onOpenSidebar?: (tab: 'mensagens' | 'agente') => void;
  onCloseSidebar?: () => void;
}

export function ActiveConversation({ leadId, isSidebarOpen, onOpenSidebar, onCloseSidebar }: ActiveConversationProps) {
  const navigate = useNavigate();
  const { data: lead, isLoading: leadLoading } = useLead(leadId);
  const { data: messages, isLoading: messagesLoading } = useMessages(leadId);
  const { data: notifications } = useNotifications(leadId);
  const { stages, isLoading: stagesLoading } = useStages();
  const { mutate: sendMessage } = useSendMessage();
  const { mutate: sendAudio, isPending: isSendingAudio } = useSendAudioMessage();
  const { mutate: sendAttachments, isPending: isSendingAttachments } = useSendAttachments();
  const { mutate: updateNotification } = useUpdateNotificationStatus(leadId);
  const { updateLead } = useLeads();
  const { mutate: deleteMessage } = useDeleteMessage();
  const { criativos } = useMarketing();

  const [messageContent, setMessageContent] = useState("");
  const [isAiActive, setIsAiActive] = useState(true);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const creative = useMemo(() => {
    if (!lead?.criativo_id || !criativos) return null;
    return criativos.find(c => c.id === lead.criativo_id) || null;
  }, [lead?.criativo_id, criativos]);

  const processedMessages = useMemo(() => {
    if (!messages) return [];

    const res: Message[] = [];
    const seenIds = new Set<string>();

    const sorted = [...messages].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i];
      if (seenIds.has(msg.id)) continue;

      if (msg.tipo_conteudo === 'audio') {
        const lastMsg = res[res.length - 1];
        if (lastMsg && lastMsg.tipo_conteudo === 'audio' && lastMsg.remetente === msg.remetente) {
          const t1 = new Date(lastMsg.criado_em).getTime();
          const t2 = new Date(msg.criado_em).getTime();
          if (Math.abs(t2 - t1) < 20000) {
            const isLastTemp = lastMsg.id.startsWith('temp-');
            const isCurrTemp = msg.id.startsWith('temp-');
            if (isLastTemp && !isCurrTemp) {
              res.pop();
              seenIds.delete(lastMsg.id);
              res.push(msg);
              seenIds.add(msg.id);
              continue;
            }
            if (!isLastTemp && isCurrTemp) continue;
            continue;
          }
        }
      }
      seenIds.add(msg.id);
      res.push(msg);
    }
    return res;
  }, [messages]);

  const groupedMessages = processedMessages.length > 0 ? groupMessagesByDay(processedMessages) : [];

  useEffect(() => {
    if (lead) setIsAiActive(lead.ia_ativa ?? true);
  }, [lead]);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [processedMessages, isRecordingMode]);

  const handleAiToggle = async (checked: boolean) => {
    if (!lead) return;
    setIsAiActive(checked);
    updateLead(
      { id: lead.id, ia_ativa: checked },
      {
        onSuccess: () => toast.success(`IA ${checked ? 'ativada' : 'desativada'} com sucesso.`),
        onError: () => {
          toast.error('Erro ao atualizar o status da IA.');
          setIsAiActive(!checked);
        },
      }
    );
    try {
      await fetch('https://webhook.orbevision.shop/webhook/ativar-desativar-chat-vrconcept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: checked ? 'ativar' : 'desativar',
          lead_id: lead.id,
          telefone: lead.telefone,
        }),
      });
    } catch (error) {
      console.error('Erro ao enviar webhook de ativação/desativação da IA:', error);
    }
  };

  const handleStageChange = (newPosition: string) => {
    if (!lead) return;
    const stagePosition = parseInt(newPosition, 10);
    updateLead({ id: lead.id, posicao_pipeline: stagePosition });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim()) {
      sendMessage({ leadId, content: messageContent.trim() });
      setMessageContent("");
    }
  };

  const handleSendAudio = (blob: Blob) => {
    setIsRecordingMode(false);
    sendAudio({ leadId, audioBlob: blob });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setPendingFiles(selectedFiles);
    }
    e.target.value = ""; // Clear input for next selection
  };

  const handleSendAttachments = (attachments: { file: File; caption: string }[]) => {
    sendAttachments({ leadId, files: attachments }, {
      onSuccess: () => setPendingFiles([])
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'L';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isLoading = leadLoading || stagesLoading;
  const currentStage = stages.find(s => s.posicao_ordem === lead?.posicao_pipeline);

  if (isLoading) return <Skeleton className="h-full w-full" />;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header Responsivo */}
      <header className="flex flex-col border-b bg-card shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center justify-between p-2 sm:p-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => navigate('/conversas')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div
              className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity group/lead"
              onClick={() => setIsEditModalOpen(true)}
              title="Editar dados do lead"
            >
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border bg-muted flex-shrink-0 group-hover/lead:border-primary/50 transition-colors">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs sm:text-sm font-medium">{getInitials(lead?.nome)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <p className="font-semibold truncate text-sm sm:text-base leading-tight group-hover/lead:text-primary transition-colors flex items-center gap-1.5">
                  {lead?.nome || 'Lead'}
                  <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/lead:opacity-100 text-primary transition-opacity" />
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 overflow-hidden flex-wrap">
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 shrink-0 font-medium">
                    <Phone className="h-2.5 w-2.5" />
                    {lead?.telefone}
                  </span>

                  {lead?.origem && (
                    <Badge variant="outline" className={cn(
                      "h-4 text-[8px] sm:text-[9px] px-1.5 uppercase font-bold shrink-0 gap-1",
                      lead.origem === 'marketing' ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                    )}>
                      {lead.origem === 'marketing' ? <Megaphone className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                      {lead.origem}
                    </Badge>
                  )}

                  {creative && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="h-4 text-[8px] sm:text-[9px] px-1.5 font-semibold bg-blue-50 text-blue-700 border-blue-100 shrink-0 max-w-[150px] truncate gap-1 cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ImageIcon className="h-2.5 w-2.5" />
                          {creative.nome || creative.titulo}
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 border-none rounded-xl" side="bottom" align="start">
                        <CreativeMiniCard criativo={creative} />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden sm:block">
              {lead && <LeadCadenceControl lead={lead} />}
            </div>

            <div className="hidden sm:block">
              {lead && <AiLockControl lead={lead} />}
            </div>

            {/* BOTÃO FOLLOW-UP IA */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 sm:gap-2 bg-[#C5A47E]/10 text-[#8c7355] border-[#C5A47E]/30 hover:bg-[#C5A47E]/20 hover:text-[#8c7355] font-bold px-2 sm:px-3 rounded-full shadow-sm transition-all"
              onClick={() => onOpenSidebar?.('agente')}
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 w-4" />
              <span className="hidden sm:inline text-xs">Follow-up IA</span>
            </Button>

            {/* BOTÃO RESUMO IA */}
            <Popover open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 sm:gap-2 bg-amber-50/50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800 font-bold px-2 sm:px-3 rounded-full shadow-sm transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Resumo IA</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b bg-amber-50/50 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-sm text-amber-800">Resumo do Atendimento</h4>
                </div>
                <div className="p-4 text-xs text-muted-foreground max-h-[350px] overflow-y-auto custom-scrollbar prose prose-sm prose-amber max-w-none">
                  {lead?.resumo ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-amber-900" {...props} />,
                      }}
                    >
                      {lead.resumo.replace(/\\n/g, '\n')}
                    </ReactMarkdown>
                  ) : (
                    <span className="italic">Nenhum resumo gerado ainda.</span>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1.5 sm:gap-2 px-1 py-1 bg-muted/20 rounded-full border border-border/40 ml-1">
              <Switch id="ai-toggle" checked={isAiActive} onCheckedChange={handleAiToggle} disabled={!lead} className="scale-75 sm:scale-90" />
              {onOpenSidebar && (
                <Button
                  variant={isSidebarOpen ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "h-7 w-7 sm:h-8 sm:w-8 transition-all rounded-full",
                    isSidebarOpen ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => isSidebarOpen ? onCloseSidebar?.() : onOpenSidebar('mensagens')}
                >
                  <Zap className="h-3.5 w-3.5 sm:h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-3 pb-2 gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 flex-shrink-0">
            {lead && stages.length > 0 && (
              <Select value={lead.posicao_pipeline?.toString() || "1"} onValueChange={handleStageChange}>
                <SelectTrigger className="w-[120px] sm:w-[160px] h-7 text-[10px] sm:text-xs bg-background/50">
                  <SelectValue placeholder="Etapa">
                    {currentStage ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentStage.cor }} />
                        <span className="truncate">{currentStage.nome}</span>
                      </div>
                    ) : "Etapa"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.posicao_ordem.toString()}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.cor }} />
                        {stage.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex-1 flex justify-end min-w-0 overflow-hidden">
            {lead && <div className="scale-90 origin-right"><TagManager leadId={lead.id} /></div>}
          </div>

          <div className="sm:hidden flex gap-2 items-center">
            {lead && <LeadCadenceControl lead={lead} />}
            {lead && <AiLockControl lead={lead} />}
          </div>
        </div>
      </header>

      {notifications && notifications.length > 0 && (
        <div className="p-2 bg-amber-100 border-b border-amber-200 flex-shrink-0">
          {notifications.map(notif => (
            <div key={notif.id} className="flex items-start justify-between gap-2 text-amber-800 text-xs">
              <div className="flex items-start gap-1.5 flex-1"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /><NotificationMessage message={notif.mensagem} /></div>
              <Button size="sm" variant="ghost" className="text-amber-800 hover:bg-amber-200 h-6 text-[10px] px-1" onClick={() => updateNotification(notif.id)}><CheckCircle className="h-3 w-3 mr-1" /> Resolver</Button>
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 bg-muted/10">
        <div className="p-3 sm:p-4 space-y-2 max-w-4xl 2xl:max-w-5xl mx-auto min-h-full">
          {messagesLoading ? <p className="text-center text-muted-foreground text-xs py-4">Carregando...</p> : (
            groupedMessages.map((item, index) => {
              if ('type' in item && (item as any).type === 'separator') return <DateSeparator key={`sep-${index}`} dateString={(item as any).date} />;

              const msg = item as Message;
              const isOutgoing = msg.remetente === 'agente' || msg.remetente === 'bot' || msg.remetente === 'agente_crm';
              const isAi = msg.remetente === 'bot' || msg.remetente === 'agente_crm';

              const hasNewAttachments = msg.message_attachments && msg.message_attachments.length > 0;
              const legacyAttachmentIndex = msg.conteudo?.toLowerCase().indexOf('attachments:');
              const hasLegacyAttachments = !hasNewAttachments && legacyAttachmentIndex !== -1;

              let caption = msg.conteudo || '';
              if (hasLegacyAttachments) {
                caption = msg.conteudo.substring(0, legacyAttachmentIndex).trim();
              }

              const audioPath = msg.media_path || msg.conteudo;

              return (
                <div key={msg.id} className={cn("group relative flex flex-col gap-0.5 py-0.5", isOutgoing ? "items-end" : "items-start")}>
                  <div className={cn("flex items-end gap-2 max-w-[90%] sm:max-w-[85%]", isOutgoing ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className="h-8 w-8 flex-shrink-0 border shadow-sm">
                      {isOutgoing ? (
                        <AvatarFallback className={cn(isAi ? "bg-primary/20 text-primary" : "bg-amber-100 text-amber-700")}>
                          {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      ) : (
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                          {getInitials(lead?.nome)}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className={cn(
                      "p-2 sm:p-3 rounded-2xl relative shadow-sm transition-all min-w-[100px]",
                      isOutgoing ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border border-border/40 rounded-bl-none"
                    )}>
                      <div className="mb-1 space-y-1">
                        {hasNewAttachments && msg.message_attachments!.map(att => <AttachmentRenderer key={att.id} attachment={att} isOutgoing={isOutgoing} />)}
                        {hasLegacyAttachments && <LegacyAttachmentRenderer content={msg.conteudo} isOutgoing={isOutgoing} />}

                        {msg.tipo_conteudo === 'audio' && !hasNewAttachments && !hasLegacyAttachments && audioPath && (
                          <AudioMessage filePath={audioPath} variant={isOutgoing ? 'outgoing' : 'incoming'} />
                        )}
                      </div>

                      {caption && msg.tipo_conteudo !== 'audio' && (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">{caption}</p>
                      )}

                      <div className={cn("flex items-center justify-end gap-1 mt-1 opacity-70", isOutgoing ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        <span className="text-[9px] sm:text-[10px] tabular-nums">{format(new Date(msg.criado_em), 'HH:mm')}</span>
                        {isOutgoing && <CheckCircle className="h-2.5 w-2.5" />}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0", isOutgoing ? "mr-1" : "ml-1")}>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isOutgoing ? "end" : "start"}>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive text-xs" onSelect={() => setDeletingMessage(msg)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Rodapé - Input de Mensagem */}
      <footer className="p-2 sm:p-3 border-t bg-card flex-shrink-0">
        {isRecordingMode ? (
          <AudioRecorder onSend={handleSendAudio} onCancel={() => setIsRecordingMode(false)} />
        ) : (
          <div className="flex flex-col gap-2 max-w-5xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-muted/40 p-1 rounded-full border border-input/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-primary shrink-0">
                    <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none" align="start" side="top">
                  <EmojiPicker onEmojiClick={(emojiObject) => setMessageContent(prev => prev + emojiObject.emoji)} />
                </PopoverContent>
              </Popover>

              {/* Botão de Anexo */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-primary shrink-0">
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-48 mb-2">
                  <DropdownMenuItem className="gap-2 py-2.5 cursor-pointer" onClick={() => docInputRef.current?.click()}>
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>Documento</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 py-2.5 cursor-pointer" onClick={() => imageInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4 text-purple-500" />
                    <span>Fotos e Vídeos</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Hidden Inputs */}
              <input type="file" multiple ref={docInputRef} className="hidden" accept="application/pdf" onChange={handleFileSelect} />
              <input type="file" multiple ref={imageInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />

              <Input
                placeholder="Digite sua mensagem..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                autoComplete="off"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 h-8 sm:h-9 text-sm"
              />

              <div className="flex-shrink-0">
                {messageContent.trim() ? (
                  <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 transition-all h-8 w-8 sm:h-9 sm:w-9 rounded-full shadow-sm">
                    <Send className="h-3.5 w-3.5 sm:h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn("transition-all h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:bg-background hover:text-primary", isSendingAudio && "opacity-50 cursor-not-allowed")}
                    onClick={() => setIsRecordingMode(true)}
                    disabled={isSendingAudio}
                  >
                    <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}
      </footer>

      {/* Preview de Anexos Estilo WhatsApp */}
      {pendingFiles.length > 0 && (
        <AttachmentPreviewModal
          files={pendingFiles}
          onClose={() => setPendingFiles([])}
          onSend={handleSendAttachments}
          isSending={isSendingAttachments}
        />
      )}

      {/* Modal de Edição do Lead */}
      {lead && (
        <LeadModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          lead={lead}
          mode="edit"
        />
      )}

      {/* Dialog de Exclusão de Mensagem */}
      <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será removida permanentemente desta conversa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl" onClick={() => {
              if (deletingMessage) {
                deleteMessage({ messageId: deletingMessage.id, leadId, id_mensagem: deletingMessage.id_mensagem });
                setDeletingMessage(null);
              }
            }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}