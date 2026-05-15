import { useEffect, useRef, useState } from 'react';
import { Search, Send, MessageSquare, Phone, CheckCheck, Check, MessageCircle } from 'lucide-react';
import { conversationsApi, agencyClientsApi } from '../api/client';
import { Conversation, Message, AgencyClient } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#3b82f6,#6366f1)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const bg = AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ background: bg, boxShadow: '0 0 12px rgba(59,130,246,0.15)' }}>
      {initials}
    </div>
  );
}

function PlatformDot({ platform, type }: { platform: string; type?: string | null }) {
  const isComment = type === 'comment';
  const isWa = platform === 'whatsapp';
  const color = isWa ? '#25d366' : isComment ? '#a855f7' : '#ec4899';
  const glow = isWa ? 'rgba(37,211,102,0.6)' : isComment ? 'rgba(168,85,247,0.6)' : 'rgba(236,72,153,0.6)';
  return (
    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
      style={{ background: color, border: '2px solid #030314', boxShadow: `0 0 6px ${glow}` }} />
  );
}

function PlatformBadge({ platform, type }: { platform: string; type?: string | null }) {
  const isWa = platform === 'whatsapp';
  const isComment = type === 'comment';
  const label = isWa ? 'WhatsApp' : isComment ? 'Comentário' : 'Direct';
  const style = isWa
    ? { background: 'rgba(37,211,102,0.15)', color: '#4ade80', border: '1px solid rgba(37,211,102,0.2)' }
    : isComment
    ? { background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }
    : { background: 'rgba(236,72,153,0.15)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.2)' };
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={style}>{label}</span>
  );
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('whatsapp');
  const [clientFilter, setClientFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = () => {
    const p: Record<string, string> = {};
    if (platform !== 'all') p.platform = platform;
    if (clientFilter !== 'all') p.agency_client_id = clientFilter;
    conversationsApi.list(p).then(r => { setConversations(r.data); setLoading(false); });
  };

  useEffect(() => {
    agencyClientsApi.list().then(r => setClients(r.data));
  }, []);

  useEffect(() => { loadConvs(); }, [platform, clientFilter]);

  const openConv = (conv: Conversation) => {
    setActive(conv);
    conversationsApi.getMessages(conv.id).then(r => {
      setMessages(r.data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    });
    conversationsApi.markRead(conv.id);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
  };

  const handleSend = async () => {
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      let r;
      if (active.platform === 'instagram') {
        // Extract recipient from external_id: ig_dm_<clientId>_<senderId>
        const parts = active.external_id.split('_');
        const recipientId = parts[parts.length - 1];
        r = await conversationsApi.sendIgReply(active.id, String(active.agency_client_id), recipientId, text);
      } else {
        r = await conversationsApi.sendMessage(active.id, text);
      }
      setMessages(prev => [...prev, r.data]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Erro ao enviar mensagem');
    }
    setSending(false);
  };

  const filtered = conversations.filter(c =>
    !search || (c.contact_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const igClients = clients.filter(c => c.instagram_user_id);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-80 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #030314 0%, #04041a 100%)', borderRight: '1px solid rgba(59,130,246,0.07)' }}>

        <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
          <p className="section-label mb-1">Mensagens</p>
          <h2 className="text-xl font-light text-white mb-4">Conversas</h2>

          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(59,130,246,0.4)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversa…" className="input-dark pl-8 text-xs" />
          </div>

          {/* Platform filter */}
          <div className="flex gap-0.5 p-1 rounded-xl mb-2"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {(['all', 'whatsapp', 'instagram'] as const).map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={platform === p
                  ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }
                  : { color: 'rgba(100,116,139,0.6)', border: '1px solid transparent' }}>
                {p === 'all' ? 'Todos' : p === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
              </button>
            ))}
          </div>

          {/* Client filter */}
          {igClients.length > 0 && (
            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.1)', color: clientFilter === 'all' ? 'rgba(100,116,139,0.6)' : '#e2e8f0' }}>
              <option value="all">Todos os clientes</option>
              {igClients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Conv list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
              <MessageCircle size={28} style={{ color: 'rgba(59,130,246,0.2)' }} />
              <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>Nenhuma conversa ainda</p>
              {platform === 'instagram' && (
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.35)' }}>Configure o webhook no Meta para receber DMs e comentários</p>
              )}
            </div>
          ) : filtered.map(conv => (
            <button key={conv.id} onClick={() => openConv(conv)}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-150 relative"
              style={{
                borderBottom: '1px solid rgba(59,130,246,0.05)',
                background: active?.id === conv.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                borderLeft: active?.id === conv.id ? '2px solid #3b82f6' : '2px solid transparent',
              }}>
              <div className="relative">
                <Avatar name={conv.contact_name || '?'} />
                <PlatformDot platform={conv.platform} type={conv.conv_type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-medium text-white truncate">{conv.contact_name}</p>
                  <span className="text-[10px] ml-1 whitespace-nowrap" style={{ color: 'rgba(100,116,139,0.5)' }}>
                    {conv.last_message_time ? formatDistanceToNow(new Date(conv.last_message_time), { locale: ptBR }) : ''}
                  </span>
                </div>
                {conv.agency_client_name && (
                  <p className="text-[10px] mb-0.5 truncate" style={{ color: 'rgba(59,130,246,0.5)' }}>
                    {conv.agency_client_name}
                  </p>
                )}
                <p className="text-xs truncate" style={{ color: 'rgba(100,116,139,0.6)' }}>
                  {conv.last_message || 'Sem mensagens'}
                </p>
              </div>
              {conv.unread_count > 0 && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 mt-1"
                  style={{ background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.7)' }}>
                  {conv.unread_count}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat panel ── */}
      {active ? (
        <div className="flex-1 flex flex-col" style={{ background: '#05050f' }}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ background: 'linear-gradient(180deg, #07071e 0%, #05050f 100%)', borderBottom: '1px solid rgba(59,130,246,0.07)' }}>
            <div className="flex items-center gap-3">
              <Avatar name={active.contact_name || '?'} size="lg" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{active.contact_name}</p>
                  <PlatformBadge platform={active.platform} type={active.conv_type} />
                  {active.agency_client_name && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.15)' }}>
                      {active.agency_client_name}
                    </span>
                  )}
                </div>
                {active.contact_phone && (
                  <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'rgba(100,116,139,0.6)' }}>
                    <Phone size={10} />{active.contact_phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
            {messages.map((msg, i) => {
              const isOut = msg.direction === 'outbound';
              const showDate = i === 0 || new Date(messages[i - 1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <div className="divider-glow flex-1" />
                      <span className="mx-4 text-[10px] px-3 py-1 rounded-full"
                        style={{ color: 'rgba(100,116,139,0.5)', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.08)' }}>
                        {format(new Date(msg.timestamp), "d 'de' MMM", { locale: ptBR })}
                      </span>
                      <div className="divider-glow flex-1" />
                    </div>
                  )}
                  <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[68%] px-4 py-2.5 rounded-2xl text-sm"
                      style={isOut
                        ? { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderBottomRightRadius: '4px', boxShadow: '0 0 14px rgba(59,130,246,0.25)' }
                        : { background: 'linear-gradient(145deg, #0c0c28 0%, #0f0f30 100%)', border: '1px solid rgba(59,130,246,0.1)', borderBottomLeftRadius: '4px' }}>
                      <p className="leading-relaxed" style={{ color: isOut ? '#fff' : '#e2e8f0' }}>{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px]" style={{ color: isOut ? 'rgba(255,255,255,0.45)' : 'rgba(100,116,139,0.5)' }}>
                          {format(new Date(msg.timestamp), 'HH:mm')}
                        </span>
                        {isOut && (msg.status === 'read' || msg.status === 'delivered'
                          ? <CheckCheck size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
                          : <Check size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4"
            style={{ background: 'linear-gradient(0deg, #07071e 0%, #05050f 100%)', borderTop: '1px solid rgba(59,130,246,0.07)' }}>
            {active.platform === 'instagram' && !active.agency_client_id ? (
              <p className="text-center text-xs py-2" style={{ color: 'rgba(100,116,139,0.5)' }}>
                Este cliente não tem Instagram conectado — reconecte via OAuth na aba Integração.
              </p>
            ) : (
              <>
                <div className="flex gap-3 items-end">
                  <input value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={active.conv_type === 'comment' ? 'Responder comentário…' : 'Digite uma mensagem…'}
                    className="input-dark flex-1" />
                  <button onClick={handleSend} disabled={!text.trim() || sending}
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 0 18px rgba(59,130,246,0.4)', opacity: !text.trim() || sending ? 0.4 : 1 }}>
                    <Send size={15} className="text-white" />
                  </button>
                </div>
                {active.platform === 'whatsapp' && (
                  <p className="text-center text-[10px] mt-2" style={{ color: 'rgba(100,116,139,0.4)' }}>
                    Configure a API da Meta para envio real via WhatsApp
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: '#05050f' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <MessageSquare size={28} className="icon-blue" />
          </div>
          <div className="text-center">
            <p className="text-lg font-light text-white mb-1">Selecione uma conversa</p>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.5)' }}>DMs e comentários do Instagram aparecerão aqui</p>
          </div>
        </div>
      )}
    </div>
  );
}
