import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Debt, Client } from '../types';
import { Bell, AlertTriangle, Clock, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';

interface Notification {
  id: string;
  type: 'OVERDUE' | 'DUE_SOON';
  debt: Debt;
  clientName: string;
  message: string;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubDebts = onSnapshot(collection(db, 'debts'), (snapshot) => {
      setDebts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Debt)));
    });
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });

    return () => {
      unsubDebts();
      unsubClients();
    };
  }, []);

  useEffect(() => {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const newNotifications: Notification[] = [];

    debts.forEach(debt => {
      if (debt.status === 'PAID') return;

      const dueDate = debt.dueDate instanceof Timestamp 
        ? debt.dueDate.toDate() 
        : new Date(debt.dueDate);
      
      const client = clients.find(c => c.id === debt.clientId);
      const clientName = client?.name || 'Cliente Desconhecido';

      if (dueDate < now) {
        newNotifications.push({
          id: `overdue-${debt.id}`,
          type: 'OVERDUE',
          debt,
          clientName,
          message: `${clientName} tem uma dívida de ${formatCurrency(debt.amount)} vencida.`
        });
      } else if (dueDate <= threeDaysFromNow) {
        newNotifications.push({
          id: `soon-${debt.id}`,
          type: 'DUE_SOON',
          debt,
          clientName,
          message: `A dívida de ${clientName} no valor de ${formatCurrency(debt.amount)} vence em breve.`
        });
      }
    });

    setNotifications(newNotifications);
  }, [debts, clients]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-xl transition-all",
          isOpen ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-100"
        )}
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-widest">Notificações</p>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-slate-400">Tudo em dia! Nenhuma notificação urgente.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            notif.type === 'OVERDUE' ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                          )}>
                            {notif.type === 'OVERDUE' ? <AlertTriangle size={18} /> : <Clock size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {notif.type === 'OVERDUE' ? 'Pagamento Vencido' : 'Vencimento Próximo'}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                notif.type === 'OVERDUE' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                              )}>
                                {notif.type === 'OVERDUE' ? 'Urgente' : 'Alerta'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {notif.debt.dueDate instanceof Timestamp 
                                  ? notif.debt.dueDate.toDate().toLocaleDateString('pt-BR') 
                                  : new Date(notif.debt.dueDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-all self-center" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
