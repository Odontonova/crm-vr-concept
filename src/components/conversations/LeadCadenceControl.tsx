import { useState } from "react";
import { GitBranch, Play, StopCircle, Loader2, Info, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCadencias, useLeadActiveCadences } from "@/hooks/useCadencias";
import { Lead } from "@/hooks/useLeads";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadCadenceControlProps {
  lead: Lead;
}

export function LeadCadenceControl({ lead }: LeadCadenceControlProps) {
  const { cadencias } = useCadencias();
  const { activeCadences, enrollLead, cancelCadence, isEnrolling } = useLeadActiveCadences(lead.id);
  const [selectedCadence, setSelectedCadence] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const handleEnroll = () => {
    if (!selectedCadence) return;
    enrollLead(selectedCadence);
    setSelectedCadence("");
    setIsOpen(false);
  };

  const formatNextExecution = (dateString: string | null) => {
    if (!dateString) return "Processando...";
    try {
      const date = parseISO(dateString);
      let prefix = format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
      
      if (isToday(date)) {
        prefix = `Hoje às ${format(date, "HH:mm")}`;
      } else if (isTomorrow(date)) {
        prefix = `Amanhã às ${format(date, "HH:mm")}`;
      }
      
      return prefix;
    } catch (e) {
      return "Data inválida";
    }
  };

  const isActive = activeCadences.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 transition-all border font-medium px-3 rounded-full",
            isActive
              ? "bg-[#8c7355]/10 text-[#8c7355] border-[#8c7355]/30 hover:bg-[#8c7355]/20"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">
            {isActive ? `${activeCadences.length} Ativas` : "Cadências"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b bg-muted/20">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[#8c7355]" /> Cadências de Follow-up
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Matricule este cliente em fluxos de mensagens automáticas.
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Cadências Ativas */}
          {activeCadences.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Em Andamento
              </span>
              <div className="space-y-2">
                {activeCadences.map((ac) => (
                  <div key={ac.id} className="flex flex-col gap-3 p-3 border border-border/50 rounded-lg bg-card shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground truncate pr-2">
                        {ac.cadencias?.nome}
                      </span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-[#8c7355]/10 text-[#8c7355] font-bold">
                        Passo {ac.passo_atual_ordem}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50/50 p-1.5 rounded border border-amber-100/50">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="text-[10px] font-medium leading-none">
                        Próximo envio: {formatNextExecution(ac.proxima_execucao)}
                      </span>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-full text-[10px] text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                      onClick={() => cancelCadence(ac.id)}
                    >
                      <StopCircle className="h-3 w-3 mr-1" /> Interromper Cadência
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar a nova */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Iniciar Novo Fluxo
            </span>
            <div className="flex flex-col gap-2">
              <Select value={selectedCadence} onValueChange={setSelectedCadence}>
                <SelectTrigger className="h-9 text-xs bg-muted/30">
                  <SelectValue placeholder="Selecione a cadência..." />
                </SelectTrigger>
                <SelectContent>
                  {cadencias.map(c => {
                    const alreadyIn = activeCadences.some(ac => ac.cadencia_id === c.id);
                    return (
                      <SelectItem key={c.id} value={c.id} disabled={alreadyIn}>
                        {c.nome} {alreadyIn ? '(Em andamento)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                className="w-full h-9 bg-[#8c7355] hover:bg-[#7a6448] text-white gap-2 font-bold shadow-sm"
                disabled={!selectedCadence || isEnrolling}
                onClick={handleEnroll}
              >
                {isEnrolling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Ativar para o Lead
              </Button>
            </div>
          </div>
          
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-blue-50/50 border border-blue-100/50 p-2.5 rounded-lg">
             <Info className="h-3.5 w-3.5 flex-shrink-0 text-blue-500 mt-0.5" />
             <p className="leading-relaxed">As mensagens disparadas aparecerão no histórico do chat como se tivessem sido enviadas agora.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}