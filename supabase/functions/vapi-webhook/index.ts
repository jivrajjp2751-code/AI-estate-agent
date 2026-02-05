import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const payload = await req.json();
    console.log("VAPI webhook received:", JSON.stringify(payload, null, 2));

    const { message } = payload;
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: "No message in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageType = message.type;
    const call = message.call;

    switch (messageType) {
      case "status-update": {
        const status = message.status;
        console.log(`Call status update: ${status}`, call?.id);
        
        if (call?.id && call?.metadata?.inquiryId) {
          // Update call appointment status based on call status
          const statusMap: Record<string, string> = {
            "queued": "pending",
            "ringing": "calling",
            "in-progress": "in-progress",
            "ended": "completed",
            "failed": "failed",
          };

          const appointmentStatus = statusMap[status] || status;
          
          await supabase
            .from("call_appointments")
            .update({ 
              status: appointmentStatus,
              call_id: call.id,
              updated_at: new Date().toISOString(),
            })
            .eq("inquiry_id", call.metadata.inquiryId);
        }
        break;
      }

      case "end-of-call-report": {
        console.log("Call ended:", call?.id);
        
        const summary = message.summary;
        const transcript = message.transcript;
        const endedReason = message.endedReason;
        const duration = message.durationSeconds;
        
        if (call?.id && call?.metadata?.inquiryId) {
          // Extract appointment details from transcript if available
          let appointmentDate = null;
          let appointmentTime = null;
          let notes = summary || "";
          
          // Add call details to notes
          notes += `\n\nCall Duration: ${duration || 0} seconds`;
          notes += `\nEnded Reason: ${endedReason || "unknown"}`;
          
          if (transcript) {
            notes += `\n\nTranscript:\n${transcript}`;
          }

          await supabase
            .from("call_appointments")
            .update({
              status: endedReason === "hangup" || endedReason === "customer-ended-call" ? "completed" : "failed",
              notes: notes,
              call_id: call.id,
              updated_at: new Date().toISOString(),
            })
            .eq("inquiry_id", call.metadata.inquiryId);
        }
        break;
      }

      case "transcript": {
        // Real-time transcript updates
        const text = message.transcript;
        const role = message.role;
        console.log(`Transcript [${role}]: ${text}`);
        break;
      }

      case "function-call": {
        // Handle function calls from the assistant
        const functionName = message.functionCall?.name;
        const parameters = message.functionCall?.parameters;
        
        console.log(`Function call: ${functionName}`, parameters);
        
        if (functionName === "scheduleAppointment" && call?.metadata?.inquiryId) {
          const { date, time } = parameters || {};
          
          await supabase
            .from("call_appointments")
            .update({
              appointment_date: date,
              appointment_time: time,
              status: "scheduled",
              updated_at: new Date().toISOString(),
            })
            .eq("inquiry_id", call.metadata.inquiryId);

          return new Response(
            JSON.stringify({ 
              result: `Appointment scheduled for ${date} at ${time}` 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      default:
        console.log(`Unhandled message type: ${messageType}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in vapi-webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
