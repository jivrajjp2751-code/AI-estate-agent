import { supabase } from "@/integrations/supabase/client";

interface NotifyParams {
  action: "role_change" | "access_granted" | "access_removed" | "bulk_access_removed" | "bulk_role_change";
  targetEmail?: string;
  details?: Record<string, unknown>;
}

export const useAdminNotify = () => {
  const sendNotification = async ({ action, targetEmail, details }: NotifyParams) => {
    try {
      // Get current user's email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Cannot send notification: No authenticated user");
        return;
      }

      // Fetch all admin emails (excluding the current user to avoid self-notification)
      const { data: admins, error: adminsError } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "admin")
        .neq("user_id", user.id);

      if (adminsError) {
        console.error("Failed to fetch admin emails:", adminsError);
        return;
      }

      const adminEmails = admins
        ?.map((a) => a.email)
        .filter((email): email is string => !!email) || [];

      if (adminEmails.length === 0) {
        console.log("No other admins to notify");
        return;
      }

      const { error } = await supabase.functions.invoke("admin-notify", {
        body: {
          action,
          performedBy: user.email || "Unknown admin",
          targetEmail,
          details,
          adminEmails,
        },
      });

      if (error) {
        console.error("Failed to send admin notification:", error);
      }
    } catch (error) {
      console.error("Error sending admin notification:", error);
    }
  };

  return { sendNotification };
};
