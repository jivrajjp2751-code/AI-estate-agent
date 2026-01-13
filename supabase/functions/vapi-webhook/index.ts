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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("VAPI Webhook received:", JSON.stringify(payload, null, 2));

    const { message } = payload;

    // Handle different VAPI webhook events
    if (message?.type === "tool-calls") {
      // Handle tool calls - specifically for scheduling appointments
      const toolCalls = message.toolCalls || [];
      
      for (const toolCall of toolCalls) {
        if (toolCall.function?.name === "schedule_appointment") {
          const args = toolCall.function.arguments || {};
          const metadata = message.call?.assistantOverrides?.metadata || {};

          // Save appointment to database
          const { error } = await supabase.from("call_appointments").insert({
            inquiry_id: metadata.inquiryId || null,
            customer_name: metadata.customerName || args.customerName || "Unknown",
            customer_phone: message.call?.customer?.number || "",
            appointment_date: args.date || null,
            appointment_time: args.time || null,
            property_location: args.location || metadata.preferredArea || null,
            notes: args.notes || null,
            call_id: message.call?.id || null,
            language: metadata.language || "hindi",
            status: "scheduled",
          });

          if (error) {
            console.error("Error saving appointment:", error);
          } else {
            console.log("Appointment saved successfully");
          }
        }
      }
    }

    // Handle end-of-call reports
    if (message?.type === "end-of-call-report") {
      const summary = message.summary || "";
      const transcript = message.transcript || "";
      const metadata = message.call?.assistantOverrides?.metadata || {};

      // Check if appointment was discussed in the call
      const appointmentKeywords = [
        "appointment", "visit", "schedule", "book", "Saturday", "Sunday",
        "meeting", "mulakat", "bhent", "appointment fix"
      ];

      const hasAppointment = appointmentKeywords.some(
        (keyword) =>
          summary.toLowerCase().includes(keyword.toLowerCase()) ||
          transcript.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasAppointment) {
        // Try to extract date/time from summary or transcript
        const dateMatch = summary.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        const timeMatch = summary.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)/i);

        const { error } = await supabase.from("call_appointments").insert({
          inquiry_id: metadata.inquiryId || null,
          customer_name: metadata.customerName || "Unknown",
          customer_phone: message.call?.customer?.number || "",
          appointment_date: dateMatch ? dateMatch[1] : null,
          appointment_time: timeMatch ? timeMatch[1] : null,
          property_location: metadata.preferredArea || null,
          notes: `Call Summary: ${summary}`,
          call_id: message.call?.id || null,
          language: metadata.language || "hindi",
          status: "pending_confirmation",
        });

        if (error) {
          console.error("Error saving appointment from call report:", error);
        } else {
          console.log("Appointment from call report saved successfully");
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in vapi-webhook function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
