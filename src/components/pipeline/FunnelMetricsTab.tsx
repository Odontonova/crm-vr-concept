import { useState } from "react";
import { useFunnelMetrics } from "@/hooks/useFunnelMetrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";
import { AlertCircle, TrendingDown, TrendingUp, Filter } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FunnelMetricsTabProps {
  dateRange: DateRange | undefined;
}

export function FunnelMetricsTab({ dateRange }: FunnelMetricsTabProps) {
  const [activeFunnel, setActiveFunnel] = useState<'marketing' | 'organico'>('marketing');
  const { data: funnelData, isLoading, error } = useFunnelMetrics(dateRange, activeFunnel);

  const topCount = funnelData?.[0]?.count || 1; 

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      );
    }

    if (error || !funnelData || funnelData.length === 0) {
      return (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Dados Insuficientes</h3>
            <p className="text-muted-foreground max-w-sm">
              Não foi possível carregar as etapas do funil para esta seleção.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        
        {/* Coluna Esquerda: Gráfico Visual do Funil */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Fluxo de Conversão Real ({activeFunnel === 'marketing' ? 'Marketing' : 'Orgânico'})</CardTitle>
            <CardDescription>Visualização acumulada do volume de leads por etapa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {funnelData.map((step, index) => {
              const isLast = index === funnelData.length - 1;
              // Garante que a barra tenha pelo menos um tamanho visível se tiver contagem > 0
              const widthPercentage = step.count > 0 ? Math.max((step.count / topCount) * 100, 2) : 0; 
              
              // Define a cor do badge de conversão
              const isPositive = step.conversionToNext >= 50;
              const badgeClass = isPositive 
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200" 
                : "bg-red-100 text-red-700 hover:bg-red-100 border-red-200";
              const Icon = isPositive ? TrendingUp : TrendingDown;

              return (
                <div key={step.stageId || index} className="relative">
                  {/* Linha da Barra Principal */}
                  <div className="flex items-center gap-4 mb-1">
                    {/* Nome da Etapa */}
                    <div className="w-36 flex-shrink-0 text-sm font-medium text-right truncate text-muted-foreground" title={step.stageName}>
                      {step.stageName}
                    </div>
                    
                    {/* Barra Visual */}
                    <div className="flex-1 h-10 bg-muted/20 rounded-r-md relative flex items-center overflow-hidden">
                      {step.count > 0 && (
                        <div 
                          className="h-full rounded-r-md flex items-center justify-end pr-3 text-white font-bold text-sm transition-all duration-500"
                          style={{ 
                            width: `${widthPercentage}%`, 
                            backgroundColor: step.color 
                          }}
                        >
                          <span className="drop-shadow-md">{step.count}</span>
                        </div>
                      )}
                    </div>

                    {/* % do Total */}
                    <div className="w-24 flex-shrink-0 text-xs text-muted-foreground text-right">
                      {step.conversionFromStart.toFixed(1)}% do total
                    </div>
                  </div>

                  {/* Linha de Conexão / Conversão (exceto para o último) */}
                  {!isLast && (
                    <div className="flex items-center gap-4 h-8 mb-3">
                      <div className="w-36"></div> {/* Espaçador alinhado com o nome */}
                      <div className="flex-1 pl-4 flex items-center justify-between pr-24">
                        
                        {/* Badge de Conversão */}
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5 font-medium gap-1", badgeClass)}>
                          <Icon className="h-3 w-3" />
                          {step.conversionToNext.toFixed(0)}% conversão
                        </Badge>
                        
                        {/* Texto de Perda */}
                        {step.dropoffCount > 0 && (
                          <span className="text-xs text-red-500 font-medium">
                            -{step.dropoffCount} perdidos
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Coluna Direita: KPIs */}
        <div className="space-y-6">
          
          {/* Card Eficiência Global */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Eficiência Global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">
                {funnelData[funnelData.length - 1]?.conversionFromStart.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-2 mb-4">
                Dos {topCount} leads iniciais, {funnelData[funnelData.length - 1]?.count} fecharam negócio.
              </p>
              <Progress 
                value={funnelData[funnelData.length - 1]?.conversionFromStart} 
                className="h-2" 
                style={{ 
                    // @ts-ignore
                    "--progress-background": funnelData[funnelData.length - 1]?.color || "#10b981" 
                }}
              />
            </CardContent>
          </Card>

          {/* Card Maior Ponto de Perda */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Maior Ponto de Perda</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Encontra a etapa com maior perda absoluta (excluindo a última etapa que não tem "próxima")
                const biggestDrop = [...funnelData].slice(0, -1).sort((a, b) => b.dropoffCount - a.dropoffCount)[0];
                
                if (!biggestDrop || biggestDrop.dropoffCount === 0) {
                  return <p className="text-sm text-muted-foreground">Sem perdas significativas registradas.</p>;
                }

                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: biggestDrop.color }} />
                      <span className="font-semibold text-base">{biggestDrop.stageName}</span>
                    </div>
                    <div className="text-3xl font-bold text-red-600 mb-1">
                      -{biggestDrop.dropoffCount} leads
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Não avançaram para a próxima etapa.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Card Info Filtro */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Filtro Ativo</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Exibindo funil de <strong>{activeFunnel === 'marketing' ? 'Marketing (Anúncios)' : 'Orgânico (Indicação/Outros)'}</strong>. Leads movidos para "Desqualificado" ou "Perdido" são contabilizados até a última etapa válida que alcançaram.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs 
        value={activeFunnel} 
        onValueChange={(v) => setActiveFunnel(v as 'marketing' | 'organico')}
        className="w-full"
      >
        <div className="flex items-center mb-6">
          <TabsList>
            <TabsTrigger value="marketing">Funil de Marketing</TabsTrigger>
            <TabsTrigger value="organico">Funil Orgânico</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="marketing" className="m-0">
          {renderContent()}
        </TabsContent>
        
        <TabsContent value="organico" className="m-0">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}