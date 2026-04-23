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
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-slate-900">Configurações de Recebimento</h3>
        <p className="text-slate-500 text-sm">Configure seus dados de PIX para facilitar o pagamento dos seus clientes.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card-glass p-8 rounded-3xl border border-white/40 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Tipo de Chave</label>
              <select
                value={settings.pixKeyType}
                onChange={(e) => setSettings({ ...settings, pixKeyType: e.target.value as any })}
                className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
              >
                <option value="CPF_CNPJ">CPF/CNPJ</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Chave Aleatória</option>
              </select>
            </div>

            <div className="col-span-full md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Valor da Chave PIX</label>
              <div className="relative">
                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  value={settings.pixKey}
                  onChange={(e) => setSettings({ ...settings, pixKey: e.target.value })}
                  placeholder="Ex: 83999999999"
                  className="w-full pl-12 pr-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Nome do Recebedor</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  value={settings.receiverName}
                  onChange={(e) => setSettings({ ...settings, receiverName: e.target.value })}
                  placeholder="Ex: Empresa X"
                  className="w-full pl-12 pr-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Cidade do Recebedor</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  placeholder="Ex: João Pessoa"
                  className="w-full pl-12 pr-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              disabled={saving}
              type="submit"
              className={cn(
                "w-full py-4.5 flex items-center justify-center gap-3 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl active:scale-[0.98]",
                saving 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              )}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-500"></div>
              ) : (
                <Save size={18} />
              )}
              {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
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
