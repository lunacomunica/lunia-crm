import { useEffect, useState } from 'react';
import { Key, Copy, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Zap, MessageSquare, Instagram, Shield } from 'lucide-react';
import { settingsApi } from '../api/client';

function Field({ label, id, value, onChange, placeholder, type = 'text', hint, mono = false }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string; mono?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-dark">{label}</label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-dark ${mono ? 'input-mono' : ''}`}
      />
      {hint && <p className="text-xs mt-1" style={{ color: 'rgba(100,116,139,0.5)' }}>{hint}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, iconStyle, children, testType, onTest, testResult }: {
  icon: any; title: string; iconStyle?: string; children: React.ReactNode;
  testType?: string; onTest?: (t: string) => void; testResult?: { success: boolean; message: string };
}) {
  const [testing, setTesting] = useState(false);
  const handleTest = async () => {
    if (!onTest || !testType) return;
    setTesting(true); await onTest(testType); setTesting(false);
  };
  return (
    <div className="card p-6 mb-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Icon size={15} className={iconStyle} />
          </div>
          <h2 className="text-base font-light text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {testResult && (
            <span className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {testResult.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {testResult.message}
            </span>
          )}
          {testType && (
            <button onClick={handleTest} disabled={testing}
              className="btn-ghost px-3 py-1.5 text-xs"
              style={{ fontSize: '0.7rem' }}>
              <RefreshCw size={10} className={testing ? 'animate-spin' : ''} />
              Testar conexão
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [webhookInfo, setWebhookInfo] = useState<{ webhookUrl: string; verifyToken: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    settingsApi.get().then(r => setSettings(r.data));
    settingsApi.getWebhookInfo().then(r => setWebhookInfo(r.data));
  }, []);

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    await settingsApi.update(settings);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  };

  const handleTest = async (type: string) => {
    const r = await settingsApi.testConnection(type);
    setTestResults(prev => ({ ...prev, [type]: r.data }));
  };

  return (
    <div className="p-8 animate-fade-up max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <p className="section-label mb-1">Integração</p>
        <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
          Configurações
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(100,116,139,0.65)' }}>
          Credenciais da API da Meta para WhatsApp, Instagram e Anúncios
        </p>
      </div>

      {/* Webhook Info */}
      <div className="card p-6 mb-5" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
        <div className="flex items-center gap-2 mb-5">
          <Zap size={14} className="icon-blue" />
          <p className="section-label">Webhook da Meta</p>
          <span className="badge badge-blue ml-auto">Necessário no painel Meta Developers</span>
        </div>

        {webhookInfo && (
          <div className="space-y-4">
            <div>
              <label className="label-dark">URL do Webhook</label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl px-4 py-2.5 font-mono text-xs truncate"
                  style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                  {webhookInfo.webhookUrl}
                </div>
                <button onClick={() => handleCopy(webhookInfo.webhookUrl, 'url')}
                  className="btn-ghost px-3 flex-shrink-0">
                  {copied === 'url' ? <CheckCircle2 size={14} className="icon-green" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-dark">Token de Verificação</label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl px-4 py-2.5 font-mono text-xs"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#fcd34d' }}>
                  {webhookInfo.verifyToken}
                </div>
                <button onClick={() => handleCopy(webhookInfo.verifyToken, 'token')}
                  className="btn-ghost px-3 flex-shrink-0">
                  {copied === 'token' ? <CheckCircle2 size={14} className="icon-green" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
          <AlertCircle size={13} className="icon-amber flex-shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: 'rgba(245,158,11,0.75)' }}>
            Para receber mensagens reais, exponha esta URL publicamente (ex: ngrok) e configure no{' '}
            <a href="https://developers.facebook.com" target="_blank" rel="noreferrer"
              className="underline inline-flex items-center gap-0.5 hover:text-amber-300 transition-colors">
              Meta Developers <ExternalLink size={9} />
            </a>
          </p>
        </div>
      </div>

      {/* WhatsApp */}
      <Section icon={MessageSquare} title="WhatsApp Business API" iconStyle="icon-green"
        testType="whatsapp" onTest={handleTest} testResult={testResults.whatsapp}>
        <Field label="Access Token" id="whatsapp_token"
          value={settings.whatsapp_token || ''} onChange={v => set('whatsapp_token', v)}
          placeholder="EAABsbCS…" mono hint="Token de acesso da API do WhatsApp Business" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone Number ID" id="whatsapp_phone_id"
            value={settings.whatsapp_phone_id || ''} onChange={v => set('whatsapp_phone_id', v)}
            placeholder="123456789012345" mono />
          <Field label="Business Account ID" id="whatsapp_business_id"
            value={settings.whatsapp_business_id || ''} onChange={v => set('whatsapp_business_id', v)}
            placeholder="123456789" mono />
        </div>
      </Section>

      {/* Instagram */}
      <Section icon={Instagram} title="Instagram API" iconStyle="icon-pink"
        testType="instagram" onTest={handleTest} testResult={testResults.instagram}>
        <Field label="Access Token" id="instagram_token"
          value={settings.instagram_token || ''} onChange={v => set('instagram_token', v)}
          placeholder="EAABsbCS…" mono />
        <Field label="Instagram Account ID" id="instagram_account_id"
          value={settings.instagram_account_id || ''} onChange={v => set('instagram_account_id', v)}
          placeholder="123456789" mono />
      </Section>

      {/* Meta Ads */}
      <Section icon={Shield} title="Meta Ads API" iconStyle="icon-purple">
        <div className="grid grid-cols-2 gap-4">
          <Field label="App ID" id="meta_app_id"
            value={settings.meta_app_id || ''} onChange={v => set('meta_app_id', v)}
            placeholder="123456789012345" mono />
          <Field label="App Secret" id="meta_app_secret"
            value={settings.meta_app_secret || ''} onChange={v => set('meta_app_secret', v)}
            placeholder="abc123…" type="password" mono />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ad Account ID" id="meta_ads_account_id"
            value={settings.meta_ads_account_id || ''} onChange={v => set('meta_ads_account_id', v)}
            placeholder="act_123456789" mono />
          <Field label="Verify Token (Webhook)" id="meta_verify_token"
            value={settings.meta_verify_token || ''} onChange={v => set('meta_verify_token', v)}
            placeholder="lunia_webhook_token" mono
            hint="Token customizado para verificação do webhook" />
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-4 mt-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
          {saving ? 'Salvando…' : 'Salvar Configurações'}
        </button>
        {saved && (
          <span className="flex items-center gap-2 text-sm animate-fade-up" style={{ color: '#34d399' }}>
            <CheckCircle2 size={15} /> Configurações salvas com sucesso!
          </span>
        )}
      </div>
    </div>
  );
}
