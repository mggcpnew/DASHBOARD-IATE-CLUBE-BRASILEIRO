import * as XLSX from "xlsx";

// ============= DYNAMIC DATA INTERFACES =============
export interface MonthlyBudgetData {
  orcado: number;
  realizado: number;
}

export interface DynamicMonthlyData {
  month: string;
  monthLabel: string;
  revenues: Record<string, number>;
  expenses: Record<string, number>;
  revenuesOrcado: Record<string, number>;
  expensesOrcado: Record<string, number>;
  totalReceitas: number;
  totalReceitasOrcado: number;
  totalDespesas: number;
  totalDespesasOrcado: number;
  resultado: number;
  resultadoOrcado: number;
  posicaoCaixaFinal: number;
  posicaoCaixaFinalOrcado: number;
  hasRealizado: boolean; // Flag to indicate if this month has actual data
}

export interface DynamicBudgetComparison {
  categoria: string;
  categoryKey: string;
  orcado: number;
  realizado: number;
  variacaoPercentual: number;
  variacaoAbsoluta: number;
  type: "revenue" | "expense" | "result" | "cash";
}

export interface CategoryDefinition {
  key: string;
  label: string;
  type: "revenue" | "expense";
}

export interface ParsedExcelData {
  // Metadata
  year: string;
  years: string[];
  months: string[];
  monthLabels: string[];
  lastUpdateDate: Date;
  fileName: string;

  // Categories discovered
  revenueCategories: CategoryDefinition[];
  expenseCategories: CategoryDefinition[];

  // Actual data
  monthlyData: DynamicMonthlyData[];
  budgetComparisons: DynamicBudgetComparison[];

  // Totals
  initialCashPosition: number;
  totalOrcadoReceitas: number;
  totalRealizadoReceitas: number;
  totalOrcadoDespesas: number;
  totalRealizadoDespesas: number;
  totalOrcadoResultado: number;
  totalRealizadoResultado: number;
  posicaoCaixaFinal: number;
  
  // Provisões e Aplicações
  provisoes: {
    provisao13Salario: Record<string, number>;
    aplicacaoPrivilege: Record<string, number>;
    aplicacaoPassivoTrabalhista: Record<string, number>;
    cdbLeilao: Record<string, number>;
    caixaDisponivel: Record<string, number>;
    totalSaldos: Record<string, number>;
  };
  
  // Validation
  isValid: boolean;
  validationErrors: string[];
  
  // Debug/metadata for adaptive parsing
  detectedStructure: {
    headerRowIndex: number;
    categoryColumnIndex: number;
    parseMethod: string;
    monthColumnsCount: number;
    hasBudgetColumns: boolean;
    hasOrcadoRealizadoPairs: boolean;
  };
  
  // Info message for display
  infoMessage: string;
}

import { correctPortuguese } from "./portugueseCorrections";

// ============= HELPER FUNCTIONS =============

function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function generateKey(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 50);
}

function parseNumericValue(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  
  const str = value
    .toString()
    .replace(/[R$€£¥₹\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// Month name mapping
const MONTH_NAMES: Record<string, string> = {
  jan: "01", janeiro: "01", january: "01",
  fev: "02", fevereiro: "02", february: "02",
  mar: "03", março: "03", marco: "03", march: "03",
  abr: "04", abril: "04", april: "04",
  mai: "05", maio: "05", may: "05",
  jun: "06", junho: "06", june: "06",
  jul: "07", julho: "07", july: "07",
  ago: "08", agosto: "08", august: "08",
  set: "09", setembro: "09", september: "09",
  out: "10", outubro: "10", october: "10",
  nov: "11", novembro: "11", november: "11",
  dez: "12", dezembro: "12", december: "12",
};

const MONTH_LABELS: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

// ============= MAIN PARSER =============

export function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        let result: ParsedExcelData | null = null;
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Try the specific 2026 format first (ORÇADO/REALIZADO pairs)
          result = parseFluxoCaixa2026Format(jsonData, file.name);
          
          if (result.isValid) {
            break;
          }
          
          // Fallback to standard parsing strategies
          result = tryParseWithStrategies(jsonData, file.name);
          
          if (result.isValid) {
            break;
          }
        }
        
        if (!result) {
          result = getEmptyParsedData();
          result.validationErrors = ["Não foi possível processar nenhuma planilha"];
        }
        
        resolve(result);
      } catch (error) {
        console.error("Excel parsing error:", error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

// ============= SPECIFIC PARSER FOR 2026 FORMAT =============
// This format has ORÇADO/REALIZADO columns side by side for each month

function parseFluxoCaixa2026Format(rows: any[][], fileName: string): ParsedExcelData {
  const result = initializeResult(fileName);
  
  if (rows.length < 10) {
    result.validationErrors.push("Arquivo muito pequeno");
    return result;
  }

  // Step 1: Find the structure - look for month headers with ORÇADO/REALIZADO pattern
  // The format has pairs of columns: ORÇADO MES/ANO, REALIZADO MES/ANO
  
  let headerRowIndex = -1;
  let monthColumnPairs: { month: string; year: string; orcadoCol: number; realizadoCol: number }[] = [];
  let annualBudgetCols: { orcado2025?: number; ajustado2026?: number } = {};
  
  // Search for header row with month/year patterns
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;
    
    const pairs: typeof monthColumnPairs = [];
    let currentMonth: { month: string; year: string; orcadoCol?: number } | null = null;
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]?.toString() || "";
      const normalized = normalizeText(cell);
      
      // Pattern: "ORÇADO 01/26" or "ORCADO 01/26" or "Orçado 01/2026"
      const orcadoMatch = cell.match(/(?:or[cç]ado)\s*(\d{1,2})\/(\d{2,4})/i);
      if (orcadoMatch) {
        const month = orcadoMatch[1].padStart(2, "0");
        let year = orcadoMatch[2];
        if (year.length === 2) year = `20${year}`;
        currentMonth = { month, year, orcadoCol: j };
        continue;
      }
      
      // Pattern: "REALIZADO 01/26" or matching the current month
      const realizadoMatch = cell.match(/(?:realizado)\s*(\d{1,2})\/(\d{2,4})/i);
      if (realizadoMatch && currentMonth) {
        const month = realizadoMatch[1].padStart(2, "0");
        let year = realizadoMatch[2];
        if (year.length === 2) year = `20${year}`;
        
        if (month === currentMonth.month && year === currentMonth.year) {
          pairs.push({
            month,
            year,
            orcadoCol: currentMonth.orcadoCol!,
            realizadoCol: j,
          });
          currentMonth = null;
        }
      }
      
      // Check for annual budget columns (ORÇADO 2025, AJUSTADO 2026)
      if (/or[cç]ado\s*2025/i.test(cell)) {
        annualBudgetCols.orcado2025 = j;
      }
      if (/ajustado\s*2026/i.test(cell)) {
        annualBudgetCols.ajustado2026 = j;
      }
    }
    
    if (pairs.length >= 6) { // At least 6 months found
      headerRowIndex = i;
      monthColumnPairs = pairs;
      break;
    }
  }
  
  // If specific format not found, try alternative detection
  if (headerRowIndex === -1) {
    return tryFallbackParsing(rows, fileName);
  }
  
  result.detectedStructure.headerRowIndex = headerRowIndex;
  result.detectedStructure.hasOrcadoRealizadoPairs = true;
  result.detectedStructure.monthColumnsCount = monthColumnPairs.length;
  result.detectedStructure.parseMethod = "fluxo_caixa_2026";
  
  // Extract years
  const yearsSet = new Set<string>();
  monthColumnPairs.forEach(p => yearsSet.add(p.year));
  result.years = Array.from(yearsSet).sort();
  result.year = result.years[result.years.length - 1] || "";
  
  // Extract months
  result.months = monthColumnPairs.map(p => `${p.month}/${p.year.slice(-2)}`);
  result.monthLabels = monthColumnPairs.map(p => MONTH_LABELS[p.month] || p.month);
  
  // Step 2: Parse data rows - identify sections
  let currentSection: "none" | "cash_initial" | "revenue" | "expense" | "result" | "cash_final" | "provisoes" = "none";
  const revenueItems: { key: string; label: string; orcadoValues: number[]; realizadoValues: number[]; orcado2025: number; ajustado2026: number }[] = [];
  const expenseItems: { key: string; label: string; orcadoValues: number[]; realizadoValues: number[]; orcado2025: number; ajustado2026: number }[] = [];
  
  let initialCashValues: { orcado: number[]; realizado: number[] } = { orcado: [], realizado: [] };
  let totalReceitasValues: { orcado: number[]; realizado: number[] } = { orcado: [], realizado: [] };
  let totalDespesasValues: { orcado: number[]; realizado: number[] } = { orcado: [], realizado: [] };
  let resultadoValues: { orcado: number[]; realizado: number[] } = { orcado: [], realizado: [] };
  let cashFinalValues: { orcado: number[]; realizado: number[] } = { orcado: [], realizado: [] };
  
  // Provisões
  const provisoesData: Record<string, number[]> = {
    provisao13: [],
    aplicacaoPrivilege: [],
    aplicacaoPassivo: [],
    cdbLeilao: [],
    caixaDisponivel: [],
    totalSaldos: [],
  };
  
  // Helper to extract row values
  const extractRowValues = (row: any[]): { orcado: number[]; realizado: number[] } => {
    const orcado = monthColumnPairs.map(p => parseNumericValue(row[p.orcadoCol]));
    const realizado = monthColumnPairs.map(p => parseNumericValue(row[p.realizadoCol]));
    return { orcado, realizado };
  };
  
  const getAnnualValues = (row: any[]): { orcado2025: number; ajustado2026: number } => {
    return {
      orcado2025: annualBudgetCols.orcado2025 !== undefined ? parseNumericValue(row[annualBudgetCols.orcado2025]) : 0,
      ajustado2026: annualBudgetCols.ajustado2026 !== undefined ? parseNumericValue(row[annualBudgetCols.ajustado2026]) : 0,
    };
  };
  
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Check multiple possible columns for the category name (columns A, B, C, D)
    let categoryName = "";
    for (let col = 0; col <= 3; col++) {
      const cell = row[col]?.toString().trim();
      if (cell && cell.length > 2 && !/^\d+([.,]\d+)?$/.test(cell)) {
        categoryName = cell;
        break;
      }
    }
    
    if (!categoryName) continue;
    
    const normalized = normalizeText(categoryName);
    const values = extractRowValues(row);
    const annual = getAnnualValues(row);
    
    // Detect section changes based on keywords
    if (/posi[cç][aã]o.*caixa.*janeiro|caixa.*inicial/i.test(categoryName)) {
      currentSection = "cash_initial";
      initialCashValues = values;
      result.initialCashPosition = values.realizado[0] || values.orcado[0] || 0;
      continue;
    }
    
    if (/^\s*receitas?\s*$/i.test(categoryName) || normalized === "receitas") {
      currentSection = "revenue";
      continue;
    }
    
    if (/^\s*despesas?\s*$/i.test(categoryName) || normalized === "despesas") {
      currentSection = "expense";
      continue;
    }
    
    if (/total\s+de\s+receitas?/i.test(categoryName)) {
      totalReceitasValues = values;
      result.totalOrcadoReceitas = annual.ajustado2026 || values.orcado.reduce((a, b) => a + b, 0);
      result.totalRealizadoReceitas = values.realizado.reduce((a, b) => a + b, 0);
      continue;
    }
    
    if (/total\s+de\s+despesas?/i.test(categoryName)) {
      totalDespesasValues = values;
      result.totalOrcadoDespesas = annual.ajustado2026 || values.orcado.reduce((a, b) => a + b, 0);
      result.totalRealizadoDespesas = values.realizado.reduce((a, b) => a + b, 0);
      continue;
    }
    
    if (/^resultado$/i.test(categoryName)) {
      currentSection = "result";
      resultadoValues = values;
      result.totalOrcadoResultado = values.orcado.reduce((a, b) => a + b, 0);
      result.totalRealizadoResultado = values.realizado.reduce((a, b) => a + b, 0);
      continue;
    }
    
    if (/posi[cç][aã]o.*caixa.*final/i.test(categoryName)) {
      currentSection = "cash_final";
      cashFinalValues = values;
      const lastNonZero = [...values.realizado].reverse().find(v => v !== 0) || 
                          [...values.orcado].reverse().find(v => v !== 0) || 0;
      result.posicaoCaixaFinal = lastNonZero;
      continue;
    }
    
    // Provisões section
    if (/provis[aã]o.*13/i.test(categoryName)) {
      currentSection = "provisoes";
      provisoesData.provisao13 = values.realizado.map((v, idx) => v || values.orcado[idx] || 0);
      continue;
    }
    
    if (/aplica[cç][aã]o.*privilege/i.test(categoryName)) {
      provisoesData.aplicacaoPrivilege = values.realizado.map((v, idx) => v || values.orcado[idx] || 0);
      continue;
    }
    
    if (/aplica[cç][aã]o.*passivo/i.test(categoryName) || /passivo.*trabalhista/i.test(categoryName)) {
      provisoesData.aplicacaoPassivo = values.realizado.map((v, idx) => v || values.orcado[idx] || 0);
      continue;
    }
    
    if (/cdb.*leil[aã]o/i.test(categoryName)) {
      provisoesData.cdbLeilao = values.realizado.map((v, idx) => v || values.orcado[idx] || 0);
      continue;
    }
    
    if (/caixa\s+disponivel/i.test(categoryName)) {
      provisoesData.caixaDisponivel = values.realizado.map((v, idx) => v || values.orcado[idx] || 0);
      continue;
    }
    
    if (/total\s+de\s+saldos?/i.test(categoryName) || /total\s+saldos?/i.test(categoryName)) {
      provisoesData.totalSaldos = values.realizado.map((v, idx) => v || values.orcado[idx] || 0);
      continue;
    }
    
    // Regular category item
    if (currentSection === "revenue" && !normalized.startsWith("total")) {
      const key = generateKey(categoryName);
      const correctedLabel = correctPortuguese(categoryName);
      revenueItems.push({
        key,
        label: correctedLabel,
        orcadoValues: values.orcado,
        realizadoValues: values.realizado,
        ...annual,
      });
      result.revenueCategories.push({ key, label: correctedLabel, type: "revenue" });
    } else if (currentSection === "expense" && !normalized.startsWith("total")) {
      const key = generateKey(categoryName);
      const correctedLabel = correctPortuguese(categoryName);
      expenseItems.push({
        key,
        label: correctedLabel,
        orcadoValues: values.orcado,
        realizadoValues: values.realizado,
        ...annual,
      });
      result.expenseCategories.push({ key, label: correctedLabel, type: "expense" });
    }
  }
  
  // Step 3: Build monthly data
  for (let monthIdx = 0; monthIdx < monthColumnPairs.length; monthIdx++) {
    const pair = monthColumnPairs[monthIdx];
    const monthKey = `${pair.month}/${pair.year.slice(-2)}`;
    
    // Check if this month has real data (not just zeros)
    const hasRealizado = revenueItems.some(item => item.realizadoValues[monthIdx] !== 0) ||
                         expenseItems.some(item => item.realizadoValues[monthIdx] !== 0);
    
    const monthData: DynamicMonthlyData = {
      month: monthKey,
      monthLabel: `${MONTH_LABELS[pair.month] || pair.month}/${pair.year}`,
      revenues: {},
      expenses: {},
      revenuesOrcado: {},
      expensesOrcado: {},
      totalReceitas: 0,
      totalReceitasOrcado: 0,
      totalDespesas: 0,
      totalDespesasOrcado: 0,
      resultado: 0,
      resultadoOrcado: 0,
      posicaoCaixaFinal: 0,
      posicaoCaixaFinalOrcado: 0,
      hasRealizado,
    };
    
    // Populate revenues
    for (const item of revenueItems) {
      monthData.revenues[item.key] = item.realizadoValues[monthIdx];
      monthData.revenuesOrcado[item.key] = item.orcadoValues[monthIdx];
      monthData.totalReceitas += item.realizadoValues[monthIdx];
      monthData.totalReceitasOrcado += item.orcadoValues[monthIdx];
    }
    
    // Populate expenses
    for (const item of expenseItems) {
      monthData.expenses[item.key] = item.realizadoValues[monthIdx];
      monthData.expensesOrcado[item.key] = item.orcadoValues[monthIdx];
      monthData.totalDespesas += item.realizadoValues[monthIdx];
      monthData.totalDespesasOrcado += item.orcadoValues[monthIdx];
    }
    
    // Use parsed totals if available and differ from calculated
    if (totalReceitasValues.realizado[monthIdx]) {
      monthData.totalReceitas = totalReceitasValues.realizado[monthIdx];
    }
    if (totalReceitasValues.orcado[monthIdx]) {
      monthData.totalReceitasOrcado = totalReceitasValues.orcado[monthIdx];
    }
    if (totalDespesasValues.realizado[monthIdx]) {
      monthData.totalDespesas = totalDespesasValues.realizado[monthIdx];
    }
    if (totalDespesasValues.orcado[monthIdx]) {
      monthData.totalDespesasOrcado = totalDespesasValues.orcado[monthIdx];
    }
    
    // Resultado
    monthData.resultado = resultadoValues.realizado[monthIdx] || 
                          (monthData.totalReceitas - monthData.totalDespesas);
    monthData.resultadoOrcado = resultadoValues.orcado[monthIdx] || 
                                 (monthData.totalReceitasOrcado - monthData.totalDespesasOrcado);
    
    // Cash position
    monthData.posicaoCaixaFinal = cashFinalValues.realizado[monthIdx] || 0;
    monthData.posicaoCaixaFinalOrcado = cashFinalValues.orcado[monthIdx] || 0;
    
    result.monthlyData.push(monthData);
  }
  
  // Step 4: Calculate cash position if not provided
  if (cashFinalValues.realizado.every(v => v === 0) && result.monthlyData.length > 0) {
    let runningCash = result.initialCashPosition;
    let runningCashOrcado = result.initialCashPosition;
    for (const md of result.monthlyData) {
      runningCash += md.resultado;
      runningCashOrcado += md.resultadoOrcado;
      md.posicaoCaixaFinal = runningCash;
      md.posicaoCaixaFinalOrcado = runningCashOrcado;
    }
    result.posicaoCaixaFinal = runningCash;
  }
  
  // Store provisões
  result.provisoes = {
    provisao13Salario: {},
    aplicacaoPrivilege: {},
    aplicacaoPassivoTrabalhista: {},
    cdbLeilao: {},
    caixaDisponivel: {},
    totalSaldos: {},
  };
  
  for (let i = 0; i < monthColumnPairs.length; i++) {
    const month = result.months[i];
    if (provisoesData.provisao13[i]) result.provisoes.provisao13Salario[month] = provisoesData.provisao13[i];
    if (provisoesData.aplicacaoPrivilege[i]) result.provisoes.aplicacaoPrivilege[month] = provisoesData.aplicacaoPrivilege[i];
    if (provisoesData.aplicacaoPassivo[i]) result.provisoes.aplicacaoPassivoTrabalhista[month] = provisoesData.aplicacaoPassivo[i];
    if (provisoesData.cdbLeilao[i]) result.provisoes.cdbLeilao[month] = provisoesData.cdbLeilao[i];
    if (provisoesData.caixaDisponivel[i]) result.provisoes.caixaDisponivel[month] = provisoesData.caixaDisponivel[i];
    if (provisoesData.totalSaldos[i]) result.provisoes.totalSaldos[month] = provisoesData.totalSaldos[i];
  }
  
  // Step 5: Build budget comparisons
  buildBudgetComparisons(result, revenueItems, expenseItems);
  
  // Create info message
  const monthsWithRealizado = result.monthlyData.filter(m => m.hasRealizado).map(m => m.monthLabel);
  const monthsWithOrcado = result.monthlyData.filter(m => !m.hasRealizado).map(m => m.monthLabel);
  
  if (monthsWithRealizado.length > 0 && monthsWithOrcado.length > 0) {
    result.infoMessage = `Dados Realizados: ${monthsWithRealizado.join(", ")} | Projeções: ${monthsWithOrcado.join(", ")}`;
  } else if (monthsWithRealizado.length > 0) {
    result.infoMessage = `Todos os meses com dados realizados`;
  } else {
    result.infoMessage = `Todos os meses com dados orçados/projetados`;
  }
  
  // Validation
  validateResult(result);
  
  return result;
}

function buildBudgetComparisons(
  result: ParsedExcelData, 
  revenueItems: { key: string; label: string; orcadoValues: number[]; realizadoValues: number[]; orcado2025: number; ajustado2026: number }[],
  expenseItems: { key: string; label: string; orcadoValues: number[]; realizadoValues: number[]; orcado2025: number; ajustado2026: number }[]
) {
  // Determine which month indices have realized data for period-matched comparison
  const realizadoMask = result.monthlyData.map(m => m.hasRealizado);
  
  // Helper: sum only values for months with realized data
  const sumRealized = (values: number[]) => values.reduce((acc, v, i) => acc + (realizadoMask[i] ? v : 0), 0);
  
  // Period-matched totals for receitas/despesas
  const totalReceitasOrcadoPeriodo = sumRealized(
    result.monthlyData.map(m => m.totalReceitasOrcado || 0)
  );
  const totalReceitasRealizadoPeriodo = sumRealized(
    result.monthlyData.map(m => m.totalReceitas)
  );
  const totalDespesasOrcadoPeriodo = sumRealized(
    result.monthlyData.map(m => m.totalDespesasOrcado || 0)
  );
  const totalDespesasRealizadoPeriodo = sumRealized(
    result.monthlyData.map(m => m.totalDespesas)
  );

  // Add total comparisons first (period-matched)
  result.budgetComparisons.push({
    categoria: "Receitas Totais",
    categoryKey: "total_receitas",
    orcado: totalReceitasOrcadoPeriodo,
    realizado: totalReceitasRealizadoPeriodo,
    variacaoPercentual: totalReceitasOrcadoPeriodo !== 0 
      ? ((totalReceitasRealizadoPeriodo - totalReceitasOrcadoPeriodo) / totalReceitasOrcadoPeriodo) * 100 
      : 0,
    variacaoAbsoluta: totalReceitasRealizadoPeriodo - totalReceitasOrcadoPeriodo,
    type: "revenue",
  });
  
  // Add revenue items (period-matched)
  for (const item of revenueItems) {
    const realized = sumRealized(item.realizadoValues);
    const budgeted = sumRealized(item.orcadoValues);
    const variation = budgeted !== 0 ? ((realized - budgeted) / budgeted) * 100 : 0;
    
    result.budgetComparisons.push({
      categoria: item.label,
      categoryKey: item.key,
      orcado: budgeted,
      realizado: realized,
      variacaoPercentual: variation,
      variacaoAbsoluta: realized - budgeted,
      type: "revenue",
    });
  }
  
  result.budgetComparisons.push({
    categoria: "Despesas Totais",
    categoryKey: "total_despesas",
    orcado: totalDespesasOrcadoPeriodo,
    realizado: totalDespesasRealizadoPeriodo,
    variacaoPercentual: totalDespesasOrcadoPeriodo !== 0 
      ? ((totalDespesasRealizadoPeriodo - totalDespesasOrcadoPeriodo) / totalDespesasOrcadoPeriodo) * 100 
      : 0,
    variacaoAbsoluta: totalDespesasRealizadoPeriodo - totalDespesasOrcadoPeriodo,
    type: "expense",
  });
  
  // Add expense items (period-matched)
  for (const item of expenseItems) {
    const realized = sumRealized(item.realizadoValues);
    const budgeted = sumRealized(item.orcadoValues);
    const variation = budgeted !== 0 ? ((realized - budgeted) / budgeted) * 100 : 0;
    
    result.budgetComparisons.push({
      categoria: item.label,
      categoryKey: item.key,
      orcado: budgeted,
      realizado: realized,
      variacaoPercentual: variation,
      variacaoAbsoluta: realized - budgeted,
      type: "expense",
    });
  }
}

// ============= FALLBACK PARSING =============

function tryFallbackParsing(rows: any[][], fileName: string): ParsedExcelData {
  const strategies = [
    { name: "standard", fn: parseStandardLayout },
    { name: "transposed", fn: parseTransposedLayout },
    { name: "simple", fn: parseSimpleLayout },
  ];
  
  for (const strategy of strategies) {
    try {
      const result = strategy.fn(rows, fileName);
      if (result.isValid || result.monthlyData.length > 0) {
        result.detectedStructure.parseMethod = strategy.name;
        return result;
      }
    } catch (e) {
      console.warn(`Strategy ${strategy.name} failed:`, e);
    }
  }
  
  const emptyResult = getEmptyParsedData();
  emptyResult.fileName = fileName;
  emptyResult.validationErrors = ["Não foi possível identificar a estrutura dos dados"];
  return emptyResult;
}

function tryParseWithStrategies(rows: any[][], fileName: string): ParsedExcelData {
  return tryFallbackParsing(rows, fileName);
}

// ============= STANDARD LAYOUT PARSER =============

function parseStandardLayout(rows: any[][], fileName: string): ParsedExcelData {
  const result = initializeResult(fileName);
  
  if (rows.length < 2) {
    result.validationErrors.push("Arquivo muito pequeno");
    return result;
  }

  // Find header row with date patterns
  let headerRowIndex = -1;
  let dateColumns: { index: number; month: string; year: string; label: string }[] = [];
  
  const DATE_PATTERNS = [
    { regex: /(?:realizado|orcado|orçado)\s*(\d{1,2})\/(\d{2,4})/i, monthIdx: 1, yearIdx: 2 },
    { regex: /^(\d{1,2})\/(\d{2,4})$/, monthIdx: 1, yearIdx: 2 },
    { regex: /^(\d{1,2})-(\d{2,4})$/, monthIdx: 1, yearIdx: 2 },
    { regex: /^(\d{4})[-\/](\d{1,2})$/, monthIdx: 2, yearIdx: 1 },
  ];
  
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    
    const foundDates: typeof dateColumns = [];
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]?.toString() || "";
      
      for (const pattern of DATE_PATTERNS) {
        const match = cell.match(pattern.regex);
        if (match) {
          let month = match[pattern.monthIdx].padStart(2, "0");
          let year = match[pattern.yearIdx];
          if (year.length === 2) year = `20${year}`;
          
          foundDates.push({
            index: j,
            month,
            year,
            label: `${month}/${year.slice(-2)}`,
          });
          break;
        }
      }
    }
    
    if (foundDates.length >= 2) {
      headerRowIndex = i;
      dateColumns = foundDates;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    result.validationErrors.push("Não foram encontradas colunas de período/mês");
    return result;
  }
  
  result.detectedStructure.headerRowIndex = headerRowIndex;
  result.detectedStructure.monthColumnsCount = dateColumns.length;
  result.detectedStructure.parseMethod = "standard";
  
  // Extract unique years and months
  const yearsSet = new Set<string>();
  dateColumns.forEach(d => yearsSet.add(d.year));
  result.years = Array.from(yearsSet).sort();
  result.year = result.years[result.years.length - 1] || "";
  result.months = dateColumns.map(d => d.label);
  result.monthLabels = dateColumns.map(d => `${MONTH_LABELS[d.month] || d.month}/${d.year}`);
  
  // Parse data rows
  let currentSection: "revenue" | "expense" | "unknown" = "unknown";
  
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = row[0]?.toString().trim() || "";
    if (!firstCell) continue;
    
    const normalized = normalizeText(firstCell);
    const values = dateColumns.map(d => parseNumericValue(row[d.index]));
    
    // Detect sections
    if (normalized === "receitas" || normalized === "revenues") {
      currentSection = "revenue";
      continue;
    }
    if (normalized === "despesas" || normalized === "expenses") {
      currentSection = "expense";
      continue;
    }
    
    if (/^total/i.test(firstCell)) {
      if (currentSection === "revenue") {
        result.totalRealizadoReceitas = values.reduce((a, b) => a + b, 0);
      } else if (currentSection === "expense") {
        result.totalRealizadoDespesas = values.reduce((a, b) => a + b, 0);
      }
      continue;
    }
    
    if (/resultado/i.test(firstCell)) {
      result.totalRealizadoResultado = values.reduce((a, b) => a + b, 0);
      for (let idx = 0; idx < dateColumns.length; idx++) {
        if (!result.monthlyData[idx]) continue;
        result.monthlyData[idx].resultado = values[idx];
      }
      continue;
    }
    
    if (/caixa.*final/i.test(firstCell) || /posi[cç][aã]o.*caixa/i.test(firstCell)) {
      result.posicaoCaixaFinal = values[values.length - 1] || 0;
      for (let idx = 0; idx < dateColumns.length; idx++) {
        if (!result.monthlyData[idx]) continue;
        result.monthlyData[idx].posicaoCaixaFinal = values[idx];
      }
      continue;
    }
    
    // Regular category
    if (currentSection !== "unknown") {
      const key = generateKey(firstCell);
      const catDef: CategoryDefinition = { key, label: firstCell, type: currentSection };
      
      if (currentSection === "revenue") {
        result.revenueCategories.push(catDef);
      } else {
        result.expenseCategories.push(catDef);
      }
      
      // Add to monthly data
      for (let idx = 0; idx < dateColumns.length; idx++) {
        if (!result.monthlyData[idx]) {
          result.monthlyData[idx] = createEmptyMonthlyData(result.months[idx], result.monthLabels[idx]);
        }
        
        if (currentSection === "revenue") {
          result.monthlyData[idx].revenues[key] = values[idx];
          result.monthlyData[idx].totalReceitas += values[idx];
        } else {
          result.monthlyData[idx].expenses[key] = values[idx];
          result.monthlyData[idx].totalDespesas += values[idx];
        }
      }
    }
  }
  
  // Calculate resultado if not found
  for (const md of result.monthlyData) {
    if (md.resultado === 0) {
      md.resultado = md.totalReceitas - md.totalDespesas;
    }
  }
  
  validateResult(result);
  return result;
}

function parseTransposedLayout(rows: any[][], fileName: string): ParsedExcelData {
  const result = initializeResult(fileName);
  result.validationErrors.push("Layout transposto não suportado completamente");
  return result;
}

function parseSimpleLayout(rows: any[][], fileName: string): ParsedExcelData {
  const result = initializeResult(fileName);
  result.validationErrors.push("Layout simples não detectado");
  return result;
}

// ============= UTILITIES =============

function createEmptyMonthlyData(month: string, monthLabel: string): DynamicMonthlyData {
  return {
    month,
    monthLabel,
    revenues: {},
    expenses: {},
    revenuesOrcado: {},
    expensesOrcado: {},
    totalReceitas: 0,
    totalReceitasOrcado: 0,
    totalDespesas: 0,
    totalDespesasOrcado: 0,
    resultado: 0,
    resultadoOrcado: 0,
    posicaoCaixaFinal: 0,
    posicaoCaixaFinalOrcado: 0,
    hasRealizado: false,
  };
}

function initializeResult(fileName: string): ParsedExcelData {
  return {
    year: "",
    years: [],
    months: [],
    monthLabels: [],
    lastUpdateDate: new Date(),
    fileName,
    revenueCategories: [],
    expenseCategories: [],
    monthlyData: [],
    budgetComparisons: [],
    initialCashPosition: 0,
    totalOrcadoReceitas: 0,
    totalRealizadoReceitas: 0,
    totalOrcadoDespesas: 0,
    totalRealizadoDespesas: 0,
    totalOrcadoResultado: 0,
    totalRealizadoResultado: 0,
    posicaoCaixaFinal: 0,
    provisoes: {
      provisao13Salario: {},
      aplicacaoPrivilege: {},
      aplicacaoPassivoTrabalhista: {},
      cdbLeilao: {},
      caixaDisponivel: {},
      totalSaldos: {},
    },
    isValid: false,
    validationErrors: [],
    detectedStructure: {
      headerRowIndex: -1,
      categoryColumnIndex: 0,
      parseMethod: "unknown",
      monthColumnsCount: 0,
      hasBudgetColumns: false,
      hasOrcadoRealizadoPairs: false,
    },
    infoMessage: "",
  };
}

function validateResult(result: ParsedExcelData) {
  const errors: string[] = [];
  
  if (result.months.length === 0) {
    errors.push("Nenhum período/mês identificado nos dados");
  }
  
  if (result.revenueCategories.length === 0 && result.expenseCategories.length === 0) {
    errors.push("Nenhuma categoria de receita ou despesa encontrada");
  }
  
  if (result.monthlyData.length === 0) {
    errors.push("Nenhum dado mensal processado");
  }
  
  const hasValues = result.monthlyData.some(md => 
    md.totalReceitas !== 0 || md.totalDespesas !== 0 || 
    md.totalReceitasOrcado !== 0 || md.totalDespesasOrcado !== 0
  );
  
  if (!hasValues && result.monthlyData.length > 0) {
    errors.push("Dados numéricos não encontrados nas células");
  }
  
  result.validationErrors = errors;
  result.isValid = errors.length === 0;
}

export function getEmptyParsedData(): ParsedExcelData {
  return {
    year: "",
    years: [],
    months: [],
    monthLabels: [],
    lastUpdateDate: new Date(),
    fileName: "",
    revenueCategories: [],
    expenseCategories: [],
    monthlyData: [],
    budgetComparisons: [],
    initialCashPosition: 0,
    totalOrcadoReceitas: 0,
    totalRealizadoReceitas: 0,
    totalOrcadoDespesas: 0,
    totalRealizadoDespesas: 0,
    totalOrcadoResultado: 0,
    totalRealizadoResultado: 0,
    posicaoCaixaFinal: 0,
    provisoes: {
      provisao13Salario: {},
      aplicacaoPrivilege: {},
      aplicacaoPassivoTrabalhista: {},
      cdbLeilao: {},
      caixaDisponivel: {},
      totalSaldos: {},
    },
    isValid: false,
    validationErrors: ["Nenhum arquivo carregado"],
    detectedStructure: {
      headerRowIndex: -1,
      categoryColumnIndex: 0,
      parseMethod: "none",
      monthColumnsCount: 0,
      hasBudgetColumns: false,
      hasOrcadoRealizadoPairs: false,
    },
    infoMessage: "",
  };
}
