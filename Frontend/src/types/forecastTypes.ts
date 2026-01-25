// types/forecastTypes.ts - TypeScript interfaces for financial forecasting

/**
 * Single point in forecast timeline
 */
export interface ForecastDataPoint {
    date: string; // YYYY-MM-DD format
    actual: number | null;
    predicted: number | null;
    upper_bound: number | null;
    lower_bound: number | null;
    cumulative_balance: number | null;
}

/**
 * Insight type for visual styling
 */
export type ForecastInsightType = 'warning' | 'success' | 'info';

/**
 * AI-generated insight card
 */
export interface ForecastInsight {
    type: ForecastInsightType;
    title: string;
    description: string;
    metric_value?: string;
}

/**
 * Key forecast metrics
 */
export interface ForecastMetrics {
    runway_months: number;
    safety_buffer: number;
    avg_daily_revenue: number;
    avg_daily_expense: number;
    avg_daily_net: number;
    projected_end_balance: number;
    current_balance: number;
}

/**
 * Income statement context for forecast
 */
export interface IncomeContext {
    total_revenue: number;
    total_expenses: number;
    net_income: number;
    revenue_by_category?: Record<string, number>;
    expense_by_category?: Record<string, number>;
}

/**
 * Balance sheet context for forecast
 */
export interface BalanceContext {
    total_assets: number;
    total_liabilities: number;
    equity: number;
    liquid_assets: number;
}

/**
 * Request body for generating forecast
 */
export interface ForecastRequest {
    transactions: Array<{
        date: string;
        description: string;
        amount: number;
        category: string;
        confidence: number;
        original_category?: string | null;
    }>;
    income_context?: IncomeContext;
    balance_context?: BalanceContext;
    current_balance: number;
    forecast_days?: number;
}

/**
 * Complete forecast result from API
 */
export interface ForecastResult {
    success: boolean;
    forecast_id: string;
    generated_at: string;
    data_points: ForecastDataPoint[];
    metrics: ForecastMetrics;
    insights: ForecastInsight[];
    confidence_level: number;
    data_sources: string[];
    historical_start: string;
    historical_end: string;
    forecast_end: string;
}

// ============================================
// Firestore Document Types
// ============================================

import { Timestamp } from 'firebase/firestore';

/**
 * Forecast document stored in Firestore
 */
export interface ForecastDocument {
    userId: string;
    forecastId: string;
    generatedAt: Timestamp;
    dataPoints: ForecastDataPoint[];
    metrics: ForecastMetrics;
    insights: ForecastInsight[];
    confidenceLevel: number;
    dataSources: string[];
    historicalStart: string;
    historicalEnd: string;
    forecastEnd: string;
    // Tracking for merge/override logic
    sourceDataHash?: string;
    transactionCount?: number;
}

/**
 * Forecast document with Firestore ID
 */
export interface ForecastWithId extends ForecastDocument {
    id: string;
}

/**
 * Chart-ready data point format for recharts
 */
export interface ChartDataPoint {
    date: string;
    actual?: number;
    predicted?: number;
    upperBound?: number;
    lowerBound?: number;
}
