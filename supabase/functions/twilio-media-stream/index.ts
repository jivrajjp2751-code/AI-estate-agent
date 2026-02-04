import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Use a standard ElevenLabs voice that works on all plans
// Jessica - warm female voice with Indian-friendly pronunciation
const ELEVENLABS_VOICE_ID = "cgSgspJ2msm6clMCkdW9";

// Language configurations
const languageConfig = {
  hindi: {
    systemPrompt: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva, a senior property consultant at Purva Real Estate. You are an Indian woman.
Respond in Hindi (Hinglish). Use feminine language. Keep responses to 2-3 sentences.

Client: ${clientName}
Location Interest: ${preferredArea || "Not specified"}
Budget: ${budget || "Flexible"}

Goal: Schedule a property site visit. Be warm, professional, and concise.
`,
  },
  english: {
    systemPrompt: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva, a senior property consultant at Purva Real Estate.
Keep responses to 2-3 sentences.

Client: ${clientName}
Location Interest: ${preferredArea || "Not specified"}  
Budget: ${budget || "Flexible"}

Goal: Schedule a property site visit. Be warm, professional, and concise.
`,
  },
  marathi: {
    systemPrompt: (clientName: string, preferredArea: string | null, budget: string | null) => `
You are Purva from Purva Real Estate. Respond in Marathi (Roman script).
Use feminine language. Keep responses to 2-3 sentences.

Client: ${clientName}
Location: ${preferredArea || "Not specified"}
Budget: ${budget || "Flexible"}

Goal: Schedule a property site visit.
`,
  },
};

serve(async (req) => {
  // Handle WebSocket upgrade for Twilio Media Streams
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  let streamSid: string | null = null;
  let callSid: string | null = null;
  let conversationHistory: { role: string; content: string }[] = [];
  let metadata: {
    inquiryId: string;
    customerName: string;
    preferredArea: string;
    budget: string;
    language: string;
    greeting: string;
  } | null = null;
  
  // Audio buffer
  let audioBuffer: Uint8Array[] = [];
  
  // Speech recognition buffer
  let speechBuffer = "";
  let silenceTimeout: number | null = null;
  
  socket.onopen = () => {
    console.log("Twilio Media Stream connected");
  };
  
  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.event) {
        case "start":
          streamSid = message.start.streamSid;
          callSid = message.start.callSid;
          
          // Extract custom parameters
          const params = message.start.customParameters || {};
          metadata = {
            inquiryId: params.inquiryId || "",
            customerName: params.customerName || "Customer",
            preferredArea: params.preferredArea || "",
            budget: params.budget || "",
            language: params.language || "hindi",
            greeting: decodeURIComponent(params.greeting || ""),
          };
          
          console.log("Stream started:", streamSid, "Metadata:", metadata);
          
          // Play the greeting
          if (metadata.greeting) {
            await playTTS(metadata.greeting, socket, streamSid!);
          }
          break;
          
        case "media":
          // Receive audio from the caller (mu-law encoded)
          // For real STT, you'd process this audio
          // Simplified: We'll use ElevenLabs for both STT and TTS
          break;
          
        case "stop":
          console.log("Stream stopped");
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };
  
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  
  socket.onclose = () => {
    console.log("Twilio connection closed");
  };
  
  async function playTTS(text: string, ws: WebSocket, sid: string) {
    try {
      const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
      
      // Generate TTS using ElevenLabs REST API
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=ulaw_8000`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
            },
          }),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs TTS error:", response.status, errorText);
        return;
      }
      
      // Stream audio back to Twilio
      const reader = response.body!.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert to base64 properly (avoid stack overflow with spread operator)
        const base64Audio = base64Encode(value.buffer);
        
        ws.send(JSON.stringify({
          event: "media",
          streamSid: sid,
          media: {
            payload: base64Audio,
          },
        }));
      }
      
      // Mark end of audio
      ws.send(JSON.stringify({
        event: "mark",
        streamSid: sid,
        mark: {
          name: "tts_complete",
        },
      }));
      
    } catch (error) {
      console.error("TTS error:", error);
    }
  }
  
  return response;
});
