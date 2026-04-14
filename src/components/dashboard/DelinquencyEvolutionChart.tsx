import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from "recharts";
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { MonthlyDelinquency } from "@/lib/delinquencyParser";

interface DelinquencyEvolutionChartProps {
  data: MonthlyDelinquency[];
  year: string;
}

export function DelinquencyEvolutionChart({ data, year }: DelinquencyEvolutionChartProps) {
  const isMobile = useIsMobile();

  const { chartData, maxMensalidades, minMensalidades, maxSocios, minSocios } = useMemo(() => {
    const chartData = data.map((d) => ({
      label: d.label,
      mensalidades: parseFloat(d.inadimplenciaMensalidades.toFixed(2)),
      socios: parseFloat(d.inadimplenciaSocios.toFixed(2)),
    }));

    let maxM = { label: "", value: -Infinity, idx: 0 };
    let minM = { label: "", value: Infinity, idx: 0 };
    let maxS = { label: "", value: -Infinity, idx: 0 };
    let minS = { label: "", value: Infinity, idx: 0 };

    chartData.forEach((d, i) => {
      if (d.mensalidades > maxM.value) maxM = { label: d.label, value: d.mensalidades, idx: i };
      if (d.mensalidades < minM.value) minM = { label: d.label, value: d.mensalidades, idx: i };
      if (d.socios > maxS.value) maxS = { label: d.label, value: d.socios, idx: i };
      if (d.socios < minS.value) minS = { label: d.label, value: d.socios, idx: i };
    });

    return {
      chartData,
      maxMensalidades: maxM,
      minMensalidades: minM,
      maxSocios: maxS,
      minSocios: minS,
    };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.value.toFixed(2)}%
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("border-0 shadow-none bg-muted/30 animate-fade-in", isMobile && "rounded-none")}>
      <CardHeader className={cn("pb-3", isMobile && "px-2")}>
        <CardTitle className="text-xl font-semibold">
          Evolução da Inadimplência
        </CardTitle>
        <CardDescription>
          Taxas mensais por mensalidades e por sócios pagantes
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(isMobile && "px-2")}>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: isMobile ? 10 : 30,
                left: isMobile ? -10 : 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={isMobile ? 45 : 55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: isMobile ? 11 : 13 }}
              />
              <Line
                type="monotone"
                dataKey="mensalidades"
                name="Por Mensalidades"
                stroke="hsl(var(--expense))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="socios"
                name="Por Sócios Pagantes"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              {/* Max/Min markers for mensalidades */}
              <ReferenceDot
                x={maxMensalidades.label}
                y={maxMensalidades.value}
                r={6}
                fill="hsl(var(--expense))"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
              <ReferenceDot
                x={minMensalidades.label}
                y={minMensalidades.value}
                r={6}
                fill="hsl(var(--revenue))"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
