import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");
    const VAPI_PHONE_NUMBER_ID = Deno.env.get("VAPI_PHONE_NUMBER_ID");
    const VAPI_ASSISTANT_ID = Deno.env.get("VAPI_ASSISTANT_ID");

    if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID || !VAPI_ASSISTANT_ID) {
      console.error("Missing VAPI configuration");
      return new Response(
        JSON.stringify({ error: "VAPI configuration is incomplete" }),
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
    
    // Build dynamic system prompt based on language
    const systemPrompts: Record<string, string> = {
      hindi: `You are Purva, a senior property consultant at Purva Real Estate. You are an Indian woman making an outbound call.

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
Schedule a property site visit. Ask about convenient date/time. Keep responses concise (2-3 sentences max).`,

      english: `You are Purva, a senior property consultant at Purva Real Estate. You are an Indian woman making an outbound call in English.

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
Schedule a property site visit. Ask about convenient date/time. Keep responses concise (2-3 sentences max).`,

      marathi: `You are Purva, a senior property consultant at Purva Real Estate. You are a Maharashtrian woman.

CRITICAL: Respond in Marathi (Roman script). Use feminine Marathi language.

## CLIENT INFORMATION
- Client Name: ${clientName}
- Preferred Location: ${preferredArea || "Nakki nahi zala"}
- Budget Range: ${budget || "Flexible"}

## CONVERSATION GOAL
Schedule a property site visit. Keep responses concise.`,
    };

    const greetings: Record<string, string> = {
      hindi: `Namaste! Kya main ${clientName} ji se baat kar rahi hoon? Main Purva bol rahi hoon, Purva Real Estate se.${preferredArea ? ` Maine dekha aapne ${preferredArea} mein property mein interest dikhaya.` : ""} Kya aapke paas thoda waqt hai baat karne ke liye?`,
      english: `Hello! Am I speaking with ${clientName}? This is Purva from Purva Real Estate.${preferredArea ? ` I noticed you showed interest in properties in ${preferredArea}.` : ""} Do you have a few minutes to chat?`,
      marathi: `Namaskar! Mi ${clientName} ji shi bolte ahe ka? Mi Purva bolte, Purva Real Estate madhun.${preferredArea ? ` Tumhi ${preferredArea} madhye property baghitli.` : ""} Tumhala thoda vel ahe ka bolayala?`,
    };

    const systemPrompt = systemPrompts[language] || systemPrompts.hindi;
    const firstMessage = greetings[language] || greetings.hindi;

    console.log(`Initiating VAPI outbound call to ${formattedPhone} in ${language}`);

    // Create a call_appointment record BEFORE initiating the call
    // This ensures the appointment shows up immediately in the admin panel
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && inquiryId) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Insert the call appointment record
        const { error: insertError } = await supabase
          .from("call_appointments")
          .insert({
            inquiry_id: inquiryId,
            customer_name: clientName,
            customer_phone: formattedPhone,
            property_location: preferredArea || null,
            language: language,
            status: "calling",
            notes: `Call initiated to ${clientName} for ${preferredArea || "property inquiry"}. Budget: ${budget || "Not specified"}`,
          });
        
        if (insertError) {
          console.error("Error creating call appointment:", insertError);
        } else {
          console.log("Call appointment record created for inquiry:", inquiryId);
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
      }
    }

    // Make the outbound call using VAPI API
    const response = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        assistantId: VAPI_ASSISTANT_ID,
        customer: {
          number: formattedPhone,
          name: clientName,
        },
        assistantOverrides: {
          firstMessage: firstMessage,
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
            ],
          },
          voice: {
            provider: "11labs",
            voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica - warm female voice
            stability: 0.6, // Slightly higher for more consistent speech
            similarityBoost: 0.8, // Higher voice consistency
            style: 0.3, // Lower for more natural, less dramatic
            useSpeakerBoost: true, // Clearer voice
          },
          // Slower, more natural speech with pauses
          silenceTimeoutSeconds: 20, // Wait longer for customer response
          responseDelaySeconds: 0.8, // Small pause before responding (more natural)
          numWordsToInterruptAssistant: 2, // Allow interruption naturally
        },
        metadata: {
          inquiryId: inquiryId || "",
          language: language,
          preferredArea: preferredArea || "",
          budget: budget || "",
        },
      }),
    });

    const responseText = await response.text();
    console.log("VAPI response:", response.status, responseText);

    if (!response.ok) {
      console.error("VAPI API error:", response.status, responseText);
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
        message: "Call initiated successfully via VAPI",
        callId: data.id,
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
