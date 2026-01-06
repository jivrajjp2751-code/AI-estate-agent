import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Sparkles, Home, Calendar, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  { icon: Home, label: "Show properties", message: "What properties do you have available?" },
  { icon: Sparkles, label: "Featured", message: "Show me your featured properties" },
  { icon: Calendar, label: "Schedule visit", message: "I'd like to schedule a property viewing" },
  { icon: HelpCircle, label: "Help me choose", message: "I need help finding the right property for me" },
];

const PurvaChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! 👋 I'm Purva, your personal real estate assistant. I have access to all our current property listings and can help you find your perfect home!\n\nHow can I assist you today? You can ask me about:\n• Available properties & their details\n• Scheduling property viewings\n• Area recommendations\n• Budget-based suggestions",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      const { data, error } = await supabase.functions.invoke("purva-chat", {
        body: { messages: [...messages, userMessage] },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I'm sorry, I couldn't process that.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having a bit of trouble connecting right now. Please try again in a moment! 🙏",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi there! 👋 I'm Purva, your personal real estate assistant. I have access to all our current property listings and can help you find your perfect home!\n\nHow can I assist you today?",
      },
    ]);
    setShowQuickActions(true);
  };

  // Format message content with basic markdown-like styling
  const formatMessage = (content: string) => {
    // Split by lines and handle bullet points and bold text
    return content.split('\n').map((line, i) => {
      // Handle bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={i} className="flex gap-2 ml-2">
            <span className="text-primary">•</span>
            <span>{line.replace(/^[•-]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
          </div>
        );
      }
      // Handle bold text
      const parts = line.split(/\*\*(.*?)\*\*/g);
      if (parts.length > 1) {
        return (
          <p key={i}>
            {parts.map((part, j) => 
              j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
            )}
          </p>
        );
      }
      return line ? <p key={i}>{line}</p> : <br key={i} />;
    });
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="closed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 relative"
            >
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-[400px] h-[550px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center relative">
                  <MessageCircle className="h-5 w-5 text-primary-foreground" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground flex items-center gap-2">
                    Purva
                    <Sparkles className="w-4 h-4" />
                  </h3>
                  <p className="text-xs text-primary-foreground/70">AI Real Estate Assistant • Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetChat}
                  className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20 text-xs"
                >
                  New Chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <div className="text-sm space-y-1">
                      {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Quick Actions */}
              {showQuickActions && messages.length === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-2 pt-2"
                >
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action.message)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary text-sm text-left transition-colors border border-border/50"
                    >
                      <action.icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{action.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted p-3 rounded-2xl rounded-bl-md flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Purva is typing...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card/50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about properties, schedule visits..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Powered by AI • Connected to live property data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PurvaChatbot;
