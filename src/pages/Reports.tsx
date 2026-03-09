import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, TrendingUp, TrendingDown, Users, DollarSign, Clock, Filter, BarChart2, Tag, ArrowUpRight, ArrowDownRight, ArrowRight,
  CreditCard, ShoppingCart, Percent, Wallet
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, LabelList, AreaChart, Area
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/useReports";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useStages } from "@/hooks/useStages";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { useLeadSources } from "@/hooks/useLeadSources";
import { useTags } from "@/hooks/useTags";
import { Separator } from "@/components/ui/separator";

// Componente de Tooltip Personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-lg outline-none">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <div
              className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]"
              style={{
                backgroundColor: entry.color,
                boxShadow: `0 0 4px ${entry.color}`
              }}
            />
            <span className="text-sm text-muted-foreground capitalize">{entry.name}:</span>
            <span className="text-sm font-bold text-foreground">
              {entry.name === 'Valor' || entry.name === 'Faturamento'
                ? `R$ ${Number(entry.value).toLocaleString('pt-BR')}`
                : entry.value
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const today = new Date();
  const initialDateRange: DateRange = { from: startOfMonth(today), to: endOfMonth(today) };

  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [showFilters, setShowFilters] = useState(false);
  const [originFilter, setOriginFilter] = useState("Todos"); // Estado principal para as abas de origem

  // O estado 'filters' controla apenas os filtros AVANÇADOS (dentro do modal)
  const [filters, setFilters] = useState({
    posicao_pipeline: "Todos",
    // origem: REMOVIDO DAQUI pois agora é controlado pelo originFilter
    genero: "Todos",
    idade: "",
    tagId: "Todos"
  });

  const { toast } = useToast();

  // Passamos o originFilter combinado com os outros filtros para o hook
  const { data: reports, isLoading } = useReports(dateRange, { ...filters, origem: originFilter });

  const { stages } = useStages();
  const { allSources } = useLeadSources();
  const { availableTags } = useTags();

  const handleFilterChange = (filterName: string, value: string) => setFilters(prev => ({ ...prev, [filterName]: value }));

  const handleExport = () => {
    if (!reports) return;
    const { kpis } = safeReports;
    const csvContent = "data:text/csv;charset=utf-8," + "Métrica,Valor\n" + `Total de Leads,${kpis.totalLeads}\n` + `Taxa de Conversão,${kpis.conversionRate}%\n` + `Ticket Médio,R$ ${kpis.ticketMedio.toLocaleString('pt-BR')}\n` + `Tempo Médio no Funil,${kpis.tempoMedioFunil} dias\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${originFilter}_${dateRange?.from ? format(dateRange.from, 'yyyyMMdd') : 'custom'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Relatório exportado", description: "O arquivo CSV foi baixado com sucesso!", closeButton: true });
  };

  // Dados padrão para quando não há dados ainda (evita tela branca)
  const emptyReports = {
    kpis: { totalLeads: 0, totalContatos: 0, totalNovosLeads: 0, conversionRate: "0", ticketMedio: 0, tempoMedioFunil: "0" },
    charts: { leadsCapturedData: [], sourceData: [], topCreativesData: [] },
    funnel: { funnelData: [], overallConversion: "0", detailedSteps: [] },
    financial: { totalFaturado: 0, ticketMedio: 0, totalVendas: 0, taxaEficiencia: 0, faturamentoPorDia: [], metodosPagamentoData: [] },
    conversions: { charts: { conversoesPorOrigemData: [], valorConvertidoPorDia: [] } }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeReports = (reports ?? emptyReports) as any;

  const GRADIENTS = (
    <defs>
      <linearGradient id="colorCaptados" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorConvertidos" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
      </linearGradient>
    </defs>
  );

  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Detalhados</h1>
          <p className="text-muted-foreground mt-1">Análise de performance, funil e vendas.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          <Button onClick={handleExport}><Download className="h-4 w-4 mr-2" />Exportar</Button>
        </div>
      </div>

      {/* Tabs Principais de Origem */}
      <Tabs value={originFilter} onValueChange={setOriginFilter} className="w-full">
        <div className="border-b pb-4 mb-6">
          <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-flex">
            <TabsTrigger value="Todos">Visão Geral</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="organico">Orgânico</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {showFilters && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Filtros Avançados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Etapa do Funil</Label>
                <Select value={filters.posicao_pipeline} onValueChange={(v) => handleFilterChange('posicao_pipeline', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas as Etapas</SelectItem>
                    {stages.map(stage => <SelectItem key={stage.id} value={stage.posicao_ordem.toString()}>{stage.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Filtro de Origem removido daqui, pois é controlado pelas abas principais */}
              <div><Label>Gênero</Label><Select value={filters.genero} onValueChange={(v) => handleFilterChange('genero', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div>
              <div><Label>Idade</Label><Input type="number" value={filters.idade} onChange={(e) => handleFilterChange('idade', e.target.value)} placeholder="Idade exata" /></div>
              <div><Label>Etiqueta</Label><Select value={filters.tagId} onValueChange={(v) => handleFilterChange('tagId', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todas as Etiquetas</SelectItem>{availableTags.map(tag => (<SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>))}</SelectContent></Select></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo das Abas Internas (Métricas) */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList>
          <TabsTrigger value="overview">Resumo</TabsTrigger>
          <TabsTrigger value="funnel">Funil Real</TabsTrigger>
          <TabsTrigger value="conversions">Conversões</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Leads</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{reports?.kpis?.totalContatos ?? 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Novos Leads</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{reports?.kpis?.totalNovosLeads ?? 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Conversão</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{reports?.kpis?.conversionRate ?? 0}%</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ticket Médio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {(reports?.kpis?.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tempo Médio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{reports?.kpis?.tempoMedioFunil ?? 0} dias</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Captados vs Convertidos</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reports?.charts?.leadsCapturedData || []}>
                      {GRADIENTS}
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                      <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" />
                      <Area
                        type="monotone"
                        dataKey="captados"
                        name="Captados"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#colorCaptados)"
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="convertidos"
                        name="Convertidos"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#colorConvertidos)"
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Leads por Fonte</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports?.charts?.sourceData || []} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="source"
                        type="category"
                        width={100}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="leads"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                        name="Leads"
                        barSize={32}
                      >
                        <LabelList dataKey="leads" position="right" fontSize={12} fill="hsl(var(--foreground))" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {originFilter !== 'organico' && (
            <Card>
              <CardHeader><CardTitle>Top Criativos (Marketing)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Criativo</TableHead><TableHead>Fonte</TableHead><TableHead>Leads</TableHead><TableHead>Conversão</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports?.charts?.topCreativesData || []).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell><Badge variant="outline">{item.origin}</Badge></TableCell>
                        <TableCell>{item.leads}</TableCell>
                        <TableCell>{item.conversion}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Vendas ({originFilter === 'Todos' ? 'Geral' : originFilter})</CardTitle>
              <CardDescription>Visualização do volume de leads acumulado por etapa.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reports?.funnel?.funnelData || []}
                    layout="vertical"
                    margin={{ top: 20, right: 60, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="etapa"
                      type="category"
                      width={180}
                      tick={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                    <Bar
                      dataKey="quantidade"
                      barSize={40}
                      radius={[0, 6, 6, 0]}
                      name="Leads"
                    >
                      {reports?.funnel?.funnelData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || '#8b5cf6'} />
                      ))}
                      <LabelList
                        dataKey="quantidade"
                        position="right"
                        formatter={(val: number) => `${val}`}
                        style={{ fontWeight: 'bold', fill: 'hsl(var(--foreground))', fontSize: 14 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold px-1">Análise de Conversão por Etapa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports?.funnel?.detailedSteps?.map((step: any, index: number) => {
                const isLast = index === (reports?.funnel?.detailedSteps?.length || 0) - 1;

                return (
                  <Card key={index} className="relative overflow-hidden border-l-4" style={{ borderLeftColor: step.fill || '#8b5cf6' }}>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="mb-2" style={{ borderColor: step.fill, color: step.fill }}>
                          Etapa {index + 1}
                        </Badge>
                        <span className="font-bold text-2xl">{step.quantidade}</span>
                      </div>

                      <h4 className="font-bold text-lg mb-4 truncate" title={step.etapa}>{step.etapa}</h4>

                      <Separator className="my-3" />

                      {!isLast ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-emerald-500" /> Conversão
                            </span>
                            <span className="font-semibold text-emerald-600">{step.conversionRate}%</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <TrendingDown className="h-4 w-4 text-red-500" /> Perda (Drop-off)
                            </span>
                            <span className="font-semibold text-red-600">{step.dropOffRate}%</span>
                          </div>

                          <div className="text-xs text-muted-foreground mt-2 text-right">
                            Próxima etapa: {reports?.funnel?.detailedSteps[index + 1]?.etapa}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-20 text-center">
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 mb-1">
                            Meta Atingida
                          </Badge>
                          <p className="text-xs text-muted-foreground">Etapa final do funil de vendas</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Conversões por Fonte</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={safeReports.conversions?.charts?.conversoesPorOrigemData || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={5}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {(safeReports.conversions?.charts?.conversoesPorOrigemData || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Valor Convertido (Dia a Dia)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeReports.conversions?.charts?.valorConvertidoPorDia || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                      <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="valor"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        name="Valor"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {/* KPIs Financeiros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {reports?.financial?.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground">No período selecionado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {reports?.financial?.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground">Por venda realizada</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports?.financial?.totalVendas}</div>
                <p className="text-xs text-muted-foreground">Contratos fechados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eficiência (Orçado x Fechado)</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports?.financial?.taxaEficiencia.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Taxa de conversão de valor</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Financeiros */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Faturamento</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reports?.financial?.faturamentoPorDia || []}>
                      {GRADIENTS}
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                      <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={12} tickFormatter={(value) => `R$${value / 1000}k`} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="valor"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorFaturamento)"
                        fillOpacity={1}
                        name="Faturamento"
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Métodos de Pagamento</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reports?.financial?.metodosPagamentoData || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {(reports?.financial?.metodosPagamentoData || []).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}