import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, Timestamp, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Debt, Client, DebtStatus } from '../types';
import { 
  Plus, 
  Search, 
  CreditCard, 
  Calendar, 
  DollarSign,
  X,
  Trash2,
  Edit2,
  ChevronRight,
  Filter,
  Smartphone
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DebtsListProps {
  createTrigger?: number;
}

export default function DebtsList({ createTrigger }: DebtsListProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [currentDebt, setCurrentDebt] = useState<Partial<Debt> | null>(null);

  useEffect(() => {
    if (createTrigger) {
      setCurrentDebt({ status: 'PENDING' });
      setShowModal(true);
    }
  }, [createTrigger]);

  useEffect(() => {
    const unsubscribeDebts = onSnapshot(query(collection(db, 'debts')), (snapshot) => {
      setDebts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Debt)));
    });

    const unsubscribeClients = onSnapshot(query(collection(db, 'clients')), (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });

    return () => {
      unsubscribeDebts();
      unsubscribeClients();
    };
  }, []);

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Cliente Desconhecido';
  };

  const filteredDebts = debts.filter(d => 
    getClientName(d.clientId).toLowerCase().includes(search.toLowerCase()) ||
    d.status.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDebt?.clientId || !currentDebt?.amount || !currentDebt?.dueDate || !currentDebt?.status) return;

    try {
      const { id, createdAt, ...rest } = currentDebt;
      const data = {
        ...rest,
        dueDate: Timestamp.fromDate(new Date(currentDebt.dueDate!)),
        updatedAt: serverTimestamp()
      };

      if (id) {
        const debtRef = doc(db, 'debts', id);
        await updateDoc(debtRef, data);
      } else {
        await addDoc(collection(db, 'debts'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setShowModal(false);
      setCurrentDebt(null);
    } catch (err) {
      handleFirestoreError(err, currentDebt?.id ? 'update' : 'create', 'debts');
    }
  };

  const deleteDebt = async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'debts', id));
      setShowDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, 'delete', `debts/${id}`);
    }
  };

  const handleWhatsAppClick = (clientId: string, amount: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const message = `Olá ${client.name}, este é um lembrete da sua fatura no valor de ${formatCurrency(amount)} que está em atraso. Por favor, regularize sua situação para evitar juros.`;
    const encodedMessage = encodeURIComponent(message);
    const formattedPhone = client.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const statusMap: Record<DebtStatus, { label: string, color: string }> = {
    PENDING: { label: 'A Vencer', color: 'bg-slate-100 text-slate-600' },
    OVERDUE: { label: 'Vencido', color: 'bg-red-100 text-red-600' },
    COLLECTING: { label: 'Em Cobrança', color: 'bg-amber-100 text-amber-600' },
    NEGOTIATING: { label: 'Negociando', color: 'bg-blue-100 text-blue-600' },
    PAID: { label: 'Pago', color: 'bg-emerald-100 text-emerald-600' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Carteira de Dívidas</h3>
          <p className="text-slate-500 text-sm">Controle total dos valores em aberto e recebidos.</p>
        </div>
        <button 
          onClick={() => { setCurrentDebt({ status: 'PENDING' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all font-bold"
        >
          <Plus size={18} />
          Lançar Dívida
        </button>
      </div>

      <div className="md:glass md:rounded-2xl md:border-none md:shadow-none overflow-hidden">
        <div className="p-4 border-b border-white/20 bg-white/10 backdrop-blur-md flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="max-w-md w-full relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por cliente ou status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 md:py-2 bg-white md:bg-white/50 border border-slate-200 md:border-none rounded-xl text-sm md:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 bg-white/50 md:bg-transparent hover:bg-white/80 rounded-lg transition-all md:ml-4 border md:border-none border-slate-100">
            <Filter size={14} />
            Filtrar Resultados
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Cliente / Descrição</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Valor</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Vencimento</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebts.map((debt) => (
                <tr key={debt.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{getClientName(debt.clientId)}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{debt.description || 'Sem descrição'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{formatCurrency(debt.amount)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar size={12} className="text-slate-400" />
                      {debt.dueDate ? formatDate(debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : debt.dueDate) : '---'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", statusMap[debt.status].color)}>
                      {statusMap[debt.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleWhatsAppClick(debt.clientId, debt.amount)}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Cobrar via WhatsApp"
                        >
                            <Smartphone size={16} />
                        </button>
                        <button 
                            onClick={() => { 
                                const date = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
                                setCurrentDebt({ ...debt, dueDate: date.toISOString().split('T')[0] }); 
                                setShowModal(true); 
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(debt.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100 bg-white">
          {filteredDebts.map((debt) => (
            <div key={debt.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-base">{getClientName(debt.clientId)}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{debt.description || 'Sem descrição'}</p>
                </div>
                <span className={cn("px-2 py-1 rounded-full text-[9px] font-bold uppercase shrink-0", statusMap[debt.status].color)}>
                  {statusMap[debt.status].label}
                </span>
              </div>

              <div className="flex items-center justify-between py-4 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor</label>
                  <p className="text-lg font-black text-blue-600">{formatCurrency(debt.amount)}</p>
                </div>
                <div className="text-right">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vencimento</label>
                   <div className="flex items-center gap-1.5 justify-end text-sm font-semibold text-slate-700">
                      <Calendar size={14} className="text-slate-400" />
                      {debt.dueDate ? formatDate(debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : debt.dueDate) : '---'}
                   </div>
                </div>
              </div>

              <div className="flex gap-2">
                  <button 
                    onClick={() => handleWhatsAppClick(debt.clientId, debt.amount)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 text-green-600 rounded-xl text-xs font-bold border border-green-100"
                  >
                    <Smartphone size={16} />
                    COBRAR
                  </button>
                  <button 
                    onClick={() => { 
                      const date = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
                      setCurrentDebt({ ...debt, dueDate: date.toISOString().split('T')[0] }); 
                      setShowModal(true); 
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-100"
                  >
                    <Edit2 size={16} />
                    EDITAR
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(debt.id)}
                    className="p-3 bg-red-50 text-red-500 rounded-xl border border-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
              </div>
            </div>
          ))}
        </div>

        {filteredDebts.length === 0 && (
          <div className="px-6 py-20 text-center text-slate-400 bg-white">
            <div className="flex flex-col items-center gap-3">
              <CreditCard size={48} className="opacity-20" />
              <p>Nenhuma dívida registrada</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl overflow-hidden text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Excluir Registro?</h4>
              <p className="text-slate-500 text-sm mb-6">
                Deseja realmente excluir este registro de dívida? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={() => deleteDebt(showDeleteConfirm)}
                  className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-200 text-sm"
                >
                  SIM, EXCLUIR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/50"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/20 bg-white/20">
                <h4 className="text-xl font-bold">{currentDebt?.id ? 'Editar Dívida' : 'Lançar Dívida'}</h4>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cliente</label>
                    <select 
                      required
                      value={currentDebt?.clientId || ''}
                      onChange={(e) => setCurrentDebt({...currentDebt, clientId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor (BRL)</label>
                    <div className="relative">
                        <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                        required
                        type="number" 
                        step="0.01"
                        value={currentDebt?.amount || ''}
                        onChange={(e) => setCurrentDebt({...currentDebt, amount: parseFloat(e.target.value)})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="0,00"
                        />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vencimento</label>
                    <input 
                      required
                      type="date" 
                      value={currentDebt?.dueDate || ''}
                      onChange={(e) => setCurrentDebt({...currentDebt, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status Inicial</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(statusMap) as DebtStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setCurrentDebt({...currentDebt, status})}
                          className={cn(
                            "py-2 px-1 rounded-lg text-[10px] font-bold border transition-all uppercase tracking-tighter",
                            currentDebt?.status === status 
                              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          {statusMap[status].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição / Referência</label>
                    <input 
                      type="text" 
                      value={currentDebt?.description || ''}
                      onChange={(e) => setCurrentDebt({...currentDebt, description: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Ex: Fatura Março - Pedido #123"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all font-bold"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
