import React from 'react';
import { 
  Users, 
  LayoutDashboard, 
  CreditCard, 
  Trello, 
  Bell, 
  Settings, 
  LogOut,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  AlertCircle,
  MessageSquare,
  Filter,
  Menu,
  BarChart3,
  X as CloseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useAuth } from './context/AuthContext';
import { cn, formatCurrency } from './lib/utils';

// Components
import Dashboard from './components/Dashboard';
import Kanban from './components/Kanban';
import ClientsList from './components/ClientsList';
import DebtsList from './components/DebtsList';
import NotificationCenter from './components/NotificationCenter';
import SettingsView from './components/Settings';
import MonthlyReports from './components/MonthlyReports';

type View = 'dashboard' | 'kanban' | 'clients' | 'debts' | 'settings' | 'reports';

export default function App() {
  const { user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout } = useAuth();
  const [activeView, setActiveView] = React.useState<View>('dashboard');
  const [showCreateDropdown, setShowCreateDropdown] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [createTrigger, setCreateTrigger] = React.useState<{ type: 'client' | 'debt', timestamp: number } | null>(null);
  const [overdueCount, setOverdueCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, 'debts'), where('status', '==', 'OVERDUE')), (snap) => {
      setOverdueCount(snap.size);
    });
    return () => unsub();
  }, [user]);

  // Auth States
  const [authMode, setAuthMode] = React.useState<'login' | 'signup'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Erro na autenticação');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCreateAction = (type: 'client' | 'debt') => {
    setActiveView(type === 'client' ? 'clients' : 'debts');
    setCreateTrigger({ type, timestamp: Date.now() });
    setShowCreateDropdown(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-white font-sans flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Branding & Context */}
        <div className="md:w-1/2 bg-blue-600 p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-12">
              <div className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <CreditCard size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight">G. Inadimplentes</span>
            </div>
            
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-6xl md:text-7xl font-bold leading-[0.9] tracking-tighter mb-8"
            >
              GESTÃO DE <br />
              <span className="text-blue-200 uppercase">COBRANÇAS</span> <br />
              SIMPLIFICADA.
            </motion.h1>
            
            <p className="text-blue-100 max-w-md text-lg leading-relaxed opacity-80">
              Pipeline inteligente e controle total da sua inadimplência em um só lugar.
            </p>
          </div>

          {/* Footer content removed */}

          {/* Abstract Decorations */}
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] opacity-50 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full blur-[100px] opacity-30 -translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:w-1/2 p-8 md:p-24 flex flex-col justify-center bg-slate-50/50">
          <div className="max-w-[400px] w-full mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p className="text-slate-500 mb-10">
                {authMode === 'login' 
                  ? 'Acesse sua conta para gerenciar suas cobranças.' 
                  : 'Comece hoje mesmo a organizar suas finanças.'}
              </p>

              <form onSubmit={handleAuth} className="space-y-5">
                {authMode === 'signup' && (
                  <div className="group">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 transition-colors group-focus-within:text-blue-600">Seu Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm group-focus-within:shadow-md"
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                )}
                
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 transition-colors group-focus-within:text-blue-600">E-mail Corporativo</label>
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm group-focus-within:shadow-md"
                    placeholder="voce@empresa.com.br"
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 transition-colors group-focus-within:text-blue-600">Senha de Acesso</label>
                  <input 
                    required
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm group-focus-within:shadow-md"
                    placeholder="••••••••"
                  />
                </div>

                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-semibold border border-red-100 flex items-center gap-3"
                  >
                    <AlertCircle size={16} />
                    {authError}
                  </motion.div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    disabled={isAuthenticating}
                    type="submit"
                    className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-wide hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 disabled:opacity-70 flex items-center justify-center gap-3"
                  >
                    {isAuthenticating ? (
                       <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : null}
                    {authMode === 'login' ? 'ACESSAR MINHA CONTA' : 'FINALIZAR MEU CADASTRO'}
                  </button>

                  <button
                    onClick={loginWithGoogle}
                    type="button"
                    className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    LOGIN COM GOOGLE
                  </button>
                </div>
              </form>

              <div className="mt-12 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {authMode === 'login' ? 'Ainda não é membro?' : 'Já possui acesso?'}
                </p>
                <button
                  onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(null); }}
                  className="px-6 py-2.5 border-2 border-blue-100 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-50 hover:border-blue-200 transition-all uppercase tracking-wider"
                >
                  {authMode === 'login' ? 'Cadastrar Agora' : 'Fazer Login'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Funil de Cobrança', icon: Trello },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'debts', label: 'Dívidas', icon: CreditCard },
    { id: 'reports', label: 'Relatórios Mensais', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex h-[100dvh] w-full md:overflow-hidden font-sans text-slate-800 bg-[#f8fafc] flex-col md:flex-row">
      
      {/* Mobile Top Header (Branding) */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-white z-50 shrink-0">
        <div className="flex items-center gap-2 text-blue-600 font-bold">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
            <CreditCard size={20} />
          </div>
          <span className="tracking-tight text-slate-900">G. Inadimplentes</span>
        </div>
        <div className="flex items-center gap-3">
          <img 
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            alt={user.displayName || 'User'}
            onClick={() => setActiveView('settings')}
          />
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-72 bg-white flex-col p-6 h-full overflow-hidden shrink-0 z-50 border-r border-slate-200">
        <div className="p-4 mb-4">
          <div className="flex items-center gap-3 text-blue-600 font-bold text-xl">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-200 transition-transform hover:scale-105 active:scale-95 cursor-default">
              <CreditCard size={22} />
            </div>
            <span className="tracking-tight text-slate-900">Management</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[13px] font-bold transition-all mb-1",
                  activeView === item.id 
                    ? "sidebar-item-active shadow-xl shadow-blue-500/10" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 rounded-3xl mt-auto bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-2xl mb-4 shadow-sm border border-slate-100">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="w-10 h-10 rounded-full border border-white shadow-sm"
              alt={user.displayName || 'User'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-slate-900">{user.displayName}</p>
              <p className="text-[9px] text-slate-400 truncate uppercase tracking-widest font-black">Admin Mode</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 py-3 text-xs font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all uppercase tracking-widest"
          >
            <LogOut size={16} />
            Sair agora
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-6 flex items-center justify-between z-50 safe-area-inset-bottom">
        {menuItems.slice(0, 4).map((item) => { // Show first 4 most important
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                isActive ? "text-blue-600" : "text-slate-400"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive ? "bg-blue-50" : ""
              )}>
                <Icon size={20} weight={isActive ? "fill" : "regular"} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setActiveView('settings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeView === 'settings' ? "text-blue-600" : "text-slate-400"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all",
            activeView === 'settings' ? "bg-blue-50" : ""
          )}>
            <Settings size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Ajustes</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 md:overflow-hidden md:p-6 pb-24 md:pb-6 relative h-full">
        {overdueCount > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-red-600 text-white px-6 py-3 flex items-center justify-between md:rounded-[1.5rem] mb-4 shadow-xl shadow-red-200 transition-all hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest">
              <AlertCircle size={16} />
              Atenção: {overdueCount} {overdueCount === 1 ? 'dívida vencida' : 'dívidas vencidas'} aguardando ação.
            </div>
            <button 
              onClick={() => setActiveView('debts')}
              className="text-[10px] font-black bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all"
            >
              RESOLVER AGORA
            </button>
          </motion.div>
        )}
        
        {/* Header (Desktop Only) */}
        <header className="hidden md:flex h-20 items-center justify-between px-2 shrink-0 mb-6">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              {menuItems.find(m => m.id === activeView)?.label || activeView}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform group-hover:scale-110"
                alt={user.displayName || 'User'}
              />
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-2 touch-pan-y">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-full"
            >
              <div className="md:hidden mt-4 mb-8 px-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                  {menuItems.find(m => m.id === activeView)?.label || activeView}
                </h2>
                <div className="w-12 h-1.5 bg-blue-600 rounded-full mt-3" />
              </div>
              {activeView === 'dashboard' && <Dashboard />}
              {activeView === 'kanban' && <Kanban searchTerm={searchTerm} />}
              {activeView === 'clients' && <ClientsList searchTerm={searchTerm} createTrigger={createTrigger?.type === 'client' ? createTrigger.timestamp : undefined} />}
              {activeView === 'debts' && <DebtsList searchTerm={searchTerm} createTrigger={createTrigger?.type === 'debt' ? createTrigger.timestamp : undefined} />}
              {activeView === 'reports' && <MonthlyReports />}
              {activeView === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
