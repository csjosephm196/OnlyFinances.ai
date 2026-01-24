import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Activity, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Layer3Advisor() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { 
      id: 1, 
      type: 'bot', 
      text: "Hello! I've analyzed your cash flow. You can ask me to stress test specific purchase scenarios or forecast changes.",
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!query.trim()) return;

    const newMsg = { id: Date.now(), type: 'user', text: query };
    setMessages(prev => [...prev, newMsg]);
    setQuery('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        text: "Based on your current burn rate and the upcoming tax liability, purchasing a MacBook Pro ($2,199) is safe, but it will reduce your safety buffer by 8% for November.",
        logs: [
          { step: 'Retrieving Asset Balance', status: 'success', detail: 'Cash: $53,000' },
          { step: 'Checking Liabilities', status: 'warning', detail: 'Tax Due Dec 15: $12,000' },
          { step: 'Simulating Transaction', status: 'success', detail: '-$2,199 Impact Analysis' },
          { step: 'Final Risk Assessment', status: 'success', detail: 'Risk Level: LOW' }
        ]
      }]);
    }, 2000);
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
                             <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                               log.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 
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

        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-5 pr-14 py-3.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
            <button 
              onClick={handleSend}
              disabled={!query.trim()}
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

      {/* Live Context Panel */}
      <div className="w-80 hidden xl:flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Live Context</span>
          <Activity className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="p-5 space-y-6">
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">Active Financial State</h4>
            <div className="space-y-3">
              <ContextMetric label="Available Cash" value="$53,000" color="emerald" />
              <ContextMetric label="Monthly Burn" value="-$4,200" color="rose" />
              <ContextMetric label="Runway" value="14.2 mo" color="indigo" />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
             <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">Session Info</h4>
             <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
               <div className="flex justify-between">
                 <span>Model</span>
                 <span className="font-medium text-slate-800 dark:text-slate-200">Gemini 1.5 Pro</span>
               </div>
               <div className="flex justify-between">
                 <span>Latency</span>
                 <span className="font-medium text-slate-800 dark:text-slate-200">124ms</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextMetric({ label, value, color }: any) {
  const colors = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800",
  }[color as string] || "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900";

  return (
    <div className={`p-3 rounded-lg border flex items-center justify-between ${colors}`}>
       <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
       <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}
