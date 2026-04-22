import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Debt, DebtStatus, Client } from '../types';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { 
  MoreHorizontal, 
  Clock, 
  MessageCircle, 
  Smartphone, 
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface Column {
  id: DebtStatus;
  title: string;
  color: string;
}

const COLUMNS: Column[] = [
  { id: 'PENDING', title: 'A Vencer', color: 'bg-slate-500' },
  { id: 'OVERDUE', title: 'Vencido', color: 'bg-red-500' },
  { id: 'COLLECTING', title: 'Em Cobrança', color: 'bg-amber-500' },
  { id: 'NEGOTIATING', title: 'Negotiando', color: 'bg-blue-500' },
  { id: 'PAID', title: 'Pago', color: 'bg-emerald-500' },
];

export default function Kanban() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribeDebts = onSnapshot(query(collection(db, 'debts')), (snapshot) => {
      setDebts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Debt)));
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

  const moveDebt = async (debtId: string, newStatus: DebtStatus) => {
    if (!debtId) return;
    console.log('moveDebt: Attempting to move debt', debtId, 'to', newStatus);
    try {
      setError(null);
      const debtRef = doc(db, 'debts', debtId);
      await updateDoc(debtRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      console.log('moveDebt: Success');
    } catch (err: any) {
      console.error('moveDebt: Error', err);
      setError(`Erro ao mover dívida: ${err.message}`);
    }
  };

  const deleteDebt = async (debtId: string) => {
    if (!debtId) {
      console.error('deleteDebt: No ID provided');
      return;
    }
    console.log('deleteDebt: Attempting to delete debt', debtId);
    try {
      setError(null);
      await deleteDoc(doc(db, 'debts', debtId));
      console.log('deleteDebt: Success');
      setShowDeleteConfirm(null);
    } catch (err: any) {
      console.error('deleteDebt: Error', err);
      setError(`Erro ao excluir dívida: ${err.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <span className="sr-only">Fechar</span>
            <HelpCircle size={14} className="rotate-45" /> 
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Pipeline de Recuperação</h3>
          <p className="text-slate-500 text-sm">Arraste as dívidas para mudar o status da cobrança.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/40 backdrop-blur-sm p-1.5 rounded-full border border-white/30">
                <img 
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
                  className="w-8 h-8 rounded-full border border-white" 
                  alt={user?.displayName || 'User'} 
                />
                <div className="pr-3">
                  <p className="text-[10px] font-bold text-slate-700 leading-tight">ONLINE</p>
                  <p className="text-[9px] text-slate-500 leading-tight">Operador</p>
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
        <div className="flex gap-4 md:gap-6 h-full min-w-max md:min-w-[1200px]">
          {COLUMNS.map((column) => {
            const columnDebts = debts.filter(d => d.status === column.id);
            return (
              <div key={column.id} className="w-[85vw] md:flex-1 md:min-w-[280px] flex flex-col gap-4 snap-center">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", column.color)}></span>
                    <h4 className="font-semibold text-slate-700 text-sm">{column.title}</h4>
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {columnDebts.length}
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <div 
                  className="flex-1 bg-white/20 backdrop-blur-sm rounded-2xl p-3 border-2 border-dashed border-white/30 space-y-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const id = (window as any).draggedDebtId;
                    if (id) {
                      moveDebt(id, column.id);
                      (window as any).draggedDebtId = null;
                    }
                  }}
                >
                  {columnDebts.map((debt) => (
                    <DebtCard 
                      key={debt.id} 
                      debt={debt} 
                      client={clients[debt.clientId]} 
                      onMove={(status) => moveDebt(debt.id, status)}
                      onDelete={() => setShowDeleteConfirm(debt.id)}
                    />
                  ))}
                  
                  {columnDebts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                      <HelpCircle size={24} strokeWidth={1.5} />
                      <p className="text-xs">Nenhum registro</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}

interface DebtCardProps {
  key?: string;
  debt: Debt;
  client?: Client;
  onMove: (status: DebtStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}

function DebtCard({ debt, client, onMove, onDelete }: DebtCardProps) {
  const [showOptions, setShowOptions] = useState(false);

  const handleWhatsAppClick = () => {
    if (!client) return;
    const message = `Olá ${client.name}, este é um lembrete da sua fatura no valor de ${formatCurrency(debt.amount)} que está em atraso. Por favor, regularize sua situação para evitar juros.`;
    const encodedMessage = encodeURIComponent(message);
    const formattedPhone = client.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const getDueDateStatus = () => {
    const due = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
    const now = new Date();
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (debt.status === 'PAID') return { label: 'Pago em dia', color: 'text-emerald-600' };
    if (diff < 0) return { label: `Atrasado há ${Math.abs(Math.floor(diff))} dias`, color: 'text-red-500' };
    if (diff <= 3) return { label: `Vence em ${Math.ceil(diff)} dias`, color: 'text-amber-500' };
    return { label: `Vence em ${Math.ceil(diff)} dias`, color: 'text-slate-500' };
  };

  const statusInfo = getDueDateStatus();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card-glass p-4 rounded-xl border border-white/40 shadow-sm hover:shadow-xl transition-all group cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        // Simple DOM-based drag state
        (window as any).draggedDebtId = debt.id;
      }}
      onDrop={(e) => {
        // Prevent drop on self
        e.stopPropagation();
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h5 className="font-bold text-slate-900 truncate">
          {client?.name || 'Cliente Desconhecido'}
        </h5>
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="text-slate-400 hover:text-slate-900"
          >
            <MoreHorizontal size={14} />
          </button>
          
          {showOptions && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-20 p-2 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest px-2 py-1">Mover para</p>
              {COLUMNS.filter(c => c.id !== debt.status).map(c => (
                <button
                  key={c.id}
                  onClick={() => { onMove(c.id); setShowOptions(false); }}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50 rounded transition-colors"
                >
                  {c.title}
                </button>
              ))}
              <div className="h-px bg-slate-100 my-1"></div>
              <button 
                onClick={() => { onDelete(); setShowOptions(false); }}
                className="w-full text-left px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors font-medium"
              >
                Excluir Registro
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-lg font-bold text-blue-600">{formatCurrency(debt.amount)}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <div className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold uppercase", statusInfo.color)}>
            <Clock size={10} />
            {statusInfo.label}
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleWhatsAppClick}
                className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all" title="Enviar WhatsApp"
            >
                <Smartphone size={14} />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Ver Histórico">
                <MessageCircle size={14} />
            </button>
        </div>
      </div>
    </motion.div>
  );
}
