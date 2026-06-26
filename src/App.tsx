import { useEffect, useState, useRef } from 'react';

// En dev usa el proxy de Vite (/api → api.mbsport.lat). En producción llama directo.
const API_BASE = import.meta.env.PROD ? 'https://api.mbsport.lat' : '/api';

type BetType = 'WINNER' | 'EXACTA' | 'TRIFECTA';
type TicketStatus = 'PENDING' | 'WON' | 'LOST' | 'PAID' | 'CANCELLED';

interface TicketDetail {
  betType: BetType;
  selection: string;
  amount: string;
  odds: string;
  potentialPrize: string;
}

interface PublicTicket {
  id: string;
  ticketNumber: number;
  status: TicketStatus;
  totalAmount: string;
  prizeAmount: string | null;
  createdAt: string;
  details: TicketDetail[];
  race: {
    numero: number;
    status: string;
    resultado: string | null;
    finishedAt: string | null;
  };
}

const STATUS_INFO: Record<TicketStatus, { icon: string; label: string; hint: string }> = {
  PENDING:   { icon: '⏳', label: 'Pendiente',   hint: 'La carrera aún no ha terminado. Esta página se actualiza automáticamente.' },
  WON:       { icon: '🏆', label: '¡Ganador!',   hint: 'Preséntate en ventanilla con este ticket para cobrar tu premio.' },
  LOST:      { icon: '❌', label: 'No Ganó',     hint: 'Mejor suerte en la próxima carrera.' },
  PAID:      { icon: '✅', label: 'Cobrado',     hint: 'El premio de este ticket ya fue pagado.' },
  CANCELLED: { icon: '🚫', label: 'Anulado',     hint: 'Este ticket fue anulado y no tiene valor.' },
};

const BET_LABEL: Record<BetType, string> = {
  WINNER: 'GANAR', EXACTA: 'EXACTA', TRIFECTA: 'TRIFECTA',
};

const DOG_NAMES: Record<number, string> = {
  1: 'BRAVO', 2: 'RELAMPAGO', 3: 'TIGRE', 4: 'NEGRO', 5: 'FURIA', 6: 'BANDIDO',
};

function money(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return '$0.00';
  return `$${parseFloat(String(n)).toFixed(2)}`;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatSelection(sel: string, betType: BetType): string {
  if (betType === 'WINNER') {
    const n = parseInt(sel);
    return `#${sel} ${DOG_NAMES[n] ?? ''}`.trim();
  }
  return sel.split('-').map((p) => `#${p}`).join(' → ');
}

export default function App() {
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const id = useRef(new URLSearchParams(window.location.search).get('id'));

  async function load() {
    const ticketId = id.current;
    if (!ticketId) return;
    try {
      const res = await fetch(`${API_BASE}/tickets/public/${encodeURIComponent(ticketId)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'Ticket no encontrado');
      }
      const data: PublicTicket = await res.json();
      setTicket(data);
      setError(null);
      if (data.status !== 'PENDING') {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar el ticket');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id.current) {
      setError('No se especificó el ID del ticket');
      setLoading(false);
      return;
    }
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const si = ticket ? STATUS_INFO[ticket.status] : null;
  const prize = ticket?.prizeAmount ? parseFloat(ticket.prizeAmount) : 0;

  return (
    <div className="page">

      {/* ── Brand ── */}
      <div className="brand">
        <div className="brand-name">Racing Dogs</div>
        <div className="brand-sub">mbsport.lat · Verificación de tickets</div>
      </div>

      {/* ── Loading ── */}
      {loading && !ticket && (
        <div className="spinner-wrap">
          <div className="spinner" />
          <p className="spinner-text">Buscando ticket...</p>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && !ticket && (
        <div className="error-card">
          <div className="error-title">Ticket no encontrado</div>
          <div className="error-msg">{error}</div>
        </div>
      )}

      {/* ── Ticket ── */}
      {ticket && si && (
        <>
          {/* Status */}
          <div className={`status ${ticket.status}`}>
            <span className="status-icon">{si.icon}</span>
            <div className="status-label">{si.label}</div>
            <div className="status-hint">{si.hint}</div>
          </div>

          {/* Pending indicator */}
          {ticket.status === 'PENDING' && (
            <div className="refresh-bar">
              <span className="refresh-dot" />
              Actualizando en tiempo real...
            </div>
          )}

          {/* Prize */}
          {(ticket.status === 'WON' || ticket.status === 'PAID') && prize > 0 && (
            <div className="prize-card">
              <div className="prize-label">Premio ganado</div>
              <div className="prize-amount">{money(ticket.prizeAmount)}</div>
            </div>
          )}

          {/* Ticket info */}
          <div className="card">
            <div className="card-title">Información del ticket</div>
            <div className="row">
              <span className="row-label">N° Ticket</span>
              <span className="row-value gold">#{ticket.ticketNumber}</span>
            </div>
            <div className="row">
              <span className="row-label">Carrera</span>
              <span className="row-value">N° {ticket.race.numero}</span>
            </div>
            <div className="row">
              <span className="row-label">Fecha</span>
              <span className="row-value">{formatDate(ticket.createdAt)}</span>
            </div>
            {ticket.race.resultado && (
              <div className="row">
                <span className="row-label">Resultado oficial</span>
                <span className="row-value gold">
                  {ticket.race.resultado.split('-').join(' – ')}
                </span>
              </div>
            )}
          </div>

          {/* Bets */}
          <div className="card">
            <div className="card-title">Jugadas ({ticket.details.length})</div>
            {ticket.details.map((d, i) => {
              const premio = parseFloat(d.amount) * parseFloat(d.odds);
              return (
                <div key={i} className="bet">
                  <span className={`bet-type ${d.betType}`}>{BET_LABEL[d.betType]}</span>
                  <span className="bet-sel">{formatSelection(d.selection, d.betType)}</span>
                  <span className="bet-amount">{money(d.amount)}</span>
                  <span className="bet-odds">×{parseFloat(d.odds).toFixed(2)}</span>
                  <span className="bet-premio">{money(premio)}</span>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="card">
            <div className="card-title">Resumen</div>
            <div className="row">
              <span className="row-label">Total apostado</span>
              <span className="row-value">{money(ticket.totalAmount)}</span>
            </div>
            {prize > 0 && (
              <div className="row">
                <span className="row-label">Premio ganado</span>
                <span className={`row-value ${prize >= parseFloat(ticket.totalAmount) ? 'green' : 'red'}`}>
                  {money(ticket.prizeAmount)}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="footer">MBSPORT RACING DOGS 2026 · mbsport.lat</div>
    </div>
  );
}
