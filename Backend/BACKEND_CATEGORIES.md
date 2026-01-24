# Backend Integration Guide: Spending Categories 📊

This document explains the spending categories that the frontend expects from the AI classifier. Follow this guide to ensure transactions are categorized with maximum detail for small business users.

---

## Overview

The frontend displays spending data using predefined category mappings. For optimal display with icons, colors, and proper labels, the backend should return one of the **supported category values** listed below.

**API Endpoint:** `POST /v1/process`

**Response Field:** Each transaction in the `transactions` array should have a `category` field with one of the supported values.

---

## Supported Categories

The backend classifier should return **exactly these string values** (lowercase with underscores) in the `category` field:

### Business Operations
| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `advertising` | Advertising | Google Ads, Facebook Ads, print ads, billboards |
| `marketing` | Marketing | Email marketing, SEO services, promotional materials |
| `equipment` | Equipment | Tools, machinery, office equipment purchases |
| `assets` | Assets | Hardware, computers, furniture (capitalizable items) |
| `office_supplies` | Office Supplies | Paper, pens, printer ink, desk accessories |
| `software` | Software | One-time software purchases, licenses |
| `subscriptions` | Subscriptions | SaaS tools, recurring software (Slack, Zoom, etc.) |
| `inventory` | Inventory | Products for resale, raw materials |
| `shipping` | Shipping | Postage, FedEx, UPS, freight costs |
| `maintenance` | Maintenance | Repairs, cleaning services, equipment servicing |

### Facility & Overhead
| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `rent` | Rent/Lease | Office rent, equipment leases, coworking spaces |
| `housing` | Housing | Home office, residential (if applicable) |
| `utilities` | Utilities | Electric, gas, water, internet, phone |
| `insurance` | Insurance | Business insurance, liability, health |

### People & Services
| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `payroll` | Payroll | Gusto, ADP, payroll processing |
| `wages` | Wages | Direct salary/wage payments |
| `professional_services` | Professional Services | Consultants, accountants, freelancers |
| `legal` | Legal | Lawyers, legal fees, contracts |

### Financial
| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `taxes` | Taxes | Federal, state, local taxes, quarterly payments |
| `fees` | Fees & Charges | Bank fees, credit card fees, service charges |
| `financial` | Financial | General banking, financial services |
| `debt` | Debt Payment | Credit card payments, debt repayment |
| `loan` | Loan Payment | Business loan payments, SBA loans |
| `interest` | Interest | Interest charges, interest earned |

### Income (Positive Amounts)
| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `revenue` | Revenue | Sales, client payments, Stripe payouts |
| `income` | Income | General income, deposits |
| `refund` | Refund | Returned items, refunds received |
| `transfer` | Transfer | Internal transfers, owner contributions |

### Travel & Meals
| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `travel` | Travel | Flights, hotels, Airbnb, travel bookings |
| `transportation` | Transportation | Uber, Lyft, gas, parking, tolls |
| `dining_out` | Meals & Entertainment | Restaurants, client meals, team lunches |

### Other Categories
| Category Value | Display Label | Use For |
|---------------|---------------|---------|
| `groceries` | Groceries | Grocery stores, food supplies |
| `shopping` | Shopping | General retail purchases |
| `healthcare` | Healthcare | Medical expenses, pharmacy |
| `education` | Education | Courses, training, books |
| `entertainment` | Entertainment | Movies, events, recreation |
| `personal` | Personal | Personal expenses |
| `other` | Other | **Only use when nothing else fits** |

---

## Example API Response

```json
{
  "success": true,
  "total_transactions": 5,
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "FACEBOOK ADS *PAYMENT",
      "amount": -250.00,
      "category": "advertising",
      "confidence": 0.95,
      "original_category": null
    },
    {
      "date": "2024-01-16",
      "description": "GUSTO PAYROLL",
      "amount": -2500.00,
      "category": "payroll",
      "confidence": 0.98,
      "original_category": null
    },
    {
      "date": "2024-01-17",
      "description": "STRIPE PAYOUT",
      "amount": 4500.00,
      "category": "revenue",
      "confidence": 0.99,
      "original_category": null
    },
    {
      "date": "2024-01-18",
      "description": "IRS EFTPS TAX PMT",
      "amount": -1200.00,
      "category": "taxes",
      "confidence": 0.97,
      "original_category": null
    },
    {
      "date": "2024-01-19",
      "description": "AMAZON OFFICE SUPPLIES",
      "amount": -89.00,
      "category": "office_supplies",
      "confidence": 0.92,
      "original_category": null
    }
  ],
  "summary": {
    "advertising": 250.00,
    "payroll": 2500.00,
    "revenue": 4500.00,
    "taxes": 1200.00,
    "office_supplies": 89.00
  },
  "monthly_breakdown": {
    "2024-01": {
      "advertising": 250.00,
      "payroll": 2500.00,
      "revenue": 4500.00,
      "taxes": 1200.00,
      "office_supplies": 89.00
    }
  }
}
```

---

## AI Classification Guidelines

When building the AI classifier, prioritize these business-specific categories:

### High Priority Keywords → Categories

```python
CATEGORY_KEYWORDS = {
    # Advertising & Marketing
    "advertising": ["facebook ads", "google ads", "linkedin ads", "bing ads", "ad spend", "advertisement"],
    "marketing": ["mailchimp", "hubspot", "constantcontact", "marketing", "promo", "campaign"],
    
    # Payroll & Wages
    "payroll": ["gusto", "adp", "paychex", "payroll", "paycheck"],
    "wages": ["salary", "wage", "compensation", "bonus"],
    
    # Taxes & Fees
    "taxes": ["irs", "eftps", "tax", "quarterly", "state tax", "federal tax"],
    "fees": ["bank fee", "service charge", "overdraft", "wire fee", "atm fee"],
    
    # Software & Subscriptions
    "software": ["adobe", "microsoft", "license", "software"],
    "subscriptions": ["slack", "zoom", "dropbox", "notion", "figma", "asana", "monthly", "annual subscription"],
    
    # Revenue & Income
    "revenue": ["stripe", "square", "paypal", "shopify", "client payment", "invoice", "payout"],
    "refund": ["refund", "return", "credit", "chargeback reversal"],
    
    # Equipment & Assets
    "equipment": ["home depot", "lowes", "tools", "equipment"],
    "assets": ["apple store", "dell", "lenovo", "computer", "laptop", "furniture"],
    
    # Professional Services
    "professional_services": ["consulting", "contractor", "freelance", "upwork", "fiverr"],
    "legal": ["attorney", "lawyer", "legal", "law office", "paralegal"],
    
    # Facility
    "rent": ["rent", "lease", "wework", "regus", "property"],
    "utilities": ["electric", "gas", "water", "internet", "comcast", "verizon", "att"],
    "insurance": ["insurance", "geico", "state farm", "liability", "workers comp"],
}
```

---

## Fallback Behavior

If a transaction doesn't clearly match any category:

1. **Check merchant/vendor name** against known patterns
2. **Check transaction description** for keywords
3. **Check amount patterns** (large amounts → possibly assets/equipment)
4. **Use original CSV category** if provided and mappable
5. **Only use `other`** as a last resort

---

## Summary Response

The `summary` object should aggregate spending by category:

```json
{
  "summary": {
    "advertising": 500.00,
    "payroll": 5000.00,
    "rent": 1500.00,
    "utilities": 200.00,
    "other": 50.00
  }
}
```

> ⚠️ **Important:** Only include categories that have non-zero values. The frontend will filter out zero values automatically.

---

## Testing

Use the sample CSV in the repo (`test.csv`) to verify categorization. Expected mappings:

| Description | Expected Category |
|-------------|------------------|
| Main Street Properties | `rent` |
| Stripe * Payout | `revenue` |
| Adobe Systems Inc. | `software` |
| Check #104 (payroll context) | `payroll` |
| Facebook Ads | `advertising` |
| Gusto Payroll | `payroll` |
| IRS/Tax related | `taxes` |
| Legal Fees | `legal` |
| Loan Repayment | `loan` |

---

## Questions?

Contact the frontend team if you need additional categories added or have questions about the expected format.
