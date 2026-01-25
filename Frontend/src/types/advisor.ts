// types/advisor.ts - TypeScript interfaces for Financial Advisor AI API

/**
 * A single message in the conversation
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string; // ISO 8601 format, optional
}

/**
 * Optional financial context for personalized advice
 * Pass this when you have transaction data from CSV processing
 */
export interface FinancialContext {
    total_income?: number;
    total_expenses?: number;
    top_categories?: Record<string, number>;
    monthly_savings_rate?: number;
    goals?: string[];
}

/**
 * Request body for /v1/advisor/chat endpoint
 */
export interface ChatRequest {
    message: string;
    session_id?: string;
    conversation_history?: ChatMessage[];
    financial_context?: FinancialContext;
    stress_testing_mode?: boolean;
}

/**
 * Response from /v1/advisor/chat endpoint
 */
export interface ChatResponse {
    message: string;
    session_id: string;
    suggestions: string[];
    is_financial: boolean;
}

/**
 * Error response structure
 */
export interface AdvisorError {
    error_code: string;
    message: string;
    details?: Record<string, unknown>;
}
