import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminNotifyRequest {
  action: "role_change" | "access_granted" | "access_removed" | "bulk_access_removed" | "bulk_role_change";
  performedBy: string;
  targetEmail?: string;
  details?: Record<string, unknown>;
  adminEmails: string[];
}

const getActionSubject = (action: string): string => {
  switch (action) {
    case "role_change":
      return "User Role Changed";
    case "access_granted":
      return "New User Access Granted";
    case "access_removed":
      return "User Access Removed";
    case "bulk_access_removed":
      return "Multiple Users Access Removed";
    case "bulk_role_change":
      return "Multiple Users Roles Changed";
    default:
      return "Admin Action Notification";
  }
};

const getActionDescription = (action: string, targetEmail?: string, details?: Record<string, unknown>): string => {
  switch (action) {
    case "role_change":
      return `The role for <strong>${targetEmail || "a user"}</strong> has been changed from <strong>${details?.old_role || "unknown"}</strong> to <strong>${details?.new_role || "unknown"}</strong>.`;
    case "access_granted":
      return `Access has been granted to <strong>${targetEmail || "a user"}</strong> with the role of <strong>${details?.role || "unknown"}</strong>.`;
    case "access_removed":
      return `Access has been removed for <strong>${targetEmail || "a user"}</strong>. Their previous role was <strong>${details?.previous_role || "unknown"}</strong>.`;
    case "bulk_access_removed":
      const removedEmails = (details?.emails as string[]) || [];
      return `Access has been removed for <strong>${details?.count || 0}</strong> user(s): ${removedEmails.join(", ") || "unknown users"}.`;
    case "bulk_role_change":
      const changedEmails = (details?.emails as string[]) || [];
      return `The role has been changed to <strong>${details?.new_role || "unknown"}</strong> for <strong>${details?.count || 0}</strong> user(s): ${changedEmails.join(", ") || "unknown users"}.`;
    default:
      return "An admin action has occurred.";
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, performedBy, targetEmail, details, adminEmails }: AdminNotifyRequest = await req.json();

    if (!adminEmails || adminEmails.length === 0) {
      console.log("No admin emails to notify");
      return new Response(JSON.stringify({ message: "No admins to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subject = `[Purva Admin] ${getActionSubject(action)}`;
    const description = getActionDescription(action, targetEmail, details);
    const timestamp = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .action-badge { display: inline-block; background: #d4af37; color: #1a1a2e; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 12px; text-transform: uppercase; }
            .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #d4af37; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🔔 Admin Notification</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Purva Real Estate Dashboard</p>
            </div>
            <div class="content">
              <span class="action-badge">${getActionSubject(action)}</span>
              <div class="details">
                <p style="margin: 0;">${description}</p>
              </div>
              <p><strong>Performed by:</strong> ${performedBy}</p>
              <p><strong>Time:</strong> ${timestamp}</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from Purva Admin Dashboard.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to all admin emails
    const emailPromises = adminEmails.map((email) =>
      resend.emails.send({
        from: "Purva Admin <onboarding@resend.dev>",
        to: [email],
        subject,
        html: htmlContent,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: "Notifications sent", 
        successful, 
        failed 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in admin-notify function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
