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
    <div className="flex h-screen overflow-hidden font-sans text-slate-800 bg-slate-50 md:p-4 md:gap-4 flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="flex items-center gap-2 text-blue-600 font-bold">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <CreditCard size={18} />
          </div>
          <span>G. Inadimplentes</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            {isMobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 px-4 pb-4 overflow-hidden"
          >
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar clientes ou dívidas..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white md:bg-white/40 md:backdrop-blur-xl md:glass md:rounded-3xl flex flex-col p-6 h-full overflow-hidden shrink-0 z-50 transition-transform duration-300 transform md:relative md:translate-x-0 md:p-6",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 hidden md:block">
          <div className="flex items-center gap-3 text-blue-600 font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <span>G. Inadimplentes</span>
          </div>
        </div>

        <nav className="flex-1 px-4 md:px-0 space-y-1 mt-8 md:mt-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id as View); setIsMobileMenuOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 md:py-3 rounded-xl text-sm font-medium transition-all mb-1",
                  activeView === item.id 
                    ? "sidebar-item-active" 
                    : "text-slate-500 hover:bg-white/50 hover:text-slate-900"
                )}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 glass md:bg-transparent rounded-2xl mt-auto border border-white/40 md:border-none">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/60 md:bg-white/40 backdrop-blur-sm rounded-xl mb-3 border border-white/50">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="w-10 h-10 md:w-8 md:h-8 rounded-full border border-white shadow-sm"
              alt={user.displayName || 'User'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">Operador Admin</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 md:py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:gap-4">
        {overdueCount > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-red-600 text-white px-6 py-2 flex items-center justify-between md:rounded-2xl"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <AlertCircle size={14} />
              Atenção: Você possui {overdueCount} {overdueCount === 1 ? 'dívida vencida' : 'dívidas vencidas'} aguardando ação.
            </div>
            <button 
              onClick={() => setActiveView('debts')}
              className="text-[10px] font-black underline underline-offset-4 hover:text-red-100"
            >
              RESOLVER AGORA
            </button>
          </motion.div>
        )}
        {/* Header (Desktop Only) */}
        <header className="hidden md:flex h-16 glass rounded-2xl items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-bold text-blue-900 capitalize shrink-0">
              {menuItems.find(m => m.id === activeView)?.label || activeView}
            </h2>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 relative">
            {/* NotificationCenter removed */}
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto glass md:rounded-3xl p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <div className="md:hidden mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {menuItems.find(m => m.id === activeView)?.label || activeView}
                </h2>
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
