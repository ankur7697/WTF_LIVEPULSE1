import { useEffect, useRef } from 'react';
import { formatDateTime } from '../lib/format';

function ActivityFeed({ events, loading = false, error = null, title = 'Live Activity Feed' }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2 className="panel-card__title">{title}</h2>
          <p className="panel-card__subtitle">Newest real-time events across all gyms. Oldest event drops off at 20 items.</p>
        </div>
      </div>

      {error ? <div className="panel-error">{error}</div> : null}
      {loading ? (
        <div className="feed-empty">Loading activity feed...</div>
      ) : events.length ? (
        <div className="feed-list">
          {events.map((event, index) => (
            <article className="feed-item" key={`${event.type}-${event.timestamp}-${index}`}>
              <span className={`feed-item__badge ${event.type === 'CHECKOUT_EVENT' ? 'checkout' : event.type === 'PAYMENT_EVENT' ? 'payment' : ''}`} />
              <div>
                <div className="feed-item__member">{event.member_name}</div>
                <div className="feed-item__meta">
                  {event.label || event.type} · {event.gym}
                  {event.amount ? ` · ${event.amount}` : ''}
                  {event.plan_type ? ` · ${event.plan_type}` : ''}
                </div>
              </div>
              <div className="feed-item__time">{formatDateTime(event.timestamp)}</div>
            </article>
          ))}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="feed-empty">No live events yet.</div>
      )}
    </section>
  );
}

export {
  ActivityFeed,
};

