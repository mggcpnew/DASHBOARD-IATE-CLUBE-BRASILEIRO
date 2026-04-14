import { DynamicMonthlyData, DynamicBudgetComparison } from "@/lib/excelParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SummaryTableProps {
  data: DynamicMonthlyData[];
  budgetComparisons: DynamicBudgetComparison[];
  year?: string;
  infoMessage?: string;
}

export function SummaryTable({ data, budgetComparisons, year, infoMessage }: SummaryTableProps) {
  // Calculate totals from monthly data — only compare same periods (realized months)
  const monthsWithRealizado = data.filter(d => d.hasRealizado);
  const totals = monthsWithRealizado.reduce(
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

  const lastMonth = data[data.length - 1];
  const monthsWithRealizadoCount = monthsWithRealizado.length;
  
  // Find the last month with realized data for cash position
  const lastMonthWithRealizado = [...data].reverse().find(d => d.hasRealizado);

  // Find budget data from comparisons
  const receitasBudget = budgetComparisons.find(b => b.categoryKey === "total_receitas");
  const despesasBudget = budgetComparisons.find(b => b.categoryKey === "total_despesas");

  // For cash position: realized = last month with actual data, orcado = year-end projected
  const caixaRealizado = lastMonthWithRealizado?.posicaoCaixaFinal || 0;
  const caixaOrcado = lastMonth?.posicaoCaixaFinalOrcado || 0;

  const summaryData = [
    {
      categoria: "Receitas Totais",
      orcado: receitasBudget?.orcado || totals.totalReceitasOrcado,
      realizado: totals.totalReceitas,
      type: "revenue" as const,
    },
    {
      categoria: "Despesas Totais",
      orcado: despesasBudget?.orcado || totals.totalDespesasOrcado,
      realizado: totals.totalDespesas,
      type: "expense" as const,
    },
    {
      categoria: "Resultado Líquido",
      orcado: (receitasBudget?.orcado || totals.totalReceitasOrcado) - (despesasBudget?.orcado || totals.totalDespesasOrcado),
      realizado: totals.resultado,
      type: "result" as const,
    },
    {
      categoria: "Posição de Caixa Final",
      orcado: caixaOrcado,
      realizado: caixaRealizado,
      type: "cash" as const,
    },
  ];

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getVariation = (orcado: number, realizado: number) => {
    const diff = realizado - orcado;
    const pct = orcado !== 0 ? ((realizado - orcado) / orcado) * 100 : 0;
    return { diff, pct };
  };

  const title = year 
    ? `Resumo Anual - KPIs Principais (${year})`
    : "Resumo Anual - KPIs Principais";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            <p className="text-base text-muted-foreground">
              Comparativo entre valores orçados e realizados
            </p>
          </div>
          {monthsWithRealizadoCount > 0 && (
            <Badge variant="outline" className="text-sm">
              {monthsWithRealizadoCount} mês(es) com dados realizados
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-base">Categoria</TableHead>
              <TableHead className="text-right font-semibold text-base">Orçado {year}</TableHead>
              <TableHead className="text-right font-semibold text-base">Realizado {year}</TableHead>
              <TableHead className="text-right font-semibold text-base">A Realizar (R$)</TableHead>
              <TableHead className="text-right font-semibold text-base">A Realizar (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaryData.map((row) => {
              const { diff, pct } = getVariation(row.orcado, row.realizado);
              const isPositiveVariation =
                row.type === "expense" ? diff < 0 : diff > 0;

              return (
                <TableRow key={row.categoria} className="text-base">
                  <TableCell
                    className={cn(
                      "font-medium text-base py-4",
                      row.type === "revenue" && "text-revenue",
                      row.type === "expense" && "text-expense",
                      row.type === "result" &&
                        (row.realizado >= 0 ? "text-revenue" : "text-expense"),
                      row.type === "cash" && "text-cash"
                    )}
                  >
                    {row.categoria}
                  </TableCell>
                  <TableCell className="text-right text-base py-4">
                    {row.orcado > 0 ? formatValue(row.orcado) : "-"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold text-base py-4",
                      row.type === "revenue" && "text-revenue",
                      row.type === "expense" && "text-expense",
                      row.type === "result" &&
                        (row.realizado >= 0 ? "text-revenue" : "text-expense"),
                      row.type === "cash" && "text-cash"
                    )}
                  >
                    {formatValue(row.realizado)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium text-base py-4",
                      row.orcado > 0 && (isPositiveVariation ? "text-revenue" : "text-expense")
                    )}
                  >
                    {row.orcado > 0 ? formatValue(Math.abs(diff)) : "-"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium text-base py-4",
                      row.orcado > 0 && (isPositiveVariation ? "text-revenue" : "text-expense")
                    )}
                  >
                    {row.orcado > 0 ? `${Math.abs(pct).toFixed(2)}%` : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
