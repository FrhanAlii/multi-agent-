import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, conversation_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch user personalization settings
    const { data: settings } = await supabase
      .from("personalization_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const styleMap: Record<string, string> = {
      professional: "Use a professional, business-appropriate tone.",
      casual: "Use a casual, conversational tone.",
      friendly: "Use a warm, friendly tone.",
      technical: "Use precise technical language.",
      creative: "Use creative, engaging language.",
    };

    const detailMap: Record<string, string> = {
      brief: "Keep responses concise (2-3 sentences max).",
      moderate: "Provide moderate detail.",
      detailed: "Provide comprehensive, detailed responses.",
    };

    let systemPrompt = `You are an intelligent AI assistant. You help users with tasks, analysis, and creative work. You have access to tools for CSV analysis, email generation, and more.`;

    if (settings) {
      systemPrompt += `\n\nUser preferences:`;
      if (settings.response_style) systemPrompt += `\n- ${styleMap[settings.response_style] || ""}`;
      if (settings.tone === "formal") systemPrompt += `\n- Maintain formal language.`;
      if (settings.tone === "informal") systemPrompt += `\n- Keep it informal.`;
      if (settings.detail_level) systemPrompt += `\n- ${detailMap[settings.detail_level] || ""}`;
      if (settings.domain) systemPrompt += `\n- The user works in: ${settings.domain}`;
      if (settings.include_code_examples) systemPrompt += `\n- Include code examples when relevant.`;
      if (settings.include_visualizations) systemPrompt += `\n- Suggest visualizations when relevant.`;
      if (settings.custom_instructions) systemPrompt += `\n- Custom: ${settings.custom_instructions}`;
      if (settings.user_name) systemPrompt += `\n- User's name: ${settings.user_name}`;
      if (settings.user_role) systemPrompt += `\n- User's role: ${settings.user_role}`;
    }

    // Save user message to DB
    if (conversation_id && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          conversation_id,
          message_type: "user",
          content: lastMsg.content,
        });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pass conversation_id as a custom header so client can save assistant message after stream
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
    };
    if (conversation_id) {
      responseHeaders["X-Conversation-Id"] = conversation_id;
    }

    return new Response(response.body, { headers: responseHeaders });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
