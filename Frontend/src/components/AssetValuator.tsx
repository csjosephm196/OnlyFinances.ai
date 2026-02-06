import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'motion/react';
import { DollarSign, CreditCard, Layers, Upload } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';

export function AssetValuator() {
  const { balanceSheetData } = useBudget();

  // Use uploaded data if available, otherwise use demo data
  const assets = balanceSheetData?.assets.items.map(item => ({
    name: item.name,
    value: item.value,
    color: getAssetColor(item.category),
  })) || [
      { name: 'Cash', value: 53000, color: '#10b981' },
      { name: 'Receivables', value: 12500, color: '#059669' },
      { name: 'Hardware', value: 8400, color: '#f59e0b' },
    ];

  const liabilities = balanceSheetData?.liabilities.items.map(item => ({
    name: item.name,
    value: item.value,
    color: getLiabilityColor(item.category),
  })) || [
      { name: 'Credit Cards', value: 4200, color: '#f43f5e' },
      { name: 'Tax Payable', value: 12000, color: '#e11d48' },
    ];

  const totalAssets = balanceSheetData?.assets.total || assets.reduce((a, b) => a + b.value, 0);
  const totalLiabilities = balanceSheetData?.liabilities.total || liabilities.reduce((a, b) => a + b.value, 0);
  const equity = balanceSheetData?.equity || (totalAssets - totalLiabilities);

  const hasUploadedData = !!balanceSheetData;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Balance Sheet</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {hasUploadedData
              ? `Real-time valuation as of ${balanceSheetData.date}.`
              : 'Real-time valuation of assets versus liabilities. Upload a balance sheet for real data.'}
          </p>
        </div>
        {!hasUploadedData && (
          <div className="flex items-center space-x-2 text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
            <Upload className="w-3.5 h-3.5" />
            <span>Using Demo Data</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Assets" value={totalAssets} icon={DollarSign} color="emerald" />
        <StatCard title="Total Liabilities" value={totalLiabilities} icon={CreditCard} color="rose" />
        <StatCard title="Owner's Equity" value={equity} icon={Layers} color="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Accounting Equation Visualizer */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-8">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Accounting Equation</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Assets = Liabilities + Equity</p>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                <span>Assets (Uses of Capital)</span>
                <span>${totalAssets.toLocaleString()}</span>
              </div>
              <div className="h-12 w-full bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-emerald-500 flex items-center justify-center text-white font-medium text-sm relative group"
                >
                  <span className="drop-shadow-sm">Total Assets</span>
                </motion.div>
              </div>
            </div>

            <div className="flex items-center justify-center text-slate-300 dark:text-slate-600">
              <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
              <span className="px-4 text-xl font-light">=</span>
              <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                <span>Sources of Capital</span>
                <span>${totalAssets.toLocaleString()}</span>
              </div>
              <div className="h-12 w-full bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex">
                {/* Liabilities Bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalLiabilities / totalAssets) * 100}%` }}
                  className="h-full bg-rose-500 flex items-center justify-center text-white font-medium text-sm border-r border-white/20"
                >
                  {((totalLiabilities / totalAssets) * 100) > 15 && <span className="drop-shadow-sm">Liabilities</span>}
                </motion.div>

                {/* Equity Bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(equity / totalAssets) * 100}%` }}
                  className="h-full bg-emerald-500 flex items-center justify-center text-white font-medium text-sm"
                >
                  <span className="drop-shadow-sm">Equity</span>
                </motion.div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-400 dark:text-slate-500">
                <span>{((totalLiabilities / totalAssets) * 100).toFixed(1)}% Lev.</span>
                <span>{((equity / totalAssets) * 100).toFixed(1)}% Own.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Breakdown */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-8">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Asset Composition</h3>
          <div className="flex items-center">
            <div className="h-[200px] w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assets}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    cornerRadius={4}
                    stroke="none"
                  >
                    {assets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#334155', fontWeight: 500 }}
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3 pl-4">
              {assets.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm group cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full mr-2.5 transition-transform group-hover:scale-110" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAssetColor(category: string): string {
  const colors: Record<string, string> = {
    cash: '#10b981',
    accounts_receivable: '#059669',
    inventory: '#0d9488',
    prepaid_expenses: '#14b8a6',
    equipment: '#f59e0b',
    property: '#14b8a6',
    investments: '#06b6d4',
    intangible_assets: '#14b8a6',
    other_assets: '#64748b',
  };
  return colors[category] || '#64748b';
}

function getLiabilityColor(category: string): string {
  const colors: Record<string, string> = {
    accounts_payable: '#f43f5e',
    credit_cards: '#dc2626',
    short_term_debt: '#ea580c',
    accrued_expenses: '#d97706',
    taxes_payable: '#e11d48',
    long_term_debt: '#be123c',
    deferred_revenue: '#b45309',
    other_liabilities: '#64748b',
  };
  return colors[category] || '#64748b';
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const styles = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
    teal: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400",
  }[color as string]

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 rounded-xl hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${styles}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        ${value.toLocaleString()}
      </p>
    </div>
  );
}
