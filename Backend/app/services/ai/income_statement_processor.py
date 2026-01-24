"""Layer 1: Income Statement File Processing Service.

This service handles parsing and extraction of income statement data from 
uploaded CSV files.

Key responsibilities:
- Parse CSV files from various accounting formats
- Extract income statement items (description, type, amount)
- Integrate with AI categorizer for revenue/expense classification
- Calculate summary statistics, gross profit, and net income
"""

import csv
import io
import logging
from collections import defaultdict
from datetime import date, timedelta

from .models import (
    IncomeStatementItem,
    IncomeStatementData,
    RevenuesSummary,
    ExpensesSummary,
    Period,
    RevenueCategory,
    ExpenseCategory,
)
from .income_statement_categorizer import (
    categorize_income_statement_items,
    RawIncomeStatementItem,
)

logger = logging.getLogger(__name__)

# Common column name mappings for income statement formats
DESCRIPTION_COLUMNS = [
    "description", "line item", "item", "account", "name",
    "account name", "category", "details"
]
TYPE_COLUMNS = [
    "type", "account type", "classification", "class", "category"
]
AMOUNT_COLUMNS = [
    "amount", "value", "total", "balance", "debit", "credit"
]


async def process_income_statement(file_content: bytes, file_type: str) -> IncomeStatementData:
    """
    Process uploaded income statement CSV and extract categorized data.
    
    Args:
        file_content: Raw bytes of the uploaded CSV file
        file_type: MIME type (expected: text/csv)
        
    Returns:
        IncomeStatementData with categorized items and summaries
        
    Raises:
        ValueError: If CSV cannot be parsed or is empty
    """
    # 1. Parse CSV to extract raw items
    raw_items = await parse_income_statement_csv(file_content)
    
    if not raw_items:
        raise ValueError("No valid income statement items found in CSV file")
    
    logger.info(f"Parsed {len(raw_items)} items from income statement CSV")
    
    # 2. Categorize items with AI
    categorized = await categorize_income_statement_items(raw_items)
    
    logger.info(f"Categorized {len(categorized)} income statement items")
    
    # 3. Calculate summaries
    revenues_summary = _calculate_revenues_summary(categorized)
    expenses_summary = _calculate_expenses_summary(categorized)
    
    # Calculate gross profit (Revenue - COGS)
    cogs = expenses_summary.by_category.get(ExpenseCategory.COST_OF_GOODS_SOLD.value, 0)
    gross_profit = revenues_summary.total - cogs
    
    # Calculate net income (Total Revenue - Total Expenses)
    net_income = revenues_summary.total - expenses_summary.total
    
    # Create period (default to current year)
    today = date.today()
    period = Period(
        start=date(today.year, 1, 1).isoformat(),
        end=today.isoformat()
    )
    
    return IncomeStatementData(
        success=True,
        period=period,
        total_items=len(categorized),
        items=categorized,
        revenues=revenues_summary,
        expenses=expenses_summary,
        gross_profit=gross_profit,
        net_income=net_income
    )


async def parse_income_statement_csv(file_content: bytes) -> list[RawIncomeStatementItem]:
    """
    Parse income statement CSV file and extract item data.
    
    Handles common accounting CSV formats by detecting column names.
    Supports various encodings.
    
    Args:
        file_content: Raw bytes of the CSV file
        
    Returns:
        List of RawIncomeStatementItem objects
        
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
    
    desc_col = _find_matching_column(normalized_fields, DESCRIPTION_COLUMNS)
    type_col = _find_matching_column(normalized_fields, TYPE_COLUMNS)
    amount_col = _find_matching_column(normalized_fields, AMOUNT_COLUMNS)
    
    # Check for separate debit/credit columns
    debit_col = _find_matching_column(normalized_fields, ["debit"])
    credit_col = _find_matching_column(normalized_fields, ["credit"])
    
    if not desc_col:
        raise ValueError(f"Could not find description column. Available columns: {list(reader.fieldnames)}")
    if not amount_col and not (debit_col or credit_col):
        raise ValueError(f"Could not find amount column. Available columns: {list(reader.fieldnames)}")
    
    logger.info(f"Detected columns - Description: {desc_col}, Type: {type_col}, Amount: {amount_col}")
    
    items = []
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            # Parse description
            description = row.get(desc_col, "").strip()
            if not description:
                continue
            
            # Skip summary/total rows - these are calculated, not individual items
            desc_lower = description.lower()
            if _is_summary_row(desc_lower, row, type_col):
                logger.debug(f"Row {row_num}: Skipping summary row '{description}'")
                continue
            
            # Parse type hint (optional)
            type_hint = row.get(type_col, "").strip() if type_col else None
            
            # Parse amount
            if amount_col:
                amount = _parse_amount(row.get(amount_col, "0"))
            else:
                # Handle separate debit/credit columns
                debit = _parse_amount(row.get(debit_col, "0")) if debit_col else 0
                credit = _parse_amount(row.get(credit_col, "0")) if credit_col else 0
                amount = credit if credit > 0 else debit
            
            if amount == 0:
                continue  # Skip zero-amount items
            
            # Ensure amount is positive for income statement
            amount = abs(amount)
            
            items.append(RawIncomeStatementItem(
                description=description,
                amount=amount,
                type_hint=type_hint
            ))
            
        except Exception as e:
            logger.warning(f"Row {row_num}: Error parsing row - {e}")
            continue
    
    return items


def _is_summary_row(desc_lower: str, row: dict, type_col: str | None) -> bool:
    """
    Check if a row is a summary/total row that should be skipped.
    
    Summary rows typically include:
    - Rows starting with "Total" (Total Income, Total Expenses, etc.)
    - Rows containing "Net Income" or "Net Profit"
    - Rows with "Summary" in the type/category field
    - Grand total rows
    """
    # Check description for summary indicators
    summary_keywords = [
        "total income",
        "total expense",
        "total revenue",
        "net income",
        "net profit",
        "net loss",
        "grand total",
        "subtotal",
        "gross profit",
        "operating income",
    ]
    
    # Check if starts with "total"
    if desc_lower.startswith("total"):
        return True
    
    # Check for specific summary keywords
    for keyword in summary_keywords:
        if keyword in desc_lower:
            return True
    
    # Check type field for summary indicator
    if type_col:
        type_value = row.get(type_col, "").lower().strip()
        if type_value in ["summary", "total", "subtotal", ""]:
            # Empty type with total-like name is a summary
            if type_value == "" and desc_lower.startswith("total"):
                return True
            if type_value in ["summary", "total", "subtotal"]:
                return True
    
    return False


def _find_matching_column(
    normalized_fields: dict[str, str], 
    candidates: list[str]
) -> str | None:
    """Find the first matching column name from candidates."""
    for candidate in candidates:
        if candidate in normalized_fields:
            return normalized_fields[candidate]
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


def _calculate_revenues_summary(items: list[IncomeStatementItem]) -> RevenuesSummary:
    """Calculate summary of all revenue items."""
    revenue_items = [item for item in items if item.type == "revenue"]
    
    by_category: dict[str, float] = {}
    # Initialize all revenue categories to 0
    for cat in RevenueCategory:
        by_category[cat.value] = 0.0
    
    # Sum up by category
    for item in revenue_items:
        by_category[item.category] = by_category.get(item.category, 0) + item.amount
    
    total = sum(item.amount for item in revenue_items)
    
    return RevenuesSummary(
        items=revenue_items,
        total=total,
        by_category=by_category
    )


def _calculate_expenses_summary(items: list[IncomeStatementItem]) -> ExpensesSummary:
    """Calculate summary of all expense items."""
    expense_items = [item for item in items if item.type == "expense"]
    
    by_category: dict[str, float] = {}
    # Initialize all expense categories to 0
    for cat in ExpenseCategory:
        by_category[cat.value] = 0.0
    
    # Sum up by category
    for item in expense_items:
        by_category[item.category] = by_category.get(item.category, 0) + item.amount
    
    total = sum(item.amount for item in expense_items)
    
    return ExpensesSummary(
        items=expense_items,
        total=total,
        by_category=by_category
    )
