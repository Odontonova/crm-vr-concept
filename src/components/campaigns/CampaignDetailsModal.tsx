import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Campaign } from "@/hooks/useCampaigns";
import { Clock, MessageSquare, Users, TrendingUp, CheckCircle, BarChart2 } from "lucide-react";

interface CampaignDetailsModalProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function CampaignDetailsModal({ campaign, open, onOpenChange }: CampaignDetailsModalProps) {
  if (!campaign) return null;

  const statusBadge = getStatusBadge(campaign.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
          </div>
          <DialogTitle className="text-2xl">{campaign.nome}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <Clock className="h-4 w-4" />
            Criada em {new Date(campaign.criado_em).toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {campaign.descricao && (
            <p className="text-sm text-muted-foreground">{campaign.descricao}</p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{campaign.template_mensagem}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Público</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Esta campanha foi segmentada para alcançar aproximadamente <span className="font-bold text-primary">{campaign.contagem_destinatarios}</span> leads.
              </p>
              {/* Aqui poderíamos mostrar os detalhes da segmentação se estivessem salvos */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Performance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{campaign.contagem_enviados || 0}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{campaign.contagem_visualizados || 0}</p>
                <p className="text-xs text-muted-foreground">Visualizadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{campaign.contagem_respostas || 0}</p>
                <p className="text-xs text-muted-foreground">Respostas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{campaign.contagem_conversoes || 0}</p>
                <p className="text-xs text-muted-foreground">Conversões</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}