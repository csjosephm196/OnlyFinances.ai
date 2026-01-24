"""Layer 1: Balance Sheet File Processing Service.

This service handles parsing and extraction of balance sheet data from 
uploaded CSV files.

Key responsibilities:
- Parse CSV files from various accounting formats
- Extract balance sheet items (name, type, value)
- Integrate with AI categorizer for asset/liability classification
- Calculate summary statistics and equity
"""

import csv
import io
import logging
from collections import defaultdict
from datetime import date

from .models import (
    BalanceSheetItem,
    BalanceSheetData,
    AssetsSummary,
    LiabilitiesSummary,
    AssetCategory,
    LiabilityCategory,
)
from .balance_sheet_categorizer import (
    categorize_balance_sheet_items,
    RawBalanceSheetItem,
)

logger = logging.getLogger(__name__)

# Common column name mappings for balance sheet formats
NAME_COLUMNS = [
    "account name", "name", "item name", "account", "description",
    "item", "line item", "account description"
]
TYPE_COLUMNS = [
    "type", "account type", "category", "classification", "class"
]
VALUE_COLUMNS = [
    "balance", "amount", "value", "total", "debit", "credit"
]


async def process_balance_sheet(file_content: bytes, file_type: str) -> BalanceSheetData:
    """
    Process uploaded balance sheet CSV and extract categorized data.
    
    Args:
        file_content: Raw bytes of the uploaded CSV file
        file_type: MIME type (expected: text/csv)
        
    Returns:
        BalanceSheetData with categorized items and summaries
        
    Raises:
        ValueError: If CSV cannot be parsed or is empty
    """
    # 1. Parse CSV to extract raw items
    raw_items = await parse_balance_sheet_csv(file_content)
    
    if not raw_items:
        raise ValueError("No valid balance sheet items found in CSV file")
    
    logger.info(f"Parsed {len(raw_items)} items from balance sheet CSV")
    
    # 2. Categorize items with AI
    categorized = await categorize_balance_sheet_items(raw_items)
    
    logger.info(f"Categorized {len(categorized)} balance sheet items")
    
    # 3. Calculate summaries
    assets_summary = _calculate_assets_summary(categorized)
    liabilities_summary = _calculate_liabilities_summary(categorized)
    equity = assets_summary.total - liabilities_summary.total
    
    return BalanceSheetData(
        success=True,
        date=date.today().isoformat(),
        total_items=len(categorized),
        items=categorized,
        assets=assets_summary,
        liabilities=liabilities_summary,
        equity=equity
    )


async def parse_balance_sheet_csv(file_content: bytes) -> list[RawBalanceSheetItem]:
    """
    Parse balance sheet CSV file and extract item data.
    
    Handles common accounting CSV formats by detecting column names.
    Supports various encodings.
    
    Args:
        file_content: Raw bytes of the CSV file
        
    Returns:
        List of RawBalanceSheetItem objects
        
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
    
    name_col = _find_matching_column(normalized_fields, NAME_COLUMNS)
    type_col = _find_matching_column(normalized_fields, TYPE_COLUMNS)
    value_col = _find_matching_column(normalized_fields, VALUE_COLUMNS)
    
    # Check for separate debit/credit columns
    debit_col = _find_matching_column(normalized_fields, ["debit"])
    credit_col = _find_matching_column(normalized_fields, ["credit"])
    
    if not name_col:
        raise ValueError(f"Could not find name/account column. Available columns: {list(reader.fieldnames)}")
    if not value_col and not (debit_col or credit_col):
        raise ValueError(f"Could not find value/balance column. Available columns: {list(reader.fieldnames)}")
    
    logger.info(f"Detected columns - Name: {name_col}, Type: {type_col}, Value: {value_col}")
    
    items = []
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            # Parse name
            name = row.get(name_col, "").strip()
            if not name:
                continue
            
            # Parse type hint (optional)
            type_hint = row.get(type_col, "").strip() if type_col else None
            
            # Parse value
            if value_col:
                value = _parse_amount(row.get(value_col, "0"))
            else:
                # Handle separate debit/credit columns
                debit = _parse_amount(row.get(debit_col, "0")) if debit_col else 0
                credit = _parse_amount(row.get(credit_col, "0")) if credit_col else 0
                value = debit if debit > 0 else credit
            
            if value == 0:
                continue  # Skip zero-value items
            
            # Ensure value is positive for balance sheet
            value = abs(value)
            
            items.append(RawBalanceSheetItem(
                name=name,
                value=value,
                type_hint=type_hint
            ))
            
        except Exception as e:
            logger.warning(f"Row {row_num}: Error parsing row - {e}")
            continue
    
    return items


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


def _calculate_assets_summary(items: list[BalanceSheetItem]) -> AssetsSummary:
    """Calculate summary of all asset items."""
    asset_items = [item for item in items if item.type == "asset"]
    
    by_category: dict[str, float] = {}
    # Initialize all asset categories to 0
    for cat in AssetCategory:
        by_category[cat.value] = 0.0
    
    # Sum up by category
    for item in asset_items:
        by_category[item.category] = by_category.get(item.category, 0) + item.value
    
    total = sum(item.value for item in asset_items)
    
    return AssetsSummary(
        items=asset_items,
        total=total,
        by_category=by_category
    )


def _calculate_liabilities_summary(items: list[BalanceSheetItem]) -> LiabilitiesSummary:
    """Calculate summary of all liability items."""
    liability_items = [item for item in items if item.type == "liability"]
    
    by_category: dict[str, float] = {}
    # Initialize all liability categories to 0
    for cat in LiabilityCategory:
        by_category[cat.value] = 0.0
    
    # Sum up by category
    for item in liability_items:
        by_category[item.category] = by_category.get(item.category, 0) + item.value
    
    total = sum(item.value for item in liability_items)
    
    return LiabilitiesSummary(
        items=liability_items,
        total=total,
        by_category=by_category
    )
