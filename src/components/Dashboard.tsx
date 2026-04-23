import React, { useEffect, useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { collection, query, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Debt, Client, SystemSettings } from '../types';
import { doc, getDoc } from 'firebase/firestore';

const generateWhatsAppMessage = (name: string, amount: number, settings: SystemSettings | null) => {
  let message = `Olá ${name}, este é um lembrete da sua fatura no valor de ${formatCurrency(amount)} que está em atraso. Por favor, regularize sua situação para evitar juros.`;
  
  if (settings?.pixKey) {
    message += `\n\nVocê pode pagar via PIX:\nChave: ${settings.pixKey}\nTipo: ${settings.pixKeyType}\nNome: ${settings.receiverName}`;
  }
  
  return encodeURIComponent(message);
};

const handleWhatsAppClick = async (phone: string, name: string, amount: number) => {
  let settings: SystemSettings | null = null;
  try {
    const docRef = doc(db, 'settings', 'pix_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      settings = docSnap.data() as SystemSettings;
    }
  } catch (err) {
    console.error("Error fetching PIX settings for message:", err);
  }

  const encodedMessage = generateWhatsAppMessage(name, amount, settings);
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

  const getAlertDebts = () => {
    const now = new Date();
    const threeDays = new Date();
    threeDays.setDate(now.getDate() + 3);

    return debts.filter(d => {
      if (d.status === 'PAID') return false;
      const dueDate = d.dueDate instanceof Timestamp ? d.dueDate.toDate() : new Date(d.dueDate);
      return dueDate < now || dueDate <= threeDays;
    }).sort((a, b) => {
      const dateA = a.dueDate instanceof Timestamp ? a.dueDate.toDate() : new Date(a.dueDate);
      const dateB = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date(b.dueDate);
      return dateA.getTime() - dateB.getTime();
    }).slice(0, 5);
  };

  const alertDebts = getAlertDebts();
  const now = new Date();

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
      <div className="w-full">
        <div className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-white/40 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-bold">Alertas e Vencimentos</h4>
            <Calendar size={20} className="text-slate-400" />
          </div>
          
          <div className="space-y-6 flex-1">
            {alertDebts.map((debt) => {
              const client = clients[debt.clientId];
              const dueDate = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
              const isOverdue = dueDate < now;

              return (
                <div key={debt.id} className={cn(
                  "flex gap-4 p-4 rounded-2xl hover:bg-white transition-all border-l-4",
                  isOverdue ? "border-red-500 bg-red-50/30" : "border-amber-400 bg-amber-50/30"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    isOverdue ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {isOverdue ? <AlertCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {client?.name || 'Cliente'}
                      </p>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {isOverdue ? 'Vencido' : 'Em breve'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Dívida de <span className="font-bold text-slate-700">{formatCurrency(debt.amount)}</span></p>
                    <div className="flex items-center gap-3 mt-3">
                       <button 
                         onClick={() => client && handleWhatsAppClick(client.phone, client.name, debt.amount)}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
                       >
                         COBRAR AGORA
                       </button>
                       <span className="text-[10px] text-slate-400 font-medium">
                         Vence em: {dueDate.toLocaleDateString('pt-BR')}
                       </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {alertDebts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CheckCircle2 size={32} className="opacity-20 mb-2" />
                <p className="text-xs">Nenhum alerta crítico</p>
              </div>
            )}
          </div>
          
          <button className="w-full mt-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-widest">
            Visualizar Todos os Registros
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-using icon imports from Parent
import { Users as UIcons, CreditCard, Clock } from 'lucide-react';
const Users = UIcons;
import { cn as cnUtil } from '../lib/utils';
const cn = cnUtil;
