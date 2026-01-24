import { useState, useEffect, useMemo } from 'react';

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: string;
  platformId: string;
  elementId?: string;
  keywords: string[];
}

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Define all searchable items
  const searchableItems: SearchItem[] = useMemo(() => [
    // Dashboard items
    { 
      id: 'dashboard-overview', 
      title: 'Dashboard', 
      description: 'Financial overview and spending summary',
      category: 'Platform',
      platformId: 'dashboard',
      keywords: ['overview', 'home', 'main', 'summary', 'financial']
    },
    { 
      id: 'dashboard-total-spending', 
      title: 'Total Spending', 
      description: 'View your total spending across all categories',
      category: 'Metric',
      platformId: 'dashboard',
      elementId: 'metric-total-spending',
      keywords: ['spending', 'total', 'expenses', 'money', 'budget']
    },
    { 
      id: 'dashboard-transactions', 
      title: 'Transactions', 
      description: 'Number of processed transactions',
      category: 'Metric',
      platformId: 'dashboard',
      elementId: 'metric-transactions',
      keywords: ['transactions', 'count', 'processed', 'ai']
    },
    { 
      id: 'dashboard-top-category', 
      title: 'Top Category', 
      description: 'Your highest spending category',
      category: 'Metric',
      platformId: 'dashboard',
      elementId: 'metric-top-category',
      keywords: ['top', 'category', 'highest', 'most']
    },
    { 
      id: 'dashboard-pie-chart', 
      title: 'Spending by Category', 
      description: 'Visual breakdown of spending across categories',
      category: 'Chart',
      platformId: 'dashboard',
      elementId: 'chart-pie',
      keywords: ['pie', 'chart', 'visual', 'breakdown', 'categories', 'spending']
    },
    { 
      id: 'dashboard-monthly-trends', 
      title: 'Monthly Spending Trends', 
      description: 'Track spending patterns over time',
      category: 'Chart',
      platformId: 'dashboard',
      elementId: 'chart-monthly-trends',
      keywords: ['monthly', 'trends', 'timeline', 'history', 'patterns']
    },
    { 
      id: 'dashboard-breakdown', 
      title: 'Spending Breakdown', 
      description: 'Detailed list of spending by category',
      category: 'List',
      platformId: 'dashboard',
      elementId: 'spending-breakdown',
      keywords: ['breakdown', 'detailed', 'list', 'categories']
    },

    // Fiscal Core items
    { 
      id: 'fiscalcore', 
      title: 'Fiscal Core', 
      description: 'Upload and process financial documents',
      category: 'Platform',
      platformId: 'fiscalcore',
      keywords: ['fiscal', 'core', 'upload', 'documents', 'csv', 'balance', 'income', 'statement']
    },
    { 
      id: 'fiscalcore-balance-sheet', 
      title: 'Balance Sheet Upload', 
      description: 'Upload and process balance sheet data',
      category: 'Feature',
      platformId: 'fiscalcore',
      keywords: ['balance', 'sheet', 'upload', 'assets', 'liabilities']
    },
    { 
      id: 'fiscalcore-income-statement', 
      title: 'Income Statement Upload', 
      description: 'Upload and analyze income statement',
      category: 'Feature',
      platformId: 'fiscalcore',
      keywords: ['income', 'statement', 'revenue', 'expenses', 'profit']
    },
    { 
      id: 'fiscalcore-classifier', 
      title: 'Transaction Classifier', 
      description: 'AI-powered transaction categorization',
      category: 'Feature',
      platformId: 'fiscalcore',
      keywords: ['classifier', 'categorize', 'ai', 'transactions', 'automatic']
    },

    // Layer 2 Forecast items
    { 
      id: 'layer2', 
      title: 'Forecast', 
      description: 'Financial forecasting and predictions',
      category: 'Platform',
      platformId: 'layer2',
      keywords: ['forecast', 'predict', 'future', 'projections', 'trends', 'layer2']
    },
    { 
      id: 'layer2-predictions', 
      title: 'Financial Predictions', 
      description: 'AI-generated financial forecasts',
      category: 'Feature',
      platformId: 'layer2',
      keywords: ['predictions', 'ai', 'forecast', 'future', 'analysis']
    },
    { 
      id: 'layer2-scenarios', 
      title: 'Scenario Planning', 
      description: 'Explore different financial scenarios',
      category: 'Feature',
      platformId: 'layer2',
      keywords: ['scenario', 'planning', 'what-if', 'simulation']
    },

    // Layer 3 AI Advisor items
    { 
      id: 'layer3', 
      title: 'AI Advisor', 
      description: 'Get personalized financial advice',
      category: 'Platform',
      platformId: 'layer3',
      keywords: ['advisor', 'ai', 'advice', 'chat', 'assistant', 'help', 'layer3']
    },
    { 
      id: 'layer3-chat', 
      title: 'Financial Chat', 
      description: 'Chat with AI about your finances',
      category: 'Feature',
      platformId: 'layer3',
      keywords: ['chat', 'conversation', 'ask', 'questions', 'talk']
    },
    { 
      id: 'layer3-recommendations', 
      title: 'Recommendations', 
      description: 'Personalized financial recommendations',
      category: 'Feature',
      platformId: 'layer3',
      keywords: ['recommendations', 'suggestions', 'tips', 'advice', 'improve']
    },

    // Assets / Net Worth items
    { 
      id: 'assets', 
      title: 'Net Worth', 
      description: 'Track and value your assets',
      category: 'Platform',
      platformId: 'assets',
      keywords: ['assets', 'net worth', 'portfolio', 'valuations', 'wealth']
    },
    { 
      id: 'assets-calculator', 
      title: 'Asset Calculator', 
      description: 'Calculate total asset value',
      category: 'Feature',
      platformId: 'assets',
      keywords: ['calculator', 'value', 'total', 'worth', 'compute']
    },
    { 
      id: 'assets-breakdown', 
      title: 'Asset Breakdown', 
      description: 'Detailed breakdown of your assets',
      category: 'Feature',
      platformId: 'assets',
      keywords: ['breakdown', 'detailed', 'list', 'assets', 'portfolio']
    },
  ], []);

  // Perform search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = searchableItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const descMatch = item.description.toLowerCase().includes(query);
      const keywordMatch = item.keywords.some(kw => kw.includes(query));
      const categoryMatch = item.category.toLowerCase().includes(query);
      
      return titleMatch || descMatch || keywordMatch || categoryMatch;
    });

    setSearchResults(results);
  }, [searchQuery, searchableItems]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchOpen,
    setIsSearchOpen,
  };
}
