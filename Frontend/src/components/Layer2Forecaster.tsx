import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle, ShieldCheck, Calendar as CalendarIcon, DollarSign, ArrowDown, ArrowUp, RefreshCw, Loader2 } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { useBudget } from '../context/BudgetContext';
import { CategorizedTransaction } from '../types/budget';
import { generateForecast, saveForecast, getLatestForecast, shouldRegenerateForecast } from '../services/forecastService';
import { ForecastResult, ForecastInsight, ChartDataPoint, ForecastWithId } from '../types/forecastTypes';
import { useAuth } from '../hooks/useAuth';

export function Layer2Forecaster() {
  const { processingResult, incomeStatementData, balanceSheetData } = useBudget();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Forecast state
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [savedForecast, setSavedForecast] = useState<ForecastWithId | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved forecast on mount
  useEffect(() => {
    if (user) {
      loadSavedForecast();
    }
  }, [user]);

  const loadSavedForecast = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const forecast = await getLatestForecast(user.uid);
      if (forecast) {
        setSavedForecast(forecast);
        // Convert saved forecast to ForecastResult format for display
        setForecastResult({
          success: true,
          forecast_id: forecast.forecastId,
          generated_at: forecast.generatedAt.toDate().toISOString(),
          data_points: forecast.dataPoints,
          metrics: forecast.metrics,
          insights: forecast.insights,
          confidence_level: forecast.confidenceLevel,
          data_sources: forecast.dataSources,
          historical_start: forecast.historicalStart,
          historical_end: forecast.historicalEnd,
          forecast_end: forecast.forecastEnd,
        });
      }
    } catch (err) {
      console.error('Failed to load saved forecast:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate new forecast
  const handleGenerateForecast = useCallback(async () => {
    if (!processingResult?.transactions || processingResult.transactions.length === 0) {
      setError('No transaction data available. Please upload a transactions CSV first.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Calculate starting balance from transactions (ending balance from last transaction)
      const sortedTransactions = [...processingResult.transactions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Use balance sheet liquid assets if available, otherwise estimate from transactions
      let currentBalance = 0;
      if (balanceSheetData?.assets?.by_category?.cash) {
        currentBalance = balanceSheetData.assets.by_category.cash;
      } else {
        // Estimate: sum of all transactions as a rough running balance
        currentBalance = processingResult.transactions.reduce((sum, t) => sum + t.amount, 0);
      }

      const result = await generateForecast(
        processingResult.transactions,
        incomeStatementData,
        balanceSheetData,
        Math.max(currentBalance, 0)
      );

      setForecastResult(result);

      // Save to Firebase if user is logged in
      if (user && result.success) {
        await saveForecast(user.uid, result, processingResult.transactions.length);
        await loadSavedForecast(); // Reload to get the saved version
      }
    } catch (err) {
      console.error('Forecast generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
    } finally {
      setIsGenerating(false);
    }
  }, [processingResult, incomeStatementData, balanceSheetData, user]);

  // Check if we should auto-generate/regenerate forecast when data changes
  useEffect(() => {
    // Skip if no data or already loading
    if (!processingResult?.transactions ||
      processingResult.transactions.length === 0 ||
      isLoading ||
      isGenerating) {
      return;
    }

    // Check if saved forecast needs regeneration based on data changes
    const needsRegeneration = shouldRegenerateForecast(
      savedForecast,
      processingResult.transactions.length,
      processingResult.date_range
    );

    // Auto-generate if:
    // 1. No forecast exists at all
    // 2. Data has changed significantly (merge/override detected)
    if (!forecastResult || needsRegeneration) {
      console.log('📊 Forecast regeneration triggered:', {
        hasExisting: !!forecastResult,
        needsRegeneration,
        transactionCount: processingResult.transactions.length,
        dateRange: processingResult.date_range
      });
      handleGenerateForecast();
    }
    // Note: We intentionally include processingResult in deps to detect CSV uploads
  }, [processingResult?.transactions?.length, processingResult?.date_range?.end, savedForecast, isLoading, isGenerating]);

  // Transform forecast data for chart
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!forecastResult?.data_points) return [];

    // Sample every few days for cleaner chart display
    const samplingInterval = Math.max(1, Math.floor(forecastResult.data_points.length / 30));

    return forecastResult.data_points
      .filter((_, idx) => idx % samplingInterval === 0 || idx === forecastResult.data_points.length - 1)
      .map(point => ({
        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: point.actual ?? undefined,
        predicted: point.predicted ?? undefined,
        upperBound: point.upper_bound ?? undefined,
        lowerBound: point.lower_bound ?? undefined,
      }));
  }, [forecastResult]);

  // Find today's reference line position
  const todayLabel = useMemo(() => {
    if (!forecastResult) return null;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return chartData.find(d => d.date === today)?.date || chartData.find(d => d.actual === undefined && d.predicted)?.date;
  }, [forecastResult, chartData]);

  // Process transactions by date for calendar
  const transactionsByDate = useMemo(() => {
    if (!processingResult?.transactions) return new Map<string, CategorizedTransaction[]>();

    const map = new Map<string, CategorizedTransaction[]>();
    processingResult.transactions.forEach(transaction => {
      const dateKey = transaction.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(transaction);
    });
    return map;
  }, [processingResult]);

  // Calculate daily totals (expenses and revenues)
  const dailyTotals = useMemo(() => {
    const totals = new Map<string, { expenses: number; revenues: number; transactions: CategorizedTransaction[] }>();

    transactionsByDate.forEach((transactions, date) => {
      let expenses = 0;
      let revenues = 0;

      transactions.forEach(t => {
        if (t.amount < 0) {
          expenses += Math.abs(t.amount);
        } else {
          revenues += t.amount;
        }
      });

      totals.set(date, { expenses, revenues, transactions });
    });

    return totals;
  }, [transactionsByDate]);

  // Generate future projections from forecast result
  const futureProjections = useMemo(() => {
    const projections = new Map<string, { projectedRevenue: number; projectedExpense: number }>();

    if (!forecastResult?.data_points) return projections;

    forecastResult.data_points.forEach(point => {
      if (point.predicted !== null) {
        // Estimate revenue/expense from projected balance change
        projections.set(point.date, {
          projectedRevenue: forecastResult.metrics.avg_daily_revenue,
          projectedExpense: forecastResult.metrics.avg_daily_expense,
        });
      }
    });

    return projections;
  }, [forecastResult]);

  // Get date range from processing result
  const dateRange = processingResult?.date_range;
  const startDate = dateRange ? new Date(dateRange.start) : null;
  const endDate = dateRange ? new Date(dateRange.end) : null;

  // Get selected date details
  const selectedDateDetails = useMemo(() => {
    if (!selectedDate) return null;
    const dateKey = selectedDate.toISOString().split('T')[0];

    // Check historical data
    const historical = dailyTotals.get(dateKey);
    if (historical) {
      return {
        type: 'historical' as const,
        ...historical,
      };
    }

    // Check future projections
    const projection = futureProjections.get(dateKey);
    if (projection) {
      return {
        type: 'projected' as const,
        expenses: projection.projectedExpense,
        revenues: projection.projectedRevenue,
        transactions: [],
      };
    }

    return null;
  }, [selectedDate, dailyTotals, futureProjections]);

  // Calendar modifiers for styling dates with transactions
  const modifiers = useMemo(() => {
    const mods: Record<string, Date[]> = {
      hasExpenses: [],
      hasRevenues: [],
      hasBoth: [],
      projected: [],
    };

    const createDateAtMidnight = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const categorizedDates = new Set<string>();

    dailyTotals.forEach(({ expenses, revenues }, dateKey) => {
      if (categorizedDates.has(dateKey)) return;

      const date = createDateAtMidnight(dateKey);
      const EXPENSE_THRESHOLD = 0.01;
      const REVENUE_THRESHOLD = 0.01;

      const hasExpenses = expenses >= EXPENSE_THRESHOLD;
      const hasRevenues = revenues >= REVENUE_THRESHOLD;

      if (hasExpenses && hasRevenues) {
        mods.hasBoth.push(date);
        categorizedDates.add(dateKey);
      } else if (hasExpenses) {
        mods.hasExpenses.push(date);
        categorizedDates.add(dateKey);
      } else if (hasRevenues) {
        mods.hasRevenues.push(date);
        categorizedDates.add(dateKey);
      }
    });

    futureProjections.forEach((_, dateKey) => {
      if (!categorizedDates.has(dateKey)) {
        const date = createDateAtMidnight(dateKey);
        mods.projected.push(date);
      }
    });

    return mods;
  }, [dailyTotals, futureProjections]);

  // Get metrics from forecast or use defaults
  const metrics = forecastResult?.metrics ?? {
    runway_months: 0,
    safety_buffer: 0,
    avg_daily_revenue: 0,
    avg_daily_expense: 0,
    avg_daily_net: 0,
    projected_end_balance: 0,
    current_balance: 0,
  };

  // Get insights from forecast or empty array
  const insights = forecastResult?.insights ?? [];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cash Flow Projection</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {forecastResult
              ? `90-Day probabilistic forecast with ${Math.round((forecastResult.confidence_level || 0.95) * 100)}% confidence interval.`
              : 'Upload transaction data to generate forecast.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Regenerate Button */}
          {processingResult?.transactions && (
            <button
              onClick={handleGenerateForecast}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </button>
          )}

          {/* Metrics Summary */}
          <div className="flex items-center space-x-6 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Runway</p>
              <p className={`text-lg font-bold ${metrics.runway_months >= 6 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {metrics.runway_months > 0 ? `${metrics.runway_months.toFixed(1)} Months` : '--'}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Safety Buffer</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {metrics.safety_buffer > 0 ? `$${metrics.safety_buffer.toLocaleString()}` : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-6">
        {isLoading || isGenerating ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{isGenerating ? 'Generating forecast...' : 'Loading...'}</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="flex gap-6">
            {/* Chart */}
            <div className="h-[400px] flex-1 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickMargin={15}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    color: '#1e293b',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                {/* Historical Data */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="url(#colorHistorical)"
                  name="Actual Balance"
                  connectNulls={false}
                />

                {/* Forecast Cone */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="#a5b4fc"
                  strokeDasharray="5 5"
                  fill="url(#colorForecast)"
                  name="Optimistic Case"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="transparent"
                  name="Projected Balance"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="#a5b4fc"
                  strokeDasharray="5 5"
                  fill="transparent"
                  name="Pessimistic Case"
                  connectNulls={false}
                />

                {todayLabel && (
                  <ReferenceLine
                    x={todayLabel}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ position: 'top', value: 'Today', fill: '#ef4444', fontSize: 12, fontWeight: 600 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
            </div>

            {/* Scenario Legend */}
            <div className="w-64 flex-shrink-0 space-y-4 pl-4 border-l border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Projection Scenarios</h4>
              
              {/* Actual Balance */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-indigo-600 rounded"></div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Actual Balance</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your historical balance based on real transactions up to today.
                </p>
              </div>

              {/* Optimistic Case */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-2" viewBox="0 0 24 2">
                    <line x1="0" y1="1" x2="24" y2="1" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="4 3" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Optimistic Case</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upper bound of the 95% confidence range—best-case if revenues trend high and expenses stay low.
                </p>
              </div>

              {/* Projected Balance */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-indigo-400 rounded"></div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Projected Balance</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Expected balance based on your recurring income and expenses.
                </p>
              </div>

              {/* Pessimistic Case */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-2" viewBox="0 0 24 2">
                    <line x1="0" y1="1" x2="24" y2="1" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="4 3" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pessimistic Case</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Lower bound—worst-case if unexpected costs arise or income dips.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Upload transaction data to generate a forecast</p>
            </div>
          </div>
        )}
      </div>

      {/* Financial Calendar Section */}
      {processingResult && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Financial Calendar</h3>
            </div>
            {dateRange && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                modifiers={modifiers}
                modifiersClassNames={{
                  hasExpenses: "!bg-rose-100 dark:!bg-rose-900/30 !text-rose-900 dark:!text-rose-100 font-medium",
                  hasRevenues: "!bg-emerald-100 dark:!bg-emerald-900/30 !text-emerald-900 dark:!text-emerald-100 font-medium",
                  hasBoth: "!bg-indigo-100 dark:!bg-indigo-900/30 !text-indigo-900 dark:!text-indigo-100 font-semibold ring-2 ring-indigo-400 dark:ring-indigo-600",
                  projected: "border-2 border-dashed border-slate-300 dark:border-slate-600",
                }}
                classNames={{
                  months: "w-full",
                  month: "w-full",
                  table: "w-full",
                  head_row: "flex w-full justify-between mb-2",
                  head_cell: "w-12 h-8 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400",
                  row: "flex w-full justify-between mb-1",
                  cell: "w-12 h-12 flex items-center justify-center p-0",
                  day: "w-10 h-10 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
                  day_selected: "!bg-indigo-600 !text-white hover:!bg-indigo-700",
                  day_today: "bg-slate-200 dark:bg-slate-700 font-semibold",
                }}
                disabled={(date: Date) => {
                  if (!startDate || !endDate) return false;
                  const minDate = new Date(startDate);
                  minDate.setDate(minDate.getDate() - 30);
                  const maxDate = new Date(endDate);
                  maxDate.setDate(maxDate.getDate() + 90);
                  return date < minDate || date > maxDate;
                }}
              />

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700"></div>
                  <span className="text-slate-600 dark:text-slate-400">Expenses Only</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700"></div>
                  <span className="text-slate-600 dark:text-slate-400">Revenues Only</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-400 dark:border-indigo-600"></div>
                  <span className="text-slate-600 dark:text-slate-400">Both</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded border-2 border-dashed border-slate-300 dark:border-slate-600"></div>
                  <span className="text-slate-600 dark:text-slate-400">Projected</span>
                </div>
              </div>
            </div>

            {/* Date Details Panel */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  {selectedDateDetails?.type === 'projected' ? 'Projected' : 'Historical'} Details
                </h4>
                {selectedDate && selectedDateDetails ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Date</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>

                    {selectedDateDetails.revenues > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center">
                            <ArrowUp className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                            {selectedDateDetails.type === 'projected' ? 'Projected Revenue' : 'Total Revenue'}
                          </span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            ${selectedDateDetails.revenues.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedDateDetails.expenses > 0 && (
                      <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-rose-700 dark:text-rose-300 flex items-center">
                            <ArrowDown className="w-4 h-4 mr-2 text-rose-600 dark:text-rose-400" />
                            {selectedDateDetails.type === 'projected' ? 'Projected Expense' : 'Total Expense'}
                          </span>
                          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                            ${selectedDateDetails.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedDateDetails.type === 'historical' && selectedDateDetails.transactions.length > 0 && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          Transactions ({selectedDateDetails.transactions.length})
                        </p>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                          {selectedDateDetails.transactions.map((t, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
                            >
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug break-words">
                                    {t.description}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 capitalize font-medium">
                                      {String(t.category).replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <span className={`text-base font-bold ${t.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDateDetails.type === 'projected' && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Based on AI analysis of historical patterns
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Select a date to view details</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insight Cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.map((insight, idx) => (
            <InsightCard
              key={idx}
              type={insight.type}
              icon={insight.type === 'warning' ? AlertTriangle : insight.type === 'success' ? TrendingUp : ShieldCheck}
              title={insight.title}
              desc={insight.description}
              metricValue={insight.metric_value}
            />
          ))}
        </div>
      )}

      {/* Fallback insights if no AI insights available */}
      {insights.length === 0 && forecastResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard
            type={metrics.runway_months < 6 ? "warning" : "success"}
            icon={metrics.runway_months < 6 ? AlertTriangle : TrendingUp}
            title={metrics.runway_months < 6 ? "Low Runway" : "Healthy Runway"}
            desc={`Current runway of ${metrics.runway_months.toFixed(1)} months ${metrics.runway_months < 6 ? 'is below recommended 6-month minimum.' : 'provides solid financial stability.'}`}
          />
          <InsightCard
            type={metrics.avg_daily_net > 0 ? "success" : "warning"}
            icon={TrendingUp}
            title={metrics.avg_daily_net > 0 ? "Positive Cash Flow" : "Negative Cash Flow"}
            desc={`Averaging $${Math.abs(metrics.avg_daily_net).toFixed(2)} ${metrics.avg_daily_net > 0 ? 'net positive' : 'net negative'} daily.`}
          />
          <InsightCard
            type="info"
            icon={ShieldCheck}
            title="Safety Buffer"
            desc={`Recommended safety buffer of $${metrics.safety_buffer.toLocaleString()} covers 3 months of expenses.`}
          />
        </div>
      )}
    </div>
  );
}

interface InsightCardProps {
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  metricValue?: string;
}

function InsightCard({ type, icon: Icon, title, desc, metricValue }: InsightCardProps) {
  const styles = {
    warning: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
    success: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100",
    info: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100",
  }[type] || "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700";

  const iconColors = {
    warning: "text-amber-600 dark:text-amber-400",
    success: "text-emerald-600 dark:text-emerald-400",
    info: "text-indigo-600 dark:text-indigo-400",
  }[type] || "text-slate-600 dark:text-slate-400";

  return (
    <div className={`p-5 rounded-xl border ${styles}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Icon className={`w-5 h-5 mr-2 ${iconColors}`} />
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        {metricValue && (
          <span className={`text-sm font-bold ${iconColors}`}>{metricValue}</span>
        )}
      </div>
      <p className="text-sm opacity-80 leading-relaxed">{desc}</p>
    </div>
  );
}
