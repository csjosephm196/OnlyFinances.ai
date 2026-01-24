import React from 'react';
import { Search, ArrowRight, Hash, LayoutDashboard, FileText, TrendingUp, MessageSquare, PieChart } from 'lucide-react';
import { SearchItem } from '../hooks/useSearch';

interface SearchResultsProps {
  results: SearchItem[];
  query: string;
  onSelectResult: (item: SearchItem) => void;
  onClose: () => void;
}

export function SearchResults({ results, query, onSelectResult, onClose }: SearchResultsProps) {
  if (!query.trim()) {
    return null;
  }

  const highlightText = (text: string, highlight: string) => {
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={index} className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Platform': return 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300';
      case 'Feature': return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300';
      case 'Metric': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300';
      case 'Chart': return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300';
      case 'List': return 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case 'dashboard': return LayoutDashboard;
      case 'fiscalcore': return FileText;
      case 'layer2': return TrendingUp;
      case 'layer3': return MessageSquare;
      case 'assets': return PieChart;
      default: return LayoutDashboard;
    }
  };

  const getPlatformName = (platformId: string) => {
    switch (platformId) {
      case 'dashboard': return 'Dashboard';
      case 'fiscalcore': return 'Fiscal Core';
      case 'layer2': return 'Forecast';
      case 'layer3': return 'AI Advisor';
      case 'assets': return 'Net Worth';
      default: return platformId;
    }
  };

  // Group results by platform
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.platformId]) {
      acc[result.platformId] = [];
    }
    acc[result.platformId].push(result);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  // Sort platforms: Platform items first, then others
  const sortedPlatforms = Object.entries(groupedResults).sort((a, b) => {
    const aHasPlatform = a[1].some(item => item.category === 'Platform');
    const bHasPlatform = b[1].some(item => item.category === 'Platform');
    if (aHasPlatform && !bHasPlatform) return -1;
    if (!aHasPlatform && bHasPlatform) return 1;
    return 0;
  });

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-[32rem] overflow-y-auto">
      {results.length === 0 ? (
        <div className="p-8 text-center">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">No results found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Try searching for platforms, features, or metrics</p>
        </div>
      ) : (
        <>
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {results.length} {results.length === 1 ? 'Result' : 'Results'} across {Object.keys(groupedResults).length} {Object.keys(groupedResults).length === 1 ? 'platform' : 'platforms'}
            </p>
          </div>
          <div className="py-2">
            {sortedPlatforms.map(([platformId, platformResults]) => {
              const PlatformIcon = getPlatformIcon(platformId);
              const platformName = getPlatformName(platformId);
              
              // Separate platform items from features/metrics/etc
              const platformItems = platformResults.filter(r => r.category === 'Platform');
              const otherItems = platformResults.filter(r => r.category !== 'Platform');

              return (
                <div key={platformId} className="mb-1">
                  {/* Platform Header */}
                  <div className="px-4 py-1.5 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <PlatformIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        {platformName}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        ({platformResults.length})
                      </span>
                    </div>
                  </div>

                  {/* Platform Items */}
                  {platformItems.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onSelectResult(result);
                        onClose();
                      }}
                      className="w-full px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-between group text-left border-l-2 border-indigo-500"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getCategoryColor(result.category)}`}>
                            {result.category}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {highlightText(result.title, query)}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate pl-0.5">
                          {highlightText(result.description, query)}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-3" />
                    </button>
                  ))}

                  {/* Other Items (Features, Metrics, Charts, Lists) */}
                  {otherItems.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onSelectResult(result);
                        onClose();
                      }}
                      className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between group text-left pl-6"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getCategoryColor(result.category)}`}>
                            {result.category}
                          </span>
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {highlightText(result.title, query)}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate pl-0.5">
                          {highlightText(result.description, query)}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-3" />
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
