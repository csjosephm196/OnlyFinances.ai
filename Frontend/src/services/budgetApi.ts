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
 * TODO: Connect to Render backend endpoint when ready
 * Expected endpoint: POST /v1/process-balance-sheet
 */
export async function uploadBalanceSheet(file: File): Promise<BalanceSheetResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        // TODO: Uncomment when Render backend endpoint is ready
        // const response = await fetch(`${API_BASE_URL}/v1/process-balance-sheet`, {
        //     method: 'POST',
        //     body: formData,
        // });
        // const data = await response.json();
        // if (!response.ok) {
        //     return {
        //         success: false,
        //         error_code: data.detail?.error_code || 'UNKNOWN_ERROR',
        //         message: data.detail?.message || 'An unexpected error occurred',
        //         details: data.detail?.details,
        //     };
        // }
        // return data as BalanceSheetData;

        // DEMO: Return mock data for frontend development
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const demoData: BalanceSheetData = {
            success: true,
            date: new Date().toISOString().split('T')[0],
            total_items: 5,
            items: [
                { name: 'Cash & Cash Equivalents', type: 'asset', category: 'cash', value: 53000, confidence: 0.95 },
                { name: 'Accounts Receivable', type: 'asset', category: 'accounts_receivable', value: 12500, confidence: 0.92 },
                { name: 'Office Equipment', type: 'asset', category: 'equipment', value: 8400, confidence: 0.88 },
                { name: 'Credit Card Balance', type: 'liability', category: 'credit_cards', value: 4200, confidence: 0.96 },
                { name: 'Taxes Payable', type: 'liability', category: 'taxes_payable', value: 12000, confidence: 0.94 },
            ],
            assets: {
                items: [
                    { name: 'Cash & Cash Equivalents', type: 'asset', category: 'cash', value: 53000, confidence: 0.95 },
                    { name: 'Accounts Receivable', type: 'asset', category: 'accounts_receivable', value: 12500, confidence: 0.92 },
                    { name: 'Office Equipment', type: 'asset', category: 'equipment', value: 8400, confidence: 0.88 },
                ],
                total: 73900,
                by_category: {
                    cash: 53000,
                    accounts_receivable: 12500,
                    inventory: 0,
                    prepaid_expenses: 0,
                    equipment: 8400,
                    property: 0,
                    investments: 0,
                    intangible_assets: 0,
                    other_assets: 0,
                },
            },
            liabilities: {
                items: [
                    { name: 'Credit Card Balance', type: 'liability', category: 'credit_cards', value: 4200, confidence: 0.96 },
                    { name: 'Taxes Payable', type: 'liability', category: 'taxes_payable', value: 12000, confidence: 0.94 },
                ],
                total: 16200,
                by_category: {
                    accounts_payable: 0,
                    credit_cards: 4200,
                    short_term_debt: 0,
                    accrued_expenses: 0,
                    taxes_payable: 12000,
                    long_term_debt: 0,
                    deferred_revenue: 0,
                    other_liabilities: 0,
                },
            },
            equity: 57700,
        };

        return demoData;
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
 * TODO: Connect to Render backend endpoint when ready
 * Expected endpoint: POST /v1/process-income-statement
 */
export async function uploadIncomeStatement(file: File): Promise<IncomeStatementResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        // TODO: Uncomment when Render backend endpoint is ready
        // const response = await fetch(`${API_BASE_URL}/v1/process-income-statement`, {
        //     method: 'POST',
        //     body: formData,
        // });
        // const data = await response.json();
        // if (!response.ok) {
        //     return {
        //         success: false,
        //         error_code: data.detail?.error_code || 'UNKNOWN_ERROR',
        //         message: data.detail?.message || 'An unexpected error occurred',
        //         details: data.detail?.details,
        //     };
        // }
        // return data as IncomeStatementData;

        // DEMO: Return mock data for frontend development
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const demoData: IncomeStatementData = {
            success: true,
            period: {
                start: '2024-01-01',
                end: '2024-12-31',
            },
            total_items: 8,
            items: [
                { description: 'Product Sales', type: 'revenue', category: 'sales', amount: 125000, confidence: 0.97 },
                { description: 'Consulting Services', type: 'revenue', category: 'services', amount: 45000, confidence: 0.94 },
                { description: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_goods_sold', amount: 42000, confidence: 0.96 },
                { description: 'Salaries & Wages', type: 'expense', category: 'salaries_wages', amount: 58000, confidence: 0.98 },
                { description: 'Office Rent', type: 'expense', category: 'rent', amount: 24000, confidence: 0.99 },
                { description: 'Utilities', type: 'expense', category: 'utilities', amount: 3600, confidence: 0.91 },
                { description: 'Marketing', type: 'expense', category: 'marketing', amount: 8500, confidence: 0.89 },
                { description: 'Professional Fees', type: 'expense', category: 'professional_fees', amount: 5200, confidence: 0.93 },
            ],
            revenues: {
                items: [
                    { description: 'Product Sales', type: 'revenue', category: 'sales', amount: 125000, confidence: 0.97 },
                    { description: 'Consulting Services', type: 'revenue', category: 'services', amount: 45000, confidence: 0.94 },
                ],
                total: 170000,
                by_category: {
                    sales: 125000,
                    services: 45000,
                    interest_income: 0,
                    investment_income: 0,
                    rental_income: 0,
                    royalties: 0,
                    other_revenue: 0,
                },
            },
            expenses: {
                items: [
                    { description: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_goods_sold', amount: 42000, confidence: 0.96 },
                    { description: 'Salaries & Wages', type: 'expense', category: 'salaries_wages', amount: 58000, confidence: 0.98 },
                    { description: 'Office Rent', type: 'expense', category: 'rent', amount: 24000, confidence: 0.99 },
                    { description: 'Utilities', type: 'expense', category: 'utilities', amount: 3600, confidence: 0.91 },
                    { description: 'Marketing', type: 'expense', category: 'marketing', amount: 8500, confidence: 0.89 },
                    { description: 'Professional Fees', type: 'expense', category: 'professional_fees', amount: 5200, confidence: 0.93 },
                ],
                total: 141300,
                by_category: {
                    cost_of_goods_sold: 42000,
                    salaries_wages: 58000,
                    rent: 24000,
                    utilities: 3600,
                    marketing: 8500,
                    insurance: 0,
                    depreciation: 0,
                    interest_expense: 0,
                    taxes: 0,
                    professional_fees: 5200,
                    office_supplies: 0,
                    travel: 0,
                    other_expenses: 0,
                },
            },
            gross_profit: 128000, // Revenue - COGS
            net_income: 28700,    // Total Revenue - Total Expenses
        };

        return demoData;
    } catch (error) {
        return {
            success: false,
            error_code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Network request failed',
        };
    }
}

