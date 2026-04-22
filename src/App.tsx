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
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './context/AuthContext';
import { cn, formatCurrency } from './lib/utils';

// Components
import Dashboard from './components/Dashboard';
import Kanban from './components/Kanban';
import ClientsList from './components/ClientsList';
import DebtsList from './components/DebtsList';

type View = 'dashboard' | 'kanban' | 'clients' | 'debts';

export default function App() {
  const { user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout } = useAuth();
  const [activeView, setActiveView] = React.useState<View>('dashboard');
  const [showCreateDropdown, setShowCreateDropdown] = React.useState(false);
  const [createTrigger, setCreateTrigger] = React.useState<{ type: 'client' | 'debt', timestamp: number } | null>(null);

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200">
              <CreditCard size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">CobrançaPro CRM</h1>
            <p className="text-slate-500 mt-2 text-sm px-4">Gestão inteligente de cobranças e inadimplência</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Seu Nome</label>
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="João da Silva"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail</label>
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="exemplo@email.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Senha</label>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100 italic">
                  {authError}
                </div>
              )}

              <button
                disabled={isAuthenticating}
                type="submit"
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm tracking-wide hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70"
              >
                {isAuthenticating ? 'PROCESSANDO...' : authMode === 'login' ? 'ENTRAR NO SISTEMA' : 'CRIAR MINHA CONTA'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-4">
              <button
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                OU USAR GOOGLE LOGIN
              </button>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest text-center"
              >
                {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
              </button>
            </div>
          </div>
          
          <p className="mt-8 text-[10px] text-slate-400 text-center uppercase tracking-[0.2em]">
            Versão de Produção Portável • Vercel Ready
          </p>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Funil de Cobrança', icon: Trello },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'debts', label: 'Dívidas', icon: CreditCard },
  ];

  return (
    <div className="flex h-screen overflow-hidden font-sans text-slate-800 p-4 gap-4">
      {/* Sidebar */}
      <aside className="w-64 glass rounded-3xl flex flex-col p-6 h-full overflow-hidden shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 text-blue-600 font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <span>CobrançaPro</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1",
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

        <div className="p-4 glass rounded-2xl mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/40 backdrop-blur-sm rounded-xl mb-3 border border-white/30">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="w-8 h-8 rounded-full border border-slate-200"
              alt={user.displayName || 'User'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">Operador Admin</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden gap-4">
        {/* Header */}
        <header className="h-16 glass rounded-2xl flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-bold text-blue-900 capitalize shrink-0">
              {menuItems.find(m => m.id === activeView)?.label || activeView}
            </h2>
            <div className="max-w-md w-full relative ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar clientes, dívidas..."
                className="w-full pl-10 pr-4 py-2 bg-white/50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 relative">
            {/* Elementos removidos a pedido do usuário */}
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto glass rounded-3xl p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeView === 'dashboard' && <Dashboard />}
              {activeView === 'kanban' && <Kanban />}
              {activeView === 'clients' && <ClientsList createTrigger={createTrigger?.type === 'client' ? createTrigger.timestamp : undefined} />}
              {activeView === 'debts' && <DebtsList createTrigger={createTrigger?.type === 'debt' ? createTrigger.timestamp : undefined} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
