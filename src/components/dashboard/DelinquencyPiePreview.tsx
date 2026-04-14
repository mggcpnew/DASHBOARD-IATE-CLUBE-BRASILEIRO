import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MonthlyDelinquency } from "@/lib/delinquencyParser";

interface DelinquencyPiePreviewProps {
  data: MonthlyDelinquency[];
  year: string;
}

const COLORS = [
  "hsl(var(--revenue))",
  "hsl(var(--expense))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
];

export function DelinquencyPiePreview({ data, year }: DelinquencyPiePreviewProps) {
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(data.length > 0 ? data[data.length - 1].label : "");

  const monthData = useMemo(() => {
    const entry = data.find((d) => d.label === selectedMonth);
    if (!entry) return null;

    const inadimplentes = entry.faturadas - entry.recebidasNoMes;
    const totalSocios = entry.sociosPagantes + entry.sociosSocial + entry.sociosNautica;

    return {
      mensalidades: [
        { name: "Recebidas", value: entry.recebidasNoMes },
        { name: "Inadimplentes", value: inadimplentes > 0 ? inadimplentes : 0 },
      ],
      socios: [
        { name: "Pagantes", value: entry.sociosPagantes },
        { name: "Social", value: entry.sociosSocial },
        { name: "Náutica", value: entry.sociosNautica },
      ],
      totalFaturadas: entry.faturadas,
      totalSocios,
      taxaMensalidades: entry.inadimplenciaMensalidades,
      taxaSocios: entry.inadimplenciaSocios,
    };
  }, [data, selectedMonth]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          backgroundColor: "hsl(220 20% 13%)",
          border: "1px solid hsl(220 15% 25%)",
          borderRadius: 8,
          padding: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
        className="text-sm"
      >
        <p className="font-semibold text-foreground" style={{ color: payload[0].payload.fill || payload[0].color }}>
          {payload[0].name}
        </p>
        <p className="text-foreground mt-0.5">
          Quantidade: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  };

  const renderOuterLabel = ({ name, percent, cx, cy, midAngle, outerRadius }: any) => {
    const RADIAN = Math.PI / 180;
    const offset = isMobile ? 20 : 32;
    const radius = outerRadius + offset;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = (percent * 100).toFixed(isMobile ? 0 : 1);
    if (percent < 0.02) return null;
    const anchor = x > cx ? "start" : "end";
    return (
      <g>
        <text x={x} y={y - 7} fill="hsl(var(--foreground))" textAnchor={anchor} dominantBaseline="central" fontSize={isMobile ? 10 : 11} className="fill-muted-foreground">
          {name}
        </text>
        <text x={x} y={y + 8} fill="hsl(var(--foreground))" textAnchor={anchor} dominantBaseline="central" fontSize={isMobile ? 12 : 13} fontWeight={700}>
          {pct}%
        </text>
      </g>
    );
  };

  if (!monthData) return null;

  const outerR = isMobile ? 90 : 110;
  const innerR = isMobile ? 54 : 66;

  const renderDonut = (
    chartData: { name: string; value: number }[],
    colors: string[],
    centerValue: number,
    centerLabel: string,
    keyPrefix: string,
  ) => (
    <div className={cn("relative animate-fade-in", isMobile ? "h-[280px]" : "h-[420px]")} style={{ padding: isMobile ? 5 : 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={isMobile ? { top: 20, bottom: 20, left: 20, right: 20 } : { top: 30, bottom: 60, left: 40, right: 40 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy={isMobile ? "45%" : "44%"}
            innerRadius={innerR}
            outerRadius={outerR}
            paddingAngle={3}
            dataKey="value"
            label={renderOuterLabel}
            labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${keyPrefix}-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 10 }} />
          {!isMobile && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} verticalAlign="bottom" align="center" />}
        </PieChart>
      </ResponsiveContainer>
      {/* Center label inside donut hole */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 0, bottom: isMobile ? 50 : 110 }}>
        <div className="text-center">
          <span className={cn("font-bold text-foreground leading-none", isMobile ? "text-xl" : "text-2xl")}>{centerValue}</span>
          <span className={cn("block text-muted-foreground leading-tight mt-0.5", isMobile ? "text-xs" : "text-xs")}>{centerLabel}</span>
        </div>
      </div>
    </div>
  );

  // Mobile inline legend
  const renderMobileLegend = (items: { name: string; color: string; value: number }[]) => (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 text-[11px]">
      {items.map((item) => (
        <span key={item.name} className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}: {item.value}</span>
        </span>
      ))}
    </div>
  );

  return (
    <Card className={cn(
      "border-0 shadow-none bg-muted/30 animate-fade-in",
      isMobile && "rounded-none"
    )}>
      <CardHeader className={cn("pb-3", isMobile && "px-3")}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              🔄 Inadimplência — Composição
            </CardTitle>
            <CardDescription>
              Donut chart por mês selecionado
            </CardDescription>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[120px] border-border/50 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.map((d) => (
                <SelectItem key={d.label} value={d.label}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className={cn(isMobile && "px-3")}>
        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
          {/* Mensalidades Donut */}
          <div className="text-center">
            <h4 className="font-semibold text-sm text-muted-foreground mb-0.5">Mensalidades</h4>
            <p className="text-2xl font-bold text-expense">{monthData.taxaMensalidades.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mb-2">de inadimplência</p>
            {renderDonut(
              monthData.mensalidades,
              ["hsl(var(--revenue))", "hsl(var(--expense))"],
              monthData.totalFaturadas,
              "Faturadas",
              "m",
            )}
            {isMobile && renderMobileLegend(
              monthData.mensalidades.map((item, i) => ({
                name: item.name,
                color: i === 0 ? "hsl(var(--revenue))" : "hsl(var(--expense))",
                value: item.value,
              }))
            )}
          </div>

          {/* Sócios Donut */}
          <div className="text-center">
            <h4 className="font-semibold text-sm text-muted-foreground mb-0.5">Sócios</h4>
            <p className="text-2xl font-bold text-primary">{monthData.taxaSocios.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mb-2">de inadimplência</p>
            {renderDonut(
              monthData.socios,
              [COLORS[0], COLORS[1], COLORS[2]],
              monthData.totalSocios,
              "Total",
              "s",
            )}
            {isMobile && renderMobileLegend(
              monthData.socios.map((item, i) => ({
                name: item.name,
                color: COLORS[i],
                value: item.value,
              }))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
