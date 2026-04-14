import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Upload, BarChart3, TrendingUp, Wallet } from "lucide-react";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full shadow-lg border-2 border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit mb-4">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            Dashboard Financeiro Dinâmico
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Carregue um arquivo Excel para visualizar seu dashboard personalizado
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">5+ Visualizações</span>
              <span className="text-xs text-muted-foreground">Gráficos interativos</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <TrendingUp className="h-8 w-8 text-revenue mb-2" />
              <span className="font-medium">Análise Dinâmica</span>
              <span className="text-xs text-muted-foreground">Qualquer ano ou estrutura</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <Wallet className="h-8 w-8 text-cash mb-2" />
              <span className="font-medium">KPIs Automáticos</span>
              <span className="text-xs text-muted-foreground">Calculados do arquivo</span>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full gap-2"
            onClick={onUploadClick}
          >
            <Upload className="h-5 w-5" />
            Carregar Arquivo Excel
          </Button>

          <div className="text-xs text-muted-foreground space-y-2 border-t pt-4">
            <p className="font-semibold">Estrutura esperada do arquivo:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Colunas de meses (ex: "Realizado 01/25", "02/26", "Jan-2025")</li>
              <li>Seções de Receitas e Despesas com subcategorias</li>
              <li>Colunas opcionais: Orçado, Realizado, Variação %</li>
              <li>Linha de Resultado e Posição de Caixa Final</li>
            </ul>
            <p className="italic mt-2">
              O dashboard detecta automaticamente a estrutura e se adapta a qualquer ano!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
