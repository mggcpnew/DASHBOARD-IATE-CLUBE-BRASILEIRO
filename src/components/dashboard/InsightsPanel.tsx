import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FinancialInsight, 
  FinancialMetrics,
  getHealthColor,
  getHealthLabel
} from "@/lib/financialAnalysis";
import { cn } from "@/lib/utils";
import { Lightbulb, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HealthGauge } from "@/components/dashboard/HealthGauge";

interface InsightsPanelProps {
  insights: FinancialInsight[];
  metrics: FinancialMetrics;
  summary: {
    pontuacaoSaude: number;
    tendencia: "positiva" | "negativa" | "estavel";
  };
  className?: string;
}

export function InsightsPanel({ insights, metrics, summary, className }: InsightsPanelProps) {
  const getTrendIcon = () => {
    switch (summary.tendencia) {
      case "positiva":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "negativa":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = () => {
    switch (summary.tendencia) {
      case "positiva":
        return "Tendência Positiva";
      case "negativa":
        return "Tendência Negativa";
      default:
        return "Tendência Estável";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={cn("shadow-sm h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Insights e Recomendações
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1",
              summary.tendencia === "positiva" && "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/50 dark:text-green-400 dark:border-green-700",
              summary.tendencia === "negativa" && "border-red-500 text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-400 dark:border-red-700"
            )}
          >
            {getTrendIcon()}
            <span className="text-xs">{getTrendLabel()}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Gauge */}
        <HealthGauge 
          score={summary.pontuacaoSaude} 
          healthIndex={metrics.indiceSaude} 
        />

        {/* Key Metrics - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Maior Receita"
            value={formatCurrency(metrics.maiorReceita.valor)}
            sublabel={metrics.maiorReceita.mes}
            type="positive"
          />
          <MetricCard
            label="Maior Despesa"
            value={formatCurrency(metrics.maiorDespesa.valor)}
            sublabel={metrics.maiorDespesa.mes}
            type="negative"
          />
          <MetricCard
            label="Melhor Resultado"
            value={formatCurrency(metrics.melhorResultado.valor)}
            sublabel={metrics.melhorResultado.mes}
            type="positive"
          />
          <MetricCard
            label="Pior Resultado"
            value={formatCurrency(metrics.piorResultado.valor)}
            sublabel={metrics.piorResultado.mes}
            type={metrics.piorResultado.valor >= 0 ? "neutral" : "negative"}
          />
        </div>

        {/* Insights List - Simple divider style */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Análises Detalhadas</p>
          <div className="divide-y divide-border/50">
            {insights.map((insight) => (
              <InsightItem key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  sublabel: string;
  type: "positive" | "negative" | "neutral";
}

function MetricCard({ label, value, sublabel, type }: MetricCardProps) {
  return (
    <div className={cn(
      "p-2.5 rounded-lg border",
      type === "positive" && "bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
      type === "negative" && "bg-red-50/50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
      type === "neutral" && "bg-muted/30 border-border"
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "text-sm font-semibold",
        type === "positive" && "text-green-700 dark:text-green-400",
        type === "negative" && "text-red-700 dark:text-red-400",
        type === "neutral" && "text-foreground"
      )}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

interface InsightItemProps {
  insight: FinancialInsight;
}

function InsightItem({ insight }: InsightItemProps) {
  // Parse markdown-like bold text
  const formatText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index}>{part}</strong>;
      }
      return part;
    });
  };

  const getBgClass = () => {
    switch (insight.tipo) {
      case "positive":
        return "bg-green-50/50 dark:bg-green-950/20";
      case "negative":
        return "bg-red-50/50 dark:bg-red-950/20";
      case "recommendation":
        return "bg-amber-50/50 dark:bg-amber-950/20";
      default:
        return "";
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-2.5 py-2 px-2 rounded-md transition-colors",
      getBgClass()
    )}>
      <span className="text-base shrink-0 mt-0.5">{insight.icon}</span>
      <p className="text-sm leading-relaxed">{formatText(insight.texto)}</p>
    </div>
  );
}
