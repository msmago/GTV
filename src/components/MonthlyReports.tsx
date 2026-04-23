import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Debt, Client, DebtStatus } from '../types';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  User,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MonthlyReports() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const unsubscribeDebts = onSnapshot(query(collection(db, 'debts')), (snapshot) => {
      setDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt)));
    });

    const unsubscribeClients = onSnapshot(query(collection(db, 'clients')), (snapshot) => {
      const clientMap: Record<string, Client> = {};
      snapshot.docs.forEach(d => {
        clientMap[d.id] = { id: d.id, ...d.data() } as Client;
      });
      setClients(clientMap);
    });

    return () => {
      unsubscribeDebts();
      unsubscribeClients();
    };
  }, []);

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  const filteredDebts = debts.filter(debt => {
    const dueDate = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
    const isSameMonth = dueDate.getMonth() === selectedDate.getMonth() && 
                        dueDate.getFullYear() === selectedDate.getFullYear();
    
    if (!isSameMonth) return false;

    const client = clients[debt.clientId];
    const nameMatch = client?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const docMatch = client?.document?.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = debt.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'ALL' || debt.status === statusFilter;

    return (nameMatch || docMatch || descMatch) && statusMatch;
  }).sort((a, b) => {
    const dateA = a.dueDate instanceof Timestamp ? a.dueDate.toDate() : new Date(a.dueDate);
    const dateB = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date(b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });

  const stats = {
    total: filteredDebts.reduce((acc, d) => acc + d.amount, 0),
    paid: filteredDebts.reduce((acc, d) => d.status === 'PAID' ? acc + d.amount : acc, 0),
    pending: filteredDebts.reduce((acc, d) => d.status !== 'PAID' ? acc + d.amount : acc, 0),
    count: filteredDebts.length,
    paidCount: filteredDebts.filter(d => d.status === 'PAID').length
  };

  const statusMap: Record<DebtStatus, { label: string, color: string, icon: any }> = {
    PENDING: { label: 'A Vencer', color: 'text-slate-500 bg-slate-50', icon: Clock },
    OVERDUE: { label: 'Vencido', color: 'text-red-500 bg-red-50', icon: AlertCircle },
    COLLECTING: { label: 'Em Cobrança', color: 'text-amber-500 bg-amber-50', icon: TrendingUp },
    PAID: { label: 'Pago', color: 'text-emerald-500 bg-emerald-50', icon: CheckCircle2 },
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Relatório Mensal</h3>
          <p className="text-slate-500 text-sm">Histórico detalhado de faturamentos e recebimentos.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
           <button 
             onClick={() => changeMonth(-1)}
             className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-blue-600"
           >
             <ChevronLeft size={20} />
           </button>
           <div className="px-4 py-1 text-center min-w-[150px]">
             <p className="text-sm font-bold text-slate-900">{MONTHS[selectedDate.getMonth()]}</p>
             <p className="text-[10px] font-black text-blue-600 tracking-widest">{selectedDate.getFullYear()}</p>
           </div>
           <button 
             onClick={() => changeMonth(1)}
             className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-blue-600"
           >
             <ChevronRight size={20} />
           </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
             <div className="p-3 bg-blue-50 text-blue-600 w-fit rounded-2xl mb-4 group-hover:scale-110 transition-transform">
               <DollarSign size={24} />
             </div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Faturado</p>
             <h4 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(stats.total)}</h4>
             <p className="text-[10px] text-slate-400 mt-2 font-medium">{stats.count} registros no mês</p>
          </div>
          <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-50/50 -rotate-12" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
             <div className="p-3 bg-emerald-50 text-emerald-600 w-fit rounded-2xl mb-4 group-hover:scale-110 transition-transform">
               <TrendingUp size={24} />
             </div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Recebido (PIX/Dinheiro)</p>
             <h4 className="text-3xl font-black text-emerald-600 mt-1">{formatCurrency(stats.paid)}</h4>
             <p className="text-[10px] text-emerald-400 mt-2 font-medium">{stats.paidCount} pagamentos concluídos</p>
          </div>
          <CheckCircle2 className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-50/50 -rotate-12" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
             <div className="p-3 bg-red-50 text-red-500 w-fit rounded-2xl mb-4 group-hover:scale-110 transition-transform">
               <TrendingDown size={24} />
             </div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Aguardando Recebimento</p>
             <h4 className="text-3xl font-black text-red-500 mt-1">{formatCurrency(stats.pending)}</h4>
             <p className="text-[10px] text-red-400 mt-2 font-medium">{stats.count - stats.paidCount} pendências</p>
          </div>
          <AlertCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-red-50/50 -rotate-12" />
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
             <FileText size={20} className="text-slate-400" />
             <h4 className="font-bold text-slate-800">Registros de {MONTHS[selectedDate.getMonth()]}</h4>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Pesquisar registros..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
             </div>
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-500 outline-none"
             >
                <option value="ALL">Todos Status</option>
                <option value="PENDING">A Vencer</option>
                <option value="OVERDUE">Vencidos</option>
                <option value="COLLECTING">Em Cobrança</option>
                <option value="PAID">Pagos</option>
             </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="px-6 py-4">Devedor</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Data Venc.</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Última Atualiz.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDebts.map((debt) => {
                const client = clients[debt.clientId];
                const StatusIcon = statusMap[debt.status].icon;
                const updatedAt = debt.updatedAt instanceof Timestamp ? debt.updatedAt.toDate() : new Date(debt.updatedAt);
                
                return (
                  <tr key={debt.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-none mb-1">{client?.name || '---'}</p>
                          <p className="text-[10px] text-slate-400">{client?.document || 'Sem documento'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs text-slate-600 line-clamp-1">{debt.description || 'Sem descrição'}</p>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs font-medium text-slate-500">{formatDate(debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : debt.dueDate)}</p>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-black text-slate-900">{formatCurrency(debt.amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                       <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider", statusMap[debt.status].color)}>
                          <StatusIcon size={12} />
                          {statusMap[debt.status].label}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-[10px] text-slate-400">{updatedAt.toLocaleString('pt-BR')}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredDebts.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300">
               <FileText size={48} className="opacity-10 mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
