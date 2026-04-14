// ============= FINANCIAL ANALYSIS MODULE =============
// Iate Clube Brasileiro - Sistema de Análise Financeira

import { ParsedExcelData, DynamicMonthlyData } from "./excelParser";
import { getFilteredCategoryCount } from "./categoryFilters";

// ============= CONFIGURATION =============
export const ANALYSIS_CONFIG = {
  alertThresholds: {
    receitaAbaixoOrcado: 0.9,      // 10% below budget = alert
    despesaAcimaOrcado: 1.1,       // 10% above budget = alert
    caixaCritico: 100000,          // Minimum critical cash balance
    margemSeguranca: 0.15,         // 15% safety margin
    variacaoSignificativa: 5,      // 5% variation = significant
  },
  meses: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ] as const,
};

// ============= TYPES =============
export type AlertPriority = "ALTA" | "MÉDIA" | "BAIXA";
export type AlertType = "CRÍTICO" | "ALERTA" | "ATENÇÃO" | "INFO";

export interface FinancialAlert {
  id: string;
  tipo: AlertType;
  titulo: string;
  descricao: string;
  acao: string;
  prioridade: AlertPriority;
  valor?: number;
  categoria?: string;
  mes?: string;
}

export interface FinancialInsight {
  id: string;
  icon: string;
  texto: string;
  tipo: "positive" | "negative" | "neutral" | "recommendation";
}

export interface FinancialMetrics {
  margemLiquida: number;
  taxaCrescimentoCaixa: number;
  coberturaDespesas: number;
  indiceSaude: "excelente" | "bom" | "atencao" | "critico";
  maiorReceita: { mes: string; valor: number };
  menorReceita: { mes: string; valor: number };
  maiorDespesa: { mes: string; valor: number };
  menorDespesa: { mes: string; valor: number };
  melhorResultado: { mes: string; valor: number };
  piorResultado: { mes: string; valor: number };
}

export interface FinancialAnalysis {
  alerts: FinancialAlert[];
  insights: FinancialInsight[];
  metrics: FinancialMetrics;
  summary: {
    totalAlertas: number;
    alertasCriticos: number;
    pontuacaoSaude: number;
    tendencia: "positiva" | "negativa" | "estavel";
  };
}

// ============= ANALYSIS FUNCTIONS =============

export function analyzeFinancialData(
  parsedData: ParsedExcelData,
  filteredData: DynamicMonthlyData[],
  kpis: {
    totalReceitas: number;
    totalReceitasOrcado: number;
    totalDespesas: number;
    totalDespesasOrcado: number;
    resultado: number;
    resultadoOrcado: number;
    posicaoCaixaFinal: number;
    variacaoReceitas: number;
    variacaoDespesas: number;
    variacaoResultado: number;
    variacaoCaixa: number;
    monthsWithRealizado: number;
  }
): FinancialAnalysis {
  const alerts = generateAlerts(parsedData, filteredData, kpis);
  const insights = generateInsights(parsedData, filteredData, kpis);
  const metrics = calculateMetrics(parsedData, filteredData, kpis);
  
  const alertasCriticos = alerts.filter(a => a.prioridade === "ALTA").length;
  
  // Calculate health score (0-100)
  let pontuacaoSaude = 100;
  pontuacaoSaude -= alertasCriticos * 20;
  pontuacaoSaude -= alerts.filter(a => a.prioridade === "MÉDIA").length * 10;
  pontuacaoSaude -= alerts.filter(a => a.prioridade === "BAIXA").length * 5;
  pontuacaoSaude = Math.max(0, Math.min(100, pontuacaoSaude));
  
  // Determine trend
  let tendencia: "positiva" | "negativa" | "estavel" = "estavel";
  if (kpis.variacaoResultado > 5) tendencia = "positiva";
  else if (kpis.variacaoResultado < -5) tendencia = "negativa";
  
  return {
    alerts,
    insights,
    metrics,
    summary: {
      totalAlertas: alerts.length,
      alertasCriticos,
      pontuacaoSaude,
      tendencia,
    },
  };
}

// ============= ALERT GENERATION =============

function generateAlerts(
  parsedData: ParsedExcelData,
  filteredData: DynamicMonthlyData[],
  kpis: {
    totalReceitas: number;
    totalReceitasOrcado: number;
    totalDespesas: number;
    totalDespesasOrcado: number;
    resultado: number;
    resultadoOrcado: number;
    posicaoCaixaFinal: number;
    monthsWithRealizado: number;
  }
): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  let alertId = 0;
  
  const { alertThresholds } = ANALYSIS_CONFIG;
  
  // 1. Check critical cash position
  if (kpis.posicaoCaixaFinal < alertThresholds.caixaCritico && kpis.posicaoCaixaFinal > 0) {
    alerts.push({
      id: `alert-${alertId++}`,
      tipo: "CRÍTICO",
      titulo: "Saldo de Caixa Baixo",
      descricao: `Posição de caixa final: R$ ${formatCurrency(kpis.posicaoCaixaFinal)}. Abaixo do mínimo recomendado de R$ ${formatCurrency(alertThresholds.caixaCritico)}.`,
      acao: "Revisar projeções e cortar custos não essenciais",
      prioridade: "ALTA",
      valor: kpis.posicaoCaixaFinal,
    });
  }
  
  // 2. Check months with negative results
  const mesesDeficitarios = filteredData.filter(m => {
    const resultado = m.hasRealizado ? m.resultado : m.resultadoOrcado;
    return resultado < 0;
  });
  
  if (mesesDeficitarios.length > 0) {
    const totalDeficit = mesesDeficitarios.reduce((sum, m) => {
      const resultado = m.hasRealizado ? m.resultado : m.resultadoOrcado;
      return sum + Math.abs(resultado);
    }, 0);
    
    alerts.push({
      id: `alert-${alertId++}`,
      tipo: "ALERTA",
      titulo: `${mesesDeficitarios.length} Mês(es) com Resultado Negativo`,
      descricao: `Meses: ${mesesDeficitarios.map(m => m.monthLabel.split('/')[0]).join(', ')}. Total de déficit: R$ ${formatCurrency(totalDeficit)}.`,
      acao: "Analisar causas específicas de cada mês deficitário",
      prioridade: mesesDeficitarios.length >= 3 ? "ALTA" : "MÉDIA",
      valor: totalDeficit,
    });
  }
  
  // 3. Check safety margin
  const margemAtual = kpis.totalReceitasOrcado > 0 
    ? (kpis.totalReceitasOrcado - kpis.totalDespesasOrcado) / kpis.totalReceitasOrcado 
    : 0;
  
  if (margemAtual < alertThresholds.margemSeguranca && margemAtual > 0) {
    alerts.push({
      id: `alert-${alertId++}`,
      tipo: "ATENÇÃO",
      titulo: "Margem de Segurança Baixa",
      descricao: `Margem atual: ${(margemAtual * 100).toFixed(1)}% (Mínimo recomendado: ${(alertThresholds.margemSeguranca * 100).toFixed(0)}%).`,
      acao: "Buscar aumento de receitas ou redução de custos",
      prioridade: "MÉDIA",
    });
  }
  
  // 4. Check revenue below budget (KPIs already filtered to realized months only)
  if (kpis.monthsWithRealizado > 0 && kpis.totalReceitasOrcado > 0) {
    const taxaRealizacao = kpis.totalReceitas / kpis.totalReceitasOrcado;
    if (taxaRealizacao < alertThresholds.receitaAbaixoOrcado) {
      alerts.push({
        id: `alert-${alertId++}`,
        tipo: "ALERTA",
        titulo: "Receitas Abaixo do Orçado",
        descricao: `Taxa de realização: ${(taxaRealizacao * 100).toFixed(1)}%. Meta: ${(alertThresholds.receitaAbaixoOrcado * 100).toFixed(0)}%.`,
        acao: "Revisar estratégias de captação de receitas",
        prioridade: "MÉDIA",
        valor: kpis.totalReceitas,
      });
    }
  }
  
  // 5. Check expenses above budget (KPIs already filtered to realized months only)
  if (kpis.monthsWithRealizado > 0 && kpis.totalDespesasOrcado > 0) {
    const taxaDespesa = kpis.totalDespesas / kpis.totalDespesasOrcado;
    if (taxaDespesa > alertThresholds.despesaAcimaOrcado) {
      alerts.push({
        id: `alert-${alertId++}`,
        tipo: "ALERTA",
        titulo: "Despesas Acima do Orçado",
        descricao: `Execução orçamentária: ${(taxaDespesa * 100).toFixed(1)}%. Limite: ${(alertThresholds.despesaAcimaOrcado * 100).toFixed(0)}%.`,
        acao: "Implementar controle de gastos imediato",
        prioridade: "ALTA",
        valor: kpis.totalDespesas,
      });
    }
  }
  
  // 6. Check specific category deviations (only for categories with budget in realized months)
  const realizedMonths = filteredData.filter(m => m.hasRealizado);
  const categoryDeviations = parsedData.budgetComparisons.filter(bc => {
    if (bc.orcado === 0) return false;
    
    const isRevenue = bc.type === "revenue";
    
    // For revenue: exceeding budget is GOOD, only flag shortfalls (negative variance)
    // For expenses: exceeding budget is BAD, only flag overruns (positive variance)
    const isNegativeDeviation = isRevenue
      ? bc.variacaoPercentual < -20  // Revenue below budget by >20%
      : bc.variacaoPercentual > 20;  // Expense above budget by >20%
    
    if (!isNegativeDeviation) return false;
    
    // Check if this category has any budget allocated in realized months
    // If budget only exists in future months, it's seasonal — not a deviation
    const categoryKey = bc.categoryKey;
    const hasBudgetInRealizedMonths = realizedMonths.some(m => {
      const orcadoValue = isRevenue 
        ? (m.revenuesOrcado?.[categoryKey] || 0) 
        : (m.expensesOrcado?.[categoryKey] || 0);
      return orcadoValue > 0;
    });
    
    return hasBudgetInRealizedMonths;
  });
  
  if (categoryDeviations.length > 0) {
    const topDeviation = categoryDeviations.sort((a, b) => 
      Math.abs(b.variacaoPercentual) - Math.abs(a.variacaoPercentual)
    )[0];
    
    alerts.push({
      id: `alert-${alertId++}`,
      tipo: "ATENÇÃO",
      titulo: "Desvio Significativo em Categoria",
      descricao: `"${topDeviation.categoria}" (${topDeviation.type === "revenue" ? "Receita" : "Despesa"}) com ${topDeviation.variacaoPercentual > 0 ? '+' : ''}${topDeviation.variacaoPercentual.toFixed(1)}% de variação.`,
      acao: "Investigar causas do desvio orçamentário",
      prioridade: "BAIXA",
      categoria: topDeviation.categoria,
      valor: topDeviation.variacaoAbsoluta,
    });
  }
  
  // 7. Trend alert
  if (filteredData.length >= 3) {
    const lastThreeMonths = filteredData.slice(-3);
    const consecutiveNegative = lastThreeMonths.every(m => {
      const resultado = m.hasRealizado ? m.resultado : m.resultadoOrcado;
      return resultado < 0;
    });
    
    if (consecutiveNegative) {
      alerts.push({
        id: `alert-${alertId++}`,
        tipo: "CRÍTICO",
        titulo: "Tendência Negativa Persistente",
        descricao: "3 meses consecutivos com resultado negativo. Risco de deterioração financeira.",
        acao: "Reunião de emergência para revisão de estratégia",
        prioridade: "ALTA",
      });
    }
  }
  
  return alerts.sort((a, b) => {
    const prioridadeOrder = { ALTA: 0, MÉDIA: 1, BAIXA: 2 };
    return prioridadeOrder[a.prioridade] - prioridadeOrder[b.prioridade];
  });
}

// ============= INSIGHT GENERATION =============

function generateInsights(
  parsedData: ParsedExcelData,
  filteredData: DynamicMonthlyData[],
  kpis: {
    totalReceitas: number;
    totalReceitasOrcado: number;
    totalDespesas: number;
    totalDespesasOrcado: number;
    resultado: number;
    resultadoOrcado: number;
    posicaoCaixaFinal: number;
    variacaoReceitas: number;
    variacaoDespesas: number;
    variacaoResultado: number;
    variacaoCaixa: number;
    monthsWithRealizado: number;
  }
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  let insightId = 0;
  
  // 1. Best revenue month
  let maiorReceita = { mes: "", valor: 0 };
  filteredData.forEach(m => {
    const receita = m.hasRealizado ? m.totalReceitas : m.totalReceitasOrcado;
    if (receita > maiorReceita.valor) {
      maiorReceita = { mes: m.monthLabel.split('/')[0], valor: receita };
    }
  });
  
  if (maiorReceita.valor > 0) {
    insights.push({
      id: `insight-${insightId++}`,
      icon: "💰",
      texto: `**${maiorReceita.mes}** tem a maior receita prevista: R$ ${formatCurrency(maiorReceita.valor)}`,
      tipo: "positive",
    });
  }
  
  // 2. Highest expense month
  let maiorDespesa = { mes: "", valor: 0 };
  filteredData.forEach(m => {
    const despesa = m.hasRealizado ? m.totalDespesas : m.totalDespesasOrcado;
    if (despesa > maiorDespesa.valor) {
      maiorDespesa = { mes: m.monthLabel.split('/')[0], valor: despesa };
    }
  });
  
  if (maiorDespesa.valor > 0) {
    insights.push({
      id: `insight-${insightId++}`,
      icon: "📉",
      texto: `**${maiorDespesa.mes}** tem a maior despesa prevista: R$ ${formatCurrency(maiorDespesa.valor)}`,
      tipo: "negative",
    });
  }
  
  // 3. Cash evolution
  if (filteredData.length >= 2 && kpis.variacaoCaixa !== 0) {
    const isPositive = kpis.variacaoCaixa > 0;
    insights.push({
      id: `insight-${insightId++}`,
      icon: isPositive ? "📈" : "📉",
      texto: `Projeção de ${isPositive ? 'crescimento' : 'redução'} do caixa em **${Math.abs(kpis.variacaoCaixa).toFixed(1)}%** durante o período`,
      tipo: isPositive ? "positive" : "negative",
    });
  }
  
  // 4. Budget execution (if there's realized data)
  // Taxa = totalReceitas (realizado) / totalReceitasOrcado (dos meses realizados) * 100
  if (kpis.monthsWithRealizado > 0 && kpis.totalReceitasOrcado > 0) {
    const taxaReceita = (kpis.totalReceitas / kpis.totalReceitasOrcado) * 100;
    
    if (taxaReceita > 0) {
      const isGood = taxaReceita >= 95;
      insights.push({
        id: `insight-${insightId++}`,
        icon: isGood ? "✅" : "⚠️",
        texto: `Taxa de realização de receitas: **${taxaReceita.toFixed(1)}%** do orçado para os meses realizados`,
        tipo: isGood ? "positive" : "neutral",
      });
    }
  }
  
  // 5. Net margin - calculate from totals of all months in period (orçado)
  const totalReceitasOrcadoPeriodo = filteredData.reduce((sum, m) => sum + (m.totalReceitasOrcado || 0), 0);
  const totalDespesasOrcadoPeriodo = filteredData.reduce((sum, m) => sum + (m.totalDespesasOrcado || 0), 0);
  
  const margemLiquida = totalReceitasOrcadoPeriodo > 0 
    ? ((totalReceitasOrcadoPeriodo - totalDespesasOrcadoPeriodo) / totalReceitasOrcadoPeriodo) * 100 
    : 0;
  
  if (margemLiquida !== 0) {
    const isHealthy = margemLiquida >= 15;
    insights.push({
      id: `insight-${insightId++}`,
      icon: isHealthy ? "💪" : "⚠️",
      texto: `Margem líquida orçada: **${margemLiquida.toFixed(1)}%** ${isHealthy ? '(saudável)' : '(abaixo do ideal de 15%)'}`,
      tipo: isHealthy ? "positive" : "neutral",
    });
  }
  
  // 6. Number of revenue categories
  const filteredRevenueCount = getFilteredCategoryCount(parsedData.revenueCategories);
  const filteredExpenseCount = getFilteredCategoryCount(parsedData.expenseCategories);
  insights.push({
    id: `insight-${insightId++}`,
    icon: "📊",
    texto: `Dashboard analisando **${filteredRevenueCount}** categorias de receita e **${filteredExpenseCount}** de despesas`,
    tipo: "neutral",
  });
  
  // 7. Recommendations based on data
  if (kpis.resultado < 0) {
    insights.push({
      id: `insight-${insightId++}`,
      icon: "🎯",
      texto: "**Recomendação:** Concentre esforços em aumentar receitas nos meses de menor performance",
      tipo: "recommendation",
    });
  }
  
  if (filteredData.some(m => m.resultado < 0 || m.resultadoOrcado < 0)) {
    insights.push({
      id: `insight-${insightId++}`,
      icon: "🛡️",
      texto: "**Proteção:** Mantenha reserva de caixa para cobrir meses com resultado negativo",
      tipo: "recommendation",
    });
  }
  
  // 8. Best performing category (revenue)
  const topRevenueCategory = parsedData.budgetComparisons
    .filter(bc => bc.type === "revenue" && !bc.categoryKey.includes("total"))
    .sort((a, b) => b.orcado - a.orcado)[0];
  
  if (topRevenueCategory) {
    insights.push({
      id: `insight-${insightId++}`,
      icon: "🏆",
      texto: `Principal fonte de receita: **${topRevenueCategory.categoria}** (R$ ${formatCurrency(topRevenueCategory.orcado)} orçado)`,
      tipo: "positive",
    });
  }
  
  return insights;
}

// ============= METRICS CALCULATION =============

function calculateMetrics(
  parsedData: ParsedExcelData,
  filteredData: DynamicMonthlyData[],
  kpis: {
    totalReceitas: number;
    totalReceitasOrcado: number;
    totalDespesas: number;
    totalDespesasOrcado: number;
    resultado: number;
    posicaoCaixaFinal: number;
    variacaoCaixa: number;
  }
): FinancialMetrics {
  // Find extremes
  let maiorReceita = { mes: "", valor: 0 };
  let menorReceita = { mes: "", valor: Infinity };
  let maiorDespesa = { mes: "", valor: 0 };
  let menorDespesa = { mes: "", valor: Infinity };
  let melhorResultado = { mes: "", valor: -Infinity };
  let piorResultado = { mes: "", valor: Infinity };
  
  filteredData.forEach(m => {
    const mesLabel = m.monthLabel.split('/')[0];
    const receita = m.hasRealizado ? m.totalReceitas : m.totalReceitasOrcado;
    const despesa = m.hasRealizado ? m.totalDespesas : m.totalDespesasOrcado;
    const resultado = m.hasRealizado ? m.resultado : m.resultadoOrcado;
    
    if (receita > maiorReceita.valor) maiorReceita = { mes: mesLabel, valor: receita };
    if (receita < menorReceita.valor && receita > 0) menorReceita = { mes: mesLabel, valor: receita };
    if (despesa > maiorDespesa.valor) maiorDespesa = { mes: mesLabel, valor: despesa };
    if (despesa < menorDespesa.valor && despesa > 0) menorDespesa = { mes: mesLabel, valor: despesa };
    if (resultado > melhorResultado.valor) melhorResultado = { mes: mesLabel, valor: resultado };
    if (resultado < piorResultado.valor) piorResultado = { mes: mesLabel, valor: resultado };
  });
  
  // Reset infinities
  if (menorReceita.valor === Infinity) menorReceita = { mes: "-", valor: 0 };
  if (menorDespesa.valor === Infinity) menorDespesa = { mes: "-", valor: 0 };
  if (melhorResultado.valor === -Infinity) melhorResultado = { mes: "-", valor: 0 };
  if (piorResultado.valor === Infinity) piorResultado = { mes: "-", valor: 0 };
  
  // Calculate metrics
  const margemLiquida = kpis.totalReceitasOrcado > 0 
    ? ((kpis.totalReceitasOrcado - kpis.totalDespesasOrcado) / kpis.totalReceitasOrcado) * 100 
    : 0;
  
  const coberturaDespesas = kpis.totalDespesasOrcado > 0 
    ? (kpis.totalReceitasOrcado / kpis.totalDespesasOrcado) 
    : 0;
  
  // Determine health index
  let indiceSaude: "excelente" | "bom" | "atencao" | "critico";
  if (margemLiquida >= 20 && coberturaDespesas >= 1.2) {
    indiceSaude = "excelente";
  } else if (margemLiquida >= 10 && coberturaDespesas >= 1.1) {
    indiceSaude = "bom";
  } else if (margemLiquida >= 0 && coberturaDespesas >= 1) {
    indiceSaude = "atencao";
  } else {
    indiceSaude = "critico";
  }
  
  return {
    margemLiquida,
    taxaCrescimentoCaixa: kpis.variacaoCaixa,
    coberturaDespesas,
    indiceSaude,
    maiorReceita,
    menorReceita,
    maiorDespesa,
    menorDespesa,
    melhorResultado,
    piorResultado,
  };
}

// ============= HELPER FUNCTIONS =============

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getAlertIcon(prioridade: AlertPriority): string {
  switch (prioridade) {
    case "ALTA": return "🔴";
    case "MÉDIA": return "🟡";
    case "BAIXA": return "🔵";
    default: return "⚪";
  }
}

export function getHealthColor(indiceSaude: FinancialMetrics["indiceSaude"]): string {
  switch (indiceSaude) {
    case "excelente": return "text-green-600";
    case "bom": return "text-blue-600";
    case "atencao": return "text-yellow-600";
    case "critico": return "text-red-600";
    default: return "text-muted-foreground";
  }
}

export function getHealthLabel(indiceSaude: FinancialMetrics["indiceSaude"]): string {
  switch (indiceSaude) {
    case "excelente": return "Excelente";
    case "bom": return "Bom";
    case "atencao": return "Atenção";
    case "critico": return "Crítico";
    default: return "Indefinido";
  }
}
