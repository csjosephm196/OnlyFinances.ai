# Financial Advisor AI - Frontend Integration Guide

This document provides everything the frontend team needs to integrate with the Financial Advisor AI chatbot API.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Endpoints](#base-url--endpoints)
3. [Authentication & CORS](#authentication--cors)
4. [Data Models](#data-models)
5. [API Reference](#api-reference)
6. [Integration Examples](#integration-examples)
7. [State Management Recommendations](#state-management-recommendations)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Overview

The Financial Advisor AI is a **stateless** chat API that provides personalized financial advice. Key characteristics:

| Feature | Description |
|---------|-------------|
| **Philosophy** | Growth-oriented, slightly aggressive investment stance |
| **Focus** | Strictly financial topics (non-financial queries are redirected) |
| **State** | Stateless - frontend owns conversation history |
| **Session** | Optional session_id for tracking (generated if not provided) |
| **Context** | Optional financial data can be passed for personalized advice |

### What the Advisor Covers
- Investment strategy and portfolio allocation
- Retirement planning (401k, IRA, Roth strategies)
- Budgeting and expense optimization
- Debt management and payoff strategies
- Tax optimization strategies
- Emergency fund planning
- Real estate investment considerations
- Business finance for entrepreneurs

### What the Advisor Won't Do
- Answer non-financial questions (politely redirects)
- Recommend specific individual stocks by name
- Provide medical, legal, or relationship advice

---

## Base URL & Endpoints

### Development
```
http://localhost:8000
```

### Production (Render)
```
'https://demo-backend-bqyy.onrender.com
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/advisor/chat` | Main chat endpoint |
| `GET` | `/v1/health` | Health check |
| `GET` | `/docs` | OpenAPI/Swagger documentation |

---

## Authentication & CORS

### Current Setup
- **No authentication required** (public API)
- **CORS enabled** for:
  - `http://localhost:3000` (Next.js dev)
  - `http://localhost:5173` (Vite dev)

### Adding Production Frontend
Update `ALLOWED_ORIGINS` in Render environment variables:
```
http://localhost:3000,http://localhost:5173,https://your-frontend-domain.com
```

---

## Data Models

### ChatMessage

Represents a single message in the conversation history.

```typescript
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string; // ISO 8601 format, optional
}
```

### FinancialContext (Optional)

Pass user's financial data for personalized advice.

```typescript
interface FinancialContext {
  total_income?: number;        // Monthly income
  total_expenses?: number;      // Monthly expenses
  top_categories?: Record<string, number>; // Category -> amount
  monthly_savings_rate?: number; // Percentage (e.g., 27.0 for 27%)
  goals?: string[];             // Financial goals
}
```

### ChatRequest

Request body for the chat endpoint.

```typescript
interface ChatRequest {
  message: string;              // Required: User's current message (1-4000 chars)
  session_id?: string;          // Optional: For conversation tracking
  conversation_history?: ChatMessage[]; // Optional: Previous messages
  financial_context?: FinancialContext; // Optional: User's financial data
}
```

### ChatResponse

Response from the chat endpoint.

```typescript
interface ChatResponse {
  message: string;              // Advisor's response
  session_id: string;           // Session ID (generated if not provided)
  suggestions: string[];        // Follow-up question suggestions (3 items)
  is_financial: boolean;        // Whether query was financial in nature
}
```

---

## API Reference

### POST /v1/advisor/chat

Send a message to the financial advisor and receive personalized advice.

#### Request

```http
POST /v1/advisor/chat
Content-Type: application/json

{
  "message": "I have $10,000 to invest. What should I do?",
  "session_id": "sess_abc123",
  "conversation_history": [
    {
      "role": "user",
      "content": "I want to start investing"
    },
    {
      "role": "assistant",
      "content": "Great! Let's discuss your investment goals and risk tolerance..."
    }
  ],
  "financial_context": {
    "total_income": 8500.00,
    "total_expenses": 6200.00,
    "monthly_savings_rate": 27.0,
    "top_categories": {
      "rent": 1800.00,
      "groceries": 600.00,
      "transportation": 400.00
    },
    "goals": ["Build emergency fund", "Save for down payment"]
  }
}
```

#### Response (Success - 200)

```json
{
  "message": "With $10,000 to invest and your solid 27% savings rate, you're in a great position to grow your wealth. Here's my recommendation:\n\n**Immediate Action:**\n- If you don't have 3-6 months of expenses saved, allocate $3,000-4,000 to a high-yield savings account for emergencies\n- The remainder should go into tax-advantaged accounts first\n\n**Investment Strategy:**\n- **Max your 401k match first** - this is free money\n- **Open a Roth IRA** and contribute up to $7,000 for 2026\n- For the investments themselves, I'd recommend a growth-oriented allocation:\n  - 80% broad market index funds (VTI or similar)\n  - 20% international exposure (VXUS or similar)\n\nGiven your goals include a down payment, what's your timeline for that purchase?",
  "session_id": "sess_abc123",
  "suggestions": [
    "What about a Roth vs Traditional IRA?",
    "How long until I should buy a house?",
    "Should I pay off any debt first?"
  ],
  "is_financial": true
}
```

#### Response (Non-Financial Query)

When the user asks a non-financial question:

```json
{
  "message": "I'm your financial advisor and can only help with money-related questions. I can assist with investing, budgeting, retirement planning, debt management, taxes, and other financial topics. What financial question can I help you with?",
  "session_id": "sess_abc123",
  "suggestions": [
    "How should I start investing?",
    "Help me create a budget",
    "What's the best way to pay off debt?"
  ],
  "is_financial": false
}
```

#### Error Response (500)

```json
{
  "detail": {
    "success": false,
    "error_code": "ADVISOR_ERROR",
    "message": "An error occurred while processing your request",
    "details": {
      "error": "Connection timeout"
    }
  }
}
```

---

## Integration Examples

### Basic Fetch (JavaScript/TypeScript)

```typescript
const API_BASE = 'http://localhost:8000';

interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
}

async function sendMessage(
  userMessage: string, 
  state: ChatState,
  financialContext?: FinancialContext
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/v1/advisor/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: userMessage,
      session_id: state.sessionId,
      conversation_history: state.messages,
      financial_context: financialContext,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to get response');
  }

  return response.json();
}
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseAdvisorChatOptions {
  financialContext?: FinancialContext;
}

export function useAdvisorChat(options: UseAdvisorChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    // Add user message immediately for optimistic UI
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          session_id: sessionId,
          conversation_history: messages,
          financial_context: options.financialContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data: ChatResponse = await response.json();
      
      setSessionId(data.session_id);
      setSuggestions(data.suggestions);
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.message 
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Remove the optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, options.financialContext]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    suggestions,
    error,
    sendMessage,
    clearChat,
  };
}
```

### Usage in Component

```tsx
function AdvisorChat() {
  const [input, setInput] = useState('');
  const { messages, isLoading, suggestions, sendMessage, error } = useAdvisorChat({
    financialContext: {
      total_income: 8500,
      monthly_savings_rate: 27,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`p-3 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-blue-100 ml-auto max-w-[80%]' 
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="bg-gray-100 p-3 rounded-lg animate-pulse">
            Thinking...
          </div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex gap-2 p-2 overflow-x-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              className="px-3 py-1 bg-blue-50 rounded-full text-sm whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about investing, budgeting, retirement..."
            className="flex-1 p-2 border rounded-lg"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>

      {error && (
        <div className="p-2 bg-red-100 text-red-700 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
```

### Next.js API Route Proxy (Optional)

If you want to proxy through Next.js to hide the backend URL:

```typescript
// app/api/advisor/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/v1/advisor/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to connect to advisor service' },
      { status: 500 }
    );
  }
}
```

---

## State Management Recommendations

### Zustand Store Example

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdvisorState {
  sessionId: string | null;
  messages: ChatMessage[];
  financialContext: FinancialContext | null;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  setSessionId: (id: string) => void;
  setFinancialContext: (context: FinancialContext) => void;
  clearChat: () => void;
}

export const useAdvisorStore = create<AdvisorState>()(
  persist(
    (set) => ({
      sessionId: null,
      messages: [],
      financialContext: null,

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setSessionId: (id) => set({ sessionId: id }),

      setFinancialContext: (context) => set({ financialContext: context }),

      clearChat: () =>
        set({
          sessionId: null,
          messages: [],
        }),
    }),
    {
      name: 'advisor-chat-storage',
      partialize: (state) => ({
        messages: state.messages.slice(-50), // Keep last 50 messages
        sessionId: state.sessionId,
      }),
    }
  )
);
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Display response |
| 400 | Invalid request | Check request format |
| 422 | Validation error | Check required fields |
| 500 | Server error | Show retry option |
| 503 | Service unavailable | Show maintenance message |

### Error Response Format

```typescript
interface ErrorResponse {
  detail: {
    success: false;
    error_code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

### Handling Examples

```typescript
async function handleChatError(response: Response) {
  if (response.status === 422) {
    const error = await response.json();
    throw new Error('Invalid message format. Please try again.');
  }
  
  if (response.status === 500) {
    throw new Error('The advisor is temporarily unavailable. Please try again.');
  }
  
  if (response.status === 503) {
    throw new Error('Service is under maintenance. Please try again later.');
  }
  
  throw new Error('An unexpected error occurred.');
}
```

---

## Best Practices

### 1. Conversation History Management

```typescript
// Keep only last 10 messages to avoid token limits
const trimmedHistory = messages.slice(-10);
```

### 2. Optimistic UI Updates

Add user messages immediately, then append assistant response:

```typescript
// Add user message right away
setMessages([...messages, { role: 'user', content: input }]);

// Then fetch and append assistant response
const response = await sendToAPI(input);
setMessages([...messages, 
  { role: 'user', content: input },
  { role: 'assistant', content: response.message }
]);
```

### 3. Use Suggestions for UX

Display the `suggestions` array as quick-reply buttons:

```tsx
{response.suggestions.map(suggestion => (
  <button onClick={() => sendMessage(suggestion)}>
    {suggestion}
  </button>
))}
```

### 4. Handle Non-Financial Queries

Check `is_financial` field to optionally style redirected responses differently:

```tsx
<div className={!response.is_financial ? 'text-amber-600' : ''}>
  {response.message}
</div>
```

### 5. Pass Financial Context When Available

If you have transaction data from `/v1/process`, pass it as context:

```typescript
const financialContext = {
  total_income: processingResult.summary.income || 0,
  total_expenses: Object.values(processingResult.summary)
    .filter(v => v < 0)
    .reduce((a, b) => a + Math.abs(b), 0),
  top_categories: processingResult.summary,
};
```

### 6. Session Persistence

Store `session_id` in localStorage or Zustand for conversation continuity across page refreshes.

---

## Testing the API

### Quick Test with cURL

```bash
curl -X POST http://localhost:8000/v1/advisor/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How should I start investing with $5000?"
  }'
```

### Health Check

```bash
curl http://localhost:8000/v1/health
# Returns: {"status":"healthy","version":"v1"}
```

### View Full API Docs

Open in browser: `http://localhost:8000/docs`

---

## Questions?

- **OpenAPI Spec**: Available at `/docs` or `/redoc`
- **Backend Issues**: Check Render logs or local terminal
- **CORS Issues**: Ensure your domain is in `ALLOWED_ORIGINS`

---

*Last updated: January 2026*
