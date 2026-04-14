import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { CompetencePayment } from "@/lib/delinquencyParser";

interface CompetencePaymentChartProps {
  data: CompetencePayment[];
  year: string;
}

export function CompetencePaymentChart({ data, year }: CompetencePaymentChartProps) {
  const isMobile = useIsMobile();

  const chartData = useMemo(() => {
    return data.map((d) => ({
      label: d.label,
      antecipado: d.antecipado,
      mesCorrente: d.mesCorrente,
      emAtraso: d.emAtraso,
      inadimplencia: parseFloat(d.inadimplencia.toFixed(2)),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm" translate="no">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.dataKey === "inadimplencia" ? `${entry.value}%` : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("border-0 shadow-none bg-muted/30 animate-fade-in", isMobile && "rounded-none")}>
      <CardHeader className={cn("pb-3", isMobile && "px-2")}>
        <CardTitle className="text-xl font-semibold">
          Recebimentos por Competência
        </CardTitle>
        <CardDescription>
          Composição dos pagamentos (antecipado, corrente, atraso) e taxa de inadimplência
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(isMobile && "px-2")}>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
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
                yAxisId="left"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={isMobile ? 40 : 50}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={isMobile ? 40 : 50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
              <Bar
                yAxisId="left"
                dataKey="antecipado"
                name="Antecipado"
                stackId="payments"
                fill="hsl(var(--revenue))"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="mesCorrente"
                name="Mês Corrente"
                stackId="payments"
                fill="hsl(var(--primary))"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="emAtraso"
                name="Em Atraso"
                stackId="payments"
                fill="hsl(var(--expense))"
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="inadimplencia"
                name="Inadimplência %"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--foreground))" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
