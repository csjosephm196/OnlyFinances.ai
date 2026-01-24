// types/budget.ts - TypeScript interfaces for Budget AI API

export type SpendingCategory =
  // Core personal categories
  | 'housing'
  | 'groceries'
  | 'dining_out'
  | 'transportation'
  | 'utilities'
  | 'entertainment'
  | 'shopping'
  | 'healthcare'
  | 'education'
  | 'subscriptions'
  | 'travel'
  | 'personal'
  // Business-specific categories
  | 'advertising'
  | 'marketing'
  | 'equipment'
  | 'assets'
  | 'payroll'
  | 'wages'
  | 'taxes'
  | 'legal'
  | 'insurance'
  | 'office_supplies'
  | 'software'
  | 'rent'
  | 'fees'
  | 'professional_services'
  | 'inventory'
  | 'shipping'
  | 'maintenance'
  | 'revenue'
  | 'income'
  | 'refund'
  | 'transfer'
  | 'financial'
  | 'debt'
  | 'loan'
  | 'interest'
  // Fallback
  | 'other';

export interface CategorizedTransaction {
  date: string;              // Format: "YYYY-MM-DD"
  description: string;       // e.g., "WALMART GROCERY #1234"
  amount: number;            // Negative for expenses, positive for income
  category: SpendingCategory;
  confidence: number;        // 0.0 to 1.0 (AI confidence score)
  original_category: string | null;
}

export interface DateRange {
  start: string;  // "YYYY-MM-DD"
  end: string;    // "YYYY-MM-DD"
}

export interface ProcessingResult {
  success: true;
  total_transactions: number;
  date_range: DateRange;
  transactions: CategorizedTransaction[];
  summary: Record<SpendingCategory, number>;           // Category -> total spent
  monthly_breakdown: Record<string, Record<SpendingCategory, number>>; // "YYYY-MM" -> Category -> amount
}

export interface ProcessingError {
  success: false;
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ProcessingResponse = ProcessingResult | ProcessingError;
