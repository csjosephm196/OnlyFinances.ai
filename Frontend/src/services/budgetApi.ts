// services/budgetApi.ts - API service for CSV processing

import { ProcessingResponse, ProcessingResult } from '../types/budget';
import { BalanceSheetResponse, BalanceSheetData } from '../types/balanceSheet';
import { IncomeStatementResponse, IncomeStatementData } from '../types/incomeStatement';

const API_BASE_URL = 'https://demo-backend-bqyy.onrender.com';

export async function uploadCSV(file: File): Promise<ProcessingResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/v1/process`, {
            method: 'POST',
            body: formData,
            // Note: Don't set Content-Type header - browser will set it with boundary
        });

        const data = await response.json();

        if (!response.ok) {
            // API returns error details in response body
            return {
                success: false,
                error_code: data.detail?.error_code || 'UNKNOWN_ERROR',
                message: data.detail?.message || 'An unexpected error occurred',
                details: data.detail?.details,
            };
        }

        return data as ProcessingResult;
    } catch (error) {
        return {
            success: false,
            error_code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Network request failed',
        };
    }
}

// Health check function to verify API is online
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/v1/health`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Upload Balance Sheet CSV for AI processing
 * Connects to Render backend endpoint: POST /v1/process-balance-sheet
 */
export async function uploadBalanceSheet(file: File): Promise<BalanceSheetResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/v1/process-balance-sheet`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error_code: data.detail?.error_code || 'UNKNOWN_ERROR',
                message: data.detail?.message || 'An unexpected error occurred',
                details: data.detail?.details,
            };
        }
        return data as BalanceSheetData;
    } catch (error) {
        return {
            success: false,
            error_code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Network request failed',
        };
    }
}

/**
 * Upload Income Statement CSV for AI processing
 * Connects to Render backend endpoint: POST /v1/process-income-statement
 */
export async function uploadIncomeStatement(file: File): Promise<IncomeStatementResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/v1/process-income-statement`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error_code: data.detail?.error_code || 'UNKNOWN_ERROR',
                message: data.detail?.message || 'An unexpected error occurred',
                details: data.detail?.details,
            };
        }
        return data as IncomeStatementData;
    } catch (error) {
        return {
            success: false,
            error_code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Network request failed',
        };
    }
}

