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

    const clientName = customerName || "Sir ya Madam";

    // Build a personalized first message in Hindi
    let firstMessage = `Namaste! Kya main ${clientName} ji se baat kar raha hoon? Main Purva Real Estate se bol raha hoon. Aapko disturb toh nahi kar raha? Maine dekha ki aapne recently property mein interest dikhaya hai`;
    if (preferredArea) {
      firstMessage += ` ${preferredArea} area mein`;
    }
    if (budget) {
      firstMessage += ` aur aapka budget ${budget} hai`;
    }
    firstMessage += `. Main aapki dream property dhundhne mein madad karna chahta hoon. Kya aapke paas kuch minute hain baat karne ke liye?`;

    // Comprehensive agent prompt for formal, professional conversation in Hindi
    const agentPrompt = `You are a senior property consultant at Purva Real Estate, one of India's most trusted real estate companies. You are making an outbound call to a prospective client.

IMPORTANT: You MUST speak in Hindi (Hinglish - Hindi written in Roman script). Use natural conversational Hindi mixed with common English real estate terms.

## YOUR IDENTITY
- Company: Purva Real Estate
- Role: Senior Property Consultant
- Experience: 8 years in premium real estate
- Speaking style: Warm, professional, respectful - typical Indian hospitality

## CLIENT INFORMATION
- Client Name: ${clientName}
- Preferred Location: ${preferredArea || "Abhi decide nahi hua"}
- Budget Range: ${budget || "Flexible"}

## LANGUAGE GUIDELINES
- Speak in Hindi (Hinglish) throughout the conversation
- Use respectful terms like "ji", "aap", "please", "dhanyawaad"
- Common phrases to use:
  - "Namaste" for greeting
  - "Bilkul" for "absolutely"
  - "Zaroor" for "certainly"
  - "Sahi hai" for agreement
  - "Dhanyawaad" for thank you
  - "Koi baat nahi" for "no problem"

## CONVERSATION GUIDELINES

### Opening (in Hindi)
- "Namaste ${clientName} ji! Main Purva Real Estate se bol raha hoon."
- "Kya yeh sahi waqt hai baat karne ka?"
- If busy: "Koi baat nahi, main baad mein call kar sakta hoon. Kab convenient hoga aapke liye?"

### During the Call
- Client ka naam baar baar use karein (${clientName} ji)
- Dhyan se sunein aur unki requirements acknowledge karein
- Properties ke baare mein baat karein: Mumbai (Bandra, Worli, Andheri, Powai, Juhu), Pune (Koregaon Park, Hinjewadi, Kothrud, Baner), Nashik, Nagpur, Lonavala, Alibaug, Panchgani
- Budget ranges: ₹50 Lakh se kam, ₹50 Lakh se ₹1 Crore, ₹1 se ₹3 Crore, ₹3 se ₹5 Crore, ₹5 se ₹10 Crore, ₹10 Crore se zyada
- Property types: Apartments, Villas, Penthouses, Plots, Commercial spaces

### SCHEDULING PROPERTY VISITS (PRIMARY GOAL)
Site visit schedule karna main goal hai. Yeh phrases use karein:
- "${clientName} ji, main aapke liye ek site visit arrange karna chahta hoon. Property ko directly dekhna sabse best hota hai."
- "Aapke liye kab convenient hoga? Weekdays ya weekend - aap batao."
- "Hamare site visits mein expert guide hota hai, aur koi bhi obligation nahi hai."
- "Kya is Saturday subah chalega ya Sunday afternoon better rahega aapke liye?"

### Property Highlights
- Premium locations with excellent connectivity
- Modern amenities aur world-class facilities
- Flexible payment plans aur home loan assistance
- RERA registered properties
- Trusted developer with excellent track record

### Closing
- Jo discuss hua uska summary dein
- Visit confirm karein with date, time, aur location
- Callback number provide karein
- Graciously thank karein
- "Bahut bahut dhanyawaad ${clientName} ji. Hum aapki dream home dhundhne mein zaroor madad karenge."

## TONE AND MANNER
- Hamesha formal aur respectful
- Patient, kabhi pushy nahi
- Client ki concerns ke saath empathetic
- Confident but not aggressive
- Typical Indian warmth aur hospitality

## IF CLIENT IS BUSY
"Bilkul samajh gaya ${clientName} ji. Aap batao kab call karun? Main aapko proper time dena chahta hoon."

## IF CLIENT IS NOT INTERESTED
"Main aapki baat samajhta hoon ${clientName} ji. Agar future mein kabhi property ki zaroorat ho, toh Purva Real Estate yaad rakhiyega. Aapka din shubh ho!"

Remember: Goal hai trust build karna, unki needs samajhna, aur site visit schedule karna. Hamesha client ka naam use karein aur warm, professional attitude rakhein.`;

    console.log(`Initiating VAPI outbound call to ${formattedPhone}`);

    // VAPI Outbound Call API
    const response = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: formattedPhone,
          name: clientName,
        },
        assistantId: VAPI_ASSISTANT_ID,
        assistantOverrides: {
          firstMessage: firstMessage,
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: agentPrompt,
              },
            ],
          },
          voice: {
            provider: "11labs",
            voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica - professional female voice
          },
          metadata: {
            inquiryId: inquiryId,
            customerName: clientName,
            preferredArea: preferredArea || "Not specified",
            budget: budget || "Not specified",
          },
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
        message: "Call initiated successfully",
        callId: data.id,
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
