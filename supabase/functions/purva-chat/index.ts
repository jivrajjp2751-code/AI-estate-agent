import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action, viewingData } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle scheduling action
    if (action === "schedule_viewing" && viewingData) {
      const { data, error } = await supabase
        .from("customer_inquiries")
        .insert({
          name: viewingData.name,
          email: viewingData.email,
          phone: viewingData.phone,
          message: `Property Viewing Request: ${viewingData.propertyTitle}`,
          appointment_date: viewingData.date,
          preferred_time: viewingData.time,
          preferred_area: viewingData.location,
        });

      if (error) {
        console.error("Error scheduling viewing:", error);
        return new Response(
          JSON.stringify({ error: "Failed to schedule viewing" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          message: `Great! Your viewing for ${viewingData.propertyTitle} has been scheduled for ${viewingData.date} at ${viewingData.time}. Our team will contact you at ${viewingData.phone} to confirm.`,
          scheduled: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Fetch properties from database for context
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (propError) {
      console.error("Error fetching properties:", propError);
    }

    // Fetch recent inquiries count for context
    const { count: inquiryCount } = await supabase
      .from("customer_inquiries")
      .select("*", { count: "exact", head: true });

    // Build rich property context with descriptions
    let propertyContext = "";
    if (properties && properties.length > 0) {
      propertyContext = `\n\n📍 AVAILABLE PROPERTIES (${properties.length} total):\n`;
      propertyContext += properties.map((p, i) => {
        let details = `\n${i + 1}. **${p.title}**
   • Location: ${p.location}
   • Price: ${p.price}
   • Bedrooms: ${p.beds} | Bathrooms: ${p.baths} | Area: ${p.sqft} sqft
   • Featured: ${p.featured ? '⭐ Yes' : 'No'}
   • Virtual Tour: ${p.virtual_tour_url ? '🎥 Available' : 'Not available'}`;
        
        if (p.description) {
          details += `\n   • Description: ${p.description}`;
        }
        return details;
      }).join('\n');

      // Add area breakdown
      const areas: Record<string, number> = {};
      properties.forEach(p => {
        const city = p.location.split(',').pop()?.trim() || p.location;
        areas[city] = (areas[city] || 0) + 1;
      });
      propertyContext += `\n\n📊 PROPERTIES BY AREA:\n`;
      Object.entries(areas).forEach(([area, count]) => {
        propertyContext += `• ${area}: ${count} properties\n`;
      });

      // Add price range info
      const prices = properties.map(p => {
        const match = p.price.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : 0;
      }).filter(p => p > 0);
      
      if (prices.length > 0) {
        propertyContext += `\n💰 PRICE RANGE: ₹${Math.min(...prices)} Cr - ₹${Math.max(...prices)} Cr`;
      }
    } else {
      propertyContext = '\n\nNo properties currently available in the database.';
    }

    const SYSTEM_PROMPT = `You are Purva, a warm, friendly, and knowledgeable real estate assistant for a premium property company. You have a cheerful personality and genuinely enjoy helping people find their dream homes! 🏠

YOUR PERSONALITY:
- Warm and welcoming - greet users like a friendly advisor
- Enthusiastic about properties and helping people
- Professional but personable - use a conversational tone
- Proactive - suggest relevant properties based on user preferences
- Empathetic - understand that buying a home is a big decision

YOUR CAPABILITIES:
1. 🏠 Property Information - You have LIVE access to all properties in the database. Use this data to answer questions accurately!
2. 📅 Schedule Viewings - Help users book property visits
3. 🔍 Property Recommendations - Suggest properties based on budget, location, size preferences
4. 📍 Area Insights - Share knowledge about neighborhoods
5. 💡 Real Estate Advice - Guide on buying process, investment tips
${propertyContext}

INTERACTION GUIDELINES:

When users ask about properties:
- Reference SPECIFIC properties from the database with accurate details
- If they mention a budget, filter and recommend suitable options
- Highlight featured properties and those with virtual tours
- Compare properties when asked

When users want to schedule a viewing:
- Ask for: Name, Email, Phone, Preferred Date, Preferred Time, Property of interest
- Be flexible and helpful with scheduling
- Confirm all details before processing

When users are unsure:
- Ask about their preferences (budget, area, size, must-haves)
- Suggest 2-3 suitable properties
- Offer to compare options

RESPONSE STYLE:
- Keep responses concise but informative (2-4 paragraphs max)
- Use bullet points for property features
- Include relevant emojis sparingly for warmth 🏠✨
- Always end with a helpful follow-up question or next step
- Be specific with numbers and details from the database

QUICK RESPONSES FOR COMMON QUERIES:
- "What properties do you have?" → List 3-4 highlights with key features
- "Show me properties in [area]" → Filter and present relevant options
- "What's your most expensive/cheapest?" → Show specific properties
- "I have a budget of X" → Recommend matching properties
- "Tell me about [property name]" → Give full details including description

Remember: You have real-time access to property data. Always use actual property names, prices, and details from the database!`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending request to AI with", properties?.length || 0, "properties in context");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "I'm a bit busy right now. Please try again in a moment!" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const error = await response.text();
      console.error("AI Gateway error:", response.status, error);
      throw new Error("Failed to get response from AI");
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that request.";

    console.log("AI response received successfully");

    return new Response(
      JSON.stringify({ 
        message: assistantMessage, 
        propertyCount: properties?.length || 0 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
