import React, { useState } from 'react';
import { LayoutDashboard, FileText, TrendingUp, MessageSquare, PieChart, Menu, Bell, Search, Command, LogOut, Sparkles, Layers, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';

import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
  activeLayer: string;
  setActiveLayer: (layer: string) => void;
}

export function Layout({ children, activeLayer, setActiveLayer }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { signOut } = useAuth();

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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <motion.div
        initial={{ width: 260 }}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        className="flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm z-10"
      >
        <div className={`p-5 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <button 
            className={`flex items-center group relative ${sidebarOpen ? 'space-x-3 flex-1' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/50 group-hover:ring-2 group-hover:ring-indigo-400 dark:group-hover:ring-indigo-500 group-hover:ring-offset-2 group-hover:ring-offset-white dark:group-hover:ring-offset-slate-800 relative cursor-pointer">
              <Sparkles className="w-6 h-6 text-white transition-transform duration-200 group-hover:rotate-12" />
              
              {/* Visual indicator at bottom */}
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap ${!sidebarOpen ? 'group-hover:-bottom-3' : ''}`}>
                {sidebarOpen ? '←' : '→'}
              </div>
            </div>
            {sidebarOpen && (
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                SovereignCFO
              </span>
            )}
          </button>
        </div>

        <div className={`px-3 mb-6 ${!sidebarOpen && 'px-2'}`}>
          {sidebarOpen ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <div className="absolute right-2.5 top-2.5 hidden lg:flex items-center space-x-0.5 text-slate-400">
                <Command className="w-3 h-3" />
                <span className="text-[10px] font-medium">K</span>
              </div>
            </div>
          ) : (
            <button className="w-full p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 flex items-center justify-center">
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
          <button className="flex items-center w-full group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
              JD
            </div>
            {sidebarOpen && (
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">John Doe</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pro Plan</p>
              </div>
            )}
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        <header className="h-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 dark:from-slate-100 dark:via-indigo-200 dark:to-slate-100 bg-clip-text text-transparent tracking-tight">
                  {navItems.find(n => n.id === activeLayer)?.label || 'Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-1.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-medium">Sovereign CFO</span>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-slate-400 dark:text-slate-500">
                  {navItems.find(n => n.id === activeLayer)?.label || 'Dashboard'}
                </span>
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
