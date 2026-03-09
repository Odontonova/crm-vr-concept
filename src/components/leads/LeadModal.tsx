import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeads } from "@/hooks/useLeads";
import { useStages, Stage } from "@/hooks/useStages";
import MaskedInput, { PhoneInput, CpfInput } from "@/components/MaskedInput";
import { User, Mail, Phone, DollarSign, MapPin, Tag, Clock, MessageSquare, Pencil, MessageCircle, HeartPulse, Globe } from "lucide-react";
import { parse, format, differenceInYears, isValid, startOfDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreatableSelect } from "@/components/ui/CreatableSelect";
import { useLeadSources } from "@/hooks/useLeadSources";
import { useMarketing } from "@/hooks/useMarketing";
import { VendaModal } from "@/components/vendas/VendaModal";

// --- Funções Auxiliares (mantidas) ---
const calculateAge = (dobString: string | undefined): number | '' => {
  if (!dobString || dobString.length !== 10) return '';
  const dob = parse(dobString, 'dd/MM/yyyy', new Date());
  if (!isValid(dob)) return '';
  const age = differenceInYears(new Date(), dob);
  return age >= 0 ? age : '';
};

const toSupabaseDate = (displayDate: string): string | undefined => {
  if (!displayDate || displayDate.length !== 10) return undefined;
  const date = parse(displayDate, 'dd/MM/yyyy', new Date());
  return isValid(date) ? format(date, 'yyyy-MM-dd') : undefined;
};

const toDisplayDate = (supabaseDate: string | undefined): string => {
  if (!supabaseDate) return '';
  try {
    const date = parse(supabaseDate, 'yyyy-MM-dd', new Date());
    return isValid(date) ? format(date, 'dd/MM/yyyy') : '';
  } catch {
    return '';
  }
};

const toDisplayDateFromTimestamp = (supabaseTimestamp: string | undefined): string => {
  if (!supabaseTimestamp) return '';
  try {
    const date = parseISO(supabaseTimestamp);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : '';
  } catch {
    return '';
  }
};

const toSupabaseTimestamp = (displayDate: string): string | undefined => {
  if (!displayDate || displayDate.length !== 10) return undefined;
  const date = parse(displayDate, 'dd/MM/yyyy', new Date());
  return isValid(date) ? startOfDay(date).toISOString() : undefined;
};

const cleanPhoneNumber = (phone: string): string => phone.replace(/\D/g, '');

const initialFormData = {
  nome: "", telefone: "", resumo: "",
  origem: "organico", // Default agora é organico
  fonte: "",          // Novo campo para o detalhe (antiga origem)
  posicao_pipeline: 1,
  status: "Ativo", email: "", cpf: "", idade: "",
  genero: "", endereco: "",
  procedimento_interesse: "",
  criativo_id: "none",
  data_nascimento_display: "",
  criado_em_display: "",
};

// --- Componentes de UI ---

const ViewContent = ({ lead, stages, creativeName }: { lead: any, stages: Stage[], creativeName?: string }) => {
  const currentStage = stages.find(s => s.posicao_ordem === lead?.posicao_pipeline);
  return (
    <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">{lead.nome || 'Lead sem nome'}</h3>
        <Badge className="text-sm" style={{ backgroundColor: currentStage?.cor, color: 'white' }}>
          {currentStage?.nome || 'Etapa Desconhecida'}
        </Badge>
      </div>
      <Card className="shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 text-primary"><User className="h-4 w-4" /> Detalhes do Lead</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{lead.telefone}</span></div>
          {lead.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{lead.email}</span></div>}
          {lead.procedimento_interesse && <div className="flex items-center gap-2 col-span-2"><HeartPulse className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-primary">{lead.procedimento_interesse}</span></div>}

          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{lead.origem || 'Orgânico'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span>{lead.fonte || 'Sem fonte'}</span>
          </div>

          {creativeName && <div className="flex items-center gap-2 col-span-2 md:col-span-1"><Tag className="h-4 w-4 text-muted-foreground" /><span className="truncate" title={creativeName}>{creativeName}</span></div>}
        </CardContent>
      </Card>
      <Card className="shadow-md border-l-4 border-l-accent">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 text-accent"><Clock className="h-4 w-4" /> Resumo do Atendimento (IA)</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm text-foreground prose prose-sm prose-amber max-w-none">
            {lead.resumo ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-bold text-amber-900" {...props} />,
                }}
              >
                {lead.resumo.replace(/\\n/g, '\n')}
              </ReactMarkdown>
            ) : (
              <span className="text-muted-foreground italic">Nenhum resumo gerado.</span>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base text-muted-foreground">Dados Adicionais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          {lead.idade && <div><span className="font-medium">Idade:</span> {lead.idade} anos</div>}
          {lead.genero && <div><span className="font-medium">Gênero:</span> {lead.genero}</div>}
          {lead.data_nascimento && <div><span className="font-medium">Nascimento:</span> {toDisplayDate(lead.data_nascimento)}</div>}
          {lead.cpf && <div><span className="font-medium">CPF:</span> {lead.cpf}</div>}
          {lead.endereco && <div className="col-span-2 flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{lead.endereco}</span></div>}
        </CardContent>
      </Card>
    </div>
  );
};

const FormContent = ({ formData, handleInputChange, handleSubmit, stages, handleClose, isEdit, handleSourceChange }: any) => {
  const { allSources } = useLeadSources();
  const { criativos } = useMarketing();

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Nome</Label><Input value={formData.nome} onChange={(e) => handleInputChange('nome', e.target.value)} /></div>
        <div><Label>Telefone *</Label><PhoneInput value={formData.telefone} onChange={(e) => handleInputChange('telefone', e.target.value)} required /></div>
        <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} /></div>
        <div><Label>CPF</Label><CpfInput value={formData.cpf} onChange={(e) => handleInputChange('cpf', e.target.value)} /></div>
        <div><Label>Data de Nascimento</Label><MaskedInput mask="99/99/9999" placeholder="DD/MM/AAAA" value={formData.data_nascimento_display} onChange={(e) => handleInputChange('data_nascimento_display', e.target.value)} /></div>
        <div><Label>Idade</Label><Input type="number" value={formData.idade} readOnly disabled placeholder="Calculada" /></div>
        <div>
          <Label>Gênero</Label>
          <Select value={formData.genero} onValueChange={(value) => handleInputChange('genero', value)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Feminino</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Endereço</Label><Input value={formData.endereco} onChange={(e) => handleInputChange('endereco', e.target.value)} /></div>
      </div>
      <div>
        <Label>Curso de Interesse</Label>
        <Input
          value={formData.procedimento_interesse}
          onChange={(e) => handleInputChange('procedimento_interesse', e.target.value)}
          placeholder="Ex: Harmonização, Botox, Clareamento..."
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Resumo do Atendimento (IA)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] uppercase font-bold text-accent"
            onClick={() => {
              const el = document.getElementById('resumo-textarea');
              if (el) el.classList.toggle('hidden');
            }}
          >
            <Pencil className="h-3 w-3 mr-1" /> Editar Texto
          </Button>
        </div>

        {/* Preview Formatado */}
        {formData.resumo && (
          <div className="p-3 rounded-lg border bg-amber-50/30 text-xs prose prose-sm prose-amber max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-amber-900" {...props} />,
              }}
            >
              {formData.resumo.replace(/\\n/g, '\n')}
            </ReactMarkdown>
          </div>
        )}

        <Textarea
          id="resumo-textarea"
          className={cn("text-xs min-h-[100px]", formData.resumo ? "hidden" : "")}
          value={formData.resumo}
          onChange={(e) => handleInputChange('resumo', e.target.value)}
          placeholder="Resumo gerado pela IA..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Origem (Tipo)</Label>
          <Select value={formData.origem} onValueChange={(value) => handleInputChange('origem', value)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="marketing">Marketing (Pago/Ads)</SelectItem>
              <SelectItem value="organico">Orgânico (Manual/Indicação)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fonte (Detalhe)</Label>
          <CreatableSelect
            options={allSources}
            value={formData.fonte}
            onChange={handleSourceChange}
            placeholder="Ex: Facebook, Instagram, Indicação"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Criativo (Opcional)</Label>
          <Select value={formData.criativo_id} onValueChange={(value) => handleInputChange('criativo_id', value)}>
            <SelectTrigger><SelectValue placeholder="Selecione o criativo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {criativos.map((criativo: any) => (
                <SelectItem key={criativo.id} value={criativo.id}>
                  {criativo.nome || criativo.titulo || `Criativo ${criativo.id.substring(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Etapa</Label>
          <Select value={formData.posicao_pipeline.toString()} onValueChange={(value) => handleInputChange('posicao_pipeline', parseInt(value))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{stages.map((stage: Stage) => <SelectItem key={stage.id} value={stage.posicao_ordem.toString()}>{stage.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem>
              <SelectItem value="Convertido">Convertido</SelectItem><SelectItem value="Perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Data de Cadastro</Label><MaskedInput mask="99/99/9999" placeholder="DD/MM/AAAA" value={formData.criado_em_display} onChange={(e) => handleInputChange('criado_em_display', e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={handleClose}>{isEdit ? "Cancelar" : "Fechar"}</Button>
        <Button type="submit">{isEdit ? "Salvar Alterações" : "Criar Lead"}</Button>
      </div>
    </form>
  );
};

// --- Componente Principal ---

interface LeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: any;
  mode?: 'view' | 'edit' | 'create';
}

export function LeadModal({ open, onOpenChange, lead, mode = 'create' }: LeadModalProps) {
  const { createLead, updateLead } = useLeads();
  const { stages } = useStages();
  const { allSources, createSource } = useLeadSources();
  const { criativos } = useMarketing();
  const [formData, setFormData] = useState(initialFormData);
  const [currentMode, setCurrentMode] = useState(mode);
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const navigate = useNavigate();

  const isView = currentMode === 'view';
  const isEdit = currentMode === 'edit' && !!lead;

  useEffect(() => {
    if (open) {
      setCurrentMode(mode);
      if (lead) {
        setFormData({
          nome: lead.nome || "", telefone: lead.telefone || "",
          resumo: lead.resumo || "",
          origem: lead.origem || "organico", // Mapeia antigo para default
          fonte: lead.fonte || lead.origem || "", // Fallback para origem antiga se fonte vazia
          posicao_pipeline: lead.posicao_pipeline || 1,
          status: lead.status || "Ativo", email: lead.email || "", cpf: lead.cpf || "",
          idade: lead.idade?.toString() || "", genero: lead.genero || "", endereco: lead.endereco || "",
          procedimento_interesse: lead.procedimento_interesse || "",
          criativo_id: lead.criativo_id || "none",
          data_nascimento_display: toDisplayDate(lead.data_nascimento),
          criado_em_display: toDisplayDateFromTimestamp(lead.criado_em),
        });
      } else {
        setFormData({
          ...initialFormData,
          criado_em_display: format(new Date(), 'dd/MM/yyyy'),
        });
      }
    }
  }, [open, lead, mode]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'data_nascimento_display') {
        newState.idade = String(calculateAge(value as string));
      }
      return newState;
    });
  };

  const handleSourceChange = (value: string) => {
    handleInputChange('fonte', value);
    if (value && !allSources.includes(value)) {
      createSource({ name: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = cleanPhoneNumber(formData.telefone);
    if (!cleanedPhone || cleanedPhone.length < 10) {
      alert("O campo Telefone é obrigatório e deve ser válido.");
      return;
    }

    const data = {
      ...formData,
      telefone: cleanedPhone,
      idade: formData.idade ? parseInt(formData.idade) : undefined,
      data_nascimento: toSupabaseDate(formData.data_nascimento_display),
      criado_em: toSupabaseTimestamp(formData.criado_em_display),
      nome: formData.nome || undefined,
      origem: formData.origem || undefined,
      fonte: formData.fonte || undefined,
      resumo: formData.resumo || undefined,
      email: formData.email || undefined,
      cpf: formData.cpf || undefined,
      genero: formData.genero || undefined,
      endereco: formData.endereco || undefined,
      procedimento_interesse: formData.procedimento_interesse || undefined,
      criativo_id: formData.criativo_id === "none" ? null : formData.criativo_id,
    };

    delete (data as any).data_nascimento_display;
    delete (data as any).criado_em_display;

    if (isEdit) {
      updateLead({ id: lead.id, ...data });
    } else {
      createLead(data as any);
    }
    onOpenChange(false);
  };

  const handleClose = () => onOpenChange(false);
  const handleEditClient = () => setCurrentMode('edit');

  const handleOpenConversation = () => {
    if (lead?.id) {
      navigate(`/conversas/${lead.id}`);
      onOpenChange(false);
    }
  };

  const currentStage = stages.find(s => s.posicao_ordem === lead?.posicao_pipeline);
  const isContratoFechado = currentStage?.nome === 'Matrícula Realizada' || currentStage?.nome === 'Contrato Fechado' || currentStage?.nome === 'Procedimento Fechado';

  const creativeName = lead?.criativo_id
    ? criativos.find((c: any) => c.id === lead.criativo_id)?.nome || criativos.find((c: any) => c.id === lead.criativo_id)?.titulo
    : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isView ? `Detalhes: ${lead?.nome || 'Lead'}` : isEdit ? "Editar Lead" : "Novo Lead"}
            </DialogTitle>
          </DialogHeader>

          {isView && lead ? (
            <ViewContent lead={lead} stages={stages} creativeName={creativeName} />
          ) : (
            <FormContent
              formData={formData}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              stages={stages}
              handleClose={handleClose}
              isEdit={isEdit}
              handleSourceChange={handleSourceChange}
            />
          )}

          {isView && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>Fechar</Button>
              {isContratoFechado && (
                <Button
                  type="button"
                  onClick={() => setIsVendaModalOpen(true)}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Fechar Venda
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={handleOpenConversation} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir Conversa
              </Button>
              <Button type="button" onClick={handleEditClient} className="bg-primary hover:bg-primary/90">
                <Pencil className="h-4 w-4 mr-2" />
                Editar Cliente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VendaModal
        open={isVendaModalOpen}
        onOpenChange={setIsVendaModalOpen}
        lead={lead}
      />
    </>
  );
}