import { useState, useEffect } from "react";
import { Clock, Unlock, Loader2, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLeads, Lead } from "@/hooks/useLeads";
import { addSeconds, isAfter, differenceInMinutes, differenceInHours } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AiLockControlProps {
  lead: Lead;
}

const N8N_WEBHOOK_URL = "https://webhook.orbevision.shop/webhook/controle-temp-vrconcept";

export function AiLockControl({ lead }: AiLockControlProps) {
  const { updateLead } = useLeads();
  const [isLoading, setIsLoading] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newDuration, setNewDuration] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const calculateStatus = () => {
    if (!lead.ia_paused_until) {
      setIsBlocked(false);
      setTimeDisplay(null);
      return;
    }
    const end = new Date(lead.ia_paused_until);
    const now = new Date();
    if (isAfter(end, now)) {
      setIsBlocked(true);
      const hours = differenceInHours(end, now);
      const minutes = differenceInMinutes(end, now) % 60;
      if (hours > 0) {
        setTimeDisplay(`${hours}h ${minutes > 0 ? `${minutes}m` : ''}`);
      } else {
        setTimeDisplay(`${minutes}m`);
      }
    } else {
      setIsBlocked(false);
      setTimeDisplay(null);
    }
  };

  useEffect(() => {
    calculateStatus();
    const timer = setInterval(calculateStatus, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(timer);
  }, [lead.ia_paused_until]);

  const cleanPhoneNumber = (phone: string): string => phone.replace(/\D/g, '');

  const callN8NWebhook = async (intent: "editar" | "excluir", seconds?: number) => {
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: cleanPhoneNumber(lead.telefone),
          tempo: seconds || 0,
          intencao: intent,
        }),
      });
    } catch (error) {
      console.error("Erro ao chamar o webhook do N8N:", error);
      toast.error("Falha na comunicação com o servidor de automação.");
    }
  };

  const handleSaveBlock = async () => {
    const seconds = parseInt(newDuration, 10);
    if (isNaN(seconds) || seconds <= 0) {
      toast.warning("Por favor, insira um tempo válido em segundos.");
      return;
    }
    setIsLoading(true);
    const newPausedUntil = addSeconds(new Date(), seconds).toISOString();

    // Otimista: atualiza o Supabase primeiro para feedback visual
    updateLead(
      { id: lead.id, ia_paused_until: newPausedUntil },
      {
        onSuccess: () => {
          toast.success(`Bloqueio de ${seconds} segundos ativado.`);
          callN8NWebhook("editar", seconds); // Envia para o N8N em segundo plano
          setIsPopoverOpen(false);
          setNewDuration("");
        },
        onError: () => toast.error("Erro ao salvar o bloqueio."),
        onSettled: () => setIsLoading(false),
      }
    );
  };

  const handleRemoveBlock = async () => {
    setIsLoading(true);

    // Otimista: atualiza o Supabase
    updateLead(
      { id: lead.id, ia_paused_until: null },
      {
        onSuccess: () => {
          toast.success("Bloqueio removido com sucesso.");
          callN8NWebhook("excluir"); // Envia para o N8N
          setIsPopoverOpen(false);
        },
        onError: () => toast.error("Erro ao remover o bloqueio."),
        onSettled: () => setIsLoading(false),
      }
    );
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 transition-all border font-medium w-[120px] justify-center",
            isBlocked
              ? "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D] hover:bg-[#FDE68A] hover:text-[#B45309]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {isBlocked ? (
            <>
              <Clock className="h-4 w-4" />
              <span>{timeDisplay || "Bloqueado"}</span>
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Desbloqueado</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Controle de Bloqueio da IA</h4>
            <p className="text-sm text-muted-foreground">
              Gerencie o bloqueio temporário de respostas automáticas.
            </p>
          </div>
          {isBlocked && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-amber-800">Bloqueio Ativo</p>
                  <p className="text-xs text-amber-600">Tempo restante: ~{timeDisplay}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRemoveBlock} disabled={isLoading} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="duration">Adicionar/Editar Bloqueio (em segundos)</Label>
            <div className="flex gap-2">
              <Input
                id="duration"
                type="number"
                placeholder="Ex: 7200 (para 2 horas)"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                disabled={isLoading}
              />
              <Button onClick={handleSaveBlock} disabled={isLoading} className="gap-1">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}