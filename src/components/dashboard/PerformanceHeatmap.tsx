import { DynamicMonthlyData, CategoryDefinition } from "@/lib/excelParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { filterExcludedCategories } from "@/lib/categoryFilters";

interface PerformanceHeatmapProps {
  data: DynamicMonthlyData[];
  revenueCategories: CategoryDefinition[];
  expenseCategories: CategoryDefinition[];
  selectedMonths: string[];
}

export function PerformanceHeatmap({
  data,
  revenueCategories,
  expenseCategories,
  selectedMonths,
}: PerformanceHeatmapProps) {
  const [activeTab, setActiveTab] = useState<"receitas" | "despesas">("receitas");
  
  const filteredData = data.filter((d) => selectedMonths.includes(d.month));
  
  // Filter out unwanted categories using shared utility
  const allCategories = activeTab === "receitas" ? revenueCategories : expenseCategories;
  const categories = filterExcludedCategories(allCategories);
  
  // Calculate performance for each category/month combination
  // Returns null for months without realized data (future months)
  const getPerformance = (monthData: DynamicMonthlyData, categoryKey: string): { value: number | null; isFuture: boolean } => {
    // If the month has no realized data, mark as future
    if (!monthData.hasRealizado) {
      return { value: null, isFuture: true };
    }

    const orcado = activeTab === "receitas" 
      ? monthData.revenuesOrcado?.[categoryKey] || 0
      : monthData.expensesOrcado?.[categoryKey] || 0;
    
    const realizado = activeTab === "receitas"
      ? monthData.revenues?.[categoryKey] || 0
      : monthData.expenses?.[categoryKey] || 0;
    
    if (orcado === 0 && realizado === 0) return { value: null, isFuture: false };
    if (orcado === 0 && realizado > 0) return { value: 100, isFuture: false };
    if (orcado === 0 && realizado < 0) return { value: -100, isFuture: false };
    
    return { value: ((realizado - orcado) / orcado) * 100, isFuture: false };
  };
  
  const getColor = (performance: number | null, isExpense: boolean, isFuture: boolean): string => {
    if (isFuture || performance === null) return "bg-muted/50 text-muted-foreground/50";
    
    if (isExpense) {
      if (performance >= 10) return "bg-expense/80 text-expense-foreground";
      if (performance >= 5) return "bg-expense/60 text-expense-foreground";
      if (performance > 0) return "bg-expense/40";
      if (performance >= -5) return "bg-revenue/40";
      if (performance >= -10) return "bg-revenue/60 text-revenue-foreground";
      return "bg-revenue/80 text-revenue-foreground";
    } else {
      if (performance >= 10) return "bg-revenue/80 text-revenue-foreground";
      if (performance >= 5) return "bg-revenue/60 text-revenue-foreground";
      if (performance > 0) return "bg-revenue/40";
      if (performance >= -5) return "bg-expense/40";
      if (performance >= -10) return "bg-expense/60 text-expense-foreground";
      return "bg-expense/80 text-expense-foreground";
    }
  };
  
  const formatPerformance = (perf: number | null, isFuture: boolean): string => {
    if (isFuture || perf === null) return "-";
    const sign = perf > 0 ? "+" : "";
    return `${sign}${perf.toFixed(1)}%`;
  };

  // Convert to Title Case
  const toTitleCase = (name: string): string => {
    return name
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const shortenName = (name: string): string => {
    const titled = toTitleCase(name);
    if (titled.length <= 20) return titled;
    return titled.substring(0, 17) + "...";
  };

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">
          Heatmap de Performance
        </CardTitle>
        <p className="text-base text-muted-foreground">
          Diferença % entre Realizado e Orçado por categoria e mês
        </p>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mt-2">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="receitas">Receitas</TabsTrigger>
            <TabsTrigger value="despesas">Despesas</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2.5 font-medium text-muted-foreground sticky left-0 bg-card min-w-[180px]">
                  Categoria
                </th>
                {filteredData.map((monthData) => (
                  <th 
                    key={monthData.month} 
                    className="text-center p-2.5 font-medium text-muted-foreground min-w-[70px]"
                  >
                    {monthData.month}
                    {monthData.hasRealizado && (
                      <span className="block text-xs text-primary">●</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.key} className="border-t border-border/50">
                  <td 
                    className="p-2.5 font-medium sticky left-0 bg-card text-sm"
                    title={category.label}
                  >
                    {shortenName(category.label)}
                  </td>
                  {filteredData.map((monthData) => {
                    const { value: performance, isFuture } = getPerformance(monthData, category.key);
                    const colorClass = getColor(performance, activeTab === "despesas", isFuture);
                    
                    return (
                      <td
                        key={`${category.key}-${monthData.month}`}
                        className={cn(
                          "text-center p-2 font-mono text-xs transition-colors",
                          colorClass
                        )}
                        title={`${toTitleCase(category.label)} - ${monthData.month}: ${formatPerformance(performance, isFuture)}`}
                      >
                        {formatPerformance(performance, isFuture)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {/* Total row */}
              <tr className="border-t-2 border-border font-semibold">
                 <td className="p-2.5 sticky left-0 bg-card text-sm">
                   Total {toTitleCase(activeTab)}
                 </td>
                 {filteredData.map((monthData) => {
                   const isFuture = !monthData.hasRealizado;
                   const orcado = activeTab === "receitas" 
                     ? monthData.totalReceitasOrcado 
                     : monthData.totalDespesasOrcado;
                   const realizado = activeTab === "receitas"
                     ? monthData.totalReceitas
                     : monthData.totalDespesas;
                   
                   const performance = isFuture ? null : (orcado > 0 ? ((realizado - orcado) / orcado) * 100 : null);
                   const colorClass = getColor(performance, activeTab === "despesas", isFuture);
                   
                   return (
                     <td
                       key={`total-${monthData.month}`}
                       className={cn(
                         "text-center p-2.5 font-mono text-sm",
                         colorClass
                       )}
                     >
                       {formatPerformance(performance, isFuture)}
                     </td>
                   );
                 })}
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm flex-wrap">
          {activeTab === "receitas" ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-revenue/80 rounded" />
                <span>Superávit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-muted/50 rounded" />
                <span>Sem dados / Futuro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-expense/80 rounded" />
                <span>Abaixo do orçado</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-revenue/80 rounded" />
                <span>Economia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-muted/50 rounded" />
                <span>Sem dados / Futuro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-expense/80 rounded" />
                <span>Gasto excedente</span>
              </div>
            </>
          )}
        </div>
        
        <p className="mt-3 text-sm text-center text-muted-foreground">
          ● indica mês com dados realizados
        </p>
      </CardContent>
    </Card>
  );
}
