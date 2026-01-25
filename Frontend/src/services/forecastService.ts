// services/forecastService.ts - Forecast API and Firestore operations

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    ForecastRequest,
    ForecastResult,
    ForecastDocument,
    ForecastWithId,
    IncomeContext,
    BalanceContext,
} from '../types/forecastTypes';
import { CategorizedTransaction } from '../types/budget';
import { IncomeStatementData } from '../types/incomeStatement';
import { BalanceSheetData } from '../types/balanceSheet';

// API base URL - defaults to localhost for development
// @ts-ignore - Vite environment variable
const API_BASE_URL: string = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

// ============================================
// API Service Functions
// ============================================

/**
 * Generate a financial forecast using the backend API
 */
export async function generateForecast(
    transactions: CategorizedTransaction[],
    incomeData?: IncomeStatementData | null,
    balanceData?: BalanceSheetData | null,
    currentBalance?: number
): Promise<ForecastResult> {
    // Build income context if available
    let incomeContext: IncomeContext | undefined;
    if (incomeData) {
        incomeContext = {
            total_revenue: incomeData.revenues?.total || 0,
            total_expenses: incomeData.expenses?.total || 0,
            net_income: incomeData.net_income || 0,
            revenue_by_category: incomeData.revenues?.by_category,
            expense_by_category: incomeData.expenses?.by_category,
        };
    }

    // Build balance context if available
    let balanceContext: BalanceContext | undefined;
    if (balanceData) {
        // Calculate liquid assets (cash + accounts receivable)
        const liquidAssets = (balanceData.assets?.by_category?.cash || 0) +
            (balanceData.assets?.by_category?.accounts_receivable || 0);

        balanceContext = {
            total_assets: balanceData.assets?.total || 0,
            total_liabilities: balanceData.liabilities?.total || 0,
            equity: balanceData.equity || 0,
            liquid_assets: liquidAssets || currentBalance || 0,
        };
    }

    // Build request payload
    const request: ForecastRequest = {
        transactions: transactions.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: typeof t.category === 'string' ? t.category : t.category,
            confidence: t.confidence,
            original_category: t.original_category,
        })),
        income_context: incomeContext,
        balance_context: balanceContext,
        current_balance: currentBalance || 0,
        forecast_days: 90,
    };

    const response = await fetch(`${API_BASE_URL}/v1/forecast`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || `Forecast generation failed: ${response.status}`);
    }

    return response.json();
}

// ============================================
// Firestore Operations
// ============================================

/**
 * Save forecast to Firestore
 */
export async function saveForecast(
    userId: string,
    forecast: ForecastResult,
    transactionCount: number
): Promise<string> {
    const forecastsRef = collection(db, 'forecasts');

    // Generate a simple hash of source data for merge detection
    const sourceDataHash = `${transactionCount}-${forecast.historical_start}-${forecast.historical_end}`;

    const forecastDoc: ForecastDocument = {
        userId,
        forecastId: forecast.forecast_id,
        generatedAt: Timestamp.now(),
        dataPoints: forecast.data_points,
        metrics: forecast.metrics,
        insights: forecast.insights,
        confidenceLevel: forecast.confidence_level,
        dataSources: forecast.data_sources,
        historicalStart: forecast.historical_start,
        historicalEnd: forecast.historical_end,
        forecastEnd: forecast.forecast_end,
        sourceDataHash,
        transactionCount,
    };

    const docRef = await addDoc(forecastsRef, forecastDoc);
    return docRef.id;
}

/**
 * Get forecast history for a user
 */
export async function getForecastHistory(
    userId: string,
    maxCount: number = 10
): Promise<ForecastWithId[]> {
    const forecastsRef = collection(db, 'forecasts');
    const q = query(
        forecastsRef,
        where('userId', '==', userId),
        limit(maxCount)
    );

    const snapshot = await getDocs(q);
    const forecasts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as ForecastWithId[];

    // Sort by generatedAt descending client-side
    return forecasts.sort((a, b) =>
        b.generatedAt.toMillis() - a.generatedAt.toMillis()
    );
}

/**
 * Get the latest forecast for a user
 */
export async function getLatestForecast(
    userId: string
): Promise<ForecastWithId | null> {
    const forecasts = await getForecastHistory(userId, 1);
    return forecasts.length > 0 ? forecasts[0] : null;
}

/**
 * Get a specific forecast by ID
 */
export async function getForecastById(
    forecastId: string
): Promise<ForecastWithId | null> {
    const forecastRef = doc(db, 'forecasts', forecastId);
    const snapshot = await getDoc(forecastRef);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data(),
    } as ForecastWithId;
}

/**
 * Delete a forecast
 */
export async function deleteForecast(forecastId: string): Promise<void> {
    const forecastRef = doc(db, 'forecasts', forecastId);
    await deleteDoc(forecastRef);
}

/**
 * Check if source data has changed significantly
 * Used to determine if forecast should be regenerated
 */
export function shouldRegenerateForecast(
    existingForecast: ForecastWithId | null,
    newTransactionCount: number,
    newDateRange: { start: string; end: string }
): boolean {
    if (!existingForecast) {
        return true; // No existing forecast, must generate
    }

    // Check if transaction count changed significantly (>10% difference)
    const countDiff = Math.abs(newTransactionCount - (existingForecast.transactionCount || 0));
    const countThreshold = Math.max(existingForecast.transactionCount || 1, 1) * 0.1;

    if (countDiff > countThreshold) {
        return true;
    }

    // Check if date range extended
    if (newDateRange.end > existingForecast.historicalEnd) {
        return true;
    }

    // Check if forecast is stale (generated more than 1 day ago)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (existingForecast.generatedAt.toMillis() < oneDayAgo) {
        return true;
    }

    return false;
}
