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
import WhatsAppModal from './WhatsAppModal';

const generateWhatsAppMessage = (name: string, amount: number, settings: SystemSettings | null) => {
  let message = `Olá ${name}, este é um lembrete da sua fatura no valor de ${formatCurrency(amount)} que está em atraso. Por favor, regularize sua situação para evitar juros.`;
  
  if (settings?.pixKey) {
    message += `\n\nVocê pode pagar via PIX:\nChave: ${settings.pixKey}\nTipo: ${settings.pixKeyType}\nNome: ${settings.receiverName}`;
  }
  
  return encodeURIComponent(message);
};

export default function Dashboard() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [whatsappData, setWhatsappData] = useState<{ isOpen: boolean; clientName: string; phone: string; amount: number } | null>(null);
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

  const handleWhatsApp = (phone: string, name: string, amount: number) => {
    setWhatsappData({ isOpen: true, clientName: name, phone, amount });
  };

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
    <div className="space-y-6 md:space-y-10 pb-10">
      {/* Welcome Section */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Bom dia, {user?.displayName?.split(' ')[0] || 'Operador'}!</h3>
        </div>
        <p className="text-slate-500 text-sm md:text-base font-medium ml-3.5">Aqui está o que está acontecendo hoje.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass group p-4 md:p-6 rounded-[2rem] hover:bg-white transition-all cursor-default overflow-hidden relative">
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className={cn("p-2.5 md:p-3 rounded-2xl w-fit transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={stat.color} size={20} />
              </div>
              <div className="mt-4 md:mt-6">
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest leading-none mb-1 md:mb-2">{stat.label}</p>
                <p className="text-lg md:text-2xl font-black text-slate-900 truncate">{stat.value}</p>
              </div>
            </div>
            {/* Background Accent */}
            <div className={cn("absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform blur-2xl", stat.bg)} />
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="w-full">
        <div className="glass p-6 md:p-10 rounded-[2.5rem] flex flex-col shadow-2xl shadow-blue-900/5">
          <div className="flex items-center justify-between mb-8 md:mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <h4 className="text-lg md:text-xl font-bold">Alertas Críticos</h4>
            </div>
            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
              PRÓXIMOS 3 DIAS
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            {alertDebts.map((debt) => {
              const client = clients[debt.clientId];
              const dueDate = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
              const isOverdue = dueDate < now;

              return (
                <div key={debt.id} className="group bg-white/50 hover:bg-white p-4 md:p-6 rounded-3xl transition-all border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
                    isOverdue ? "bg-red-500 text-white shadow-red-200" : "bg-amber-400 text-white shadow-amber-100"
                  )}>
                    {isOverdue ? <AlertCircle size={24} /> : <Clock size={24} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm md:text-base font-bold text-slate-900 truncate">
                        {client?.name || 'Cliente'}
                      </p>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                        isOverdue ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {isOverdue ? 'Atrasado' : 'Próximo'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Débito de <span className="text-slate-900 font-bold">{formatCurrency(debt.amount)}</span> • 
                      Vencimento: <span className="italic">{dueDate.toLocaleDateString('pt-BR')}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                     <button 
                       onClick={() => client && handleWhatsApp(client.phone, client.name, debt.amount)}
                       className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-blue-700 hover:translate-x-1 transition-all shadow-lg shadow-blue-200"
                     >
                       COBRAR AGORA
                     </button>
                  </div>
                </div>
              );
            })}
            
            {alertDebts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white/30 rounded-[2rem] border border-dashed border-slate-200">
                <CheckCircle2 size={48} className="opacity-10 mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Tudo regularizado por aqui!</p>
              </div>
            )}
          </div>
          
          <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all uppercase tracking-[0.2em] shadow-xl shadow-slate-200">
            Ver Carteira Completa
          </button>
        </div>
      </div>
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

// Re-using icon imports from Parent
import { Users as UIcons, CreditCard, Clock } from 'lucide-react';
const Users = UIcons;
import { cn as cnUtil } from '../lib/utils';
const cn = cnUtil;
