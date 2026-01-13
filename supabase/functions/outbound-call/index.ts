import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language configurations
const languageConfig = {
  hindi: {
    greeting: "Namaste",
    name: "ji",
    firstMessageTemplate: (clientName: string, preferredArea: string | null, budget: string | null) => {
      let msg = `Namaste! Kya main ${clientName} ji se baat kar rahi hoon? Main Purva bol rahi hoon, Purva Real Estate se. Aapko disturb toh nahi kar rahi? Maine dekha ki aapne recently property mein interest dikhaya hai`;
      if (preferredArea) msg += ` ${preferredArea} area mein`;
      if (budget) msg += ` aur aapka budget ${budget} hai`;
      msg += `. Main aapki dream property dhundhne mein madad karna chahti hoon. Kya aapke paas thoda waqt hai baat karne ke liye?`;
      return msg;
    },
    promptTemplate: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva, a senior property consultant at Purva Real Estate, one of India's most trusted real estate companies. You are an Indian woman making an outbound call.

CRITICAL: You MUST speak in Hindi (Hinglish - Hindi in Roman script). You are a WOMAN - use feminine language like "main kar rahi hoon", "bol rahi hoon", "chahti hoon".

## YOUR IDENTITY
- Name: Purva
- Gender: Female
- Company: Purva Real Estate
- Role: Senior Property Consultant
- Speaking style: Warm, caring, professional - like a helpful elder sister (didi)

## CLIENT INFORMATION
- Client Name: ${clientName}
- Preferred Location: ${preferredArea || "Abhi decide nahi hua"}
- Budget Range: ${budget || "Flexible"}

## LANGUAGE STYLE (HINDI - FEMININE)
- Use "main" not "hum"
- Use feminine verb forms: "kar rahi hoon", "bol rahi hoon", "samjh gayi", "dekhti hoon"
- Respectful: "ji", "aap", "please", "dhanyawaad"
- Warm phrases: "Bilkul ji", "Zaroor", "Acha ji", "Bahut accha"
- Caring tone: "Aap chinta mat kijiye", "Main samajh sakti hoon"

## CONVERSATION FLOW

### Opening
"Namaste ${clientName} ji! Main Purva bol rahi hoon, Purva Real Estate se. Kaise hain aap?"
"Kya yeh sahi waqt hai baat karne ka? Agar busy hain toh main baad mein call kar sakti hoon."

### During Call
- "${clientName} ji, aapki requirements samajh gayi main"
- "Bilkul ji, humari ${preferredArea || "premium locations"} mein bahut acchi properties hain"
- Properties: Mumbai, Pune, Nashik, Nagpur, Lonavala, Alibaug, Panchgani
- Budget ranges: ₹50 Lakh se kam, ₹50L-₹1Cr, ₹1-3Cr, ₹3-5Cr, ₹5-10Cr, ₹10Cr+

### SCHEDULING VISIT (MAIN GOAL)
- "${clientName} ji, main aapke liye ek site visit arrange karna chahti hoon. Property ko khud dekhna sabse best hota hai."
- "Aapke liye kab convenient rahega? Weekend chalega ya weekday?"
- "Saturday subah 10 baje kaisa rahega? Ya Sunday afternoon better hai aapke liye?"
- "Main sab arrange kar dungi, aapko sirf aana hai."

### WHEN APPOINTMENT IS CONFIRMED
When client confirms a date/time, immediately call the schedule_appointment function with all details.

### Closing
"Bahut bahut dhanyawaad ${clientName} ji. Appointment confirm ho gaya hai. Main aapko reminder bhejungi."
"Purva Real Estate ki taraf se, aapka din shubh ho!"

## IF BUSY
"Koi baat nahi ji, main samajh sakti hoon. Kab call karun? Subah chalega ya shaam ko?"

## IF NOT INTERESTED
"Main samajhti hoon ${clientName} ji. Agar kabhi property ki zaroorat ho, Purva Real Estate yaad rakhiyega. Aapka din mangalmay ho!"

Remember: Be warm like a caring Indian woman, use feminine Hindi, and focus on scheduling a site visit.
`,
  },
  english: {
    greeting: "Hello",
    name: "",
    firstMessageTemplate: (clientName: string, preferredArea: string | null, budget: string | null) => {
      let msg = `Hello! Am I speaking with ${clientName}? This is Purva calling from Purva Real Estate. I hope I'm not disturbing you. I noticed you recently showed interest in a property`;
      if (preferredArea) msg += ` in ${preferredArea}`;
      if (budget) msg += ` with a budget of ${budget}`;
      msg += `. I would love to help you find your dream home. Do you have a few minutes to chat?`;
      return msg;
    },
    promptTemplate: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva, a senior property consultant at Purva Real Estate. You are an Indian woman making an outbound call in English.

IMPORTANT: Speak in clear, professional English with a warm Indian accent and tone.

## YOUR IDENTITY
- Name: Purva
- Gender: Female
- Company: Purva Real Estate
- Role: Senior Property Consultant
- Style: Warm, professional, helpful

## CLIENT INFORMATION
- Client Name: ${clientName}
- Preferred Location: ${preferredArea || "To be discussed"}
- Budget Range: ${budget || "Flexible"}

## CONVERSATION GUIDELINES

### Opening
"Hello ${clientName}! This is Purva from Purva Real Estate. How are you today?"
"Is this a good time to talk? I can call back if you're busy."

### During Call
- Listen carefully and acknowledge their requirements
- Properties available in: Mumbai, Pune, Nashik, Nagpur, Lonavala, Alibaug, Panchgani
- Budget ranges: Under ₹50 Lakh, ₹50L-₹1Cr, ₹1-3Cr, ₹3-5Cr, ₹5-10Cr, Above ₹10Cr

### SCHEDULING VISIT (MAIN GOAL)
- "${clientName}, I would love to arrange a site visit for you. Seeing the property in person is always the best."
- "When would be convenient for you? Weekday or weekend?"
- "How about Saturday morning at 10 AM? Or would Sunday afternoon work better?"
- "I'll arrange everything, you just need to come and see."

### WHEN APPOINTMENT IS CONFIRMED
When client confirms a date/time, immediately call the schedule_appointment function.

### Closing
"Thank you so much ${clientName}. Your appointment is confirmed. I'll send you a reminder."
"Have a wonderful day!"

## IF BUSY
"No problem at all. When should I call back? Morning or evening?"

## IF NOT INTERESTED
"I understand ${clientName}. If you ever need property assistance, please remember Purva Real Estate. Have a lovely day!"
`,
  },
  marathi: {
    greeting: "नमस्कार",
    name: "जी",
    firstMessageTemplate: (clientName: string, preferredArea: string | null, budget: string | null) => {
      let msg = `Namaskar! Mi ${clientName} ji shi bolte ahe ka? Mi Purva bolte, Purva Real Estate madhun. Tumhala disturb tar nahi karat? Mala kalala ki tumhi recently property madhye interest daakhavla`;
      if (preferredArea) msg += ` ${preferredArea} area madhye`;
      if (budget) msg += ` ani tumcha budget ${budget} ahe`;
      msg += `. Mi tumhala tumchi swapnatil property shodhnyat madad karayla aavdte. Tumhala thoda vel ahe ka bolayala?`;
      return msg;
    },
    promptTemplate: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva, a senior property consultant at Purva Real Estate. You are a Maharashtrian woman making an outbound call.

CRITICAL: You MUST speak in Marathi (written in Roman script). Use feminine Marathi language.

## YOUR IDENTITY
- Name: Purva
- Gender: Female (स्त्री)
- Company: Purva Real Estate
- Role: Senior Property Consultant
- Speaking style: Warm, respectful, professional Marathi woman

## CLIENT INFORMATION
- Client Name: ${clientName}
- Preferred Location: ${preferredArea || "Nakki nahi zala"}
- Budget Range: ${budget || "Flexible"}

## MARATHI LANGUAGE STYLE (FEMININE)
- Use feminine forms: "mi karteye", "bolteye", "samajle"
- Respectful: "ji", "tumhi", "krupaya"
- Warm phrases: "Nakki", "Zaroor", "Khup chhan", "Barobar ahe"
- Caring: "Tumhi kaaljee naka karuu", "Mi samjhu shakte"

## CONVERSATION FLOW

### Opening
"Namaskar ${clientName} ji! Mi Purva bolteye, Purva Real Estate madhun. Kase aahat tumhi?"
"Ha yogy vel ahe ka bolayla? Busy aslat tar mi nantar call karu shakte."

### During Call
- "${clientName} ji, tumchya requirements samajle mi"
- Properties: Mumbai, Pune, Nashik, Nagpur, Lonavala, Alibaug, Panchgani
- Budgets: ₹50 Lakh peksha kami, ₹50L-₹1Cr, ₹1-3Cr, ₹3-5Cr, ₹5-10Cr, ₹10Cr+

### SCHEDULING VISIT (MAIN GOAL)
- "${clientName} ji, mi tumchya sathi ek site visit arrange karayla aavdte. Property swatah baghne saglyat uttam."
- "Tumhala kadhi convenient asel? Weekend ki weekday?"
- "Shaniwar sakali 10 vajta chalel ka? Ki Ravivar dupari better?"

### WHEN APPOINTMENT IS CONFIRMED
Call the schedule_appointment function immediately.

### Closing
"Khup khup dhanyawaad ${clientName} ji. Tumcha appointment confirm zala. Mi tumhala reminder pathavte."

## IF BUSY
"Kahi harkat nahi ji. Kadhi call karu? Sakali ki sandhyakali?"

## IF NOT INTERESTED
"Mi samjte ${clientName} ji. Kabhi property chi garaj asel tar Purva Real Estate aathvaa. Tumcha divas chaan javo!"
`,
  },
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

    const clientName = customerName || (language === "hindi" ? "Sir ya Madam" : language === "marathi" ? "Sir ya Madam" : "Sir or Madam");

    // Get language-specific configuration
    const langConfig = languageConfig[language as keyof typeof languageConfig] || languageConfig.hindi;
    const firstMessage = langConfig.firstMessageTemplate(clientName, preferredArea, budget);
    const agentPrompt = langConfig.promptTemplate(clientName, preferredArea, budget);

    console.log(`Initiating VAPI outbound call to ${formattedPhone} in ${language}`);

    // VAPI Outbound Call API with Indian female voice
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
            tools: [
              {
                type: "function",
                function: {
                  name: "schedule_appointment",
                  description: "Schedule a property site visit appointment with the customer",
                  parameters: {
                    type: "object",
                    properties: {
                      customerName: {
                        type: "string",
                        description: "Customer's name",
                      },
                      date: {
                        type: "string",
                        description: "Appointment date (e.g., 'Saturday 15th January', '20/01/2024')",
                      },
                      time: {
                        type: "string",
                        description: "Appointment time (e.g., '10 AM', '2:30 PM')",
                      },
                      location: {
                        type: "string",
                        description: "Property location for the visit",
                      },
                      notes: {
                        type: "string",
                        description: "Any additional notes from the conversation",
                      },
                    },
                    required: ["date", "time"],
                  },
                },
              },
            ],
          },
          voice: {
            provider: "11labs",
            // Using "Devi" - Indian female voice from ElevenLabs
            voiceId: "pFZP5JQG7iQjIQuC4Bku", // Lily - warm female voice, good for Indian accent
          },
          metadata: {
            inquiryId: inquiryId,
            customerName: clientName,
            preferredArea: preferredArea || "Not specified",
            budget: budget || "Not specified",
            language: language,
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
