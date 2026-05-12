import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, Timestamp, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Client, Debt } from '../types';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  UserPlus, 
  Mail, 
  Phone, 
  FileText,
  X,
  Trash2,
  Edit2,
  DollarSign,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ClientsListProps {
  createTrigger?: number;
  searchTerm?: string;
}

export default function ClientsList({ createTrigger, searchTerm = '' }: ClientsListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [search, setSearch] = useState(searchTerm);

  useEffect(() => {
    setSearch(searchTerm);
  }, [searchTerm]);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [currentClient, setCurrentClient] = useState<Partial<Client> | null>(null);

  useEffect(() => {
    if (createTrigger) {
      setCurrentClient({});
      setShowModal(true);
    }
  }, [createTrigger]);

  useEffect(() => {
    const q = query(collection(db, 'clients'));
    const unsubscribeClients = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });

    const unsubscribeDebts = onSnapshot(query(collection(db, 'debts')), (snapshot) => {
        setDebts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Debt)));
    });

    return () => {
        unsubscribeClients();
        unsubscribeDebts();
    };
  }, []);

  const getClientTotalDebt = (clientId: string) => {
    return debts
      .filter(d => d.clientId === clientId && d.status !== 'PAID')
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.document?.includes(search)
  ).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient?.name || !currentClient?.phone) return;

    try {
      if (currentClient.id) {
        const clientRef = doc(db, 'clients', currentClient.id);
        await updateDoc(clientRef, {
          ...currentClient,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'clients'), {
          ...currentClient,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setShowModal(false);
      setCurrentClient(null);
    } catch (err) {
      handleFirestoreError(err, currentClient?.id ? 'update' : 'create', 'clients');
    }
  };

  const deleteClient = async (id: string) => {
    if (!id) {
      console.error('deleteClient: No ID provided');
      return;
    }
    console.log('deleteClient: Attempting to delete client', id);
    try {
      setError(null);
      // Cascade delete: find all debts for this client
      const clientDebts = debts.filter(d => d.clientId === id);
      console.log(`deleteClient: Found ${clientDebts.length} associated debts to delete`);
      
      const deletePromises = clientDebts.map(d => {
        console.log('deleteClient: Deleting debt', d.id);
        return deleteDoc(doc(db, 'debts', d.id));
      });
      
      await Promise.all(deletePromises);
      console.log('deleteClient: All associated debts deleted successfully');
      
      await deleteDoc(doc(db, 'clients', id));
      console.log('deleteClient: Client deleted successfully');
      setShowDeleteConfirm(null);
    } catch (err: any) {
      console.error('deleteClient: Error occurred', err);
      setError(err.message || 'Erro desconhecido ao excluir');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={18} />
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Clientes</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Carteira e Contatos</p>
        </div>
        <button 
          onClick={() => { setCurrentClient({}); setShowModal(true); }}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          <UserPlus size={18} />
          NOVO CLIENTE
        </button>
      </div>

      <div className="space-y-4">
        <div className="glass p-2 rounded-[2rem] flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquise por nome, doc ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/50 border border-transparent rounded-[1.5rem] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block glass rounded-[2.5rem] overflow-hidden border-none shadow-2xl shadow-blue-900/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Identificação</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Documento</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Finanças</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Localização</th>
                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-slate-200">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-base tracking-tight">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">#{client.id.substring(0, 6)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-slate-600 font-bold font-mono text-xs bg-slate-100 px-3 py-1 rounded-lg w-fit">{client.document || '---'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Dívida Total</span>
                        <p className="font-black text-blue-600 text-lg leading-none">{formatCurrency(getClientTotalDebt(client.id))}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-blue-500" />
                        {client.phone}
                      </div>
                      {client.city && (
                        <div className="flex items-center gap-2 italic text-slate-400">
                           <MapPin size={14} className="text-slate-300" />
                           {client.city}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setCurrentClient(client); setShowModal(true); }}
                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(client.id)}
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
          {filteredClients.map((client) => (
            <div key={client.id} className="glass p-6 rounded-[2.5rem] border-none shadow-xl shadow-blue-900/5">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-slate-200">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-lg tracking-tight truncate">{client.name}</p>
                    {client.city && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 mt-0.5 italic">
                           <MapPin size={12} />
                           {client.city}
                        </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-50">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Débito Ativo</label>
                  <p className="font-black text-blue-600 text-lg leading-none">{formatCurrency(getClientTotalDebt(client.id))}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-50">
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Documento</label>
                   <p className="text-xs font-black text-slate-900 truncate">{client.document || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl border border-white">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                    <Phone size={16} />
                  </div>
                  <span className="text-sm font-black text-slate-700">{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl border border-white">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shadow-sm">
                        <Mail size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-500 truncate">{client.email}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                  <button 
                    onClick={() => { setCurrentClient(client); setShowModal(true); }}
                    className="flex-1 flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(client.id)}
                    className="aspect-square flex items-center justify-center w-14 bg-red-50 text-red-500 rounded-2xl border border-red-100"
                  >
                    <Trash2 size={20} />
                  </button>
              </div>
            </div>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="px-6 py-20 text-center text-slate-400 bg-white">
            <div className="flex flex-col items-center gap-3">
              <Users size={48} className="opacity-20" />
              <p>Nenhum cliente encontrado</p>
              <button 
                onClick={() => { setCurrentClient({}); setShowModal(true); }}
                className="text-blue-600 font-bold text-xs hover:underline"
              >
                ADICIONAR PRIMEIRO CLIENTE
              </button>
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
              <h4 className="text-xl font-bold text-slate-900 mb-2">Excluir Cliente?</h4>
              <p className="text-slate-500 text-sm mb-6">
                Tem certeza que deseja excluir este cliente e <strong>TODAS</strong> as suas dívidas vinculadas? Esta ação é irreversível.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={() => deleteClient(showDeleteConfirm)}
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
                <h4 className="text-xl font-bold">{currentClient?.id ? 'Editar Cliente' : 'Novo Cliente'}</h4>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={currentClient?.name || ''}
                      onChange={(e) => setCurrentClient({...currentClient, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Documento (CPF/CNPJ)</label>
                    <input 
                      type="text" 
                      value={currentClient?.document || ''}
                      onChange={(e) => setCurrentClient({...currentClient, document: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone</label>
                    <input 
                      required
                      type="tel" 
                      value={currentClient?.phone || ''}
                      onChange={(e) => setCurrentClient({...currentClient, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                    <input 
                      type="email" 
                      value={currentClient?.email || ''}
                      onChange={(e) => setCurrentClient({...currentClient, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cidade</label>
                    <input 
                      type="text" 
                      value={currentClient?.city || ''}
                      onChange={(e) => setCurrentClient({...currentClient, city: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observações Internas</label>
                    <textarea 
                      rows={3}
                      value={currentClient?.notes || ''}
                      onChange={(e) => setCurrentClient({...currentClient, notes: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      placeholder="Histórico de bom pagador, detalhes do contato..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    SALVAR CLIENTE
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

import { Users as UIcons } from 'lucide-react';
const Users = UIcons;
