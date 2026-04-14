import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export function FileUploadDialog({ 
  open, 
  onOpenChange, 
  onFileUpload,
  isLoading = false,
}: FileUploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fileName, setFileName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const resetState = useCallback(() => {
    setUploadStatus("idle");
    setFileName("");
    setErrorMessage("");
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const validExtensions = [".xlsx", ".xls"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setUploadStatus("error");
      setFileName(file.name);
      setErrorMessage("Formato de arquivo inválido. Use .xlsx ou .xls");
      return;
    }

    setFileName(file.name);
    setUploadStatus("loading");

    try {
      await onFileUpload(file);
      setUploadStatus("success");
      
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 1500);
    } catch (error) {
      setUploadStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro ao processar arquivo");
    }
  }, [onFileUpload, onOpenChange, resetState]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Carregar Dados do Dashboard
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo Excel (.xlsx) com seus dados financeiros.
            O dashboard detectará automaticamente a estrutura do arquivo.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border",
            uploadStatus === "success" && "border-revenue bg-revenue/5",
            uploadStatus === "error" && "border-expense bg-expense/5"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploadStatus === "idle" && (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste e solte seu arquivo Excel aqui
              </p>
              <p className="text-xs text-muted-foreground mb-4">ou</p>
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>Selecionar Arquivo</span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileInput}
              />
            </>
          )}

          {uploadStatus === "loading" && (
            <>
              <Loader2 className="h-10 w-10 mx-auto text-primary mb-4 animate-spin" />
              <p className="text-sm font-medium text-primary">Processando arquivo...</p>
              <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
            </>
          )}

          {uploadStatus === "success" && (
            <>
              <CheckCircle className="h-10 w-10 mx-auto text-revenue mb-4" />
              <p className="text-sm font-medium text-revenue">Arquivo carregado com sucesso!</p>
              <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
            </>
          )}

          {uploadStatus === "error" && (
            <>
              <AlertCircle className="h-10 w-10 mx-auto text-expense mb-4" />
              <p className="text-sm font-medium text-expense">{errorMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={resetState}
              >
                Tentar Novamente
              </Button>
            </>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-2">
          <p className="font-semibold">Formatos suportados automaticamente:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Datas: "01/25", "Jan-2026", "2025-01", "Realizado 03/25"</li>
            <li>Categorias de Receitas e Despesas em qualquer idioma</li>
            <li>Colunas de Orçado/Budget e Realizado/Actual (opcional)</li>
            <li>Layout padrão ou transposto</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
