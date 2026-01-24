import React, { useState } from 'react';
import { FileText, Layers, BarChart3 } from 'lucide-react';
import { Layer1Classifier } from './Layer1Classifier';
import { BalanceSheetUploader } from './BalanceSheetUploader';
import { IncomeStatementUploader } from './IncomeStatementUploader';

type FiscalTab = 'transactions' | 'balancesheet' | 'incomestatement';

interface TabConfig {
    id: FiscalTab;
    label: string;
    icon: React.ElementType;
}

interface FiscalCoreProps {
    onNavigate?: (layer: string) => void;
}

const TABS: TabConfig[] = [
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'balancesheet', label: 'Balance Sheet', icon: Layers },
    { id: 'incomestatement', label: 'Income Statement', icon: BarChart3 },
];

export function FiscalCore({ onNavigate }: FiscalCoreProps = {}) {
    const [activeTab, setActiveTab] = useState<FiscalTab>('transactions');

    const getTabContent = () => {
        switch (activeTab) {
            case 'transactions':
                return {
                    title: 'Transaction Classifier',
                    description: 'Upload your bank statements to automatically categorize expenses using AI.',
                };
            case 'balancesheet':
                return {
                    title: 'Balance Sheet',
                    description: 'Upload your balance sheet CSV to analyze assets and liabilities using AI.',
                };
            case 'incomestatement':
                return {
                    title: 'Income Statement',
                    description: 'Upload your income statement CSV to analyze revenue and expenses using AI.',
                };
            default:
                return {
                    title: 'Fiscal Core',
                    description: 'Upload and manage your financial documents with AI-powered analysis.',
                };
        }
    };

    const { title, description } = getTabContent();

    const renderContent = () => {
        switch (activeTab) {
            case 'transactions':
                return <Layer1Classifier onNavigate={onNavigate} />;
            case 'balancesheet':
                return <BalanceSheetUploader />;
            case 'incomestatement':
                return <IncomeStatementUploader />;
            default:
                return <Layer1Classifier onNavigate={onNavigate} />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {description}
                    </p>
                </div>

                {/* Tab Buttons */}
                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                  ${isActive
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }
                `}
                            >
                                <Icon className={`w-4 h-4 mr-1.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" key={activeTab}>
                {renderContent()}
            </div>
        </div>
    );
}
