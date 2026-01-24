import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, ArrowRight, FileSpreadsheet, XCircle, DollarSign, CreditCard, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { uploadBalanceSheet } from '../services/budgetApi';
import { BalanceSheetData, BalanceSheetItem } from '../types/balanceSheet';
import { useBudget } from '../context/BudgetContext';

export function BalanceSheetUploader() {
    const [isDragOver, setIsDragOver] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { balanceSheetData, setBalanceSheetData } = useBudget();

    const handleFileSelect = async (file: File) => {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError('Please upload a CSV file');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const response = await uploadBalanceSheet(file);

            if (response.success) {
                setBalanceSheetData(response);
            } else {
                setError(response.message || 'Failed to process balance sheet');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const avgConfidence = balanceSheetData?.items?.length
        ? (balanceSheetData.items.reduce((sum, t) => sum + t.confidence, 0) / balanceSheetData.items.length * 100).toFixed(1)
        : 0;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-8">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                />
                <div
                    onClick={handleClick}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={`
            relative border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer group
            ${isDragOver
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
          `}
                >
                    {processing ? (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 relative">
                                <div className="absolute inset-0 border-4 border-emerald-100 dark:border-emerald-900 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6">Analyzing Balance Sheet...</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">AI is categorizing your assets and liabilities. This may take a moment.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragOver ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
                                <Layers className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Click to upload or drag and drop</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                                Upload your balance sheet in CSV format with assets and liabilities.
                            </p>
                            <div className="mt-6 flex items-center space-x-4 text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                                <span className="flex items-center"><FileSpreadsheet className="w-4 h-4 mr-1.5" /> CSV</span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                <span>Assets</span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                <span>Liabilities</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start space-x-3"
                    >
                        <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-rose-700 dark:text-rose-300">{error}</p>
                            <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">Please check your file and try again.</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {balanceSheetData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SummaryCard
                            title="Total Assets"
                            value={balanceSheetData.assets.total}
                            icon={DollarSign}
                            color="emerald"
                        />
                        <SummaryCard
                            title="Total Liabilities"
                            value={balanceSheetData.liabilities.total}
                            icon={CreditCard}
                            color="rose"
                        />
                        <SummaryCard
                            title="Owner's Equity"
                            value={balanceSheetData.equity}
                            icon={Layers}
                            color="indigo"
                        />
                    </div>

                    {/* Items Table */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b-2 border-emerald-100 dark:border-emerald-900/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/30">
                            <div className="flex items-center space-x-2">
                                <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 p-1 rounded-full">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {balanceSheetData.total_items} Items Found
                                </h3>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    (as of {balanceSheetData.date})
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                <span className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
                                <span>{avgConfidence}% Avg Confidence</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Category</th>
                                        <th className="px-6 py-3 text-right">Value</th>
                                        <th className="px-6 py-3 w-24 text-center">Confidence</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                                    {balanceSheetData.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                                                {item.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <TypeBadge type={item.type} />
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">
                                                {item.category.replace(/_/g, ' ')}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${item.type === 'asset' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.confidence >= 0.9 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                    item.confidence >= 0.7 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                        'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                    {(item.confidence * 100).toFixed(0)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Net Worth: <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    ${balanceSheetData.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </p>
                            <button className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200">
                                View Net Worth <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
    const styles: Record<string, string> = {
        emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
        rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
        indigo: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400",
    };

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 rounded-xl hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${styles[color] || "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400"}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
        </div>
    );
}

function TypeBadge({ type }: { type: 'asset' | 'liability' }) {
    const isAsset = type === 'asset';

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isAsset
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-400'
                }`}
        >
            {isAsset ? '📈 Asset' : '📉 Liability'}
        </span>
    );
}
