"""Pydantic models for CSV processing and transaction categorization.

This module defines the data models for:
- Transaction data extracted from bank CSV files
- Spending categories for AI categorization
- API response structures
- Chat/Advisor models for financial advice chatbot
"""

from pydantic import BaseModel, Field
from enum import Enum
from datetime import date, datetime
from typing import Optional, Literal


class SpendingCategory(str, Enum):
    """Supported spending categories for transaction classification.
    
    These categories are designed to cover small business finance 
    categorization needs with detailed business-focused categories.
    """
    # Business Operations
    ADVERTISING = "advertising"
    MARKETING = "marketing"
    EQUIPMENT = "equipment"
    ASSETS = "assets"
    OFFICE_SUPPLIES = "office_supplies"
    SOFTWARE = "software"
    SUBSCRIPTIONS = "subscriptions"
    INVENTORY = "inventory"
    SHIPPING = "shipping"
    MAINTENANCE = "maintenance"
    
    # Facility & Overhead
    RENT = "rent"
    HOUSING = "housing"
    UTILITIES = "utilities"
    INSURANCE = "insurance"
    
    # People & Services
    PAYROLL = "payroll"
    WAGES = "wages"
    PROFESSIONAL_SERVICES = "professional_services"
    LEGAL = "legal"
    
    # Financial
    TAXES = "taxes"
    FEES = "fees"
    FINANCIAL = "financial"
    DEBT = "debt"
    LOAN = "loan"
    INTEREST = "interest"
    
    # Income (Positive Amounts)
    REVENUE = "revenue"
    INCOME = "income"
    REFUND = "refund"
    TRANSFER = "transfer"
    
    # Travel & Meals
    TRAVEL = "travel"
    TRANSPORTATION = "transportation"
    DINING_OUT = "dining_out"
    
    # Other Categories
    GROCERIES = "groceries"
    SHOPPING = "shopping"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    ENTERTAINMENT = "entertainment"
    PERSONAL = "personal"
    OTHER = "other"


# Display names for frontend usage
CATEGORY_DISPLAY_NAMES: dict[SpendingCategory, str] = {
    # Business Operations
    SpendingCategory.ADVERTISING: "📢 Advertising",
    SpendingCategory.MARKETING: "📣 Marketing",
    SpendingCategory.EQUIPMENT: "🔧 Equipment",
    SpendingCategory.ASSETS: "💻 Assets",
    SpendingCategory.OFFICE_SUPPLIES: "📎 Office Supplies",
    SpendingCategory.SOFTWARE: "💿 Software",
    SpendingCategory.SUBSCRIPTIONS: "🔄 Subscriptions",
    SpendingCategory.INVENTORY: "📦 Inventory",
    SpendingCategory.SHIPPING: "📬 Shipping",
    SpendingCategory.MAINTENANCE: "🛠️ Maintenance",
    # Facility & Overhead
    SpendingCategory.RENT: "🏢 Rent/Lease",
    SpendingCategory.HOUSING: "🏠 Housing",
    SpendingCategory.UTILITIES: "💡 Utilities",
    SpendingCategory.INSURANCE: "🛡️ Insurance",
    # People & Services
    SpendingCategory.PAYROLL: "👥 Payroll",
    SpendingCategory.WAGES: "💵 Wages",
    SpendingCategory.PROFESSIONAL_SERVICES: "👔 Professional Services",
    SpendingCategory.LEGAL: "⚖️ Legal",
    # Financial
    SpendingCategory.TAXES: "🏛️ Taxes",
    SpendingCategory.FEES: "💳 Fees & Charges",
    SpendingCategory.FINANCIAL: "🏦 Financial",
    SpendingCategory.DEBT: "💰 Debt Payment",
    SpendingCategory.LOAN: "📋 Loan Payment",
    SpendingCategory.INTEREST: "📈 Interest",
    # Income
    SpendingCategory.REVENUE: "💲 Revenue",
    SpendingCategory.INCOME: "💵 Income",
    SpendingCategory.REFUND: "↩️ Refund",
    SpendingCategory.TRANSFER: "🔀 Transfer",
    # Travel & Meals
    SpendingCategory.TRAVEL: "✈️ Travel",
    SpendingCategory.TRANSPORTATION: "🚗 Transportation",
    SpendingCategory.DINING_OUT: "🍽️ Meals & Entertainment",
    # Other Categories
    SpendingCategory.GROCERIES: "🛒 Groceries",
    SpendingCategory.SHOPPING: "🛍️ Shopping",
    SpendingCategory.HEALTHCARE: "💊 Healthcare",
    SpendingCategory.EDUCATION: "📚 Education",
    SpendingCategory.ENTERTAINMENT: "🎬 Entertainment",
    SpendingCategory.PERSONAL: "🎁 Personal",
    SpendingCategory.OTHER: "❓ Other",
}


class Transaction(BaseModel):
    """Raw transaction data extracted from CSV.
    
    Attributes:
        date: Transaction date
        description: Transaction description/memo from bank
        amount: Transaction amount (negative for debits, positive for credits)
        original_category: Optional category if provided by bank
    """
    date: date
    description: str
    amount: float
    original_category: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "date": "2026-01-15",
                "description": "AMAZON.COM*1234567",
                "amount": -49.99,
                "original_category": None
            }
        }


class CategorizedTransaction(BaseModel):
    """Transaction with AI-assigned spending category.
    
    Attributes:
        date: Transaction date
        description: Transaction description/memo from bank
        amount: Transaction amount
        category: AI-assigned spending category
        confidence: Confidence score (0.0 to 1.0) for the categorization
        original_category: Optional category if provided by bank
    """
    date: date
    description: str
    amount: float
    category: SpendingCategory
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)
    original_category: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "date": "2026-01-15",
                "description": "AMAZON.COM*1234567",
                "amount": -49.99,
                "category": "shopping",
                "confidence": 0.92,
                "original_category": None
            }
        }


class DateRange(BaseModel):
    """Date range for transaction data."""
    start: date
    end: date


class ProcessingResult(BaseModel):
    """Complete response from CSV processing endpoint.
    
    Attributes:
        success: Whether processing completed successfully
        total_transactions: Number of transactions processed
        date_range: Start and end dates of transaction data
        transactions: List of categorized transactions
        summary: Total spending by category
        monthly_breakdown: Spending by category for each month (YYYY-MM format)
    """
    success: bool
    total_transactions: int
    date_range: DateRange
    transactions: list[CategorizedTransaction]
    summary: dict[str, float]  # Category name -> total amount
    monthly_breakdown: dict[str, dict[str, float]]  # "YYYY-MM" -> Category -> amount

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "total_transactions": 45,
                "date_range": {
                    "start": "2026-01-01",
                    "end": "2026-01-31"
                },
                "transactions": [],
                "summary": {
                    "groceries": 450.00,
                    "dining_out": 200.00,
                    "utilities": 150.00
                },
                "monthly_breakdown": {
                    "2026-01": {
                        "groceries": 450.00,
                        "dining_out": 200.00
                    }
                }
            }
        }


class ProcessingError(BaseModel):
    """Error response for processing failures.
    
    Attributes:
        success: Always False for errors
        error_code: Machine-readable error code
        message: Human-readable error message
        details: Additional error context
    """
    success: bool = False
    error_code: str
    message: str
    details: Optional[dict] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error_code": "PARSE_ERROR",
                "message": "Unable to parse CSV file",
                "details": {"row": 5, "issue": "Invalid date format"}
            }
        }


# ============================================================================
# Chat/Advisor Models for Financial Advice Chatbot
# ============================================================================

class ChatMessage(BaseModel):
    """A single message in a conversation.
    
    Attributes:
        role: Who sent the message - 'user' or 'assistant'
        content: The message text content
        timestamp: When the message was sent (ISO format)
    """
    role: Literal["user", "assistant"]
    content: str
    timestamp: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "Should I invest in index funds or individual stocks?",
                "timestamp": "2026-01-23T10:30:00Z"
            }
        }


class FinancialContext(BaseModel):
    """Optional financial context to enhance advisor responses.
    
    Attributes:
        total_income: Total income from transactions
        total_expenses: Total expenses from transactions
        top_categories: Top spending categories with amounts
        monthly_savings_rate: Percentage of income saved
        goals: User's financial goals
    """
    total_income: Optional[float] = None
    total_expenses: Optional[float] = None
    top_categories: Optional[dict[str, float]] = None
    monthly_savings_rate: Optional[float] = None
    goals: Optional[list[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "total_income": 8500.00,
                "total_expenses": 6200.00,
                "top_categories": {
                    "rent": 1800.00,
                    "groceries": 600.00,
                    "transportation": 400.00
                },
                "monthly_savings_rate": 27.0,
                "goals": ["Build emergency fund", "Save for down payment"]
            }
        }


class ChatRequest(BaseModel):
    """Request body for advisor chat endpoint.
    
    Attributes:
        message: The user's current message/question
        session_id: Optional session ID for conversation tracking
        conversation_history: Previous messages in the conversation
        financial_context: Optional financial data for personalized advice
    """
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    conversation_history: list[ChatMessage] = Field(default_factory=list)
    financial_context: Optional[FinancialContext] = None

    class Config:
        json_schema_extra = {
            "example": {
                "message": "I have $10,000 to invest. What should I do?",
                "session_id": "sess_abc123",
                "conversation_history": [
                    {
                        "role": "user",
                        "content": "I want to start investing"
                    },
                    {
                        "role": "assistant", 
                        "content": "Great! Let's discuss your investment goals..."
                    }
                ],
                "financial_context": {
                    "total_income": 8500.00,
                    "total_expenses": 6200.00,
                    "monthly_savings_rate": 27.0
                }
            }
        }


class ChatResponse(BaseModel):
    """Response from the advisor chat endpoint.
    
    Attributes:
        message: The advisor's response
        session_id: Session ID for conversation continuity
        suggestions: Follow-up question suggestions
        is_financial: Whether the query was financial in nature
    """
    message: str
    session_id: str
    suggestions: list[str] = Field(default_factory=list)
    is_financial: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "message": "With $10,000 to invest, I'd recommend a growth-oriented approach...",
                "session_id": "sess_abc123",
                "suggestions": [
                    "What about tax-advantaged accounts?",
                    "How should I diversify?",
                    "What's your view on ETFs vs mutual funds?"
                ],
                "is_financial": True
            }
        }
