# Expense Tracker — Full Manual Test Checklist

Run both servers before starting:
```
cd backend && npm run dev
cd frontend && npm run dev
```
Open http://localhost:5173. Keep the backend terminal visible — you'll need it for the password reset test.

---

## 1. Account basics

- [ ] **Sign up** with a new name/email/password/currency → should land on Dashboard automatically
- [ ] **Log out** (Settings → Log out) → should redirect to Login
- [ ] **Log in** with the same credentials → should return to Dashboard
- [ ] Try logging in with a **wrong password** → should show an error, not crash
- [ ] Refresh the page while logged in → should stay logged in (not bounce to Login)

## 2. Forgot / reset password

- [ ] On Login, click **Forgot password?**
- [ ] Enter your account email, submit → should show a generic "if that email exists..." message
- [ ] Check your **backend terminal** → a reset link should be printed there
- [ ] Copy that link into your browser → should land on Reset Password page
- [ ] Set a new password → should redirect to Login
- [ ] Log in with the **new** password → should work
- [ ] --Try the same reset link a second time → should say it's invalid/expired (tokens are one-time)--

## 3. Change password (while logged in)

- [ ] Settings → Account → enter current password + new password + confirm → Update
- [ ] Log out, log back in with the **new** password → should work
- [ ] Try changing password with the **wrong current password** → should show an error and not change anything

## 4. Dashboard

- [ ] "Add transaction" button opens the modal from the Dashboard
- [ ] Metric cards show: Spent this month, Income this month, Net this month, Budget remaining, Monthly subscriptions
- [ ] "Overview" / "AI suggestions" tabs both switch correctly
- [ ] AI suggestions tab: click it — if Ollama is running, you should get generated text after a few seconds; if Ollama is off, you should get a clear error message (not a blank screen or crash)
- [ ] Click **Regenerate** on AI suggestions → runs again
- [ ] "This month's subscriptions" calendar shows dots on the correct billing days
- [ ] Recent transactions list shows your latest 5 entries with correct +/− coloring

## 5. Transactions page

- [ ] Add an **Expense** → appears in list with a `−` amount
- [ ] Add an **Income** → appears with a `+` amount, colored differently
- [ ] Add a **Savings → Deposit** → appears with `+`, piggy-bank icon
- [ ] Add a **Savings → Withdraw** → appears with `−`, piggy-bank icon
- [ ] Add an expense with **bill split** checked (total amount + split-with name) → confirm only *your share* is what gets saved as the amount, and the "Split with X" chip shows on the row
- [ ] Add tags (comma-separated) to a transaction → tag chips appear under the row
- [ ] Filter by **Type** (Expense / Income / Savings deposit / Savings withdrawal) → list updates correctly
- [ ] Filter by **Category** → list updates correctly
- [ ] Filter by a **tag chip** → list narrows to matching entries
- [ ] Search by note text → list narrows correctly
- [ ] Edit an existing transaction (change amount/category/note) → saves correctly
- [ ] Delete a transaction → confirmation prompt appears, then it's removed
- [ ] Check the "net" figure at the top updates correctly as you add/remove income vs expenses (savings shouldn't affect it)

## 6. Subscriptions

- [ ] Add a subscription (name, amount, billing cycle, billing day)
- [ ] Confirm it shows up on the calendar on the correct day, this month
- [ ] Navigate to next/previous month on the calendar → dot only appears in the current month view (since billing day repeats monthly, it should show every month)
- [ ] Edit a subscription's amount or day → calendar updates
- [ ] Mark a subscription inactive/paused (if you built that toggle) → confirm it stops showing on the calendar and in Dashboard's monthly subscription total
- [ ] Delete a subscription → confirmation, then removed

## 7. Goals

- [ ] Create a new goal (name, target amount, optional starting amount, optional target date)
- [ ] Progress bar reflects current/target correctly
- [ ] Add a contribution → current amount increases, bar updates
- [ ] Edit a goal's target amount → bar recalculates
- [ ] Delete a goal → confirmation, then removed

## 8. Savings page

- [ ] "Add to savings" quick button → opens modal pre-set to Deposit
- [ ] "Withdraw" quick button → opens modal pre-set to Withdrawal
- [ ] Total saved, deposited this month, withdrawn this month, savings rate % all show correct numbers
- [ ] History list shows all deposits/withdrawals with correct sign and color
- [ ] Balance-over-time chart appears once you have 2+ months of activity (single month shows the "add more" empty state instead — that's expected)
- [ ] Delete a savings entry → confirmation, then removed, and totals update

## 9. Debts page

- [ ] Add a **"I borrowed"** entry (person, amount, remarks, date)
- [ ] A summary card appears for that person showing "You owe $X"
- [ ] Add a **"I repaid"** entry to the same person → outstanding amount decreases
- [ ] Fully repay someone → card should show "Settled," and the "Repay" quick button should become disabled (nothing left to repay)
- [ ] Overpay someone (repay more than borrowed) → card should show "Overpaid $X"
- [ ] Use the **"Borrow more"** / **"Repay"** quick buttons on a summary card → modal opens pre-filled with that person's name
- [ ] Filter History by a specific person → list narrows correctly
- [ ] Edit and delete individual debt entries → both work with correct totals afterward
- [ ] Top metric cards (Total borrowed / Total repaid / Still outstanding) match what the per-person cards add up to

## 10. Budgets (Settings)

- [ ] Set a monthly budget for a category
- [ ] Add expenses in that category until you cross 80% → bar turns amber/warn color
- [ ] Cross 100% → bar turns red/over color, and a warning banner appears on the Dashboard
- [ ] Confirm a **Savings deposit** in a category does NOT count toward that category's budget spend (only real Expenses should)
- [ ] Remove a budget → confirmation not required here, should just delete immediately

## 11. Categories (Settings)

- [ ] Add a new category → appears in the list and in the category dropdown when adding a transaction
- [ ] Delete a category → confirmation prompt, then removed (existing transactions keep their old category name as plain text)

## 12. CSV export

- [ ] Settings → Export CSV → file downloads
- [ ] Open the CSV → confirm columns (Date, Category, Amount, Payment Method, Note) and that the data matches your transactions

## 13. PIN lock — this is the part most worth testing carefully

- [ ] Before setting a PIN: visit Transactions, Subscriptions, Goals, Savings, Debts, Analytics → **all should open normally**, no lock screen
- [ ] Settings → Tab lock → try to save a locked tab **before** setting a PIN → should show an error telling you to set a PIN first
- [ ] Set a PIN (4–6 digits, confirm matches) → success message appears
- [ ] Try a mismatched confirm PIN → should show an error, not save
- [ ] Check the checkboxes for a couple of tabs (e.g. Debts and Savings) → **Save locked tabs**
- [ ] Navigate to a **locked** tab (e.g. Debts) → should show the PIN lock screen, not the page content
- [ ] Enter the **wrong PIN** → "Incorrect PIN" error, stays locked
- [ ] Enter the **correct PIN** → unlocks, page content shows, with a small "Lock this tab" button above the page header
- [ ] Click **"Lock this tab"** → re-locks immediately without leaving the page
- [ ] Navigate away to Dashboard, then back to the locked tab → should ask for the PIN again (it doesn't stay unlocked across navigation)
- [ ] Visit a tab you did **not** lock (e.g. Goals) → opens normally, no PIN prompt
- [ ] Go back to Settings → uncheck a previously-locked tab → Save → that tab should now open normally again
- [ ] Settings → Remove PIN → confirm prompt → after removing, **all** tabs should open without a PIN, and the locked-tabs checkboxes should be gone/disabled again
- [ ] Confirm the browser does **not** pop up "Save password?" when entering a PIN (only when entering your real login password) — this was specifically fixed, worth double-checking

## 14. Layout & responsiveness

- [ ] Resize the browser window narrow (or open dev tools device toolbar, ~375px wide) → sidebar should disappear, bottom tab bar should appear instead
- [ ] All pages should remain usable and readable at that narrow width — no obvious overflow/cut-off text
- [ ] Global search (top bar) — type a few letters of a transaction note, subscription name, or goal name → dropdown shows matching results grouped by type, clicking a result navigates to the right page
- [ ] Notification bell — if you have an over-budget category or a subscription renewing within 3 days, the bell should show a red count badge; clicking it lists those alerts

## 15. Cross-cutting sanity checks

- [ ] Log out and log back in as a **second, brand-new account** → confirm you see none of the first account's data (categories, transactions, PIN, etc. are all separate per user)
- [ ] Check MongoDB Compass (if you're using it) → confirm collections exist: `users`, `expenses`, `subscriptions`, `budgets`, `categories`, `goals`, `debts`
- [ ] Restart both servers from scratch → confirm your data is still there (real persistence, not lost on restart)

---

If anything on this list fails, note: the exact step, what you expected, and what actually happened (plus any error text from the browser console or backend terminal) — that's everything I'll need to debug it quickly.
