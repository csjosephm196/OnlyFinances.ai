// services/advisorApi.ts - API service for Financial Advisor AI chatbot

import { ChatMessage, ChatResponse, FinancialContext, AdvisorError } from '../types/advisor';

const ADVISOR_API_URL = 'https://demo-backend-bqyy.onrender.com';

/**
 * Send a message to the Financial Advisor AI
 * 
 * @param message - User's current message
 * @param sessionId - Optional session ID for conversation tracking
 * @param conversationHistory - Previous messages in the conversation
 * @param financialContext - Optional financial data for personalized advice
 * @param stressTestingMode - Optional flag to enable stress testing mode
 * @returns ChatResponse on success, or AdvisorError on failure
 */
export async function sendMessage(
    message: string,
    sessionId?: string | null,
    conversationHistory?: ChatMessage[],
    financialContext?: FinancialContext,
    stressTestingMode?: boolean
): Promise<ChatResponse | AdvisorError> {
    try {
        const response = await fetch(`${ADVISOR_API_URL}/v1/advisor/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                session_id: sessionId,
                conversation_history: conversationHistory,
                financial_context: financialContext,
                stress_testing_mode: stressTestingMode || false,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                error_code: data.detail?.error_code || 'API_ERROR',
                message: data.detail?.message || 'Failed to get advisor response',
                details: data.detail?.details,
            };
        }

        return data as ChatResponse;
    } catch (error) {
        return {
            error_code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Network request failed',
        };
    }
}

/**
 * Check if the Advisor API is online
 */
export async function checkAdvisorHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${ADVISOR_API_URL}/v1/health`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Helper to check if response is an error
 */
export function isAdvisorError(response: ChatResponse | AdvisorError): response is AdvisorError {
    return 'error_code' in response;
}
