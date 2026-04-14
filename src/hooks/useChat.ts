import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  thinking?: ThinkingStep[];
  timestamp: Date;
}

export interface ThinkingStep {
  step: number;
  type: string;
  content: string;
  status: "pending" | "done" | "failed";
  tool?: string;
}

export function useChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const createConversation = useCallback(async (title: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
      .select()
      .single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    setCurrentConversationId(data.id);
    return data.id;
  }, [user]);

  const loadConversation = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCurrentConversationId(conversationId);
    setMessages((data || []).map(m => ({
      id: m.id,
      role: m.message_type === "user" ? "user" : "assistant",
      content: m.content,
      thinking: m.thinking_steps ? JSON.parse(JSON.stringify(m.thinking_steps)) : undefined,
      timestamp: new Date(m.created_at),
    })));
  }, []);

  const sendMessage = useCallback(async (input: string) => {
    if (!user || !input.trim()) return;
    setIsLoading(true);
    setIsThinking(true);

    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(input.slice(0, 50));
      if (!convId) { setIsLoading(false); setIsThinking(false); return; }
    }

    const userMsg: ChatMessage = { role: "user", content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: apiMessages, conversation_id: convId }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

      setIsThinking(false);
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar, timestamp: new Date() }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (convId && assistantSoFar) {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          conversation_id: convId,
          message_type: "agent",
          content: assistantSoFar,
        });
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setIsThinking(false);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  }, [user, messages, currentConversationId, createConversation]);

  const newConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
  }, []);

  return {
    messages, isLoading, isThinking, currentConversationId,
    sendMessage, loadConversation, newConversation, createConversation,
  };
}
