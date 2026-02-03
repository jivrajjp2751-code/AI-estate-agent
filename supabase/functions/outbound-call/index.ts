import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language configurations for the AI agent
const languageConfig = {
  hindi: {
    systemPrompt: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva, a senior property consultant at Purva Real Estate. You are an Indian woman making an outbound call.

CRITICAL: You MUST respond in Hindi (Hinglish - Hindi in Roman script). You are a WOMAN - use feminine language.

## YOUR IDENTITY
- Name: Purva
- Gender: Female
- Company: Purva Real Estate
- Role: Senior Property Consultant

## CLIENT INFORMATION
- Client Name: ${clientName}
- Preferred Location: ${preferredArea || "Not specified"}
- Budget Range: ${budget || "Flexible"}

## LANGUAGE STYLE (HINDI - FEMININE)
- Use feminine verb forms: "kar rahi hoon", "bol rahi hoon", "samjh gayi"
- Respectful: "ji", "aap", "please", "dhanyawaad"
- Warm phrases: "Bilkul ji", "Zaroor", "Acha ji"

## CONVERSATION GOAL
Schedule a property site visit. Ask about convenient date/time. Keep responses concise (2-3 sentences max).
`,
    greeting: (clientName: string, preferredArea: string | null, budget: string | null) => {
      let msg = `Namaste! Kya main ${clientName} ji se baat kar rahi hoon? Main Purva bol rahi hoon, Purva Real Estate se.`;
      if (preferredArea) msg += ` Maine dekha aapne ${preferredArea} mein property mein interest dikhaya.`;
      msg += ` Kya aapke paas thoda waqt hai baat karne ke liye?`;
      return msg;
    },
  },
  english: {
    systemPrompt: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva, a senior property consultant at Purva Real Estate. You are an Indian woman making an outbound call in English.

## YOUR IDENTITY
- Name: Purva
- Gender: Female
- Company: Purva Real Estate
- Role: Senior Property Consultant

## CLIENT INFORMATION
- Client Name: ${clientName}
- Preferred Location: ${preferredArea || "Not specified"}
- Budget Range: ${budget || "Flexible"}

## CONVERSATION GOAL
Schedule a property site visit. Ask about convenient date/time. Keep responses concise (2-3 sentences max).
`,
    greeting: (clientName: string, preferredArea: string | null, budget: string | null) => {
      let msg = `Hello! Am I speaking with ${clientName}? This is Purva from Purva Real Estate.`;
      if (preferredArea) msg += ` I noticed you showed interest in properties in ${preferredArea}.`;
      msg += ` Do you have a few minutes to chat?`;
      return msg;
    },
  },
  marathi: {
    systemPrompt: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva, a senior property consultant at Purva Real Estate. You are a Maharashtrian woman.

CRITICAL: Respond in Marathi (Roman script). Use feminine Marathi language.

## CLIENT INFORMATION
- Client Name: ${clientName}
- Preferred Location: ${preferredArea || "Nakki nahi zala"}
- Budget Range: ${budget || "Flexible"}

## CONVERSATION GOAL
Schedule a property site visit. Keep responses concise.
`,
    greeting: (clientName: string, preferredArea: string | null, budget: string | null) => {
      let msg = `Namaskar! Mi ${clientName} ji shi bolte ahe ka? Mi Purva bolte, Purva Real Estate madhun.`;
      if (preferredArea) msg += ` Tumhi ${preferredArea} madhye property baghitli.`;
      msg += ` Tumhala thoda vel ahe ka bolayala?`;
      return msg;
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing Twilio configuration");
      return new Response(
        JSON.stringify({ error: "Twilio configuration is incomplete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ELEVENLABS_API_KEY) {
      console.error("Missing ElevenLabs API key");
      return new Response(
        JSON.stringify({ error: "ElevenLabs configuration is incomplete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { inquiryId, phoneNumber, customerName, preferredArea, budget, language = "hindi" } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for international calling
    let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/-/g, "");
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone.replace(/^0+/, "");
    }

    const clientName = customerName || "Sir ya Madam";
    const langConfig = languageConfig[language as keyof typeof languageConfig] || languageConfig.hindi;
    
    // Generate greeting using ElevenLabs TTS
    const greetingText = langConfig.greeting(clientName, preferredArea, budget);
    
    // Get the TTS audio URL (we'll use Twilio's <Play> with a webhook)
    const ttsWebhookUrl = `${SUPABASE_URL}/functions/v1/twilio-tts-webhook`;
    
    // Create TwiML for the call with conversation webhook
    const conversationWebhookUrl = `${SUPABASE_URL}/functions/v1/twilio-conversation-webhook`;
    
    // TwiML that plays greeting and then gathers speech
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${new URL(SUPABASE_URL!).host}/functions/v1/twilio-media-stream">
      <Parameter name="inquiryId" value="${inquiryId || ''}" />
      <Parameter name="customerName" value="${clientName}" />
      <Parameter name="preferredArea" value="${preferredArea || ''}" />
      <Parameter name="budget" value="${budget || ''}" />
      <Parameter name="language" value="${language}" />
      <Parameter name="greeting" value="${encodeURIComponent(greetingText)}" />
    </Stream>
  </Connect>
</Response>`;

    console.log(`Initiating Twilio outbound call to ${formattedPhone} in ${language}`);

    // Make the outbound call using Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("To", formattedPhone);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Twiml", twiml);
    
    // Add status callback for call events
    formData.append("StatusCallback", `${SUPABASE_URL}/functions/v1/twilio-status-callback`);
    formData.append("StatusCallbackEvent", "initiated ringing answered completed");
    formData.append("StatusCallbackMethod", "POST");

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log("Twilio response:", response.status, responseText);

    if (!response.ok) {
      console.error("Twilio API error:", response.status, responseText);
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
        callSid: data.sid,
        language: language,
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
