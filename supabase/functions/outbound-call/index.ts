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
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    const ELEVENLABS_AGENT_PHONE_NUMBER_ID = Deno.env.get("ELEVENLABS_AGENT_PHONE_NUMBER_ID");

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !ELEVENLABS_AGENT_PHONE_NUMBER_ID) {
      console.error("Missing ElevenLabs configuration");
      return new Response(
        JSON.stringify({ error: "ElevenLabs configuration is incomplete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { inquiryId, phoneNumber, customerName, preferredArea, budget } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for international calling (ensure it has country code)
    let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/-/g, "");
    if (!formattedPhone.startsWith("+")) {
      // Assume India country code if not provided
      formattedPhone = "+91" + formattedPhone.replace(/^0+/, "");
    }

    // Build a personalized first message based on customer info
    let firstMessage = `Hello ${customerName || "there"}! I'm calling from Purva Real Estate. `;
    if (preferredArea) {
      firstMessage += `I see you're interested in properties in ${preferredArea}. `;
    }
    if (budget) {
      firstMessage += `With a budget of ${budget}. `;
    }
    firstMessage += "I'm here to help you find your dream property. Do you have a few minutes to discuss what you're looking for?";

    // System prompt override for the agent
    const agentPromptOverride = `You are a friendly and professional real estate consultant from Purva Real Estate, a premium real estate company in India. 

Your role:
- Help customers find their perfect property
- Answer questions about available properties in areas like Mumbai (Bandra, Worli, Andheri, Powai), Pune (Koregaon Park, Hinjewadi, Kothrud), Nashik, Nagpur, Lonavala, Alibaug, and Panchgani
- Discuss budget options ranging from under ₹50 Lakh to above ₹10 Crore
- Schedule property visits and follow-up calls
- Be warm, helpful, and knowledgeable about Indian real estate

Customer context:
- Name: ${customerName || "Customer"}
- Preferred Area: ${preferredArea || "Not specified"}
- Budget: ${budget || "Not specified"}

Always:
- Introduce yourself as calling from Purva Real Estate
- Be respectful of the customer's time
- Offer to schedule a property viewing
- Provide our website for more information
- End calls politely if the customer is busy

Never:
- Be pushy or aggressive
- Make promises you can't keep
- Share pricing without confirmation`;

    console.log(`Initiating outbound call to ${formattedPhone}`);

    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound_call",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: ELEVENLABS_AGENT_ID,
          agent_phone_number_id: ELEVENLABS_AGENT_PHONE_NUMBER_ID,
          to_number: formattedPhone,
          conversation_initiation_client_data: {
            dynamic_variables: {
              customer_name: customerName || "Customer",
              preferred_area: preferredArea || "any area",
              budget: budget || "flexible",
              company_name: "Purva Real Estate",
            },
            conversation_config_override: {
              agent: {
                prompt: {
                  prompt: agentPromptOverride,
                },
                first_message: firstMessage,
              },
            },
          },
        }),
      }
    );

    const responseText = await response.text();
    console.log("ElevenLabs response:", response.status, responseText);

    if (!response.ok) {
      console.error("ElevenLabs API error:", response.status, responseText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to initiate call", 
          details: responseText,
          status: response.status 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Call initiated successfully",
        data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in outbound-call function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
