// constants/categories.ts - Category display configuration for small businesses

import { SpendingCategory } from '../types/budget';

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
