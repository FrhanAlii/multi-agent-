import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Paperclip, Bot, User, Loader2, Copy, Check, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useChat, type ChatMessage } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { useFiles } from "@/hooks/useFiles";
import { ScrollArea } from "@/components/ui/scroll-area";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-secondary transition-colors text-muted"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? "bg-primary text-primary-foreground" : "bg-accent/20 text-accent"
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
        isUser
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-card border border-border glass rounded-bl-md"
      }`}>
        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <div className="relative group my-2">
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={String(children)} />
                      </div>
                      <pre className="bg-secondary/50 rounded-lg p-3 overflow-x-auto text-xs">
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    </div>
                  );
                }
                return <code className="bg-secondary/50 rounded px-1 py-0.5 text-xs" {...props}>{children}</code>;
              },
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        {!isUser && msg.content && (
          <div className="flex justify-end mt-1">
            <CopyButton text={msg.content} />
          </div>
        )}
        <p className={`text-[10px] mt-1 ${isUser ? "text-primary-foreground/60" : "text-muted"}`}>
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-card border border-border glass rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Thinking</span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ...
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Chatbot() {
  const { messages, isLoading, isThinking, sendMessage, loadConversation, newConversation } = useChat();
  const { fetchConversations } = useConversations();
  const { uploadFile, uploading } = useFiles();
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    const convId = searchParams.get("conversation");
    if (convId) {
      loadConversation(convId);
      setSearchParams({});
    }
  }, []);

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isLoading) return;
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
    setPendingFiles([]);
    if (input.trim()) {
      const text = input;
      setInput("");
      await sendMessage(text);
      fetchConversations();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] max-w-[1200px] mx-auto">
      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-border glass overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">AI Assistant</h2>
            <p className="text-xs text-muted">Powered by AI • Ask anything</p>
          </div>
          <button
            onClick={newConversation}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-secondary dark:bg-white/[0.08] hover:bg-secondary/80 dark:hover:bg-white/[0.14] glass-subtle transition-colors text-foreground"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">How can I help you?</h3>
                <p className="text-sm text-muted max-w-md">
                  Ask me anything — analyze data, generate emails, write code, or get insights from your files.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-6 max-w-sm">
                  {["Analyze my sales data", "Draft a cold email", "Summarize this document", "Generate a report"].map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="text-xs text-left px-3 py-2 rounded-lg border border-border glass-subtle hover:bg-secondary dark:hover:bg-white/[0.12] transition-colors text-foreground/70"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            <AnimatePresence>
              {isThinking && <ThinkingIndicator />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-card glass-subtle">
          <div className="bg-secondary dark:bg-white/[0.06] rounded-xl p-2">
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 pt-1 pb-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground">
                    <Paperclip className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button
                      onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}
                      className="text-muted hover:text-destructive transition-colors ml-0.5"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2 rounded-lg hover:bg-card transition-colors text-muted flex-shrink-0"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files || []);
                  setPendingFiles(prev => [...prev, ...newFiles]);
                  e.target.value = "";
                }}
              />
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 bg-transparent resize-none text-sm text-foreground placeholder:text-muted outline-none max-h-32 py-2"
                style={{ height: "auto", minHeight: "36px" }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
              />
              <button
                onClick={handleSend}
                disabled={(isLoading || uploading) || (!input.trim() && pendingFiles.length === 0)}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
