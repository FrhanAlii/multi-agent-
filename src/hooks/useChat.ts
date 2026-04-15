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
      const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input, session_id: convId }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.detail || errData.error || `HTTP ${resp.status}`);
      }

      setIsThinking(false);
      const data = await resp.json();
      const assistantSoFar = data.response || "No response";

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: assistantSoFar, timestamp: new Date() }
      ]);

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
      toast({ title: "Error", description: e.message || "Failed to communicate with the backend", variant: "destructive" });
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
