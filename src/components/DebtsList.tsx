import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, Timestamp, deleteDoc, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Debt, Client, DebtStatus, SystemSettings } from '../types';
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
import WhatsAppModal from './WhatsAppModal';

interface DebtsListProps {
  createTrigger?: number;
  searchTerm?: string;
}

export default function DebtsList({ createTrigger, searchTerm = '' }: DebtsListProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [search, setSearch] = useState(searchTerm);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    setSearch(searchTerm);
  }, [searchTerm]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [currentDebt, setCurrentDebt] = useState<Partial<Debt> | null>(null);
  const [whatsappData, setWhatsappData] = useState<{ isOpen: boolean; clientName: string; phone: string; amount: number } | null>(null);

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

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'pix_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SystemSettings);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();

    return () => {
      unsubscribeDebts();
      unsubscribeClients();
    };
  }, []);

  const getClientData = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const getClientName = (clientId: string) => {
    return getClientData(clientId)?.name || 'Cliente Desconhecido';
  };

  const filteredDebts = debts.filter(d => {
    const client = getClientData(d.clientId);
    
    // Filter by selected client if any
    if (selectedClientId && d.clientId !== selectedClientId) {
      return false;
    }

    const nameMatch = client?.name.toLowerCase().includes(search.toLowerCase());
    const docMatch = client?.document?.toLowerCase().includes(search.toLowerCase());
    const statusMatch = d.status.toLowerCase().includes(search.toLowerCase());
    const descMatch = d.description?.toLowerCase().includes(search.toLowerCase());
    return nameMatch || docMatch || statusMatch || descMatch;
  }).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

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

    setWhatsappData({
      isOpen: true,
      clientName: client.name,
      phone: client.phone,
      amount
    });
  };

  const statusMap: Record<DebtStatus, { label: string, color: string }> = {
    PENDING: { label: 'A Vencer', color: 'bg-slate-100 text-slate-600' },
    OVERDUE: { label: 'Vencido', color: 'bg-red-100 text-red-600' },
    COLLECTING: { label: 'Em Cobrança', color: 'bg-amber-100 text-amber-600' },
    PAID: { label: 'Pago', color: 'bg-emerald-100 text-emerald-600' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Carteira de Dívidas</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Lançamentos e Controle Financeiro</p>
        </div>
        <button 
          onClick={() => { setCurrentDebt({ status: 'PENDING' }); setShowModal(true); }}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          <Plus size={18} />
          LANÇAR DÍVIDA
        </button>
      </div>

      <div className="space-y-4">
        <div className="glass p-2 rounded-[2rem] flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquise por cliente, descrição ou status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/50 border border-transparent rounded-[1.5rem] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          <div className="relative w-full md:w-auto">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={cn(
                "flex items-center justify-center gap-3 px-6 py-4 text-xs font-black rounded-[1.5rem] transition-all border w-full",
                selectedClientId 
                  ? "bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200" 
                  : "text-slate-600 bg-white border-slate-100 hover:bg-slate-50 uppercase tracking-widest"
              )}
            >
              <Filter size={16} />
              <span className="truncate max-w-[200px]">
                {selectedClientId ? getClientName(selectedClientId) : "Todos os Clientes"}
              </span>
              {selectedClientId && (
                <div 
                  onClick={(e) => { e.stopPropagation(); setSelectedClientId(''); }}
                  className="ml-1 p-1 hover:bg-white/20 rounded-full"
                >
                  <X size={12} />
                </div>
              )}
            </button>

            <AnimatePresence>
              {showFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 left-0 md:left-auto top-full mt-3 bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white z-50 overflow-hidden w-full md:w-72"
                  >
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Devedores Cadastrados</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 scrollbar-none">
                      <button
                        onClick={() => { setSelectedClientId(''); setShowFilterDropdown(false); }}
                        className={cn(
                          "w-full text-left px-5 py-3 rounded-2xl text-xs font-bold transition-all mb-1",
                          selectedClientId === '' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-600 hover:bg-white"
                        )}
                      >
                        Visualizar Todos
                      </button>
                      <div className="h-px bg-slate-100 my-2 mx-4" />
                      {clients.sort((a,b) => a.name.localeCompare(b.name)).map(client => (
                        <button
                          key={client.id}
                          onClick={() => { setSelectedClientId(client.id); setShowFilterDropdown(false); }}
                          className={cn(
                            "w-full text-left px-5 py-3 rounded-2xl text-xs font-bold transition-all mb-1",
                            selectedClientId === client.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-600 hover:bg-white"
                          )}
                        >
                          {client.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block glass rounded-[2.5rem] overflow-hidden border-none shadow-2xl shadow-blue-900/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Devedor & Detalhes</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Valor Bruto</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Data Limite</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Situação</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDebts.map((debt) => (
                <tr key={debt.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-base tracking-tight">{getClientName(debt.clientId)}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[200px]">{debt.description || 'SEM OBSERVAÇÃO'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-blue-600 text-lg leading-none">{formatCurrency(debt.amount)}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Calendar size={14} className="text-slate-300" />
                      {debt.dueDate ? formatDate(debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : debt.dueDate) : '---'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn("px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] shadow-sm", statusMap[debt.status].color)}>
                      {statusMap[debt.status].label}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleWhatsAppClick(debt.clientId, debt.amount)}
                            className="p-3 text-slate-400 hover:text-green-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                            title="Cobrar via WhatsApp"
                        >
                            <Smartphone size={18} />
                        </button>
                        <button 
                            onClick={() => { 
                                const date = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
                                setCurrentDebt({ ...debt, dueDate: date.toISOString().split('T')[0] }); 
                                setShowModal(true); 
                            }}
                            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(debt.id)}
                            className="p-3 text-slate-400 hover:text-red-500 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredDebts.map((debt) => (
            <div key={debt.id} className="glass p-6 rounded-[2.5rem] border-none shadow-xl shadow-blue-900/5">
              <div className="flex items-start justify-between mb-6">
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-lg tracking-tight truncate mb-1">{getClientName(debt.clientId)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{debt.description || 'Sem descrição'}</p>
                </div>
                <span className={cn("px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm shrink-0", statusMap[debt.status].color)}>
                  {statusMap[debt.status].label}
                </span>
              </div>

              <div className="flex items-center justify-between p-5 bg-white/50 rounded-3xl border border-white mb-6">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Valor Total</label>
                  <p className="text-xl font-black text-blue-600 leading-none">{formatCurrency(debt.amount)}</p>
                </div>
                <div className="text-right">
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Vencimento</label>
                   <div className="flex items-center gap-1.5 justify-end text-sm font-black text-slate-900 leading-none">
                      <Calendar size={14} className="text-slate-300" />
                      {debt.dueDate ? formatDate(debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : debt.dueDate) : '---'}
                   </div>
                </div>
              </div>

              <div className="flex gap-2">
                  <button 
                    onClick={() => handleWhatsAppClick(debt.clientId, debt.amount)}
                    className="flex-1 flex items-center justify-center gap-3 py-4 bg-green-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-green-200"
                  >
                    <Smartphone size={16} />
                    Cobrar
                  </button>
                  <button 
                    onClick={() => { 
                      const date = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
                      setCurrentDebt({ ...debt, dueDate: date.toISOString().split('T')[0] }); 
                      setShowModal(true); 
                    }}
                    className="aspect-square flex items-center justify-center w-14 bg-slate-100 text-slate-500 rounded-2xl"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(debt.id)}
                    className="aspect-square flex items-center justify-center w-14 bg-red-50 text-red-500 rounded-2xl border border-red-100"
                  >
                    <Trash2 size={18} />
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

      <WhatsAppModal 
        isOpen={!!whatsappData?.isOpen}
        onClose={() => setWhatsappData(null)}
        clientName={whatsappData?.clientName || ''}
        phone={whatsappData?.phone || ''}
        amount={whatsappData?.amount || 0}
        settings={settings}
      />
    </div>
  );
}
