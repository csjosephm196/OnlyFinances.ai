import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Activity, Check, ChevronDown, ChevronRight, RefreshCw, MessageSquare, Trash2, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendMessage, isAdvisorError } from '../services/advisorApi';
import { ChatMessage } from '../types/advisor';
import { textToSpeech, playAudioWithControl, stopAudio } from '../services/ttsService';
import { useAuth } from '../hooks/useAuth';
import {
  createConversation,
  getConversations,
  deleteConversation,
  addMessage,
  getMessages,
  updateConversation,
} from '../services/firestoreService';
import { ConversationWithId } from '../types/firestoreTypes';

export function Layer3Advisor() {
  const [query, setQuery] = useState('');
  const [stressTestingMode, setStressTestingMode] = useState<boolean>(false);
  
  // Get initial greeting based on stress testing mode
  const getInitialGreeting = (isStressMode: boolean) => {
    if (isStressMode) {
      return "Hello! You are in stress testing mode. I'll analyze your financial resilience under various adverse scenarios like job loss, market crashes, emergency expenses, and other financial shocks. Ask me to test your financial plan against different stress scenarios.";
    }
    return "Hello! I'm your AI Financial Advisor. Ask me about investing, budgeting, retirement planning, debt management, or any other financial topic.";
  };

  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      type: 'bot',
      text: getInitialGreeting(false),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [displayedQuestions, setDisplayedQuestions] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pool of 16 predefined starter questions
  const questionPool = [
    "How can I reduce my spending in my highest expense categories?",
    "What percentage of my income should I save each month?",
    "Help me create a realistic budget based on my transaction history.",
    "What investments should I consider with my current financial situation?",
    "How can I improve my net worth over the next 6 months?",
    "Should I pay off debt or invest my extra money?",
    "What's the best strategy to build an emergency fund?",
    "How much should I be contributing to retirement accounts?",
    "Can you analyze my spending patterns and suggest improvements?",
    "What are some tax-efficient investment strategies I should consider?",
    "How can I balance paying off my mortgage with saving for retirement?",
    "What's a good asset allocation for my age and financial goals?",
    "How can I optimize my cash flow based on my income statement?",
    "Should I prioritize increasing my assets or reducing my liabilities?",
    "What are the risks in my current financial portfolio?",
    "How can I prepare financially for major life events?",
  ];

  // Randomly select 4 questions when component mounts
  useEffect(() => {
    // Generate a unique session ID for this page load
    const currentPageLoadId = window.performance?.navigation?.type === 1
      ? Date.now().toString() // Page reload - generate new ID
      : sessionStorage.getItem('pageLoadId') || Date.now().toString();

    // Store the page load ID if it's new
    if (!sessionStorage.getItem('pageLoadId')) {
      sessionStorage.setItem('pageLoadId', currentPageLoadId);
    }

    const storedData = sessionStorage.getItem('advisorQuestions');
    const storedPageLoadId = sessionStorage.getItem('questionPageLoadId');

    // If page was reloaded or no stored data, generate new questions
    if (!storedData || storedPageLoadId !== currentPageLoadId) {
      const shuffled = [...questionPool].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 4);
      setDisplayedQuestions(selected);
      sessionStorage.setItem('advisorQuestions', JSON.stringify(selected));
      sessionStorage.setItem('questionPageLoadId', currentPageLoadId);
    } else {
      // Use stored questions from same page session
      setDisplayedQuestions(JSON.parse(storedData));
    }
  }, []);

  // Load conversation history from Firebase when user is authenticated
  useEffect(() => {
    if (user) {
      loadConversationHistory();
    }
  }, [user]);

  const loadConversationHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const conversations = await getConversations(user.uid, 50);
      setConversationHistory(conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messageCount,
        createdAt: conv.createdAt.toDate(),
        updatedAt: conv.updatedAt.toDate(),
      })));
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      handleStopAudio();
    };
  }, []);

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

  // Speak a message using TTS
  const speakMessage = async (text: string, messageId?: number) => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ElevenLabs API key not found');
      setError('ElevenLabs API key not found. Please check your .env file.');
      return;
    }

    try {
      setIsPlayingAudio(true);
      if (messageId !== undefined) {
        setPlayingMessageId(messageId);
      }

      console.log('Calling TTS with API key:', apiKey.substring(0, 10) + '...');
      const blob = await textToSpeech(text, apiKey);
      console.log('TTS blob received, size:', blob.size);

      const { audio, promise } = playAudioWithControl(blob);
      currentAudioRef.current = audio;

      await promise;
      console.log('Audio playback completed');
    } catch (error: any) {
      console.error('TTS error:', error);
      const errorMessage = error?.message || 'Unknown error';
      setError(`Failed to play audio: ${errorMessage}. Please check your API key and network connection.`);
    } finally {
      setIsPlayingAudio(false);
      setPlayingMessageId(null);
      currentAudioRef.current = null;
    }
  };

  // Stop audio playback
  const handleStopAudio = () => {
    stopAudio();
    setIsPlayingAudio(false);
    setPlayingMessageId(null);
    currentAudioRef.current = null;
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
      getConversationHistory(),
      undefined,
      stressTestingMode
    );

    setIsTyping(false);

    if (isAdvisorError(response)) {
      setError(response.message);
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } else {
      const botMessageId = Date.now() + 1;
      setSessionId(response.session_id);
      setSuggestions(response.suggestions);
      setMessages(prev => [...prev, {
        id: botMessageId,
        type: 'bot',
        text: response.message,
        isFinancial: response.is_financial,
      }]);

      // Save conversation to Firebase
      if (user) {
        saveToFirebase(text, response.message, response.is_financial, response.suggestions);
      }

      // Auto-play TTS if enabled
      if (autoPlayEnabled) {
        speakMessage(response.message, botMessageId);
      }
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  // Save message exchange to Firebase
  const saveToFirebase = async (
    userMessage: string,
    assistantMessage: string,
    isFinancial?: boolean,
    suggestions?: string[]
  ) => {
    if (!user) return;
    setIsSaving(true);
    try {
      let convId = currentConversationId;

      // Create new conversation if needed
      if (!convId) {
        const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage;
        convId = await createConversation(user.uid, title, sessionId);
        setCurrentConversationId(convId);
      }

      // Add user message
      await addMessage(convId, 'user', userMessage);

      // Add assistant message
      await addMessage(convId, 'assistant', assistantMessage, isFinancial, suggestions);

      // Refresh conversation history
      await loadConversationHistory();
    } catch (err) {
      console.error('Failed to save to Firebase:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Start a new conversation
  const handleNewConversation = () => {
    setMessages([{
      id: 1,
      type: 'bot',
      text: getInitialGreeting(stressTestingMode),
    }]);
    setSessionId(null);
    setSuggestions([]);
    setCurrentConversationId(null);
  };

  // Handle stress testing mode toggle
  const handleStressTestingToggle = () => {
    const newMode = !stressTestingMode;
    setStressTestingMode(newMode);
    
    // Update the initial greeting message if it's the first message
    if (messages.length === 1 && messages[0].type === 'bot') {
      setMessages([{
        id: 1,
        type: 'bot',
        text: getInitialGreeting(newMode),
      }]);
    }
  };

  // Load a conversation from history
  const handleLoadConversation = async (conversationId: string) => {
    try {
      setIsLoadingHistory(true);
      const msgs = await getMessages(conversationId);

      // Convert Firebase messages to component format
      const loadedMessages = msgs.map((msg, index) => ({
        id: index + 1,
        type: msg.role === 'user' ? 'user' : 'bot',
        text: msg.content,
        isFinancial: msg.isFinancial,
      }));

      // Add initial greeting if no messages
      if (loadedMessages.length === 0) {
        loadedMessages.push({
          id: 1,
          type: 'bot',
          text: "Hello! I'm your AI Financial Advisor. Ask me about investing, budgeting, retirement planning, debt management, or any other financial topic.",
          isFinancial: undefined,
        });
      }

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      setSuggestions([]);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete a conversation from history
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      setConversationHistory(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        handleNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden">
        {/* Header with Stress Testing Toggle */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm
              ${stressTestingMode ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'}
            `}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {stressTestingMode ? 'Stress Testing Mode' : 'AI Financial Advisor'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stressTestingMode ? 'Testing financial resilience' : 'Personalized financial advice'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${stressTestingMode ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {stressTestingMode ? 'Stress Testing' : 'Normal Mode'}
            </span>
            <button
              onClick={handleStressTestingToggle}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                ${stressTestingMode 
                  ? 'bg-purple-600 focus:ring-purple-500' 
                  : 'bg-slate-300 dark:bg-slate-600 focus:ring-indigo-500'
                }
              `}
              role="switch"
              aria-checked={stressTestingMode}
              title={stressTestingMode ? 'Disable stress testing mode' : 'Enable stress testing mode'}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${stressTestingMode ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mx-2 mt-1 shadow-sm
                  ${msg.type === 'user' 
                    ? 'bg-slate-200' 
                    : stressTestingMode 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-indigo-600 text-white'
                  }
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
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex-1">{msg.text}</span>
                      {msg.type === 'bot' && (
                        <button
                          onClick={() => {
                            if (playingMessageId === msg.id && isPlayingAudio) {
                              handleStopAudio();
                            } else {
                              speakMessage(msg.text, msg.id);
                            }
                          }}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                          title={playingMessageId === msg.id && isPlayingAudio ? 'Stop audio' : 'Play audio'}
                        >
                          {playingMessageId === msg.id && isPlayingAudio ? (
                            <VolumeX className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>
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

        {/* Starter Questions - Show when conversation is fresh */}
        {messages.length <= 1 && !isTyping && displayedQuestions.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Suggested Questions
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {displayedQuestions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(question)}
                    className="text-left px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm hover:shadow-md group"
                  >
                    <span className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0 mt-0.5 transition-colors" />
                      <span className="flex-1">{question}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-5 pr-40 py-3.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              disabled={isTyping}
            />
            <div className="absolute right-2 top-2 flex items-center gap-2">
              <button
                onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
                className={`p-2 rounded-lg transition-colors ${autoPlayEnabled
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                title={autoPlayEnabled ? 'Disable auto-play' : 'Enable auto-play'}
              >
                {autoPlayEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleSend()}
                disabled={!query.trim() || isTyping}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 flex-1">
              AI can make mistakes. Please verify financial advice.
            </p>
            {autoPlayEnabled && (
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                Auto-play enabled
              </p>
            )}
          </div>
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
