import React, { useEffect, useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Debt, Client } from '../types';

const handleWhatsAppClick = (phone: string, name: string, amount: number) => {
  const message = `Olá ${name}, este é um lembrete da sua fatura no valor de ${formatCurrency(amount)} que está em atraso. Por favor, regularize sua situação para evitar juros.`;
  const encodedMessage = encodeURIComponent(message);
  const formattedPhone = phone.replace(/\D/g, '');
  const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
  window.open(url, '_blank');
};

export default function Dashboard() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const { user } = useAuth();

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

  const totalReceivable = debts.reduce((acc, d) => d.status !== 'PAID' ? acc + d.amount : acc, 0);
  const totalOverdue = debts.reduce((acc, d) => d.status === 'OVERDUE' ? acc + d.amount : acc, 0);

  const stats = [
    { label: 'Total a Receber', value: formatCurrency(totalReceivable), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Vencido', value: formatCurrency(totalOverdue), icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Total Clientes', value: Object.keys(clients).length.toString(), icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Dívidas Ativas', value: debts.filter(d => d.status !== 'PAID').length.toString(), icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-slate-900">Bom dia, {user?.displayName?.split(' ')[0] || 'Operador'}!</h3>
        <p className="text-slate-500 text-sm">Confira o resumo das cobranças de hoje.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-6 rounded-2xl border-none shadow-none hover:shadow-lg hover:bg-white/60 transition-all flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="max-w-2xl">
        <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl border border-white/40 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-bold">Alertas Próximos</h4>
            <Calendar size={20} className="text-slate-400" />
          </div>
          
          <div className="space-y-6 flex-1 overflow-y-auto">
            {debts.filter(d => d.status === 'OVERDUE').slice(0, 5).map((debt) => {
              const client = clients[debt.clientId];
              return (
                <div key={debt.id} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border-l-4 border-amber-400">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate max-w-[150px]">
                      {client?.name || 'Cliente'}
                    </p>
                    <p className="text-xs text-slate-500">Dívida de {formatCurrency(debt.amount)}</p>
                    <div className="flex gap-2 mt-2">
                       <button 
                         onClick={() => client && handleWhatsAppClick(client.phone, client.name, debt.amount)}
                         className="text-[10px] font-bold text-blue-600 hover:underline"
                       >
                         COBRAR AGORA
                       </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {debts.filter(d => d.status === 'OVERDUE').length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CheckCircle2 size={32} className="opacity-20 mb-2" />
                <p className="text-xs">Nenhum alerta crítico</p>
              </div>
            )}
          </div>
          
          <button className="w-full mt-6 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Ver Todos os Alertas
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-using icon imports from Parent is not possible in separate files unless exported
import { Users as UIcons, CreditCard } from 'lucide-react';
const Users = UIcons;
import { cn as cnUtil } from '../lib/utils';
const cn = cnUtil;
