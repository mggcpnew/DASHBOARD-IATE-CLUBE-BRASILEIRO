import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DynamicMonthlyData } from "@/lib/excelParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useCallback, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";

interface RevenueExpenseChartProps {
  data: DynamicMonthlyData[];
  selectedMonths: string[];
  year?: string;
}

// Extracted tooltip content for reuse
function TooltipBody({
  label,
  hasRealizado,
  receitasRealizado,
  receitasOrcado,
  despesasRealizado,
  despesasOrcado,
  resultadoRealizado,
  resultadoOrcado,
}: {
  label: string;
  hasRealizado: boolean;
  receitasRealizado: number;
  receitasOrcado: number;
  despesasRealizado: number;
  despesasOrcado: number;
  resultadoRealizado: number;
  resultadoOrcado: number;
}) {
  const formatCurrency = (value: number) =>
    `R$ ${new Intl.NumberFormat("pt-BR").format(value)}`;

  return (
    <>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <p className="font-bold text-foreground text-base">{label}</p>
        {hasRealizado ? (
          <Badge variant="default" className="text-xs">Realizado</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Orçado (Previsão)</Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Receitas */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-revenue"></span>
            <span className="text-base font-semibold text-foreground">Receitas</span>
          </div>
          <div className="ml-5 space-y-1 text-sm">
            {hasRealizado && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground shrink-0">Realizado:</span>
                <span className="font-medium text-revenue text-right">{formatCurrency(receitasRealizado)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground shrink-0">{hasRealizado ? "Orçado:" : "Orçado (Previsão):"}</span>
              <span className="font-medium text-muted-foreground text-right">{formatCurrency(receitasOrcado)}</span>
            </div>
          </div>
        </div>

        {/* Despesas */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-expense"></span>
            <span className="text-base font-semibold text-foreground">Despesas</span>
          </div>
          <div className="ml-5 space-y-1 text-sm">
            {hasRealizado && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground shrink-0">Realizado:</span>
                <span className="font-medium text-expense text-right">{formatCurrency(despesasRealizado)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground shrink-0">{hasRealizado ? "Orçado:" : "Orçado (Previsão):"}</span>
              <span className="font-medium text-muted-foreground text-right">{formatCurrency(despesasOrcado)}</span>
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }}></span>
            <span className="text-base font-semibold text-foreground">Resultado</span>
          </div>
          <div className="ml-5 space-y-1 text-sm">
            {hasRealizado && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground shrink-0">Realizado:</span>
                <span className={`font-bold text-right ${resultadoRealizado >= 0 ? 'text-revenue' : 'text-expense'}`}>
                  {formatCurrency(resultadoRealizado)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground shrink-0">{hasRealizado ? "Orçado:" : "Orçado (Previsão):"}</span>
              <span className={`font-medium text-right ${resultadoOrcado >= 0 ? 'text-muted-foreground' : 'text-expense/70'}`}>
                {formatCurrency(resultadoOrcado)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function RevenueExpenseChart({ data, selectedMonths, year }: RevenueExpenseChartProps) {
  const [viewMode, setViewMode] = useState<"realizado" | "orcado" | "comparativo">("comparativo");
  const isMobile = useIsMobile();
  const filteredData = data.filter((d) => selectedMonths.includes(d.month));

  // Mobile fixed tooltip state
  const [mobileTooltipData, setMobileTooltipData] = useState<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const formatValue = (value: number) => {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  };

  // Close mobile tooltip when tapping outside
  useEffect(() => {
    if (!isMobile || !mobileTooltipData) return;
    const handler = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // If tapping on the overlay or close button, close
      if (target.closest('[data-mobile-tooltip-overlay]') || target.closest('[data-mobile-tooltip-close]')) {
        setMobileTooltipData(null);
      }
    };
    document.addEventListener('touchstart', handler, { passive: true });
    return () => document.removeEventListener('touchstart', handler);
  }, [isMobile, mobileTooltipData]);

  // Handle chart click/touch for mobile tooltip
  const handleChartClick = useCallback((state: any) => {
    if (!isMobile || !state?.activePayload?.length) return;
    const payload = state.activePayload;
    const label = state.activeLabel;
    const monthData = filteredData.find(d => d.month === label);
    setMobileTooltipData({
      label,
      hasRealizado: monthData?.hasRealizado ?? false,
      receitasRealizado: payload.find((p: any) => p.dataKey === "receitasRealizado")?.value || 0,
      receitasOrcado: payload.find((p: any) => p.dataKey === "receitasOrcado")?.value || 0,
      despesasRealizado: payload.find((p: any) => p.dataKey === "despesasRealizado")?.value || 0,
      despesasOrcado: payload.find((p: any) => p.dataKey === "despesasOrcado")?.value || 0,
      resultadoRealizado: payload.find((p: any) => p.dataKey === "resultadoRealizado")?.value || 0,
      resultadoOrcado: payload.find((p: any) => p.dataKey === "resultadoOrcado")?.value || 0,
    });
  }, [isMobile, filteredData]);

  // Desktop floating tooltip
  const DesktopTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthData = filteredData.find(d => d.month === label);
      return (
        <div className="bg-card border border-border rounded-xl shadow-xl p-4 min-w-[280px]">
          <TooltipBody
            label={label}
            hasRealizado={monthData?.hasRealizado ?? false}
            receitasRealizado={payload.find((p: any) => p.dataKey === "receitasRealizado")?.value || 0}
            receitasOrcado={payload.find((p: any) => p.dataKey === "receitasOrcado")?.value || 0}
            despesasRealizado={payload.find((p: any) => p.dataKey === "despesasRealizado")?.value || 0}
            despesasOrcado={payload.find((p: any) => p.dataKey === "despesasOrcado")?.value || 0}
            resultadoRealizado={payload.find((p: any) => p.dataKey === "resultadoRealizado")?.value || 0}
            resultadoOrcado={payload.find((p: any) => p.dataKey === "resultadoOrcado")?.value || 0}
          />
        </div>
      );
    }
    return null;
  };

  // Prepare chart data based on view mode
  const getChartData = () => {
    return filteredData.map((d) => ({
      month: d.month,
      receitasRealizado: d.totalReceitas,
      despesasRealizado: d.totalDespesas,
      resultadoRealizado: d.resultado,
      receitasOrcado: d.totalReceitasOrcado,
      despesasOrcado: d.totalDespesasOrcado,
      resultadoOrcado: d.resultadoOrcado,
      totalReceitas: d.hasRealizado ? d.totalReceitas : d.totalReceitasOrcado,
      totalDespesas: d.hasRealizado ? d.totalDespesas : d.totalDespesasOrcado,
      resultado: d.hasRealizado ? d.resultado : d.resultadoOrcado,
      hasRealizado: d.hasRealizado,
    }));
  };

  const chartData = getChartData();

  return (
    <Card className="shadow-sm relative" ref={cardRef}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              Receitas vs. Despesas ao Longo do Ano {year && `(${year})`}
            </CardTitle>
            <p className="text-base text-muted-foreground">
              Evolução mensal comparativa com destaque para meses negativos
            </p>
          </div>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="mt-2">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
            <TabsTrigger value="realizado">Realizado</TabsTrigger>
            <TabsTrigger value="orcado">Orçado</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="relative">
        {/* Mobile fixed tooltip with overlay */}
        {isMobile && mobileTooltipData && (
          <>
            {/* Overlay */}
            <div
              data-mobile-tooltip-overlay
              className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
              style={{ zIndex: 9998 }}
              onClick={() => setMobileTooltipData(null)}
            />
            {/* Fixed tooltip panel */}
            <div
              className="fixed left-[5%] right-[5%] bg-card border border-border rounded-xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto"
              style={{ zIndex: 9999, top: '50%', transform: 'translateY(-50%)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end mb-1">
                <button
                  data-mobile-tooltip-close
                  onClick={() => setMobileTooltipData(null)}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <TooltipBody {...mobileTooltipData} />
            </div>
          </>
        )}

        <div className={isMobile ? "overflow-x-auto -mx-4 px-4" : ""}>
          <div className={isMobile ? "h-[350px]" : "h-[400px]"} style={isMobile ? { minWidth: `${Math.max(600, chartData.length * 60)}px` } : undefined}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                onClick={isMobile ? handleChartClick : undefined}
              >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                tickFormatter={formatValue}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              {/* On mobile: hide recharts tooltip, use our fixed one instead */}
              {!isMobile && <Tooltip content={<DesktopTooltip />} />}
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="5 5" />
              
              {viewMode === "comparativo" && (
                <>
                  <Line type="monotone" dataKey="receitasRealizado" name="Receitas Realizado" stroke="hsl(var(--revenue))" strokeWidth={3} dot={{ fill: "hsl(var(--revenue))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "hsl(var(--revenue))" }} />
                  <Line type="monotone" dataKey="receitasOrcado" name="Receitas Orçado" stroke="hsl(var(--revenue))" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "hsl(var(--revenue))", strokeWidth: 1, r: 3 }} opacity={0.6} />
                  <Line type="monotone" dataKey="despesasRealizado" name="Despesas Realizado" stroke="hsl(var(--expense))" strokeWidth={3} dot={{ fill: "hsl(var(--expense))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "hsl(var(--expense))" }} />
                  <Line type="monotone" dataKey="despesasOrcado" name="Despesas Orçado" stroke="hsl(var(--expense))" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "hsl(var(--expense))", strokeWidth: 1, r: 3 }} opacity={0.6} />
                  <Line type="monotone" dataKey="resultadoRealizado" name="Resultado Realizado" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "hsl(var(--chart-1))" }} />
                  <Line type="monotone" dataKey="resultadoOrcado" name="Resultado Orçado" stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 1, r: 3 }} opacity={0.6} />
                </>
              )}
              
              {viewMode === "realizado" && (
                <>
                  <Line type="monotone" dataKey="receitasRealizado" name="Receitas Totais" stroke="hsl(var(--revenue))" strokeWidth={3} dot={{ fill: "hsl(var(--revenue))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "hsl(var(--revenue))" }} />
                  <Line type="monotone" dataKey="despesasRealizado" name="Despesas Totais" stroke="hsl(var(--expense))" strokeWidth={3} dot={{ fill: "hsl(var(--expense))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "hsl(var(--expense))" }} />
                  <Line type="monotone" dataKey="resultadoRealizado" name="Resultado Mensal" stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="5 5" dot={(props: any) => { const { cx, cy, payload } = props; const isNegative = payload.resultadoRealizado < 0; return (<circle cx={cx} cy={cy} r={isNegative ? 6 : 4} fill={isNegative ? "hsl(var(--expense))" : "hsl(var(--chart-1))"} stroke={isNegative ? "hsl(var(--expense))" : "hsl(var(--chart-1))"} strokeWidth={2} />); }} />
                </>
              )}
              
              {viewMode === "orcado" && (
                <>
                  <Line type="monotone" dataKey="receitasOrcado" name="Receitas Orçadas" stroke="hsl(var(--revenue))" strokeWidth={3} dot={{ fill: "hsl(var(--revenue))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "hsl(var(--revenue))" }} />
                  <Line type="monotone" dataKey="despesasOrcado" name="Despesas Orçadas" stroke="hsl(var(--expense))" strokeWidth={3} dot={{ fill: "hsl(var(--expense))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "hsl(var(--expense))" }} />
                  <Line type="monotone" dataKey="resultadoOrcado" name="Resultado Orçado" stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="5 5" dot={(props: any) => { const { cx, cy, payload } = props; const isNegative = payload.resultadoOrcado < 0; return (<circle cx={cx} cy={cy} r={isNegative ? 6 : 4} fill={isNegative ? "hsl(var(--expense))" : "hsl(var(--chart-1))"} stroke={isNegative ? "hsl(var(--expense))" : "hsl(var(--chart-1))"} strokeWidth={2} />); }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
