import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Layer2Forecaster } from './components/Layer2Forecaster';
import { Layer3Advisor } from './components/Layer3Advisor';
import { AssetValuator } from './components/AssetValuator';
import { FiscalCore } from './components/FiscalCore';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { SpendingPieChart } from './components/charts/SpendingPieChart';
import { MonthlyTrendChart } from './components/charts/MonthlyTrendChart';
import { CATEGORY_DISPLAY } from './constants/categories';
import { SpendingCategory } from './types/budget';
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, CalendarClock, TrendingUp, Upload, FileText, PieChart } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './hooks/useAuth';

function DashboardOverview({ onNavigate }: { onNavigate?: (layer: string) => void }) {
  const { processingResult, incomeStatementData } = useBudget();

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

  // If no data, show upload prompt
  if (!processingResult) {
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
          className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl p-12 text-center cursor-pointer hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 group"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-6 group-hover:scale-105 transition-transform">
            <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
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
          <p className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline">Click here to get started →</p>
        </div>

        {/* Placeholder Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-50">
          <PlaceholderCard title="Total Spending" icon={Wallet} />
          <PlaceholderCard title="Transactions" icon={Activity} />
          <PlaceholderCard title="Top Category" icon={TrendingUp} />
          <PlaceholderCard title="Date Range" icon={CalendarClock} />
        </div>

        {/* Income Statement Preview */}
        {incomeStatementData && (
          <IncomeStatementSummary data={incomeStatementData} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financial Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here's your spending breakdown from {dateRange?.start} to {dateRange?.end}.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            Export Report
          </button>
        </div>
      </div>

      {/* Metric Cards with Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Spending"
          value={`$${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="All categories combined"
          icon={Wallet}
          color="indigo"
        />
        <MetricCard
          title="Transactions"
          value={transactionCount.toString()}
          subtitle="Processed by AI"
          icon={Activity}
          color="rose"
        />
        <MetricCard
          title="Top Category"
          value={topCategory ? CATEGORY_DISPLAY[topCategory[0] as SpendingCategory]?.label || topCategory[0] : '-'}
          subtitle={topCategory ? `$${Math.abs(topCategory[1]).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
          icon={TrendingUp}
          color="emerald"
        />
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Spending by Category</h3>
          </div>
          <SpendingPieChart summary={processingResult.summary} />
        </div>

        {/* Monthly Trends Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Monthly Spending Trends</h3>
          </div>
          <MonthlyTrendChart monthlyBreakdown={processingResult.monthly_breakdown} />
        </div>
      </div>

      {/* Top Spending Categories */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Spending Breakdown</h3>
        <div className="space-y-4">
          {Object.entries(processingResult.summary)
            .filter(([_, amount]) => amount !== 0)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, 6)
            .map(([category, amount]) => {
              const display = CATEGORY_DISPLAY[category as SpendingCategory];
              const percentage = (Math.abs(amount) / totalSpent) * 100;
              return (
                <div key={category} className="flex items-center">
                  <span className="text-2xl mr-3">{display?.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{display?.label || category}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: display?.color }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-sm text-slate-500 dark:text-slate-400 w-12 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Income Statement Summary */}
      {incomeStatementData && (
        <IncomeStatementSummary data={incomeStatementData} />
      )}
    </div>
  );
}

function IncomeStatementSummary({ data }: { data: { revenues: { total: number }; expenses: { total: number }; net_income: number; period: { start: string; end: string } } }) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
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
          <p className={`text-xl font-bold ${data.net_income >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {data.net_income >= 0 ? '+' : ''}${data.net_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
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
    indigo: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400",
    rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
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

  const renderLayer = () => {
    switch (activeLayer) {
      case 'dashboard': return <DashboardOverview onNavigate={setActiveLayer} />;
      case 'fiscalcore': return <FiscalCore />;
      case 'layer2': return <Layer2Forecaster />;
      case 'layer3': return <Layer3Advisor />;
      case 'assets': return <AssetValuator />;
      default: return <DashboardOverview />;
    }
  };

  return (
    <Layout activeLayer={activeLayer} setActiveLayer={setActiveLayer}>
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
          <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
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
