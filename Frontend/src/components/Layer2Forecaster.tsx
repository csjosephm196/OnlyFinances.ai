import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle, ShieldCheck, Calendar as CalendarIcon, DollarSign, ArrowDown, ArrowUp } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { useBudget } from '../context/BudgetContext';
import { CategorizedTransaction } from '../types/budget';

export function Layer2Forecaster() {
  const { processingResult, incomeStatementData } = useBudget();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Process transactions by date
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

  // Generate future projections (next 90 days)
  const futureProjections = useMemo(() => {
    const projections = new Map<string, { projectedRevenue: number; projectedExpense: number }>();
    const today = new Date();
    
    // Calculate average daily revenue and expense from historical data
    let totalRevenue = 0;
    let totalExpense = 0;
    let dayCount = 0;
    
    dailyTotals.forEach(({ expenses, revenues }) => {
      totalRevenue += revenues;
      totalExpense += expenses;
      dayCount++;
    });
    
    const avgDailyRevenue = dayCount > 0 ? totalRevenue / dayCount : 0;
    const avgDailyExpense = dayCount > 0 ? totalExpense / dayCount : 0;
    
    // Generate projections for next 90 days
    for (let i = 1; i <= 90; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dateKey = futureDate.toISOString().split('T')[0];
      
      // Add some variance to projections (±20%)
      const variance = 0.8 + Math.random() * 0.4;
      projections.set(dateKey, {
        projectedRevenue: avgDailyRevenue * variance,
        projectedExpense: avgDailyExpense * variance,
      });
    }
    
    return projections;
  }, [dailyTotals]);

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
  // Make sure dates are only in ONE category (mutually exclusive)
  const modifiers = useMemo(() => {
    const mods: Record<string, Date[]> = {
      hasExpenses: [],
      hasRevenues: [],
      hasBoth: [],
      projected: [],
    };
    
    // Helper to create a date at midnight local time (to match calendar behavior)
    const createDateAtMidnight = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    // Track dates that have been categorized to avoid duplicates
    const categorizedDates = new Set<string>();
    
    dailyTotals.forEach(({ expenses, revenues }, dateKey) => {
      // Skip if already categorized
      if (categorizedDates.has(dateKey)) return;
      
      // Create date at midnight local time
      const date = createDateAtMidnight(dateKey);
      
      // Categorize: check for BOTH first, then individual
      // Use threshold to avoid floating point issues (0.01 = 1 cent)
      const EXPENSE_THRESHOLD = 0.01;
      const REVENUE_THRESHOLD = 0.01;
      
      const hasExpenses = expenses >= EXPENSE_THRESHOLD;
      const hasRevenues = revenues >= REVENUE_THRESHOLD;
      
      if (hasExpenses && hasRevenues) {
        // Has BOTH expenses and revenues
        mods.hasBoth.push(date);
        categorizedDates.add(dateKey);
      } else if (hasExpenses) {
        // ONLY expenses (revenues are below threshold or zero)
        mods.hasExpenses.push(date);
        categorizedDates.add(dateKey);
      } else if (hasRevenues) {
        // ONLY revenues (expenses are below threshold or zero)
        mods.hasRevenues.push(date);
        categorizedDates.add(dateKey);
      }
    });
    
    futureProjections.forEach((_, dateKey) => {
      // Only add if not already in historical data
      if (!categorizedDates.has(dateKey)) {
        const date = createDateAtMidnight(dateKey);
        mods.projected.push(date);
      }
    });
    
    return mods;
  }, [dailyTotals, futureProjections]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cash Flow Projection</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">90-Day probabilistic forecast model with 95% confidence interval.</p>
        </div>
        <div className="flex items-center space-x-6 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Runway</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">14.2 Months</p>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Safety Buffer</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">$24,500</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-6">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                tickFormatter={(value) => `$${value/1000}k`}
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
              />

              {/* Forecast Cone */}
              <Area 
                type="monotone" 
                dataKey="upperBound" 
                stroke="#a5b4fc" 
                strokeDasharray="5 5"
                fill="url(#colorForecast)" 
                name="Optimistic Case"
              />
              <Area 
                type="monotone" 
                dataKey="lowerBound" 
                stroke="#a5b4fc"
                strokeDasharray="5 5"
                fill="transparent" 
                name="Pessimistic Case"
              />

              <ReferenceLine x="Nov 01" stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: '#ef4444', fontSize: 12, fontWeight: 600 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard 
          type="warning"
          icon={AlertTriangle}
          title="Liquidity Risk Detected"
          desc="Large tax payment ($12k) due in 45 days. Current projection shows buffer dipping below 10% threshold."
        />
        <InsightCard 
          type="success"
          icon={TrendingUp}
          title="Positive Momentum"
          desc="MRR growth trending at +8% MoM. Outperforming baseline model by 2.3%."
        />
        <InsightCard 
          type="info"
          icon={ShieldCheck}
          title="Safe to Spend"
          desc="You can safely deploy up to $5,200 this month without impacting your 6-month runway."
        />
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
                className="rounded-lg border border-slate-200 dark:border-slate-700"
                modifiers={modifiers}
                modifiersClassNames={{
                  hasExpenses: "!bg-rose-100 dark:!bg-rose-900/30 !text-rose-900 dark:!text-rose-100 font-medium",
                  hasRevenues: "!bg-emerald-100 dark:!bg-emerald-900/30 !text-emerald-900 dark:!text-emerald-100 font-medium",
                  hasBoth: "!bg-indigo-100 dark:!bg-indigo-900/30 !text-indigo-900 dark:!text-indigo-100 font-semibold ring-2 ring-indigo-400 dark:ring-indigo-600",
                  projected: "border-2 border-dashed border-slate-300 dark:border-slate-600",
                }}
                classNames={{
                  day: "relative",
                }}
                disabled={(date) => {
                  // Disable dates outside the range (past start date - 30 days to end date + 90 days)
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
                                {/* Transaction Description */}
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug break-words">
                                    {t.description}
                                  </p>
                                </div>
                                
                                {/* Category and Amount Row */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 capitalize font-medium">
                                      {t.category.replace(/_/g, ' ')}
                                    </span>
                                    {t.original_category && t.original_category !== t.category && (
                                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                        (was {t.original_category.replace(/_/g, ' ')})
                                      </span>
                                    )}
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
                          Based on historical averages with variance
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
    </div>
  );
}

function InsightCard({ type, icon: Icon, title, desc }: any) {
  const styles = {
    warning: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 icon-amber-600 dark:icon-amber-400",
    success: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 icon-emerald-600 dark:icon-emerald-400",
    info: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 icon-indigo-600 dark:icon-indigo-400",
  }[type as string] || "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700";

  const iconColor = styles.split(' ').find(c => c.startsWith('icon-'))?.replace('icon-', 'text-');

  return (
    <div className={`p-5 rounded-xl border ${styles}`}>
      <div className="flex items-center mb-3">
        <Icon className={`w-5 h-5 mr-2 ${iconColor}`} />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <p className="text-sm opacity-80 leading-relaxed">{desc}</p>
    </div>
  );
}

const data = [
  { date: 'Oct 01', actual: 45000 },
  { date: 'Oct 08', actual: 48000 },
  { date: 'Oct 15', actual: 42000 },
  { date: 'Oct 22', actual: 51000 },
  { date: 'Oct 29', actual: 54000 },
  { date: 'Nov 01', actual: 53000, upperBound: 53000, lowerBound: 53000 },
  { date: 'Nov 08', upperBound: 58000, lowerBound: 49000 },
  { date: 'Nov 15', upperBound: 62000, lowerBound: 47000 },
  { date: 'Nov 22', upperBound: 66000, lowerBound: 45000 },
  { date: 'Nov 29', upperBound: 72000, lowerBound: 42000 },
  { date: 'Dec 06', upperBound: 78000, lowerBound: 40000 },
];
