// utils/dataMerge.ts - Utility functions for merging uploaded financial data

import { ProcessingResult, CategorizedTransaction, SpendingCategory, DateRange } from '../types/budget';
import { BalanceSheetData, BalanceSheetItem, AssetCategory, LiabilityCategory } from '../types/balanceSheet';
import { IncomeStatementData, IncomeStatementItem, RevenueCategory, ExpenseCategory } from '../types/incomeStatement';

// ============================================
// Transaction Merge Utilities
// ============================================

/**
 * Create a unique key for a transaction for deduplication
 */
function getTransactionKey(t: CategorizedTransaction): string {
    return `${t.date}|${t.description}|${t.amount}`;
}

/**
 * Merge date ranges to encompass both periods
 */
function mergeDateRanges(existing: DateRange, incoming: DateRange): DateRange {
    const dates = [existing.start, existing.end, incoming.start, incoming.end].sort();
    return {
        start: dates[0],
        end: dates[dates.length - 1],
    };
}

/**
 * Recalculate summary from transactions
 */
function recalculateSummary(transactions: CategorizedTransaction[]): Record<SpendingCategory, number> {
    const summary: Partial<Record<SpendingCategory, number>> = {};
    
    for (const t of transactions) {
        if (!summary[t.category]) {
            summary[t.category] = 0;
        }
        summary[t.category]! += t.amount;
    }
    
    return summary as Record<SpendingCategory, number>;
}

/**
 * Recalculate monthly breakdown from transactions
 */
function recalculateMonthlyBreakdown(
    transactions: CategorizedTransaction[]
): Record<string, Record<SpendingCategory, number>> {
    const breakdown: Record<string, Record<SpendingCategory, number>> = {};
    
    for (const t of transactions) {
        const month = t.date.substring(0, 7); // "YYYY-MM"
        if (!breakdown[month]) {
            breakdown[month] = {} as Record<SpendingCategory, number>;
        }
        if (!breakdown[month][t.category]) {
            breakdown[month][t.category] = 0;
        }
        breakdown[month][t.category] += t.amount;
    }
    
    return breakdown;
}

/**
 * Merge new processing result with existing one
 * Returns merged result and count of new/skipped transactions
 */
export function mergeProcessingResults(
    existing: ProcessingResult | null,
    incoming: ProcessingResult
): { merged: ProcessingResult; newCount: number; skippedCount: number } {
    if (!existing) {
        return {
            merged: incoming,
            newCount: incoming.transactions.length,
            skippedCount: 0,
        };
    }

    // Create set of existing transaction keys for deduplication
    const existingKeys = new Set(existing.transactions.map(getTransactionKey));
    
    // Find new transactions (not duplicates)
    const newTransactions: CategorizedTransaction[] = [];
    let skippedCount = 0;
    
    for (const t of incoming.transactions) {
        const key = getTransactionKey(t);
        if (!existingKeys.has(key)) {
            newTransactions.push(t);
            existingKeys.add(key); // Prevent duplicates within incoming batch
        } else {
            skippedCount++;
        }
    }

    // Merge transactions
    const mergedTransactions = [...existing.transactions, ...newTransactions];
    
    // Sort by date descending
    mergedTransactions.sort((a, b) => b.date.localeCompare(a.date));

    // Recalculate aggregates
    const merged: ProcessingResult = {
        success: true,
        total_transactions: mergedTransactions.length,
        date_range: mergeDateRanges(existing.date_range, incoming.date_range),
        transactions: mergedTransactions,
        summary: recalculateSummary(mergedTransactions),
        monthly_breakdown: recalculateMonthlyBreakdown(mergedTransactions),
    };

    return {
        merged,
        newCount: newTransactions.length,
        skippedCount,
    };
}

// ============================================
// Balance Sheet Merge Utilities
// ============================================

/**
 * Create a unique key for a balance sheet item
 */
function getBalanceSheetItemKey(item: BalanceSheetItem): string {
    return `${item.name.toLowerCase().trim()}|${item.type}`;
}

/**
 * Recalculate balance sheet aggregates from items
 */
function recalculateBalanceSheetAggregates(items: BalanceSheetItem[]): {
    assets: { items: BalanceSheetItem[]; total: number; by_category: Record<AssetCategory, number> };
    liabilities: { items: BalanceSheetItem[]; total: number; by_category: Record<LiabilityCategory, number> };
    equity: number;
} {
    const assetItems = items.filter(i => i.type === 'asset');
    const liabilityItems = items.filter(i => i.type === 'liability');
    
    const assetsByCategory: Partial<Record<AssetCategory, number>> = {};
    let assetsTotal = 0;
    for (const item of assetItems) {
        assetsTotal += item.value;
        const cat = item.category as AssetCategory;
        if (!assetsByCategory[cat]) assetsByCategory[cat] = 0;
        assetsByCategory[cat]! += item.value;
    }
    
    const liabilitiesByCategory: Partial<Record<LiabilityCategory, number>> = {};
    let liabilitiesTotal = 0;
    for (const item of liabilityItems) {
        liabilitiesTotal += item.value;
        const cat = item.category as LiabilityCategory;
        if (!liabilitiesByCategory[cat]) liabilitiesByCategory[cat] = 0;
        liabilitiesByCategory[cat]! += item.value;
    }
    
    return {
        assets: {
            items: assetItems,
            total: assetsTotal,
            by_category: assetsByCategory as Record<AssetCategory, number>,
        },
        liabilities: {
            items: liabilityItems,
            total: liabilitiesTotal,
            by_category: liabilitiesByCategory as Record<LiabilityCategory, number>,
        },
        equity: assetsTotal - liabilitiesTotal,
    };
}

/**
 * Merge new balance sheet with existing one
 * Items with same name+type are summed together
 */
export function mergeBalanceSheets(
    existing: BalanceSheetData | null,
    incoming: BalanceSheetData
): { merged: BalanceSheetData; newCount: number; updatedCount: number } {
    if (!existing) {
        return {
            merged: incoming,
            newCount: incoming.items.length,
            updatedCount: 0,
        };
    }

    // Map existing items by key
    const itemMap = new Map<string, BalanceSheetItem>();
    for (const item of existing.items) {
        itemMap.set(getBalanceSheetItemKey(item), { ...item });
    }

    let newCount = 0;
    let updatedCount = 0;

    // Process incoming items
    for (const item of incoming.items) {
        const key = getBalanceSheetItemKey(item);
        if (itemMap.has(key)) {
            // Sum values for existing items
            const existingItem = itemMap.get(key)!;
            existingItem.value += item.value;
            // Keep higher confidence
            existingItem.confidence = Math.max(existingItem.confidence, item.confidence);
            updatedCount++;
        } else {
            // Add new item
            itemMap.set(key, { ...item });
            newCount++;
        }
    }

    const mergedItems = Array.from(itemMap.values());
    const aggregates = recalculateBalanceSheetAggregates(mergedItems);

    // Use the later date
    const latestDate = existing.date > incoming.date ? existing.date : incoming.date;

    const merged: BalanceSheetData = {
        success: true,
        date: latestDate,
        total_items: mergedItems.length,
        items: mergedItems,
        ...aggregates,
    };

    return { merged, newCount, updatedCount };
}

// ============================================
// Income Statement Merge Utilities
// ============================================

/**
 * Create a unique key for an income statement item
 */
function getIncomeStatementItemKey(item: IncomeStatementItem): string {
    return `${item.description.toLowerCase().trim()}|${item.type}|${item.category}`;
}

/**
 * Merge period ranges
 */
function mergePeriods(
    existing: { start: string; end: string },
    incoming: { start: string; end: string }
): { start: string; end: string } {
    const dates = [existing.start, existing.end, incoming.start, incoming.end].sort();
    return {
        start: dates[0],
        end: dates[dates.length - 1],
    };
}

/**
 * Recalculate income statement aggregates from items
 */
function recalculateIncomeStatementAggregates(items: IncomeStatementItem[]): {
    revenues: { items: IncomeStatementItem[]; total: number; by_category: Record<RevenueCategory, number> };
    expenses: { items: IncomeStatementItem[]; total: number; by_category: Record<ExpenseCategory, number> };
    gross_profit: number;
    net_income: number;
} {
    const revenueItems = items.filter(i => i.type === 'revenue');
    const expenseItems = items.filter(i => i.type === 'expense');
    
    const revenuesByCategory: Partial<Record<RevenueCategory, number>> = {};
    let revenuesTotal = 0;
    for (const item of revenueItems) {
        revenuesTotal += item.amount;
        const cat = item.category as RevenueCategory;
        if (!revenuesByCategory[cat]) revenuesByCategory[cat] = 0;
        revenuesByCategory[cat]! += item.amount;
    }
    
    const expensesByCategory: Partial<Record<ExpenseCategory, number>> = {};
    let expensesTotal = 0;
    for (const item of expenseItems) {
        expensesTotal += item.amount;
        const cat = item.category as ExpenseCategory;
        if (!expensesByCategory[cat]) expensesByCategory[cat] = 0;
        expensesByCategory[cat]! += item.amount;
    }
    
    // Gross profit = Revenue - COGS
    const cogs = expensesByCategory['cost_of_goods_sold'] || 0;
    const grossProfit = revenuesTotal - cogs;
    
    // Net income = Revenue - All Expenses
    const netIncome = revenuesTotal - expensesTotal;
    
    return {
        revenues: {
            items: revenueItems,
            total: revenuesTotal,
            by_category: revenuesByCategory as Record<RevenueCategory, number>,
        },
        expenses: {
            items: expenseItems,
            total: expensesTotal,
            by_category: expensesByCategory as Record<ExpenseCategory, number>,
        },
        gross_profit: grossProfit,
        net_income: netIncome,
    };
}

/**
 * Merge new income statement with existing one
 * Items with same description+type+category are summed together
 */
export function mergeIncomeStatements(
    existing: IncomeStatementData | null,
    incoming: IncomeStatementData
): { merged: IncomeStatementData; newCount: number; updatedCount: number } {
    if (!existing) {
        return {
            merged: incoming,
            newCount: incoming.items.length,
            updatedCount: 0,
        };
    }

    // Map existing items by key
    const itemMap = new Map<string, IncomeStatementItem>();
    for (const item of existing.items) {
        itemMap.set(getIncomeStatementItemKey(item), { ...item });
    }

    let newCount = 0;
    let updatedCount = 0;

    // Process incoming items
    for (const item of incoming.items) {
        const key = getIncomeStatementItemKey(item);
        if (itemMap.has(key)) {
            // Sum amounts for existing items
            const existingItem = itemMap.get(key)!;
            existingItem.amount += item.amount;
            // Keep higher confidence
            existingItem.confidence = Math.max(existingItem.confidence, item.confidence);
            updatedCount++;
        } else {
            // Add new item
            itemMap.set(key, { ...item });
            newCount++;
        }
    }

    const mergedItems = Array.from(itemMap.values());
    const aggregates = recalculateIncomeStatementAggregates(mergedItems);

    const merged: IncomeStatementData = {
        success: true,
        period: mergePeriods(existing.period, incoming.period),
        total_items: mergedItems.length,
        items: mergedItems,
        ...aggregates,
    };

    return { merged, newCount, updatedCount };
}
