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
  AlertCircle,
  Download
} from 'lucide-react';
import { cn, formatCurrency, formatDate, exportToExcel } from '../lib/utils';
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
    const cityMatch = client?.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = debt.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'ALL' || debt.status === statusFilter;

    return (nameMatch || docMatch || cityMatch || descMatch) && statusMatch;
  }).sort((a, b) => {
    const dateA = a.dueDate instanceof Timestamp ? a.dueDate.toDate() : new Date(a.dueDate);
    const dateB = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date(b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });

  const handleExport = () => {
    const dataToExport = filteredDebts.map(debt => ({
      Devedor: clients[debt.clientId]?.name || '---',
      Documento: clients[debt.clientId]?.document || '---',
      Cidade: clients[debt.clientId]?.city || '---',
      Descricao: debt.description || '---',
      Vencimento: formatDate(debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : debt.dueDate),
      Valor: debt.amount,
      Status: statusMap[debt.status].label
    }));
    
    const fileName = `Relatorio_${MONTHS[selectedDate.getMonth()]}_${selectedDate.getFullYear()}`;
    exportToExcel(dataToExport, fileName);
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Relatório Mensal</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Check-up completo de movimentações</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleExport}
            className="flex items-center justify-center gap-3 px-5 py-4 bg-white text-slate-900 rounded-[1.5rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-900/5 hover:bg-slate-50 transition-all border border-slate-100 active:scale-95"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <div className="flex items-center gap-2 glass p-1.5 rounded-[1.5rem] shadow-xl shadow-blue-900/5">
           <button 
             onClick={() => changeMonth(-1)}
             className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-blue-600 shadow-sm md:shadow-none"
           >
             <ChevronLeft size={20} />
           </button>
           <div className="px-6 py-1 text-center min-w-[160px]">
             <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{MONTHS[selectedDate.getMonth()]}</p>
             <p className="text-[10px] font-black text-blue-600 tracking-[0.2em]">{selectedDate.getFullYear()}</p>
           </div>
           <button 
             onClick={() => changeMonth(1)}
             className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-blue-600 shadow-sm md:shadow-none"
           >
             <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>

    {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden group border-none shadow-2xl shadow-blue-900/5">
          <div className="relative z-10">
             <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-slate-200">
               <DollarSign size={28} />
             </div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2">Total Faturado</p>
             <h4 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">{formatCurrency(stats.total)}</h4>
             <div className="mt-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stats.count} Registros</p>
             </div>
          </div>
          <DollarSign className="absolute -right-6 -bottom-6 w-40 h-40 text-slate-900/5 -rotate-12" />
        </div>

        <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden group border-none shadow-2xl shadow-blue-900/5">
          <div className="relative z-10">
             <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-emerald-100">
               <TrendingUp size={28} />
             </div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2">Total Recebido</p>
             <h4 className="text-4xl font-black text-emerald-600 leading-none tracking-tighter">{formatCurrency(stats.paid)}</h4>
             <div className="mt-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{stats.paidCount} Pagos</p>
             </div>
          </div>
          <CheckCircle2 className="absolute -right-6 -bottom-6 w-40 h-40 text-emerald-500/5 -rotate-12" />
        </div>

        <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden group border-none shadow-2xl shadow-blue-900/5">
          <div className="relative z-10">
             <div className="w-14 h-14 bg-red-500 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-red-100">
               <TrendingDown size={28} />
             </div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2">Pendente</p>
             <h4 className="text-4xl font-black text-red-500 leading-none tracking-tighter">{formatCurrency(stats.pending)}</h4>
             <div className="mt-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">{stats.count - stats.paidCount} Em aberto</p>
             </div>
          </div>
          <AlertCircle className="absolute -right-6 -bottom-6 w-40 h-40 text-red-500/5 -rotate-12" />
        </div>
      </div>

      {/* Main Records */}
      <div className="space-y-4">
        <div className="glass p-2 rounded-[2rem] flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por devedor ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/50 border border-transparent rounded-[1.5rem] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-6 py-4 bg-white/80 border-none rounded-[1.5rem] text-xs font-black text-slate-500 outline-none uppercase tracking-widest appearance-none min-w-[180px] text-center"
          >
            <option value="ALL">TODOS STATUS</option>
            <option value="PENDING">A VENCER</option>
            <option value="OVERDUE">VENCIDOS</option>
            <option value="COLLECTING">COBRANÇA</option>
            <option value="PAID">PAGOS</option>
          </select>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block glass rounded-[2.5rem] overflow-hidden border-none shadow-2xl shadow-blue-900/5">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Devedor & Origem</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Lançamento</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Vencimento</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Valor</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDebts.map((debt) => {
                const client = clients[debt.clientId];
                const StatusIcon = statusMap[debt.status].icon;
                
                return (
                  <tr key={debt.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-900 tracking-tight leading-none mb-1">{client?.name || '---'}</p>
                          <div className="flex items-center gap-2">
                             {client?.city && (
                               <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">{client.city}</p>
                             )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{debt.description || 'LANÇAMENTO ÚNICO'}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-black text-slate-700">{formatDate(debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : debt.dueDate)}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-lg font-black text-slate-900">{formatCurrency(debt.amount)}</p>
                    </td>
                    <td className="px-8 py-6">
                       <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] shadow-sm bg-white", statusMap[debt.status].color)}>
                          <StatusIcon size={12} strokeWidth={3} />
                          {statusMap[debt.status].label}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4 px-2">
          {filteredDebts.map((debt) => {
             const client = clients[debt.clientId];
             const StatusIcon = statusMap[debt.status].icon;
             return (
               <div key={debt.id} className="glass p-6 rounded-[2.5rem] border-none shadow-xl shadow-blue-900/5">
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0">
                      <p className="text-lg font-black text-slate-900 tracking-tight leading-none truncate mb-1">{client?.name || '---'}</p>
                      {client?.city && <p className="text-[9px] font-black text-blue-500 uppercase italic leading-none">{client.city}</p>}
                    </div>
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm bg-white shrink-0", statusMap[debt.status].color)}>
                        <StatusIcon size={10} strokeWidth={3} />
                        {statusMap[debt.status].label}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-50">
                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Valor Parcela</label>
                       <p className="text-lg font-black text-blue-600 leading-none">{formatCurrency(debt.amount)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-50 text-right">
                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Vencimento</label>
                       <p className="text-xs font-black text-slate-900 leading-none">{formatDate(debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : debt.dueDate)}</p>
                    </div>
                  </div>

                  {debt.description && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 truncate"><span className="text-slate-400 mr-2">REF:</span>{debt.description}</p>
                    </div>
                  )}
               </div>
             );
          })}
        </div>

        {filteredDebts.length === 0 && (
          <div className="py-20 glass rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 border-none shadow-xl shadow-blue-900/5">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <FileText size={40} className="opacity-20" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro para este período</p>
          </div>
        )}
      </div>
    </div>
  );
}
