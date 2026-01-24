import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, ArrowRight, FileSpreadsheet, AlertCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { uploadCSV } from '../services/budgetApi';
import { ProcessingResult, SpendingCategory } from '../types/budget';
import { CATEGORY_DISPLAY, getErrorMessage } from '../constants/categories';
import { useBudget } from '../context/BudgetContext';

export function Layer1Classifier() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processingResult, setProcessingResult } = useBudget();

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
      const response = await uploadCSV(file);

      if (response.success) {
        setProcessingResult(response);
      } else {
        setError(getErrorMessage(response.error_code));
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

  const avgConfidence = processingResult?.transactions?.length
    ? (processingResult.transactions.reduce((sum, t) => sum + t.confidence, 0) / processingResult.transactions.length * 100).toFixed(1)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transaction Classifier</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Upload your bank statements to automatically categorize expenses using AI.</p>
        </div>
      </div>

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
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
          `}
        >
          {processing ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6">Analyzing Transactions...</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">AI is categorizing your expenses. This may take a moment.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragOver ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Click to upload or drag and drop</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                Support for CSV, OFX, and PDF statements from major banks.
              </p>
              <div className="mt-6 flex items-center space-x-4 text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                <span className="flex items-center"><FileSpreadsheet className="w-4 h-4 mr-1.5" /> CSV</span>
                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 dark:bg-slate-600 rounded-full" />
                <span>Chase</span>
                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <span>Amex</span>
                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <span>Mercury</span>
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

      {processingResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 p-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {processingResult.total_transactions} Transactions Found
              </h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ({processingResult.date_range.start} to {processingResult.date_range.end})
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-medium bg-white dark:bg-slate-700 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
              <span>{avgConfidence}% Avg Confidence</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-100 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-6 py-3 w-32">Date</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 w-40">Category</th>
                  <th className="px-6 py-3 w-24 text-center">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {processingResult.transactions.map((transaction, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                      {new Date(transaction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-slate-100 font-medium max-w-xs truncate">
                      {transaction.description}
                    </td>
                    <td className={`px-6 py-4 text-right font-semibold ${transaction.amount < 0 ? 'text-slate-900 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <CategoryBadge category={transaction.category} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${transaction.confidence >= 0.9 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                          transaction.confidence >= 0.7 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                        {(transaction.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total Spending: <span className="font-semibold text-slate-900 dark:text-slate-100">
                ${Object.values(processingResult.summary).reduce((sum, val) => sum + Math.abs(val), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </p>
            <button className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
              View Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CategoryBadge({ category }: { category: SpendingCategory }) {
  const display = CATEGORY_DISPLAY[category] || { icon: '❓', label: category, color: '#9CA3AF' };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: `${display.color}15`,
        borderColor: `${display.color}40`,
        color: display.color
      }}
    >
      <span className="mr-1">{display.icon}</span>
      {display.label}
    </span>
  );
}
