// constants/categories.ts - Category display configuration for small businesses

import { SpendingCategory } from '../types/budget';
import { RevenueCategory, ExpenseCategory } from '../types/incomeStatement';

export interface CategoryDisplay {
    icon: string;
    label: string;
    color: string;
}

export const CATEGORY_DISPLAY: Record<SpendingCategory, CategoryDisplay> = {
    // === BUSINESS OPERATIONS ===
    advertising: { icon: '📢', label: 'Advertising', color: '#F97316' },
    marketing: { icon: '📣', label: 'Marketing', color: '#EA580C' },
    equipment: { icon: '🔧', label: 'Equipment', color: '#0891B2' },
    assets: { icon: '💻', label: 'Assets', color: '#0E7490' },
    office_supplies: { icon: '📎', label: 'Office Supplies', color: '#6366F1' },
    software: { icon: '💿', label: 'Software', color: '#8B5CF6' },
    subscriptions: { icon: '🔄', label: 'Subscriptions', color: '#A855F7' },
    inventory: { icon: '📦', label: 'Inventory', color: '#14B8A6' },
    shipping: { icon: '📬', label: 'Shipping', color: '#2DD4BF' },
    maintenance: { icon: '🔨', label: 'Maintenance', color: '#64748B' },

    // === FACILITY & OVERHEAD ===
    rent: { icon: '🏢', label: 'Rent/Lease', color: '#8B5CF6' },
    housing: { icon: '🏠', label: 'Housing', color: '#7C3AED' },
    utilities: { icon: '💡', label: 'Utilities', color: '#6366F1' },
    insurance: { icon: '🛡️', label: 'Insurance', color: '#3B82F6' },

    // === PEOPLE & SERVICES ===
    payroll: { icon: '💵', label: 'Payroll', color: '#059669' },
    wages: { icon: '👷', label: 'Wages', color: '#10B981' },
    professional_services: { icon: '👔', label: 'Professional Services', color: '#0D9488' },
    legal: { icon: '⚖️', label: 'Legal', color: '#0F766E' },

    // === FINANCIAL ===
    taxes: { icon: '🏛️', label: 'Taxes', color: '#DC2626' },
    fees: { icon: '💳', label: 'Fees & Charges', color: '#EF4444' },
    financial: { icon: '🏦', label: 'Financial', color: '#64748B' },
    debt: { icon: '📉', label: 'Debt Payment', color: '#78716C' },
    loan: { icon: '🏧', label: 'Loan Payment', color: '#737373' },
    interest: { icon: '📊', label: 'Interest', color: '#A3A3A3' },

    // === INCOME ===
    revenue: { icon: '💰', label: 'Revenue', color: '#16A34A' },
    income: { icon: '💵', label: 'Income', color: '#22C55E' },
    refund: { icon: '↩️', label: 'Refund', color: '#4ADE80' },
    transfer: { icon: '🔁', label: 'Transfer', color: '#94A3B8' },

    // === TRAVEL & MEALS ===
    travel: { icon: '✈️', label: 'Travel', color: '#0EA5E9' },
    transportation: { icon: '🚗', label: 'Transportation', color: '#3B82F6' },
    dining_out: { icon: '🍽️', label: 'Meals & Entertainment', color: '#F59E0B' },

    // === OTHER ===
    groceries: { icon: '🛒', label: 'Groceries', color: '#10B981' },
    shopping: { icon: '🛍️', label: 'Shopping', color: '#14B8A6' },
    healthcare: { icon: '💊', label: 'Healthcare', color: '#EF4444' },
    education: { icon: '📚', label: 'Education', color: '#8B5CF6' },
    entertainment: { icon: '🎬', label: 'Entertainment', color: '#EC4899' },
    personal: { icon: '🎁', label: 'Personal', color: '#D946EF' },
    other: { icon: '❓', label: 'Other', color: '#9CA3AF' },
};

// Display configuration for revenue categories
export const REVENUE_DISPLAY: Record<RevenueCategory, { icon: string; label: string; color: string }> = {
    wages_salary: { icon: '💵', label: 'Wages & Salary', color: '#22C55E' },
    sales: { icon: '🛒', label: 'Sales', color: '#10B981' },
    services: { icon: '🔧', label: 'Services', color: '#3B82F6' },
    interest_income: { icon: '🏦', label: 'Interest Income', color: '#8B5CF6' },
    investment_income: { icon: '📈', label: 'Investment Income', color: '#06B6D4' },
    rental_income: { icon: '🏠', label: 'Rental Income', color: '#F59E0B' },
    royalties: { icon: '👑', label: 'Royalties', color: '#EC4899' },
    other_revenue: { icon: '💰', label: 'Other Revenue', color: '#6B7280' },
};

// Display configuration for expense categories
export const EXPENSE_DISPLAY: Record<ExpenseCategory, { icon: string; label: string; color: string }> = {
    cost_of_goods_sold: { icon: '📦', label: 'Cost of Goods Sold', color: '#EF4444' },
    salaries_wages: { icon: '👥', label: 'Salaries & Wages', color: '#F97316' },
    rent: { icon: '🏢', label: 'Rent', color: '#F59E0B' },
    utilities: { icon: '💡', label: 'Utilities', color: '#84CC16' },
    marketing: { icon: '📢', label: 'Marketing', color: '#06B6D4' },
    insurance: { icon: '🛡️', label: 'Insurance', color: '#3B82F6' },
    depreciation: { icon: '📉', label: 'Depreciation', color: '#8B5CF6' },
    interest_expense: { icon: '💳', label: 'Interest Expense', color: '#EC4899' },
    taxes: { icon: '🏛️', label: 'Taxes', color: '#6366F1' },
    professional_fees: { icon: '👔', label: 'Professional Fees', color: '#14B8A6' },
    office_supplies: { icon: '📎', label: 'Office Supplies', color: '#A855F7' },
    travel: { icon: '✈️', label: 'Travel', color: '#F43F5E' },
    other_expenses: { icon: '📋', label: 'Other Expenses', color: '#6B7280' },
};

// Helper to get error messages for API error codes
export function getErrorMessage(errorCode: string): string {
    const messages: Record<string, string> = {
        INVALID_FILE_TYPE: 'Please upload a CSV file',
        FILE_TOO_LARGE: 'File is too large. Maximum size is 5MB',
        EMPTY_FILE: 'The uploaded file is empty',
        PARSE_ERROR: 'Unable to read the CSV file. Please check the format',
        PROCESSING_ERROR: 'Something went wrong. Please try again',
        NETWORK_ERROR: 'Unable to connect to the server. Check your internet connection',
    };
    return messages[errorCode] || 'An unexpected error occurred';
}

// Category groups for organized display
export const CATEGORY_GROUPS = {
    'Business Operations': ['advertising', 'marketing', 'equipment', 'assets', 'office_supplies', 'software', 'subscriptions', 'inventory', 'shipping', 'maintenance'],
    'Facility & Overhead': ['rent', 'housing', 'utilities', 'insurance'],
    'People & Services': ['payroll', 'wages', 'professional_services', 'legal'],
    'Financial': ['taxes', 'fees', 'financial', 'debt', 'loan', 'interest'],
    'Income': ['revenue', 'income', 'refund', 'transfer'],
    'Travel & Meals': ['travel', 'transportation', 'dining_out'],
    'Personal': ['groceries', 'shopping', 'healthcare', 'education', 'entertainment', 'personal', 'other'],
} as const;
