import { useState, useMemo, useCallback } from "react";
import { 
  ParsedExcelData, 
  parseExcelFile, 
  getEmptyParsedData,
  DynamicMonthlyData,
  DynamicBudgetComparison,
  CategoryDefinition
} from "@/lib/excelParser";
import { 
  analyzeFinancialData, 
  FinancialAnalysis 
} from "@/lib/financialAnalysis";
import { getFilteredCategoryCount } from "@/lib/categoryFilters";
import { toast } from "sonner";

export interface DashboardFilters {
  startMonth: string;
  endMonth: string;
  showPercentage: boolean;
  selectedYear: string;
  viewMode: "monthly" | "cumulative";
  dataMode: "realizado" | "orcado" | "desvio";
}

export interface DashboardKPIs {
  totalReceitas: number;
  totalReceitasOrcado: number;
  totalDespesas: number;
  totalDespesasOrcado: number;
  resultado: number;
  resultadoOrcado: number;
  posicaoCaixaFinal: number;
  posicaoCaixaOrcada: number;
  caixaComparisonLabel: string;
  variacaoReceitas: number;
  variacaoDespesas: number;
  variacaoResultado: number;
  variacaoCaixa: number;
  monthsWithRealizado: number;
}

export interface DashboardState {
  // Data
  parsedData: ParsedExcelData;
  isLoading: boolean;
  hasData: boolean;
  
  // Filters
  filters: DashboardFilters;
  
  // Derived data
  filteredMonthlyData: DynamicMonthlyData[];
  selectedMonths: string[];
  
  // KPI calculations
  kpis: DashboardKPIs;
  
  // Financial Analysis
  analysis: FinancialAnalysis | null;
  
  // Actions
  handleFileUpload: (file: File) => Promise<void>;
  setStartMonth: (month: string) => void;
  setEndMonth: (month: string) => void;
  setShowPercentage: (show: boolean) => void;
  togglePercentage: () => void;
  setSelectedYear: (year: string) => void;
  setViewMode: (mode: "monthly" | "cumulative") => void;
  setDataMode: (mode: "realizado" | "orcado" | "desvio") => void;
}

export function useDynamicData(): DashboardState {
  const [parsedData, setParsedData] = useState<ParsedExcelData>(getEmptyParsedData());
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState<DashboardFilters>({
    startMonth: "",
    endMonth: "",
    showPercentage: false,
    selectedYear: "",
    viewMode: "monthly",
    dataMode: "realizado",
  });

  const hasData = parsedData.isValid && parsedData.monthlyData.length > 0;

  // Update filters when data changes
  const updateFiltersForNewData = useCallback((data: ParsedExcelData) => {
    if (data.months.length > 0) {
      setFilters(prev => ({
        ...prev,
        startMonth: data.months[0],
        endMonth: data.months[data.months.length - 1],
        selectedYear: data.year,
      }));
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const result = await parseExcelFile(file);
      
      if (!result.isValid) {
        const errorMessages = result.validationErrors.length > 0 
          ? result.validationErrors.join(". ")
          : "Estrutura do arquivo não reconhecida";
          
        toast.error("Erro ao processar arquivo", {
          description: errorMessages,
        });
        
        // Still set the data so user can see what was parsed (for debugging)
        if (result.monthlyData.length > 0) {
          setParsedData(result);
          updateFiltersForNewData(result);
        }
        return;
      }

      setParsedData(result);
      updateFiltersForNewData(result);
      
      const structureInfo = result.detectedStructure;
      const monthsWithRealizado = result.monthlyData.filter(m => m.hasRealizado).length;
      const filteredRevenueCount = getFilteredCategoryCount(result.revenueCategories);
      const filteredExpenseCount = getFilteredCategoryCount(result.expenseCategories);
      const realizadoText = monthsWithRealizado === 1 ? "mês realizado" : "meses realizados";
      
      toast.success("Dados carregados com sucesso!", {
        description: `${result.monthlyData.length} meses • ${filteredRevenueCount} receitas • ${filteredExpenseCount} despesas • ${monthsWithRealizado} ${realizadoText}`,
      });
    } catch (error) {
      console.error("Error parsing Excel:", error);
      toast.error("Erro ao ler arquivo", {
        description: error instanceof Error ? error.message : "Verifique se o arquivo é um Excel válido (.xlsx)",
      });
    } finally {
      setIsLoading(false);
    }
  }, [updateFiltersForNewData]);

  // Selected months based on filter range
  const selectedMonths = useMemo(() => {
    if (!hasData) return [];
    
    const startIndex = parsedData.months.indexOf(filters.startMonth);
    const endIndex = parsedData.months.indexOf(filters.endMonth);
    
    if (startIndex === -1 || endIndex === -1) {
      return parsedData.months;
    }
    
    return parsedData.months.slice(startIndex, endIndex + 1);
  }, [hasData, parsedData.months, filters.startMonth, filters.endMonth]);

  // Filtered monthly data
  const filteredMonthlyData = useMemo(() => {
    if (!hasData) return [];
    return parsedData.monthlyData.filter(d => selectedMonths.includes(d.month));
  }, [hasData, parsedData.monthlyData, selectedMonths]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (!hasData || filteredMonthlyData.length === 0) {
      return {
        totalReceitas: 0,
        totalReceitasOrcado: 0,
        totalDespesas: 0,
        totalDespesasOrcado: 0,
        resultado: 0,
        resultadoOrcado: 0,
        posicaoCaixaFinal: 0,
        posicaoCaixaOrcada: 0,
        variacaoReceitas: 0,
        variacaoDespesas: 0,
        variacaoResultado: 0,
        variacaoCaixa: 0,
        monthsWithRealizado: 0,
        caixaComparisonLabel: "vs. Orçado Anual",
      };
    }

    // Separate months with realized data for proper comparison
    const monthsWithRealizadoData = filteredMonthlyData.filter(m => m.hasRealizado);
    
    // Calculate totals from realized months only
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

    const lastMonth = filteredMonthlyData[filteredMonthlyData.length - 1];
    const monthsWithRealizado = filteredMonthlyData.filter(m => m.hasRealizado).length;
    
    // Calculate variations for revenue/expense/result (comparing realized months only)
    const variacaoReceitas = totals.totalReceitasOrcado !== 0 
      ? ((totals.totalReceitas - totals.totalReceitasOrcado) / totals.totalReceitasOrcado) * 100 
      : 0;
    
    const variacaoDespesas = totals.totalDespesasOrcado !== 0 
      ? ((totals.totalDespesas - totals.totalDespesasOrcado) / totals.totalDespesasOrcado) * 100 
      : 0;
    
    const variacaoResultado = totals.resultadoOrcado !== 0 
      ? ((totals.resultado - totals.resultadoOrcado) / Math.abs(totals.resultadoOrcado)) * 100 
      : 0;
    
    // Calculate projected final cash position: realized + remaining budget
    // Posição Projetada = Realizado (até hoje) + Orçado Restante (a realizar até 31/12)
    
    // Get the last realized month's cash position
    const lastRealizadoMonth = monthsWithRealizadoData[monthsWithRealizadoData.length - 1];
    const realizadoCaixaFinal = lastRealizadoMonth?.posicaoCaixaFinal || parsedData.initialCashPosition;
    
    // Get remaining months (not realized) from ALL months data and sum their budgeted results
    const remainingMonths = parsedData.monthlyData.filter(m => !m.hasRealizado);
    const remainingBudgetedResult = remainingMonths.reduce(
      (acc, m) => acc + (m.resultadoOrcado || m.resultado || 0),
      0
    );
    
    // Projected final cash = realized cash + remaining budgeted results
    const posicaoCaixaProjetada = realizadoCaixaFinal + remainingBudgetedResult;
    
    // Budgeted final cash position for end of year (from ALL months - last month's budgeted value)
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
    
    // Variation formula: ((Projetado / Orçado) - 1) × 100
    const rawVariacaoCaixa = caixaComparacao !== 0 
      ? ((posicaoCaixaProjetada / caixaComparacao) - 1) * 100 
      : 0;

    console.log("[KPI Caixa Debug]", {
      posicaoCaixaProjetada,
      caixaComparacao,
      posicaoCaixaOrcadaAnual,
      realizadoCaixaFinal,
      remainingBudgetedResult,
      initialCashPosition: parsedData.initialCashPosition,
      rawVariacaoCaixa,
      formula: `((${posicaoCaixaProjetada} / ${caixaComparacao}) - 1) * 100 = ${rawVariacaoCaixa}`,
    });

    // Avoid showing "-0.00%" due to floating point precision
    const variacaoCaixa = Math.abs(rawVariacaoCaixa) < 1e-9 ? 0 : rawVariacaoCaixa;

    return {
      totalReceitas: totals.totalReceitas,
      totalReceitasOrcado: totals.totalReceitasOrcado,
      totalDespesas: totals.totalDespesas,
      totalDespesasOrcado: totals.totalDespesasOrcado,
      resultado: totals.resultado,
      resultadoOrcado: totals.resultadoOrcado,
      posicaoCaixaFinal: posicaoCaixaProjetada,
      posicaoCaixaOrcada: caixaComparacao,
      caixaComparisonLabel,
      variacaoReceitas,
      variacaoDespesas,
      variacaoResultado,
      variacaoCaixa,
      monthsWithRealizado,
    };
  }, [hasData, filteredMonthlyData, parsedData]);

  // Financial Analysis
  const analysis = useMemo(() => {
    if (!hasData || filteredMonthlyData.length === 0) {
      return null;
    }
    
    return analyzeFinancialData(parsedData, filteredMonthlyData, kpis);
  }, [hasData, parsedData, filteredMonthlyData, kpis]);

  // Filter setters
  const setStartMonth = useCallback((month: string) => {
    setFilters(prev => ({ ...prev, startMonth: month }));
  }, []);

  const setEndMonth = useCallback((month: string) => {
    setFilters(prev => ({ ...prev, endMonth: month }));
  }, []);

  const setShowPercentage = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showPercentage: show }));
  }, []);

  const togglePercentage = useCallback(() => {
    setFilters(prev => ({ ...prev, showPercentage: !prev.showPercentage }));
  }, []);

  const setSelectedYear = useCallback((year: string) => {
    setFilters(prev => ({ ...prev, selectedYear: year }));
  }, []);

  const setViewMode = useCallback((mode: "monthly" | "cumulative") => {
    setFilters(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const setDataMode = useCallback((mode: "realizado" | "orcado" | "desvio") => {
    setFilters(prev => ({ ...prev, dataMode: mode }));
  }, []);

  return {
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
    setShowPercentage,
    togglePercentage,
    setSelectedYear,
    setViewMode,
    setDataMode,
  };
}
