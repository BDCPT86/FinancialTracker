// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = 'https://qpmiljxrmtobagpvenbi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWlsanhybXRvYmFncHZlbmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjA4OTIsImV4cCI6MjA5MTI5Njg5Mn0.A5DI8P7WcJevWblz6kdItb9ku7X6XX0HausNAP9RTic';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// CONSTANTS
// ============================================================
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#c8a96e','#4ecdc4','#7b6cf5','#e05c7a','#5cd98a','#f7b731','#fd9644','#45aaf2','#a55eea','#eb3b5a'];
const EMOJIS = ['🏠','🚗','🛒','🍽️','💊','🎭','✈️','📱','💡','📚','💪','👕','🎮','☕','🐾','🍺','💰','🏦','📈','🎁','🏫','💻','🔧','💅','🛡️'];

const defaultCategories = [
  {id:'c1',name:'Housing',icon:'🏠',color:'#c8a96e',budget:15000,type:'expense'},
  {id:'c2',name:'Groceries',icon:'🛒',color:'#4ecdc4',budget:4000,type:'expense'},
  {id:'c3',name:'Transport',icon:'🚗',color:'#7b6cf5',budget:3000,type:'expense'},
  {id:'c4',name:'Dining Out',icon:'🍽️',color:'#e05c7a',budget:2000,type:'expense'},
  {id:'c5',name:'Health',icon:'💊',color:'#5cd98a',budget:1500,type:'expense'},
  {id:'c6',name:'Entertainment',icon:'🎭',color:'#f7b731',budget:1500,type:'expense'},
];

function getDefaultData() {
  return {
    categories: defaultCategories,
    transactions: [],
    investments: [
      {id:'i1',name:'TFSA — Allan Gray',type:'Investment',value:85000,contributions:2000,growth:12.4,color:'#4ecdc4'},
      {id:'i2',name:'RA — Old Mutual',type:'Retirement',value:320000,contributions:3500,growth:10.2,color:'#7b6cf5'},
    ],
    savings: [
      {id:'s1',name:'Emergency Fund',target:60000,current:28000,monthly:2500,color:'#5cd98a'},
      {id:'s2',name:'Holiday Fund',target:15000,current:4200,monthly:1000,color:'#f7b731'},
    ],
    income: {},
    settings: {freedomTarget:10000000},
  };
}

// ============================================================
// STATE
// ============================================================
let state = getDefaultData();
let currentUser = null;
let saveTimer = null;

// ============================================================
// SUPABASE DATA LAYER
// ============================================================
async function loadFromSupabase() {
  const { data, error } = await sb
    .from('user_data')
    .select('data')
    .eq('user_id', currentUser.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row yet — first login, insert defaults
    await sb.from('user_data').insert({ user_id: currentUser.id, data: getDefaultData() });
    state = getDefaultData();
  } else if (!error && data) {
    state = data.data;
  }
}

function saveData() {
  // Debounce writes — 800ms after last change
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { error } = await sb
      .from('user_data')
      .upsert({ user_id: currentUser.id, data: state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) console.error('Save error:', error.message);
  }, 800);
}

// ============================================================
// AUTH UI
// ============================================================
function showAuth(mode = 'login') {
  document.getElementById('app').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  renderAuthForm(mode);
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('userEmail').textContent = currentUser.email;
}

function renderAuthForm(mode) {
  const isLogin = mode === 'login';
  document.getElementById('authForm').innerHTML = `
    <div class="auth-logo">Freed</div>
    <div class="auth-subtitle">${isLogin ? 'Welcome back' : 'Create your account'}</div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-input" type="email" id="authEmail" placeholder="you@example.com" inputmode="email" autocomplete="email"/>
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input class="form-input" type="password" id="authPassword" placeholder="••••••••" autocomplete="${isLogin?'current-password':'new-password'}"/>
    </div>
    ${!isLogin ? `<div class="form-group">
      <label class="form-label">Confirm Password</label>
      <input class="form-input" type="password" id="authConfirm" placeholder="••••••••" autocomplete="new-password"/>
    </div>` : ''}
    <div class="auth-error" id="authError"></div>
    <button class="btn-primary" onclick="submitAuth('${mode}')" id="authBtn">${isLogin ? 'Sign In' : 'Create Account'}</button>
    <div class="auth-switch">
      ${isLogin
        ? `No account? <span onclick="renderAuthForm('register')">Create one</span> &nbsp;·&nbsp; <span onclick="forgotPassword()">Forgot password?</span>`
        : `Already registered? <span onclick="renderAuthForm('login')">Sign in</span>`}
    </div>
  `;
  setTimeout(() => {
    const emailEl = document.getElementById('authEmail');
    if (emailEl) emailEl.focus();
    document.getElementById('authForm').onkeydown = e => { if (e.key === 'Enter') submitAuth(mode); };
  }, 100);
}

async function submitAuth(mode) {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  const btn = document.getElementById('authBtn');
  errEl.textContent = '';
  errEl.style.color = 'var(--rose)';

  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  if (mode === 'register') {
    const confirm = document.getElementById('authConfirm').value;
    if (password !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
    if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  }

  btn.textContent = mode === 'login' ? 'Signing in…' : 'Creating account…';
  btn.disabled = true;

  const { data, error } = mode === 'login'
    ? await sb.auth.signInWithPassword({ email, password })
    : await sb.auth.signUp({ email, password });

  btn.disabled = false;
  btn.textContent = mode === 'login' ? 'Sign In' : 'Create Account';

  if (error) { errEl.textContent = error.message; return; }

  if (mode === 'register' && !data.session) {
    errEl.style.color = 'var(--green)';
    errEl.textContent = 'Check your email to confirm your account, then sign in.';
    setTimeout(() => renderAuthForm('login'), 3000);
    return;
  }

  currentUser = data.user || data.session?.user;
  await loadFromSupabase();
  showApp();
  updateMonthLabel();
  renderAll();
  setTimeout(() => calcRetirement(), 100);
}

async function forgotPassword() {
  const email = document.getElementById('authEmail')?.value.trim();
  const errEl = document.getElementById('authError');
  if (!email) { errEl.textContent = 'Enter your email address first.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email);
  errEl.style.color = error ? 'var(--rose)' : 'var(--green)';
  errEl.textContent = error ? error.message : 'Reset link sent — check your email.';
}

async function signOut() {
  await sb.auth.signOut();
  currentUser = null;
  state = getDefaultData();
  closeModal();
  showAuth('login');
}

// ============================================================
// MONTH NAV
// ============================================================
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();

function getMonthKey(y, m) { return `${y}-${String(m+1).padStart(2,'0')}`; }
function currentKey() { return getMonthKey(viewYear, viewMonth); }

document.getElementById('prevMonth').onclick = () => {
  viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  updateMonthLabel(); renderAll();
};
document.getElementById('nextMonth').onclick = () => {
  viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  updateMonthLabel(); renderAll();
};
function updateMonthLabel() {
  document.getElementById('monthLabel').textContent = `${MONTHS[viewMonth]} ${viewYear}`;
}

// ============================================================
// NAVIGATION
// ============================================================
function switchPage(pageId, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  btn.classList.add('active');
  renderAll();
}

function switchTab(btn, tabId) {
  btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  btn.closest('.page').querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
  renderAll();
}

// ============================================================
// FORMATTERS
// ============================================================
function fmt(n) {
  if (n >= 1000000) return 'R ' + (n/1000000).toFixed(2) + 'm';
  if (n >= 1000) return 'R ' + (n/1000).toFixed(1) + 'k';
  return 'R ' + Math.round(n).toLocaleString('en-ZA');
}
function fmtFull(n) { return 'R ' + Math.round(n).toLocaleString('en-ZA'); }

// ============================================================
// CALCULATIONS
// ============================================================
function getMonthTransactions(y, m) {
  const k = getMonthKey(y, m);
  return (state.transactions||[]).filter(t => t.month === k);
}
function getCategorySpend(catId, y, m) {
  return getMonthTransactions(y,m).filter(t => t.catId===catId && t.type==='expense').reduce((s,t) => s+t.amount, 0);
}
function getTotalSpent(y, m) {
  return getMonthTransactions(y,m).filter(t => t.type==='expense').reduce((s,t) => s+t.amount, 0);
}
function getIncome(y, m) {
  const k = getMonthKey(y,m);
  return (state.income[k]||0) + getMonthTransactions(y,m).filter(t => t.type==='income').reduce((s,t) => s+t.amount, 0);
}
function getTotalAssets() {
  return (state.investments||[]).reduce((s,i) => s+i.value, 0) + (state.savings||[]).reduce((s,sv) => s+sv.current, 0);
}
function getTotalLiabilities() { return 0; }
function getNetWorth() { return getTotalAssets() - getTotalLiabilities(); }
function getMonthSavingsContrib() {
  return (state.investments||[]).reduce((s,i) => s+(i.contributions||0), 0) +
         (state.savings||[]).reduce((s,sv) => s+(sv.monthly||0), 0);
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
  renderDashboard();
  renderSpending();
  renderInvestments();
  renderInsights();
  if (document.getElementById('pageRetirement').classList.contains('active')) calcRetirement();
}

function renderDashboard() {
  const spent = getTotalSpent(viewYear, viewMonth);
  const income = getIncome(viewYear, viewMonth);
  const totalBudget = (state.categories||[]).reduce((s,c) => s+(c.budget||0), 0);
  const nw = getNetWorth();
  const target = (state.settings&&state.settings.freedomTarget)||10000000;
  const freedomPct = Math.min(100, Math.round(nw/target*100));

  document.getElementById('netWorthValue').textContent = fmtFull(nw);
  document.getElementById('totalAssets').textContent = fmt(getTotalAssets());
  document.getElementById('totalLiabilities').textContent = fmtFull(getTotalLiabilities());
  document.getElementById('monthlySave').textContent = fmt(getMonthSavingsContrib());
  document.getElementById('freedomPct').textContent = freedomPct + '%';
  document.getElementById('freedomBar').style.width = freedomPct + '%';
  document.getElementById('totalSpent').textContent = fmtFull(spent);
  document.getElementById('spentVsBudget').textContent = `of ${fmtFull(totalBudget)} budget`;
  document.getElementById('totalIncome').textContent = fmtFull(income);
  document.getElementById('incomeBalance').textContent = `Balance: ${fmtFull(income - spent)}`;

  renderMiniCatList(document.getElementById('catList'));
  renderMonthlyChart();
}

function renderMiniCatList(container) {
  if (!container) return;
  const cats = state.categories||[];
  if (!cats.length) { container.innerHTML = '<div class="swipe-hint">No categories yet. Add one in Spending.</div>'; return; }
  container.innerHTML = cats.slice(0,6).map(cat => catItemHTML(cat, false)).join('');
}

function catItemHTML(cat, clickable) {
  const spend = getCategorySpend(cat.id, viewYear, viewMonth);
  const pct = cat.budget ? Math.min(100, Math.round(spend/cat.budget*100)) : 0;
  const over = spend > (cat.budget||0);
  const click = clickable ? `onclick="editCategory('${cat.id}')"` : '';
  return `<div class="cat-item" ${click}>
    <div class="cat-icon" style="background:${cat.color}22">${cat.icon}</div>
    <div class="cat-info">
      <div class="cat-name">${cat.name}</div>
      <div class="cat-budget">Budget: ${fmtFull(cat.budget||0)}</div>
      <div class="cat-progress"><div class="cat-progress-fill" style="width:${pct}%;background:${over?'var(--rose)':cat.color}"></div></div>
    </div>
    <div class="cat-amount">
      <div class="amt" style="color:${over?'var(--rose)':'var(--text)'}">${fmtFull(spend)}</div>
      <div class="pct" style="color:${over?'var(--rose)':'var(--text3)'}">${pct}%</div>
    </div>
  </div>`;
}

function renderMonthlyChart() {
  const container = document.getElementById('monthlyChart');
  if (!container) return;
  const months = [];
  for (let i=5; i>=0; i--) {
    let m = viewMonth - i, y = viewYear;
    while (m < 0) { m += 12; y--; }
    months.push({y, m, label: MONTHS[m].substring(0,3)});
  }
  const maxVal = Math.max(1, ...months.map(({y,m}) => Math.max(getTotalSpent(y,m), getIncome(y,m))));
  container.innerHTML = months.map(({y,m,label}) => {
    const sp = getTotalSpent(y,m), inc = getIncome(y,m);
    const h1 = Math.round(sp/maxVal*70), h2 = Math.round(inc/maxVal*70);
    const cur = y===viewYear && m===viewMonth;
    return `<div class="bar-col">
      <div class="bar-seg-wrap">
        <div class="bar-seg" style="height:${h1}px;width:46%;background:${cur?'var(--rose)':'rgba(224,92,122,0.35)'}"></div>
        <div class="bar-seg" style="height:${h2}px;width:46%;background:${cur?'var(--green)':'rgba(92,217,138,0.35)'}"></div>
      </div>
      <div class="bar-lbl">${label}</div>
    </div>`;
  }).join('');
  document.getElementById('chartLegend').innerHTML =
    `<div class="legend-item"><div class="legend-dot" style="background:var(--rose)"></div>Spending</div>
     <div class="legend-item"><div class="legend-dot" style="background:var(--green)"></div>Income</div>`;
}

function renderSpending() {
  const fc = document.getElementById('fullCatList');
  if (fc) {
    const cats = state.categories||[];
    fc.innerHTML = cats.length
      ? cats.map(cat => catItemHTML(cat, true)).join('')
      : '<div class="swipe-hint">No categories. Tap + Category to add one.</div>';
  }

  const txl = document.getElementById('txList');
  if (txl) {
    const txs = getMonthTransactions(viewYear, viewMonth).sort((a,b) => new Date(b.date)-new Date(a.date));
    txl.innerHTML = txs.length
      ? `<div class="cat-list">${txs.map(tx => {
          const cat = (state.categories||[]).find(c => c.id===tx.catId) || {icon:'💵',color:'var(--green)',name:'Income'};
          return `<div class="cat-item" onclick="deleteTransaction('${tx.id}')">
            <div class="cat-icon" style="background:${cat.color}22">${tx.type==='income'?'💵':cat.icon}</div>
            <div class="cat-info">
              <div class="cat-name">${tx.note||cat.name}</div>
              <div class="cat-budget">${tx.date}</div>
            </div>
            <div class="cat-amount">
              <div class="amt" style="color:${tx.type==='income'?'var(--green)':'var(--rose)'}">${tx.type==='income'?'+':'-'}${fmtFull(tx.amount)}</div>
            </div>
          </div>`;
        }).join('')}</div><div class="swipe-hint">Tap transaction to delete</div>`
      : '<div class="swipe-hint">No transactions this month.</div>';
  }

  const bl = document.getElementById('budgetList');
  if (bl) {
    const cats = state.categories||[];
    const totalBudget = cats.reduce((s,c) => s+(c.budget||0), 0);
    const totalSpent = getTotalSpent(viewYear, viewMonth);
    const rem = totalBudget - totalSpent;
    bl.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span style="font-size:0.8rem;color:var(--text2)">Total Budget</span><span style="font-family:var(--font-mono);font-size:0.85rem;color:var(--gold)">${fmtFull(totalBudget)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span style="font-size:0.8rem;color:var(--text2)">Total Spent</span><span style="font-family:var(--font-mono);font-size:0.85rem;color:${totalSpent>totalBudget?'var(--rose)':'var(--green)'}">${fmtFull(totalSpent)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="font-size:0.8rem;color:var(--text2)">Remaining</span><span style="font-family:var(--font-mono);font-size:0.85rem;color:${rem<0?'var(--rose)':'var(--teal)'}">${fmtFull(rem)}</span></div>
      </div>
      ${cats.map(cat => {
        const spend = getCategorySpend(cat.id, viewYear, viewMonth);
        const r2 = (cat.budget||0) - spend;
        const pct = cat.budget ? Math.min(100, Math.round(spend/cat.budget*100)) : 0;
        return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
            <span style="font-size:0.85rem;color:var(--text)">${cat.icon} ${cat.name}</span>
            <span style="font-family:var(--font-mono);font-size:0.75rem;color:${r2<0?'var(--rose)':'var(--text2)'}">${r2<0?'Over '+fmtFull(-r2):fmtFull(r2)+' left'}</span>
          </div>
          <div class="cat-progress" style="height:5px"><div class="cat-progress-fill" style="width:${pct}%;background:${r2<0?'var(--rose)':cat.color}"></div></div>
          <div style="font-size:0.68rem;color:var(--text3);margin-top:4px">${fmtFull(spend)} of ${fmtFull(cat.budget||0)}</div>
        </div>`;
      }).join('')}`;
  }
}

function renderInvestments() {
  const il = document.getElementById('invList');
  if (il) {
    const invs = state.investments||[];
    il.innerHTML = invs.length
      ? invs.map(inv => `<div class="inv-item" onclick="editInvestment('${inv.id}')">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${inv.color};flex-shrink:0"></div>
            <div class="inv-name" style="flex:1">${inv.name}</div>
            <div class="inv-value" style="color:${inv.color}">${fmtFull(inv.value)}</div>
          </div>
          <div class="inv-meta">
            <div class="inv-meta-item">Monthly<span>${fmtFull(inv.contributions||0)}</span></div>
            <div class="inv-meta-item">Type<span>${inv.type||'—'}</span></div>
            <div class="inv-meta-item">Return<span class="inv-growth up">+${(inv.growth||0).toFixed(1)}%</span></div>
          </div>
        </div>`).join('')
      : '<div class="swipe-hint">No investments yet.</div>';
  }
  const sl = document.getElementById('savingsList');
  if (sl) {
    const savs = state.savings||[];
    sl.innerHTML = savs.length
      ? savs.map(sv => {
          const pct = sv.target ? Math.min(100, Math.round(sv.current/sv.target*100)) : 0;
          return `<div class="inv-item" onclick="editSaving('${sv.id}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;">
              <span style="font-size:0.88rem;color:var(--text)">${sv.name}</span>
              <span style="font-family:var(--font-mono);font-size:0.8rem;color:${sv.color};white-space:nowrap">${fmtFull(sv.current)} / ${fmt(sv.target)}</span>
            </div>
            <div class="cat-progress" style="height:5px"><div class="cat-progress-fill" style="width:${pct}%;background:${sv.color}"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:0.68rem;color:var(--text3)">
              <span>${pct}% complete</span><span>+${fmtFull(sv.monthly||0)}/month</span>
            </div>
          </div>`;
        }).join('')
      : '<div class="swipe-hint">No savings goals yet.</div>';
  }
}

function renderInsights() {
  const il = document.getElementById('insightsList');
  if (!il) return;
  const spent = getTotalSpent(viewYear, viewMonth);
  const income = getIncome(viewYear, viewMonth);
  const savings = getMonthSavingsContrib();
  const sr = income > 0 ? Math.round(savings/income*100) : 0;
  const insights = [];

  insights.push({icon:'💰',title:'Savings Rate',body:`You're saving <span class="insight-value">${sr}%</span> of income this month. ${sr>=20?'Excellent discipline!':sr>=10?'Consider increasing contributions.':'Aim for at least 20%.'}`});
  const overCats = (state.categories||[]).filter(c => getCategorySpend(c.id,viewYear,viewMonth) > (c.budget||0));
  if (overCats.length) insights.push({icon:'⚠️',title:'Over Budget',body:`Over budget in: ${overCats.map(c=>`<span class="insight-value">${c.name}</span>`).join(', ')}.`});
  const balance = income - spent;
  insights.push({icon:balance>=0?'✅':'🔴',title:'Monthly Balance',body:`${balance>=0?'You have':'You\'re overspent by'} <span class="insight-value">${fmtFull(Math.abs(balance))}</span> this month.`});
  const totalInv = (state.investments||[]).reduce((s,i) => s+i.value, 0);
  if (totalInv > 0) insights.push({icon:'📈',title:'Investment Portfolio',body:`Total portfolio: <span class="insight-value">${fmtFull(totalInv)}</span>. Consistency drives compound growth.`});
  const savGoals = [...(state.savings||[])].sort((a,b) => (b.current/b.target)-(a.current/a.target));
  if (savGoals.length) {
    const g = savGoals[0];
    insights.push({icon:'🎯',title:'Closest Goal',body:`<span class="insight-value">${g.name}</span> is ${Math.round(g.current/g.target*100)}% funded (${fmtFull(g.current)} of ${fmtFull(g.target)}).`});
  }
  il.innerHTML = insights.map(i => `<div class="insight-card"><div class="i-icon">${i.icon}</div><div class="i-title">${i.title}</div><div class="i-body">${i.body}</div></div>`).join('');
}

function calcRetirement() {
  const el = id => document.getElementById(id);
  if (!el('retireAge')) return;
  const age = +el('retireAge').value||30, targetAge = +el('retireTargetAge').value||65;
  const monthly = +el('retireContrib').value||5000, annual = +el('retireReturn').value||10;
  const current = +el('retireCurrent').value||0, target = +el('freedomTarget').value||10000000;
  const years = Math.max(0, targetAge - age);
  const r = annual/100/12, n = years*12;
  const fv = current*Math.pow(1+r,n) + monthly*(Math.pow(1+r,n)-1)/r;
  el('retireProjected').textContent = fmtFull(Math.round(fv));
  el('retireMonthly').textContent = fmtFull(monthly);
  el('retireYears').textContent = years + ' yrs';
  state.settings = state.settings||{};
  state.settings.freedomTarget = target;
  saveData();
  renderRetireChart(age, targetAge, monthly, annual, current);
}

function renderRetireChart(age, targetAge, monthly, annual, current) {
  const container = document.getElementById('retireChart');
  if (!container) return;
  const r = annual/100/12, years = Math.max(1, targetAge-age);
  const points = [];
  for (let y=0; y<=years; y++) { const n=y*12; points.push({y, fv: current*Math.pow(1+r,n)+monthly*(Math.pow(1+r,n)-1)/r}); }
  const maxFV = points[points.length-1].fv;
  const step = Math.max(1, Math.floor(years/7));
  const labels = points.filter((_,i) => i%step===0 || i===points.length-1);
  container.innerHTML = labels.map(p => {
    const h = Math.round(p.fv/maxFV*95);
    return `<div class="bar-col"><div class="bar-seg-wrap" style="height:100px"><div class="bar-seg" style="height:${h}px;background:linear-gradient(180deg,var(--teal),rgba(78,205,196,0.3));width:100%"></div></div><div class="bar-lbl">Yr${p.y}</div></div>`;
  }).join('');
}

// ============================================================
// MODALS
// ============================================================
let currentModal = null, editId = null;
let selectedEmoji = '💰', selectedColor = COLORS[0];

function openModal(type, id) {
  currentModal = type; editId = id||null;
  const titles = {expense:'Add Expense',transaction:'Add Transaction',category:id?'Edit Category':'New Category',investment:id?'Edit Investment':'New Investment',saving:id?'Edit Goal':'New Savings Goal',income:'Set Monthly Income'};
  const bodies = {expense:renderExpenseForm,transaction:renderTransactionForm,category:()=>renderCategoryForm(id),investment:()=>renderInvestmentForm(id),saving:()=>renderSavingForm(id),income:renderIncomeForm};
  document.getElementById('modalTitle').textContent = titles[type];
  document.getElementById('modalBody').innerHTML = bodies[type]();
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); currentModal=null; editId=null; }
function closeModalOnBg(e) { if (e.target===document.getElementById('modalOverlay')) closeModal(); }

function renderExpenseForm() {
  const cats = state.categories||[], today = new Date().toISOString().split('T')[0];
  return `<div class="form-group"><label class="form-label">Amount (R)</label><input class="form-input" type="number" id="expAmount" placeholder="0.00" inputmode="decimal"/></div>
    <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="expCat">${cats.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Note (optional)</label><input class="form-input" type="text" id="expNote" placeholder="e.g. Pick n Pay"/></div>
    <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="expDate" value="${today}"/></div>
    <button class="btn-primary" onclick="saveExpense()">Add Expense</button>`;
}

function renderTransactionForm() {
  const cats = state.categories||[], today = new Date().toISOString().split('T')[0];
  return `<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="txType" onchange="toggleTxCat()"><option value="expense">Expense</option><option value="income">Income</option></select></div>
    <div class="form-group"><label class="form-label">Amount (R)</label><input class="form-input" type="number" id="txAmount" placeholder="0.00" inputmode="decimal"/></div>
    <div class="form-group" id="txCatGroup"><label class="form-label">Category</label><select class="form-select" id="txCat">${cats.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Note</label><input class="form-input" type="text" id="txNote" placeholder="Description"/></div>
    <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="txDate" value="${today}"/></div>
    <button class="btn-primary" onclick="saveTransaction()">Save Transaction</button>`;
}

function toggleTxCat() { document.getElementById('txCatGroup').style.display = document.getElementById('txType').value==='income'?'none':'block'; }

function renderCategoryForm(id) {
  const cat = id ? (state.categories||[]).find(c=>c.id===id) : null;
  if (cat) { selectedEmoji=cat.icon; selectedColor=cat.color; }
  return `<div class="form-group"><label class="form-label">Name</label><input class="form-input" type="text" id="catName" value="${cat?cat.name:''}" placeholder="e.g. Groceries"/></div>
    <div class="form-group"><label class="form-label">Icon</label><div class="emoji-picker" id="emojiPicker">${EMOJIS.map(e=>`<button class="emoji-btn${cat&&cat.icon===e?' selected':''}" onclick="selectEmoji(this,'${e}')">${e}</button>`).join('')}</div></div>
    <div class="form-group"><label class="form-label">Color</label><div class="color-picker">${COLORS.map(c=>`<div class="color-swatch${(cat?cat.color:selectedColor)===c?' selected':''}" style="background:${c}" onclick="selectColor(this,'${c}')"></div>`).join('')}</div></div>
    <div class="form-group"><label class="form-label">Monthly Budget (R)</label><input class="form-input" type="number" id="catBudget" value="${cat?cat.budget:''}" placeholder="0" inputmode="decimal"/></div>
    <button class="btn-primary" onclick="saveCategory()">${cat?'Update':'Add'} Category</button>
    ${cat?`<button class="btn-danger" onclick="deleteCategory('${cat.id}')">Delete Category</button>`:''}`;
}

function renderInvestmentForm(id) {
  const inv = id ? (state.investments||[]).find(i=>i.id===id) : null;
  if (inv) selectedColor=inv.color;
  return `<div class="form-group"><label class="form-label">Name</label><input class="form-input" type="text" id="invName" value="${inv?inv.name:''}" placeholder="e.g. TFSA — Allan Gray"/></div>
    <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="invType">${['Investment','Retirement','Property','Crypto','Shares','Other'].map(t=>`<option value="${t}"${inv&&inv.type===t?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Current Value (R)</label><input class="form-input" type="number" id="invValue" value="${inv?inv.value:''}" placeholder="0" inputmode="decimal"/></div>
      <div class="form-group"><label class="form-label">Monthly (R)</label><input class="form-input" type="number" id="invContrib" value="${inv?inv.contributions:''}" placeholder="0" inputmode="decimal"/></div>
    </div>
    <div class="form-group"><label class="form-label">Annual Return (%)</label><input class="form-input" type="number" id="invGrowth" value="${inv?inv.growth:''}" placeholder="10" step="0.1" inputmode="decimal"/></div>
    <div class="form-group"><label class="form-label">Color</label><div class="color-picker">${COLORS.map(c=>`<div class="color-swatch${(inv?inv.color:selectedColor)===c?' selected':''}" style="background:${c}" onclick="selectColor(this,'${c}')"></div>`).join('')}</div></div>
    <button class="btn-primary" onclick="saveInvestment()">${inv?'Update':'Add'} Investment</button>
    ${inv?`<button class="btn-danger" onclick="deleteInvestment('${inv.id}')">Delete</button>`:''}`;
}

function renderSavingForm(id) {
  const sv = id ? (state.savings||[]).find(s=>s.id===id) : null;
  if (sv) selectedColor=sv.color;
  return `<div class="form-group"><label class="form-label">Goal Name</label><input class="form-input" type="text" id="svName" value="${sv?sv.name:''}" placeholder="e.g. Emergency Fund"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Target (R)</label><input class="form-input" type="number" id="svTarget" value="${sv?sv.target:''}" placeholder="0" inputmode="decimal"/></div>
      <div class="form-group"><label class="form-label">Current (R)</label><input class="form-input" type="number" id="svCurrent" value="${sv?sv.current:''}" placeholder="0" inputmode="decimal"/></div>
    </div>
    <div class="form-group"><label class="form-label">Monthly (R)</label><input class="form-input" type="number" id="svMonthly" value="${sv?sv.monthly:''}" placeholder="0" inputmode="decimal"/></div>
    <div class="form-group"><label class="form-label">Color</label><div class="color-picker">${COLORS.map(c=>`<div class="color-swatch${(sv?sv.color:selectedColor)===c?' selected':''}" style="background:${c}" onclick="selectColor(this,'${c}')"></div>`).join('')}</div></div>
    <button class="btn-primary" onclick="saveSaving()">${sv?'Update':'Add'} Goal</button>
    ${sv?`<button class="btn-danger" onclick="deleteSaving('${sv.id}')">Delete Goal</button>`:''}`;
}

function renderIncomeForm() {
  const k = currentKey();
  return `<div class="form-group"><label class="form-label">Monthly Income (R) — ${MONTHS[viewMonth]} ${viewYear}</label>
    <input class="form-input" type="number" id="incomeAmount" value="${state.income[k]||0}" inputmode="decimal"/></div>
    <button class="btn-primary" onclick="saveIncome()">Save Income</button>`;
}

function selectEmoji(btn, emoji) { document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); selectedEmoji=emoji; }
function selectColor(swatch, color) { document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected')); swatch.classList.add('selected'); selectedColor=color; }

// ============================================================
// SAVE HANDLERS
// ============================================================
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }

function saveExpense() {
  const amount = parseFloat(document.getElementById('expAmount').value);
  if (!amount||amount<=0) { showToast('Enter a valid amount'); return; }
  const catId=document.getElementById('expCat').value, note=document.getElementById('expNote').value, date=document.getElementById('expDate').value;
  state.transactions.push({id:uid(),type:'expense',amount,catId,note,date,month:date.substring(0,7)});
  saveData(); closeModal(); renderAll(); showToast('Expense added');
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('txAmount').value);
  if (!amount||amount<=0) { showToast('Enter a valid amount'); return; }
  const type=document.getElementById('txType').value, catId=type==='expense'?document.getElementById('txCat').value:null;
  const note=document.getElementById('txNote').value, date=document.getElementById('txDate').value;
  state.transactions.push({id:uid(),type,amount,catId,note,date,month:date.substring(0,7)});
  saveData(); closeModal(); renderAll(); showToast('Transaction saved');
}

function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  state.transactions=state.transactions.filter(t=>t.id!==id);
  saveData(); renderAll(); showToast('Deleted');
}

function saveCategory() {
  const name=document.getElementById('catName').value.trim();
  if (!name) { showToast('Enter a category name'); return; }
  const budget=parseFloat(document.getElementById('catBudget').value)||0;
  const ep=document.getElementById('emojiPicker');
  const icon=ep?(ep.querySelector('.emoji-btn.selected')?.textContent||selectedEmoji):selectedEmoji;
  const cp=document.querySelector('.color-swatch.selected'), color=cp?cp.style.background:selectedColor;
  if (editId) { const cat=state.categories.find(c=>c.id===editId); if(cat) Object.assign(cat,{name,icon,color,budget}); }
  else state.categories.push({id:uid(),name,icon,color,budget,type:'expense'});
  saveData(); closeModal(); renderAll(); showToast(editId?'Category updated':'Category added');
}

function editCategory(id) { openModal('category',id); }
function deleteCategory(id) {
  state.categories=state.categories.filter(c=>c.id!==id);
  state.transactions=state.transactions.filter(t=>t.catId!==id);
  saveData(); closeModal(); renderAll(); showToast('Category deleted');
}

function saveInvestment() {
  const name=document.getElementById('invName').value.trim();
  if (!name) { showToast('Enter a name'); return; }
  const type=document.getElementById('invType').value, value=parseFloat(document.getElementById('invValue').value)||0;
  const contributions=parseFloat(document.getElementById('invContrib').value)||0, growth=parseFloat(document.getElementById('invGrowth').value)||0;
  const cp=document.querySelector('.color-swatch.selected'), color=cp?cp.style.background:selectedColor;
  if (editId) { const inv=state.investments.find(i=>i.id===editId); if(inv) Object.assign(inv,{name,type,value,contributions,growth,color}); }
  else { if(!state.investments)state.investments=[]; state.investments.push({id:uid(),name,type,value,contributions,growth,color}); }
  saveData(); closeModal(); renderAll(); showToast('Investment saved');
}

function editInvestment(id) { openModal('investment',id); }
function deleteInvestment(id) { state.investments=state.investments.filter(i=>i.id!==id); saveData(); closeModal(); renderAll(); showToast('Deleted'); }

function saveSaving() {
  const name=document.getElementById('svName').value.trim();
  if (!name) { showToast('Enter a name'); return; }
  const target=parseFloat(document.getElementById('svTarget').value)||0, current=parseFloat(document.getElementById('svCurrent').value)||0;
  const monthly=parseFloat(document.getElementById('svMonthly').value)||0;
  const cp=document.querySelector('.color-swatch.selected'), color=cp?cp.style.background:selectedColor;
  if (editId) { const sv=state.savings.find(s=>s.id===editId); if(sv) Object.assign(sv,{name,target,current,monthly,color}); }
  else { if(!state.savings)state.savings=[]; state.savings.push({id:uid(),name,target,current,monthly,color}); }
  saveData(); closeModal(); renderAll(); showToast('Savings goal saved');
}

function editSaving(id) { openModal('saving',id); }
function deleteSaving(id) { state.savings=state.savings.filter(s=>s.id!==id); saveData(); closeModal(); renderAll(); showToast('Deleted'); }

function saveIncome() {
  const amount=parseFloat(document.getElementById('incomeAmount').value)||0;
  if(!state.income)state.income={};
  state.income[currentKey()]=amount;
  saveData(); closeModal(); renderAll(); showToast('Income saved');
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

// ============================================================
// BOOT
// ============================================================
document.getElementById('totalIncome').addEventListener('click', () => openModal('income'));
updateMonthLabel();

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadFromSupabase();
    showApp();
    renderAll();
    setTimeout(() => calcRetirement(), 100);
  } else {
    showAuth('login');
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') { currentUser = null; showAuth('login'); }
    if (event === 'SIGNED_IN' && session) currentUser = session.user;
  });
})();
