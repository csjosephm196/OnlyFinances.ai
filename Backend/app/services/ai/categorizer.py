"""AI-powered transaction categorization using Google Gemini.

This module provides intelligent categorization of bank transactions
into spending categories using the Gemini API.
"""

import json
import logging
from typing import Any

import google.generativeai as genai

from app.core.config import get_settings
from .models import SpendingCategory, CategorizedTransaction, Transaction

logger = logging.getLogger(__name__)

# Prompt template for Gemini categorization
CATEGORIZATION_PROMPT = """You are a financial transaction categorizer for small businesses. Analyze each transaction and assign it to exactly one of these categories:

BUSINESS OPERATIONS:
- advertising: Google Ads, Facebook Ads, print ads, billboards, ad spend
- marketing: Email marketing, SEO services, promotional materials, mailchimp, hubspot
- equipment: Tools, machinery, office equipment purchases
- assets: Hardware, computers, furniture, capitalizable items
- office_supplies: Paper, pens, printer ink, desk accessories
- software: One-time software purchases, licenses, Adobe
- subscriptions: SaaS tools, recurring software (Slack, Zoom, Dropbox, Notion)
- inventory: Products for resale, raw materials
- shipping: Postage, FedEx, UPS, freight costs
- maintenance: Repairs, cleaning services, equipment servicing

FACILITY & OVERHEAD:
- rent: Office rent, equipment leases, coworking spaces (WeWork, Regus)
- housing: Home office, residential expenses
- utilities: Electric, gas, water, internet, phone (Comcast, Verizon, AT&T)
- insurance: Business insurance, liability, health, workers comp

PEOPLE & SERVICES:
- payroll: Gusto, ADP, Paychex, payroll processing
- wages: Direct salary/wage payments, bonus, compensation
- professional_services: Consultants, accountants, freelancers, Upwork, Fiverr
- legal: Lawyers, legal fees, contracts, attorney

FINANCIAL:
- taxes: Federal, state, local taxes, IRS, EFTPS, quarterly payments
- fees: Bank fees, credit card fees, service charges, overdraft, wire fee
- financial: General banking, financial services
- debt: Credit card payments, debt repayment
- loan: Business loan payments, SBA loans
- interest: Interest charges, interest earned

INCOME (use for positive amounts):
- revenue: Sales, client payments, Stripe payouts, Square, PayPal, Shopify
- income: General income, deposits
- refund: Returned items, refunds received, chargeback reversal
- transfer: Internal transfers, owner contributions

TRAVEL & MEALS:
- travel: Flights, hotels, Airbnb, vacation expenses
- transportation: Uber, Lyft, gas, parking, tolls, public transit
- dining_out: Restaurants, client meals, team lunches, food delivery

OTHER CATEGORIES:
- groceries: Grocery stores, food supplies
- shopping: General retail purchases
- healthcare: Medical expenses, pharmacy
- education: Courses, training, books
- entertainment: Movies, events, recreation
- personal: Personal expenses
- other: ONLY use when nothing else fits

For each transaction, respond with a JSON object containing:
- "category": exactly one of the category names listed above (lowercase with underscores)
- "confidence": a number between 0.0 and 1.0 indicating how confident you are

IMPORTANT: 
- Respond ONLY with a JSON array, no other text
- Each element corresponds to a transaction in order
- Use lowercase category names exactly as shown
- Prioritize business-specific categories over generic ones
- Only use "other" as an absolute last resort

Transactions to categorize:
{transactions}

Respond with a JSON array:"""


async def categorize_transactions(
    transactions: list[Transaction]
) -> list[CategorizedTransaction]:
    """
    Categorize a list of transactions using Gemini AI.
    
    Args:
        transactions: List of Transaction objects to categorize
        
    Returns:
        List of CategorizedTransaction objects with AI-assigned categories
        
    Raises:
        ValueError: If Gemini API returns invalid response
        Exception: For API connection or other errors
    """
    if not transactions:
        return []
    
    settings = get_settings()
    
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set, using fallback categorization")
        return _fallback_categorization(transactions)
    
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Format transactions for the prompt
    formatted_transactions = "\n".join([
        f"{i+1}. Date: {t.date}, Description: \"{t.description}\", Amount: ${abs(t.amount):.2f}"
        for i, t in enumerate(transactions)
    ])
    
    prompt = CATEGORIZATION_PROMPT.format(transactions=formatted_transactions)
    
    try:
        # Process in batches if there are many transactions
        batch_size = 50
        all_categorized = []
        
        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i + batch_size]
            batch_formatted = "\n".join([
                f"{j+1}. Date: {t.date}, Description: \"{t.description}\", Amount: ${abs(t.amount):.2f}"
                for j, t in enumerate(batch)
            ])
            
            batch_prompt = CATEGORIZATION_PROMPT.format(transactions=batch_formatted)
            
            response = await model.generate_content_async(
                batch_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,  # Low temp for consistent categorization
                    response_mime_type="application/json"
                )
            )
            
            # Parse the response
            response_text = response.text.strip()
            logger.debug(f"Gemini response: {response_text}")
            
            categorizations = json.loads(response_text)
            
            if not isinstance(categorizations, list):
                raise ValueError("Expected JSON array response from Gemini")
            
            if len(categorizations) != len(batch):
                logger.warning(
                    f"Mismatch: got {len(categorizations)} categories for {len(batch)} transactions"
                )
            
            # Map categorizations to transactions
            for j, (txn, cat_data) in enumerate(zip(batch, categorizations)):
                category = _validate_category(cat_data.get("category", "other"))
                confidence = _validate_confidence(cat_data.get("confidence", 0.8))
                
                all_categorized.append(CategorizedTransaction(
                    date=txn.date,
                    description=txn.description,
                    amount=txn.amount,
                    category=category,
                    confidence=confidence,
                    original_category=txn.original_category
                ))
        
        return all_categorized
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        # Fall back to rule-based categorization
        return _fallback_categorization(transactions)
    except Exception as e:
        logger.error(f"Gemini categorization failed: {e}")
        raise


def _validate_category(category: str) -> SpendingCategory:
    """Validate and normalize category string to SpendingCategory enum."""
    try:
        return SpendingCategory(category.lower().strip())
    except ValueError:
        logger.warning(f"Unknown category '{category}', defaulting to OTHER")
        return SpendingCategory.OTHER


def _validate_confidence(confidence: Any) -> float:
    """Validate and normalize confidence score."""
    try:
        conf = float(confidence)
        return max(0.0, min(1.0, conf))
    except (ValueError, TypeError):
        return 0.8  # Default confidence


def _fallback_categorization(
    transactions: list[Transaction]
) -> list[CategorizedTransaction]:
    """
    Simple rule-based categorization fallback when AI is unavailable.
    
    Uses keyword matching for basic categorization.
    """
    keyword_categories: dict[str, SpendingCategory] = {
        # Advertising
        "facebook ads": SpendingCategory.ADVERTISING,
        "google ads": SpendingCategory.ADVERTISING,
        "linkedin ads": SpendingCategory.ADVERTISING,
        "bing ads": SpendingCategory.ADVERTISING,
        "advertisement": SpendingCategory.ADVERTISING,
        "ad spend": SpendingCategory.ADVERTISING,
        
        # Marketing
        "mailchimp": SpendingCategory.MARKETING,
        "hubspot": SpendingCategory.MARKETING,
        "constantcontact": SpendingCategory.MARKETING,
        "marketing": SpendingCategory.MARKETING,
        "promo": SpendingCategory.MARKETING,
        
        # Payroll & Wages
        "gusto": SpendingCategory.PAYROLL,
        "adp": SpendingCategory.PAYROLL,
        "paychex": SpendingCategory.PAYROLL,
        "payroll": SpendingCategory.PAYROLL,
        "salary": SpendingCategory.WAGES,
        "wage": SpendingCategory.WAGES,
        "bonus": SpendingCategory.WAGES,
        
        # Taxes
        "irs": SpendingCategory.TAXES,
        "eftps": SpendingCategory.TAXES,
        "tax": SpendingCategory.TAXES,
        "quarterly": SpendingCategory.TAXES,
        
        # Fees
        "bank fee": SpendingCategory.FEES,
        "service charge": SpendingCategory.FEES,
        "overdraft": SpendingCategory.FEES,
        "wire fee": SpendingCategory.FEES,
        "atm fee": SpendingCategory.FEES,
        
        # Revenue & Income
        "stripe": SpendingCategory.REVENUE,
        "square": SpendingCategory.REVENUE,
        "paypal": SpendingCategory.REVENUE,
        "shopify": SpendingCategory.REVENUE,
        "payout": SpendingCategory.REVENUE,
        "invoice": SpendingCategory.REVENUE,
        "refund": SpendingCategory.REFUND,
        "return": SpendingCategory.REFUND,
        "deposit": SpendingCategory.INCOME,
        "transfer": SpendingCategory.TRANSFER,
        
        # Software & Subscriptions
        "adobe": SpendingCategory.SOFTWARE,
        "microsoft": SpendingCategory.SOFTWARE,
        "license": SpendingCategory.SOFTWARE,
        "slack": SpendingCategory.SUBSCRIPTIONS,
        "zoom": SpendingCategory.SUBSCRIPTIONS,
        "dropbox": SpendingCategory.SUBSCRIPTIONS,
        "notion": SpendingCategory.SUBSCRIPTIONS,
        "figma": SpendingCategory.SUBSCRIPTIONS,
        "asana": SpendingCategory.SUBSCRIPTIONS,
        
        # Equipment & Assets
        "home depot": SpendingCategory.EQUIPMENT,
        "lowes": SpendingCategory.EQUIPMENT,
        "tools": SpendingCategory.EQUIPMENT,
        "equipment": SpendingCategory.EQUIPMENT,
        "apple store": SpendingCategory.ASSETS,
        "dell": SpendingCategory.ASSETS,
        "lenovo": SpendingCategory.ASSETS,
        "computer": SpendingCategory.ASSETS,
        "laptop": SpendingCategory.ASSETS,
        "furniture": SpendingCategory.ASSETS,
        
        # Professional Services & Legal
        "consulting": SpendingCategory.PROFESSIONAL_SERVICES,
        "contractor": SpendingCategory.PROFESSIONAL_SERVICES,
        "freelance": SpendingCategory.PROFESSIONAL_SERVICES,
        "upwork": SpendingCategory.PROFESSIONAL_SERVICES,
        "fiverr": SpendingCategory.PROFESSIONAL_SERVICES,
        "attorney": SpendingCategory.LEGAL,
        "lawyer": SpendingCategory.LEGAL,
        "legal": SpendingCategory.LEGAL,
        "law office": SpendingCategory.LEGAL,
        
        # Rent & Facility
        "rent": SpendingCategory.RENT,
        "lease": SpendingCategory.RENT,
        "wework": SpendingCategory.RENT,
        "regus": SpendingCategory.RENT,
        "property": SpendingCategory.RENT,
        
        # Utilities
        "electric": SpendingCategory.UTILITIES,
        "water bill": SpendingCategory.UTILITIES,
        "gas bill": SpendingCategory.UTILITIES,
        "internet": SpendingCategory.UTILITIES,
        "comcast": SpendingCategory.UTILITIES,
        "verizon": SpendingCategory.UTILITIES,
        "at&t": SpendingCategory.UTILITIES,
        
        # Insurance
        "insurance": SpendingCategory.INSURANCE,
        "geico": SpendingCategory.INSURANCE,
        "state farm": SpendingCategory.INSURANCE,
        "liability": SpendingCategory.INSURANCE,
        "workers comp": SpendingCategory.INSURANCE,
        
        # Shipping
        "fedex": SpendingCategory.SHIPPING,
        "ups": SpendingCategory.SHIPPING,
        "usps": SpendingCategory.SHIPPING,
        "postage": SpendingCategory.SHIPPING,
        "freight": SpendingCategory.SHIPPING,
        
        # Loan & Debt
        "loan": SpendingCategory.LOAN,
        "sba": SpendingCategory.LOAN,
        "debt": SpendingCategory.DEBT,
        "credit card payment": SpendingCategory.DEBT,
        "interest": SpendingCategory.INTEREST,
        
        # Groceries
        "walmart": SpendingCategory.GROCERIES,
        "costco": SpendingCategory.GROCERIES,
        "trader joe": SpendingCategory.GROCERIES,
        "whole foods": SpendingCategory.GROCERIES,
        "kroger": SpendingCategory.GROCERIES,
        "safeway": SpendingCategory.GROCERIES,
        "publix": SpendingCategory.GROCERIES,
        "aldi": SpendingCategory.GROCERIES,
        
        # Dining
        "mcdonald": SpendingCategory.DINING_OUT,
        "starbucks": SpendingCategory.DINING_OUT,
        "chipotle": SpendingCategory.DINING_OUT,
        "uber eats": SpendingCategory.DINING_OUT,
        "doordash": SpendingCategory.DINING_OUT,
        "grubhub": SpendingCategory.DINING_OUT,
        "restaurant": SpendingCategory.DINING_OUT,
        
        # Transportation
        "shell": SpendingCategory.TRANSPORTATION,
        "chevron": SpendingCategory.TRANSPORTATION,
        "exxon": SpendingCategory.TRANSPORTATION,
        "uber": SpendingCategory.TRANSPORTATION,
        "lyft": SpendingCategory.TRANSPORTATION,
        "parking": SpendingCategory.TRANSPORTATION,
        
        # Entertainment
        "netflix": SpendingCategory.ENTERTAINMENT,
        "spotify": SpendingCategory.ENTERTAINMENT,
        "disney+": SpendingCategory.ENTERTAINMENT,
        "hulu": SpendingCategory.ENTERTAINMENT,
        "amc": SpendingCategory.ENTERTAINMENT,
        "cinema": SpendingCategory.ENTERTAINMENT,
        
        # Shopping
        "amazon": SpendingCategory.SHOPPING,
        "target": SpendingCategory.SHOPPING,
        "best buy": SpendingCategory.SHOPPING,
        "apple.com": SpendingCategory.SHOPPING,
        
        # Financial
        "atm": SpendingCategory.FINANCIAL,
        "bank": SpendingCategory.FINANCIAL,
    }
    
    categorized = []
    for txn in transactions:
        desc_lower = txn.description.lower()
        matched_category = SpendingCategory.OTHER
        
        for keyword, category in keyword_categories.items():
            if keyword in desc_lower:
                matched_category = category
                break
        
        categorized.append(CategorizedTransaction(
            date=txn.date,
            description=txn.description,
            amount=txn.amount,
            category=matched_category,
            confidence=0.6 if matched_category != SpendingCategory.OTHER else 0.3,
            original_category=txn.original_category
        ))
    
    return categorized
