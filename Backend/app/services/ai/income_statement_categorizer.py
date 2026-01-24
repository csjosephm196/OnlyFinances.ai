"""AI-powered income statement item categorization using Google Gemini.

This module provides intelligent categorization of income statement line items
into revenue/expense categories using the Gemini API.
"""

import json
import logging
from typing import Any

import google.generativeai as genai

from app.core.config import get_settings
from .models import (
    RevenueCategory,
    ExpenseCategory,
    IncomeStatementItem,
)

logger = logging.getLogger(__name__)

# Prompt template for Gemini categorization
INCOME_STATEMENT_PROMPT = """You are a financial statement analyzer. Analyze each income statement item and classify it as revenue or expense with a specific category.

REVENUE CATEGORIES (use these exact lowercase names):
- wages_salary: PRIMARY INCOME - salary, wages, paycheck, pay, compensation, primary salary, job income, employment income, W2 income
- sales: Product sales, merchandise, goods sold, product revenue
- services: Consulting, professional services, freelance, contract work, service revenue, side hustle, gig work, side income
- interest_income: Bank interest, interest earned, interest received
- investment_income: Dividends, capital gains, investment returns, ROI, stock income
- rental_income: Property rental, equipment rental, lease income
- royalties: Licensing fees, intellectual property royalties
- other_revenue: ONLY use as absolute last resort when nothing else fits

EXPENSE CATEGORIES (use these exact lowercase names):
- rent: Rent, lease payments, housing, mortgage, facility costs, coworking, apartment
- utilities: Electric, gas, water, internet, phone, telecom, hydro, power bill, cell phone
- travel: Business travel, hotels, flights, meals, entertainment, dining, restaurants, coffee, uber, transport, fuel, gas station
- salaries_wages: Employee salaries, wages, payroll, compensation, bonus (payments TO employees)
- cost_of_goods_sold: COGS, direct product costs, materials, manufacturing costs
- marketing: Advertising, promotions, marketing services, ad spend, campaigns
- insurance: Business insurance, liability, health insurance, workers comp
- depreciation: Asset depreciation, amortization
- interest_expense: Loan interest, interest paid, credit card interest
- taxes: Income tax expense, tax provisions
- professional_fees: Legal, accounting, consulting fees, attorney, CPA
- office_supplies: Paper, pens, supplies, stationery, small equipment
- other_expenses: Groceries, shopping, subscriptions, gym, education, miscellaneous - use for items that don't fit other categories

CLASSIFICATION RULES:
1. First determine if the item is Revenue or Expense:
   - Revenue: Money coming IN (income, salary, earnings, dividends, sales)
   - Expense: Money going OUT (costs, fees, payments, purchases, bills)
   
2. Common mappings:
   - "Salary", "Pay", "Wages", "Primary Salary" as INCOME → wages_salary (revenue)
   - "Side Hustle", "Freelance", "Gig" → services (revenue)
   - "Dividend", "Investment" → investment_income (revenue)
   - "Housing", "Rent", "Mortgage" → rent (expense)
   - "Utilities", "Phone", "Internet", "Hydro" → utilities (expense)
   - "Dining", "Coffee", "Restaurant", "Transport", "Fuel" → travel (expense)
   - "Groceries", "Shopping", "Subscriptions", "Gym", "Education" → other_expenses (expense)

For each item, respond with a JSON object containing:
- "type": either "revenue" or "expense"
- "category": exactly one of the category names listed above (lowercase with underscores)
- "confidence": a number between 0.0 and 1.0 indicating how confident you are

IMPORTANT: 
- Respond ONLY with a JSON array, no other text
- Each element corresponds to an item in order
- Use lowercase category names exactly as shown
- Match categories as specifically as possible

Income statement items to classify:
{items}

Respond with a JSON array:"""


# Keyword mappings for fallback categorization
REVENUE_KEYWORDS: dict[str, RevenueCategory] = {
    # Wages & Salary (employment income - highest priority)
    "primary salary": RevenueCategory.WAGES_SALARY,
    "salary": RevenueCategory.WAGES_SALARY,
    "wage": RevenueCategory.WAGES_SALARY,
    "paycheck": RevenueCategory.WAGES_SALARY,
    "pay": RevenueCategory.WAGES_SALARY,
    "compensation": RevenueCategory.WAGES_SALARY,
    "employment": RevenueCategory.WAGES_SALARY,
    "job income": RevenueCategory.WAGES_SALARY,
    
    # Services (side income)
    "side hustle": RevenueCategory.SERVICES,
    "freelance": RevenueCategory.SERVICES,
    "gig": RevenueCategory.SERVICES,
    "service": RevenueCategory.SERVICES,
    "consulting": RevenueCategory.SERVICES,
    "professional service": RevenueCategory.SERVICES,
    "contract": RevenueCategory.SERVICES,
    
    # Sales
    "sales": RevenueCategory.SALES,
    "revenue": RevenueCategory.SALES,
    "product": RevenueCategory.SALES,
    "merchandise": RevenueCategory.SALES,
    "goods sold": RevenueCategory.SALES,
    
    # Interest Income
    "interest income": RevenueCategory.INTEREST_INCOME,
    "interest earned": RevenueCategory.INTEREST_INCOME,
    "bank interest": RevenueCategory.INTEREST_INCOME,
    
    # Investment Income
    "dividend": RevenueCategory.INVESTMENT_INCOME,
    "capital gain": RevenueCategory.INVESTMENT_INCOME,
    "investment": RevenueCategory.INVESTMENT_INCOME,
    "return on investment": RevenueCategory.INVESTMENT_INCOME,
    "stock": RevenueCategory.INVESTMENT_INCOME,
    
    # Rental Income
    "rental": RevenueCategory.RENTAL_INCOME,
    "lease income": RevenueCategory.RENTAL_INCOME,
    "property income": RevenueCategory.RENTAL_INCOME,
    
    # Royalties
    "royalty": RevenueCategory.ROYALTIES,
    "license fee": RevenueCategory.ROYALTIES,
    "intellectual property": RevenueCategory.ROYALTIES,
}

EXPENSE_KEYWORDS: dict[str, ExpenseCategory] = {
    # Rent & Housing (high priority for personal finance)
    "housing": ExpenseCategory.RENT,
    "rent": ExpenseCategory.RENT,
    "mortgage": ExpenseCategory.RENT,
    "lease": ExpenseCategory.RENT,
    "office space": ExpenseCategory.RENT,
    "facility": ExpenseCategory.RENT,
    "apartment": ExpenseCategory.RENT,
    
    # Utilities (high priority for personal finance)
    "utility": ExpenseCategory.UTILITIES,
    "utilities": ExpenseCategory.UTILITIES,
    "electric": ExpenseCategory.UTILITIES,
    "hydro": ExpenseCategory.UTILITIES,
    "power": ExpenseCategory.UTILITIES,
    "water": ExpenseCategory.UTILITIES,
    "internet": ExpenseCategory.UTILITIES,
    "phone": ExpenseCategory.UTILITIES,
    "telecom": ExpenseCategory.UTILITIES,
    "cell": ExpenseCategory.UTILITIES,
    
    # Travel & Dining (includes personal finance dining/transport)
    "travel": ExpenseCategory.TRAVEL,
    "hotel": ExpenseCategory.TRAVEL,
    "flight": ExpenseCategory.TRAVEL,
    "airfare": ExpenseCategory.TRAVEL,
    "dining": ExpenseCategory.TRAVEL,
    "restaurant": ExpenseCategory.TRAVEL,
    "coffee": ExpenseCategory.TRAVEL,
    "food": ExpenseCategory.TRAVEL,
    "transport": ExpenseCategory.TRAVEL,
    "fuel": ExpenseCategory.TRAVEL,
    "uber": ExpenseCategory.TRAVEL,
    "lyft": ExpenseCategory.TRAVEL,
    "taxi": ExpenseCategory.TRAVEL,
    "meal": ExpenseCategory.TRAVEL,
    "entertainment": ExpenseCategory.TRAVEL,
    
    # Other Expenses (groceries, subscriptions, misc)
    "groceries": ExpenseCategory.OTHER_EXPENSES,
    "grocery": ExpenseCategory.OTHER_EXPENSES,
    "shopping": ExpenseCategory.OTHER_EXPENSES,
    "subscription": ExpenseCategory.OTHER_EXPENSES,
    "gym": ExpenseCategory.OTHER_EXPENSES,
    "fitness": ExpenseCategory.OTHER_EXPENSES,
    "education": ExpenseCategory.OTHER_EXPENSES,
    "course": ExpenseCategory.OTHER_EXPENSES,
    "miscellaneous": ExpenseCategory.OTHER_EXPENSES,
    "misc": ExpenseCategory.OTHER_EXPENSES,
    
    # Cost of Goods Sold
    "cogs": ExpenseCategory.COST_OF_GOODS_SOLD,
    "cost of goods": ExpenseCategory.COST_OF_GOODS_SOLD,
    "cost of sales": ExpenseCategory.COST_OF_GOODS_SOLD,
    "direct cost": ExpenseCategory.COST_OF_GOODS_SOLD,
    "materials": ExpenseCategory.COST_OF_GOODS_SOLD,
    
    # Salaries & Wages (expense - paying employees)
    "payroll": ExpenseCategory.SALARIES_WAGES,
    "employee": ExpenseCategory.SALARIES_WAGES,
    
    # Marketing
    "marketing": ExpenseCategory.MARKETING,
    "advertising": ExpenseCategory.MARKETING,
    "promotion": ExpenseCategory.MARKETING,
    "ads": ExpenseCategory.MARKETING,
    "campaign": ExpenseCategory.MARKETING,
    
    # Insurance
    "insurance": ExpenseCategory.INSURANCE,
    "premium": ExpenseCategory.INSURANCE,
    "coverage": ExpenseCategory.INSURANCE,
    "liability": ExpenseCategory.INSURANCE,
    
    # Depreciation
    "depreciation": ExpenseCategory.DEPRECIATION,
    "amortization": ExpenseCategory.DEPRECIATION,
    "asset expense": ExpenseCategory.DEPRECIATION,
    
    # Interest Expense
    "interest expense": ExpenseCategory.INTEREST_EXPENSE,
    "interest paid": ExpenseCategory.INTEREST_EXPENSE,
    "loan interest": ExpenseCategory.INTEREST_EXPENSE,
    
    # Taxes
    "tax expense": ExpenseCategory.TAXES,
    "income tax": ExpenseCategory.TAXES,
    "tax provision": ExpenseCategory.TAXES,
    
    # Professional Fees
    "legal": ExpenseCategory.PROFESSIONAL_FEES,
    "accounting": ExpenseCategory.PROFESSIONAL_FEES,
    "attorney": ExpenseCategory.PROFESSIONAL_FEES,
    "cpa": ExpenseCategory.PROFESSIONAL_FEES,
    
    # Office Supplies
    "office supply": ExpenseCategory.OFFICE_SUPPLIES,
    "supplies": ExpenseCategory.OFFICE_SUPPLIES,
    "stationery": ExpenseCategory.OFFICE_SUPPLIES,
}


class RawIncomeStatementItem:
    """Raw income statement item extracted from CSV before classification."""
    def __init__(self, description: str, amount: float, type_hint: str | None = None):
        self.description = description
        self.amount = amount
        self.type_hint = type_hint  # Optional hint from CSV (e.g., "Revenue" or "Expense")


async def categorize_income_statement_items(
    items: list[RawIncomeStatementItem]
) -> list[IncomeStatementItem]:
    """
    Categorize a list of income statement items using Gemini AI.
    
    Args:
        items: List of RawIncomeStatementItem objects to categorize
        
    Returns:
        List of IncomeStatementItem objects with AI-assigned categories
        
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
    
    async def _categorize_with_ai() -> list[IncomeStatementItem]:
        """Execute the AI categorization."""
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        formatted_items = "\n".join([
            f"{i+1}. Description: \"{item.description}\", Amount: ${item.amount:.2f}" +
            (f", Type Hint: {item.type_hint}" if item.type_hint else "")
            for i, item in enumerate(items)
        ])
        
        prompt = INCOME_STATEMENT_PROMPT.format(items=formatted_items)
        
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
            item_type = cat_data.get("type", "expense").lower()
            category = cat_data.get("category", "other_expenses")
            confidence = _validate_confidence(cat_data.get("confidence", 0.8))
            
            if item_type == "revenue":
                category = _validate_revenue_category(category)
            else:
                item_type = "expense"
                category = _validate_expense_category(category)
            
            categorized.append(IncomeStatementItem(
                description=item.description,
                type=item_type,
                category=category,
                amount=item.amount,
                confidence=confidence
            ))
        
        return categorized
    
    try:
        return await execute_with_rotation(
            _categorize_with_ai,
            fallback=lambda: _fallback_categorization(items),
            operation_name="income statement categorization"
        )
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        return _fallback_categorization(items)
    except Exception as e:
        logger.error(f"Gemini categorization failed: {e}")
        raise


def _validate_revenue_category(category: str) -> str:
    """Validate and normalize revenue category string."""
    try:
        return RevenueCategory(category.lower().strip()).value
    except ValueError:
        logger.warning(f"Unknown revenue category '{category}', defaulting to other_revenue")
        return RevenueCategory.OTHER_REVENUE.value


def _validate_expense_category(category: str) -> str:
    """Validate and normalize expense category string."""
    try:
        return ExpenseCategory(category.lower().strip()).value
    except ValueError:
        logger.warning(f"Unknown expense category '{category}', defaulting to other_expenses")
        return ExpenseCategory.OTHER_EXPENSES.value


def _validate_confidence(confidence: Any) -> float:
    """Validate and normalize confidence score."""
    try:
        conf = float(confidence)
        return max(0.0, min(1.0, conf))
    except (ValueError, TypeError):
        return 0.8  # Default confidence


def _fallback_categorization(
    items: list[RawIncomeStatementItem]
) -> list[IncomeStatementItem]:
    """
    Simple rule-based categorization fallback when AI is unavailable.
    
    Uses keyword matching for basic categorization.
    """
    categorized = []
    
    for item in items:
        desc_lower = item.description.lower()
        type_hint_lower = (item.type_hint or "").lower()
        
        # First, try to determine type from hint
        is_revenue = "revenue" in type_hint_lower or "income" in type_hint_lower
        is_expense = "expense" in type_hint_lower or "cost" in type_hint_lower
        
        # If no hint, use keyword matching
        if not is_revenue and not is_expense:
            # Check for revenue keywords first
            for keyword in REVENUE_KEYWORDS:
                if keyword in desc_lower:
                    is_revenue = True
                    break
            
            # Default to expense if not clearly revenue
            if not is_revenue:
                is_expense = True
        
        # Categorize based on type
        if is_revenue:
            category = RevenueCategory.OTHER_REVENUE.value
            for keyword, cat in REVENUE_KEYWORDS.items():
                if keyword in desc_lower:
                    category = cat.value
                    break
            
            categorized.append(IncomeStatementItem(
                description=item.description,
                type="revenue",
                category=category,
                amount=item.amount,
                confidence=0.6 if category != RevenueCategory.OTHER_REVENUE.value else 0.3
            ))
        else:
            category = ExpenseCategory.OTHER_EXPENSES.value
            for keyword, cat in EXPENSE_KEYWORDS.items():
                if keyword in desc_lower:
                    category = cat.value
                    break
            
            categorized.append(IncomeStatementItem(
                description=item.description,
                type="expense",
                category=category,
                amount=item.amount,
                confidence=0.6 if category != ExpenseCategory.OTHER_EXPENSES.value else 0.3
            ))
    
    return categorized
