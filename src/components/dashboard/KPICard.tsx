import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number;
  variation?: number;
  showVariation?: boolean;
  prefix?: string;
  suffix?: string;
  type?: "revenue" | "expense" | "result" | "cash";
  comparisonLabel?: string;
  comparisonValue?: number;
  /** When set, shows "Planejado para [month]" instead of realized value */
  temporalLabel?: string;
}

export function KPICard({
  title,
  value,
  variation,
  showVariation = true,
  prefix = "R$",
  type = "cash",
  comparisonLabel = "vs. Orçado",
  comparisonValue,
  temporalLabel,
}: KPICardProps) {
  const formatValue = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getTypeStyles = () => {
    switch (type) {
      case "revenue":
        return "bg-revenue-light border-revenue/20";
      case "expense":
        return "bg-expense-light border-expense/20";
      case "result":
        return value >= 0 ? "bg-revenue-light border-revenue/20" : "bg-expense-light border-expense/20";
      case "cash":
      default:
        return "bg-cash-light border-cash/20";
    }
  };

  const getValueColor = () => {
    switch (type) {
      case "revenue":
        return "text-revenue";
      case "expense":
        return "text-expense";
      case "result":
        return value >= 0 ? "text-revenue" : "text-expense";
      case "cash":
      default:
        return "text-cash";
    }
  };

  const getVariationIcon = () => {
    if (!variation) return <Minus className="h-4 w-4" />;
    if (variation > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getVariationColor = () => {
    if (!variation) return "text-muted-foreground";
    // For expenses, negative variation is good (below budget)
    if (type === "expense") {
      return variation < 0 ? "text-revenue" : "text-expense";
    }
    return variation > 0 ? "text-revenue" : "text-expense";
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 md:p-6 shadow-sm transition-all hover:shadow-md",
        "dark:shadow-md dark:hover:shadow-lg dark:border-opacity-30",
        getTypeStyles()
      )}
    >
      <p className="text-sm md:text-base font-medium text-muted-foreground mb-1.5 md:mb-2">{title}</p>
      {temporalLabel ? (
        <div className="mt-1">
          <p className={cn("text-2xl md:text-3xl font-bold tracking-tight drop-shadow-sm", getValueColor())}>
            {prefix} {formatValue(value)}
          </p>
          <p className="text-sm font-medium text-muted-foreground mt-2">
            {temporalLabel}
          </p>
        </div>
      ) : (
        <>
          <p className={cn("text-2xl md:text-3xl font-bold tracking-tight drop-shadow-sm", getValueColor())}>
            {prefix} {formatValue(value)}
          </p>
          {showVariation && variation !== undefined && (
            <div className="mt-3 space-y-1">
              <div className={cn("flex items-center gap-1.5 text-base font-medium", getVariationColor())}>
                {getVariationIcon()}
                <span>{variation > 0 ? "+" : ""}{variation.toFixed(2)}% {comparisonLabel}</span>
              </div>
              {comparisonValue !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Orçado: {prefix} {formatValue(comparisonValue)}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
