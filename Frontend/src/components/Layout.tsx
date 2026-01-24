import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, FileText, TrendingUp, MessageSquare, PieChart, Menu, Bell, Search, Command, LogOut, Sparkles, Layers, BarChart3, ArrowRight, User, Settings, X, Mail, Lock, Calendar, Edit2, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';
import { SearchResults } from './SearchResults';
import { useSearch } from '../hooks/useSearch';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
  activeLayer: string;
  setActiveLayer: (layer: string, elementId?: string) => void;
}

export function Layout({ children, activeLayer, setActiveLayer }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { searchQuery, setSearchQuery, searchResults, isSearchOpen, setIsSearchOpen } = useSearch();
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsSearchOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape to close search
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen, setSearchQuery]);

  const handleSearchResultClick = (item: { platformId: string; elementId?: string }) => {
    setActiveLayer(item.platformId, item.elementId);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const navigateToFirstResult = () => {
    if (searchResults.length > 0) {
      handleSearchResultClick(searchResults[0]);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigateToFirstResult();
    }
  };

  // Get today's date in Eastern Time (Ontario)
  const getTodayDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      timeZone: 'America/Toronto',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fiscalcore', label: 'Fiscal Core', icon: FileText },
    { id: 'layer2', label: 'Forecast', icon: TrendingUp },
    { id: 'layer3', label: 'AI Advisor', icon: MessageSquare },
    { id: 'assets', label: 'Net Worth', icon: PieChart },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to sign out", error);
    }
  };

  // Get user's first name from display name or email
  const getUserFirstName = () => {
    if (!user) return '';
    
    // Try to get from displayName first
    if (user.displayName) {
      return user.displayName.split(' ')[0];
    }
    
    // Fallback to email username
    if (user.email) {
      return user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1);
    }
    
    return 'User';
  };

  // Get possessive form of name
  const getPossessiveName = () => {
    const firstName = getUserFirstName();
    if (!firstName) return '';
    
    // If name ends with 's', just add apostrophe
    if (firstName.toLowerCase().endsWith('s')) {
      return `${firstName}'`;
    }
    // Otherwise add 's
    return `${firstName}'s`;
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <motion.div
        initial={{ width: 260 }}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        className="flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm z-10"
      >
        <div className={`p-5 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className={`flex items-center ${sidebarOpen ? 'space-x-3 flex-1' : ''}`}>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex-shrink-0 group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/50 group-hover:ring-2 group-hover:ring-indigo-400 dark:group-hover:ring-indigo-500 group-hover:ring-offset-2 group-hover:ring-offset-white dark:group-hover:ring-offset-slate-800 relative cursor-pointer animate-gradient bg-[length:200%_200%]">
                <Sparkles className="w-6 h-6 text-white transition-transform duration-200 group-hover:rotate-12" />
                
                {/* Visual indicator at bottom */}
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap ${!sidebarOpen ? 'group-hover:-bottom-3' : ''}`}>
                  {sidebarOpen ? '←' : '→'}
                </div>
              </div>
            </button>
            {sidebarOpen && (
              <button
                onClick={() => setActiveLayer('dashboard')}
                className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                OnlyFinances.ai
              </button>
            )}
          </div>
        </div>

        <div className={`px-3 mb-6 ${!sidebarOpen && 'px-2'}`} ref={searchRef}>
          {sidebarOpen ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button
                onClick={navigateToFirstResult}
                disabled={searchResults.length === 0}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 transition-colors rounded"
                title="Go to first result (Enter)"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              {isSearchOpen && (
                <SearchResults
                  results={searchResults}
                  query={searchQuery}
                  onSelectResult={handleSearchResultClick}
                  onClose={() => setIsSearchOpen(false)}
                />
              )}
            </div>
          ) : (
            <button 
              onClick={() => {
                setSidebarOpen(true);
                setIsSearchOpen(true);
              }}
              className="w-full p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 flex flex-col">
          <p className={`px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ${!sidebarOpen && 'hidden'}`}>
            Platform
          </p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveLayer(item.id)}
              className={`
                w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200
                ${sidebarOpen ? 'px-3 py-2.5' : 'p-2.5 justify-center'}
                ${activeLayer === item.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'}
              `}
            >
              <item.icon className={`w-5 h-5 ${activeLayer === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} ${sidebarOpen ? 'mr-3' : ''}`} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 mt-auto mb-2 ${sidebarOpen ? 'px-3 py-2.5' : 'p-2.5 justify-center'}`}
          >
            <LogOut className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </nav>

        <div className={`p-4 border-t border-slate-100 dark:border-slate-700 ${!sidebarOpen && 'flex justify-center'}`}>
          <button 
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center w-full group hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg p-2 -m-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
              {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
            </div>
            {sidebarOpen && (
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {user?.displayName || (user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || 'No email'}</p>
              </div>
            )}
          </button>
        </div>
      </motion.div>

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setProfileModalOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-28 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500 animate-gradient bg-[length:200%_200%] rounded-t-2xl">
              <button
                onClick={() => setProfileModalOpen(false)}
                className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-6 transform translate-y-1/2">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl ring-4 ring-white dark:ring-slate-800">
                    {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <button className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pt-12 px-6 pb-5">
              {/* Profile Header */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {user?.displayName || (user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Member since {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'recently'}
                </p>
              </div>

              {/* Account Information */}
              <div className="space-y-2 mb-4">
                {/* Display Name */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <div className="flex items-center gap-2.5 flex-1">
                    <User className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Display Name</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {user?.displayName || 'Not set'}
                      </p>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Email Row */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Primary Email */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Primary Email</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {user?.email || 'No email'}
                        </p>
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex-shrink-0">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Secondary Email */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Secondary</p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic truncate">
                          Not set
                        </p>
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex-shrink-0">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                  <div className="flex items-center gap-2.5 flex-1">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Password</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        ••••••••
                      </p>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-medium rounded-lg transition-colors text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setProfileModalOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        <header className="h-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 dark:from-slate-100 dark:via-indigo-200 dark:to-slate-100 bg-clip-text text-transparent tracking-tight">
                  {getPossessiveName()} {navItems.find(n => n.id === activeLayer)?.label || 'Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-1.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-medium">{getTodayDate()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 md:space-x-4">
            <ThemeToggle />
            <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
