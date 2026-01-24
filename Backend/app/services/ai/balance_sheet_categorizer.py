"""AI-powered balance sheet item categorization using Google Gemini.

This module provides intelligent categorization of balance sheet line items
into asset/liability categories using the Gemini API.
"""

import json
import logging
from typing import Any

import google.generativeai as genai

from app.core.config import get_settings
from .models import (
    AssetCategory,
    LiabilityCategory,
    BalanceSheetItem,
)

logger = logging.getLogger(__name__)

# Prompt template for Gemini categorization
BALANCE_SHEET_PROMPT = """You are a financial statement analyzer. Analyze each balance sheet item and classify it as an asset or liability with a specific category.

ASSET CATEGORIES:
- cash: Bank accounts, petty cash, cash equivalents, money market, checking, savings
- accounts_receivable: Customer invoices, outstanding payments, trade receivables, A/R
- inventory: Products for sale, raw materials, work-in-progress, finished goods
- prepaid_expenses: Prepaid insurance, prepaid rent, advance payments, deposits
- equipment: Office equipment, machinery, tools, computers, furniture, vehicles
- property: Real estate, buildings, land, leasehold improvements
- investments: Stocks, bonds, long-term investments, securities, mutual funds
- intangible_assets: Patents, trademarks, goodwill, software licenses, copyrights
- other_assets: ONLY use if nothing else fits

LIABILITY CATEGORIES:
- accounts_payable: Vendor invoices, bills to pay, trade payables, A/P
- credit_cards: Credit card balances, corporate cards, Visa, Mastercard, Amex
- short_term_debt: Lines of credit, short-term loans (< 1 year), notes payable
- accrued_expenses: Unpaid wages, utilities due, accrued interest
- taxes_payable: Income tax, sales tax, payroll tax, tax liabilities
- long_term_debt: Mortgages, business loans (> 1 year), bond payable
- deferred_revenue: Customer prepayments, unearned revenue
- other_liabilities: ONLY use if nothing else fits

CLASSIFICATION RULES:
1. First determine if the item is an Asset or Liability:
   - Assets: Things the company OWNS or is OWED
   - Liabilities: Things the company OWES to others
   
2. Keywords that indicate ASSETS:
   - "receivable", "prepaid", "cash", "bank", "equipment", "property", "investment"
   
3. Keywords that indicate LIABILITIES:
   - "payable", "debt", "loan", "credit", "accrued", "deferred", "mortgage"

For each item, respond with a JSON object containing:
- "type": either "asset" or "liability"
- "category": exactly one of the category names listed above (lowercase with underscores)
- "confidence": a number between 0.0 and 1.0 indicating how confident you are

IMPORTANT: 
- Respond ONLY with a JSON array, no other text
- Each element corresponds to an item in order
- Use lowercase category names exactly as shown
- Only use "other_assets" or "other_liabilities" as an absolute last resort

Balance sheet items to classify:
{items}

Respond with a JSON array:"""


# Keyword mappings for fallback categorization
ASSET_KEYWORDS: dict[str, AssetCategory] = {
    # Cash
    "cash": AssetCategory.CASH,
    "bank": AssetCategory.CASH,
    "checking": AssetCategory.CASH,
    "savings": AssetCategory.CASH,
    "money market": AssetCategory.CASH,
    "petty cash": AssetCategory.CASH,
    "cash equivalent": AssetCategory.CASH,
    
    # Accounts Receivable
    "receivable": AssetCategory.ACCOUNTS_RECEIVABLE,
    "a/r": AssetCategory.ACCOUNTS_RECEIVABLE,
    "ar": AssetCategory.ACCOUNTS_RECEIVABLE,
    "customer": AssetCategory.ACCOUNTS_RECEIVABLE,
    "outstanding": AssetCategory.ACCOUNTS_RECEIVABLE,
    "trade receivable": AssetCategory.ACCOUNTS_RECEIVABLE,
    
    # Inventory
    "inventory": AssetCategory.INVENTORY,
    "stock": AssetCategory.INVENTORY,
    "merchandise": AssetCategory.INVENTORY,
    "raw material": AssetCategory.INVENTORY,
    "finished goods": AssetCategory.INVENTORY,
    "wip": AssetCategory.INVENTORY,
    
    # Prepaid Expenses
    "prepaid": AssetCategory.PREPAID_EXPENSES,
    "advance": AssetCategory.PREPAID_EXPENSES,
    "deposit": AssetCategory.PREPAID_EXPENSES,
    "prepayment": AssetCategory.PREPAID_EXPENSES,
    
    # Equipment
    "equipment": AssetCategory.EQUIPMENT,
    "machinery": AssetCategory.EQUIPMENT,
    "tools": AssetCategory.EQUIPMENT,
    "computer": AssetCategory.EQUIPMENT,
    "furniture": AssetCategory.EQUIPMENT,
    "vehicle": AssetCategory.EQUIPMENT,
    "office equipment": AssetCategory.EQUIPMENT,
    
    # Property
    "property": AssetCategory.PROPERTY,
    "building": AssetCategory.PROPERTY,
    "land": AssetCategory.PROPERTY,
    "real estate": AssetCategory.PROPERTY,
    "leasehold": AssetCategory.PROPERTY,
    
    # Investments
    "investment": AssetCategory.INVESTMENTS,
    "securities": AssetCategory.INVESTMENTS,
    "mutual fund": AssetCategory.INVESTMENTS,
    "bond": AssetCategory.INVESTMENTS,
    
    # Intangible Assets
    "patent": AssetCategory.INTANGIBLE_ASSETS,
    "trademark": AssetCategory.INTANGIBLE_ASSETS,
    "goodwill": AssetCategory.INTANGIBLE_ASSETS,
    "software": AssetCategory.INTANGIBLE_ASSETS,
    "license": AssetCategory.INTANGIBLE_ASSETS,
    "copyright": AssetCategory.INTANGIBLE_ASSETS,
}

LIABILITY_KEYWORDS: dict[str, LiabilityCategory] = {
    # Accounts Payable
    "payable": LiabilityCategory.ACCOUNTS_PAYABLE,
    "a/p": LiabilityCategory.ACCOUNTS_PAYABLE,
    "ap": LiabilityCategory.ACCOUNTS_PAYABLE,
    "vendor": LiabilityCategory.ACCOUNTS_PAYABLE,
    "bill": LiabilityCategory.ACCOUNTS_PAYABLE,
    "supplier": LiabilityCategory.ACCOUNTS_PAYABLE,
    "trade payable": LiabilityCategory.ACCOUNTS_PAYABLE,
    
    # Credit Cards
    "credit card": LiabilityCategory.CREDIT_CARDS,
    "visa": LiabilityCategory.CREDIT_CARDS,
    "mastercard": LiabilityCategory.CREDIT_CARDS,
    "amex": LiabilityCategory.CREDIT_CARDS,
    "corporate card": LiabilityCategory.CREDIT_CARDS,
    
    # Short-term Debt
    "line of credit": LiabilityCategory.SHORT_TERM_DEBT,
    "short term loan": LiabilityCategory.SHORT_TERM_DEBT,
    "note payable": LiabilityCategory.SHORT_TERM_DEBT,
    "current debt": LiabilityCategory.SHORT_TERM_DEBT,
    
    # Accrued Expenses
    "accrued": LiabilityCategory.ACCRUED_EXPENSES,
    "accrual": LiabilityCategory.ACCRUED_EXPENSES,
    "unpaid wages": LiabilityCategory.ACCRUED_EXPENSES,
    "interest payable": LiabilityCategory.ACCRUED_EXPENSES,
    
    # Taxes Payable
    "tax": LiabilityCategory.TAXES_PAYABLE,
    "irs": LiabilityCategory.TAXES_PAYABLE,
    "income tax": LiabilityCategory.TAXES_PAYABLE,
    "sales tax": LiabilityCategory.TAXES_PAYABLE,
    "payroll tax": LiabilityCategory.TAXES_PAYABLE,
    "tax liability": LiabilityCategory.TAXES_PAYABLE,
    
    # Long-term Debt
    "mortgage": LiabilityCategory.LONG_TERM_DEBT,
    "loan": LiabilityCategory.LONG_TERM_DEBT,
    "long term": LiabilityCategory.LONG_TERM_DEBT,
    "bond payable": LiabilityCategory.LONG_TERM_DEBT,
    
    # Deferred Revenue
    "deferred": LiabilityCategory.DEFERRED_REVENUE,
    "unearned": LiabilityCategory.DEFERRED_REVENUE,
    "prepaid by customer": LiabilityCategory.DEFERRED_REVENUE,
    "advance payment": LiabilityCategory.DEFERRED_REVENUE,
}


class RawBalanceSheetItem:
    """Raw balance sheet item extracted from CSV before classification."""
    def __init__(self, name: str, value: float, type_hint: str | None = None):
        self.name = name
        self.value = value
        self.type_hint = type_hint  # Optional hint from CSV (e.g., "Asset" or "Liability")


async def categorize_balance_sheet_items(
    items: list[RawBalanceSheetItem]
) -> list[BalanceSheetItem]:
    """
    Categorize a list of balance sheet items using Gemini AI.
    
    Args:
        items: List of RawBalanceSheetItem objects to categorize
        
    Returns:
        List of BalanceSheetItem objects with AI-assigned categories
        
    Raises:
        ValueError: If Gemini API returns invalid response
        Exception: For API connection or other errors
    """
    from app.core.key_rotation import execute_with_rotation, get_key_manager
    
    if not items:
        return []
    
    key_manager = get_key_manager()
    
    if not key_manager.has_keys:
        logger.warning("No Gemini API keys configured, using fallback categorization")
        return _fallback_categorization(items)
    
    async def _categorize_with_ai() -> list[BalanceSheetItem]:
        """Execute the AI categorization."""
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        formatted_items = "\n".join([
            f"{i+1}. Name: \"{item.name}\", Value: ${item.value:.2f}" +
            (f", Type Hint: {item.type_hint}" if item.type_hint else "")
            for i, item in enumerate(items)
        ])
        
        prompt = BALANCE_SHEET_PROMPT.format(items=formatted_items)
        
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        
        response_text = response.text.strip()
        logger.debug(f"Gemini response: {response_text}")
        
        categorizations = json.loads(response_text)
        
        if not isinstance(categorizations, list):
            raise ValueError("Expected JSON array response from Gemini")
        
        if len(categorizations) != len(items):
            logger.warning(
                f"Mismatch: got {len(categorizations)} categories for {len(items)} items"
            )
        
        categorized = []
        for item, cat_data in zip(items, categorizations):
            item_type = cat_data.get("type", "asset").lower()
            category = cat_data.get("category", "other_assets")
            confidence = _validate_confidence(cat_data.get("confidence", 0.8))
            
            if item_type == "liability":
                category = _validate_liability_category(category)
            else:
                item_type = "asset"
                category = _validate_asset_category(category)
            
            categorized.append(BalanceSheetItem(
                name=item.name,
                type=item_type,
                category=category,
                value=item.value,
                confidence=confidence
            ))
        
        return categorized
    
    try:
        return await execute_with_rotation(
            _categorize_with_ai,
            fallback=lambda: _fallback_categorization(items),
            operation_name="balance sheet categorization"
        )
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        return _fallback_categorization(items)
    except Exception as e:
        logger.error(f"Gemini categorization failed: {e}")
        raise


def _validate_asset_category(category: str) -> str:
    """Validate and normalize asset category string."""
    try:
        return AssetCategory(category.lower().strip()).value
    except ValueError:
        logger.warning(f"Unknown asset category '{category}', defaulting to other_assets")
        return AssetCategory.OTHER_ASSETS.value


def _validate_liability_category(category: str) -> str:
    """Validate and normalize liability category string."""
    try:
        return LiabilityCategory(category.lower().strip()).value
    except ValueError:
        logger.warning(f"Unknown liability category '{category}', defaulting to other_liabilities")
        return LiabilityCategory.OTHER_LIABILITIES.value


def _validate_confidence(confidence: Any) -> float:
    """Validate and normalize confidence score."""
    try:
        conf = float(confidence)
        return max(0.0, min(1.0, conf))
    except (ValueError, TypeError):
        return 0.8  # Default confidence


def _fallback_categorization(
    items: list[RawBalanceSheetItem]
) -> list[BalanceSheetItem]:
    """
    Simple rule-based categorization fallback when AI is unavailable.
    
    Uses keyword matching for basic categorization.
    """
    categorized = []
    
    for item in items:
        name_lower = item.name.lower()
        type_hint_lower = (item.type_hint or "").lower()
        
        # First, try to determine type from hint
        is_liability = "liability" in type_hint_lower or "liabilities" in type_hint_lower
        is_asset = "asset" in type_hint_lower or "assets" in type_hint_lower
        
        # If no hint, use keyword matching
        if not is_liability and not is_asset:
            # Check for liability keywords first (more specific)
            for keyword in LIABILITY_KEYWORDS:
                if keyword in name_lower:
                    is_liability = True
                    break
            
            # Default to asset if not clearly a liability
            if not is_liability:
                is_asset = True
        
        # Categorize based on type
        if is_liability:
            category = LiabilityCategory.OTHER_LIABILITIES.value
            for keyword, cat in LIABILITY_KEYWORDS.items():
                if keyword in name_lower:
                    category = cat.value
                    break
            
            categorized.append(BalanceSheetItem(
                name=item.name,
                type="liability",
                category=category,
                value=item.value,
                confidence=0.6 if category != LiabilityCategory.OTHER_LIABILITIES.value else 0.3
            ))
        else:
            category = AssetCategory.OTHER_ASSETS.value
            for keyword, cat in ASSET_KEYWORDS.items():
                if keyword in name_lower:
                    category = cat.value
                    break
            
            categorized.append(BalanceSheetItem(
                name=item.name,
                type="asset",
                category=category,
                value=item.value,
                confidence=0.6 if category != AssetCategory.OTHER_ASSETS.value else 0.3
            ))
    
    return categorized
