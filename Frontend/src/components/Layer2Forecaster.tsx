import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export function Layer2Forecaster() {
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
