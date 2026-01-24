"""Layer 1: File/Document Processing Service.

This service handles parsing and extraction of financial data from 
uploaded documents (bank statements CSV files).

Key responsibilities:
- Parse CSV files from various bank formats
- Extract transaction data (date, description, amount)
- Integrate with AI categorizer for spending classification
- Generate summary statistics for frontend visualization
"""

import csv
import io
import logging
from collections import defaultdict
from datetime import datetime, date
from typing import Any

from .models import (
    Transaction,
    CategorizedTransaction,
    ProcessingResult,
    DateRange,
    SpendingCategory,
)
from .categorizer import categorize_transactions

logger = logging.getLogger(__name__)

# Common column name mappings for different bank formats
DATE_COLUMNS = [
    "date", "trans date", "transaction date", "posted date", 
    "posting date", "trans. date", "value date"
]
DESCRIPTION_COLUMNS = [
    "description", "memo", "transaction", "details", "narrative",
    "trans. description", "payee", "name", "merchant"
]
AMOUNT_COLUMNS = [
    "amount", "debit", "credit", "withdrawal", "deposit",
    "transaction amount", "trans. amount", "value"
]

# Common date formats used by banks
DATE_FORMATS = [
    "%Y-%m-%d",      # 2026-01-15
    "%m/%d/%Y",      # 01/15/2026
    "%m/%d/%y",      # 01/15/26
    "%d/%m/%Y",      # 15/01/2026
    "%m-%d-%Y",      # 01-15-2026
    "%Y/%m/%d",      # 2026/01/15
    "%b %d, %Y",     # Jan 15, 2026
    "%B %d, %Y",     # January 15, 2026
    "%d %b %Y",      # 15 Jan 2026
]


async def process_file(file_content: bytes, file_type: str) -> ProcessingResult:
    """
    Process uploaded financial CSV and extract categorized data.
    
    Args:
        file_content: Raw bytes of the uploaded CSV file
        file_type: MIME type (expected: text/csv)
        
    Returns:
        ProcessingResult with categorized transactions and summaries
        
    Raises:
        ValueError: If CSV cannot be parsed or is empty
    """
    # 1. Parse CSV to extract raw transactions
    raw_transactions = await parse_csv(file_content)
    
    if not raw_transactions:
        raise ValueError("No valid transactions found in CSV file")
    
    logger.info(f"Parsed {len(raw_transactions)} transactions from CSV")
    
    # 2. Categorize transactions with AI
    categorized = await categorize_transactions(raw_transactions)
    
    logger.info(f"Categorized {len(categorized)} transactions")
    
    # 3. Calculate summaries
    summary = _calculate_summary(categorized)
    monthly_breakdown = _calculate_monthly_breakdown(categorized)
    date_range = _get_date_range(categorized)
    
    return ProcessingResult(
        success=True,
        total_transactions=len(categorized),
        date_range=date_range,
        transactions=categorized,
        summary=summary,
        monthly_breakdown=monthly_breakdown
    )


async def parse_csv(file_content: bytes) -> list[Transaction]:
    """
    Parse bank CSV file and extract transaction data.
    
    Handles common bank CSV formats by detecting column names.
    Supports various encodings and date formats.
    
    Args:
        file_content: Raw bytes of the CSV file
        
    Returns:
        List of Transaction objects
        
    Raises:
        ValueError: If CSV format is unrecognized or cannot be parsed
    """
    # Try different encodings
    text_content = None
    for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
        try:
            text_content = file_content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    
    if text_content is None:
        raise ValueError("Unable to decode CSV file - unsupported encoding")
    
    # Parse CSV
    reader = csv.DictReader(io.StringIO(text_content))
    
    if not reader.fieldnames:
        raise ValueError("CSV file appears to be empty or has no headers")
    
    # Normalize column names and find mappings
    normalized_fields = {field.lower().strip(): field for field in reader.fieldnames}
    
    date_col = _find_matching_column(normalized_fields, DATE_COLUMNS)
    desc_col = _find_matching_column(normalized_fields, DESCRIPTION_COLUMNS)
    amount_col = _find_matching_column(normalized_fields, AMOUNT_COLUMNS)
    
    # Check for separate debit/credit columns
    debit_col = _find_matching_column(normalized_fields, ["debit", "withdrawal", "money out"])
    credit_col = _find_matching_column(normalized_fields, ["credit", "deposit", "money in"])
    
    if not date_col:
        raise ValueError(f"Could not find date column. Available columns: {list(reader.fieldnames)}")
    if not desc_col:
        raise ValueError(f"Could not find description column. Available columns: {list(reader.fieldnames)}")
    if not amount_col and not (debit_col or credit_col):
        raise ValueError(f"Could not find amount column. Available columns: {list(reader.fieldnames)}")
    
    logger.info(f"Detected columns - Date: {date_col}, Description: {desc_col}, Amount: {amount_col}")
    
    transactions = []
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            # Parse date
            date_str = row.get(date_col, "").strip()
            if not date_str:
                continue
            
            parsed_date = _parse_date(date_str)
            if not parsed_date:
                logger.warning(f"Row {row_num}: Unable to parse date '{date_str}'")
                continue
            
            # Parse description
            description = row.get(desc_col, "").strip()
            if not description:
                continue
            
            # Parse amount
            if amount_col:
                amount = _parse_amount(row.get(amount_col, "0"))
            else:
                # Handle separate debit/credit columns
                debit = _parse_amount(row.get(debit_col, "0")) if debit_col else 0
                credit = _parse_amount(row.get(credit_col, "0")) if credit_col else 0
                amount = credit - debit  # Debits are expenses (negative)
            
            if amount == 0:
                continue  # Skip zero-amount transactions
            
            transactions.append(Transaction(
                date=parsed_date,
                description=description,
                amount=amount
            ))
            
        except Exception as e:
            logger.warning(f"Row {row_num}: Error parsing row - {e}")
            continue
    
    return transactions


def _find_matching_column(
    normalized_fields: dict[str, str], 
    candidates: list[str]
) -> str | None:
    """Find the first matching column name from candidates."""
    for candidate in candidates:
        if candidate in normalized_fields:
            return normalized_fields[candidate]
    return None


def _parse_date(date_str: str) -> date | None:
    """Parse date string using various common formats."""
    date_str = date_str.strip()
    
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    return None


def _parse_amount(amount_str: str) -> float:
    """Parse amount string, handling various formats."""
    if not amount_str:
        return 0.0
    
    # Remove common formatting
    cleaned = amount_str.strip()
    cleaned = cleaned.replace("$", "").replace(",", "").replace(" ", "")
    
    # Handle parentheses as negative (accounting format)
    if cleaned.startswith("(") and cleaned.endswith(")"):
        cleaned = "-" + cleaned[1:-1]
    
    # Handle CR/DR suffixes
    if cleaned.upper().endswith("CR"):
        cleaned = cleaned[:-2]
    elif cleaned.upper().endswith("DR"):
        cleaned = "-" + cleaned[:-2]
    
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _calculate_summary(
    transactions: list[CategorizedTransaction]
) -> dict[str, float]:
    """Calculate total spending by category."""
    summary: dict[str, float] = defaultdict(float)
    
    for txn in transactions:
        # Only count expenses (negative amounts)
        if txn.amount < 0:
            summary[txn.category.value] += abs(txn.amount)
    
    return dict(summary)


def _calculate_monthly_breakdown(
    transactions: list[CategorizedTransaction]
) -> dict[str, dict[str, float]]:
    """Calculate spending by category for each month."""
    monthly: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    
    for txn in transactions:
        if txn.amount < 0:  # Only count expenses
            month_key = txn.date.strftime("%Y-%m")
            monthly[month_key][txn.category.value] += abs(txn.amount)
    
    # Convert nested defaultdicts to regular dicts
    return {month: dict(categories) for month, categories in sorted(monthly.items())}


def _get_date_range(transactions: list[CategorizedTransaction]) -> DateRange:
    """Get the date range of transactions."""
    if not transactions:
        today = date.today()
        return DateRange(start=today, end=today)
    
    dates = [txn.date for txn in transactions]
    return DateRange(start=min(dates), end=max(dates))
