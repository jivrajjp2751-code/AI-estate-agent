import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface AuditLogEntry {
  action: string;
  target_type: string;
  target_id?: string;
  target_email?: string;
  details?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const logAction = async (entry: AuditLogEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("Cannot log audit action: No authenticated user");
        return;
      }

      const { error } = await supabase
        .from("admin_audit_logs")
        .insert([{
          action: entry.action,
          target_type: entry.target_type,
          target_id: entry.target_id || null,
          target_email: entry.target_email || null,
          details: (entry.details || null) as Json,
          performed_by: user.id,
          performed_by_email: user.email || null,
        }]);

      if (error) {
        console.error("Failed to log audit action:", error);
      }
    } catch (error) {
      console.error("Error logging audit action:", error);
    }
  };

  return { logAction };
};
