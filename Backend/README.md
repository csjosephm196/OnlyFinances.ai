# Budget AI API 🤖💰

AI-powered budgeting and financial analysis API built with FastAPI.

## 🌐 Live Demo

**Production API:** https://demo-backend-bqyy.onrender.com

**Interactive API Docs:** https://demo-backend-bqyy.onrender.com/docs

## ✨ Features

### 📊 CSV Transaction Processing (`POST /v1/process`)
Upload bank statement CSV files and get AI-powered spending categorization:
- Automatically parses various bank CSV formats
- Uses **Gemini 2.5 Flash** to categorize transactions into 14 spending categories
- Returns spending summaries and monthly breakdowns for visualization

### 📈 Financial Forecasting (`POST /v1/forecast`)
Generate financial forecasts based on historical spending patterns.

### 💡 Financial Advice (`POST /v1/advise`)
Get personalized financial advice and recommendations.

### 🔬 Stress Testing (`POST /v1/stress-test`)
Run financial stress tests to evaluate resilience.

### 📋 Tax Analysis (`POST /v1/tax-analysis`)
Analyze tax optimization opportunities.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Demo-Backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Running Locally

```bash
# Start the development server
python -m uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000/docs to view the interactive API documentation.

## 📡 API Documentation

Once running, access the interactive Swagger UI at:
- **Local:** http://localhost:8000/docs
- **Production:** https://demo-backend-bqyy.onrender.com/docs

### Example: Process a CSV File

```bash
curl -X POST "https://demo-backend-bqyy.onrender.com/v1/process" \
  -H "accept: application/json" \
  -F "file=@bank_statement.csv"
```

**Response:**
```json
{
  "success": true,
  "total_transactions": 45,
  "date_range": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  },
  "transactions": [...],
  "summary": {
    "groceries": 450.00,
    "dining_out": 200.00,
    "housing": 1500.00
  },
  "monthly_breakdown": {
    "2026-01": {
      "groceries": 450.00,
      "dining_out": 200.00
    }
  }
}
```

## 📁 Spending Categories

| Category | Description |
|----------|-------------|
| 🏠 housing | Rent, mortgage, property taxes |
| 🛒 groceries | Supermarkets, food stores |
| 🍽️ dining_out | Restaurants, cafes, food delivery |
| 🚗 transportation | Gas, transit, rideshare, parking |
| 💡 utilities | Electric, water, internet, phone |
| 🎬 entertainment | Movies, streaming, games |
| 🛍️ shopping | Clothing, electronics, retail |
| 💊 healthcare | Medical, pharmacy, insurance |
| 📚 education | Tuition, books, courses |
| 💰 subscriptions | Monthly recurring services |
| 🏦 financial | Bank fees, transfers, investments |
| ✈️ travel | Hotels, flights, vacation |
| 🎁 personal | Gifts, personal care, hobbies |
| ❓ other | Uncategorized |

## 🛠️ Tech Stack

- **Framework:** FastAPI
- **AI:** Google Gemini 2.5 Flash
- **Validation:** Pydantic
- **Deployment:** Render

## 📄 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | No |
| `DEBUG` | Enable debug mode | No |

## 📝 License

MIT