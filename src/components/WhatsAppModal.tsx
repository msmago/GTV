import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageCircle, Smartphone } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { SystemSettings } from '../types';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  phone: string;
  amount: number;
  settings: SystemSettings | null;
}

export default function WhatsAppModal({ isOpen, onClose, clientName, phone, amount, settings }: WhatsAppModalProps) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      let defaultMsg = `Olá ${clientName}, este é um lembrete da sua fatura no valor de ${formatCurrency(amount)} que está em atraso. Por favor, regularize sua situação para evitar juros.`;
      
      if (settings?.pixKey) {
        defaultMsg += `\n\nVocê pode pagar via PIX:\nChave: ${settings.pixKey}\nTipo: ${settings.pixKeyType}\nNome: ${settings.receiverName}`;
      }
      setMessage(defaultMsg);
    }
  }, [isOpen, clientName, amount, settings]);

  const handleSend = () => {
    const encodedMessage = encodeURIComponent(message);
    const formattedPhone = phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Enviar WhatsApp</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{clientName}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Personalize sua mensagem
                </label>
                <div className="relative group">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-64 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-medium text-sm text-slate-700 resize-none leading-relaxed"
                    placeholder="Digite sua mensagem aqui..."
                  />
                  <div className="absolute right-4 bottom-4 p-2 bg-white rounded-xl shadow-sm opacity-50 group-hover:opacity-100 transition-opacity">
                     <MessageCircle size={16} className="text-green-500" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
                  💡 <span className="uppercase tracking-widest mr-1">DICA:</span>
                  Evite mensagens muito longas. O cliente tende a ler mais mensagens curtas e diretas com o link ou chave de pagamento.
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 mt-auto">
              <button 
                onClick={handleSend}
                className="w-full py-5 bg-green-500 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-green-200 hover:bg-green-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Send size={18} />
                ENVIAR AGORA
              </button>
              <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                O WhatsApp será aberto em uma nova aba
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
