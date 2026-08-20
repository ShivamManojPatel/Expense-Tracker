import { formatMoney } from '../utils/format';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ANCHORED_INTERVAL_DAYS = { Weekly: 7, 'Bi-weekly': 14 };

// Weekly/Bi-weekly subscriptions recur every 7/14 days from startDate rather than
// on a fixed "day of month" — so unlike Monthly/Yearly, they can bill more than
// once in a given displayed month. Returns every day-of-month they land on within
// the given calendar month.
function occurrenceDaysInMonth(sub, year, month) {
  const intervalDays = ANCHORED_INTERVAL_DAYS[sub.billingCycle];
  if (!intervalDays) return [sub.billingDay]; // Monthly / Yearly

  const start = new Date(sub.startDate);
  const startMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const intervalMs = intervalDays * 86400000;
  const monthStartMs = Date.UTC(year, month, 1);
  const monthEndMs = Date.UTC(year, month + 1, 0);

  let cyclesToMonthStart = Math.ceil((monthStartMs - startMs) / intervalMs);
  if (cyclesToMonthStart < 0) cyclesToMonthStart = 0;

  const days = [];
  let occurrenceMs = startMs + cyclesToMonthStart * intervalMs;
  while (occurrenceMs <= monthEndMs) {
    if (occurrenceMs >= monthStartMs) days.push(new Date(occurrenceMs).getUTCDate());
    occurrenceMs += intervalMs;
  }
  return days;
}

// The exact UTC date (as ms since epoch) of a Weekly/Bi-weekly subscription's
// CURRENT cycle occurrence — i.e. which one of possibly several dots shown this
// month is "the" active cycle right now. Mirrors the backend's
// currentAnchoredCycleStart in subscriptionCycle.js.
function currentAnchoredOccurrenceMs(sub, today) {
  const intervalDays = ANCHORED_INTERVAL_DAYS[sub.billingCycle];
  if (!intervalDays) return null;
  const start = new Date(sub.startDate);
  const startMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const intervalMs = intervalDays * 86400000;
  if (todayMs <= startMs) return startMs;
  const cyclesElapsed = Math.floor((todayMs - startMs) / intervalMs);
  return startMs + cyclesElapsed * intervalMs;
}

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
    const intervalDays = ANCHORED_INTERVAL_DAYS[s.billingCycle];
    const currentOccurrenceMs = intervalDays && isCurrentMonth ? currentAnchoredOccurrenceMs(s, today) : null;

    occurrenceDaysInMonth(s, year, month).forEach((day) => {
      if (!subsByDay[day]) subsByDay[day] = [];

      // Whether THIS specific dot represents the subscription's current billing
      // cycle (and is therefore eligible to show as "paid"). Monthly/Yearly only
      // ever show one dot a month, so that dot always is the current cycle.
      // Weekly/Bi-weekly can show several dots a month, so only the one matching
      // the actual current-cycle date counts — not every occurrence.
      const isCurrentCycleDot = !intervalDays
        ? true
        : currentOccurrenceMs !== null && Date.UTC(year, month, day) === currentOccurrenceMs;

      subsByDay[day].push({ ...s, isPaidDot: isCurrentMonth && s.paidThisCycle && isCurrentCycleDot });
    });
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
                  title={
                    showTooltip
                      ? undefined
                      : subsByDay[day].map((s) => `${s.name}${s.isPaidDot ? ' (Paid)' : ''}`).join(', ')
                  }
                >
                  {subsByDay[day].map((s, i2) => (
                    <span
                      className={`cal-dot ${s.isPaidDot ? 'cal-dot-paid' : ''}`}
                      key={`${s._id}-${i2}`}
                    ></span>
                  ))}
                </div>
              )}
              {showTooltip && subsByDay[day] && (
                <div className="cal-tooltip">
                  <div className="cal-tooltip-date">
                    {monthDate.toLocaleDateString(undefined, { month: 'short' })} {day}
                  </div>
                  {subsByDay[day].map((s, i2) => (
                    <div className="cal-tooltip-row" key={`${s._id}-${i2}`}>
                      <span>
                        {s.name}
                        {s.isPaidDot && <i className="ti ti-check" style={{ color: 'var(--green)', marginLeft: 4 }}></i>}
                      </span>
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