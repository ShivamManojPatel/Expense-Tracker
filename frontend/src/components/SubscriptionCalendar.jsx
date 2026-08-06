import { formatMoney } from '../utils/format';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// showTooltip: renders a styled hover popup with that day's subscription details.
// Only passed true from the Dashboard widget — the Subscriptions page calendar
// keeps the plain browser title tooltip instead.
export default function SubscriptionCalendar({ monthDate, subscriptions, showTooltip = false, currency }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const subsByDay = {};
  subscriptions.forEach((s) => {
    if (!s.active) return;
    if (!subsByDay[s.billingDay]) subsByDay[s.billingDay] = [];
    subsByDay[s.billingDay].push(s);
  });

  return (
    <div>
      <div className="cal-grid" style={{ marginBottom: 6 }}>
        {DOW.map((d) => (
          <div className="cal-dow" key={d}>{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) =>
          day === null ? (
            <div className="cal-cell empty" key={`e${i}`} />
          ) : (
            <div className={`cal-cell${isCurrentMonth && day === today.getDate() ? ' today' : ''}`} key={day}>
              <div className="cal-daynum">{day}</div>
              {subsByDay[day] && (
                <div
                  className="cal-dot-wrap"
                  title={showTooltip ? undefined : subsByDay[day].map((s) => s.name).join(', ')}
                >
                  {subsByDay[day].map((s) => (
                    <span className="cal-dot" key={s._id}></span>
                  ))}
                </div>
              )}
              {showTooltip && subsByDay[day] && (
                <div className="cal-tooltip">
                  <div className="cal-tooltip-date">
                    {monthDate.toLocaleDateString(undefined, { month: 'short' })} {day}
                  </div>
                  {subsByDay[day].map((s) => (
                    <div className="cal-tooltip-row" key={s._id}>
                      <span>{s.name}</span>
                      <span>{formatMoney(s.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}