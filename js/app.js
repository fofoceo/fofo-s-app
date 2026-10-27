/* Fofo — The Weekly Edit · app logic */
'use strict';

/* ================= Helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayDiff = (a, b) => Math.round((fromIso(iso(b)) - fromIso(iso(a))) / 864e5); // b − a in days
const toMin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtTime = m => { let h = Math.floor(m / 60) % 24; const mm = m % 60; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${pad(mm)}${ap}`; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const hash = str => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const dueLabel = d => d < 0 ? `${plural(-d, 'day')} overdue` : d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
const dayOfYear = d => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
const todayIso = () => iso(new Date());
const weekStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const money = n => `${S.settings.currency}${(+n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const shortDate = s => { const d = fromIso(s); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };

/* ================= Store ================= */
const KEY = 'fofo-weekly-edit-v1';
function defaults() {
  return {
    settings: { name: 'Fofo', city: '', currency: '$', wake: '07:00', budget: 0 },
    timetable: [], exams: [], assignments: [], events: [],
    vision: { statement: '', words: [] }, goals: [], reflections: {},
    habits: ['Drink 2L water', 'Read 20 pages', 'Move my body', 'Journal', 'Phone down by 10pm'].map(name => ({ id: uid(), name })),
    habitLog: {}, tasks: {}, selfcare: {}, planDone: {}, focus: {}, weekNotes: {},
    focusLog: [], savings: [], transactions: [], mealShift: {},
    journal: {}, health: {}, fitDay: {}, workouts: [],
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw), base = defaults();
    for (const k in base) if (d[k] === undefined) d[k] = base[k];
    d.settings = { ...base.settings, ...d.settings };
    return d;
  } catch (e) { return defaults(); }
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Couldn’t save — browser storage is blocked or full'); }
}

const ui = { route: 'today', schedTab: 'timetable', taskDate: todayIso(), journalDate: todayIso(), weekOffset: 0, eventCat: 'All', txType: 'expense' };

/* ================= Planning engine ================= */
const KIND_LABEL = { study: 'Study', self: 'Self-care', room: 'Organise', meal: 'Nourish', task: 'Tasks', school: 'School', event: 'Event', exam: 'Exam' };
const SESSIONS = { 2: [60, 60], 2.5: [60, 60, 30], 3: [60, 60, 60] };

function examsAhead(date) {
  return S.exams.map(e => ({ ...e, days: dayDiff(date, fromIso(e.date)) }))
    .filter(e => e.days >= 0).sort((a, b) => a.days - b.days);
}
function assignmentsAhead(date) {
  return S.assignments.filter(a => !a.done).map(a => ({ ...a, days: dayDiff(date, fromIso(a.due)) }))
    .sort((a, b) => a.days - b.days);
}

// Study hours flex between 2 and 3 depending on how close exams and deadlines are
function studyLoad(date) {
  const next = examsAhead(date)[0];
  const dueSoon = assignmentsAhead(date).find(a => a.days <= 3);
  if (next && next.days === 0) return { hours: 2, reason: `${next.subject} exam today — light review, then rest` };
  if (next && next.days <= 7) return { hours: 3, reason: `${next.subject} exam ${dueLabel(next.days)}` };
  if (next && next.days <= 14) return { hours: 2.5, reason: `${next.subject} exam ${dueLabel(next.days)} — building momentum` };
  if (dueSoon) return { hours: 2.5, reason: `“${dueSoon.title}” due ${dueLabel(dueSoon.days)}` };
  return { hours: 2, reason: 'Steady rhythm — review & get ahead' };
}

// Which subjects get the study sessions, most urgent first
function studyQueue(date) {
  const q = [], seen = new Set();
  const push = (key, subject, detail) => { if (seen.has(key)) return; seen.add(key); q.push({ subject, detail }); };
  examsAhead(date).filter(e => e.days <= 21).forEach(e => push(e.subject.toLowerCase(), e.subject,
    e.days === 0 ? 'Calm final review — key definitions & formulas only' : `Active recall + past-paper questions · exam ${dueLabel(e.days)}`));
  assignmentsAhead(date).filter(a => a.days <= 7).forEach(a => push('a' + a.id, a.subject || a.title, `Work on “${a.title}” · due ${dueLabel(a.days)}`));
  S.timetable.filter(c => c.day === date.getDay()).forEach(c => push(c.subject.toLowerCase(), c.subject, `Review today’s ${c.subject} notes & make flashcards`));
  if (!q.length) [['Notes review', 'Rewrite this week’s notes beautifully'], ['Read ahead', 'Preview next lesson’s material'], ['Practice', 'Practice questions from your weakest topic']]
    .forEach(([s, d]) => push(s, s, d));
  return q;
}

function mealFor(ds, type) {
  const list = MEALS[type];
  const shift = (S.mealShift[ds] && S.mealShift[ds][type]) || 0;
  return list[(hash(ds + type) + shift) % list.length];
}

function buildPlan(date) {
  const ds = iso(date), dow = date.getDay();
  const classes = S.timetable.filter(c => c.day === dow).sort((a, b) => toMin(a.start) - toMin(b.start));
  const fixed = [];
  if (classes.length) {
    fixed.push({ id: 'school', kind: 'school', title: 'School', detail: classes.map(c => c.subject).join(' · '),
      start: Math.min(...classes.map(c => toMin(c.start))), end: Math.max(...classes.map(c => toMin(c.end))), fixed: true });
  }
  S.exams.filter(e => e.date === ds && e.time).forEach(e => {
    const st = toMin(e.time);
    fixed.push({ id: 'exam-' + e.id, kind: 'exam', title: `${e.subject} exam`, detail: e.notes || 'You are ready. Breathe.', start: st, end: st + 120, fixed: true });
  });
  S.events.filter(e => e.date === ds && e.time).forEach(e => {
    const st = toMin(e.time);
    fixed.push({ id: 'ev-' + e.id, kind: 'event', title: e.title, detail: `${e.category} · ${e.priority} priority`, start: st, end: st + 90, fixed: true });
  });

  const blocks = [...fixed];
  const counts = {};
  const weekend = dow === 0 || dow === 6;
  let cur = toMin(S.settings.wake || '07:00') + (weekend ? 60 : 0);
  const place = (kind, title, dur, detail = '') => {
    let moved = true;
    while (moved) {
      moved = false;
      for (const f of fixed) if (cur < f.end && cur + dur > f.start) { cur = f.end + 15; moved = true; }
    }
    counts[kind] = (counts[kind] || 0) + 1;
    blocks.push({ id: kind + counts[kind], kind, title, detail, start: cur, end: cur + dur });
    cur += dur;
  };

  const load = studyLoad(date), queue = studyQueue(date), sessions = SESSIONS[load.hours];
  let si = 0;
  const study = () => { const s = queue[si % queue.length]; place('study', `Study · ${s.subject}`, sessions[si], s.detail); si++; };
  const room = ROOM[dow], well = WELLNESS[dow];
  const taskHint = () => {
    const open = (S.tasks[ds] || []).filter(t => !t.done).slice(0, 3).map(t => t.text);
    return open.length ? open.join(' · ') : 'Work through your daily task list';
  };

  place('self', 'Morning ritual & skincare', 30, 'Cleanse · serum · moisturise · SPF · a tall glass of water');
  place('meal', 'Breakfast', 30, mealFor(ds, 'breakfast').name);
  const school = fixed.find(f => f.kind === 'school');
  if (school) {
    cur = Math.max(cur, school.end + 15);
    place('meal', 'Afternoon snack', 15, mealFor(ds, 'snack').name);
    study();
    place('self', well.title, 60, well.detail);
    study();
    place('meal', 'Dinner', 45, mealFor(ds, 'dinner').name);
    place('room', `Organise · ${room.area}`, 60, room.detail);
    place('task', 'Tasks & to-dos', 30, taskHint());
    if (sessions[2]) study();
  } else {
    study();
    place('task', 'Tasks & errands', 30, taskHint());
    place('meal', 'Lunch', 45, mealFor(ds, 'lunch').name);
    place('room', `Organise · ${room.area}`, 60, room.detail);
    study();
    place('self', well.title, 60, well.detail);
    place('meal', 'Snack', 15, mealFor(ds, 'snack').name);
    if (sessions[2]) study();
    place('meal', 'Dinner', 45, mealFor(ds, 'dinner').name);
  }
  place('self', 'Evening skincare & wind-down', 30, 'Double cleanse · treatment · night cream · lip mask · 3 lines in your journal');
  blocks.sort((a, b) => a.start - b.start);
  return { ds, blocks, load };
}

/* ---------- Daily tasks from vision & goals ---------- */
function suggestedTasks(date) {
  const out = [];
  const active = S.goals.filter(g => g.steps.some(s => !s.done));
  const start = active.length ? dayOfYear(date) % active.length : 0;
  [...active.slice(start), ...active.slice(0, start)].slice(0, 3).forEach(g => {
    const s = g.steps.find(x => !x.done);
    out.push({ text: s.text, source: 'goal', goalId: g.id, stepId: s.id, tag: g.title });
  });
  S.goals.filter(g => !g.steps.length).slice(0, 1).forEach(g =>
    out.push({ text: `Break “${g.title}” into three small steps`, source: 'goal', goalId: g.id, tag: 'vision' }));
  if (!S.goals.length) out.push({ text: 'Write your vision and your first goal', source: 'goal', tag: 'vision' });

  assignmentsAhead(date).filter(a => a.days <= 3).forEach(a =>
    out.push({ text: `Make progress on “${a.title}”`, source: 'school', tag: `due ${dueLabel(a.days)}` }));
  examsAhead(date).filter(e => e.days > 0 && e.days <= 7).slice(0, 2).forEach(e =>
    out.push({ text: `20 flashcards + one past-paper question · ${e.subject}`, source: 'school', tag: `exam ${dueLabel(e.days)}` }));

  out.push({ text: `Organise: ${ROOM[date.getDay()].area}`, source: 'routine', tag: '1 hour' });
  out.push({ text: 'Complete morning & evening skincare', source: 'routine', tag: 'self-care' });
  const w = fitWorkout(iso(date));
  out.push({ text: `Workout: ${w.type} · ${w.name}`, source: 'routine', tag: `${w.minutes} min` });
  out.push({ text: 'Write a few lines in your journal', source: 'routine', tag: 'reflect' });
  const saving = S.savings.find(s => s.saved < s.target);
  if (saving) out.push({ text: `Move a little into “${saving.name}”`, source: 'routine', tag: 'finance' });
  return out.map(t => ({ id: uid(), done: false, ...t }));
}
function ensureTasks(ds) {
  if (!S.tasks[ds]) { S.tasks[ds] = suggestedTasks(fromIso(ds)); save(); }
}
function refreshTasks(ds) {
  const keep = (S.tasks[ds] || []).filter(t => t.done || t.source === 'manual');
  const fresh = suggestedTasks(fromIso(ds)).filter(n => !keep.some(k => k.text === n.text || (n.stepId && k.stepId === n.stepId)));
  S.tasks[ds] = [...keep, ...fresh];
  save(); rerender(); toast('Fresh suggestions, picked from your goals ✦');
}
function setStepDone(goalId, stepId, done) {
  const g = S.goals.find(x => x.id === goalId);
  const s = g && g.steps.find(x => x.id === stepId);
  if (!s) return;
  s.done = done;
  for (const ds in S.tasks) S.tasks[ds].forEach(t => { if (t.stepId === stepId) t.done = done; });
  if (done && g.steps.every(x => x.done)) toast(`Goal complete: “${g.title}” — so proud of you ♡`);
}
function toggleTask(ds, id) {
  const t = (S.tasks[ds] || []).find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  if (t.stepId) setStepDone(t.goalId, t.stepId, t.done);
  save(); rerender();
}

/* ================= Shared bits ================= */
const pageHead = (no, eyebrow, title, lede) => `
  <header class="page-head fade-in">
    <div class="eyebrow">${no} · ${eyebrow}</div>
    <h1>${title}</h1>
    ${lede ? `<p class="lede">${lede}</p>` : ''}
  </header>`;
const emptyState = (title, text, btn = '') => `<div class="empty"><span class="serif">${title}</span>${text}${btn ? `<div style="margin-top:16px">${btn}</div>` : ''}</div>`;
const countdown = days => `<span class="countdown ${days <= 3 ? 'urgent' : days <= 7 ? 'soon' : ''}">${dueLabel(days)}</span>`;

function eventRow(e, withDelete) {
  const d = fromIso(e.date), days = dayDiff(new Date(), d);
  return `<li class="ev ${days < 0 ? 'past' : ''}">
    <div class="ev-date"><b>${d.getDate()}</b><span>${MONTHS[d.getMonth()].slice(0, 3)}</span></div>
    <div class="ev-body"><h4>${esc(e.title)}</h4><p>${DAYS[d.getDay()]}${e.time ? ' · ' + fmtTime(toMin(e.time)) : ''}${days >= 0 ? ' · ' + dueLabel(days) : ''}</p></div>
    <span class="tag">${esc(e.category)}</span>
    <span class="prio prio-${e.priority}">${e.priority}</span>
    ${withDelete ? `<button class="x" data-act="del" data-col="events" data-id="${e.id}" aria-label="Delete">×</button>` : '<span></span>'}
  </li>`;
}

/* ================= Page: Today ================= */
function renderToday() {
  const now = new Date(), ds = iso(now), dow = now.getDay();
  ensureTasks(ds);
  const plan = buildPlan(now), done = S.planDone[ds] || [];
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const nextExam = examsAhead(now)[0];
  const activeGoal = S.goals.find(g => g.steps.some(s => !s.done));
  const defaultFocus = nextExam && nextExam.days <= 7 ? `${nextExam.subject} revision` : activeGoal ? activeGoal.title : 'Gentle consistency';
  const letter = LETTERS[dayOfYear(now) % LETTERS.length];
  const studyMin = plan.blocks.filter(b => b.kind === 'study').reduce((a, b) => a + b.end - b.start, 0);
  const tasks = S.tasks[ds] || [];
  const sc = S.selfcare[ds] || [];

  return `
  <section class="masthead fade-in page-head">
    <div>
      <div class="eyebrow">The Daily Edit · No. ${dayOfYear(now)} · ${now.getFullYear()}</div>
      <h1>${DAYS[dow]}, <em>${MONTHS[now.getMonth()]} ${now.getDate()}</em></h1>
      <p class="lede">${greet}, ${esc(S.settings.name)}. Your day, softly arranged.</p>
    </div>
    <a class="btn ghost" href="#/week">View the week</a>
  </section>

  <div class="split">
    <article class="card letter fade-in">
      <div class="eyebrow">A letter for today</div>
      <p class="salute">Dear ${esc(S.settings.name)},</p>
      <p class="body">${letter}</p>
      <p class="sign">With love, your future self ♡</p>
    </article>
    <article class="card fade-in">
      <div class="eyebrow">Today at a glance</div>
      <div class="recap" style="margin-top:8px">
        <div><div class="eyebrow">Weather</div><div id="weather"><div class="val">—</div><div class="hint">Loading…</div></div></div>
        <div><div class="eyebrow">Focus of the day</div><input data-bind="focus" value="${esc(S.focus[ds] || '')}" placeholder="${esc(defaultFocus)}" aria-label="Focus of the day"><div class="hint">Tap to write your own</div></div>
        <div><div class="eyebrow">Study today</div><div class="val">${studyMin / 60} hours</div><div class="hint">${esc(plan.load.reason)}</div></div>
        <div><div class="eyebrow">Next exam</div>${nextExam ? `<div class="val">${esc(nextExam.subject)}</div><div class="hint">${shortDate(nextExam.date)} · ${dueLabel(nextExam.days)}</div>` : `<div class="val">None yet</div><div class="hint"><a href="#/schedule" data-act="sched-goto" data-tab="exams">Add your exams</a></div>`}</div>
      </div>
    </article>
  </div>

  <div class="split section">
    <article class="card fade-in">
      <div class="card-head">
        <div><div class="eyebrow">Your day plan</div><h3>The <em>rhythm</em> of today</h3></div>
        <span class="tag">${done.length}/${plan.blocks.filter(b => !b.fixed).length} done</span>
      </div>
      <div class="plan-chips">
        <span class="tag"><b>${studyMin / 60}h</b> study</span>
        <span class="tag"><b>2h</b> self-care</span>
        <span class="tag"><b>1h</b> organising</span>
        <span class="tag"><b>${tasks.filter(t => !t.done).length}</b> open tasks</span>
      </div>
      ${!S.timetable.length ? `<p class="small muted" style="margin-bottom:12px">Tip: <a href="#/schedule">add your school timetable</a> so study, self-care and organising fit around your classes.</p>` : ''}
      <ol class="timeline">
        ${plan.blocks.map(b => `
          <li class="tl-item kind-${b.kind} ${done.includes(b.id) ? 'done' : ''} ${b.fixed ? 'fixed' : ''}">
            <div class="tl-time">${fmtTime(b.start)}<span>${fmtTime(b.end)}</span></div>
            <div class="tl-dot"></div>
            <div class="tl-body"><div class="tl-kind">${KIND_LABEL[b.kind]}</div><h4>${esc(b.title)}</h4><p>${esc(b.detail)}</p></div>
            ${b.fixed ? '<span></span>' : `<button class="check ${done.includes(b.id) ? 'on' : ''}" data-act="plan-toggle" data-id="${b.id}" aria-label="Mark ${esc(b.title)} done"></button>`}
          </li>`).join('')}
      </ol>
    </article>

    <div class="stack">
      <article class="card fade-in">
        <div class="card-head"><div><div class="eyebrow">Self-care</div><h3>Little <em>rituals</em></h3></div><span class="tag">${sc.length}/${SELFCARE.length}</span></div>
        <div class="selfcare-grid">
          ${SELFCARE.map((s, i) => `<button class="sc-item ${sc.includes(i) ? 'on' : ''}" data-act="selfcare" data-i="${i}"><i class="check sm ${sc.includes(i) ? 'on' : ''}"></i><span>${s}</span></button>`).join('')}
        </div>
      </article>

      <article class="card fade-in">
        <div class="card-head"><div><div class="eyebrow">From your goals</div><h3>Today’s <em>tasks</em></h3></div><a class="btn-text" href="#/tasks">All →</a></div>
        <ul class="mini-list">
          ${tasks.slice(0, 6).map(t => `<li class="${t.done ? 'done' : ''}"><button class="check sm ${t.done ? 'on' : ''}" data-act="task-toggle" data-d="${ds}" data-id="${t.id}" aria-label="Toggle task"></button><span>${esc(t.text)}</span></li>`).join('') || '<li class="muted">Nothing yet — add goals to get daily tasks.</li>'}
        </ul>
        ${tasks.length > 6 ? `<p class="small muted" style="margin-top:8px">+ ${tasks.length - 6} more on your task list</p>` : ''}
      </article>
    </div>
  </div>

  <section class="section fade-in">
    <div class="section-title"><div><div class="eyebrow">Habit tracker</div><h2>This week’s <em>devotions</em></h2></div></div>
    <article class="card">${habitTable(now)}</article>
  </section>

  <section class="section fade-in">
    <div class="section-title"><div><div class="eyebrow">Nourish</div><h2>Today’s <em>menu</em></h2></div><p class="small muted">Tap ↻ to swap any meal</p></div>
    <div class="meals">
      ${['breakfast', 'lunch', 'snack', 'dinner'].map(type => { const m = mealFor(ds, type); return `
        <article class="card meal">
          <div class="arch">${type[0].toUpperCase() + type.slice(1)}</div>
          <h4>${esc(m.name)}</h4>
          <p class="note">${m.time} · ${m.note}</p>
          <div class="actions"><button class="btn-text" data-act="recipe" data-type="${type}">Recipe</button><button class="icon-btn" data-act="meal-swap" data-type="${type}" aria-label="Swap ${type}">↻</button></div>
        </article>`; }).join('')}
    </div>
  </section>

  <section class="section fade-in">${monthEvents(now)}</section>`;
}

function habitTable(now) {
  const ws = weekStart(now), days = [...Array(7)].map((_, i) => addDays(ws, i)), ds = iso(now);
  const streak = h => {
    let n = 0, d = new Date(now);
    if (!(S.habitLog[ds] || []).includes(h.id)) d = addDays(d, -1);
    while ((S.habitLog[iso(d)] || []).includes(h.id)) { n++; d = addDays(d, -1); }
    return n;
  };
  if (!S.habits.length) return emptyState('No habits yet', 'Add one small thing you want to do every day.') + habitForm();
  return `<div class="habit-table-wrap"><table class="habit-table">
    <thead><tr><th>Habit</th>${days.map(d => `<th class="${iso(d) === ds ? 'today' : ''}">${DAYS[d.getDay()].slice(0, 3)}<small>${d.getDate()}</small></th>`).join('')}<th>Streak</th></tr></thead>
    <tbody>${S.habits.map(h => `<tr>
      <td><div class="name"><button class="x" data-act="habit-del" data-id="${h.id}" aria-label="Remove habit">×</button>${esc(h.name)}</div></td>
      ${days.map(d => { const k = iso(d), on = (S.habitLog[k] || []).includes(h.id);
        return `<td><button class="habit-cell ${on ? 'on' : ''} ${k === ds ? 'today' : ''} ${k > ds ? 'future' : ''}" data-act="habit" data-h="${h.id}" data-d="${k}" aria-label="${esc(h.name)} on ${DAYS[d.getDay()]}" ${k > ds ? 'disabled' : ''}></button></td>`; }).join('')}
      <td><span class="streak">${streak(h)}<small class="muted"> d</small></span></td>
    </tr>`).join('')}</tbody></table></div>${habitForm()}`;
}
const habitForm = () => `<form class="inline-form" data-form="habit"><input name="name" placeholder="Add a new habit…" required maxlength="40"><button class="btn sm">Add</button></form>`;

function monthEvents(now) {
  const mk = iso(now).slice(0, 7);
  const items = [
    ...S.events.filter(e => e.date.startsWith(mk)),
    ...S.exams.filter(e => e.date.startsWith(mk)).map(e => ({ ...e, title: `${e.subject} exam`, category: 'Exam', priority: 'high' })),
    ...S.assignments.filter(a => a.due.startsWith(mk) && !a.done).map(a => ({ ...a, date: a.due, title: a.title, category: 'Deadline', priority: 'high' })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  const cats = ['All', ...new Set(items.map(i => i.category))];
  if (!cats.includes(ui.eventCat)) ui.eventCat = 'All';
  const shown = items.filter(i => ui.eventCat === 'All' || i.category === ui.eventCat);
  return `
    <div class="section-title"><div><div class="eyebrow">${MONTHS[now.getMonth()]} ${now.getFullYear()}</div><h2>This month’s <em>events</em></h2></div>
      <a class="btn ghost sm" href="#/schedule" data-act="sched-goto" data-tab="events">+ Add event</a></div>
    <article class="card">
      ${items.length ? `<div class="chips" style="margin-bottom:12px">${cats.map(c => `<button class="chip ${ui.eventCat === c ? 'active' : ''}" data-act="event-cat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <ul class="ev-list">${shown.map(e => eventRow(e, false)).join('')}</ul>`
      : emptyState('A quiet month', 'Add birthdays, plans and appointments in your schedule.')}
    </article>`;
}

/* ---------- Weather (Open-Meteo, no key needed) ---------- */
let weatherCache = null;
const WX = c => c === 0 ? ['Clear skies', '☀'] : c <= 2 ? ['Partly cloudy', '⛅'] : c === 3 ? ['Overcast', '☁'] : c <= 48 ? ['Misty', '🌫'] : c <= 57 ? ['Drizzle', '🌦'] : c <= 67 ? ['Rain', '🌧'] : c <= 77 ? ['Snow', '❄'] : c <= 82 ? ['Showers', '🌦'] : ['Storms', '⛈'];
async function loadWeather() {
  const el = $('#weather');
  if (!el) return;
  if (weatherCache && Date.now() - weatherCache.at < 30 * 60e3) { el.innerHTML = weatherCache.html; return; }
  const fail = msg => { el.innerHTML = `<div class="val">—</div><div class="hint">${msg} <a href="#" data-act="settings">Set your city</a></div>`; };
  try {
    let lat, lon, place = S.settings.city;
    if (place) {
      const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(place)}`)).json();
      if (!g.results || !g.results.length) return fail('City not found.');
      ({ latitude: lat, longitude: lon, name: place } = g.results[0]);
    } else {
      if (!navigator.geolocation) return fail('');
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
      lat = pos.coords.latitude; lon = pos.coords.longitude; place = 'your area';
    }
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto&forecast_days=1`)).json();
    const t = Math.round(w.current.temperature_2m), [label, icon] = WX(w.current.weather_code);
    const uv = w.daily.uv_index_max[0];
    const tip = uv >= 3 ? 'SPF is a must today' : t < 12 ? 'Cosy layers & a rich moisturiser' : 'Light layers, glowing skin';
    const html = `<div class="val">${icon} ${t}° · ${label}</div><div class="hint">${esc(place)} · H ${Math.round(w.daily.temperature_2m_max[0])}° L ${Math.round(w.daily.temperature_2m_min[0])}° · ${tip}</div>`;
    weatherCache = { at: Date.now(), html };
    if ($('#weather')) $('#weather').innerHTML = html;
  } catch (e) { fail('Weather unavailable.'); }
}

/* ================= Page: Week ================= */
function renderWeek() {
  const ws = addDays(weekStart(new Date()), ui.weekOffset * 7), days = [...Array(7)].map((_, i) => addDays(ws, i));
  const we = days[6], today = todayIso(), wk = iso(ws);
  const plans = days.map(buildPlan);
  const inWeek = s => s >= iso(ws) && s <= iso(we);
  const exams = S.exams.filter(e => inWeek(e.date)), dues = S.assignments.filter(a => inWeek(a.due) && !a.done), evs = S.events.filter(e => inWeek(e.date));
  const studyHrs = plans.reduce((a, p) => a + p.blocks.filter(b => b.kind === 'study').reduce((x, b) => x + b.end - b.start, 0), 0) / 60;

  return `${pageHead('No. 02', 'This Week', `${shortDate(iso(ws))} — <em>${shortDate(iso(we))}</em>`, 'Every day is built automatically from your timetable, exams and goals: 2–3 hours of study, 2 hours of self-care and 1 hour of organising.')}
  <div class="week-nav" style="margin-bottom:24px">
    <button class="btn ghost sm" data-act="week-nav" data-n="-1">← Previous</button>
    <button class="btn ghost sm" data-act="week-now">This week</button>
    <button class="btn ghost sm" data-act="week-nav" data-n="1">Next →</button>
  </div>
  <div class="tiles" style="margin-bottom:28px">
    <div class="tile dark"><div class="eyebrow">Study planned</div><div class="num">${studyHrs}<small> h</small></div><p>Flexes with your exams</p></div>
    <div class="tile"><div class="eyebrow">Self-care</div><div class="num">14<small> h</small></div><p>2 hours every day</p></div>
    <div class="tile"><div class="eyebrow">Exams</div><div class="num">${exams.length}</div><p>${exams.map(e => esc(e.subject)).join(', ') || 'None this week'}</p></div>
    <div class="tile"><div class="eyebrow">Deadlines</div><div class="num">${dues.length}</div><p>${dues.map(a => esc(a.title)).join(', ') || 'All clear'}</p></div>
    <div class="tile"><div class="eyebrow">Events</div><div class="num">${evs.length}</div><p>${evs.slice(0, 2).map(e => esc(e.title)).join(', ') || 'Room to breathe'}</p></div>
  </div>
  <div class="week-grid">
    ${plans.map((p, i) => { const d = days[i]; const st = p.blocks.filter(b => b.kind === 'study').reduce((x, b) => x + b.end - b.start, 0) / 60; return `
      <section class="wk-day ${p.ds === today ? 'today' : ''}">
        <header><span>${DAYS[d.getDay()].slice(0, 3)}</span><b>${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}</b><span class="wk-study">${st}h study</span></header>
        <ul class="wk-list">${p.blocks.filter(b => b.kind !== 'meal').map(b => `<li class="wk-b kind-${b.kind}"><time>${fmtTime(b.start)}</time>${esc(b.title)}</li>`).join('')}</ul>
      </section>`; }).join('')}
  </div>
  <section class="section">
    <article class="card">
      <div class="eyebrow">Weekly intention</div>
      <h3 style="margin:6px 0 14px">This week, <em>I will…</em></h3>
      <div class="field"><textarea data-bind="weeknote" data-k="${wk}" placeholder="Three words, one feeling, one promise to myself…">${esc(S.weekNotes[wk] || '')}</textarea></div>
    </article>
  </section>`;
}

/* ================= Page: Schedule ================= */
function renderSchedule() {
  const tabs = [['timetable', 'Timetable', S.timetable.length], ['exams', 'Exams', S.exams.length], ['assignments', 'Assignments', S.assignments.filter(a => !a.done).length], ['events', 'Events', S.events.length]];
  const body = { timetable: schedTimetable, exams: schedExams, assignments: schedAssignments, events: schedEvents }[ui.schedTab]();
  return `${pageHead('No. 03', 'Schedule', 'The <em>architecture</em> of your week', 'Add your classes, exams, assignments and plans. Your daily study hours and subjects re-arrange themselves around them automatically.')}
  <div class="tabs">${tabs.map(([k, l, c]) => `<button class="tab ${ui.schedTab === k ? 'active' : ''}" data-act="sched-tab" data-tab="${k}">${l}<span class="count">${c}</span></button>`).join('')}</div>
  ${body}`;
}

function schedTimetable() {
  const today = new Date().getDay();
  const shownDays = WEEK_ORDER.filter(d => d >= 1 && d <= 5 || S.timetable.some(c => c.day === d));
  return `<div class="split">
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">Weekly timetable</div><h3>Your <em>classes</em></h3></div></div>
      ${S.timetable.length ? `<div class="tt-grid">${shownDays.map(d => `
        <div class="tt-day ${d === today ? 'today' : ''}"><h4>${DAYS[d]}</h4>
          ${S.timetable.filter(c => c.day === d).sort((a, b) => toMin(a.start) - toMin(b.start)).map(c => `
            <div class="class-chip"><b>${esc(c.subject)}</b><span>${fmtTime(toMin(c.start))} – ${fmtTime(toMin(c.end))}${c.room ? ' · ' + esc(c.room) : ''}</span>
            <button class="x" data-act="del" data-col="timetable" data-id="${c.id}" aria-label="Delete class">×</button></div>`).join('') || '<p class="small muted">Free day</p>'}
        </div>`).join('')}</div>`
      : emptyState('Your timetable is empty', 'Add each class on the right, or load a sample week to see how it works.', '<button class="btn ghost sm" data-act="sample">Load sample week</button>')}
    </article>
    <article class="card">
      <div class="eyebrow">Add a class</div><h3 style="margin:6px 0 18px">New <em>lesson</em></h3>
      <form data-form="timetable" class="form-grid">
        <div class="field"><label>Day</label><select name="day">${WEEK_ORDER.map(d => `<option value="${d}" ${d === (today || 1) ? 'selected' : ''}>${DAYS[d]}</option>`).join('')}</select></div>
        <div class="field"><label>Subject</label><input name="subject" required placeholder="Biology" list="subjects"></div>
        <div class="field"><label>Starts</label><input type="time" name="start" required value="08:00"></div>
        <div class="field"><label>Ends</label><input type="time" name="end" required value="09:00"></div>
        <div class="field full"><label>Room / teacher (optional)</label><input name="room" placeholder="Lab 2 · Ms. Sara"></div>
        <div class="full"><button class="btn">Add class</button></div>
      </form>
      ${subjectsDatalist()}
    </article>
  </div>`;
}
function subjectsDatalist() {
  const subs = [...new Set([...S.timetable.map(c => c.subject), ...S.exams.map(e => e.subject), ...S.assignments.map(a => a.subject)].filter(Boolean))];
  return `<datalist id="subjects">${subs.map(s => `<option value="${esc(s)}">`).join('')}</datalist>`;
}

function schedExams() {
  const now = new Date();
  const list = [...S.exams].sort((a, b) => a.date.localeCompare(b.date));
  return `<div class="split">
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">Exam timetable</div><h3>Upcoming <em>exams</em></h3></div></div>
      <p class="small muted" style="margin-bottom:10px">Within 14 days of an exam your study time rises to 2.5h; within 7 days to 3h, focused on that subject.</p>
      ${list.length ? `<ul class="ev-list">${list.map(e => { const d = fromIso(e.date), days = dayDiff(now, d); return `
        <li class="ev ${days < 0 ? 'past' : ''}">
          <div class="ev-date"><b>${d.getDate()}</b><span>${MONTHS[d.getMonth()].slice(0, 3)}</span></div>
          <div class="ev-body"><h4>${esc(e.subject)}</h4><p>${DAYS[d.getDay()]}${e.time ? ' · ' + fmtTime(toMin(e.time)) : ''}${e.notes ? ' · ' + esc(e.notes) : ''}</p></div>
          <span></span>${days >= 0 ? countdown(days) : '<span class="small muted">done</span>'}
          <button class="x" data-act="del" data-col="exams" data-id="${e.id}" aria-label="Delete exam">×</button>
        </li>`; }).join('')}</ul>` : emptyState('No exams yet', 'Add your exam timetable and your study plan adapts.')}
    </article>
    <article class="card">
      <div class="eyebrow">Add an exam</div><h3 style="margin:6px 0 18px">New <em>exam</em></h3>
      <form data-form="exam" class="form-grid">
        <div class="field"><label>Subject</label><input name="subject" required list="subjects" placeholder="Chemistry"></div>
        <div class="field"><label>Date</label><input type="date" name="date" required></div>
        <div class="field"><label>Time</label><input type="time" name="time"></div>
        <div class="field full"><label>Topics / notes</label><input name="notes" placeholder="Organic chemistry, paper 2"></div>
        <div class="full"><button class="btn">Add exam</button></div>
      </form>
      ${subjectsDatalist()}
    </article>
  </div>`;
}

function schedAssignments() {
  const now = new Date();
  const list = [...S.assignments].sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));
  return `<div class="split">
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">Upcoming</div><h3>Assignments</h3></div></div>
      ${list.length ? `<ul class="task-list">${list.map(a => { const days = dayDiff(now, fromIso(a.due)); return `
        <li class="task ${a.done ? 'done' : ''}">
          <button class="check ${a.done ? 'on' : ''}" data-act="assign-toggle" data-id="${a.id}" aria-label="Toggle done"></button>
          <div class="txt"><span>${esc(a.title)}</span><div class="small muted">${esc(a.subject || '')}${a.subject ? ' · ' : ''}due ${shortDate(a.due)}</div></div>
          ${a.done ? '<span class="small muted">submitted</span>' : countdown(days)}
          <button class="x" data-act="del" data-col="assignments" data-id="${a.id}" aria-label="Delete">×</button>
        </li>`; }).join('')}</ul>` : emptyState('Nothing due', 'Add assignments and they appear in your daily tasks as the deadline gets close.')}
    </article>
    <article class="card">
      <div class="eyebrow">Add an assignment</div><h3 style="margin:6px 0 18px">New <em>assignment</em></h3>
      <form data-form="assignment" class="form-grid">
        <div class="field full"><label>Title</label><input name="title" required placeholder="Essay on The Great Gatsby"></div>
        <div class="field"><label>Subject</label><input name="subject" list="subjects" placeholder="English"></div>
        <div class="field"><label>Due date</label><input type="date" name="due" required></div>
        <div class="full"><button class="btn">Add assignment</button></div>
      </form>
      ${subjectsDatalist()}
    </article>
  </div>`;
}

function schedEvents() {
  const list = [...S.events].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = list.filter(e => e.date >= todayIso()), past = list.filter(e => e.date < todayIso()).slice(-5);
  return `<div class="split">
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">Upcoming</div><h3>Events & <em>plans</em></h3></div></div>
      ${list.length ? `<ul class="ev-list">${[...past, ...upcoming].map(e => eventRow(e, true)).join('')}</ul>` : emptyState('No events yet', 'Birthdays, appointments, outings — add them with a priority and category.')}
    </article>
    <article class="card">
      <div class="eyebrow">Add an event</div><h3 style="margin:6px 0 18px">New <em>event</em></h3>
      <form data-form="event" class="form-grid">
        <div class="field full"><label>Title</label><input name="title" required placeholder="Brunch with the girls"></div>
        <div class="field"><label>Date</label><input type="date" name="date" required value="${todayIso()}"></div>
        <div class="field"><label>Time (optional)</label><input type="time" name="time"></div>
        <div class="field"><label>Category</label><select name="category">${EVENT_CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Priority</label><select name="priority"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div>
        <div class="full"><button class="btn">Add event</button></div>
      </form>
      <p class="small muted" style="margin-top:14px">Events with a time are blocked out in your day plan, and everything else flows around them.</p>
    </article>
  </div>`;
}

/* ================= Page: Vision & Goals ================= */
function goalPace(g) {
  const total = g.steps.length, done = g.steps.filter(s => s.done).length;
  if (!total) return { cls: 'neutral', text: 'Add a few small steps. I’ll place the next one on your task list each day.' };
  if (done === total) return { cls: 'good', text: 'Complete. Take a moment to celebrate this ♡' };
  if (!g.target) return { cls: 'neutral', text: `Next step: ${g.steps.find(s => !s.done).text}` };
  const span = Math.max(1, dayDiff(fromIso(g.created), fromIso(g.target)));
  const elapsed = Math.min(span, Math.max(0, dayDiff(fromIso(g.created), new Date())));
  const expected = elapsed / span, actual = done / total;
  const left = dayDiff(new Date(), fromIso(g.target));
  if (left < 0) return { cls: 'behind', text: 'Target date has passed. Choose a new, kinder date and keep going.' };
  if (actual + 0.05 >= expected) return { cls: 'good', text: `On pace, beautifully done. ${plural(left, 'day')} to go.` };
  return { cls: 'behind', text: `A little behind (${Math.round(actual * 100)}% vs ${Math.round(expected * 100)}% of the way). A step from this goal is on today’s list.` };
}

function goalCard(g) {
  const total = g.steps.length, done = g.steps.filter(s => s.done).length, pct = total ? Math.round(done / total * 100) : 0;
  const pace = goalPace(g);
  return `<article class="card goal">
    <div class="card-head" style="margin-bottom:0"><span class="tag">${esc(g.category)}</span><button class="icon-btn" data-act="goal-del" data-id="${g.id}" aria-label="Remove goal">×</button></div>
    <h3>${esc(g.title)}</h3>
    ${g.why ? `<p class="why">“${esc(g.why)}”</p>` : ''}
    <div class="progress"><div style="width:${pct}%"></div></div>
    <div class="goal-meta"><span>${done}/${total} steps · ${pct}%</span><span>${g.target ? 'by ' + shortDate(g.target) : 'no deadline'}</span></div>
    <p class="pace ${pace.cls}">${esc(pace.text)}</p>
    <ul class="steps">${g.steps.map(s => `<li class="${s.done ? 'done' : ''}">
      <button class="check sm ${s.done ? 'on' : ''}" data-act="step-toggle" data-g="${g.id}" data-s="${s.id}" aria-label="Toggle step"></button>
      <span>${esc(s.text)}</span><button class="x" data-act="step-del" data-g="${g.id}" data-s="${s.id}" aria-label="Delete step">×</button></li>`).join('')}</ul>
    <form data-form="step" data-g="${g.id}" class="inline-form"><input name="text" placeholder="Add a small step…" required maxlength="120"><button class="btn-text">Add</button></form>
    <div class="goal-foot"><button class="btn-text" data-act="goal-suggest" data-id="${g.id}">✦ Suggest steps</button></div>
  </article>`;
}

function renderGoals() {
  const wk = iso(weekStart(new Date()));
  const prompt = REFLECTIONS[Math.floor(dayOfYear(new Date()) / 7) % REFLECTIONS.length];
  const todaysGoalTasks = (S.tasks[todayIso()] || []).filter(t => t.source === 'goal');
  return `${pageHead('No. 04', 'Vision & Goals', 'Become <em>her</em>, gently', 'Write the life you are building, then break it into small steps. Each day the next step of every goal is added to your task list automatically.')}
  <section class="card vision fade-in">
    <div class="eyebrow">My vision</div>
    <textarea class="vision-text" data-bind="vision" placeholder="A year from now, I am…">${esc(S.vision.statement)}</textarea>
    <div class="words">
      ${S.vision.words.map(w => `<span class="word">${esc(w)}<button class="x" data-act="word-del" data-w="${esc(w)}" aria-label="Remove word">×</button></span>`).join('')}
      <form data-form="word" class="word-form"><input name="w" placeholder="+ a word for this season" maxlength="24"></form>
    </div>
  </section>

  <div class="split section">
    <section>
      <div class="section-title"><div><div class="eyebrow">${S.goals.length} goals</div><h2>Goals in <em>bloom</em></h2></div></div>
      ${S.goals.length ? `<div class="goals-list">${S.goals.map(goalCard).join('')}</div>` : `<article class="card">${emptyState('Plant your first goal', 'Give it a category and I’ll suggest steps to get you there.')}</article>`}
    </section>
    <aside class="stack">
      <article class="card">
        <div class="eyebrow">Set an intention</div><h3 style="margin:6px 0 18px">New <em>goal</em></h3>
        <form data-form="goal" class="form-grid">
          <div class="field full"><label>Goal</label><input name="title" required placeholder="Get an A in Biology" maxlength="80"></div>
          <div class="field"><label>Category</label><select name="category">${GOAL_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div>
          <div class="field"><label>Target date</label><input type="date" name="target"></div>
          <div class="field full"><label>Why it matters to me</label><input name="why" placeholder="Because…" maxlength="140"></div>
          <label class="full small muted" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="suggest" checked> Start me off with suggested steps</label>
          <div class="full"><button class="btn">Add goal</button></div>
        </form>
      </article>
      <article class="card">
        <div class="eyebrow">Today, toward your vision</div>
        <ul class="mini-list" style="margin-top:8px">${todaysGoalTasks.map(t => `<li class="${t.done ? 'done' : ''}"><button class="check sm ${t.done ? 'on' : ''}" data-act="task-toggle" data-d="${todayIso()}" data-id="${t.id}" aria-label="Toggle"></button><span>${esc(t.text)}</span></li>`).join('') || '<li class="muted small">Add a goal with steps to see today’s actions here.</li>'}</ul>
      </article>
      <article class="card">
        <div class="eyebrow">Weekly reflection</div>
        <p class="prompt">${prompt}</p>
        <div class="field"><textarea data-bind="reflection" data-k="${wk}" placeholder="Write freely…">${esc(S.reflections[wk] || '')}</textarea></div>
      </article>
    </aside>
  </div>`;
}

/* ================= Page: Tasks ================= */
function renderTasks() {
  const ds = ui.taskDate, isToday = ds === todayIso(), isPast = ds < todayIso();
  if (isToday) ensureTasks(ds);
  const list = S.tasks[ds] || [], done = list.filter(t => t.done).length;
  const pct = list.length ? done / list.length : 0, C = 2 * Math.PI * 46;
  const d = fromIso(ds);
  const groups = [['goal', 'From your vision & goals', '✦'], ['school', 'School & exams', '✎'], ['routine', 'Daily rhythm', '◌'], ['manual', 'Your additions', '♡']];
  return `${pageHead('No. 05', 'Daily Tasks', 'Small steps, <em>every day</em>', 'A fresh list each morning, chosen from your goals, deadlines and routines. Ticking off a goal step moves that goal forward.')}
  <div class="split">
    <article class="card">
      <div class="task-day">
        <button class="icon-btn" data-act="task-day" data-n="-1" aria-label="Previous day">←</button>
        <div class="date">${isToday ? 'Today' : DAYS[d.getDay()]}, <em>${shortDate(ds)}</em></div>
        <button class="icon-btn" data-act="task-day" data-n="1" aria-label="Next day">→</button>
        ${!isToday ? '<button class="btn-text" data-act="task-today">Back to today</button>' : ''}
      </div>
      ${groups.map(([src, label, ic]) => { const items = list.filter(t => (t.source || 'manual') === src); if (!items.length) return ''; return `
        <div class="task-group"><div class="eyebrow">${ic} ${label}</div>
          <ul class="task-list">${items.map(t => `<li class="task ${t.done ? 'done' : ''}">
            <button class="check ${t.done ? 'on' : ''}" data-act="task-toggle" data-d="${ds}" data-id="${t.id}" aria-label="Toggle task"></button>
            <div class="txt"><span>${esc(t.text)}</span>${t.tag ? `<span class="tag">${esc(t.tag)}</span>` : ''}</div>
            <button class="x" data-act="task-del" data-d="${ds}" data-id="${t.id}" aria-label="Delete task">×</button></li>`).join('')}</ul>
        </div>`; }).join('') || `<div style="margin-top:20px">${emptyState(isPast ? 'Nothing recorded' : 'An open page', isPast ? 'No tasks were saved for this day.' : 'Generate suggestions from your goals, or add your own below.')}</div>`}
      <form data-form="task" class="inline-form" style="margin-top:24px"><input name="text" placeholder="Add a task for ${isToday ? 'today' : 'this day'}…" required maxlength="140"><button class="btn sm">Add</button></form>
    </article>
    <aside class="stack">
      <article class="card">
        <div class="ring-wrap">
          <svg class="ring" viewBox="0 0 110 110" aria-hidden="true"><circle class="bg" cx="55" cy="55" r="46"/><circle class="fg" cx="55" cy="55" r="46" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/><text x="55" y="63" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>
          <div><div class="eyebrow">Progress</div><h3>${done} of ${list.length}</h3><p class="small muted">${pct === 1 && list.length ? 'Every single one. Wow.' : pct >= .5 ? 'Over halfway — keep the glow going.' : 'One gentle tick at a time.'}</p></div>
        </div>
      </article>
      ${!isPast ? `<article class="card">
        <div class="eyebrow">Suggestions</div><h3 style="margin:6px 0 10px">Refresh from <em>goals</em></h3>
        <p class="small muted" style="margin-bottom:16px">Picks up new steps you’ve added, upcoming deadlines and exams. Your own tasks and finished ones are kept.</p>
        <button class="btn" data-act="task-refresh">✦ Suggest tasks</button>
      </article>` : ''}
    </aside>
  </div>`;
}

/* ================= Page: Productivity ================= */
const timer = { len: 25, remaining: 25 * 60, running: false, subject: '', endAt: 0, iv: null };
function paintTimer() {
  const t = `${pad(Math.floor(timer.remaining / 60))}:${pad(timer.remaining % 60)}`;
  const el = $('#timerDisplay'); if (el) el.textContent = t;
  const pill = $('#timerPill'); pill.hidden = !timer.running; pill.querySelector('span').textContent = t;
  const b = $('#timerToggle'); if (b) b.textContent = timer.running ? 'Pause' : 'Begin';
  document.title = timer.running ? `${t} · Focus` : 'Fofo · The Weekly Edit';
}
function startTimer() {
  timer.running = true; timer.endAt = Date.now() + timer.remaining * 1000;
  timer.iv = setInterval(() => {
    timer.remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    if (timer.remaining <= 0) finishTimer(timer.len);
    paintTimer();
  }, 500);
  paintTimer();
}
function pauseTimer() { timer.running = false; clearInterval(timer.iv); paintTimer(); }
function finishTimer(minutes) {
  pauseTimer();
  if (minutes > 0) {
    S.focusLog.push({ id: uid(), date: todayIso(), minutes, subject: timer.subject.trim() || 'Focus' });
    save(); chime(); toast(`Beautiful — ${minutes} minutes logged ✦`);
  }
  timer.remaining = timer.len * 60; paintTimer();
  if (ui.route === 'productivity') rerender();
}
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * .18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * .18 + .02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * .18 + .9);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * .18); o.stop(ctx.currentTime + i * .18 + 1);
    });
  } catch (e) { /* audio is optional */ }
}

function dayStats(ds) {
  const t = S.tasks[ds] || [];
  return {
    done: t.filter(x => x.done).length, total: t.length,
    focus: S.focusLog.filter(f => f.date === ds).reduce((a, f) => a + +f.minutes, 0),
    habits: (S.habitLog[ds] || []).length,
  };
}

function renderProductivity() {
  const now = new Date(), ds = iso(now);
  const last7 = [...Array(7)].map((_, i) => iso(addDays(now, i - 6)));
  const s7 = last7.map(dayStats);
  const focusToday = dayStats(ds).focus;
  const focusWeek = s7.reduce((a, s) => a + s.focus, 0);
  const tasksWeek = s7.reduce((a, s) => a + s.done, 0), tasksTotal = s7.reduce((a, s) => a + s.total, 0);
  const habitPct = S.habits.length ? Math.round(s7.reduce((a, s) => a + s.habits, 0) / (S.habits.length * 7) * 100) : 0;
  // Best weekday across the last 4 weeks
  const byDow = Array(7).fill(0);
  for (let i = 0; i < 28; i++) { const d = addDays(now, -i), st = dayStats(iso(d)); byDow[d.getDay()] += st.focus + st.done * 15; }
  const best = byDow.some(v => v) ? DAYS[byDow.indexOf(Math.max(...byDow))] : null;
  const score = Math.min(100, Math.round((Math.min(focusWeek / (7 * 120), 1) * 45) + (tasksTotal ? tasksWeek / tasksTotal * 35 : 0) + habitPct * .2));
  const recent = [...S.focusLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return `${pageHead('No. 06', 'Productivity', 'Quiet, <em>focused</em> hours', 'Use the focus timer while you study. Every session is logged and charted alongside the tasks you finish.')}
  <div class="split">
    <article class="card timer-card">
      <div class="eyebrow">Focus timer</div>
      <div class="timer-display" id="timerDisplay">${pad(Math.floor(timer.remaining / 60))}:${pad(timer.remaining % 60)}</div>
      <div class="chips">${[25, 50, 60, 90].map(m => `<button class="chip ${timer.len === m ? 'active' : ''}" data-act="timer-len" data-len="${m}">${m} min</button>`).join('')}</div>
      <div class="field"><label>Studying</label><input data-bind="timer-subject" value="${esc(timer.subject)}" placeholder="${esc(studyQueue(now)[0].subject)}" list="subjects"></div>
      ${subjectsDatalist()}
      <div class="timer-actions">
        <button class="btn" id="timerToggle" data-act="timer-toggle">${timer.running ? 'Pause' : 'Begin'}</button>
        <button class="btn ghost" data-act="timer-reset">Reset</button>
        <button class="btn ghost" data-act="timer-log">Finish & log</button>
      </div>
    </article>
    <div class="stack">
      <div class="tiles">
        <div class="tile dark"><div class="eyebrow">Weekly score</div><div class="num">${score}</div><p>focus · tasks · habits</p></div>
        <div class="tile"><div class="eyebrow">Focus today</div><div class="num">${(focusToday / 60).toFixed(1)}<small> h</small></div><p>Goal: ${studyLoad(now).hours}h</p></div>
        <div class="tile"><div class="eyebrow">Focus · 7 days</div><div class="num">${(focusWeek / 60).toFixed(1)}<small> h</small></div><p>${S.focusLog.length} sessions all-time</p></div>
        <div class="tile"><div class="eyebrow">Tasks · 7 days</div><div class="num">${tasksWeek}<small>/${tasksTotal}</small></div><p>Habits ${habitPct}% consistent</p></div>
      </div>
      <article class="card">
        <div class="eyebrow">Insight</div>
        <p class="insight" style="margin-top:8px">${best ? `Your most productive day lately is <em>${best}</em>. Protect it — and copy its rhythm.` : 'Log a few focus sessions and your patterns will appear here.'}</p>
      </article>
    </div>
  </div>

  <section class="section">
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">Last 14 days</div><h3>Productivity <em>chart</em></h3></div></div>
      <div class="chart-box"><canvas id="prodChart"></canvas></div>
    </article>
  </section>

  <div class="split even section">
    <article class="card">
      <div class="eyebrow">Last 30 days</div><h3 style="margin:6px 0 14px">Focus by <em>subject</em></h3>
      <div class="chart-box sm"><canvas id="subjectChart"></canvas></div>
    </article>
    <article class="card">
      <div class="eyebrow">Log a session</div><h3 style="margin:6px 0 14px">Studied <em>offline?</em></h3>
      <form data-form="focuslog" class="form-grid">
        <div class="field"><label>Subject</label><input name="subject" required list="subjects" placeholder="Maths"></div>
        <div class="field"><label>Minutes</label><input type="number" name="minutes" min="5" max="600" step="5" value="45" required></div>
        <div class="field"><label>Date</label><input type="date" name="date" value="${ds}" max="${ds}" required></div>
        <div><button class="btn">Log</button></div>
      </form>
      <ul class="mini-list" style="margin-top:18px">${recent.map(f => `<li><span>${esc(f.subject)}</span><span class="meta">${f.minutes} min · ${shortDate(f.date)}</span><button class="x" data-act="del" data-col="focusLog" data-id="${f.id}" aria-label="Delete">×</button></li>`).join('') || '<li class="muted small">No sessions yet.</li>'}</ul>
    </article>
  </div>`;
}

let charts = [];
const destroyCharts = () => { charts.forEach(c => c.destroy()); charts = []; };
const PALETTE = ['#5E1B2D', '#C98A8C', '#DCC8AC', '#7C2C40', '#E2B4B1', '#B9A285', '#3E1620', '#F3DEDA', '#A99A90'];
function chartSetup() {
  if (typeof Chart === 'undefined') {
    document.querySelectorAll('canvas').forEach(c => c.parentElement.innerHTML = '<div class="chart-fallback">Charts need an internet connection to load.</div>');
    return false;
  }
  Chart.defaults.font.family = 'Jost, sans-serif';
  Chart.defaults.color = '#8A7470';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  return true;
}
function drawProductivity() {
  if (!chartSetup()) return;
  const now = new Date(), days = [...Array(14)].map((_, i) => addDays(now, i - 13));
  const st = days.map(d => dayStats(iso(d)));
  charts.push(new Chart($('#prodChart'), {
    data: {
      labels: days.map(d => `${DAYS[d.getDay()].slice(0, 2)} ${d.getDate()}`),
      datasets: [
        { type: 'bar', label: 'Focus hours', data: st.map(s => +(s.focus / 60).toFixed(2)), backgroundColor: '#5E1B2D', borderRadius: 8, maxBarThickness: 26, yAxisID: 'y' },
        { type: 'line', label: 'Tasks completed %', data: st.map(s => s.total ? Math.round(s.done / s.total * 100) : 0), borderColor: '#C98A8C', backgroundColor: '#C98A8C', cubicInterpolationMode: 'monotone', pointRadius: 3, yAxisID: 'y1' },
        { type: 'line', label: 'Habits done', data: st.map(s => s.habits), borderColor: '#B9A285', backgroundColor: '#B9A285', borderDash: [4, 4], cubicInterpolationMode: 'monotone', pointRadius: 0, yAxisID: 'y2' },
      ],
    },
    options: {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, title: { display: true, text: 'hours' }, grid: { color: '#EEE3D3' } },
        y1: { beginAtZero: true, max: 100, position: 'right', grid: { display: false }, ticks: { callback: v => v + '%' } },
        y2: { display: false, beginAtZero: true, suggestedMax: Math.max(S.habits.length, 1) * 1.2 },
      },
      plugins: { legend: { position: 'bottom' } },
    },
  }));
  const cutoff = iso(addDays(now, -30)), bySub = {};
  S.focusLog.filter(f => f.date >= cutoff).forEach(f => bySub[f.subject] = (bySub[f.subject] || 0) + +f.minutes);
  const keys = Object.keys(bySub);
  if (!keys.length) { $('#subjectChart').parentElement.innerHTML = '<div class="chart-fallback">No focus sessions in the last 30 days.</div>'; return; }
  charts.push(new Chart($('#subjectChart'), {
    type: 'doughnut',
    data: { labels: keys, datasets: [{ data: keys.map(k => +(bySub[k] / 60).toFixed(1)), backgroundColor: PALETTE, borderColor: '#FDF9F3', borderWidth: 3 }] },
    options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}h` } } } },
  }));
}

/* ================= Page: Finance ================= */
function renderFinance() {
  const mk = todayIso().slice(0, 7), now = new Date();
  const month = S.transactions.filter(t => t.date.startsWith(mk));
  const income = month.filter(t => t.type === 'income').reduce((a, t) => a + +t.amount, 0);
  const spent = month.filter(t => t.type === 'expense').reduce((a, t) => a + +t.amount, 0);
  const savedMonth = S.savings.reduce((a, s) => a + (s.deposits || []).filter(d => d.date.startsWith(mk)).reduce((x, d) => x + +d.amount, 0), 0);
  const totalSaved = S.savings.reduce((a, s) => a + +s.saved, 0);
  const budget = +S.settings.budget || 0;
  const tip = SAVING_TIPS[dayOfYear(now) % SAVING_TIPS.length];
  const recent = [...S.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  const cats = ui.txType === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return `${pageHead('No. 07', 'Finance', 'Saving for the <em>soft life</em>', 'Track what comes in and goes out, and watch your savings goals grow.')}
  <div class="tiles">
    <div class="tile dark"><div class="eyebrow">Total saved</div><div class="num">${money(totalSaved)}</div><p>across ${plural(S.savings.length, 'goal')}</p></div>
    <div class="tile"><div class="eyebrow">In · ${MONTHS[now.getMonth()]}</div><div class="num">${money(income)}</div><p>income this month</p></div>
    <div class="tile"><div class="eyebrow">Spent</div><div class="num">${money(spent)}</div><p>${budget ? `${Math.round(spent / budget * 100)}% of budget` : 'set a budget below'}</p></div>
    <div class="tile"><div class="eyebrow">${budget ? 'Budget left' : 'Saved this month'}</div><div class="num">${budget ? money(Math.max(0, budget - spent)) : money(savedMonth)}</div><p>${budget ? `of ${money(budget)} monthly` : 'into your goals'}</p></div>
  </div>

  <section class="section">
    <div class="section-title"><div><div class="eyebrow">Savings goals</div><h2>Little by <em>little</em></h2></div></div>
    <div class="savings-grid">
      ${S.savings.map(s => { const pct = Math.min(100, Math.round(s.saved / s.target * 100)); const left = s.target - s.saved;
        const days = s.deadline ? dayDiff(now, fromIso(s.deadline)) : null; const perWeek = days > 0 ? left / Math.max(1, Math.ceil(days / 7)) : null;
        return `<article class="card saving">
          <div class="card-head" style="margin-bottom:4px"><span class="tag">${pct}%</span><button class="x" data-act="del" data-col="savings" data-id="${s.id}" aria-label="Delete goal">×</button></div>
          <h3>${esc(s.name)}</h3>
          <div class="amt">${money(s.saved)} <small>of ${money(s.target)}</small></div>
          <div class="progress"><div style="width:${pct}%"></div></div>
          <p class="small muted" style="margin-top:10px">${left <= 0 ? 'Fully funded — enjoy it ♡' : perWeek ? `Save ${money(Math.ceil(perWeek))} a week to reach it by ${shortDate(s.deadline)}` : s.deadline ? 'Deadline reached' : `${money(left)} to go`}</p>
          <form data-form="deposit" data-id="${s.id}" class="inline-form"><input type="number" name="amount" step="0.01" placeholder="Add amount" required aria-label="Amount"><button class="btn sm">Add</button></form>
        </article>`; }).join('')}
      <article class="card">
        <div class="eyebrow">New savings goal</div>
        <form data-form="saving" class="form-grid" style="margin-top:12px">
          <div class="field full"><label>Saving for</label><input name="name" required placeholder="Weekend in Paris"></div>
          <div class="field"><label>Target</label><input type="number" name="target" min="1" step="0.01" required></div>
          <div class="field"><label>Already saved</label><input type="number" name="saved" min="0" step="0.01" value="0"></div>
          <div class="field full"><label>By (optional)</label><input type="date" name="deadline"></div>
          <div class="full"><button class="btn">Create goal</button></div>
        </form>
      </article>
    </div>
  </section>

  <div class="split section">
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">Money in & out</div><h3>Transactions</h3></div></div>
      <form data-form="tx" class="form-grid">
        <div class="full"><div class="seg">
          <label><input type="radio" name="type" value="expense" ${ui.txType === 'expense' ? 'checked' : ''} data-act="tx-type"><span>Expense</span></label>
          <label><input type="radio" name="type" value="income" ${ui.txType === 'income' ? 'checked' : ''} data-act="tx-type"><span>Income</span></label>
        </div></div>
        <div class="field"><label>Amount</label><input type="number" name="amount" min="0.01" step="0.01" required></div>
        <div class="field"><label>Category</label><select name="category">${cats.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Date</label><input type="date" name="date" value="${todayIso()}" required></div>
        <div class="field"><label>Note</label><input name="note" placeholder="Matcha latte"></div>
        <div class="full"><button class="btn">Add</button></div>
      </form>
      <div style="margin-top:20px">${recent.map(t => `<div class="tx"><div><b>${esc(t.note || t.category)}</b><small>${esc(t.category)} · ${shortDate(t.date)}</small></div>
        <span class="amount ${t.type === 'income' ? 'in' : 'out'}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span>
        <button class="x" data-act="del" data-col="transactions" data-id="${t.id}" aria-label="Delete">×</button></div>`).join('') || '<p class="small muted">No transactions yet.</p>'}</div>
    </article>
    <div class="stack">
      <article class="card">
        <div class="eyebrow">${MONTHS[now.getMonth()]}</div><h3 style="margin:6px 0 14px">Where it <em>went</em></h3>
        <div class="chart-box sm"><canvas id="spendChart"></canvas></div>
      </article>
      <article class="card">
        <div class="eyebrow">Last 6 months</div><h3 style="margin:6px 0 14px">In vs <em>out</em></h3>
        <div class="chart-box sm"><canvas id="flowChart"></canvas></div>
      </article>
      <article class="card">
        <div class="eyebrow">Monthly budget</div>
        <div class="field" style="margin-top:8px"><input type="number" min="0" step="1" data-bind="budget" value="${budget || ''}" placeholder="e.g. 300" aria-label="Monthly budget"></div>
        <p class="insight" style="margin-top:18px">${tip}</p>
      </article>
    </div>
  </div>`;
}
function drawFinance() {
  if (!chartSetup()) return;
  const now = new Date(), mk = iso(now).slice(0, 7), by = {};
  S.transactions.filter(t => t.type === 'expense' && t.date.startsWith(mk)).forEach(t => by[t.category] = (by[t.category] || 0) + +t.amount);
  const keys = Object.keys(by);
  if (keys.length) {
    charts.push(new Chart($('#spendChart'), {
      type: 'doughnut',
      data: { labels: keys, datasets: [{ data: keys.map(k => by[k]), backgroundColor: PALETTE, borderColor: '#FDF9F3', borderWidth: 3 }] },
      options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => ` ${c.label}: ${money(c.raw)}` } } } },
    }));
  } else $('#spendChart').parentElement.innerHTML = '<div class="chart-fallback">No spending logged this month.</div>';
  const months = [...Array(6)].map((_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const sum = (m, type) => S.transactions.filter(t => t.type === type && t.date.startsWith(iso(m).slice(0, 7))).reduce((a, t) => a + +t.amount, 0);
  charts.push(new Chart($('#flowChart'), {
    type: 'bar',
    data: { labels: months.map(m => MONTHS[m.getMonth()].slice(0, 3)), datasets: [
      { label: 'Income', data: months.map(m => sum(m, 'income')), backgroundColor: '#DCC8AC', borderRadius: 6, maxBarThickness: 22 },
      { label: 'Spent', data: months.map(m => sum(m, 'expense')), backgroundColor: '#5E1B2D', borderRadius: 6, maxBarThickness: 22 },
    ] },
    options: { maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#EEE3D3' } } }, plugins: { legend: { position: 'bottom' } } },
  }));
}

/* ================= Page: Journal ================= */
const moodOf = k => MOODS.find(m => m.k === k);
function renderJournal() {
  const ds = ui.journalDate, d = fromIso(ds), isToday = ds === todayIso();
  const j = S.journal[ds] || {};
  const prompt = JOURNAL_PROMPTS[hash(ds) % JOURNAL_PROMPTS.length];
  const now = new Date(), last30 = [...Array(30)].map((_, i) => iso(addDays(now, -i)));
  const logged = last30.filter(k => S.journal[k] && S.journal[k].mood);
  const avg = logged.length ? logged.reduce((a, k) => a + moodOf(S.journal[k].mood).s, 0) / logged.length : 0;
  let streak = 0; for (let i = (S.journal[iso(now)] ? 0 : 1); S.journal[iso(addDays(now, -i))]; i++) streak++;
  const emoCount = {};
  last30.forEach(k => ((S.journal[k] || {}).emotions || []).forEach(e => emoCount[e] = (emoCount[e] || 0) + 1));
  const topEmo = Object.entries(emoCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recent = Object.keys(S.journal).filter(k => S.journal[k].text || S.journal[k].mood).sort().reverse().slice(0, 6);
  const avgLabel = !avg ? '—' : avg >= 4.5 ? 'Radiant' : avg >= 3.5 ? 'Bright' : avg >= 2.5 ? 'Steady' : avg >= 1.5 ? 'Tender' : 'Heavy';

  return `${pageHead('No. 08', 'Journal', 'Dear <em>diary</em>', 'A soft place to land. Write about your day, name what you feel, and watch your patterns gently appear.')}
  <div class="split">
    <article class="card journal-page">
      <div class="task-day" style="margin-bottom:22px">
        <button class="icon-btn" data-act="journal-day" data-n="-1" aria-label="Previous day">←</button>
        <div class="date">${isToday ? 'Today' : DAYS[d.getDay()]}, <em>${shortDate(ds)}</em></div>
        ${ds < todayIso() ? '<button class="icon-btn" data-act="journal-day" data-n="1" aria-label="Next day">→</button><button class="btn-text" data-act="journal-today">Back to today</button>' : ''}
      </div>

      <div class="eyebrow">How are you feeling?</div>
      <div class="moods">${MOODS.map(m => `<button class="mood ${j.mood === m.k ? 'on' : ''}" data-act="mood" data-k="${m.k}"><span>${m.e}</span>${m.l}</button>`).join('')}</div>

      <div class="eyebrow" style="margin-top:26px">Emotions you’re holding</div>
      <div class="chips" style="margin-top:10px">${EMOTIONS.map(e => `<button class="chip ${(j.emotions || []).includes(e) ? 'active' : ''}" data-act="emotion" data-e="${e}">${e}</button>`).join('')}</div>

      <div class="eyebrow" style="margin-top:28px">Today’s prompt</div>
      <p class="prompt">${prompt}</p>
      <textarea class="journal-text" data-bind="journal" data-f="text" placeholder="Dear diary, today…">${esc(j.text || '')}</textarea>

      <div class="eyebrow" style="margin-top:26px">Three things I’m grateful for</div>
      ${[0, 1, 2].map(i => `<input class="lined" data-bind="journal" data-f="g${i}" value="${esc(j['g' + i] || '')}" placeholder="${i + 1}." aria-label="Gratitude ${i + 1}">`).join('')}

      <div class="eyebrow" style="margin-top:26px">Let it out</div>
      <p class="small muted" style="margin:4px 0 8px">Anything heavy, messy or unsaid. Write it here and leave it here.</p>
      <textarea class="journal-text release" data-bind="journal" data-f="release" placeholder="I feel…">${esc(j.release || '')}</textarea>
      <p class="small muted" style="margin-top:12px">✦ Saves automatically when you click away.</p>
    </article>

    <aside class="stack">
      <div class="tiles">
        <div class="tile dark"><div class="eyebrow">Mood · 30 days</div><div class="num">${avgLabel}</div><p>${logged.length ? `average ${avg.toFixed(1)} / 5` : 'pick a mood to begin'}</p></div>
        <div class="tile"><div class="eyebrow">Writing streak</div><div class="num">${streak}<small> d</small></div><p>${logged.length} moods logged</p></div>
      </div>
      <article class="card">
        <div class="eyebrow">Last 30 days</div><h3 style="margin:6px 0 14px">Mood <em>tides</em></h3>
        <div class="chart-box sm"><canvas id="moodChart"></canvas></div>
      </article>
      <article class="card">
        <div class="eyebrow">Most felt this month</div>
        ${topEmo.length ? `<ul class="mini-list" style="margin-top:8px">${topEmo.map(([e, n]) => `<li><span>${e}</span><span class="meta">${plural(n, 'day')}</span></li>`).join('')}</ul>` : '<p class="small muted" style="margin-top:8px">Tag your emotions and they’ll gather here.</p>'}
      </article>
      <article class="card">
        <div class="eyebrow">Past entries</div>
        <ul class="mini-list" style="margin-top:8px">${recent.map(k => { const e = S.journal[k], m = moodOf(e.mood); return `<li><button class="entry-link" data-act="journal-open" data-d="${k}"><b>${m ? m.e : '✎'} ${shortDate(k)}</b><span>${esc((e.text || '').slice(0, 70)) || '<i>mood only</i>'}${(e.text || '').length > 70 ? '…' : ''}</span></button></li>`; }).join('') || '<li class="muted small">Your entries will appear here.</li>'}</ul>
      </article>
    </aside>
  </div>`;
}
function drawJournal() {
  if (!chartSetup()) return;
  const now = new Date(), days = [...Array(30)].map((_, i) => addDays(now, i - 29));
  const vals = days.map(d => { const j = S.journal[iso(d)]; return j && j.mood ? moodOf(j.mood).s : null; });
  if (!vals.some(v => v)) { $('#moodChart').parentElement.innerHTML = '<div class="chart-fallback">Log your mood for a few days to see your tides.</div>'; return; }
  const faces = { 1: '🥀', 2: '😴', 3: '🙂', 4: '😊', 5: '✨' };
  charts.push(new Chart($('#moodChart'), {
    type: 'line',
    data: { labels: days.map(d => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`), datasets: [{
      label: 'Mood', data: vals, spanGaps: true, borderColor: '#5E1B2D', backgroundColor: 'rgba(226,180,177,.35)', fill: true,
      cubicInterpolationMode: 'monotone', pointBackgroundColor: '#C98A8C', pointRadius: 4 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${faces[c.raw]} ${c.raw}/5` } } },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } }, y: { min: 0.5, max: 5.5, grid: { color: '#EEE3D3' }, ticks: { stepSize: 1, callback: v => faces[v] || '' } } } },
  }));
}

/* ================= Page: Fitness ================= */
const fitWorkout = ds => WORKOUT_PLAN[(fromIso(ds).getDay() + ((S.fitDay[ds] || {}).shift || 0)) % 7];
const WATER_GOAL = 8;
function renderFitness() {
  const now = new Date(), ds = iso(now), fd = S.fitDay[ds] || {}, w = fitWorkout(ds), ticks = fd.ticks || [], h = S.health[ds] || {};
  const last7 = [...Array(7)].map((_, i) => iso(addDays(now, -i)));
  const wk = S.workouts.filter(x => last7.includes(x.date));
  const sleeps = last7.map(k => +(S.health[k] || {}).sleep).filter(Boolean);
  const avgSleep = sleeps.length ? (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) : '—';
  const doneToday = S.workouts.some(x => x.date === ds && x.planned);
  const ws = weekStart(now);
  const recent = [...S.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const pick = (list, salt) => hash(ds + salt) % list.length;
  const snackPick = pick(FIT_SNACKS, 's'), drinkPick = pick(FIT_DRINKS, 'd');

  return `${pageHead('No. 09', 'Fitness', 'Strong, soft, <em>glowing</em>', 'A new workout suggestion every day, plus your water, sleep and steps, and healthy snacks and drinks to fuel it all.')}
  <div class="tiles">
    <div class="tile dark"><div class="eyebrow">Workouts · 7 days</div><div class="num">${wk.length}</div><p>${wk.reduce((a, x) => a + +x.minutes, 0)} active minutes</p></div>
    <div class="tile"><div class="eyebrow">Water today</div><div class="num">${h.water || 0}<small>/${WATER_GOAL}</small></div><p>glasses</p></div>
    <div class="tile"><div class="eyebrow">Avg sleep</div><div class="num">${avgSleep}<small> h</small></div><p>last 7 nights</p></div>
    <div class="tile"><div class="eyebrow">Steps today</div><div class="num">${h.steps ? (+h.steps).toLocaleString() : '—'}</div><p>goal 8,000</p></div>
  </div>

  <div class="split section">
    <article class="card workout">
      <div class="card-head">
        <div><div class="eyebrow">Today’s workout · ${DAYS[now.getDay()]}</div><h3>${esc(w.type.replace(/ day$/, ''))} <em>day</em></h3><p class="muted serif" style="font-size:19px;font-style:italic">${esc(w.name)}</p></div>
        <button class="icon-btn" data-act="workout-swap" aria-label="Suggest a different workout" title="Swap workout">↻</button>
      </div>
      <div class="plan-chips"><span class="tag"><b>${w.minutes}</b> min</span><span class="tag">${esc(w.intensity)}</span><span class="tag">${esc(w.equipment)}</span></div>
      <p class="small"><span class="eyebrow">Warm-up</span><br>${esc(w.warmup)}</p>
      <ul class="task-list" style="margin:14px 0">${w.exercises.map(([n, r], i) => `<li class="task ${ticks.includes(i) ? 'done' : ''}">
        <button class="check ${ticks.includes(i) ? 'on' : ''}" data-act="ex-tick" data-i="${i}" aria-label="Tick ${esc(n)}"></button>
        <div class="txt"><span>${esc(n)}</span></div><span class="meta small muted">${esc(r)}</span></li>`).join('')}</ul>
      <p class="small"><span class="eyebrow">Cool-down</span><br>${esc(w.cooldown)}</p>
      <div style="margin-top:22px">${doneToday ? '<span class="tag" style="background:var(--burgundy);color:var(--cream)">✓ Completed today, well done</span>' : `<button class="btn" data-act="workout-done">Complete workout</button>`}</div>
    </article>

    <aside class="stack">
      <article class="card">
        <div class="eyebrow">Health tracker · today</div>
        <h3 style="margin:6px 0 14px">Body <em>check-in</em></h3>
        <div class="eyebrow" style="font-size:10px">Water</div>
        <div class="water">${[...Array(WATER_GOAL)].map((_, i) => `<button class="glass ${i < (h.water || 0) ? 'on' : ''}" data-act="water" data-n="${i + 1}" aria-label="${i + 1} glasses"></button>`).join('')}</div>
        <div class="form-grid" style="margin-top:18px">
          <div class="field"><label>Steps</label><input type="number" min="0" step="100" data-bind="health" data-f="steps" value="${esc(h.steps || '')}" placeholder="8000"></div>
          <div class="field"><label>Sleep (hours)</label><input type="number" min="0" max="16" step="0.5" data-bind="health" data-f="sleep" value="${esc(h.sleep || '')}" placeholder="8"></div>
          <div class="field"><label>Energy (1–5)</label><input type="number" min="1" max="5" data-bind="health" data-f="energy" value="${esc(h.energy || '')}" placeholder="4"></div>
          <div class="field"><label>Weight (optional)</label><input type="number" min="0" step="0.1" data-bind="health" data-f="weight" value="${esc(h.weight || '')}"></div>
        </div>
      </article>
      <article class="card">
        <div class="eyebrow">Your week of movement</div>
        <ul class="mini-list" style="margin-top:8px">${[...Array(7)].map((_, i) => { const d = addDays(ws, i), k = iso(d), wo = fitWorkout(k), did = S.workouts.some(x => x.date === k);
          return `<li class="${did ? 'done' : ''}"><i class="check sm ${did ? 'on' : ''}"></i><span>${DAYS[d.getDay()].slice(0, 3)} · ${esc(wo.type)}</span><span class="meta">${wo.minutes} min</span></li>`; }).join('')}</ul>
      </article>
    </aside>
  </div>

  <div class="split section">
    <article class="card">
      <div class="eyebrow">Last 14 days</div><h3 style="margin:6px 0 14px">Movement & <em>rest</em></h3>
      <div class="chart-box"><canvas id="fitChart"></canvas></div>
    </article>
    <article class="card">
      <div class="eyebrow">Did something else?</div><h3 style="margin:6px 0 14px">Log a <em>workout</em></h3>
      <form data-form="workout" class="form-grid">
        <div class="field full"><label>Activity</label><input name="type" required placeholder="Netball practice" list="wtypes"></div>
        <datalist id="wtypes">${WORKOUT_PLAN.map(x => `<option value="${esc(x.type)}">`).join('')}<option value="Walk"><option value="Swimming"><option value="Gym session"></datalist>
        <div class="field"><label>Minutes</label><input type="number" name="minutes" min="5" max="300" step="5" value="30" required></div>
        <div class="field"><label>Date</label><input type="date" name="date" value="${ds}" max="${ds}" required></div>
        <div class="full"><button class="btn">Log</button></div>
      </form>
      <ul class="mini-list" style="margin-top:16px">${recent.map(x => `<li><span>${esc(x.type)}</span><span class="meta">${x.minutes} min · ${shortDate(x.date)}</span><button class="x" data-act="del" data-col="workouts" data-id="${x.id}" aria-label="Delete">×</button></li>`).join('') || '<li class="muted small">No workouts logged yet.</li>'}</ul>
    </article>
  </div>

  <section class="section">
    <div class="section-title"><div><div class="eyebrow">Fuel</div><h2>Healthy <em>snacks</em></h2></div></div>
    <div class="recipe-grid">${FIT_SNACKS.map((m, i) => recipeCard(m, 'snack', i, i === snackPick)).join('')}</div>
  </section>
  <section class="section">
    <div class="section-title"><div><div class="eyebrow">Sip</div><h2>Drinks & <em>smoothies</em></h2></div></div>
    <div class="recipe-grid">${FIT_DRINKS.map((m, i) => recipeCard(m, 'drink', i, i === drinkPick)).join('')}</div>
  </section>`;
}
const recipeCard = (m, kind, i, featured) => `<article class="card meal ${featured ? 'featured' : ''}">
  ${featured ? '<span class="tag pick">Today’s pick</span>' : ''}
  <h4>${esc(m.name)}</h4><p class="note">${m.time} · ${m.note}</p>
  <div class="actions"><button class="btn-text" data-act="fit-recipe" data-kind="${kind}" data-i="${i}">Recipe →</button></div>
</article>`;
function drawFitness() {
  if (!chartSetup()) return;
  const now = new Date(), days = [...Array(14)].map((_, i) => addDays(now, i - 13));
  charts.push(new Chart($('#fitChart'), {
    data: { labels: days.map(d => `${DAYS[d.getDay()].slice(0, 2)} ${d.getDate()}`), datasets: [
      { type: 'bar', label: 'Workout minutes', data: days.map(d => S.workouts.filter(x => x.date === iso(d)).reduce((a, x) => a + +x.minutes, 0)), backgroundColor: '#5E1B2D', borderRadius: 8, maxBarThickness: 24, yAxisID: 'y' },
      { type: 'line', label: 'Sleep (h)', data: days.map(d => +(S.health[iso(d)] || {}).sleep || null), borderColor: '#C98A8C', backgroundColor: '#C98A8C', cubicInterpolationMode: 'monotone', spanGaps: true, pointRadius: 3, yAxisID: 'y1' },
      { type: 'line', label: 'Water (glasses)', data: days.map(d => (S.health[iso(d)] || {}).water || 0), borderColor: '#B9A285', backgroundColor: '#B9A285', borderDash: [4, 4], cubicInterpolationMode: 'monotone', pointRadius: 0, yAxisID: 'y1' },
    ] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, title: { display: true, text: 'minutes' }, grid: { color: '#EEE3D3' } }, y1: { beginAtZero: true, suggestedMax: 10, position: 'right', grid: { display: false } } } },
  }));
}

/* ================= Modals ================= */
function openModal(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><button class="icon-btn" data-act="modal-close" aria-label="Close">×</button>${html}</div>`;
  m.hidden = false;
}
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
function openRecipe(type, m = mealFor(todayIso(), type)) {
  openModal(`<div class="eyebrow">${type} · ${m.time}</div><h2>${esc(m.name)}</h2><p class="muted">${m.note}</p>
    <h4>Ingredients</h4><ul>${m.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    <h4>Method</h4><ol>${m.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`);
}
function openSettings() {
  const st = S.settings;
  openModal(`<div class="eyebrow">Settings</div><h2>Make it <em>yours</em></h2>
    <form data-form="settings" class="form-grid" style="margin-top:18px">
      <div class="field"><label>Your name</label><input name="name" value="${esc(st.name)}" required></div>
      <div class="field"><label>Wake-up time</label><input type="time" name="wake" value="${esc(st.wake)}"></div>
      <div class="field"><label>City (for weather)</label><input name="city" value="${esc(st.city)}" placeholder="Amman"></div>
      <div class="field"><label>Currency symbol</label><input name="currency" value="${esc(st.currency)}" maxlength="4"></div>
      <div class="full"><button class="btn">Save settings</button></div>
    </form>
    <h4>Your data</h4>
    <p class="small muted" style="margin:6px 0 12px">Everything is saved privately in this browser. Download a backup now and then, especially before clearing your browser data.</p>
    <div class="chips"><button class="btn ghost sm" data-act="export">Download backup</button><button class="btn ghost sm" data-act="import">Restore backup</button><button class="btn ghost sm" data-act="sample">Load sample data</button><button class="btn ghost sm" data-act="reset">Erase everything</button></div>`);
}

/* ================= Sample data ================= */
function loadSample() {
  const t = new Date(), d = n => iso(addDays(t, n));
  const subj = { 1: ['English', 'Biology', 'Maths'], 2: ['Chemistry', 'History', 'Maths'], 3: ['Biology', 'Art', 'English'], 4: ['Maths', 'Chemistry', 'French'], 5: ['History', 'English', 'Biology'] };
  S.timetable = [];
  for (const [day, list] of Object.entries(subj)) list.forEach((s, i) => S.timetable.push({ id: uid(), day: +day, subject: s, start: ['08:00', '10:00', '12:30'][i], end: ['09:30', '11:30', '14:30'][i], room: '' }));
  S.exams = [
    { id: uid(), subject: 'Biology', date: d(5), time: '09:00', notes: 'Cells, genetics & ecology' },
    { id: uid(), subject: 'Maths', date: d(12), time: '10:00', notes: 'Paper 1 — calculator' },
    { id: uid(), subject: 'English', date: d(24), time: '09:00', notes: 'Literature' },
  ];
  S.assignments = [
    { id: uid(), title: 'Great Gatsby essay', subject: 'English', due: d(2), done: false },
    { id: uid(), title: 'Chemistry lab report', subject: 'Chemistry', due: d(6), done: false },
  ];
  S.events = [
    { id: uid(), title: 'Lina’s birthday dinner', date: d(3), time: '19:30', category: 'Birthday', priority: 'high' },
    { id: uid(), title: 'Pilates class', date: d(1), time: '17:00', category: 'Wellness', priority: 'medium' },
    { id: uid(), title: 'Brunch with the girls', date: d(4), time: '11:00', category: 'Social', priority: 'low' },
    { id: uid(), title: 'Dentist appointment', date: d(-4), time: '16:00', category: 'Personal', priority: 'medium' },
    { id: uid(), title: 'Parent–teacher evening', date: d(9), time: '18:00', category: 'School', priority: 'high' },
  ];
  const steps = arr => arr.map((text, i) => ({ id: uid(), text, done: i === 0 }));
  S.goals = [
    { id: uid(), title: 'Finish the term with straight A’s', category: 'Academic', why: 'Because I want options, and to feel proud of myself.', target: d(60), created: d(-14), steps: steps(GOAL_TEMPLATES.Academic) },
    { id: uid(), title: 'A calm, glowing skincare routine', category: 'Wellness', why: 'Taking care of myself is the foundation.', target: d(30), created: d(-7), steps: steps(GOAL_TEMPLATES.Wellness) },
    { id: uid(), title: 'Save for a summer trip', category: 'Finance', why: 'Memories over things.', target: d(120), created: d(-20), steps: steps(GOAL_TEMPLATES.Finance) },
  ];
  S.vision = { statement: 'This year I am calm, focused and soft with myself. I study with intention, I care for my body like it is precious, and I keep a room that feels like a deep breath.', words: ['Grace', 'Discipline', 'Glow', 'Abundance'] };
  S.savings = [
    { id: uid(), name: 'Summer trip', target: 800, saved: 240, deadline: d(120), deposits: [{ date: d(-3), amount: 40 }] },
    { id: uid(), name: 'Skincare fridge', target: 120, saved: 85, deadline: d(30), deposits: [] },
  ];
  S.transactions = [];
  for (let m = 0; m < 4; m++) {
    const base = addDays(t, -30 * m);
    S.transactions.push({ id: uid(), type: 'income', amount: 200, category: 'Allowance', note: 'Monthly allowance', date: iso(new Date(base.getFullYear(), base.getMonth(), 1)) });
    [['Food & coffee', 34, 'Cafés'], ['Beauty & skincare', 28, 'Serum'], ['Transport', 15, 'Bus card'], ['Going out', 22, 'Cinema']].forEach(([c, a, n]) =>
      S.transactions.push({ id: uid(), type: 'expense', amount: Math.round(a * (0.7 + Math.random() * .6)), category: c, note: n, date: iso(new Date(base.getFullYear(), base.getMonth(), Math.min(base.getDate(), 2 + Math.floor(Math.random() * 20)))) }));
  }
  S.focusLog = [];
  S.tasks = {}; S.habitLog = {}; S.planDone = {}; S.journal = {}; S.health = {}; S.workouts = []; S.fitDay = {};
  const subjects = ['Biology', 'Maths', 'English', 'Chemistry'];
  for (let i = 1; i <= 13; i++) {
    const ds = d(-i);
    if (Math.random() < .85) S.focusLog.push({ id: uid(), date: ds, minutes: [50, 60, 90, 120][Math.floor(Math.random() * 4)], subject: subjects[i % 4] });
    if (Math.random() < .5) S.focusLog.push({ id: uid(), date: ds, minutes: 25, subject: subjects[(i + 1) % 4] });
    const n = 5 + Math.floor(Math.random() * 3);
    S.tasks[ds] = [...Array(n)].map((_, k) => ({ id: uid(), text: `Task ${k + 1}`, source: 'manual', done: Math.random() < .7 }));
    S.habitLog[ds] = S.habits.filter(() => Math.random() < .7).map(h => h.id);
    const mood = MOODS[Math.floor(Math.random() * 5)];
    S.journal[ds] = { mood: mood.k, emotions: EMOTIONS.filter(() => Math.random() < .15), text: i % 3 ? '' : 'A full day of classes, but the walk home in the sun made everything feel lighter.' };
    S.health[ds] = { water: 4 + Math.floor(Math.random() * 5), sleep: 6 + Math.round(Math.random() * 6) / 2, steps: 4000 + Math.floor(Math.random() * 6000) };
    if (Math.random() < .65) S.workouts.push({ id: uid(), date: ds, type: fitWorkout(ds).type, minutes: fitWorkout(ds).minutes, planned: true });
  }
  save();
}

/* ================= Actions, forms & bindings ================= */
const actions = {
  'nav-toggle': () => document.body.classList.toggle('nav-open'),
  go: el => { location.hash = '#/' + el.dataset.to; },
  'plan-toggle': el => { const a = S.planDone[todayIso()] ||= []; const i = a.indexOf(el.dataset.id); i >= 0 ? a.splice(i, 1) : a.push(el.dataset.id); save(); rerender(); },
  habit: el => { const { h, d } = el.dataset; const a = S.habitLog[d] ||= []; const i = a.indexOf(h); i >= 0 ? a.splice(i, 1) : a.push(h); save(); rerender(); },
  'habit-del': el => { if (!confirm('Remove this habit?')) return; S.habits = S.habits.filter(h => h.id !== el.dataset.id); save(); rerender(); },
  selfcare: el => { const a = S.selfcare[todayIso()] ||= []; const i = a.indexOf(+el.dataset.i); i >= 0 ? a.splice(i, 1) : a.push(+el.dataset.i); save(); rerender(); },
  'meal-swap': el => { const m = S.mealShift[todayIso()] ||= {}; m[el.dataset.type] = (m[el.dataset.type] || 0) + 1; save(); rerender(); },
  recipe: el => openRecipe(el.dataset.type),
  'event-cat': el => { ui.eventCat = el.dataset.cat; rerender(); },
  'task-toggle': el => toggleTask(el.dataset.d, el.dataset.id),
  'task-del': el => { S.tasks[el.dataset.d] = (S.tasks[el.dataset.d] || []).filter(t => t.id !== el.dataset.id); save(); rerender(); },
  'task-day': el => { ui.taskDate = iso(addDays(fromIso(ui.taskDate), +el.dataset.n)); rerender(); },
  'task-today': () => { ui.taskDate = todayIso(); rerender(); },
  'task-refresh': () => refreshTasks(ui.taskDate),
  'sched-tab': el => { ui.schedTab = el.dataset.tab; rerender(); },
  'sched-goto': el => { ui.schedTab = el.dataset.tab; },
  del: el => { const col = el.dataset.col; S[col] = S[col].filter(x => x.id !== el.dataset.id); save(); rerender(); },
  'assign-toggle': el => { const a = S.assignments.find(x => x.id === el.dataset.id); if (a) a.done = !a.done; save(); rerender(); },
  'goal-del': el => { if (!confirm('Remove this goal and its steps?')) return; S.goals = S.goals.filter(g => g.id !== el.dataset.id); save(); rerender(); },
  'step-toggle': el => { const g = S.goals.find(x => x.id === el.dataset.g); const s = g && g.steps.find(x => x.id === el.dataset.s); if (s) setStepDone(g.id, s.id, !s.done); save(); rerender(); },
  'step-del': el => { const g = S.goals.find(x => x.id === el.dataset.g); if (g) g.steps = g.steps.filter(s => s.id !== el.dataset.s); save(); rerender(); },
  'goal-suggest': el => {
    const g = S.goals.find(x => x.id === el.dataset.id); if (!g) return;
    const fresh = (GOAL_TEMPLATES[g.category] || GOAL_TEMPLATES['Personal growth']).filter(t => !g.steps.some(s => s.text === t));
    if (!fresh.length) return toast('You already have every suggested step ✦');
    fresh.slice(0, 3).forEach(text => g.steps.push({ id: uid(), text, done: false }));
    save(); rerender(); toast('Added gentle next steps ✦');
  },
  'word-del': el => { S.vision.words = S.vision.words.filter(w => w !== el.dataset.w); save(); rerender(); },
  'week-nav': el => { ui.weekOffset += +el.dataset.n; rerender(); },
  'week-now': () => { ui.weekOffset = 0; rerender(); },
  'timer-len': el => { if (timer.running) return toast('Pause the timer first'); timer.len = +el.dataset.len; timer.remaining = timer.len * 60; rerender(); },
  'timer-toggle': () => timer.running ? pauseTimer() : startTimer(),
  'timer-reset': () => { pauseTimer(); timer.remaining = timer.len * 60; paintTimer(); },
  'timer-log': () => { const m = Math.round((timer.len * 60 - timer.remaining) / 60); if (m < 1) return toast('Focus for at least a minute first'); finishTimer(m); },
  'tx-type': el => { ui.txType = el.value; rerender(); },
  'journal-day': el => { const n = iso(addDays(fromIso(ui.journalDate), +el.dataset.n)); if (n <= todayIso()) { ui.journalDate = n; rerender(); } },
  'journal-today': () => { ui.journalDate = todayIso(); rerender(); },
  'journal-open': el => { ui.journalDate = el.dataset.d; rerender(); window.scrollTo(0, 0); },
  mood: el => { const j = S.journal[ui.journalDate] ||= {}; j.mood = j.mood === el.dataset.k ? '' : el.dataset.k; save(); rerender(); },
  emotion: el => { const j = S.journal[ui.journalDate] ||= {}; const a = j.emotions ||= []; const i = a.indexOf(el.dataset.e); i >= 0 ? a.splice(i, 1) : a.push(el.dataset.e); save(); rerender(); },
  'workout-swap': () => { const f = S.fitDay[todayIso()] ||= {}; f.shift = ((f.shift || 0) + 1) % 7; f.ticks = []; save(); rerender(); toast(`Swapped to ${fitWorkout(todayIso()).type} ✦`); },
  'ex-tick': el => { const f = S.fitDay[todayIso()] ||= {}; const a = f.ticks ||= []; const i = a.indexOf(+el.dataset.i); i >= 0 ? a.splice(i, 1) : a.push(+el.dataset.i); save(); rerender(); },
  'workout-done': () => {
    const ds = todayIso(), w = fitWorkout(ds);
    S.workouts.push({ id: uid(), date: ds, type: w.type, minutes: w.minutes, planned: true });
    (S.fitDay[ds] ||= {}).ticks = w.exercises.map((_, i) => i);
    const t = (S.tasks[ds] || []).find(x => x.text.startsWith('Workout:')); if (t) t.done = true;
    save(); rerender(); chime(); toast('Workout complete. Strong and glowing ♡');
  },
  water: el => { const h = S.health[todayIso()] ||= {}; const n = +el.dataset.n; h.water = h.water === n ? n - 1 : n; save(); rerender(); },
  'fit-recipe': el => { const m = (el.dataset.kind === 'snack' ? FIT_SNACKS : FIT_DRINKS)[+el.dataset.i]; openRecipe(el.dataset.kind === 'snack' ? 'Healthy snack' : 'Drink', m); },
  settings: (el, e) => { e.preventDefault(); document.body.classList.remove('nav-open'); openSettings(); },
  'modal-close': closeModal,
  export: () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fofo-backup-${todayIso()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  import: () => $('#importFile').click(),
  sample: () => { if (!confirm('Load sample data? This replaces your current schedule, goals, finance and history.')) return; loadSample(); closeModal(); rerender(); toast('Sample week loaded ✦'); },
  reset: () => { if (!confirm('Erase everything? This cannot be undone.')) return; S = defaults(); save(); closeModal(); rerender(); toast('A fresh start'); },
};

const forms = {
  habit: f => { S.habits.push({ id: uid(), name: f.name.trim() }); },
  timetable: f => {
    if (toMin(f.end) <= toMin(f.start)) { toast('End time must be after the start'); return false; }
    S.timetable.push({ id: uid(), day: +f.day, subject: f.subject.trim(), start: f.start, end: f.end, room: f.room.trim() }); toast('Class added');
  },
  exam: f => { S.exams.push({ id: uid(), subject: f.subject.trim(), date: f.date, time: f.time, notes: f.notes.trim() }); toast('Exam added — your study plan has adjusted'); },
  assignment: f => { S.assignments.push({ id: uid(), title: f.title.trim(), subject: f.subject.trim(), due: f.due, done: false }); toast('Assignment added'); },
  event: f => { S.events.push({ id: uid(), title: f.title.trim(), date: f.date, time: f.time, category: f.category, priority: f.priority }); toast('Event added'); },
  goal: f => {
    const g = { id: uid(), title: f.title.trim(), category: f.category, why: f.why.trim(), target: f.target, created: todayIso(), steps: [] };
    if (f.suggest) g.steps = (GOAL_TEMPLATES[g.category] || []).slice(0, 4).map(text => ({ id: uid(), text, done: false }));
    S.goals.push(g);
    refreshTodayQuietly(); toast('Goal planted ✦ — its first step is on today’s list');
  },
  step: (f, form) => { const g = S.goals.find(x => x.id === form.dataset.g); if (g) g.steps.push({ id: uid(), text: f.text.trim(), done: false }); },
  word: f => { const w = (f.w || '').trim(); if (!w) return false; if (!S.vision.words.includes(w)) S.vision.words.push(w); },
  task: f => { (S.tasks[ui.taskDate] ||= []).push({ id: uid(), text: f.text.trim(), source: 'manual', done: false }); },
  focuslog: f => { S.focusLog.push({ id: uid(), date: f.date, minutes: +f.minutes, subject: f.subject.trim() }); toast('Session logged'); },
  saving: f => { S.savings.push({ id: uid(), name: f.name.trim(), target: +f.target, saved: +f.saved || 0, deadline: f.deadline, deposits: [] }); },
  deposit: (f, form) => {
    const s = S.savings.find(x => x.id === form.dataset.id); if (!s) return false;
    const amt = +f.amount; s.saved = Math.max(0, +(s.saved + amt).toFixed(2));
    (s.deposits ||= []).push({ date: todayIso(), amount: amt });
    toast(s.saved >= s.target ? `“${s.name}” is fully funded ♡` : `${money(amt)} saved — lovely`);
  },
  workout: f => { S.workouts.push({ id: uid(), date: f.date, type: f.type.trim(), minutes: +f.minutes }); toast('Workout logged ✦'); },
  tx: f => { S.transactions.push({ id: uid(), type: f.type, amount: +f.amount, category: f.category, note: f.note.trim(), date: f.date }); },
  settings: f => { Object.assign(S.settings, { name: f.name.trim() || 'Fofo', wake: f.wake || '07:00', city: f.city.trim(), currency: f.currency || '$' }); weatherCache = null; closeModal(); toast('Settings saved'); },
};
// When a goal is added, slot its first step into today's list without replacing anything
function refreshTodayQuietly() {
  const ds = todayIso(); if (!S.tasks[ds]) return;
  const fresh = suggestedTasks(new Date()).filter(n => n.source === 'goal' && !S.tasks[ds].some(k => k.text === n.text || (n.stepId && k.stepId === n.stepId)));
  S.tasks[ds].push(...fresh);
}

const binds = {
  vision: el => { S.vision.statement = el.value; save(); toast('Vision saved ♡'); },
  focus: el => { S.focus[todayIso()] = el.value.trim(); save(); },
  budget: el => { S.settings.budget = +el.value || 0; save(); rerender(); },
  reflection: el => { S.reflections[el.dataset.k] = el.value; save(); toast('Reflection saved'); },
  weeknote: el => { S.weekNotes[el.dataset.k] = el.value; save(); toast('Intention saved'); },
  'timer-subject': el => { timer.subject = el.value; },
  journal: el => { (S.journal[ui.journalDate] ||= {})[el.dataset.f] = el.value; save(); if (el.tagName === 'TEXTAREA') toast('Saved to your journal ♡'); },
  health: el => { (S.health[todayIso()] ||= {})[el.dataset.f] = el.value; save(); rerender(); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) {
    if (e.target.id === 'modal') closeModal();
    return;
  }
  const fn = actions[el.dataset.act];
  if (fn) fn(el, e);
});
document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (forms[form.dataset.form](data, form) !== false) { save(); rerender(); }
});
document.addEventListener('change', e => { const b = e.target.closest('[data-bind]'); if (b && binds[b.dataset.bind]) binds[b.dataset.bind](b); });
document.addEventListener('input', e => { if (e.target.dataset.bind === 'timer-subject') timer.subject = e.target.value; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); document.body.classList.remove('nav-open'); } });
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.settings || !data.goals) throw new Error('bad');
    localStorage.setItem(KEY, JSON.stringify(data)); S = load(); closeModal(); rerender(); toast('Backup restored ♡');
  } catch (err) { toast('That file doesn’t look like a Fofo backup'); }
  e.target.value = '';
});

/* ================= Router ================= */
const routes = { today: renderToday, week: renderWeek, schedule: renderSchedule, goals: renderGoals, tasks: renderTasks, productivity: renderProductivity, finance: renderFinance, journal: renderJournal, fitness: renderFitness };
const after = { today: loadWeather, productivity: () => { drawProductivity(); paintTimer(); }, finance: drawFinance, journal: drawJournal, fitness: drawFitness };
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function rerender() {
  destroyCharts();
  $('#view').innerHTML = routes[ui.route]();
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === ui.route));
  after[ui.route] && after[ui.route]();
}
function route() {
  const r = location.hash.replace('#/', '').split('?')[0];
  ui.route = routes[r] ? r : 'today';
  if (ui.route === 'tasks') ui.taskDate = todayIso();
  if (ui.route === 'journal') ui.journalDate = todayIso();
  document.body.classList.remove('nav-open');
  rerender();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
