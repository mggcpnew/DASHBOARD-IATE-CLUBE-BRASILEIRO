import { cn } from "@/lib/utils";
import { getHealthColor, getHealthLabel, FinancialMetrics } from "@/lib/financialAnalysis";

interface HealthGaugeProps {
  score: number;
  healthIndex: FinancialMetrics["indiceSaude"];
}

export function HealthGauge({ score, healthIndex }: HealthGaugeProps) {
  // SVG arc gauge
  const radius = 40;
  const strokeWidth = 8;
  const circumference = Math.PI * radius; // half-circle
  const progress = Math.min(Math.max(score / 100, 0), 1);
  const dashOffset = circumference * (1 - progress);

  const getStrokeColor = () => {
    if (score >= 75) return "hsl(142, 71%, 45%)"; // green
    if (score >= 50) return "hsl(48, 96%, 53%)"; // yellow
    if (score >= 25) return "hsl(25, 95%, 53%)"; // orange
    return "hsl(0, 84%, 60%)"; // red
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
      <div className="relative w-[100px] h-[56px]">
        <svg width="100" height="56" viewBox="0 0 100 56">
          {/* Background arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Score text centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
          <span className="text-xl font-bold leading-none">{score}</span>
          <span className="text-[10px] text-muted-foreground">de 100</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">Índice de Saúde Financeira</p>
        <p className={cn("text-xs", getHealthColor(healthIndex))}>
          {getHealthLabel(healthIndex)}
        </p>
      </div>
    </div>
  );
}
