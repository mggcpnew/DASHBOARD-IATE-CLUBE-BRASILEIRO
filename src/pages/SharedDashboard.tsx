import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSharedDashboard } from "@/hooks/useSharedDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ParsedExcelData, DynamicMonthlyData } from "@/lib/excelParser";
import { analyzeFinancialData, FinancialAnalysis } from "@/lib/financialAnalysis";
import { DelinquencyData } from "@/lib/delinquencyParser";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueExpenseChart } from "@/components/dashboard/RevenueExpenseChart";
import { BudgetComparisonChart } from "@/components/dashboard/BudgetComparisonChart";
import { CashPositionChart } from "@/components/dashboard/CashPositionChart";
import { SummaryTable } from "@/components/dashboard/SummaryTable";
import { CompositionChart } from "@/components/dashboard/CompositionChart";
import { PerformanceHeatmap } from "@/components/dashboard/PerformanceHeatmap";
import { DelinquencyPiePreview } from "@/components/dashboard/DelinquencyPiePreview";
import { CompetencePaymentChart } from "@/components/dashboard/CompetencePaymentChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Info, Eye, Loader2, AlertTriangle, ArrowLeft, Percent, DollarSign } from "lucide-react";
import timaoLogo from "@/assets/timao-icb.png";

interface DashboardKPIs {
  totalReceitas: number;
  totalReceitasOrcado: number;
  totalDespesas: number;
  totalDespesasOrcado: number;
  resultado: number;
  resultadoOrcado: number;
  posicaoCaixaFinal: number;
  posicaoCaixaOrcadaAnual: number;
  caixaComparisonLabel: string;
  variacaoReceitas: number;
  variacaoDespesas: number;
  variacaoResultado: number;
  variacaoCaixa: number;
  monthsWithRealizado: number;
}

export default function SharedDashboard() {
  const { shareId } = useParams<{ shareId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadSharedDashboard, isLoading, error } = useSharedDashboard();
  
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
  const [delinquencyData, setDelinquencyData] = useState<DelinquencyData | null>(null);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [showPercentage, setShowPercentage] = useState(true);

  // Aplica o tema recebido via query param
  useEffect(() => {
    const themeParam = searchParams.get("theme");
    if (themeParam === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (themeParam === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [searchParams]);

  useEffect(() => {
    if (shareId) {
      loadSharedDashboard(shareId).then((data) => {
        if (data) {
          // Extract delinquency data if embedded
          const rawData = data as any;
          if (rawData._delinquencyData) {
            setDelinquencyData(rawData._delinquencyData as DelinquencyData);
            delete rawData._delinquencyData;
          }
          setParsedData(data);
          if (data.months.length > 0) {
            setStartMonth(data.months[0]);
            setEndMonth(data.months[data.months.length - 1]);
          }
        }
      });
    }
  }, [shareId, loadSharedDashboard]);

  // Selected months based on filter range
  const selectedMonths = useMemo(() => {
    if (!parsedData) return [];
    
    const startIndex = parsedData.months.indexOf(startMonth);
    const endIndex = parsedData.months.indexOf(endMonth);
    
    if (startIndex === -1 || endIndex === -1) {
      return parsedData.months;
    }
    
    return parsedData.months.slice(startIndex, endIndex + 1);
  }, [parsedData, startMonth, endMonth]);

  // Filtered monthly data
  const filteredMonthlyData = useMemo((): DynamicMonthlyData[] => {
    if (!parsedData) return [];
    return parsedData.monthlyData.filter(d => selectedMonths.includes(d.month));
  }, [parsedData, selectedMonths]);

  // KPI calculations
  const kpis = useMemo((): DashboardKPIs => {
    if (!parsedData || filteredMonthlyData.length === 0) {
      return {
        totalReceitas: 0,
        totalReceitasOrcado: 0,
        totalDespesas: 0,
        totalDespesasOrcado: 0,
        resultado: 0,
        resultadoOrcado: 0,
        posicaoCaixaFinal: 0,
        posicaoCaixaOrcadaAnual: 0,
        variacaoReceitas: 0,
        variacaoDespesas: 0,
        variacaoResultado: 0,
        variacaoCaixa: 0,
        monthsWithRealizado: 0,
        caixaComparisonLabel: "vs. Orçado Anual",
      };
    }

    // Use ONLY months with realized data for KPI comparisons (same logic as useDynamicData)
    const monthsWithRealizadoData = filteredMonthlyData.filter(m => m.hasRealizado);
    
    const totals = monthsWithRealizadoData.reduce(
      (acc, d) => ({
        totalReceitas: acc.totalReceitas + d.totalReceitas,
        totalReceitasOrcado: acc.totalReceitasOrcado + (d.totalReceitasOrcado || 0),
        totalDespesas: acc.totalDespesas + d.totalDespesas,
        totalDespesasOrcado: acc.totalDespesasOrcado + (d.totalDespesasOrcado || 0),
        resultado: acc.resultado + d.resultado,
        resultadoOrcado: acc.resultadoOrcado + (d.resultadoOrcado || 0),
      }),
      { 
        totalReceitas: 0, 
        totalReceitasOrcado: 0,
        totalDespesas: 0, 
        totalDespesasOrcado: 0,
        resultado: 0,
        resultadoOrcado: 0,
      }
    );

    const monthsWithRealizado = monthsWithRealizadoData.length;
    
    // Variations comparing realized vs budgeted (same months only)
    const variacaoReceitas = totals.totalReceitasOrcado !== 0 
      ? ((totals.totalReceitas - totals.totalReceitasOrcado) / totals.totalReceitasOrcado) * 100 
      : 0;
    
    const variacaoDespesas = totals.totalDespesasOrcado !== 0 
      ? ((totals.totalDespesas - totals.totalDespesasOrcado) / totals.totalDespesasOrcado) * 100 
      : 0;
    
    const variacaoResultado = totals.resultadoOrcado !== 0 
      ? ((totals.resultado - totals.resultadoOrcado) / Math.abs(totals.resultadoOrcado)) * 100 
      : 0;
    
    // Projected cash position: realized cash + remaining budgeted results
    const lastRealizadoMonth = monthsWithRealizadoData[monthsWithRealizadoData.length - 1];
    const realizadoCaixaFinal = lastRealizadoMonth?.posicaoCaixaFinal || parsedData.initialCashPosition;
    
    const remainingMonths = parsedData.monthlyData.filter(m => !m.hasRealizado);
    const remainingBudgetedResult = remainingMonths.reduce(
      (acc, m) => acc + (m.resultadoOrcado || m.resultado || 0),
      0
    );
    
    const posicaoCaixaProjetada = realizadoCaixaFinal + remainingBudgetedResult;
    
    // Budgeted final cash for end of year
    const allMonthsData = parsedData.monthlyData;
    const lastMonthOfYear = allMonthsData[allMonthsData.length - 1];
    const posicaoCaixaOrcadaAnual = lastMonthOfYear?.posicaoCaixaFinalOrcado || 0;
    
    // Try budgeted annual first; fallback to initial cash position
    const caixaComparacao = posicaoCaixaOrcadaAnual > 0 
      ? posicaoCaixaOrcadaAnual 
      : parsedData.initialCashPosition;
    
    const caixaComparisonLabel = posicaoCaixaOrcadaAnual > 0 
      ? "vs. Orçado Anual" 
      : "vs. Saldo Inicial";
    
    const rawVariacaoCaixa = caixaComparacao !== 0 
      ? ((posicaoCaixaProjetada - caixaComparacao) / Math.abs(caixaComparacao)) * 100 
      : 0;
    const variacaoCaixa = Math.abs(rawVariacaoCaixa) < 1e-9 ? 0 : rawVariacaoCaixa;

    return {
      totalReceitas: totals.totalReceitas,
      totalReceitasOrcado: totals.totalReceitasOrcado,
      totalDespesas: totals.totalDespesas,
      totalDespesasOrcado: totals.totalDespesasOrcado,
      resultado: totals.resultado,
      resultadoOrcado: totals.resultadoOrcado,
      posicaoCaixaFinal: posicaoCaixaProjetada,
      posicaoCaixaOrcadaAnual: caixaComparacao,
      caixaComparisonLabel,
      variacaoReceitas,
      variacaoDespesas,
      variacaoResultado,
      variacaoCaixa,
      monthsWithRealizado,
    };
  }, [parsedData, filteredMonthlyData]);

  // Financial Analysis
  const analysis = useMemo((): FinancialAnalysis | null => {
    if (!parsedData || filteredMonthlyData.length === 0) {
      return null;
    }
    
    return analyzeFinancialData(parsedData, filteredMonthlyData, kpis);
  }, [parsedData, filteredMonthlyData, kpis]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !parsedData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Dashboard não encontrado</h1>
            <p className="text-muted-foreground">
              {error || "O link que você está tentando acessar não existe ou foi removido."}
            </p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ir para a página inicial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Read Only Banner */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="max-w-[1920px] mx-auto px-6 py-2 flex items-center justify-center gap-2 text-sm text-primary">
          <Eye className="h-4 w-4" />
          <span>Visualização somente leitura</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <img src={timaoLogo} alt="ICB Logo" className="h-[70px] w-[70px] object-contain" />
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                IATE CLUBE BRASILEIRO
              </h1>
              <p className="text-base text-muted-foreground">
                Fluxo de Caixa {parsedData.year}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-8">
        {/* Filter Controls - Read Only */}
        {/* Desktop filter layout */}
        <div className="hidden md:flex bg-card rounded-xl p-6 shadow-sm border flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <Select value={startMonth} onValueChange={setStartMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Início" />
              </SelectTrigger>
              <SelectContent>
                {parsedData.months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">até</span>
            <Select value={endMonth} onValueChange={setEndMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Fim" />
              </SelectTrigger>
              <SelectContent>
                {parsedData.months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPercentage(!showPercentage)}
            className={cn(
              "gap-2",
              showPercentage && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {showPercentage ? (
              <><Percent className="h-4 w-4" />Percentual</>
            ) : (
              <><DollarSign className="h-4 w-4" />Absoluto</>
            )}
          </Button>
        </div>

        {/* Mobile filter layout */}
        <div className="md:hidden bg-card rounded-xl p-3 shadow-sm border space-y-2">
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Período:</span>
            <Select value={startMonth} onValueChange={setStartMonth}>
              <SelectTrigger className="flex-1 h-9 text-xs rounded-lg">
                <SelectValue placeholder="Início" />
              </SelectTrigger>
              <SelectContent>
                {parsedData.months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">até</span>
            <Select value={endMonth} onValueChange={setEndMonth}>
              <SelectTrigger className="flex-1 h-9 text-xs rounded-lg">
                <SelectValue placeholder="Fim" />
              </SelectTrigger>
              <SelectContent>
                {parsedData.months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPercentage(!showPercentage)}
            className={cn(
              "w-full h-9 gap-2 text-xs rounded-lg",
              showPercentage && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {showPercentage ? (
              <><Percent className="h-3.5 w-3.5" />Percentual</>
            ) : (
              <><DollarSign className="h-3.5 w-3.5" />Absoluto</>
            )}
          </Button>
        </div>

        {/* Info Message */}
        {parsedData.infoMessage && (
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription>
              {parsedData.infoMessage.includes("|") ? (
                <>
                  {/* Desktop: badges em linha */}
                  <div className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary"></span>
                      <span className="font-semibold text-foreground">Realizados:</span>
                    </div>
                    {parsedData.infoMessage.split("|")[0].replace("Dados Realizados:", "").trim().split(",").map((mes) => (
                      <Badge
                        key={mes.trim()}
                        variant="outline"
                        className="text-xs px-2 py-0.5 bg-primary/10 border-primary/30 text-primary"
                      >
                        {mes.trim()}
                      </Badge>
                    ))}
                    <span className="text-muted-foreground/40">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/40"></span>
                      <span className="font-semibold text-foreground">Projeções:</span>
                    </div>
                    {parsedData.infoMessage.split("|")[1].replace("Projeções:", "").trim().split(",").map((mes) => (
                      <Badge
                        key={mes.trim()}
                        variant="outline"
                        className="text-xs px-2 py-0.5 bg-muted/50 border-dashed border-muted-foreground/30 text-muted-foreground"
                      >
                        {mes.trim()}
                      </Badge>
                    ))}
                  </div>
                  {/* Mobile: badges em grid */}
                  <div className="md:hidden space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                        <span className="font-medium text-foreground text-xs">Realizados:</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {parsedData.infoMessage.split("|")[0].replace("Dados Realizados:", "").trim().split(",").map((mes) => (
                          <Badge
                            key={mes.trim()}
                            variant="outline"
                            className="justify-center text-[10px] px-1.5 py-0.5 bg-primary/10 border-primary/30 text-primary"
                          >
                            {mes.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40"></span>
                        <span className="font-medium text-foreground text-xs">Projeções:</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {parsedData.infoMessage.split("|")[1].replace("Projeções:", "").trim().split(",").map((mes) => (
                          <Badge
                            key={mes.trim()}
                            variant="outline"
                            className="justify-center text-[10px] px-1.5 py-0.5 bg-muted/50 border-dashed border-muted-foreground/30 text-muted-foreground"
                          >
                            {mes.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-sm">{parsedData.infoMessage}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6">
          {(() => {
            const hasRealized = kpis.monthsWithRealizado > 0;
            const receitasTemporal = !hasRealized && kpis.totalReceitasOrcado > 0
              ? `Planejado para ${parsedData.year}`
              : undefined;
            const despesasTemporal = !hasRealized && kpis.totalDespesasOrcado > 0
              ? `Planejado para ${parsedData.year}`
              : undefined;

            return (
              <>
                <KPICard
                  title={hasRealized ? "Receitas Realizadas" : "Receitas (Orçado)"}
                  value={hasRealized ? kpis.totalReceitas : kpis.totalReceitasOrcado}
                  variation={hasRealized ? kpis.variacaoReceitas : undefined}
                  type="revenue"
                  comparisonValue={hasRealized ? kpis.totalReceitasOrcado : undefined}
                  temporalLabel={receitasTemporal}
                />
                <KPICard
                  title={hasRealized ? "Despesas Realizadas" : "Despesas (Orçado)"}
                  value={hasRealized ? kpis.totalDespesas : kpis.totalDespesasOrcado}
                  variation={hasRealized ? kpis.variacaoDespesas : undefined}
                  type="expense"
                  comparisonValue={hasRealized ? kpis.totalDespesasOrcado : undefined}
                  temporalLabel={despesasTemporal}
                />
                <KPICard
                  title={hasRealized ? "Resultado Líquido" : "Resultado (Orçado)"}
                  value={hasRealized ? kpis.resultado : kpis.resultadoOrcado}
                  variation={hasRealized ? kpis.variacaoResultado : undefined}
                  type="result"
                  comparisonValue={hasRealized ? kpis.resultadoOrcado : undefined}
                  temporalLabel={!hasRealized && kpis.resultadoOrcado !== 0 ? `Planejado para ${parsedData.year}` : undefined}
                />
                <KPICard
                  title="Posição de Caixa Projetada"
                  value={kpis.posicaoCaixaFinal}
                  variation={kpis.variacaoCaixa}
                  type="cash"
                  comparisonLabel={kpis.caixaComparisonLabel}
                  comparisonValue={kpis.posicaoCaixaOrcadaAnual}
                />
              </>
            );
          })()}
        </div>

        {/* Alerts and Insights Section */}
        {analysis && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-6">
            <AlertsPanel alerts={analysis.alerts} />
            <InsightsPanel 
              insights={analysis.insights} 
              metrics={analysis.metrics}
              summary={analysis.summary}
            />
          </div>
        )}

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-6">
          <div className="xl:col-span-2">
            <RevenueExpenseChart
              data={filteredMonthlyData} 
              selectedMonths={selectedMonths}
              year={parsedData.year}
            />
          </div>

          <BudgetComparisonChart 
            data={parsedData.budgetComparisons} 
            showPercentage={showPercentage}
            year={parsedData.year}
            monthlyData={parsedData.monthlyData}
            availableMonths={parsedData.months}
            revenueCategories={parsedData.revenueCategories}
            expenseCategories={parsedData.expenseCategories}
            defaultPeriodMode="custom"
            defaultCategoryFilter="all"
            defaultPeriodStart={startMonth}
            defaultPeriodEnd={endMonth}
          />

          <CashPositionChart 
            data={filteredMonthlyData} 
            selectedMonths={selectedMonths}
            initialCashPosition={parsedData.initialCashPosition}
            year={parsedData.year}
          />

          <div className="xl:col-span-2">
            <SummaryTable 
              data={filteredMonthlyData}
              budgetComparisons={parsedData.budgetComparisons}
              year={parsedData.year}
              infoMessage={parsedData.infoMessage}
            />
          </div>

          <CompositionChart 
            data={parsedData.monthlyData} 
            selectedMonths={selectedMonths}
            revenueCategories={parsedData.revenueCategories}
            expenseCategories={parsedData.expenseCategories}
          />

          <PerformanceHeatmap 
            data={filteredMonthlyData}
            selectedMonths={selectedMonths}
            revenueCategories={parsedData.revenueCategories}
            expenseCategories={parsedData.expenseCategories}
          />
        </div>

        {/* Delinquency Section */}
        {delinquencyData && (
          <div className="border-t pt-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Inadimplência</h2>
              <p className="text-sm text-muted-foreground">Análise de inadimplência de sócios</p>
            </div>
            <div className="space-y-6">
              <DelinquencyPiePreview
                data={delinquencyData.monthly}
                year={delinquencyData.year}
              />
              <CompetencePaymentChart
                data={delinquencyData.competence}
                year={delinquencyData.year}
              />
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center py-6 border-t">
          <p className="text-sm font-medium text-foreground">
            Desenvolvido por Glaucio Pereira para o Iate Clube Brasileiro
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dashboard compartilhado em modo somente leitura
          </p>
        </div>
      </main>
    </div>
  );
}
