# Backend Integration Guide: Balance Sheet & Income Statement 📊

This document provides complete specifications for implementing the AI-powered Balance Sheet and Income Statement processing endpoints on the Render backend. The frontend is already built and ready to consume these APIs.

---

## Table of Contents

1. [Overview](#overview)
2. [Balance Sheet API](#balance-sheet-api)
   - [Endpoint](#balance-sheet-endpoint)
   - [Request Format](#balance-sheet-request)
   - [Response Format](#balance-sheet-response)
   - [Categories](#balance-sheet-categories)
   - [AI Classification Guidelines](#balance-sheet-ai-guidelines)
3. [Income Statement API](#income-statement-api)
   - [Endpoint](#income-statement-endpoint)
   - [Request Format](#income-statement-request)
   - [Response Format](#income-statement-response)
   - [Categories](#income-statement-categories)
   - [AI Classification Guidelines](#income-statement-ai-guidelines)
4. [Error Handling](#error-handling)
5. [Frontend Connection](#frontend-connection)
6. [Testing](#testing)

---

## Overview

The frontend currently uses **mock/demo data** for Balance Sheet and Income Statement processing. Once the backend endpoints are ready, simply update the `budgetApi.ts` file to enable the real API calls.

**Base URL:** `https://demo-backend-bqyy.onrender.com`

| Feature | Endpoint | Status |
|---------|----------|--------|
| Transaction Processing | `POST /v1/process` | ✅ Live |
| Balance Sheet Processing | `POST /v1/process-balance-sheet` | 🔨 To Build |
| Income Statement Processing | `POST /v1/process-income-statement` | 🔨 To Build |

---

## Balance Sheet API

### Balance Sheet Endpoint

```
POST /v1/process-balance-sheet
Content-Type: multipart/form-data
```

### Balance Sheet Request

The frontend sends a CSV file as `multipart/form-data`:

```javascript
const formData = new FormData();
formData.append('file', csvFile);

fetch('/v1/process-balance-sheet', {
    method: 'POST',
    body: formData
});
```

**Expected CSV Format:**

The CSV should contain balance sheet line items. The AI should parse various formats, but a typical structure might be:

```csv
Item Name,Type,Amount
Cash and Cash Equivalents,Asset,53000
Accounts Receivable,Asset,12500
Office Equipment,Asset,8400
Credit Card Balance,Liability,4200
Taxes Payable,Liability,12000
```

Or from accounting software exports with different column names:
- `Account`, `Name`, `Description` → Item name
- `Type`, `Account Type`, `Category` → Asset/Liability hint
- `Balance`, `Amount`, `Value`, `Debit`, `Credit` → Value

### Balance Sheet Response

**Success Response:**

```json
{
  "success": true,
  "date": "2024-01-31",
  "total_items": 5,
  "items": [
    {
      "name": "Cash & Cash Equivalents",
      "type": "asset",
      "category": "cash",
      "value": 53000.00,
      "confidence": 0.95
    },
    {
      "name": "Accounts Receivable",
      "type": "asset",
      "category": "accounts_receivable",
      "value": 12500.00,
      "confidence": 0.92
    },
    {
      "name": "Office Equipment",
      "type": "asset",
      "category": "equipment",
      "value": 8400.00,
      "confidence": 0.88
    },
    {
      "name": "Credit Card Balance",
      "type": "liability",
      "category": "credit_cards",
      "value": 4200.00,
      "confidence": 0.96
    },
    {
      "name": "Taxes Payable",
      "type": "liability",
      "category": "taxes_payable",
      "value": 12000.00,
      "confidence": 0.94
    }
  ],
  "assets": {
    "items": [
      {
        "name": "Cash & Cash Equivalents",
        "type": "asset",
        "category": "cash",
        "value": 53000.00,
        "confidence": 0.95
      },
      {
        "name": "Accounts Receivable",
        "type": "asset",
        "category": "accounts_receivable",
        "value": 12500.00,
        "confidence": 0.92
      },
      {
        "name": "Office Equipment",
        "type": "asset",
        "category": "equipment",
        "value": 8400.00,
        "confidence": 0.88
      }
    ],
    "total": 73900.00,
    "by_category": {
      "cash": 53000.00,
      "accounts_receivable": 12500.00,
      "inventory": 0,
      "prepaid_expenses": 0,
      "equipment": 8400.00,
      "property": 0,
      "investments": 0,
      "intangible_assets": 0,
      "other_assets": 0
    }
  },
  "liabilities": {
    "items": [
      {
        "name": "Credit Card Balance",
        "type": "liability",
        "category": "credit_cards",
        "value": 4200.00,
        "confidence": 0.96
      },
      {
        "name": "Taxes Payable",
        "type": "liability",
        "category": "taxes_payable",
        "value": 12000.00,
        "confidence": 0.94
      }
    ],
    "total": 16200.00,
    "by_category": {
      "accounts_payable": 0,
      "credit_cards": 4200.00,
      "short_term_debt": 0,
      "accrued_expenses": 0,
      "taxes_payable": 12000.00,
      "long_term_debt": 0,
      "deferred_revenue": 0,
      "other_liabilities": 0
    }
  },
  "equity": 57700.00
}
```

### Balance Sheet Categories

#### Asset Categories

| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `cash` | Cash | Bank accounts, petty cash, cash equivalents, money market |
| `accounts_receivable` | Accounts Receivable | Customer invoices, outstanding payments, trade receivables |
| `inventory` | Inventory | Products for sale, raw materials, work-in-progress |
| `prepaid_expenses` | Prepaid Expenses | Prepaid insurance, prepaid rent, advance payments |
| `equipment` | Equipment | Office equipment, machinery, tools, computers |
| `property` | Property | Real estate, buildings, land, leasehold improvements |
| `investments` | Investments | Stocks, bonds, long-term investments |
| `intangible_assets` | Intangible Assets | Patents, trademarks, goodwill, software licenses |
| `other_assets` | Other Assets | **Only use if nothing else fits** |

#### Liability Categories

| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `accounts_payable` | Accounts Payable | Vendor invoices, bills to pay, trade payables |
| `credit_cards` | Credit Cards | Credit card balances, corporate cards |
| `short_term_debt` | Short-term Debt | Lines of credit, short-term loans (< 1 year) |
| `accrued_expenses` | Accrued Expenses | Unpaid wages, utilities due, accrued interest |
| `taxes_payable` | Taxes Payable | Income tax, sales tax, payroll tax liabilities |
| `long_term_debt` | Long-term Debt | Mortgages, business loans (> 1 year) |
| `deferred_revenue` | Deferred Revenue | Customer prepayments, unearned revenue |
| `other_liabilities` | Other Liabilities | **Only use if nothing else fits** |

### Balance Sheet AI Guidelines

**Classification Keywords:**

```python
BALANCE_SHEET_KEYWORDS = {
    # Assets
    "cash": ["cash", "bank", "checking", "savings", "money market", "petty cash", "cash equivalent"],
    "accounts_receivable": ["receivable", "a/r", "ar", "customer", "invoice", "outstanding", "trade receivable"],
    "inventory": ["inventory", "stock", "merchandise", "raw material", "finished goods", "wip"],
    "prepaid_expenses": ["prepaid", "advance", "deposit", "prepayment"],
    "equipment": ["equipment", "machinery", "tools", "computer", "furniture", "vehicle", "office equipment"],
    "property": ["property", "building", "land", "real estate", "leasehold"],
    "investments": ["investment", "stock", "bond", "securities", "mutual fund"],
    "intangible_assets": ["patent", "trademark", "goodwill", "software", "license", "copyright"],
    
    # Liabilities
    "accounts_payable": ["payable", "a/p", "ap", "vendor", "bill", "supplier", "trade payable"],
    "credit_cards": ["credit card", "visa", "mastercard", "amex", "corporate card"],
    "short_term_debt": ["line of credit", "short term loan", "note payable", "current debt"],
    "accrued_expenses": ["accrued", "accrual", "unpaid wages", "interest payable"],
    "taxes_payable": ["tax", "irs", "income tax", "sales tax", "payroll tax", "tax liability"],
    "long_term_debt": ["mortgage", "loan", "long term", "note", "bond payable"],
    "deferred_revenue": ["deferred", "unearned", "prepaid by customer", "advance payment"],
}
```

**Determining Asset vs Liability:**
1. Check for explicit "Asset" or "Liability" column in CSV
2. Check for keywords: "receivable", "prepaid" → Asset; "payable", "debt", "loan" → Liability
3. Check accounting conventions: Debit balances often assets, Credit often liabilities
4. Use AI to analyze context of the item name

---

## Income Statement API

### Income Statement Endpoint

```
POST /v1/process-income-statement
Content-Type: multipart/form-data
```

### Income Statement Request

Same as balance sheet - CSV file as `multipart/form-data`:

```javascript
const formData = new FormData();
formData.append('file', csvFile);

fetch('/v1/process-income-statement', {
    method: 'POST',
    body: formData
});
```

**Expected CSV Format:**

```csv
Description,Type,Amount
Product Sales,Revenue,125000
Consulting Services,Revenue,45000
Cost of Goods Sold,Expense,42000
Salaries & Wages,Expense,58000
Office Rent,Expense,24000
Utilities,Expense,3600
Marketing,Expense,8500
Professional Fees,Expense,5200
```

### Income Statement Response

**Success Response:**

```json
{
  "success": true,
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "total_items": 8,
  "items": [
    {
      "description": "Product Sales",
      "type": "revenue",
      "category": "sales",
      "amount": 125000.00,
      "confidence": 0.97
    },
    {
      "description": "Consulting Services",
      "type": "revenue",
      "category": "services",
      "amount": 45000.00,
      "confidence": 0.94
    },
    {
      "description": "Cost of Goods Sold",
      "type": "expense",
      "category": "cost_of_goods_sold",
      "amount": 42000.00,
      "confidence": 0.96
    },
    {
      "description": "Salaries & Wages",
      "type": "expense",
      "category": "salaries_wages",
      "amount": 58000.00,
      "confidence": 0.98
    },
    {
      "description": "Office Rent",
      "type": "expense",
      "category": "rent",
      "amount": 24000.00,
      "confidence": 0.99
    },
    {
      "description": "Utilities",
      "type": "expense",
      "category": "utilities",
      "amount": 3600.00,
      "confidence": 0.91
    },
    {
      "description": "Marketing",
      "type": "expense",
      "category": "marketing",
      "amount": 8500.00,
      "confidence": 0.89
    },
    {
      "description": "Professional Fees",
      "type": "expense",
      "category": "professional_fees",
      "amount": 5200.00,
      "confidence": 0.93
    }
  ],
  "revenues": {
    "items": [
      {
        "description": "Product Sales",
        "type": "revenue",
        "category": "sales",
        "amount": 125000.00,
        "confidence": 0.97
      },
      {
        "description": "Consulting Services",
        "type": "revenue",
        "category": "services",
        "amount": 45000.00,
        "confidence": 0.94
      }
    ],
    "total": 170000.00,
    "by_category": {
      "sales": 125000.00,
      "services": 45000.00,
      "interest_income": 0,
      "investment_income": 0,
      "rental_income": 0,
      "royalties": 0,
      "other_revenue": 0
    }
  },
  "expenses": {
    "items": [
      {
        "description": "Cost of Goods Sold",
        "type": "expense",
        "category": "cost_of_goods_sold",
        "amount": 42000.00,
        "confidence": 0.96
      },
      {
        "description": "Salaries & Wages",
        "type": "expense",
        "category": "salaries_wages",
        "amount": 58000.00,
        "confidence": 0.98
      }
      // ... other expense items
    ],
    "total": 141300.00,
    "by_category": {
      "cost_of_goods_sold": 42000.00,
      "salaries_wages": 58000.00,
      "rent": 24000.00,
      "utilities": 3600.00,
      "marketing": 8500.00,
      "insurance": 0,
      "depreciation": 0,
      "interest_expense": 0,
      "taxes": 0,
      "professional_fees": 5200.00,
      "office_supplies": 0,
      "travel": 0,
      "other_expenses": 0
    }
  },
  "gross_profit": 128000.00,
  "net_income": 28700.00
}
```

### Income Statement Categories

#### Revenue Categories

| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `sales` | Sales | Product sales, merchandise, goods sold |
| `services` | Services | Consulting, professional services, freelance |
| `interest_income` | Interest Income | Bank interest, loan interest received |
| `investment_income` | Investment Income | Dividends, capital gains, investment returns |
| `rental_income` | Rental Income | Property rental, equipment rental |
| `royalties` | Royalties | Licensing fees, intellectual property royalties |
| `other_revenue` | Other Revenue | **Only use if nothing else fits** |

#### Expense Categories

| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `cost_of_goods_sold` | Cost of Goods Sold | Direct product costs, materials, manufacturing |
| `salaries_wages` | Salaries & Wages | Employee salaries, wages, payroll |
| `rent` | Rent | Office rent, lease payments, coworking |
| `utilities` | Utilities | Electric, gas, water, internet, phone |
| `marketing` | Marketing | Advertising, promotions, marketing services |
| `insurance` | Insurance | Business insurance, liability, health |
| `depreciation` | Depreciation | Asset depreciation, amortization |
| `interest_expense` | Interest Expense | Loan interest, credit card interest |
| `taxes` | Taxes | Income tax expense, tax provisions |
| `professional_fees` | Professional Fees | Legal, accounting, consulting fees |
| `office_supplies` | Office Supplies | Paper, pens, supplies, small equipment |
| `travel` | Travel | Business travel, hotels, flights, meals |
| `other_expenses` | Other Expenses | **Only use if nothing else fits** |

### Income Statement AI Guidelines

**Classification Keywords:**

```python
INCOME_STATEMENT_KEYWORDS = {
    # Revenue
    "sales": ["sales", "revenue", "product", "merchandise", "goods sold"],
    "services": ["service", "consulting", "professional service", "freelance", "contract"],
    "interest_income": ["interest income", "interest earned", "bank interest"],
    "investment_income": ["dividend", "capital gain", "investment", "return on investment"],
    "rental_income": ["rental", "lease income", "property income"],
    "royalties": ["royalty", "license fee", "intellectual property"],
    
    # Expenses
    "cost_of_goods_sold": ["cogs", "cost of goods", "cost of sales", "direct cost", "materials"],
    "salaries_wages": ["salary", "wage", "payroll", "compensation", "employee"],
    "rent": ["rent", "lease", "office space", "facility"],
    "utilities": ["utility", "electric", "gas", "water", "internet", "phone", "telecom"],
    "marketing": ["marketing", "advertising", "promotion", "ads", "campaign"],
    "insurance": ["insurance", "premium", "coverage", "liability"],
    "depreciation": ["depreciation", "amortization", "asset expense"],
    "interest_expense": ["interest expense", "interest paid", "loan interest"],
    "taxes": ["tax expense", "income tax", "tax provision"],
    "professional_fees": ["legal", "accounting", "consulting", "professional", "attorney", "cpa"],
    "office_supplies": ["office supply", "supplies", "stationery"],
    "travel": ["travel", "hotel", "flight", "airfare", "meal", "entertainment"],
}
```

**Calculating Summary Fields:**
- `gross_profit` = Total Revenue - Cost of Goods Sold
- `net_income` = Total Revenue - Total Expenses

**Determining Revenue vs Expense:**
1. Check for explicit column indicating type
2. Positive amounts in a P&L context are typically revenue
3. Use keywords: "sales", "income", "revenue" → Revenue; "cost", "expense", "fee" → Expense
4. Items at the top of a P&L are often revenue; bottom items are expenses

---

## Error Handling

Both endpoints should return errors in this format:

```json
{
  "success": false,
  "error_code": "INVALID_FILE_FORMAT",
  "message": "The uploaded file is not a valid CSV",
  "details": {
    "received_type": "application/pdf"
  }
}
```

**Error Codes:**

| Error Code | Description |
|------------|-------------|
| `INVALID_FILE_FORMAT` | File is not CSV or corrupted |
| `EMPTY_FILE` | CSV has no data rows |
| `MISSING_COLUMNS` | Required columns not found |
| `PROCESSING_ERROR` | AI classification failed |
| `FILE_TOO_LARGE` | File exceeds 5MB limit |
| `NETWORK_ERROR` | Network/server error |

---

## Frontend Connection

Once the backend endpoints are ready, update `src/services/budgetApi.ts`:

### Balance Sheet - Uncomment Lines 62-76:

```typescript
export async function uploadBalanceSheet(file: File): Promise<BalanceSheetResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        // ✅ UNCOMMENT THIS BLOCK:
        const response = await fetch(`${API_BASE_URL}/v1/process-balance-sheet`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error_code: data.detail?.error_code || 'UNKNOWN_ERROR',
                message: data.detail?.message || 'An unexpected error occurred',
                details: data.detail?.details,
            };
        }
        return data as BalanceSheetData;

        // ❌ DELETE THE DEMO DATA BLOCK (lines 78-132)
    } catch (error) {
        // ... error handling stays the same
    }
}
```

### Income Statement - Uncomment Lines 152-166:

```typescript
export async function uploadIncomeStatement(file: File): Promise<IncomeStatementResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        // ✅ UNCOMMENT THIS BLOCK:
        const response = await fetch(`${API_BASE_URL}/v1/process-income-statement`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error_code: data.detail?.error_code || 'UNKNOWN_ERROR',
                message: data.detail?.message || 'An unexpected error occurred',
                details: data.detail?.details,
            };
        }
        return data as IncomeStatementData;

        // ❌ DELETE THE DEMO DATA BLOCK (lines 168-233)
    } catch (error) {
        // ... error handling stays the same
    }
}
```

---

## Testing

### Sample Balance Sheet CSV

```csv
Account Name,Type,Balance
Operating Cash Account,Asset,45000.00
Accounts Receivable,Asset,15000.00
Inventory,Asset,8500.00
Office Equipment,Asset,12000.00
Accounts Payable,Liability,6500.00
Credit Card Payable,Liability,3200.00
Sales Tax Payable,Liability,1800.00
Long-term Loan,Liability,25000.00
```

**Expected AI Classification:**
- Operating Cash Account → `asset`, `cash`
- Accounts Receivable → `asset`, `accounts_receivable`
- Inventory → `asset`, `inventory`
- Office Equipment → `asset`, `equipment`
- Accounts Payable → `liability`, `accounts_payable`
- Credit Card Payable → `liability`, `credit_cards`
- Sales Tax Payable → `liability`, `taxes_payable`
- Long-term Loan → `liability`, `long_term_debt`

### Sample Income Statement CSV

```csv
Line Item,Category,Amount
Product Revenue,Revenue,185000.00
Service Revenue,Revenue,42000.00
Cost of Goods Sold,Expense,65000.00
Employee Salaries,Expense,72000.00
Office Rent,Expense,24000.00
Utilities Expense,Expense,4200.00
Marketing & Advertising,Expense,15000.00
Legal & Professional Fees,Expense,8500.00
```

**Expected AI Classification:**
- Product Revenue → `revenue`, `sales`
- Service Revenue → `revenue`, `services`
- Cost of Goods Sold → `expense`, `cost_of_goods_sold`
- Employee Salaries → `expense`, `salaries_wages`
- Office Rent → `expense`, `rent`
- Utilities Expense → `expense`, `utilities`
- Marketing & Advertising → `expense`, `marketing`
- Legal & Professional Fees → `expense`, `professional_fees`

---

## TypeScript Interfaces Reference

The complete TypeScript interfaces are in:
- `src/types/balanceSheet.ts`
- `src/types/incomeStatement.ts`

These define the exact shape of data the frontend expects. The backend response **must match these interfaces exactly**.

---

## Questions?

Contact the frontend team if you need:
- Additional categories added
- Changes to the response format
- Clarification on any field
