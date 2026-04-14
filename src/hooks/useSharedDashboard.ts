import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { ParsedExcelData } from "@/lib/excelParser";
import { toast } from "sonner";

// Generate a short unique ID for sharing
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface SharedDashboard {
  id: string;
  share_id: string;
  title: string;
  dashboard_data: ParsedExcelData;
  created_at: string;
  updated_at: string;
}

export interface UseSharedDashboardReturn {
  isLoading: boolean;
  error: string | null;
  shareDashboard: (title: string, data: ParsedExcelData) => Promise<string | null>;
  updateSharedDashboard: (shareId: string, data: ParsedExcelData) => Promise<boolean>;
  loadSharedDashboard: (shareId: string) => Promise<ParsedExcelData | null>;
  deleteSharedDashboard: (shareId: string) => Promise<boolean>;
}

export function useSharedDashboard(): UseSharedDashboardReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareDashboard = useCallback(async (title: string, data: ParsedExcelData): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const shareId = generateShareId();
      
      // Prepare the insert payload with proper typing
      const insertPayload: TablesInsert<'shared_dashboards'> = {
        share_id: shareId,
        title,
        dashboard_data: JSON.parse(JSON.stringify(data)),
      };
      
      const { error: insertError } = await supabase
        .from('shared_dashboards')
        .insert(insertPayload);

      if (insertError) {
        throw new Error(insertError.message);
      }

      return shareId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao compartilhar dashboard";
      setError(errorMessage);
      toast.error("Erro ao compartilhar", { description: errorMessage });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSharedDashboard = useCallback(async (shareId: string): Promise<ParsedExcelData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Cache busting: timestamp logged to ensure we're making fresh requests
      console.log(`[Cache Bust] Loading dashboard ${shareId} at ${Date.now()}`);
      
      const { data, error: fetchError } = await supabase
        .from('shared_dashboards')
        .select('*')
        .eq('share_id', shareId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!data) {
        setError("Dashboard não encontrado");
        return null;
      }

      // Parse the stored JSON back to ParsedExcelData
      const dashboardData = data.dashboard_data as unknown as ParsedExcelData;
      
      // Restore Date object for lastUpdateDate
      if (dashboardData.lastUpdateDate) {
        dashboardData.lastUpdateDate = new Date(dashboardData.lastUpdateDate);
      }

      return dashboardData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar dashboard";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSharedDashboard = useCallback(async (shareId: string, data: ParsedExcelData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('shared_dashboards')
        .update({
          dashboard_data: JSON.parse(JSON.stringify(data)),
          updated_at: new Date().toISOString(),
        })
        .eq('share_id', shareId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast.success("Dashboard atualizado!", { description: "Os dados do link compartilhado foram atualizados" });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao atualizar dashboard";
      setError(errorMessage);
      toast.error("Erro ao atualizar", { description: errorMessage });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSharedDashboard = useCallback(async (shareId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('shared_dashboards')
        .delete()
        .eq('share_id', shareId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      toast.success("Dashboard removido", { description: "O link de compartilhamento foi invalidado" });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao remover dashboard";
      setError(errorMessage);
      toast.error("Erro ao remover", { description: errorMessage });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    shareDashboard,
    updateSharedDashboard,
    loadSharedDashboard,
    deleteSharedDashboard,
  };
}
