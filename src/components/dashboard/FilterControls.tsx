import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Percent, DollarSign, Upload, HelpCircle, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface FilterControlsProps {
  availableMonths: string[];
  startMonth: string;
  endMonth: string;
  showPercentage: boolean;
  availableYears?: string[];
  selectedYear?: string;
  onYearChange?: (value: string) => void;
  onStartMonthChange: (value: string) => void;
  onEndMonthChange: (value: string) => void;
  onTogglePercentage: () => void;
  onUploadClick: () => void;
  disabled?: boolean;
}

export function FilterControls({
  availableMonths,
  startMonth,
  endMonth,
  showPercentage,
  availableYears,
  selectedYear,
  onYearChange,
  onStartMonthChange,
  onEndMonthChange,
  onTogglePercentage,
  onUploadClick,
  disabled = false,
}: FilterControlsProps) {
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasMultipleYears = availableYears && availableYears.length > 1;

  // Mobile: collapsible filter bar
  if (isMobile) {
    return (
      <div className="bg-card rounded-xl border shadow-sm">
        {/* Always visible row: toggle + upload + expand */}
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePercentage}
            disabled={disabled}
            className={cn(
              "gap-1.5 text-xs flex-1",
              showPercentage && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {showPercentage ? (
              <><Percent className="h-3.5 w-3.5" /> %</>
            ) : (
              <><DollarSign className="h-3.5 w-3.5" /> R$</>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={onUploadClick} className="gap-1.5 text-xs flex-1">
            <Upload className="h-3.5 w-3.5" />
            {disabled ? "Carregar" : "Atualizar"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="gap-1 text-xs"
          >
            <Calendar className="h-3.5 w-3.5" />
            Filtros
            {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {/* Collapsible filters */}
        {filtersOpen && (
          <div className="border-t px-3 pb-3 pt-2 space-y-3">
            {/* Year */}
            {hasMultipleYears && onYearChange && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground w-14">Ano:</label>
                <Select value={selectedYear} onValueChange={onYearChange} disabled={disabled}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Period */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground w-14">Período:</label>
              <Select
                value={startMonth}
                onValueChange={onStartMonthChange}
                disabled={disabled || availableMonths.length === 0}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Início" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">a</span>
              <Select
                value={endMonth}
                onValueChange={onEndMonthChange}
                disabled={disabled || availableMonths.length === 0}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Fim" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: original layout unchanged
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-xl border shadow-sm">
      {hasMultipleYears && onYearChange && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Ano:</label>
            <Select value={selectedYear} onValueChange={onYearChange} disabled={disabled}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-8 w-px bg-border hidden sm:block" />
        </>
      )}

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm font-medium text-muted-foreground">Período:</label>
        <Select
          value={startMonth}
          onValueChange={onStartMonthChange}
          disabled={disabled || availableMonths.length === 0}
        >
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Início" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month}>{month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">até</span>
        <Select
          value={endMonth}
          onValueChange={onEndMonthChange}
          disabled={disabled || availableMonths.length === 0}
        >
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Fim" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month}>{month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-8 w-px bg-border hidden sm:block" />

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onTogglePercentage}
                disabled={disabled}
                className={cn(
                  "gap-2",
                  showPercentage && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {showPercentage ? (
                  <><Percent className="h-4 w-4" />Percentual</>
                ) : (
                  <><DollarSign className="h-4 w-4" />Absoluto</>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Alternar entre valores absolutos (R$) e percentuais (%)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="h-8 w-px bg-border hidden sm:block" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onUploadClick} className="gap-2">
              <Upload className="h-4 w-4" />
              {disabled ? "Carregar Dados" : "Atualizar Dados"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Faça upload de um arquivo Excel para {disabled ? "carregar" : "atualizar"} o dashboard</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="ml-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="font-semibold mb-1">Instruções de Uso</p>
              <ul className="text-xs space-y-1">
                <li>• Carregue um arquivo Excel (.xlsx) para iniciar</li>
                <li>• Use os filtros de período para selecionar o intervalo de meses</li>
                <li>• Clique no toggle para alternar entre valores absolutos e %</li>
                <li>• Passe o mouse sobre os gráficos para ver detalhes</li>
                <li>• O dashboard se adapta automaticamente aos dados do arquivo</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
