import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useDynamicData } from "@/hooks/useDynamicData";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueExpenseChart } from "@/components/dashboard/RevenueExpenseChart";
import { BudgetComparisonChart } from "@/components/dashboard/BudgetComparisonChart";
import { CashPositionChart } from "@/components/dashboard/CashPositionChart";
import { SummaryTable } from "@/components/dashboard/SummaryTable";
import { CompositionChart } from "@/components/dashboard/CompositionChart";
import { PerformanceHeatmap } from "@/components/dashboard/PerformanceHeatmap";
import { FilterControls } from "@/components/dashboard/FilterControls";
import { FileUploadDialog } from "@/components/dashboard/FileUploadDialog";
import { ShareDashboardDialog } from "@/components/dashboard/ShareDashboardDialog";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";

import { DelinquencyPiePreview } from "@/components/dashboard/DelinquencyPiePreview";
import { CompetencePaymentChart } from "@/components/dashboard/CompetencePaymentChart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Info, Share2, RefreshCw, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";
import timaoLogo from "@/assets/timao-icb.png";
import { parseDelinquencyFile, type DelinquencyData } from "@/lib/delinquencyParser";
import { toast } from "sonner";

const Index = () => {
  // Cache-busting: limpa storage se URL contém ?v=
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('v') || urlParams.has('refresh')) {
      console.log("Forçando atualização de dados via URL...");
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);

  const {
    parsedData,
    isLoading,
    hasData,
    filters,
    filteredMonthlyData,
    selectedMonths,
    kpis,
    analysis,
    handleFileUpload,
    setStartMonth,
    setEndMonth,
    togglePercentage,
    setSelectedYear,
  } = useDynamicData();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [delinquencyData, setDelinquencyData] = useState<DelinquencyData | null>(null);
  const [delinquencyUploadOpen, setDelinquencyUploadOpen] = useState(false);

  const handleDelinquencyUpload = async (file: File) => {
    try {
      const result = await parseDelinquencyFile(file);
      if (!result.isValid) {
        toast.error("Estrutura não reconhecida", {
          description: "Verifique se o arquivo segue o formato de inadimplência esperado.",
        });
        return;
      }
      setDelinquencyData(result);
      toast.success("Dados de inadimplência carregados!", {
        description: `${result.monthly.length} meses • ${result.competence.length} competências`,
      });
    } catch (error) {
      toast.error("Erro ao processar arquivo de inadimplência");
    }
  };

  const handleForceRefresh = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
  };

  // Dynamic title based on data
  const dashboardTitle = hasData 
    ? "IATE CLUBE BRASILEIRO"
    : "Dashboard Financeiro";

  const lastUpdateText = hasData
    ? `Última atualização: ${parsedData.lastUpdateDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })} • Arquivo: ${parsedData.fileName}`
    : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <img src={timaoLogo} alt="ICB Logo" className="h-[70px] w-[70px] object-contain" />
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {dashboardTitle}
              </h1>
              {hasData && (
                <p className="text-base text-muted-foreground">
                  Fluxo de Caixa {parsedData.year}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleForceRefresh}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Recarregar</span>
              </Button>
              <ThemeToggle />
              {hasData && (
                <Button
                  variant="outline"
                  onClick={() => setShareDialogOpen(true)}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Compartilhar</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-8">
        {/* Filter Controls - Always visible */}
        <FilterControls
          availableMonths={parsedData.months}
          startMonth={filters.startMonth}
          endMonth={filters.endMonth}
          showPercentage={filters.showPercentage}
          availableYears={parsedData.years.length > 1 ? parsedData.years : undefined}
          selectedYear={filters.selectedYear}
          onYearChange={setSelectedYear}
          onStartMonthChange={setStartMonth}
          onEndMonthChange={setEndMonth}
          onTogglePercentage={togglePercentage}
          onUploadClick={() => setUploadDialogOpen(true)}
          disabled={!hasData}
        />

        {/* Empty State or Dashboard Content */}
        {!hasData ? (
          <EmptyState onUploadClick={() => setUploadDialogOpen(true)} />
        ) : (
          <>
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
                const lastRealized = parsedData.monthlyData.filter(m => m.hasRealizado);
                const lastRealizedMonth = lastRealized.length > 0 ? lastRealized[lastRealized.length - 1].month : null;
                const nextFutureMonth = parsedData.monthlyData.find(m => !m.hasRealizado)?.month;
                
                // If no realized data for revenue/expense (value is 0 but there's budget), 
                // show as "Planejado"
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
                      comparisonValue={kpis.posicaoCaixaOrcada}
                    />
                  </>
                );
              })()}
            </div>

            {/* Alerts and Insights Section */}
            {analysis && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <AlertsPanel alerts={analysis.alerts} />
                <InsightsPanel 
                  insights={analysis.insights} 
                  metrics={analysis.metrics}
                  summary={analysis.summary}
                />
              </div>
            )}

            {/* Main Charts Grid - Widescreen Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Revenue vs Expenses Line Chart - Full width */}
              <div className="xl:col-span-2">
                <RevenueExpenseChart 
                  data={filteredMonthlyData} 
                  selectedMonths={selectedMonths}
                  year={parsedData.year}
                />
              </div>

              {/* Budget Comparison */}
              <BudgetComparisonChart 
                data={parsedData.budgetComparisons} 
                showPercentage={filters.showPercentage}
                year={parsedData.year}
                monthlyData={parsedData.monthlyData}
                availableMonths={parsedData.months}
                revenueCategories={parsedData.revenueCategories}
                expenseCategories={parsedData.expenseCategories}
              />

              {/* Cash Position Area Chart */}
              <CashPositionChart 
                data={filteredMonthlyData} 
                selectedMonths={selectedMonths}
                initialCashPosition={parsedData.initialCashPosition}
                year={parsedData.year}
              />

              {/* Summary Table - Full width */}
              <div className="xl:col-span-2">
                <SummaryTable 
                  data={filteredMonthlyData}
                  budgetComparisons={parsedData.budgetComparisons}
                  year={parsedData.year}
                  infoMessage={parsedData.infoMessage}
                />
              </div>

              {/* Composition Chart */}
              <CompositionChart 
                data={parsedData.monthlyData} 
                selectedMonths={selectedMonths}
                revenueCategories={parsedData.revenueCategories}
                expenseCategories={parsedData.expenseCategories}
              />

              {/* Performance Heatmap */}
              <PerformanceHeatmap 
                data={filteredMonthlyData}
                selectedMonths={selectedMonths}
                revenueCategories={parsedData.revenueCategories}
                expenseCategories={parsedData.expenseCategories}
              />
            </div>

            {/* Delinquency Section */}
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Inadimplência</h2>
                  <p className="text-sm text-muted-foreground">Análise de inadimplência de sócios</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDelinquencyUploadOpen(true)}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {delinquencyData ? "Atualizar Dados" : "Carregar Inadimplência"}
                  </span>
                  <span className="sm:hidden">
                    {delinquencyData ? "Atualizar" : "Carregar"}
                  </span>
                </Button>
              </div>

              {delinquencyData ? (
                <div className="space-y-6">
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
              ) : (
                <Card className="p-8 text-center">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Carregue a planilha de inadimplentes para visualizar os gráficos
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setDelinquencyUploadOpen(true)}
                  >
                    Carregar Planilha
                  </Button>
                </Card>
              )}
            </div>

            {/* Footer Note */}
            <div className="text-center py-6 border-t">
              <p className="text-sm font-medium text-foreground">
                Desenvolvido por Glaucio Pereira para o Iate Clube Brasileiro
              </p>
            </div>
          </>
        )}
      </main>

      {/* File Upload Dialog */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
      />

      {/* Delinquency Upload Dialog */}
      <FileUploadDialog
        open={delinquencyUploadOpen}
        onOpenChange={setDelinquencyUploadOpen}
        onFileUpload={handleDelinquencyUpload}
      />

      {/* Share Dashboard Dialog */}
      {hasData && (
        <ShareDashboardDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          dashboardData={parsedData}
          dashboardTitle={dashboardTitle}
          delinquencyData={delinquencyData}
        />
      )}
    </div>
  );
};

export default Index;
