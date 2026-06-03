import { useState, useRef, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  X, Send, Bot, User, Trash2, Minimize2, Maximize2, Sparkles, Zap, TrendingUp, PieChart, BarChart3
} from "lucide-react";

export default function AIChatAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" or "insights"
  const [insights, setInsights] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current && activeTab === "chat") {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, activeTab]);

  // Add welcome message when chat first opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        type: "assistant",
        content: `Hello ${user?.name?.split(' ')[0] || 'there'}! I'm **Capex Man**, your intelligent assistant for the Capex Portal.\n\nI can help you with:\n• Checking request status and progress\n• Understanding the approval workflow\n• Finding specific request details\n• Analyzing spending patterns\n\nWhat would you like to know?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen, user?.name, messages.length]);

  // Fetch AI insights when insights tab is opened
  const fetchInsights = async () => {
    if (insights || isLoadingInsights) return;
    
    setIsLoadingInsights(true);
    try {
      const response = await axios.post(`${API}/ai/chat`, {
        message: "Provide a brief analytics summary: 1) Total spending trends 2) Top departments by spend 3) Approval bottlenecks 4) Cost saving opportunities. Be concise with bullet points.",
        session_id: `insights-${user?.id}`
      });
      setInsights(response.data.response);
    } catch (error) {
      console.error("Insights error:", error);
      setInsights("Unable to load insights. Please try again later.");
    } finally {
      setIsLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (activeTab === "insights" && !insights) {
      fetchInsights();
    }
  }, [activeTab]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/ai/chat`, {
        message: userMessage.content,
        session_id: sessionId
      });

      // Set session ID if this is the first message
      if (!sessionId) {
        setSessionId(response.data.session_id);
      }

      const assistantMessage = {
        type: "assistant",
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = {
        type: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      if (sessionId) {
        await axios.delete(`${API}/ai/chat/history?session_id=${sessionId}`);
      }
      setMessages([]);
      setSessionId(null);
      toast.success("Chat cleared");
    } catch (error) {
      console.error("Clear chat error:", error);
      toast.error("Failed to clear chat");
    }
  };

  const refreshInsights = () => {
    setInsights(null);
    fetchInsights();
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content.split('\n').map((line, i) => {
      // Bold text
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <span key={i} dangerouslySetInnerHTML={{ __html: formattedLine }}>
        </span>
      );
    }).reduce((acc, curr, i) => {
      if (i === 0) return [curr];
      return [...acc, <br key={`br-${i}`} />, curr];
    }, []);
  };

  // Toggle button when chat is closed - Professional "Capex Man" button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bottom-4 z-50 group"
        data-testid="ai-chat-toggle"
      >
        <div className="relative flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 hover:border-emerald-500/50">
          {/* Animated glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
          
          {/* Icon with pulse */}
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Zap className="w-4 h-4 text-white" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          
          {/* Text */}
          <div className="relative flex flex-col items-start">
            <span className="text-sm font-bold text-white tracking-tight">Capex Man</span>
            <span className="text-[9px] text-emerald-400/80 font-medium">AI Assistant</span>
          </div>
          
          {/* Sparkle icon */}
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 ml-1 group-hover:animate-pulse" />
        </div>
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div
        className="fixed left-4 bottom-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700"
        onClick={() => setIsMinimized(false)}
        data-testid="ai-chat-minimized"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
          <Zap className="w-3 h-3 text-white" />
        </div>
        <span className="text-white text-sm font-medium">Capex Man</span>
        <Maximize2 className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  // Full chat panel
  return (
    <div
      className="fixed left-4 bottom-4 z-50 w-[420px] h-[540px] max-h-[85vh] bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700/50"
      data-testid="ai-chat-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="w-5 h-5 text-white" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight">Capex Man</div>
            <div className="text-emerald-400/80 text-[10px] font-medium">Powered by GPT-5</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
            onClick={clearChat}
            title="Clear chat"
            data-testid="ai-chat-clear"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
            data-testid="ai-chat-minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
            onClick={() => setIsOpen(false)}
            title="Close"
            data-testid="ai-chat-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 bg-slate-800/50">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-all ${
            activeTab === "chat"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-900/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
          data-testid="ai-tab-chat"
        >
          <Bot className="w-3.5 h-3.5 inline mr-1.5" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-all ${
            activeTab === "insights"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-900/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
          data-testid="ai-tab-insights"
        >
          <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
          AI Insights
        </button>
      </div>

      {/* User info badge */}
      <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-700/30">
        <Badge className="bg-slate-700/50 text-slate-300 text-[10px] border-slate-600">
          {user?.name} • {user?.role?.replace('_', ' ')}
        </Badge>
      </div>

      {/* Content Area */}
      {activeTab === "chat" ? (
        <>
          {/* Messages area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 ${msg.type === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      msg.type === "user"
                        ? "bg-slate-700"
                        : msg.isError
                        ? "bg-red-900/50"
                        : "bg-gradient-to-br from-emerald-500 to-cyan-500"
                    }`}
                  >
                    {msg.type === "user" ? (
                      <User className="w-3.5 h-3.5 text-slate-300" />
                    ) : (
                      <Zap className={`w-3.5 h-3.5 ${msg.isError ? "text-red-400" : "text-white"}`} />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.type === "user"
                        ? "bg-slate-700 text-slate-100"
                        : msg.isError
                        ? "bg-red-900/30 text-red-300 border border-red-800/50"
                        : "bg-slate-800 text-slate-200 border border-slate-700/50"
                    }`}
                  >
                    {formatMessage(msg.content)}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-3 border-t border-slate-700/50 bg-slate-800/50">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Capex Man anything..."
                className="flex-1 h-10 text-sm bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                disabled={isLoading}
                data-testid="ai-chat-input"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="h-10 w-10 p-0 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50"
                data-testid="ai-chat-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5 text-center">
              Responses filtered based on your role permissions
            </div>
          </div>
        </>
      ) : (
        /* Insights Tab */
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Insights Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">AI Analytics</h3>
                  <p className="text-[10px] text-slate-400">Smart insights for your role</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshInsights}
                className="h-7 text-xs text-slate-400 hover:text-white"
                disabled={isLoadingInsights}
              >
                Refresh
              </Button>
            </div>

            {/* Insights Content */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              {isLoadingInsights ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                  <span className="text-sm text-slate-400">Analyzing data...</span>
                </div>
              ) : insights ? (
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {formatMessage(insights)}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Click refresh to load insights
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Quick Analysis</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Spending Trends", icon: TrendingUp, query: "Analyze my spending trends over the last 3 months" },
                  { label: "Bottlenecks", icon: BarChart3, query: "What are the current approval bottlenecks?" },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveTab("chat");
                      setInputValue(action.query);
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-700/50 transition-all text-left"
                  >
                    <action.icon className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-300">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
