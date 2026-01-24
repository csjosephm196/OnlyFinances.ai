// types/balanceSheet.ts - TypeScript interfaces for Balance Sheet data

export type AssetCategory =
    | 'cash'
    | 'accounts_receivable'
    | 'inventory'
    | 'prepaid_expenses'
    | 'equipment'
    | 'property'
    | 'investments'
    | 'intangible_assets'
    | 'other_assets';

export type LiabilityCategory =
    | 'accounts_payable'
    | 'credit_cards'
    | 'short_term_debt'
    | 'accrued_expenses'
    | 'taxes_payable'
    | 'long_term_debt'
    | 'deferred_revenue'
    | 'other_liabilities';

export interface BalanceSheetItem {
    name: string;
    type: 'asset' | 'liability';
    category: AssetCategory | LiabilityCategory;
    value: number;
    confidence: number; // AI confidence score 0.0 to 1.0
}

export interface BalanceSheetData {
    success: true;
    date: string; // Date of the balance sheet "YYYY-MM-DD"
    total_items: number;
    items: BalanceSheetItem[];
    assets: {
        items: BalanceSheetItem[];
        total: number;
        by_category: Record<AssetCategory, number>;
    };
    liabilities: {
        items: BalanceSheetItem[];
        total: number;
        by_category: Record<LiabilityCategory, number>;
    };
    equity: number; // Total Assets - Total Liabilities
}

export interface BalanceSheetError {
    success: false;
    error_code: string;
    message: string;
    details?: Record<string, unknown>;
}

export type BalanceSheetResponse = BalanceSheetData | BalanceSheetError;
