import React, { useState, useRef, Suspense } from 'react';
import { Layout } from './components/Layout';
import { FiscalCore } from './components/FiscalCore';

// Lazy-load heavy panel components for code splitting
const Layer2Forecaster = React.lazy(() =>
  import('./components/Layer2Forecaster').then(m => ({ default: m.Layer2Forecaster }))
);
const Layer3Advisor = React.lazy(() =>
  import('./components/Layer3Advisor').then(m => ({ default: m.Layer3Advisor }))
);
const AssetValuator = React.lazy(() =>
  import('./components/AssetValuator').then(m => ({ default: m.AssetValuator }))
);
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { SpendingPieChart } from './components/charts/SpendingPieChart';
import { MonthlyTrendChart } from './components/charts/MonthlyTrendChart';
import { CATEGORY_DISPLAY } from './constants/categories';
import { SpendingCategory } from './types/budget';
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, CalendarClock, TrendingUp, Upload, FileText, PieChart, BarChart3, Download, Loader2 } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './hooks/useAuth';
import { IncomeStatementDashboard } from './components/IncomeStatementDashboard';
import { RecurringExpensesCard } from './components/RecurringExpensesCard';
import { generateTransactionReport, generateIncomeStatementReport } from './services/pdfExportService';

function DashboardOverview({ onNavigate, highlightedElement, initialViewMode }: { onNavigate?: (layer: string) => void; highlightedElement?: string | null; initialViewMode?: 'transactions' | 'incomeStatement' }) {
  const { processingResult, incomeStatementData } = useBudget();

  // View mode state: 'transactions' or 'incomeStatement'
  const [viewMode, setViewMode] = useState<'transactions' | 'incomeStatement'>(initialViewMode || 'transactions');

  // PDF export state
  const [isExporting, setIsExporting] = useState(false);
  const pieChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const expenseChartRef = useRef<HTMLDivElement>(null);

  // PDF export handlers
  const handleExportTransactionPDF = async () => {
    if (!processingResult) return;
    setIsExporting(true);
    try {
      await generateTransactionReport(processingResult, {
        includeCharts: true,
        chartRefs: {
          pieChart: pieChartRef.current,
          barChart: barChartRef.current,
        },
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportIncomeStatementPDF = async () => {
    if (!incomeStatementData) return;
    setIsExporting(true);
    try {
      await generateIncomeStatementReport(incomeStatementData, {
        includeCharts: true,
        chartRefs: {
          revenueChart: revenueChartRef.current,
          expenseChart: expenseChartRef.current,
        },
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate metrics from real data
  const totalSpent = processingResult
    ? Object.values(processingResult.summary).reduce((sum, val) => sum + Math.abs(val), 0)
    : 0;

  const transactionCount = processingResult?.total_transactions || 0;

  // Find top spending category
  const topCategory = processingResult
    ? Object.entries(processingResult.summary)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]
    : null;

  // Calculate date range
  const dateRange = processingResult?.date_range;

  // If no data at all, show upload prompt
  if (!processingResult && !incomeStatementData) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financial Overview</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome! Upload your financial documents in Fiscal Core to see your insights.</p>
          </div>
        </div>

        {/* Empty State Card - Clickable to navigate to Fiscal Core */}
        <div
          onClick={() => onNavigate?.('fiscalcore')}
          className="bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl p-12 text-center cursor-pointer hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200 group"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-6 group-hover:scale-105 transition-transform">
            <Upload className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Data Yet</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
            Upload your financial documents in Fiscal Core to see your spending breakdown, balance sheet, income analysis, and more.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
            <span className="flex items-center"><FileText className="w-4 h-4 mr-1" /> Upload CSV</span>
            <span>→</span>
            <span className="flex items-center"><PieChart className="w-4 h-4 mr-1" /> View Insights</span>
          </div>
          <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline">Click here to get started →</p>
        </div>

        {/* Placeholder Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-50">
          <PlaceholderCard title="Total Spending" icon={Wallet} />
          <PlaceholderCard title="Transactions" icon={Activity} />
          <PlaceholderCard title="Top Category" icon={TrendingUp} />
          <PlaceholderCard title="Date Range" icon={CalendarClock} />
        </div>
      </div>
    );
  }

  // If viewing income statement mode and we have income statement data
  if (viewMode === 'incomeStatement' && incomeStatementData) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header with toggle button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Income Statement Analysis</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Revenue and expense breakdown from {incomeStatementData.period.start} to {incomeStatementData.period.end}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportIncomeStatementPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isExporting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Export Report</>
              )}
            </button>
            <button
              onClick={() => setViewMode('transactions')}
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg text-sm hover:bg-emerald-700 transition-colors shadow-sm flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analyze Transactions
            </button>
          </div>
        </div>

        {/* Render the Income Statement Dashboard */}
        <IncomeStatementDashboard
          data={incomeStatementData}
          highlightedElement={highlightedElement}
          revenueChartRef={revenueChartRef}
          expenseChartRef={expenseChartRef}
        />
      </div>
    );
  }

  // Default: Transaction analysis view
  // If no transaction data but has income statement, show prompt to switch
  if (!processingResult && incomeStatementData) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financial Overview</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">No transaction data available. View your income statement analysis instead.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('incomeStatement')}
              className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg text-sm hover:bg-amber-700 transition-colors shadow-sm flex items-center"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analyze Income Statement
            </button>
          </div>
        </div>

        {/* Empty State for Transactions */}
        <div
          onClick={() => onNavigate?.('fiscalcore')}
          className="bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl p-12 text-center cursor-pointer hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200 group"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-6 group-hover:scale-105 transition-transform">
            <Upload className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Transaction Data</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
            Upload your bank statements in Fiscal Core to see your transaction analysis and spending breakdown.
          </p>
          <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline">Click here to upload transactions →</p>
        </div>

        {/* Placeholder Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-50">
          <PlaceholderCard title="Total Spending" icon={Wallet} />
          <PlaceholderCard title="Transactions" icon={Activity} />
          <PlaceholderCard title="Top Category" icon={TrendingUp} />
          <PlaceholderCard title="Date Range" icon={CalendarClock} />
        </div>

        {/* Income Statement Summary Preview */}
        <IncomeStatementSummary data={incomeStatementData} />
      </div>
    );
  }

  // At this point, processingResult must exist (we've ruled out all other cases)
  if (!processingResult) {
    return null; // TypeScript guard - should never reach here
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financial Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here's your spending breakdown from {dateRange?.start} to {dateRange?.end}.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportTransactionPDF}
            disabled={isExporting}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isExporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Export Report</>
            )}
          </button>
          <button
            onClick={() => {
              if (incomeStatementData) {
                setViewMode('incomeStatement');
              } else {
                // Navigate to Fiscal Core with income statement tab
                onNavigate?.('fiscalcore-incomestatement');
              }
            }}
            className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg text-sm hover:bg-amber-700 transition-colors shadow-sm flex items-center"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Analyze Income Statement
          </button>
        </div>
      </div>


      {/* Metric Cards with Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div id="metric-total-spending" className={`transition-all duration-300 ${highlightedElement === 'metric-total-spending' ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-900 rounded-xl' : ''}`}>
          <MetricCard
            title="Total Spending"
            value={`$${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle="All categories combined"
            icon={Wallet}
            color="emerald"
          />
        </div>
        <div id="metric-transactions" className={`transition-all duration-300 ${highlightedElement === 'metric-transactions' ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-900 rounded-xl' : ''}`}>
          <MetricCard
            title="Transactions"
            value={transactionCount.toString()}
            subtitle="Processed by AI"
            icon={Activity}
            color="rose"
          />
        </div>
        <div id="metric-top-category" className={`transition-all duration-300 ${highlightedElement === 'metric-top-category' ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-900 rounded-xl' : ''}`}>
          <MetricCard
            title="Top Category"
            value={topCategory ? CATEGORY_DISPLAY[topCategory[0] as SpendingCategory]?.label || topCategory[0] : '-'}
            subtitle={topCategory ? `$${Math.abs(topCategory[1]).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
            icon={TrendingUp}
            color="emerald"
          />
        </div>
        <MetricCard
          title="Categories"
          value={Object.keys(processingResult.summary).filter(k => processingResult.summary[k as SpendingCategory] !== 0).length.toString()}
          subtitle="Spending categories"
          icon={CalendarClock}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category Pie Chart */}
        <div
          id="chart-pie"
          ref={pieChartRef}
          className={`bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800 dark:to-emerald-950/20 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-all duration-300 ${highlightedElement === 'chart-pie' ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-900' : ''}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Spending by Category</h3>
          </div>
          <SpendingPieChart summary={processingResult.summary} />
        </div>

        {/* Monthly Trends Chart */}
        <div
          id="chart-monthly-trends"
          ref={barChartRef}
          className={`bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-800 dark:to-amber-950/20 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-all duration-300 ${highlightedElement === 'chart-monthly-trends' ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-900' : ''}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Monthly Spending Trends</h3>
          </div>
          <MonthlyTrendChart monthlyBreakdown={processingResult.monthly_breakdown} />
        </div>
      </div>

      {/* Top Spending Categories */}
      <div
        id="spending-breakdown"
        className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-all duration-300 ${highlightedElement === 'spending-breakdown' ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-900' : ''}`}
      >
        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-6">Spending Breakdown</h3>
        <div className="space-y-5">
          {Object.entries(processingResult.summary)
            .filter(([_, amount]) => amount !== 0)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .map(([category, amount]) => {
              const display = CATEGORY_DISPLAY[category as SpendingCategory];
              const percentage = (Math.abs(amount) / totalSpent) * 100;
              return (
                <div key={category} className="flex items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border border-slate-200 dark:border-slate-700">
                  <span className="text-3xl mr-4 flex-shrink-0">{display?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-base text-slate-900 dark:text-slate-100">{display?.label || category}</span>
                      <span className="font-bold text-lg text-slate-900 dark:text-slate-100 ml-4">
                        ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 shadow-inner">
                      <div
                        className="h-3 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${percentage}%`, backgroundColor: display?.color }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-base font-semibold text-slate-600 dark:text-slate-300 w-14 text-right flex-shrink-0">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recurring Expenses Detection */}
      <RecurringExpensesCard transactions={processingResult.transactions} />

      {/* Income Statement Summary */}
      {incomeStatementData && (
        <IncomeStatementSummary data={incomeStatementData} />
      )}
    </div>
  );
}

function IncomeStatementSummary({ data }: { data: { revenues: { total: number }; expenses: { total: number }; net_income: number; period: { start: string; end: string } } }) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Income Statement Summary</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{data.period.start} to {data.period.end}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            +${data.revenues.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Expenses</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
            -${data.expenses.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Income</p>
          <p className={`text-xl font-bold ${data.net_income >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {data.net_income >= 0 ? '+' : ''}${data.net_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="h-10 w-10 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4" />
            <div className="h-4 w-24 bg-slate-100 dark:bg-slate-700 rounded mb-2" />
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-600 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderCard({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">{title}</p>
        <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded mt-2 animate-pulse" />
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string; subtitle?: string; icon: React.ElementType; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
    teal: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${colorClasses[color] || "bg-slate-50 text-slate-600"}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function AppContent() {
  const [activeLayer, setActiveLayer] = useState('dashboard');
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [fiscalCoreDefaultTab, setFiscalCoreDefaultTab] = useState<'transactions' | 'balancesheet' | 'incomestatement' | undefined>(undefined);
  const [dashboardInitialView, setDashboardInitialView] = useState<'transactions' | 'incomeStatement' | undefined>(undefined);

  const handleSetActiveLayer = (layer: string, elementId?: string) => {
    // Handle fiscalcore-{tab} navigation pattern
    if (layer.startsWith('fiscalcore-')) {
      const tab = layer.replace('fiscalcore-', '') as 'transactions' | 'balancesheet' | 'incomestatement';
      setFiscalCoreDefaultTab(tab);
      setActiveLayer('fiscalcore');
    } else if (layer === 'dashboard-incomestatement') {
      setDashboardInitialView('incomeStatement');
      setActiveLayer('dashboard');
    } else {
      setFiscalCoreDefaultTab(undefined);
      setDashboardInitialView(undefined); // Reset unless specifically set
      setActiveLayer(layer);
    }

    if (elementId) {
      // Wait for the component to render, then scroll and highlight
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedElement(elementId);

          // Remove highlight after 2 seconds
          setTimeout(() => {
            setHighlightedElement(null);
          }, 2000);
        }
      }, 100);
    }
  };

  const renderLayer = () => {
    switch (activeLayer) {
      case 'dashboard': return <DashboardOverview onNavigate={handleSetActiveLayer} highlightedElement={highlightedElement} initialViewMode={dashboardInitialView} />;
      case 'fiscalcore': return <FiscalCore onNavigate={handleSetActiveLayer} defaultTab={fiscalCoreDefaultTab} />;
      case 'layer2': return <Suspense fallback={<PanelSkeleton />}><Layer2Forecaster /></Suspense>;
      case 'layer3': return <Suspense fallback={<PanelSkeleton />}><Layer3Advisor /></Suspense>;
      case 'assets': return <Suspense fallback={<PanelSkeleton />}><AssetValuator /></Suspense>;
      default: return <DashboardOverview highlightedElement={highlightedElement} />;
    }
  };

  return (
    <Layout activeLayer={activeLayer} setActiveLayer={handleSetActiveLayer}>
      {renderLayer()}
    </Layout>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLoginSuccess={() => { }} />;
  }

  // Show main app if authenticated
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
}
