"""Recurring Expense Detection Service.

AI-powered service to detect recurring subscriptions, bills, and other
regular payments from transaction history.
"""

import logging
import re
from datetime import date, timedelta
from collections import defaultdict
from typing import Optional

from .models import (
    CategorizedTransaction,
    RecurringExpense,
    RecurringExpensesResult,
    RecurringFrequency,
    SpendingCategory,
)

logger = logging.getLogger(__name__)

# Frequency detection thresholds (in days)
FREQUENCY_PATTERNS = {
    RecurringFrequency.WEEKLY: {"min": 5, "max": 9, "typical": 7},
    RecurringFrequency.BIWEEKLY: {"min": 12, "max": 17, "typical": 14},
    RecurringFrequency.MONTHLY: {"min": 26, "max": 35, "typical": 30},
    RecurringFrequency.QUARTERLY: {"min": 85, "max": 100, "typical": 91},
    RecurringFrequency.YEARLY: {"min": 350, "max": 380, "typical": 365},
}

# Common subscription/bill keywords for boost confidence
SUBSCRIPTION_KEYWORDS = [
    "netflix", "spotify", "hulu", "disney", "hbo", "amazon prime",
    "apple", "google", "microsoft", "adobe", "dropbox", "slack",
    "gym", "fitness", "planet fitness", "anytime fitness",
    "internet", "cable", "phone", "mobile", "wireless", "verizon", "at&t", "t-mobile",
    "electric", "gas", "water", "utility", "power", "energy",
    "insurance", "geico", "state farm", "progressive", "allstate",
    "rent", "mortgage", "lease",
    "membership", "subscription", "recurring", "monthly", "annual",
]


def normalize_merchant(description: str) -> str:
    """Normalize a transaction description to extract merchant name.
    
    Removes common prefixes, suffixes, transaction IDs, and normalizes text.
    """
    # Convert to lowercase
    text = description.lower().strip()
    
    # Remove common payment prefixes
    prefixes_to_remove = [
        r"^visa\s+",
        r"^mastercard\s+",
        r"^amex\s+",
        r"^debit\s+",
        r"^credit\s+",
        r"^pos\s+",
        r"^purchase\s+",
        r"^payment\s+to\s+",
        r"^ach\s+",
        r"^autopay\s+",
        r"^recurring\s+",
    ]
    for prefix in prefixes_to_remove:
        text = re.sub(prefix, "", text, flags=re.IGNORECASE)
    
    # Remove transaction IDs, reference numbers (sequences of numbers/letters at end)
    text = re.sub(r"\s*[#*]\d+.*$", "", text)
    text = re.sub(r"\s+\d{4,}.*$", "", text)
    text = re.sub(r"\s+[a-z0-9]{8,}$", "", text)
    
    # Remove common suffixes
    suffixes_to_remove = [
        r"\s+\d{2}/\d{2}$",  # Date suffixes like 01/15
        r"\s+\d{5,}$",       # Long number suffixes
        r"\s+[a-z]{2}\s*$",  # State abbreviations  
    ]
    for suffix in suffixes_to_remove:
        text = re.sub(suffix, "", text, flags=re.IGNORECASE)
    
    # Clean up and capitalize
    text = re.sub(r"\s+", " ", text).strip()
    
    # Return title case
    return text.title() if text else description.title()


def calculate_intervals(dates: list[date]) -> list[int]:
    """Calculate the intervals (in days) between sorted dates."""
    if len(dates) < 2:
        return []
    
    sorted_dates = sorted(dates)
    return [(sorted_dates[i+1] - sorted_dates[i]).days for i in range(len(sorted_dates) - 1)]


def detect_frequency(intervals: list[int]) -> Optional[tuple[RecurringFrequency, float]]:
    """Detect the frequency pattern from intervals.
    
    Returns the detected frequency and confidence score, or None if no pattern found.
    """
    if not intervals:
        return None
    
    avg_interval = sum(intervals) / len(intervals)
    
    # Check each frequency pattern
    best_match = None
    best_confidence = 0.0
    
    for frequency, bounds in FREQUENCY_PATTERNS.items():
        if bounds["min"] <= avg_interval <= bounds["max"]:
            # Calculate confidence based on consistency
            typical = bounds["typical"]
            variance = sum((i - typical) ** 2 for i in intervals) / len(intervals)
            std_dev = variance ** 0.5
            
            # Higher confidence for lower variance
            max_std_dev = (bounds["max"] - bounds["min"]) / 2
            consistency = max(0, 1 - (std_dev / max_std_dev)) if max_std_dev > 0 else 1.0
            
            # Boost confidence for more occurrences
            occurrence_boost = min(0.2, len(intervals) * 0.03)
            
            confidence = min(1.0, consistency * 0.8 + occurrence_boost)
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = (frequency, confidence)
    
    return best_match


def calculate_monthly_amount(amount: float, frequency: RecurringFrequency) -> float:
    """Convert an expense amount to its monthly equivalent."""
    multipliers = {
        RecurringFrequency.WEEKLY: 4.33,      # 52 weeks / 12 months
        RecurringFrequency.BIWEEKLY: 2.17,    # 26 periods / 12 months
        RecurringFrequency.MONTHLY: 1.0,
        RecurringFrequency.QUARTERLY: 0.33,   # 4 times / 12 months
        RecurringFrequency.YEARLY: 0.083,     # 1 / 12 months
    }
    return abs(amount) * multipliers.get(frequency, 1.0)


def has_subscription_keyword(description: str) -> bool:
    """Check if description contains common subscription keywords."""
    lower_desc = description.lower()
    return any(keyword in lower_desc for keyword in SUBSCRIPTION_KEYWORDS)


async def detect_recurring_expenses(
    transactions: list[CategorizedTransaction],
    min_occurrences: int = 2
) -> RecurringExpensesResult:
    """Detect recurring expenses from a list of transactions.
    
    Args:
        transactions: List of categorized transactions to analyze
        min_occurrences: Minimum number of occurrences to consider recurring
        
    Returns:
        RecurringExpensesResult with detected recurring expenses
    """
    logger.info(f"Analyzing {len(transactions)} transactions for recurring expenses")
    
    # Group transactions by normalized merchant
    merchant_groups: dict[str, list[CategorizedTransaction]] = defaultdict(list)
    
    for txn in transactions:
        # Only analyze expenses (negative amounts)
        if txn.amount >= 0:
            continue
            
        merchant = normalize_merchant(txn.description)
        merchant_groups[merchant].append(txn)
    
    recurring_expenses: list[RecurringExpense] = []
    
    for merchant, txns in merchant_groups.items():
        # Need at least min_occurrences to be considered recurring
        if len(txns) < min_occurrences:
            continue
        
        # Get dates and amounts
        dates = [txn.date for txn in txns]
        amounts = [abs(txn.amount) for txn in txns]
        
        # Calculate intervals
        intervals = calculate_intervals(dates)
        
        if not intervals:
            continue
        
        # Detect frequency
        frequency_result = detect_frequency(intervals)
        
        if not frequency_result:
            continue
            
        frequency, base_confidence = frequency_result
        
        # Check amount consistency (should be similar amounts)
        avg_amount = sum(amounts) / len(amounts)
        amount_variance = sum((a - avg_amount) ** 2 for a in amounts) / len(amounts)
        amount_std_dev = amount_variance ** 0.5
        amount_consistency = max(0, 1 - (amount_std_dev / avg_amount)) if avg_amount > 0 else 0
        
        # Combine confidence factors
        confidence = base_confidence * 0.6 + amount_consistency * 0.3
        
        # Boost for subscription keywords
        original_desc = txns[0].description
        if has_subscription_keyword(original_desc):
            confidence = min(1.0, confidence + 0.1)
        
        # Skip low confidence detections
        if confidence < 0.5:
            continue
        
        # Calculate next expected date
        sorted_dates = sorted(dates, reverse=True)
        last_charge = sorted_dates[0]
        typical_interval = FREQUENCY_PATTERNS[frequency]["typical"]
        next_expected = last_charge + timedelta(days=typical_interval)
        
        # Get most common category
        category_counts: dict[SpendingCategory, int] = defaultdict(int)
        for txn in txns:
            category_counts[txn.category] += 1
        most_common_category = max(category_counts, key=lambda k: category_counts[k])
        
        recurring_expenses.append(RecurringExpense(
            merchant=merchant,
            amount=round(avg_amount, 2),
            frequency=frequency,
            category=most_common_category,
            last_charge=last_charge,
            next_expected=next_expected,
            occurrences=len(txns),
            confidence=round(confidence, 2)
        ))
    
    # Sort by monthly cost (highest first)
    recurring_expenses.sort(
        key=lambda x: calculate_monthly_amount(x.amount, x.frequency), 
        reverse=True
    )
    
    # Calculate total monthly cost
    monthly_total = sum(
        calculate_monthly_amount(exp.amount, exp.frequency) 
        for exp in recurring_expenses
    )
    
    logger.info(f"Detected {len(recurring_expenses)} recurring expenses, monthly total: ${monthly_total:.2f}")
    
    return RecurringExpensesResult(
        success=True,
        recurring_expenses=recurring_expenses,
        monthly_total=round(monthly_total, 2),
        total_detected=len(recurring_expenses)
    )
