import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Activity, Check, ChevronDown, ChevronRight, RefreshCw, MessageSquare, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendMessage, isAdvisorError } from '../services/advisorApi';
import { ChatMessage } from '../types/advisor';

export function Layer3Advisor() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      type: 'bot',
      text: "Hello! I'm your AI Financial Advisor. Ask me about investing, budgeting, retirement planning, debt management, or any other financial topic.",
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Convert messages to ChatMessage format for API
  const getConversationHistory = (): ChatMessage[] => {
    return messages
      .filter(msg => msg.type === 'user' || msg.type === 'bot')
      .slice(-10) // Keep last 10 messages to avoid token limits
      .map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text,
      })) as ChatMessage[];
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || query;
    if (!text.trim()) return;

    const newMsg = { id: Date.now(), type: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setQuery('');
    setIsTyping(true);
    setError(null);

    const response = await sendMessage(
      text,
      sessionId,
      getConversationHistory()
    );

    setIsTyping(false);

    if (isAdvisorError(response)) {
      setError(response.message);
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } else {
      setSessionId(response.session_id);
      setSuggestions(response.suggestions);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        text: response.message,
        isFinancial: response.is_financial,
      }]);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  // Start a new conversation
  const handleNewConversation = () => {
    // TODO: Save current conversation to Firebase before starting new
    setMessages([{
      id: 1,
      type: 'bot',
      text: "Hello! I'm your AI Financial Advisor. Ask me about investing, budgeting, retirement planning, debt management, or any other financial topic.",
    }]);
    setSessionId(null);
    setSuggestions([]);
    setCurrentConversationId(null);
  };

  // Load a conversation from history
  const handleLoadConversation = async (conversationId: string) => {
    // TODO: Fetch conversation messages from Firebase
    // For now, just set the current conversation ID
    setCurrentConversationId(conversationId);
    // When Firebase is ready, load messages here:
    // const messages = await getConversationMessages(conversationId);
    // setMessages(messages);
  };

  // Delete a conversation from history
  const handleDeleteConversation = async (conversationId: string) => {
    // TODO: Delete from Firebase
    // await deleteConversation(conversationId);
    setConversationHistory(prev => prev.filter(c => c.id !== conversationId));
    if (currentConversationId === conversationId) {
      handleNewConversation();
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mx-2 mt-1 shadow-sm
                  ${msg.type === 'user' ? 'bg-slate-200' : 'bg-indigo-600 text-white'}
                `}>
                  {msg.type === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Sparkles className="w-4 h-4" />}
                </div>

                <div className="flex flex-col">
                  <div className={`
                    rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed
                    ${msg.type === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-tl-sm'}
                  `}>
                    {msg.text}
                  </div>

                  {/* Reasoning Logs - Modern Accordion Style */}
                  {msg.logs && msg.logs.length > 0 && (
                    <div className="mt-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm w-full">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">Analysis Trace</p>
                      <div className="space-y-2">
                        {msg.logs.map((log: any, i: number) => (
                          <div key={i} className="flex items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${log.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                              log.status === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200'
                              }`}>
                              <Check className="w-3 h-3" />
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-slate-700 block">{log.step}</span>
                              <span className="text-slate-500">{log.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-3 rounded-2xl rounded-tl-sm ml-12 shadow-sm">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !isTyping && (
          <div className="flex gap-2 p-3 overflow-x-auto border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSend(suggestion)}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium whitespace-nowrap hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 flex items-center justify-between">
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Dismiss
            </button>
          </div>
        )}

        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about investing, budgeting, retirement..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-5 pr-14 py-3.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              disabled={isTyping}
            />
            <button
              onClick={() => handleSend()}
              disabled={!query.trim() || isTyping}
              className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-3">
            AI can make mistakes. Please verify financial advice.
          </p>
        </div>
      </div>

      {/* Conversation History Panel */}
      <div className="w-80 hidden xl:flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">History</span>
          <button
            onClick={handleNewConversation}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            + New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationHistory.length === 0 ? (
            <div className="p-5 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No conversations yet</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Your chat history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {conversationHistory.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => handleLoadConversation(convo.id)}
                  className={`w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${convo.id === currentConversationId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500' : ''
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                      {convo.title}
                    </p>
                    <Trash2
                      className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 mt-0.5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(convo.id);
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {convo.messageCount} messages • {formatDate(convo.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
            Conversations sync with your account
          </p>
        </div>
      </div>
    </div>
  );
}

// Types for conversation history
export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to format dates
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
