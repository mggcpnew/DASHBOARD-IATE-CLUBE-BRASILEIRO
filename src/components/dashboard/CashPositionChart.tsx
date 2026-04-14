import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
  Line,
  ComposedChart,
  Bar,
} from "recharts";
import { DynamicMonthlyData } from "@/lib/excelParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface CashPositionChartProps {
  data: DynamicMonthlyData[];
  selectedMonths: string[];
  initialCashPosition?: number;
  year?: string;
}

export function CashPositionChart({ 
  data, 
  selectedMonths, 
  initialCashPosition = 0,
  year 
}: CashPositionChartProps) {
  const isMobile = useIsMobile();
  const [showResultado, setShowResultado] = useState(true);
  const filteredData = data.filter((d) => selectedMonths.includes(d.month));
  
  const chartData = [
    ...(initialCashPosition > 0 ? [{ 
      month: "Inicial", 
      posicaoCaixaFinal: initialCashPosition,
      posicaoCaixaFinalOrcado: initialCashPosition,
      resultado: 0,
      resultadoOrcado: 0,
      hasRealizado: true,
    }] : []),
    ...filteredData.map((d) => ({
      month: d.month,
      posicaoCaixaFinal: d.hasRealizado ? d.posicaoCaixaFinal : 0,
      posicaoCaixaFinalOrcado: d.posicaoCaixaFinalOrcado || d.posicaoCaixaFinal,
      resultado: d.hasRealizado ? d.resultado : 0,
      resultadoOrcado: d.resultadoOrcado || d.resultado,
      hasRealizado: d.hasRealizado,
    })),
  ];

  // For display, use realizado if available, otherwise orcado
  const displayData = chartData.map(d => ({
    ...d,
    displayCaixa: d.hasRealizado ? d.posicaoCaixaFinal : d.posicaoCaixaFinalOrcado,
    displayResultado: d.hasRealizado ? d.resultado : d.resultadoOrcado,
  }));

  const cashValues = displayData.map(d => d.displayCaixa).filter(v => v > 0);
  const maxValue = Math.max(...cashValues);
  const minValue = Math.min(...cashValues);
  const maxPoint = displayData.find((d) => d.displayCaixa === maxValue);
  const minPoint = displayData.find((d) => d.displayCaixa === minValue);

  const formatValue = (value: number) => {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = displayData.find(d => d.month === label);
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-foreground">{label}</p>
            {dataPoint?.hasRealizado ? (
              <Badge variant="default" className="text-xs">Realizado</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Orçado (Previsão)</Badge>
            )}
          </div>
          {dataPoint?.hasRealizado ? (
            <p className="text-sm text-cash">
              Posição de Caixa: R$ {new Intl.NumberFormat("pt-BR").format(dataPoint?.displayCaixa || 0)}
            </p>
          ) : (
            <p className="text-sm text-cash">
              Orçado (Previsão): R$ {new Intl.NumberFormat("pt-BR").format(dataPoint?.displayCaixa || 0)}
            </p>
          )}
          {showResultado && (
            dataPoint?.hasRealizado ? (
              <p className={`text-sm ${(dataPoint?.displayResultado || 0) >= 0 ? 'text-revenue' : 'text-expense'}`}>
                Resultado: R$ {new Intl.NumberFormat("pt-BR").format(dataPoint?.displayResultado || 0)}
              </p>
            ) : (
              <p className={`text-sm ${(dataPoint?.displayResultado || 0) >= 0 ? 'text-revenue' : 'text-expense'}`}>
                Resultado Orçado: R$ {new Intl.NumberFormat("pt-BR").format(dataPoint?.displayResultado || 0)}
              </p>
            )
          )}
        </div>
      );
    }
    return null;
  };

  const title = year 
    ? `Evolução da Posição de Caixa Final (${year})`
    : "Evolução da Posição de Caixa Final";

  return (
    <Card className={cn("shadow-sm", isMobile && "border-0 shadow-none rounded-none")}>
      <CardHeader className={cn("pb-3", isMobile && "px-2")}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              {title}
            </CardTitle>
            <p className="text-base text-muted-foreground">
              Trajetória mensal com destaque para valores máximos e mínimos
            </p>
          </div>
        </div>
        <Tabs 
          value={showResultado ? "with-resultado" : "only-cash"} 
          onValueChange={(v) => setShowResultado(v === "with-resultado")}
          className="mt-2"
        >
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="with-resultado">Com Resultado</TabsTrigger>
            <TabsTrigger value="only-cash">Apenas Caixa</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className={cn(isMobile && "px-2")}>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayData} margin={{ top: 10, right: isMobile ? 10 : 30, left: isMobile ? -20 : 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--cash))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--cash))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                padding={{ left: isMobile ? 5 : 0, right: isMobile ? 5 : 0 }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={formatValue}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={isMobile ? 45 : 60}
              />
              {showResultado && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatValue}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  width={isMobile ? 45 : 60}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {showResultado && (
                <Bar
                  yAxisId="right"
                  dataKey="displayResultado"
                  name="Resultado Mensal"
                  fill="hsl(var(--chart-1))"
                  opacity={0.5}
                  radius={[4, 4, 0, 0]}
                />
              )}
              
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="displayCaixa"
                name="Posição de Caixa"
                stroke="hsl(var(--cash))"
                strokeWidth={3}
                fill="url(#cashGradient)"
                dot={{ fill: "hsl(var(--cash))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--cash))" }}
              />
              
              {maxPoint && maxPoint.displayCaixa > 0 && (
                <ReferenceDot
                  yAxisId="left"
                  x={maxPoint.month}
                  y={maxPoint.displayCaixa}
                  r={8}
                  fill="hsl(var(--revenue))"
                  stroke="white"
                  strokeWidth={2}
                  label={{
                    value: "Máx",
                    position: "top",
                    fill: "hsl(var(--revenue))",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                />
              )}
              {minPoint && minPoint !== maxPoint && minPoint.displayCaixa > 0 && (
                <ReferenceDot
                  yAxisId="left"
                  x={minPoint.month}
                  y={minPoint.displayCaixa}
                  r={8}
                  fill="hsl(var(--expense))"
                  stroke="white"
                  strokeWidth={2}
                  label={{
                    value: "Mín",
                    position: "bottom",
                    fill: "hsl(var(--expense))",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
