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


# ============================================================================
# Balance Sheet Models
# ============================================================================

class AssetCategory(str, Enum):
    """Asset categories for balance sheet classification."""
    CASH = "cash"
    ACCOUNTS_RECEIVABLE = "accounts_receivable"
    INVENTORY = "inventory"
    PREPAID_EXPENSES = "prepaid_expenses"
    EQUIPMENT = "equipment"
    PROPERTY = "property"
    INVESTMENTS = "investments"
    INTANGIBLE_ASSETS = "intangible_assets"
    OTHER_ASSETS = "other_assets"


class LiabilityCategory(str, Enum):
    """Liability categories for balance sheet classification."""
    ACCOUNTS_PAYABLE = "accounts_payable"
    CREDIT_CARDS = "credit_cards"
    SHORT_TERM_DEBT = "short_term_debt"
    ACCRUED_EXPENSES = "accrued_expenses"
    TAXES_PAYABLE = "taxes_payable"
    LONG_TERM_DEBT = "long_term_debt"
    DEFERRED_REVENUE = "deferred_revenue"
    OTHER_LIABILITIES = "other_liabilities"


class BalanceSheetItem(BaseModel):
    """Individual balance sheet line item."""
    name: str
    type: Literal["asset", "liability"]
    category: str  # AssetCategory or LiabilityCategory value
    value: float
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)


class AssetsSummary(BaseModel):
    """Summary of all assets."""
    items: list[BalanceSheetItem]
    total: float
    by_category: dict[str, float]  # AssetCategory value -> total


class LiabilitiesSummary(BaseModel):
    """Summary of all liabilities."""
    items: list[BalanceSheetItem]
    total: float
    by_category: dict[str, float]  # LiabilityCategory value -> total


class BalanceSheetData(BaseModel):
    """Complete response from balance sheet processing endpoint."""
    success: bool = True
    date: str  # YYYY-MM-DD format
    total_items: int
    items: list[BalanceSheetItem]
    assets: AssetsSummary
    liabilities: LiabilitiesSummary
    equity: float  # Total Assets - Total Liabilities


# ============================================================================
# Income Statement Models
# ============================================================================

class RevenueCategory(str, Enum):
    """Revenue categories for income statement classification."""
    SALES = "sales"
    SERVICES = "services"
    WAGES_SALARY = "wages_salary"  # Employment income, paychecks
    INTEREST_INCOME = "interest_income"
    INVESTMENT_INCOME = "investment_income"
    RENTAL_INCOME = "rental_income"
    ROYALTIES = "royalties"
    OTHER_REVENUE = "other_revenue"


class ExpenseCategory(str, Enum):
    """Expense categories for income statement classification."""
    COST_OF_GOODS_SOLD = "cost_of_goods_sold"
    SALARIES_WAGES = "salaries_wages"
    RENT = "rent"
    UTILITIES = "utilities"
    MARKETING = "marketing"
    INSURANCE = "insurance"
    DEPRECIATION = "depreciation"
    INTEREST_EXPENSE = "interest_expense"
    TAXES = "taxes"
    PROFESSIONAL_FEES = "professional_fees"
    OFFICE_SUPPLIES = "office_supplies"
    TRAVEL = "travel"
    OTHER_EXPENSES = "other_expenses"


class IncomeStatementItem(BaseModel):
    """Individual income statement line item."""
    description: str
    type: Literal["revenue", "expense"]
    category: str  # RevenueCategory or ExpenseCategory value
    amount: float
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)


class Period(BaseModel):
    """Time period for income statement."""
    start: str  # YYYY-MM-DD format
    end: str    # YYYY-MM-DD format


class RevenuesSummary(BaseModel):
    """Summary of all revenues."""
    items: list[IncomeStatementItem]
    total: float
    by_category: dict[str, float]  # RevenueCategory value -> total


class ExpensesSummary(BaseModel):
    """Summary of all expenses."""
    items: list[IncomeStatementItem]
    total: float
    by_category: dict[str, float]  # ExpenseCategory value -> total


class IncomeStatementData(BaseModel):
    """Complete response from income statement processing endpoint."""
    success: bool = True
    period: Period
    total_items: int
    items: list[IncomeStatementItem]
    revenues: RevenuesSummary
    expenses: ExpensesSummary
    gross_profit: float   # Total Revenue - Cost of Goods Sold
    net_income: float     # Total Revenue - Total Expenses


# ============================================================================
# Recurring Expense Detection Models
# ============================================================================

class RecurringFrequency(str, Enum):
    """Frequency patterns for recurring expenses."""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class RecurringExpense(BaseModel):
    """A detected recurring expense (subscription, bill, etc.).
    
    Attributes:
        merchant: Normalized merchant/vendor name
        amount: Average charge amount
        frequency: Detected billing frequency
        category: Spending category
        last_charge: Date of most recent charge
        next_expected: Predicted date of next charge
        occurrences: Number of times this charge was detected
        confidence: Detection confidence score (0.0 to 1.0)
    """
    merchant: str
    amount: float
    frequency: RecurringFrequency
    category: SpendingCategory
    last_charge: date
    next_expected: date
    occurrences: int
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)

    class Config:
        json_schema_extra = {
            "example": {
                "merchant": "Netflix",
                "amount": 15.99,
                "frequency": "monthly",
                "category": "subscriptions",
                "last_charge": "2026-01-15",
                "next_expected": "2026-02-15",
                "occurrences": 6,
                "confidence": 0.95
            }
        }


class RecurringExpensesResult(BaseModel):
    """Response from recurring expense detection endpoint.
    
    Attributes:
        success: Whether detection completed successfully
        recurring_expenses: List of detected recurring expenses
        monthly_total: Estimated total monthly recurring cost
        total_detected: Number of recurring expenses found
    """
    success: bool = True
    recurring_expenses: list[RecurringExpense]
    monthly_total: float
    total_detected: int

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "recurring_expenses": [],
                "monthly_total": 185.47,
                "total_detected": 8
            }
        }


class RecurringExpensesRequest(BaseModel):
    """Request body for recurring expense detection.
    
    Attributes:
        transactions: List of categorized transactions to analyze
    """
    transactions: list[CategorizedTransaction]


# ============================================================================
# Financial Forecasting Models (Layer 2)
# ============================================================================

class ForecastDataPoint(BaseModel):
    """Single point in forecast timeline.
    
    Attributes:
        date: The date for this data point
        actual: Historical actual cash flow value (null for future dates)
        predicted: Forecasted value (null for historical dates)
        upper_bound: 95% confidence interval upper bound
        lower_bound: 95% confidence interval lower bound
        cumulative_balance: Running balance at this date
    """
    date: date
    actual: Optional[float] = None
    predicted: Optional[float] = None
    upper_bound: Optional[float] = None
    lower_bound: Optional[float] = None
    cumulative_balance: Optional[float] = None

    class Config:
        json_schema_extra = {
            "example": {
                "date": "2026-02-15",
                "actual": None,
                "predicted": 52000.00,
                "upper_bound": 58000.00,
                "lower_bound": 46000.00,
                "cumulative_balance": 52000.00
            }
        }


class ForecastInsightType(str, Enum):
    """Types of forecast insights."""
    WARNING = "warning"
    SUCCESS = "success"
    INFO = "info"


class ForecastInsight(BaseModel):
    """AI-generated insight card for the forecast.
    
    Attributes:
        type: Visual type (warning, success, info)
        title: Short headline for the insight
        description: Detailed explanation
        metric_value: Optional key metric to highlight
    """
    type: ForecastInsightType
    title: str
    description: str
    metric_value: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "type": "warning",
                "title": "Liquidity Risk Detected",
                "description": "Large tax payment ($12k) due in 45 days. Current projection shows buffer dipping below 10% threshold.",
                "metric_value": "$12,000"
            }
        }


class ForecastMetrics(BaseModel):
    """Key metrics derived from the forecast.
    
    Attributes:
        runway_months: Estimated months of runway at current burn rate
        safety_buffer: Recommended safety buffer amount
        avg_daily_revenue: Average daily revenue from historical data
        avg_daily_expense: Average daily expenses from historical data
        avg_daily_net: Average daily net cash flow
        projected_end_balance: Projected balance at end of forecast period
        current_balance: Current/starting balance
    """
    runway_months: float
    safety_buffer: float
    avg_daily_revenue: float
    avg_daily_expense: float
    avg_daily_net: float
    projected_end_balance: float
    current_balance: float

    class Config:
        json_schema_extra = {
            "example": {
                "runway_months": 14.2,
                "safety_buffer": 24500.00,
                "avg_daily_revenue": 150.00,
                "avg_daily_expense": 120.00,
                "avg_daily_net": 30.00,
                "projected_end_balance": 72000.00,
                "current_balance": 52000.00
            }
        }


class IncomeContext(BaseModel):
    """Income statement context for forecast generation.
    
    Attributes:
        total_revenue: Total revenue from income statement
        total_expenses: Total expenses from income statement
        net_income: Net income (revenue - expenses)
        revenue_by_category: Revenue breakdown by category
        expense_by_category: Expense breakdown by category
    """
    total_revenue: float = 0.0
    total_expenses: float = 0.0
    net_income: float = 0.0
    revenue_by_category: Optional[dict[str, float]] = None
    expense_by_category: Optional[dict[str, float]] = None


class BalanceContext(BaseModel):
    """Balance sheet context for forecast generation.
    
    Attributes:
        total_assets: Total assets value
        total_liabilities: Total liabilities value
        equity: Net equity (assets - liabilities)
        liquid_assets: Cash and liquid assets for runway calculation
    """
    total_assets: float = 0.0
    total_liabilities: float = 0.0
    equity: float = 0.0
    liquid_assets: float = 0.0


class ForecastRequest(BaseModel):
    """Request body for generating a financial forecast.
    
    Attributes:
        transactions: List of historical categorized transactions
        income_context: Optional income statement summary data
        balance_context: Optional balance sheet summary data
        current_balance: Starting balance for projections
        forecast_days: Number of days to forecast (default 90)
    """
    transactions: list[CategorizedTransaction]
    income_context: Optional[IncomeContext] = None
    balance_context: Optional[BalanceContext] = None
    current_balance: float = 0.0
    forecast_days: int = Field(default=90, ge=30, le=365)

    class Config:
        json_schema_extra = {
            "example": {
                "transactions": [],
                "income_context": {
                    "total_revenue": 3975.40,
                    "total_expenses": 3113.18,
                    "net_income": 862.22
                },
                "balance_context": {
                    "liquid_assets": 19880.72,
                    "equity": 128830.32
                },
                "current_balance": 7380.72,
                "forecast_days": 90
            }
        }


class ForecastResult(BaseModel):
    """Complete response from forecast generation.
    
    Attributes:
        success: Whether forecast generation succeeded
        forecast_id: Unique identifier for this forecast
        generated_at: Timestamp of generation
        data_points: List of forecast data points (historical + projected)
        metrics: Key forecast metrics
        insights: AI-generated insight cards
        confidence_level: Statistical confidence level (default 0.95)
        data_sources: List of data sources used (transactions, income, balance)
        historical_start: Start date of historical data
        historical_end: End date of historical data (today marker)
        forecast_end: End date of forecast period
    """
    success: bool = True
    forecast_id: str
    generated_at: datetime
    data_points: list[ForecastDataPoint]
    metrics: ForecastMetrics
    insights: list[ForecastInsight]
    confidence_level: float = Field(default=0.95, ge=0.5, le=0.99)
    data_sources: list[str]
    historical_start: date
    historical_end: date
    forecast_end: date

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "forecast_id": "fc_abc123",
                "generated_at": "2026-01-24T20:00:00Z",
                "data_points": [],
                "metrics": {
                    "runway_months": 14.2,
                    "safety_buffer": 24500.00,
                    "avg_daily_revenue": 150.00,
                    "avg_daily_expense": 120.00,
                    "avg_daily_net": 30.00,
                    "projected_end_balance": 72000.00,
                    "current_balance": 52000.00
                },
                "insights": [],
                "confidence_level": 0.95,
                "data_sources": ["transactions", "income_statement"],
                "historical_start": "2025-10-01",
                "historical_end": "2026-01-24",
                "forecast_end": "2026-04-24"
            }
        }
