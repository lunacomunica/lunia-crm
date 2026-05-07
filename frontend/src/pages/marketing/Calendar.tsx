import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, FileImage, Calendar } from 'lucide-react';
import { contentApi, agencyClientsApi } from '../../api/client';
import { ContentPiece, ContentStatus, AgencyClient } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLOR: Record<ContentStatus, string> = {
  em_criacao: '#94a3b8', em_revisao: '#60a5fa', aguardando_aprovacao: '#f59e0b',
  aprovado: '#34d399', ajuste_solicitado: '#f97316', agendado: '#a78bfa', publicado: '#10b981',
};

export default function MarketingCalendar() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [current, setCurrent] = useState(new Date());
  const [filterClient, setFilterClient] = useState('all');

  useEffect(() => {
    contentApi.list().then(r => setPieces(r.data));
    agencyClientsApi.list().then(r => setClients(r.data));
  }, []);

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const startDay = startOfMonth(current).getDay();

  const filtered = pieces.filter(p => filterClient === 'all' || String(p.agency_client_id) === filterClient);
  const byDay = (day: Date) => filtered.filter(p => p.scheduled_date && isSameDay(new Date(p.scheduled_date + 'T12:00:00'), day));

  const selectStyle = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.5rem 0.875rem', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' };

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">Marketing</p>
          <h1 className="text-3xl font-extralight text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
            Calendário
          </h1>
        </div>
        <button onClick={() => navigate('/marketing/content')} className="btn-primary"><Plus size={15} /> Nova Peça</button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(subMonths(current, 1))} className="btn-ghost px-2.5 py-2"><ChevronLeft size={16} /></button>
          <span className="text-white font-medium min-w-36 text-center capitalize">
            {format(current, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={() => addMonths(current, 1) && setCurrent(addMonths(current, 1))} className="btn-ghost px-2.5 py-2"><ChevronRight size={16} /></button>
        </div>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={selectStyle}>
          <option value="all">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setCurrent(new Date())} className="btn-ghost text-xs px-3">Hoje</button>
      </div>

      <div className="card overflow-hidden">
        {/* Week headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-medium" style={{ color: 'rgba(100,116,139,0.5)' }}>{d}</div>
          ))}
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-24 p-2" style={{ borderRight: '1px solid rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.04)' }} />
          ))}
          {days.map(day => {
            const dayPieces = byDay(day);
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className="min-h-24 p-2 transition-colors"
                style={{ borderRight: '1px solid rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.04)', background: today ? 'rgba(59,130,246,0.04)' : 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = today ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.01)')}
                onMouseLeave={e => (e.currentTarget.style.background = today ? 'rgba(59,130,246,0.04)' : 'transparent')}>
                <p className="text-xs font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full"
                  style={{ color: today ? '#fff' : 'rgba(148,163,184,0.6)', background: today ? '#3b82f6' : 'transparent' }}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-1">
                  {dayPieces.slice(0, 3).map(p => (
                    <div key={p.id} onClick={() => navigate('/marketing/content')}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer text-[10px] truncate transition-opacity hover:opacity-80"
                      style={{ background: `${STATUS_COLOR[p.status]}15`, border: `1px solid ${STATUS_COLOR[p.status]}25`, color: STATUS_COLOR[p.status] }}>
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[p.status] }} />
                      {p.title}
                    </div>
                  ))}
                  {dayPieces.length > 3 && (
                    <p className="text-[10px] px-1" style={{ color: 'rgba(100,116,139,0.4)' }}>+{dayPieces.length - 3} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
