import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { SystemSettings } from '../types';
import { 
  QrCode, 
  User, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Save
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>({
    pixKey: '',
    pixKeyType: 'PHONE',
    receiverName: '',
    city: '',
    updatedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'pix_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SystemSettings);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await setDoc(doc(db, 'settings', 'pix_config'), {
        ...settings,
        updatedAt: serverTimestamp()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações');
      handleFirestoreError(err, 'update', 'settings/pix_config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-10 px-2">
        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Configurações</h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Dados de Recebimento e Chave PIX</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass p-8 rounded-[2.5rem] border-none shadow-2xl shadow-blue-900/5 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="col-span-full md:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tipo de Chave</label>
              <select
                value={settings.pixKeyType}
                onChange={(e) => setSettings({ ...settings, pixKeyType: e.target.value as any })}
                className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none font-bold text-sm"
              >
                <option value="CPF_CNPJ">CPF/CNPJ</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Chave Aleatória</option>
              </select>
            </div>

            <div className="col-span-full md:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Valor da Chave PIX</label>
              <div className="relative">
                <QrCode className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  value={settings.pixKey}
                  onChange={(e) => setSettings({ ...settings, pixKey: e.target.value })}
                  placeholder="Sua chave aqui"
                  className="w-full pl-14 pr-5 py-4 bg-white/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="col-span-full">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nome Completo do Titular</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  value={settings.receiverName}
                  onChange={(e) => setSettings({ ...settings, receiverName: e.target.value })}
                  placeholder="Como aparece no banco"
                  className="w-full pl-14 pr-5 py-4 bg-white/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="col-span-full">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Cidade da Agência</label>
              <div className="relative">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  placeholder="Ex: São Paulo"
                  className="w-full pl-14 pr-5 py-4 bg-white/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              disabled={saving}
              type="submit"
              className={cn(
                "w-full py-5 flex items-center justify-center gap-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]",
                saving 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
              )}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
              ) : (
                <Save size={18} />
              )}
              {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-semibold border border-red-100 flex items-center gap-3"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-semibold border border-emerald-100 flex items-center gap-3"
          >
            <CheckCircle2 size={18} />
            Configurações salvas com sucesso!
          </motion.div>
        )}
      </form>
    </div>
  );
}
