import { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DynamicBudgetComparison, DynamicMonthlyData, CategoryDefinition } from "@/lib/excelParser";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type CategoryFilter = "all" | "revenue" | "expense";
type PeriodMode = "annual" | "custom";

interface BudgetComparisonChartProps {
  data: DynamicBudgetComparison[];
  showPercentage: boolean;
  year?: string;
  // New props for period filtering
  monthlyData?: DynamicMonthlyData[];
  availableMonths?: string[];
  revenueCategories?: CategoryDefinition[];
  expenseCategories?: CategoryDefinition[];
  // Optional default overrides
  defaultPeriodMode?: PeriodMode;
  defaultCategoryFilter?: CategoryFilter;
  defaultPeriodStart?: string;
  defaultPeriodEnd?: string;
}

export function BudgetComparisonChart({ 
  data, 
  showPercentage, 
  year,
  monthlyData,
  availableMonths,
  revenueCategories,
  expenseCategories,
  defaultPeriodMode,
  defaultCategoryFilter,
  defaultPeriodStart,
  defaultPeriodEnd,
}: BudgetComparisonChartProps) {
  const isMobile = useIsMobile();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(defaultCategoryFilter || "all");
  const [periodMode, setPeriodMode] = useState<PeriodMode>(defaultPeriodMode || "annual");
  const [periodStart, setPeriodStart] = useState<string>(defaultPeriodStart || "");
  const [periodEnd, setPeriodEnd] = useState<string>(defaultPeriodEnd || "");
  const [mobileTooltipData, setMobileTooltipData] = useState<any>(null);

  const hasPeriodSupport = !!(monthlyData?.length && availableMonths?.length && revenueCategories && expenseCategories);

  // Initialize period selectors when months become available
  const months = availableMonths || [];
  const effectiveStart = periodStart || months[0] || "";
  const effectiveEnd = periodEnd || months[months.length - 1] || "";

  // Compute budget comparisons from monthly data for a given period
  const periodData = useMemo<DynamicBudgetComparison[]>(() => {
    if (periodMode === "annual" || !hasPeriodSupport) return data;

    const startIdx = months.indexOf(effectiveStart);
    const endIdx = months.indexOf(effectiveEnd);
    if (startIdx === -1 || endIdx === -1) return data;

    const selectedMonthlyData = monthlyData!.filter(m => {
      const idx = months.indexOf(m.month);
      return idx >= startIdx && idx <= endIdx;
    });

    if (selectedMonthlyData.length === 0) return data;

    const result: DynamicBudgetComparison[] = [];

    // Revenue categories
    const totalRevOrcado = selectedMonthlyData.reduce((s, m) => s + (m.totalReceitasOrcado || 0), 0);
    const totalRevRealizado = selectedMonthlyData.reduce((s, m) => s + m.totalReceitas, 0);
    result.push({
      categoria: "Receitas Totais",
      categoryKey: "total_receitas",
      orcado: totalRevOrcado,
      realizado: totalRevRealizado,
      variacaoPercentual: totalRevOrcado !== 0 ? ((totalRevRealizado - totalRevOrcado) / totalRevOrcado) * 100 : 0,
      variacaoAbsoluta: totalRevRealizado - totalRevOrcado,
      type: "revenue",
    });

    for (const cat of revenueCategories!) {
      const orcado = selectedMonthlyData.reduce((s, m) => s + (m.revenuesOrcado?.[cat.key] || 0), 0);
      const realizado = selectedMonthlyData.reduce((s, m) => s + (m.revenues?.[cat.key] || 0), 0);
      const variation = orcado !== 0 ? ((realizado - orcado) / orcado) * 100 : 0;
      result.push({
        categoria: cat.label,
        categoryKey: cat.key,
        orcado,
        realizado,
        variacaoPercentual: variation,
        variacaoAbsoluta: realizado - orcado,
        type: "revenue",
      });
    }

    // Expense categories
    const totalExpOrcado = selectedMonthlyData.reduce((s, m) => s + (m.totalDespesasOrcado || 0), 0);
    const totalExpRealizado = selectedMonthlyData.reduce((s, m) => s + m.totalDespesas, 0);
    result.push({
      categoria: "Despesas Totais",
      categoryKey: "total_despesas",
      orcado: totalExpOrcado,
      realizado: totalExpRealizado,
      variacaoPercentual: totalExpOrcado !== 0 ? ((totalExpRealizado - totalExpOrcado) / totalExpOrcado) * 100 : 0,
      variacaoAbsoluta: totalExpRealizado - totalExpOrcado,
      type: "expense",
    });

    for (const cat of expenseCategories!) {
      const orcado = selectedMonthlyData.reduce((s, m) => s + (m.expensesOrcado?.[cat.key] || 0), 0);
      const realizado = selectedMonthlyData.reduce((s, m) => s + (m.expenses?.[cat.key] || 0), 0);
      const variation = orcado !== 0 ? ((realizado - orcado) / orcado) * 100 : 0;
      result.push({
        categoria: cat.label,
        categoryKey: cat.key,
        orcado,
        realizado,
        variacaoPercentual: variation,
        variacaoAbsoluta: realizado - orcado,
        type: "expense",
      });
    }

    return result;
  }, [periodMode, hasPeriodSupport, data, monthlyData, months, effectiveStart, effectiveEnd, revenueCategories, expenseCategories]);

  const TOTAL_PATTERNS = ["RECEITAS TOTAIS", "DESPESAS TOTAIS", "TOTAL DE RECEITAS", "TOTAL DE DESPESAS", "TOTAL RECEITAS", "TOTAL DESPESAS"];
  const isTotalCategory = (cat: string) => TOTAL_PATTERNS.some(p => cat.toUpperCase().includes(p));

  // Filter by type then by non-zero data
  const filteredData = periodData
    .filter(item => {
      if (categoryFilter === "all") return true;
      return item.type === categoryFilter;
    })
    .filter(item => item.orcado > 0 || item.realizado > 0);

  const regularData = filteredData.filter(item => !isTotalCategory(item.categoria));
  const totalData = filteredData.filter(item => isTotalCategory(item.categoria));
  
  const makeChartData = (items: typeof filteredData) => items.map((item) => ({
    ...item,
    isTotal: isTotalCategory(item.categoria),
    orcadoDisplay: showPercentage ? 100 : item.orcado / 1000,
    realizadoDisplay: showPercentage
      ? item.orcado > 0
        ? (item.realizado / item.orcado) * 100
        : 0
      : item.realizado / 1000,
  }));

  const chartData = makeChartData(regularData);
  const chartTotalData = makeChartData(totalData);

  const formatValue = (value: number) => {
    if (showPercentage) return `${value.toFixed(0)}%`;
    return `R$ ${value.toFixed(0)}k`;
  };

  // Compute tooltip content from originalData
  const getTooltipContent = (label: string) => {
    const originalData = filteredData.find((d) => d.categoria === label);
    const orcado = originalData?.orcado || 0;
    const realizado = originalData?.realizado || 0;
    const isAbove = realizado > orcado;
    const variacao = orcado !== 0 ? Math.abs(((realizado - orcado) / orcado) * 100) : 0;
    const isRevenue = originalData?.type === "revenue";
    const isFutureOnly = realizado === 0 && orcado > 0;

    let statusLabel: string;
    let statusColor: string;
    if (isFutureOnly) {
      statusLabel = "Programado"; statusColor = "text-muted-foreground";
    } else if (isRevenue) {
      if (isAbove) { statusLabel = "Superávit"; statusColor = "text-revenue"; }
      else if (realizado === orcado) { statusLabel = "No Orçado"; statusColor = "text-muted-foreground"; }
      else { statusLabel = "A realizar"; statusColor = "text-yellow-500"; }
    } else {
      if (isAbove) { statusLabel = "Excesso"; statusColor = "text-expense"; }
      else if (realizado === orcado) { statusLabel = "No Orçado"; statusColor = "text-muted-foreground"; }
      else { statusLabel = "Economia"; statusColor = "text-revenue"; }
    }

    return { label, orcado, realizado, isAbove, variacao, statusLabel, statusColor, isFutureOnly };
  };

  const TooltipBodyDesktop = ({ orcado, realizado, isAbove, variacao, statusLabel, statusColor, isFutureOnly }: ReturnType<typeof getTooltipContent>) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{isFutureOnly ? "Orçado (Previsão):" : "Orçado:"}</span>
        <span className="text-sm font-semibold text-budget">
          R$ {new Intl.NumberFormat("pt-BR").format(orcado)}
        </span>
      </div>
      {!isFutureOnly && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Realizado:</span>
          <span className="text-sm font-semibold text-primary">
            R$ {new Intl.NumberFormat("pt-BR").format(realizado)}
          </span>
        </div>
      )}
      <div className="flex justify-between items-center pt-1 border-t border-border">
        <span className="text-sm text-muted-foreground">{statusLabel}:</span>
        <span className={cn("text-sm font-bold", statusColor)}>
          {isFutureOnly ? "Aguardando período" : `${isAbove ? "+" : ""}${variacao.toFixed(2)}%`}
        </span>
      </div>
    </div>
  );

  const TooltipBodyMobile = ({ orcado, realizado, isAbove, variacao, statusLabel, statusColor, isFutureOnly }: ReturnType<typeof getTooltipContent>) => (
    <div className="space-y-3">
      <div className={cn("grid gap-3", isFutureOnly ? "grid-cols-1" : "grid-cols-2")}>
        <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/50">
          <span className="text-xs text-muted-foreground block mb-1">{isFutureOnly ? "Orçado (Previsão)" : "Orçado"}</span>
          <span className="text-sm font-semibold text-budget">
            R$ {new Intl.NumberFormat("pt-BR").format(orcado)}
          </span>
        </div>
        {!isFutureOnly && (
          <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-xs text-muted-foreground block mb-1">Realizado</span>
            <span className="text-sm font-semibold text-primary">
              R$ {new Intl.NumberFormat("pt-BR").format(realizado)}
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center pt-1 border-t border-border">
        <span className="text-sm text-muted-foreground">{statusLabel}:</span>
        <span className={cn("text-sm font-bold", statusColor)}>
          {isFutureOnly ? "Aguardando período" : `${isAbove ? "+" : ""}${variacao.toFixed(2)}%`}
        </span>
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const content = getTooltipContent(label);
      return (
        <div className="bg-card border border-border rounded-lg shadow-xl p-4 min-w-[220px]">
          <p className="font-bold text-foreground text-base mb-3 border-b border-border pb-2">{content.label}</p>
          <TooltipBodyDesktop {...content} />
        </div>
      );
    }
    return null;
  };

  // Handle chart click for mobile fixed tooltip
  const handleChartClick = useCallback((state: any) => {
    if (!isMobile || !state?.activeLabel) return;
    setMobileTooltipData(getTooltipContent(state.activeLabel));
  }, [isMobile, filteredData]);

  const periodLabel = periodMode === "custom" && hasPeriodSupport
    ? `${effectiveStart} a ${effectiveEnd}`
    : "";

  const title = year 
    ? `Comparativo Orçado vs. Realizado ${year}`
    : "Comparativo Orçado vs. Realizado";

  return (
    <Card className={cn("shadow-sm h-full", isMobile && "border-0 shadow-none rounded-none")}>
      <CardHeader className={cn("pb-3", isMobile && "px-1")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-semibold">
              {title}
            </CardTitle>
            <p className="text-base text-muted-foreground mt-1">
              {showPercentage ? "Valores em percentual do orçado" : "Valores em R$ mil"}
              {periodLabel && ` • ${periodLabel}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Period mode */}
            {hasPeriodSupport && (
              <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="custom">Por período</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Period range selectors */}
            {hasPeriodSupport && periodMode === "custom" && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={effectiveStart} onValueChange={setPeriodStart}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">a</span>
                <Select value={effectiveEnd} onValueChange={setPeriodEnd}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="revenue">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("relative", isMobile && "px-1")}>
        {/* Mobile fixed tooltip overlay */}
        {isMobile && mobileTooltipData && (
          <>
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
              style={{ zIndex: 9998 }}
              onClick={() => setMobileTooltipData(null)}
            />
            <div
              className="fixed left-[5%] right-[5%] bg-card border border-border rounded-xl shadow-2xl p-4"
              style={{ zIndex: 9999, top: '50%', transform: 'translateY(-50%)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-row items-center justify-between mb-3 border-b border-border pb-2">
                <p className="font-bold text-foreground text-base leading-tight">{mobileTooltipData.label}</p>
                <button
                  onClick={() => setMobileTooltipData(null)}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground flex-shrink-0 ml-2"
                >
                  <X className="w-5 h-5 translate-y-[0.5px]" />
                </button>
              </div>
              <TooltipBodyMobile {...mobileTooltipData} />
            </div>
          </>
        )}

        <div style={{ height: isMobile ? `${Math.max(400, chartData.length * 40)}px` : "480px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: isMobile ? 10 : 30, left: isMobile ? 0 : 10, bottom: 0 }}
              barGap={2}
              barCategoryGap="20%"
              onClick={isMobile ? handleChartClick : undefined}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tickFormatter={formatValue}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 9 : 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                type="category"
                dataKey="categoria"
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const maxChars = isMobile ? 12 : 18;
                  const label = payload.value.length > maxChars
                    ? payload.value.substring(0, maxChars) + "…"
                    : payload.value;
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="end"
                      fill="hsl(var(--foreground))"
                      fontSize={isMobile ? 8 : 10}
                      fontWeight={500}
                    >
                      {label}
                    </text>
                  );
                }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 75 : 130}
              />
              {!isMobile && <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />}
              {isMobile && <Tooltip content={() => null} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />}
              <Legend
                wrapperStyle={{ paddingTop: 15 }}
                formatter={(value) => <span className="text-foreground text-sm font-medium">{value}</span>}
              />
              <Bar
                dataKey="orcadoDisplay"
                name="Orçado"
                fill="hsl(var(--budget))"
                radius={[0, 4, 4, 0]}
                barSize={10}
              />
              <Bar
                dataKey="realizadoDisplay"
                name="Realizado"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                barSize={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Separator + Total bars */}
        {chartTotalData.length > 0 && (
          <div className="mt-2">
            <div className="border-t-2 border-dashed border-border my-3" />
            <div style={{ height: `${chartTotalData.length * 60}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartTotalData}
                  layout="vertical"
                  margin={{ top: 0, right: isMobile ? 10 : 30, left: isMobile ? 0 : 10, bottom: 0 }}
                  barGap={2}
                  barCategoryGap="20%"
                  onClick={isMobile ? handleChartClick : undefined}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="categoria"
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      const maxChars = isMobile ? 12 : 18;
                      const label = payload.value.length > maxChars
                        ? payload.value.substring(0, maxChars) + "…"
                        : payload.value;
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={4}
                          textAnchor="end"
                          fill="hsl(var(--foreground))"
                          fontSize={isMobile ? 9 : 11}
                          fontWeight={700}
                        >
                          {label}
                        </text>
                      );
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={isMobile ? 75 : 130}
                  />
                  {!isMobile && <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />}
                  {isMobile && <Tooltip content={() => null} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />}
                  <Bar
                    dataKey="orcadoDisplay"
                    name="Orçado"
                    fill="hsl(var(--budget))"
                    fillOpacity={0.6}
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                  <Bar
                    dataKey="realizadoDisplay"
                    name="Realizado"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
