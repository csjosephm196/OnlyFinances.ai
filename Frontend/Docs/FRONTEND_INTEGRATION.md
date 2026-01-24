# Frontend Integration Guide: CSV Processing API 📊

This document explains how to integrate with the **Budget AI CSV Processing API** to upload bank statements and display categorized spending data.

---

## 🌐 API Endpoints

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://demo-backend-bqyy.onrender.com` |
| **Local Dev** | `http://localhost:8000` |

**Interactive API Docs:** https://demo-backend-bqyy.onrender.com/docs

---

## 📤 Upload CSV Endpoint

### `POST /v1/process`

Uploads a bank statement CSV file and returns AI-categorized transactions with spending summaries.

---

## 🔧 TypeScript Interfaces

Copy these interfaces into your frontend project:

```typescript
// types/budget.ts

export type SpendingCategory =
  | 'housing'
  | 'groceries'
  | 'dining_out'
  | 'transportation'
  | 'utilities'
  | 'entertainment'
  | 'shopping'
  | 'healthcare'
  | 'education'
  | 'subscriptions'
  | 'financial'
  | 'travel'
  | 'personal'
  | 'other';

export interface CategorizedTransaction {
  date: string;              // Format: "YYYY-MM-DD"
  description: string;       // e.g., "WALMART GROCERY #1234"
  amount: number;            // Negative for expenses, positive for income
  category: SpendingCategory;
  confidence: number;        // 0.0 to 1.0 (AI confidence score)
  original_category: string | null;
}

export interface DateRange {
  start: string;  // "YYYY-MM-DD"
  end: string;    // "YYYY-MM-DD"
}

export interface ProcessingResult {
  success: true;
  total_transactions: number;
  date_range: DateRange;
  transactions: CategorizedTransaction[];
  summary: Record<SpendingCategory, number>;           // Category -> total spent
  monthly_breakdown: Record<string, Record<SpendingCategory, number>>; // "YYYY-MM" -> Category -> amount
}

export interface ProcessingError {
  success: false;
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ProcessingResponse = ProcessingResult | ProcessingError;
```

---

## 📁 Category Display Mapping

Use this for displaying categories with icons:

```typescript
// constants/categories.ts

export const CATEGORY_DISPLAY: Record<SpendingCategory, { icon: string; label: string; color: string }> = {
  housing: { icon: '🏠', label: 'Housing', color: '#8B5CF6' },
  groceries: { icon: '🛒', label: 'Groceries', color: '#10B981' },
  dining_out: { icon: '🍽️', label: 'Dining Out', color: '#F59E0B' },
  transportation: { icon: '🚗', label: 'Transportation', color: '#3B82F6' },
  utilities: { icon: '💡', label: 'Utilities', color: '#6366F1' },
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#EC4899' },
  shopping: { icon: '🛍️', label: 'Shopping', color: '#14B8A6' },
  healthcare: { icon: '💊', label: 'Healthcare', color: '#EF4444' },
  education: { icon: '📚', label: 'Education', color: '#8B5CF6' },
  subscriptions: { icon: '💰', label: 'Subscriptions', color: '#F97316' },
  financial: { icon: '🏦', label: 'Financial', color: '#64748B' },
  travel: { icon: '✈️', label: 'Travel', color: '#0EA5E9' },
  personal: { icon: '🎁', label: 'Personal', color: '#D946EF' },
  other: { icon: '❓', label: 'Other', color: '#9CA3AF' },
};
```

---

## 🚀 Implementation Examples

### React + Fetch API

```typescript
// services/budgetApi.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://demo-backend-bqyy.onrender.com';

export async function uploadCSV(file: File): Promise<ProcessingResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/v1/process`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header - browser will set it with boundary
    });

    const data = await response.json();

    if (!response.ok) {
      // API returns error details in response body
      return {
        success: false,
        error_code: data.detail?.error_code || 'UNKNOWN_ERROR',
        message: data.detail?.message || 'An unexpected error occurred',
        details: data.detail?.details,
      };
    }

    return data as ProcessingResult;
  } catch (error) {
    return {
      success: false,
      error_code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network request failed',
    };
  }
}
```

### React Component Example

```tsx
// components/CSVUploader.tsx

import { useState, useCallback } from 'react';
import { uploadCSV, ProcessingResult, ProcessingError } from '@/services/budgetApi';

export function CSVUploader() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const response = await uploadCSV(file);

    setIsLoading(false);

    if (response.success) {
      setResult(response);
    } else {
      setError(response.message);
    }
  }, []);

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={isLoading}
      />
      
      {isLoading && <p>Processing your transactions...</p>}
      
      {error && <p className="error">{error}</p>}
      
      {result && (
        <div>
          <h3>Processed {result.total_transactions} transactions</h3>
          <p>Date range: {result.date_range.start} to {result.date_range.end}</p>
          
          {/* Display summary */}
          <h4>Spending Summary</h4>
          <ul>
            {Object.entries(result.summary).map(([category, amount]) => (
              <li key={category}>
                {CATEGORY_DISPLAY[category].icon} {CATEGORY_DISPLAY[category].label}: ${amount.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Next.js with Axios

```typescript
// services/budgetApi.ts

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://demo-backend-bqyy.onrender.com',
});

export async function uploadCSV(file: File): Promise<ProcessingResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const { data } = await api.post<ProcessingResult>('/v1/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const detail = error.response.data.detail;
      return {
        success: false,
        error_code: detail?.error_code || 'API_ERROR',
        message: detail?.message || 'Failed to process file',
        details: detail?.details,
      };
    }
    return {
      success: false,
      error_code: 'NETWORK_ERROR',
      message: 'Network request failed',
    };
  }
}
```

---

## 📊 Using the Data for Charts

### Pie Chart Data (Summary)

```typescript
// Transform summary for a pie chart library (e.g., Chart.js, Recharts)

function getSummaryChartData(summary: Record<SpendingCategory, number>) {
  return Object.entries(summary).map(([category, amount]) => ({
    name: CATEGORY_DISPLAY[category as SpendingCategory].label,
    value: amount,
    color: CATEGORY_DISPLAY[category as SpendingCategory].color,
  }));
}

// Example output:
// [
//   { name: 'Groceries', value: 450.00, color: '#10B981' },
//   { name: 'Housing', value: 1500.00, color: '#8B5CF6' },
//   ...
// ]
```

### Monthly Trend Data (Line/Bar Chart)

```typescript
// Transform monthly_breakdown for trend charts

function getMonthlyTrendData(
  monthlyBreakdown: Record<string, Record<SpendingCategory, number>>
) {
  const months = Object.keys(monthlyBreakdown).sort();
  
  return months.map(month => ({
    month,
    ...monthlyBreakdown[month],
    total: Object.values(monthlyBreakdown[month]).reduce((a, b) => a + b, 0),
  }));
}

// Example output:
// [
//   { month: '2026-01', groceries: 450, housing: 1500, total: 2150 },
//   { month: '2026-02', groceries: 380, housing: 1500, total: 2050 },
// ]
```

---

## ⚠️ Error Handling

The API returns structured errors. Handle these error codes:

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| `INVALID_FILE_TYPE` | Not a CSV file | "Please upload a CSV file" |
| `FILE_TOO_LARGE` | File exceeds 5MB | "File is too large. Maximum size is 5MB" |
| `EMPTY_FILE` | File has no content | "The uploaded file is empty" |
| `PARSE_ERROR` | CSV format issues | "Unable to read the CSV file. Please check the format" |
| `PROCESSING_ERROR` | Server error | "Something went wrong. Please try again" |

```typescript
function getErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    INVALID_FILE_TYPE: 'Please upload a CSV file',
    FILE_TOO_LARGE: 'File is too large. Maximum size is 5MB',
    EMPTY_FILE: 'The uploaded file is empty',
    PARSE_ERROR: 'Unable to read the CSV file. Please check the format',
    PROCESSING_ERROR: 'Something went wrong. Please try again',
    NETWORK_ERROR: 'Unable to connect to the server. Check your internet connection',
  };
  return messages[errorCode] || 'An unexpected error occurred';
}
```

---

## 🧪 Testing the API

### Using Swagger UI
1. Go to https://demo-backend-bqyy.onrender.com/docs
2. Click on `POST /v1/process`
3. Click "Try it out"
4. Upload a test CSV file
5. Click "Execute"

### Sample CSV Format

The API accepts CSVs with these column patterns:
```csv
Date,Description,Amount
2026-01-15,WALMART GROCERY #1234,-85.50
2026-01-16,SHELL GAS STATION,-45.00
2026-01-17,NETFLIX.COM,-15.99
```

Or with different column names:
```csv
Transaction Date,Memo,Debit,Credit
01/15/2026,AMAZON PURCHASE,129.99,
01/16/2026,PAYROLL DEPOSIT,,2500.00
```

---

## 🔒 CORS Configuration

The backend allows requests from:
- `http://localhost:3000` (local Next.js)
- `http://localhost:5173` (local Vite)
- Production frontend URL (configured in Render)

If you get CORS errors, contact the backend team to add your frontend URL.

---

## 📞 Support

- **API Issues:** Check the `/v1/health` endpoint to verify the API is online
- **Backend Repo:** [Link to backend repo]
- **Questions:** Reach out to the backend team

---

## 🚀 Quick Checklist

- [ ] Add API base URL to environment variables (`NEXT_PUBLIC_API_URL`)
- [ ] Copy TypeScript interfaces to your project
- [ ] Implement file upload with FormData
- [ ] Handle loading/error/success states
- [ ] Display spending summary with charts
- [ ] Show monthly breakdown for trends
- [ ] Handle all error codes gracefully
