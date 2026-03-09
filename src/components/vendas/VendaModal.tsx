import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { useLeads, Lead } from "@/hooks/useLeads";
import { useVendas, Venda } from "@/hooks/useVendas";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/CurrencyInput";

interface VendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null; // Usado para criação a partir do LeadModal
  venda?: Venda | null; // Usado para edição
}

interface VendaFormData {
  id?: string;
  lead_id: string;
  valor_orcado: number | undefined;
  data_orcamento: Date | undefined;
  valor_fechado: number | undefined;
  data_fechamento: Date;
  forma_pagamento: string;
}

const initialFormState: VendaFormData = {
  lead_id: "",
  valor_orcado: undefined,
  data_orcamento: undefined,
  valor_fechado: undefined,
  data_fechamento: new Date(),
  forma_pagamento: "",
};

export function VendaModal({ open, onOpenChange, lead: preselectedLead, venda: editingVenda }: VendaModalProps) {
  const { leads, isLoading: isLoadingLeads } = useLeads();
  const { createVenda, updateVenda, isLoading: isMutating } = useVendas();
  const [formData, setFormData] = useState<VendaFormData>(initialFormState);
  const [isLeadSelectorOpen, setIsLeadSelectorOpen] = useState(false);

  const isEditMode = !!editingVenda;

  useEffect(() => {
    if (open) {
      if (editingVenda) {
        // Modo Edição
        setFormData({
          id: editingVenda.id,
          lead_id: editingVenda.lead_id,
          valor_orcado: editingVenda.valor_orcado ?? undefined,
          data_orcamento: editingVenda.data_orcamento ? parseISO(editingVenda.data_orcamento) : undefined,
          valor_fechado: editingVenda.valor_fechado,
          data_fechamento: parseISO(editingVenda.data_fechamento),
          forma_pagamento: editingVenda.forma_pagamento || "",
        });
      } else if (preselectedLead) {
        // Modo Criação a partir do LeadModal
        setFormData({
          ...initialFormState,
          lead_id: preselectedLead.id,
          data_fechamento: new Date(),
        });
      } else {
        // Modo Criação Padrão
        setFormData(initialFormState);
      }
    }
  }, [open, preselectedLead, editingVenda]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lead_id || formData.valor_fechado === undefined || formData.valor_fechado === null || !formData.data_fechamento) {
      toast.error("Preencha os campos obrigatórios: Cliente, Valor Fechado e Data do Fechamento.");
      return;
    }

    const payload = {
      lead_id: formData.lead_id,
      valor_orcado: formData.valor_orcado ?? null,
      valor_fechado: formData.valor_fechado,
      data_orcamento: formData.data_orcamento ? format(formData.data_orcamento, 'yyyy-MM-dd') : null,
      data_fechamento: format(formData.data_fechamento, 'yyyy-MM-dd'),
      forma_pagamento: formData.forma_pagamento || null,
    };

    if (isEditMode && formData.id) {
      updateVenda({ id: formData.id, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createVenda(payload as any, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const selectedLeadLabel = useMemo(() => {
    const leadToDisplay = preselectedLead || leads.find(lead => lead.id === formData.lead_id);
    if (leadToDisplay) {
      return `${leadToDisplay.nome || 'Sem Nome'} (${leadToDisplay.telefone})`;
    }
    return "Selecione um cliente...";
  }, [preselectedLead, formData.lead_id, leads]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Venda" : "Registrar Nova Venda"}</DialogTitle>
          <DialogDescription>Preencha os detalhes do contrato fechado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="lead">Cliente *</Label>
            <Popover open={isLeadSelectorOpen && !preselectedLead && !isEditMode} onOpenChange={setIsLeadSelectorOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  role="combobox" 
                  className="w-full justify-between font-normal" 
                  disabled={!!preselectedLead || isEditMode} // Desabilita se estiver em edição ou pré-selecionado
                >
                  <span className="truncate">{selectedLeadLabel}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              {/* O PopoverContent só será renderizado se o Popover estiver aberto e não estiver em edição */}
              {!preselectedLead && !isEditMode && (
                <PopoverContent className="w-[550px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {isLoadingLeads ? <CommandItem disabled>Carregando...</CommandItem> : leads.map(lead => (
                          <CommandItem key={lead.id} value={lead.nome || lead.id} onSelect={() => {
                            setFormData(prev => ({ ...prev, lead_id: lead.id }));
                            setIsLeadSelectorOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", formData.lead_id === lead.id ? "opacity-100" : "opacity-0")} />
                            {lead.nome} ({lead.telefone})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              )}
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="valor-orcado">Valor Orçado (R$)</Label>
              <CurrencyInput id="valor-orcado" value={formData.valor_orcado} onValueChange={value => setFormData(prev => ({ ...prev, valor_orcado: value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="data-orcamento">Data do Orçamento</Label>
              <Popover><PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !formData.data_orcamento && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.data_orcamento ? format(formData.data_orcamento, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.data_orcamento} onSelect={date => setFormData(prev => ({ ...prev, data_orcamento: date }))} initialFocus locale={ptBR} /></PopoverContent></Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="valor-fechado">Valor Fechado (R$) *</Label>
              <CurrencyInput id="valor-fechado" value={formData.valor_fechado} onValueChange={value => setFormData(prev => ({ ...prev, valor_fechado: value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="data-fechamento">Data do Fechamento *</Label>
              <Popover><PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !formData.data_fechamento && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.data_fechamento ? format(formData.data_fechamento, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.data_fechamento} onSelect={date => setFormData(prev => ({ ...prev, data_fechamento: date || new Date() }))} initialFocus locale={ptBR} /></PopoverContent></Popover>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="forma-pagamento">Forma de Pagamento</Label>
            <Select value={formData.forma_pagamento} onValueChange={value => setFormData(prev => ({ ...prev, forma_pagamento: value }))}>
              <SelectTrigger><SelectValue placeholder="Selecione a forma de pagamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? "Salvando..." : (isEditMode ? "Salvar Alterações" : "Salvar Venda")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}