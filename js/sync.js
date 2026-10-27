/* Fofo — optional Supabase cloud sync.
   The whole planner is stored as one JSON row per signed-in user (see supabase.sql).
   localStorage stays the working copy, so the site still works offline or without Supabase. */
'use strict';

const SYNC_SEEN = 'fofo-synced-user'; // which account this browser has already synced with
const sb = (typeof supabase !== 'undefined' && typeof SUPABASE_URL === 'string' && !SUPABASE_URL.includes('YOUR-PROJECT'))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const sync = { user: null, status: sb ? 'signed-out' : 'off', timer: null, busy: false };

function setSyncStatus(status) {
  sync.status = status;
  const el = $('#syncStatus');
  if (!el) return;
  const label = { off: '', 'signed-out': 'Sign in to sync ☁', saving: 'Saving…', synced: 'Synced ☁', error: 'Sync error. Tap to retry', offline: 'Offline. Will sync later' }[status];
  el.hidden = !label;
  el.textContent = label || '';
  el.className = `sync-status ${status}`;
}

// Every local save also schedules an upload (debounced so typing doesn't spam the network)
const saveLocal = save;
save = function () {
  S._updated = Date.now();
  saveLocal();
  if (!sb || !sync.user) return;
  setSyncStatus('saving');
  clearTimeout(sync.timer);
  sync.timer = setTimeout(pushState, 1200);
};

async function pushState() {
  if (!sb || !sync.user) return;
  if (!navigator.onLine) return setSyncStatus('offline');
  const { error } = await sb.from('planner_state').upsert({ user_id: sync.user.id, data: S, updated_at: new Date().toISOString() });
  if (error) { console.error('Sync upload failed', error); return setSyncStatus('error'); }
  setSyncStatus('synced');
}

async function pullState() {
  if (!sb || !sync.user || sync.busy) return;
  sync.busy = true;
  try {
    const { data, error } = await sb.from('planner_state').select('data').eq('user_id', sync.user.id).maybeSingle();
    if (error) { console.error('Sync download failed', error); return setSyncStatus('error'); }
    const remote = data && data.data;
    let firstTime = true;
    try { firstTime = localStorage.getItem(SYNC_SEEN) !== sync.user.id; } catch (e) { /* storage blocked */ }
    // A browser syncing with this account for the first time always takes the cloud copy;
    // after that, whichever copy was edited most recently wins.
    if (remote && remote.settings && (firstTime || (remote._updated || 0) > (S._updated || 0))) {
      localStorage.setItem(KEY, JSON.stringify(remote));
      S = load();
      rerender();
      if (firstTime) toast('Your planner was loaded from the cloud ☁');
      setSyncStatus('synced');
    } else {
      await pushState();
    }
    try { localStorage.setItem(SYNC_SEEN, sync.user.id); } catch (e) { /* storage blocked */ }
  } finally { sync.busy = false; }
}

/* ---------- Account section in Settings ---------- */
const openSettingsBase = openSettings;
openSettings = function () {
  openSettingsBase();
  const card = $('.modal-card');
  if (!card) return;
  let html;
  if (!sb) {
    html = `<p class="small muted" style="margin:6px 0">Not set up yet. Add your Supabase project URL and anon key to <b>js/config.js</b>, run <b>supabase.sql</b> in your project, then reload.</p>`;
  } else if (sync.user) {
    html = `<p class="small" style="margin:6px 0 12px">Signed in as <b>${esc(sync.user.email)}</b>. Your planner syncs automatically across every device you sign in on.</p>
      <div class="chips"><button class="btn ghost sm" data-act="sync-now">Sync now</button><button class="btn ghost sm" data-act="auth-out">Sign out</button></div>`;
  } else {
    html = `<p class="small muted" style="margin:6px 0 12px">Sign in to back up your planner and use it on your phone and laptop.</p>
      <div class="form-grid">
        <div class="field"><label>Email</label><input id="authEmail" type="email" autocomplete="email" required></div>
        <div class="field"><label>Password</label><input id="authPass" type="password" autocomplete="current-password" minlength="6" required></div>
        <div class="full chips"><button class="btn sm" data-act="auth-in">Sign in</button><button class="btn ghost sm" data-act="auth-up">Create account</button></div>
      </div>`;
  }
  card.insertAdjacentHTML('beforeend', `<h4>Cloud sync</h4>${html}`);
};

const authFields = () => ({ email: ($('#authEmail') || {}).value?.trim(), password: ($('#authPass') || {}).value });
Object.assign(actions, {
  'auth-in': async () => {
    const { email, password } = authFields();
    if (!email || !password) return toast('Enter your email and password');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return toast(error.message);
    closeModal(); toast('Signed in ♡ syncing your planner');
  },
  'auth-up': async () => {
    const { email, password } = authFields();
    if (!email || !password || password.length < 6) return toast('Use an email and a password of 6+ characters');
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return toast(error.message);
    closeModal();
    toast(data.session ? 'Account created ♡ syncing now' : 'Check your email to confirm your account, then sign in');
  },
  'auth-out': async () => {
    await sb.auth.signOut();
    closeModal(); toast('Signed out. Your planner stays on this device');
  },
  'sync-now': () => { closeModal(); pullState(); },
  'sync-retry': () => pullState(),
});

/* ---------- Start up ---------- */
if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    const user = session ? session.user : null;
    const changed = (user && user.id) !== (sync.user && sync.user.id);
    sync.user = user;
    if (!user) return setSyncStatus('signed-out');
    if (changed) pullState();
  });
  // Pick up edits made on another device when you come back to this tab
  window.addEventListener('focus', () => { if (sync.user) pullState(); });
  window.addEventListener('online', () => { if (sync.user) pushState(); });
}
setSyncStatus(sync.status);
