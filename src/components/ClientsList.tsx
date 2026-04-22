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
  AlertCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ClientsListProps {
  createTrigger?: number;
}

export default function ClientsList({ createTrigger }: ClientsListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [search, setSearch] = useState('');
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Base de Clientes</h3>
          <p className="text-slate-500 text-sm">Gerencie os dados cadastrais da sua carteira.</p>
        </div>
        <button 
          onClick={() => { setCurrentClient({}); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
        >
          <UserPlus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="md:glass md:rounded-2xl md:border-none md:shadow-none overflow-hidden">
        <div className="p-4 border-b border-white/20 bg-white/10 backdrop-blur-md">
          <div className="max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Nome, documento ou contato"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 md:py-2 bg-white border md:bg-white/50 border-slate-200 md:border-none rounded-xl text-sm md:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Cliente</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Documento</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Dívida Total</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Contato</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">ID: {client.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600 font-mono text-xs">{client.document || '---'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                        <DollarSign size={12} className="text-blue-500" />
                        <p className="font-bold text-slate-900">{formatCurrency(getClientTotalDebt(client.id))}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone size={12} className="text-slate-400" />
                        {client.phone}
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail size={12} className="text-slate-400" />
                          {client.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setCurrentClient(client); setShowModal(true); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(client.id)}
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
          {filteredClients.map((client) => (
            <div key={client.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-base">{client.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {client.id.substring(0, 8)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setCurrentClient(client); setShowModal(true); }}
                    className="p-3 text-blue-600 bg-blue-50 rounded-xl"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(client.id)}
                    className="p-3 text-red-500 bg-red-50 rounded-xl"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dívida Total</label>
                  <div className="flex items-center gap-1">
                    <DollarSign size={12} className="text-blue-500" />
                    <p className="font-bold text-slate-900">{formatCurrency(getClientTotalDebt(client.id))}</p>
                  </div>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Documento</label>
                   <p className="text-xs font-medium text-slate-600">{client.document || '---'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                  <Phone size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                    <Mail size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 truncate">{client.email}</span>
                  </div>
                )}
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
