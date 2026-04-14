import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { DynamicMonthlyData, CategoryDefinition } from "@/lib/excelParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { filterExcludedCategories } from "@/lib/categoryFilters";
import { useIsMobile } from "@/hooks/use-mobile";

interface CompositionChartProps {
  data: DynamicMonthlyData[];
  selectedMonths: string[];
  revenueCategories: CategoryDefinition[];
  expenseCategories: CategoryDefinition[];
}

const REVENUE_COLOR = "hsl(152, 58%, 42%)";
const EXPENSE_COLOR = "hsl(0, 65%, 51%)";

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function CompositionChart({ 
  data, 
  selectedMonths, 
  revenueCategories, 
  expenseCategories 
}: CompositionChartProps) {
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [dataType, setDataType] = useState<"realizado" | "orcado">("realizado");
  const [mobileTooltipData, setMobileTooltipData] = useState<{ name: string; value: number; isTotal: boolean; total: number } | null>(null);

  useEffect(() => {
    if (data.length > 0 && selectedMonths.length > 0) {
      const monthWithRealizado = data.find(d => selectedMonths.includes(d.month) && d.hasRealizado);
      if (monthWithRealizado) {
        setSelectedMonth(monthWithRealizado.month);
      } else if (!selectedMonths.includes(selectedMonth)) {
        setSelectedMonth(selectedMonths[selectedMonths.length - 1]);
      }
    }
  }, [data.length, selectedMonths.join(",")]);

  const monthData = data.find((d) => d.month === selectedMonth);

  const TOTAL_PATTERNS = ["TOTAL DE RECEITAS", "TOTAL DE DESPESAS", "TOTAL RECEITAS", "TOTAL DESPESAS", "RECEITAS TOTAIS", "DESPESAS TOTAIS"];
  const isTotalCategory = (label: string) => TOTAL_PATTERNS.some(p => label.toUpperCase().includes(p));

  const revenueData = useMemo(() => {
    if (!monthData) return [];
    const values = dataType === "realizado" ? monthData.revenues : (monthData.revenuesOrcado || {});
    const categories = filterExcludedCategories(revenueCategories)
      .map((cat) => ({
        name: toTitleCase(cat.label),
        fullName: toTitleCase(cat.label),
        value: values[cat.key] || 0,
        isTotal: isTotalCategory(cat.label),
      }));
    const regular = categories.filter(c => !c.isTotal).sort((a, b) => b.value - a.value);
    const totals = categories.filter(c => c.isTotal);
    return [...regular, ...totals];
  }, [monthData, revenueCategories, dataType]);

  const expenseData = useMemo(() => {
    if (!monthData) return [];
    const values = dataType === "realizado" ? monthData.expenses : (monthData.expensesOrcado || {});
    const categories = expenseCategories
      .map((cat) => ({
        name: toTitleCase(cat.label),
        fullName: toTitleCase(cat.label),
        value: values[cat.key] || 0,
        isTotal: isTotalCategory(cat.label),
      }));
    const regular = categories.filter(c => !c.isTotal).sort((a, b) => b.value - a.value);
    const totals = categories.filter(c => c.isTotal);
    return [...regular, ...totals];
  }, [monthData, expenseCategories, dataType]);

  const revenueTotal = useMemo(() => revenueData.filter(d => !d.isTotal).reduce((s, d) => s + d.value, 0), [revenueData]);
  const expenseTotal = useMemo(() => expenseData.filter(d => !d.isTotal).reduce((s, d) => s + d.value, 0), [expenseData]);

  const formatValue = (value: number) => `R$ ${(value / 1000).toFixed(0)}k`;

  const formatBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (!value || value === 0) return null;
    const label = value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${new Intl.NumberFormat("pt-BR").format(value)}`;
    return (
      <text x={x + width + 6} y={y + height / 2} fill="hsl(var(--muted-foreground))" fontSize={10} dominantBaseline="middle">
        {label}
      </text>
    );
  };

  const createTooltip = (total: number) => {
    const CustomTooltip = ({ active, payload }: any) => {
      // Don't render tooltip on mobile to avoid the floating issue
      if (isMobile) return null;

      if (active && payload && payload.length) {
        const item = payload[0].payload;
        const value = payload[0].value;
        const isTotal = item.isTotal;
        const pct = isTotal ? "100.0" : (total > 0 ? ((value / total) * 100).toFixed(1) : "0.0");
        return (
          <div className="bg-card border border-border rounded-xl shadow-xl p-4 min-w-[220px]">
            <p className="font-bold text-foreground text-sm mb-2 border-b border-border pb-2">
              {item.fullName}
            </p>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Valor:</span>
              <span className="text-sm font-bold text-foreground">
                R$ {new Intl.NumberFormat("pt-BR").format(value)}
              </span>
            </div>
            {!isTotal && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Participação:</span>
                <span className="text-sm font-bold text-primary">{pct}%</span>
              </div>
            )}
          </div>
        );
      }
      return null;
    };
    return CustomTooltip;
  };

  const handleChartClick = useCallback((data: any, total: number) => {
    if (!isMobile || !data || !data.activePayload || data.activePayload.length === 0) {
      setMobileTooltipData(null);
      return;
    }
    
    const payload = data.activePayload[0].payload;
    setMobileTooltipData({
      name: payload.fullName,
      value: payload.value,
      isTotal: payload.isTotal,
      total: total
    });
  }, [isMobile]);

  const RevenueTooltip = useMemo(() => createTooltip(revenueTotal), [revenueTotal]);
  const ExpenseTooltip = useMemo(() => createTooltip(expenseTotal), [expenseTotal]);

  if (selectedMonths.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum dado disponível para exibição
        </CardContent>
      </Card>
    );
  }

  const renderChart = (chartData: any[], color: string, TooltipComponent: React.ComponentType<any>) => {
    const regularItems = chartData.filter((d: any) => !d.isTotal);
    const totalItems = chartData.filter((d: any) => d.isTotal);
    const hasTotals = totalItems.length > 0;
    const separatorIndex = regularItems.length; // position where separator goes

    return (
      <div>
        <div style={{ height: `${Math.max(isMobile ? 380 : 340, regularItems.length * (isMobile ? 38 : 32))}px` }}>
          {regularItems.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={regularItems}
                layout="vertical"
                margin={{ top: 10, right: isMobile ? 50 : 70, left: 10, bottom: 0 }}
                barGap={2}
                onClick={(data) => handleChartClick(data, totalItems.length > 0 ? (totalItems[0] as any).value : 0)}
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
                  dataKey="name"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: isMobile ? 9 : 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 120 : 180}
                />
                {!isMobile && <Tooltip content={<TooltipComponent />} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />}
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} fill={color}>
                  <LabelList dataKey="value" content={formatBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhum dado encontrado para este mês
            </div>
          )}
        </div>

        {/* Separator + Total bar */}
        {hasTotals && (
          <div className="mt-2">
            <div className="border-t-2 border-dashed border-border my-3" />
            <div style={{ height: `${totalItems.length * (isMobile ? 50 : 44)}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={totalItems}
                  layout="vertical"
                  margin={{ top: 0, right: isMobile ? 50 : 70, left: 10, bottom: 0 }}
                  barGap={2}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "hsl(var(--foreground))", fontSize: isMobile ? 10 : 12, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    width={isMobile ? 120 : 180}
                  />
                  {!isMobile && <Tooltip content={<TooltipComponent />} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />}
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22} fill={color} fillOpacity={0.6} onClick={(data) => {
                    if (isMobile && data) {
                      setMobileTooltipData({
                        name: data.payload.fullName,
                        value: data.value as number,
                        isTotal: true,
                        total: data.value as number
                      });
                    }
                  }}>
                    <LabelList dataKey="value" content={formatBarLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-xl font-semibold">
              Composição de Receitas e Despesas
            </CardTitle>
            <p className="text-base text-muted-foreground">
              Detalhamento por categoria do mês selecionado
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {selectedMonths.map((month) => {
                  const md = data.find(d => d.month === month);
                  return (
                    <SelectItem key={month} value={month}>
                      <div className="flex items-center gap-2">
                        {month}
                        {md?.hasRealizado && (
                          <span className="text-primary text-xs">●</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <Select value={dataType} onValueChange={(v) => setDataType(v as typeof dataType)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="orcado">Orçado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {monthData && (
          <Badge 
            variant={dataType === "realizado" ? "default" : "secondary"} 
            className="w-fit mt-2"
          >
            {dataType === "realizado" ? "Dados Realizados" : "Dados Orçados"}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="receitas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger 
              value="receitas" 
              className="data-[state=active]:bg-revenue data-[state=active]:text-revenue-foreground"
            >
              Receitas ({revenueData.length})
            </TabsTrigger>
            <TabsTrigger 
              value="despesas" 
              className="data-[state=active]:bg-expense data-[state=active]:text-expense-foreground"
            >
              Despesas ({expenseData.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="receitas" className="h-full">
            {renderChart(revenueData, REVENUE_COLOR, RevenueTooltip)}
          </TabsContent>
          <TabsContent value="despesas" className="h-full">
            {renderChart(expenseData, EXPENSE_COLOR, ExpenseTooltip)}
          </TabsContent>
        </Tabs>

        {/* Mobile Fixed Tooltip Overlay */}
        {isMobile && mobileTooltipData && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-background/80 backdrop-blur-sm border-t animate-in slide-in-from-bottom-full pb-safe">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-4 max-w-md mx-auto">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-foreground text-sm border-b border-border pb-2 flex-1 mr-4">
                  {mobileTooltipData.name}
                </p>
                <button 
                  onClick={() => setMobileTooltipData(null)}
                  className="text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1"
                >
                  ✕
                </button>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Valor:</span>
                <span className="text-sm font-bold text-foreground">
                  R$ {new Intl.NumberFormat("pt-BR").format(mobileTooltipData.value)}
                </span>
              </div>
              {!mobileTooltipData.isTotal && mobileTooltipData.total > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Participação:</span>
                  <span className="text-sm font-bold text-primary">
                    {((mobileTooltipData.value / mobileTooltipData.total) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}