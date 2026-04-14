import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Share2, Loader2, ExternalLink, RefreshCw, Link2 } from "lucide-react";
import { useSharedDashboard } from "@/hooks/useSharedDashboard";
import { ParsedExcelData } from "@/lib/excelParser";
import { DelinquencyData } from "@/lib/delinquencyParser";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ShareDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardData: ParsedExcelData;
  dashboardTitle: string;
  delinquencyData?: DelinquencyData | null;
}

interface ExistingShare {
  share_id: string;
  title: string;
  updated_at: string;
}

export function ShareDashboardDialog({
  open,
  onOpenChange,
  dashboardData,
  dashboardTitle,
  delinquencyData,
}: ShareDashboardDialogProps) {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isPreviewOrigin, setIsPreviewOrigin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<Date | null>(null);
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const { isLoading, shareDashboard, updateSharedDashboard } = useSharedDashboard();

  // Load existing shared dashboards when dialog opens
  useEffect(() => {
    if (open) {
      loadExistingShares();
    }
  }, [open]);

  const loadExistingShares = async () => {
    setLoadingShares(true);
    try {
      const { data, error } = await supabase
        .from('shared_dashboards')
        .select('share_id, title, updated_at')
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        setExistingShares(data);
      }
    } catch (err) {
      console.error("Error loading existing shares:", err);
    } finally {
      setLoadingShares(false);
    }
  };

  const getPublicBaseUrl = () => {
    const hostname = window.location.hostname;
    const isPreview =
      hostname.endsWith(".lovableproject.com") ||
      hostname.includes("lovableproject.com") ||
      hostname.startsWith("id-preview--");

    const publishedBaseUrl = "https://insight-spark-311.lovable.app";

    return {
      baseUrl: isPreview ? publishedBaseUrl : window.location.origin,
      isPreview,
    };
  };

  const prepareFreshData = () => {
    const freshData = JSON.parse(JSON.stringify(dashboardData));
    if (freshData.lastUpdateDate) {
      freshData.lastUpdateDate = new Date(freshData.lastUpdateDate);
    }
    if (delinquencyData) {
      freshData._delinquencyData = JSON.parse(JSON.stringify(delinquencyData));
    }
    return freshData;
  };

  const handleShare = async () => {
    const freshData = prepareFreshData();
    
    console.log("[Share] Criando snapshot com dados atuais:", {
      fileName: freshData.fileName,
      year: freshData.year,
      monthsCount: freshData.monthlyData?.length,
      hasDelinquency: !!delinquencyData,
      timestamp: new Date().toISOString(),
    });
    
    const shareId = await shareDashboard(dashboardTitle, freshData);
    
    if (shareId) {
      const { baseUrl, isPreview } = getPublicBaseUrl();
      setIsPreviewOrigin(isPreview);
      setSnapshotTimestamp(new Date());
      const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      const link = `${baseUrl}/share/${shareId}?theme=${currentTheme}`;
      setShareLink(link);
      loadExistingShares();
      toast.success("Link criado com sucesso!", {
        description: "Copie o link e compartilhe com quem desejar",
      });
    }
  };

  const handleUpdateExisting = async (shareId: string) => {
    const freshData = prepareFreshData();
    
    console.log("[Share] Atualizando dashboard existente:", {
      shareId,
      fileName: freshData.fileName,
      monthsCount: freshData.monthlyData?.length,
      hasDelinquency: !!delinquencyData,
      timestamp: new Date().toISOString(),
    });

    const success = await updateSharedDashboard(shareId, freshData);
    
    if (success) {
      const { baseUrl, isPreview } = getPublicBaseUrl();
      setIsPreviewOrigin(isPreview);
      setSnapshotTimestamp(new Date());
      const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
      const link = `${baseUrl}/share/${shareId}?theme=${currentTheme}`;
      setShareLink(link);
      loadExistingShares();
    }
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar link");
    }
  };

  const handleOpenLink = () => {
    if (shareLink) {
      window.open(shareLink, '_blank');
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setCopied(false);
    setSnapshotTimestamp(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Compartilhar Dashboard
          </DialogTitle>
          <DialogDescription>
            Atualize um link existente ou gere um novo link público de compartilhamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!shareLink ? (
            <div className="space-y-4">
              {/* Existing shares - Update section */}
              {existingShares.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Links existentes — atualizar dados:</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {existingShares.map((share) => (
                      <div
                        key={share.share_id}
                        className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3"
                      >
                        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{share.title}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {share.share_id} • Atualizado: {new Date(share.updated_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateExisting(share.share_id)}
                          disabled={isLoading}
                          className="shrink-0 gap-1.5"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Atualizar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingShares && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Divider */}
              {existingShares.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
              )}

              {/* Create new */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">"{dashboardTitle}"</p>
                  <p>Gerar um novo link de compartilhamento.</p>
                </div>
                <Button 
                  onClick={handleShare} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando link...
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Gerar Novo Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-link">Link de compartilhamento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="share-link"
                    value={shareLink}
                    readOnly
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {isPreviewOrigin && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Atenção</p>
                  <p>
                    Você está em modo de pré-visualização. O link acima já foi gerado apontando
                    para o app publicado (público) para evitar a tela "Access Denied".
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenLink}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir Link
                </Button>
                <Button
                  onClick={handleCopy}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Link
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Informações importantes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>O link permanecerá válido enquanto o dashboard existir no sistema</li>
                  <li>Qualquer pessoa com o link pode visualizar o dashboard</li>
                  <li>
                    Você pode atualizar os dados a qualquer momento sem alterar o link
                    {snapshotTimestamp && (
                      <span className="text-primary font-medium">
                        {" "}(última atualização: {snapshotTimestamp.toLocaleString("pt-BR")})
                      </span>
                    )}
                  </li>
                </ul>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShareLink(null)}
                className="w-full text-muted-foreground"
              >
                ← Voltar para a lista de links
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
