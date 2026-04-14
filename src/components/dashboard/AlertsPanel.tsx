import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FinancialAlert, 
  AlertPriority, 
} from "@/lib/financialAnalysis";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";

interface AlertsPanelProps {
  alerts: FinancialAlert[];
  className?: string;
}

export function AlertsPanel({ alerts, className }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card className={cn("shadow-sm h-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Alertas Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-medium">Nenhum alerta no momento</p>
            <p className="text-sm">Os indicadores financeiros estão dentro dos parâmetros esperados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalAlerts = alerts.filter(a => a.prioridade === "ALTA");
  const mediumAlerts = alerts.filter(a => a.prioridade === "MÉDIA");
  const lowAlerts = alerts.filter(a => a.prioridade === "BAIXA");

  return (
    <Card className={cn("shadow-sm h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertas Financeiros
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalAlerts.length} crítico(s)
              </Badge>
            )}
            {mediumAlerts.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 text-xs">
                {mediumAlerts.length} médio(s)
              </Badge>
            )}
            {lowAlerts.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {lowAlerts.length} baixo(s)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 md:px-6 pb-4 md:pb-6">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </CardContent>
    </Card>
  );
}

interface AlertItemProps {
  alert: FinancialAlert;
}

function AlertItem({ alert }: AlertItemProps) {
  const getAlertClassName = (prioridade: AlertPriority): string => {
    switch (prioridade) {
      case "ALTA":
        return "border-destructive/50 bg-destructive/5 dark:bg-destructive/10";
      case "MÉDIA":
        return "border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50";
      case "BAIXA":
        return "border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700/50";
      default:
        return "";
    }
  };

  const getSemaphoreIcon = (prioridade: AlertPriority) => {
    switch (prioridade) {
      case "ALTA":
        return <div className="h-3.5 w-3.5 rounded-full bg-destructive shrink-0 mt-0.5 shadow-[0_0_6px_hsl(var(--destructive)/0.5)]" />;
      case "MÉDIA":
        return <div className="h-3.5 w-3.5 rounded-full bg-amber-500 shrink-0 mt-0.5 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />;
      case "BAIXA":
        return <div className="h-3.5 w-3.5 rounded-full bg-blue-500 shrink-0 mt-0.5 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />;
      default:
        return <div className="h-3.5 w-3.5 rounded-full bg-muted shrink-0 mt-0.5" />;
    }
  };

  const formatValue = (value?: number) => {
    if (value === undefined) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
  };

  return (
    <div className={cn(
      "rounded-lg border p-2.5 md:p-3 transition-all hover:shadow-sm",
      getAlertClassName(alert.prioridade)
    )}>
      <div className="flex items-start gap-3">
        {getSemaphoreIcon(alert.prioridade)}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{alert.titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.descricao}</p>
          {alert.valor !== undefined && (
            <p className="text-xs font-medium mt-1">
              Valor: {formatValue(alert.valor)}
            </p>
          )}
          <div className="flex items-start gap-1 text-xs text-muted-foreground pt-1.5 mt-1.5 border-t border-border/50">
            <ChevronRight className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="font-medium shrink-0">Ação recomendada:</span>
            <span className="break-words">{alert.acao}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
