// Reviews page — app ratings (1–5 stars) and optional comments
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const STARS = [1, 2, 3, 4, 5];

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1" role="group" aria-label="Calificacion">
      {STARS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className={`text-4xl leading-none transition-colors ${
            s <= (hovered || value) ? 'text-amber-400' : 'text-slate-200'
          }`}
          aria-label={`${s} estrellas`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }) {
  return (
    <span className="text-amber-400 tracking-tight text-sm">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

function ReviewCard({ review: r }) {
  return (
    <li className="card space-y-1">
      <StarDisplay rating={r.rating} />
      {r.comment && <p className="text-sm text-slate-700">{r.comment}</p>}
      <p className="text-xs text-slate-400">
        {r.username ? `@${r.username}` : 'Anonimo'} ·{' '}
        {new Date(r.createdAt).toLocaleDateString('es-MX', {
          month: 'short', day: 'numeric', year: 'numeric',
        })}
      </p>
    </li>
  );
}

export default function Reviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/reviews')
      .then(setReviews)
      .finally(() => setLoading(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (rating === 0) { setError('Selecciona una calificacion.'); return; }
    setSending(true);
    setError(null);
    try {
      await api.post('/api/reviews', { rating, comment: comment.trim() || undefined });
      setSuccess(true);
      setRating(0);
      setComment('');
      const updated = await api.get('/api/reviews');
      setReviews(updated);
    } catch (err) {
      setError(err.message || 'Error al enviar la resena.');
    } finally {
      setSending(false);
    }
  }

  const avg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-base font-semibold text-slate-800">Resenas</span>
        </button>
      </div>

      {/* Summary */}
      {avg && (
        <div className="card flex items-center gap-4">
          <p className="text-4xl font-black text-slate-800">{avg}</p>
          <div>
            <StarDisplay rating={Math.round(Number(avg))} />
            <p className="text-xs text-slate-400 mt-0.5">
              {reviews.length} resena{reviews.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Submit form */}
      <section className="card space-y-3">
        <p className="text-sm font-semibold text-slate-700">Deja tu opinion</p>
        {success && (
          <p className="text-sm text-green-600 font-medium">Gracias por tu resena!</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <StarRating value={rating} onChange={(v) => { setRating(v); setSuccess(false); }} />
          <textarea
            className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            maxLength={500}
            placeholder="Comentario opcional (max. 500 caracteres)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="submit"
            disabled={sending || rating === 0}
            className="btn-primary w-full disabled:opacity-50"
          >
            {sending ? 'Enviando...' : 'Enviar resena'}
          </button>
        </form>
      </section>

      {/* Reviews list */}
      <section className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase px-1">Resenas recientes</p>
        {loading && <p className="text-sm text-slate-400 text-center py-4">Cargando...</p>}
        {!loading && reviews.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-sm text-slate-400">Sin resenas todavia. Se el primero!</p>
          </div>
        )}
        {!loading && reviews.length > 0 && (
          <ul className="space-y-2">
            {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
