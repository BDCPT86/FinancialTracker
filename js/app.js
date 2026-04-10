// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = 'https://qpmiljxrmtobagpvenbi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWlsanhybXRvYmFncHZlbmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjA4OTIsImV4cCI6MjA5MTI5Njg5Mn0.A5DI8P7WcJevWblz6kdItb9ku7X6XX0HausNAP9RTic';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#2d6a4f','#40916c','#52b788','#e76f51','#f4a261','#48cae4','#8b7cf8','#e9c46a','#264653','#e63946'];
const EMOJIS = ['🏠','🚗','🛒','🍽️','💊','🎭','✈️','📱','💡','📚','💪','👕','🎮','☕','🐾','🍺','💰','🏦','📈','🎁','🏫','💻','🔧','💅','🛡️'];

// FIX: No sample data — start completely blank
const defaultCategories = [
  {id:'c1',name:'Housing',icon:'🏠',color:'#2d6a4f',budget:0,type:'expense'},
  {id:'c2',name:'Groceries',icon:'🛒',color:'#40916c',budget:0,type:'expense'},
  {id:'c3',name:'Transport',icon:'🚗',color:'#52b788',budget:0,type:'expense'},
  {id:'c4',name:'Dining Out',icon:'🍽️',color:'#e76f51',budget:0,type:'expense'},
  {id:'c5',name:'Health',icon:'💊',color:'#f4a261',budget:0,type:'expense'},
  {id:'c6',name:'Entertainment',icon:'🎭',color:'#48cae4',budget:0,type:'expense'},
];

function getDefaultData() {
  return {
    categories: defaultCategories,
    transactions: [],
    investments: [],
    savings: [],
    liabilities: [],
    recurringTx: [],
    income: {},
    settings: { freedomTarget: 10000000, inflationRate: 5.5 },
  };
}

let state = getDefaultData();
let currentUser = null;
let saveTimer = null;

// ============================================================
// SUPABASE
// ============================================================
async function loadFromSupabase() {
  const { data, error } = await sb.from('user_data').select('data').eq('user_id', currentUser.id).single();
  if (error && error.code === 'PGRST116') {
    await sb.from('user_data').insert({ user_id: currentUser.id, data: getDefaultData() });
    state = getDefaultData();
  } else if (!error && data) {
    state = data.data;
    if (!state.liabilities) state.liabilities = [];
    if (!state.recurringTx) state.recurringTx = [];
    if (!state.settings) state.settings = {};
    if (!state.settings.inflationRate) state.settings.inflationRate = 5.5;
  }
}

function saveData() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { error } = await sb.from('user_data')
      .upsert({ user_id: currentUser.id, data: state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) console.error('Save error:', error.message);
  }, 800);
}

// ============================================================
// AUTH
// ============================================================
function showAuth(mode = 'login') {
  document.getElementById('app').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  renderAuthForm(mode);
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const initial = (currentUser.email||'F')[0].toUpperCase();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('userEmail', currentUser.email);
  set('topbarAvatar', initial);
  set('mobileAvatarBtn', initial);
  set('mobileUserEmail', currentUser.email);
}

function renderAuthForm(mode) {
  const isLogin = mode === 'login';
  document.getElementById('authForm').innerHTML = `
    <div class="auth-logo">Freed<span class="auth-logo-dot">.</span></div>
    <div class="auth-subtitle">${isLogin ? 'Welcome back' : 'Create your account'}</div>
    <div class="form-group"><label class="form-label">Email</label>
      <input class="form-input" type="email" id="authEmail" placeholder="you@example.com" inputmode="email" autocomplete="email"/></div>
    <div class="form-group"><label class="form-label">Password</label>
      <input class="form-input" type="password" id="authPassword" placeholder="••••••••" autocomplete="${isLogin?'current-password':'new-password'}"/></div>
    ${!isLogin?`<div class="form-group"><label class="form-label">Confirm Password</label>
      <input class="form-input" type="password" id="authConfirm" placeholder="••••••••" autocomplete="new-password"/></div>`:''}
    <div class="auth-error" id="authError"></div>
    <button class="btn-primary" onclick="submitAuth('${mode}')" id="authBtn">${isLogin?'Sign In':'Create Account'}</button>
    <div class="auth-switch">${isLogin
      ? `No account? <span onclick="renderAuthForm('register')">Create one</span> &nbsp;·&nbsp; <span onclick="forgotPassword()">Forgot password?</span>`
      : `Already registered? <span onclick="renderAuthForm('login')">Sign in</span>`}</div>`;
  setTimeout(() => {
    const el = document.getElementById('authEmail'); if (el) el.focus();
    document.getElementById('authForm').onkeydown = e => { if (e.key==='Enter') submitAuth(mode); };
  }, 100);
}

async function submitAuth(mode) {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  const btn = document.getElementById('authBtn');
  errEl.textContent = ''; errEl.style.color = 'var(--coral)';
  if (!email||!password) { errEl.textContent='Please fill in all fields.'; return; }
  if (mode==='register') {
    const confirm = document.getElementById('authConfirm').value;
    if (password!==confirm) { errEl.textContent='Passwords do not match.'; return; }
    if (password.length<6) { errEl.textContent='Password must be at least 6 characters.'; return; }
  }
  btn.textContent = mode==='login' ? 'Signing in…' : 'Creating account…';
  btn.disabled = true;
  const { data, error } = mode==='login'
    ? await sb.auth.signInWithPassword({ email, password })
    : await sb.auth.signUp({ email, password });
  btn.disabled = false;
  btn.textContent = mode==='login' ? 'Sign In' : 'Create Account';
  if (error) { errEl.textContent=error.message; return; }
  if (mode==='register' && !data.session) {
    errEl.style.color='var(--green2)';
    errEl.textContent='Check your email to confirm your account, then sign in.';
    setTimeout(()=>renderAuthForm('login'),3000); return;
  }
  currentUser = data.user || data.session?.user;
  await loadFromSupabase();
  applyRecurringTransactions();
  showApp(); updateMonthLabel(); renderAll();
  setTimeout(()=>calcRetirement(),100);
}

async function forgotPassword() {
  const email = document.getElementById('authEmail')?.value.trim();
  const errEl = document.getElementById('authError');
  if (!email) { errEl.textContent='Enter your email address first.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email);
  errEl.style.color = error ? 'var(--coral)' : 'var(--green2)';
  errEl.textContent = error ? error.message : 'Reset link sent — check your email.';
}

async function signOut() {
  await sb.auth.signOut();
  currentUser = null; state = getDefaultData();
  if (heroChartInstance) { heroChartInstance.destroy(); heroChartInstance=null; }
  if (retireChartInstance) { retireChartInstance.destroy(); retireChartInstance=null; }
  closeModal(); showAuth('login');
}

// ============================================================
// MOBILE MENU
// ============================================================
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('open');
}
document.addEventListener('click', e => {
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('mobileAvatarBtn');
  if (menu&&menu.classList.contains('open')&&!menu.contains(e.target)&&e.target!==btn)
    menu.classList.remove('open');
});

// ============================================================
// MONTH NAV
// ============================================================
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
function getMonthKey(y,m) { return `${y}-${String(m+1).padStart(2,'0')}`; }
function currentKey() { return getMonthKey(viewYear,viewMonth); }

document.getElementById('prevMonth').onclick = () => {
  viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} updateMonthLabel(); renderAll();
};
document.getElementById('nextMonth').onclick = () => {
  viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} updateMonthLabel(); renderAll();
};
function updateMonthLabel() {
  const label = `${MONTHS[viewMonth]} ${viewYear}`;
  ['monthLabel','monthLabelMobile'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=label;});
}

// ============================================================
// NAVIGATION
// ============================================================
function switchPage(pageId, btn) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item,.sidebar-nav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  btn.classList.add('active');
  const page = btn.dataset?.page;
  if (page) document.querySelectorAll(`[data-page="${page}"]`).forEach(b=>b.classList.add('active'));
  renderAll();
}
function switchTab(btn, tabId) {
  btn.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  btn.closest('.page').querySelectorAll('.tab-content').forEach(t=>t.style.display='none');
  document.getElementById(tabId).style.display='block';
  renderAll();
}

// ============================================================
// FORMATTERS
// ============================================================
function fmt(n) {
  if(n>=1000000) return 'R '+(n/1000000).toFixed(2)+'m';
  if(n>=1000) return 'R '+(n/1000).toFixed(1)+'k';
  return 'R '+Math.round(n).toLocaleString('en-ZA');
}
function fmtFull(n) { return 'R '+Math.round(Math.abs(n)).toLocaleString('en-ZA'); }

// ============================================================
// CALCULATIONS — ALL FIXED
// ============================================================
function getMonthTransactions(y,m) {
  return (state.transactions||[]).filter(t=>t.month===getMonthKey(y,m));
}
function getCategorySpend(catId,y,m) {
  return getMonthTransactions(y,m).filter(t=>t.catId===catId&&t.type==='expense').reduce((s,t)=>s+t.amount,0);
}
function getTotalSpent(y,m) {
  return getMonthTransactions(y,m).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
}
function getIncome(y,m) {
  return (state.income[getMonthKey(y,m)]||0) +
    getMonthTransactions(y,m).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
}
function getTotalAssets() {
  return (state.investments||[]).reduce((s,i)=>s+i.value,0) +
         (state.savings||[]).reduce((s,sv)=>s+sv.current,0);
}
// FIXED: real liabilities
function getTotalLiabilities() {
  return (state.liabilities||[]).reduce((s,l)=>s+l.balance,0);
}
function getNetWorth() { return getTotalAssets()-getTotalLiabilities(); }
function getMonthSavingsContrib() {
  return (state.investments||[]).reduce((s,i)=>s+(i.contributions||0),0)+
         (state.savings||[]).reduce((s,sv)=>s+(sv.monthly||0),0);
}

// ============================================================
// RECURRING TRANSACTIONS
// ============================================================
function applyRecurringTransactions() {
  const recurring = state.recurringTx||[];
  if (!recurring.length) return;
  const k = currentKey();
  const existingIds = new Set((state.transactions||[]).filter(t=>t.month===k).map(t=>t.recurringId).filter(Boolean));
  let added=0;
  recurring.forEach(r=>{
    if (!existingIds.has(r.id)) {
      state.transactions.push({
        id:uid(), type:r.type, amount:r.amount, catId:r.catId,
        note:r.note+' (recurring)',
        date:`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-01`,
        month:k, recurringId:r.id
      });
      added++;
    }
  });
  if (added>0) saveData();
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
  renderDashboard();
  renderSpending();
  renderInvestments();
  renderLiabilities();
  renderInsights();
  if (document.getElementById('pageRetirement').classList.contains('active')) calcRetirement();
}

// ── DASHBOARD ────────────────────────────────
let heroChartInstance=null;

function renderDashboard() {
  const spent = getTotalSpent(viewYear,viewMonth);
  const income = getIncome(viewYear,viewMonth);
  const totalBudget = (state.categories||[]).reduce((s,c)=>s+(c.budget||0),0);
  const nw = getNetWorth();
  const target = state.settings?.freedomTarget||10000000;
  const freedomPct = nw>0&&target>0 ? Math.min(100,Math.round(nw/target*100)) : 0;
  const balance = income-spent;

  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  set('netWorthValue',fmtFull(nw));
  set('totalAssets',fmt(getTotalAssets()));
  set('monthlySave',fmt(getMonthSavingsContrib()));
  const balEl=document.getElementById('heroBalance');
  if(balEl){balEl.textContent=(balance<0?'-':'')+fmtFull(balance);balEl.style.color=balance<0?'var(--coral)':'white';}
  set('freedomPct',freedomPct+'%');
  const fb=document.getElementById('freedomBar');if(fb)fb.style.width=freedomPct+'%';
  set('totalSpent',fmtFull(spent));
  set('spentVsBudget',`of ${fmtFull(totalBudget)} budget`);
  set('totalIncome',fmtFull(income));

  renderMiniCatList(document.getElementById('catList'));
  renderHeroChart();
}

function renderMiniCatList(container) {
  if (!container) return;
  const cats = state.categories||[];
  const active = cats.filter(c=>getCategorySpend(c.id,viewYear,viewMonth)>0);
  container.innerHTML = active.length
    ? active.map(c=>catItemHTML(c,false)).join('')
    : '<div class="swipe-hint">No expenses this month. Tap + Add Expense to get started.</div>';
}

function catItemHTML(cat, clickable) {
  const spend = getCategorySpend(cat.id,viewYear,viewMonth);
  const pct = cat.budget ? Math.min(100,Math.round(spend/cat.budget*100)) : 0;
  const over = cat.budget>0 && spend>cat.budget;
  return `<div class="cat-item" ${clickable?`onclick="editCategory('${cat.id}')"`:''}> 
    <div class="cat-icon" style="background:${cat.color}22">${cat.icon}</div>
    <div class="cat-info">
      <div class="cat-name">${cat.name}</div>
      <div class="cat-budget">${cat.budget?'Budget: '+fmtFull(cat.budget):'No budget set'}</div>
      ${cat.budget?`<div class="cat-progress"><div class="cat-progress-fill" style="width:${pct}%;background:${over?'var(--coral)':cat.color}"></div></div>`:''}
    </div>
    <div class="cat-amount">
      <div class="amt" style="color:${over?'var(--coral)':'var(--text)'}">${fmtFull(spend)}</div>
      <div class="pct" style="color:${over?'var(--coral)':'var(--text3)'}">${cat.budget?pct+'%':''}</div>
    </div>
  </div>`;
}

function renderHeroChart() {
  const canvas = document.getElementById('heroChart');
  if (!canvas) return;
  const months=[];
  for(let i=5;i>=0;i--){let m=viewMonth-i,y=viewYear;while(m<0){m+=12;y--;}months.push({y,m,label:MONTHS[m].substring(0,3)});}
  if(heroChartInstance){heroChartInstance.destroy();heroChartInstance=null;}
  heroChartInstance=new Chart(canvas,{
    type:'line',
    data:{labels:months.map(({label})=>label),datasets:[
      {label:'Spending',data:months.map(({y,m})=>getTotalSpent(y,m)),borderColor:'rgba(255,255,255,0.95)',borderWidth:2,pointRadius:3,pointBackgroundColor:'white',pointBorderColor:'transparent',fill:true,backgroundColor:'rgba(255,255,255,0.12)',tension:0.4},
      {label:'Income',data:months.map(({y,m})=>getIncome(y,m)),borderColor:'rgba(255,255,255,0.45)',borderWidth:2,borderDash:[5,4],pointRadius:0,fill:false,tension:0.4}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(27,67,50,0.92)',borderColor:'rgba(255,255,255,0.15)',borderWidth:1,titleColor:'rgba(255,255,255,0.65)',bodyColor:'#fff',titleFont:{family:'DM Mono,monospace',size:10},bodyFont:{family:'DM Mono,monospace',size:11},padding:10,callbacks:{label:ctx=>' R '+ctx.parsed.y.toLocaleString('en-ZA')}}},
      scales:{x:{ticks:{color:'rgba(255,255,255,0.6)',font:{family:'DM Mono,monospace',size:10}},grid:{color:'rgba(255,255,255,0.08)'},border:{color:'rgba(255,255,255,0.15)'}},y:{min:0,ticks:{color:'rgba(255,255,255,0.6)',font:{family:'DM Mono,monospace',size:10},maxTicksLimit:4,callback:v=>v>=1000000?'R'+(v/1000000).toFixed(1)+'m':v>=1000?'R'+(v/1000).toFixed(0)+'k':'R'+v},grid:{color:'rgba(255,255,255,0.08)'},border:{color:'rgba(255,255,255,0.15)'}}}}
  });
  const leg=document.getElementById('heroLegend');
  if(leg)leg.innerHTML=`<div class="hero-legend-item"><div class="hero-legend-dot" style="background:rgba(255,255,255,0.9)"></div>Spending</div><div class="hero-legend-item"><div class="hero-legend-dot" style="background:rgba(255,255,255,0.45);border:1px dashed rgba(255,255,255,0.6)"></div>Income</div>`;
}

// ── SPENDING ──────────────────────────────────
function renderSpending() {
  const fc=document.getElementById('fullCatList');
  if(fc){const cats=state.categories||[];fc.innerHTML=cats.length?cats.map(c=>catItemHTML(c,true)).join(''):'<div class="swipe-hint">No categories. Tap + Category to add one.</div>';}

  const txl=document.getElementById('txList');
  if(txl){
    const txs=getMonthTransactions(viewYear,viewMonth).sort((a,b)=>new Date(b.date)-new Date(a.date));
    txl.innerHTML=txs.length
      ?`<div class="cat-list">${txs.map(tx=>{
          const cat=(state.categories||[]).find(c=>c.id===tx.catId)||{icon:'💵',color:'var(--green2)',name:'Income'};
          return `<div class="cat-item" onclick="deleteTransaction('${tx.id}')">
            <div class="cat-icon" style="background:${cat.color}22">${tx.type==='income'?'💵':cat.icon}</div>
            <div class="cat-info"><div class="cat-name">${tx.note||cat.name}${tx.recurringId?' <span style="font-size:0.6rem;color:var(--green3);font-family:var(--mono)">↻</span>':''}</div><div class="cat-budget">${tx.date}</div></div>
            <div class="cat-amount"><div class="amt" style="color:${tx.type==='income'?'var(--green2)':'var(--coral)'}">${tx.type==='income'?'+':'-'}${fmtFull(tx.amount)}</div></div>
          </div>`;
        }).join('')}</div><div class="swipe-hint">Tap transaction to delete</div>`
      :'<div class="swipe-hint">No transactions this month.</div>';
  }

  const bl=document.getElementById('budgetList');
  if(bl){
    const cats=state.categories||[];
    const totalBudget=cats.reduce((s,c)=>s+(c.budget||0),0);
    const totalSpent=getTotalSpent(viewYear,viewMonth);
    const rem=totalBudget-totalSpent;
    const now=new Date();
    const days=new Date(viewYear,viewMonth+1,0).getDate();
    const today=now.getDate();
    const isCurMonth=viewYear===now.getFullYear()&&viewMonth===now.getMonth();

    bl.innerHTML=`
      <div class="budget-summary-card">
        <div class="bsc-row"><span>Total Budget</span><span style="color:var(--green2)">${fmtFull(totalBudget)}</span></div>
        <div class="bsc-row"><span>Total Spent</span><span style="color:${totalSpent>totalBudget?'var(--coral)':'var(--text)'}">${fmtFull(totalSpent)}</span></div>
        <div class="bsc-row"><span>Remaining</span><span style="color:${rem<0?'var(--coral)':'var(--green2)'}">${rem<0?'-':''}${fmtFull(rem)}</span></div>
      </div>
      ${cats.map(cat=>{
        const spend=getCategorySpend(cat.id,viewYear,viewMonth);
        const r2=(cat.budget||0)-spend;
        const pct=cat.budget?Math.min(100,Math.round(spend/cat.budget*100)):0;
        const pace=isCurMonth&&cat.budget>0?(spend/today*days)<=cat.budget:true;
        return `<div class="budget-row-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
            <span style="font-size:0.88rem;font-weight:700;color:var(--text)">${cat.icon} ${cat.name}</span>
            <span style="font-family:var(--mono);font-size:0.75rem;color:${r2<0?'var(--coral)':'var(--text2)'}">${r2<0?'Over '+fmtFull(-r2):fmtFull(r2)+' left'}</span>
          </div>
          <div class="cat-progress" style="height:5px;margin-bottom:5px"><div class="cat-progress-fill" style="width:${pct}%;background:${r2<0?'var(--coral)':cat.color}"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text3)">
            <span>${fmtFull(spend)} of ${fmtFull(cat.budget||0)}</span>
            ${isCurMonth&&cat.budget>0?`<span style="color:${pace?'var(--green2)':'var(--coral)'}">${pace?'On track':'Overspending pace'}</span>`:''}
          </div>
        </div>`;
      }).join('')}
      <div style="margin-top:20px">
        <div class="section-header"><span>Recurring Transactions</span><button class="add-btn" onclick="openModal('recurring')">+ Add</button></div>
        ${renderRecurringList()}
      </div>`;
  }
}

function renderRecurringList() {
  const recs=state.recurringTx||[];
  if(!recs.length) return '<div class="swipe-hint">No recurring transactions. Add salary, rent etc.</div>';
  return `<div class="cat-list">${recs.map(r=>{
    const cat=(state.categories||[]).find(c=>c.id===r.catId)||{icon:'💵',color:'var(--green2)',name:'Income'};
    return `<div class="cat-item" onclick="deleteRecurring('${r.id}')">
      <div class="cat-icon" style="background:${cat.color}22">${r.type==='income'?'💵':cat.icon}</div>
      <div class="cat-info"><div class="cat-name">${r.note} <span style="font-size:0.62rem;color:var(--green3);font-family:var(--mono)">↻ monthly</span></div><div class="cat-budget">${r.type==='income'?'Income':cat.name}</div></div>
      <div class="cat-amount"><div class="amt" style="color:${r.type==='income'?'var(--green2)':'var(--coral)'}">${r.type==='income'?'+':'-'}${fmtFull(r.amount)}</div></div>
    </div>`;
  }).join('')}</div><div class="swipe-hint">Tap to delete</div>`;
}

// ── INVESTMENTS ───────────────────────────────
function renderInvestments() {
  const il=document.getElementById('invList');
  if(il){
    const invs=state.investments||[];
    il.innerHTML=invs.length
      ?invs.map(inv=>{
          const r=(inv.growth||0)/100/12,n=60;
          const proj5=inv.value*Math.pow(1+r,n)+(inv.contributions||0)*(Math.pow(1+r,n)-1)/r;
          return `<div class="inv-item" onclick="editInvestment('${inv.id}')">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${inv.color};flex-shrink:0"></div>
              <div class="inv-name" style="flex:1">${inv.name}</div>
              <div class="inv-value" style="color:${inv.color}">${fmtFull(inv.value)}</div>
            </div>
            <div class="inv-meta">
              <div class="inv-meta-item">Monthly<span>${fmtFull(inv.contributions||0)}</span></div>
              <div class="inv-meta-item">Type<span>${inv.type||'—'}</span></div>
              <div class="inv-meta-item">Return<span class="inv-growth up">+${(inv.growth||0).toFixed(1)}%</span></div>
              <div class="inv-meta-item">5yr Projection<span style="color:var(--green2)">${fmt(proj5)}</span></div>
            </div>
          </div>`;
        }).join('')
      :'<div class="swipe-hint">No investments yet.</div>';
  }
  const sl=document.getElementById('savingsList');
  if(sl){
    const savs=state.savings||[];
    sl.innerHTML=savs.length
      ?savs.map(sv=>{
          const pct=sv.target?Math.min(100,Math.round(sv.current/sv.target*100)):0;
          const mLeft=sv.monthly>0&&sv.target>sv.current?Math.ceil((sv.target-sv.current)/sv.monthly):null;
          return `<div class="inv-item" onclick="editSaving('${sv.id}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;">
              <span style="font-size:0.88rem;font-weight:700;color:var(--text)">${sv.name}</span>
              <span style="font-family:var(--mono);font-size:0.8rem;color:${sv.color};white-space:nowrap">${fmtFull(sv.current)} / ${fmt(sv.target)}</span>
            </div>
            <div class="cat-progress" style="height:5px"><div class="cat-progress-fill" style="width:${pct}%;background:${sv.color}"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:0.68rem;color:var(--text3)">
              <span>${pct}% complete</span>
              <span>${mLeft?mLeft+' months to go':'+'+fmtFull(sv.monthly||0)+'/month'}</span>
            </div>
          </div>`;
        }).join('')
      :'<div class="swipe-hint">No savings goals yet.</div>';
  }
}

// ── LIABILITIES ───────────────────────────────
function renderLiabilities() {
  const ll=document.getElementById('liabilitiesList');
  if(!ll) return;
  const libs=state.liabilities||[];
  ll.innerHTML=libs.length
    ?libs.map(l=>{
        const monthlyInterest=l.balance*(l.rate||0)/100/12;
        return `<div class="inv-item" onclick="editLiability('${l.id}')">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="font-size:1.1rem">${l.icon||'🏦'}</div>
            <div style="flex:1;font-size:0.88rem;font-weight:700;color:var(--text)">${l.name}</div>
            <div style="font-family:var(--mono);font-size:0.88rem;color:var(--coral)">-${fmtFull(l.balance)}</div>
          </div>
          <div class="inv-meta">
            <div class="inv-meta-item">Type<span>${l.type||'—'}</span></div>
            <div class="inv-meta-item">Rate<span>${(l.rate||0).toFixed(1)}% p.a.</span></div>
            <div class="inv-meta-item">Monthly interest<span style="color:var(--coral)">${fmtFull(monthlyInterest)}</span></div>
            ${l.minPayment?`<div class="inv-meta-item">Min payment<span>${fmtFull(l.minPayment)}</span></div>`:''}
          </div>
        </div>`;
      }).join('')
    :'<div class="swipe-hint">No liabilities. Add home loans, vehicle finance or credit cards to complete your net worth.</div>';
}

// ── INSIGHTS — ALL FIXED ─────────────────────
function renderInsights() {
  const il=document.getElementById('insightsList');
  if(!il) return;
  const spent=getTotalSpent(viewYear,viewMonth);
  const income=getIncome(viewYear,viewMonth);
  const savingsContrib=getMonthSavingsContrib();
  const liabilities=getTotalLiabilities();
  const assets=getTotalAssets();
  const nw=getNetWorth();
  const insights=[];

  // FIXED: savings rate = contributions / gross income
  const sr=income>0?Math.round(savingsContrib/income*100):0;
  insights.push({icon:'💰',title:'Savings Rate',
    body:`Contributing <span class="insight-value">${sr}%</span> of gross income to savings/investments. ${sr>=20?'Excellent — you meet the 20% benchmark!':sr>=10?'Getting there — aim for 20%.':'Below 10%. Try to increase contributions.'}`});

  // FIXED: true cash flow after expenses AND savings
  const cashflow=income-spent-savingsContrib;
  if(income>0) insights.push({icon:cashflow>=0?'✅':'⚠️',title:'True Cash Flow',
    body:`After expenses and savings contributions, you ${cashflow>=0?'have':'are short by'} <span class="insight-value">${fmtFull(Math.abs(cashflow))}</span> this month.`});

  // NEW: overspending pace warning (current month only)
  const now=new Date();
  if(viewYear===now.getFullYear()&&viewMonth===now.getMonth()){
    const days=new Date(viewYear,viewMonth+1,0).getDate(),today=now.getDate();
    const overCats=(state.categories||[]).filter(c=>c.budget>0&&(getCategorySpend(c.id,viewYear,viewMonth)/today*days)>c.budget);
    if(overCats.length) insights.push({icon:'🔴',title:'Overspending Pace',
      body:`At current pace, you will exceed budget in: ${overCats.map(c=>`<span class="insight-value">${c.name}</span>`).join(', ')}.`});
  }

  // FIXED: debt insight using real liabilities
  if(liabilities>0){
    const debtToAsset=assets>0?Math.round(liabilities/assets*100):100;
    const totalInterest=(state.liabilities||[]).reduce((s,l)=>s+l.balance*(l.rate||0)/100/12,0);
    insights.push({icon:'🏦',title:'Debt Overview',
      body:`Total debt: <span class="insight-value">-${fmtFull(liabilities)}</span>. Debt-to-asset ratio: ${debtToAsset}%. Monthly interest cost: <span class="insight-value">${fmtFull(totalInterest)}</span>.`});
  }

  insights.push({icon:'📊',title:'Net Worth',
    body:`Assets <span class="insight-value">${fmtFull(assets)}</span> minus liabilities <span class="insight-value">${fmtFull(liabilities)}</span> = <span class="insight-value">${fmtFull(nw)}</span>.`});

  // NEW: 5-year investment projection
  const totalInv=(state.investments||[]).reduce((s,i)=>s+i.value,0);
  if(totalInv>0){
    const proj5=(state.investments||[]).reduce((s,inv)=>{
      const r=(inv.growth||0)/100/12,n=60;
      return s+inv.value*Math.pow(1+r,n)+(inv.contributions||0)*(Math.pow(1+r,n)-1)/r;
    },0);
    insights.push({icon:'📈',title:'Investment Portfolio',
      body:`Current portfolio: <span class="insight-value">${fmtFull(totalInv)}</span>. Projected in 5 years at current rates: <span class="insight-value">${fmt(proj5)}</span>.`});
  }

  const savGoals=[...(state.savings||[])].sort((a,b)=>(b.current/b.target)-(a.current/a.target));
  if(savGoals.length){
    const g=savGoals[0];
    insights.push({icon:'🎯',title:'Closest Savings Goal',
      body:`<span class="insight-value">${g.name}</span> is ${Math.round(g.current/g.target*100)}% funded (${fmtFull(g.current)} of ${fmtFull(g.target)}).`});
  }

  il.innerHTML=insights.map(i=>`<div class="insight-card"><div class="i-icon">${i.icon}</div><div class="i-title">${i.title}</div><div class="i-body">${i.body}</div></div>`).join('');
}

// ── RETIREMENT — FIXED WITH INFLATION ────────
function calcRetirement() {
  const el=id=>document.getElementById(id);
  if(!el('retireAge')) return;
  const age=+el('retireAge').value||30, targetAge=+el('retireTargetAge').value||65;
  const monthly=+el('retireContrib').value||5000, annual=+el('retireReturn').value||10;
  const inflation=+el('retireInflation').value||(state.settings?.inflationRate||5.5);
  const current=+el('retireCurrent').value||0, target=+el('freedomTarget').value||10000000;
  const years=Math.max(0,targetAge-age);
  const r=annual/100/12, n=years*12;

  // Nominal FV
  const fvNominal=current*Math.pow(1+r,n)+monthly*(Math.pow(1+r,n)-1)/r;
  // FIXED: Real (inflation-adjusted) FV in today's money
  const fvReal=fvNominal/Math.pow(1+inflation/100,years);

  el('retireProjected').textContent=fmtFull(Math.round(fvNominal));
  if(el('retireRealValue')) el('retireRealValue').textContent=fmtFull(Math.round(fvReal));
  el('retireMonthly').textContent=fmtFull(monthly);
  el('retireYears').textContent=years+' yrs';

  const meetsTarget=fvReal>=target;
  const statusEl=el('retireTargetStatus');
  if(statusEl){
    statusEl.textContent=meetsTarget
      ?`✅ Real value meets your ${fmt(target)} target in today's money`
      :`⚠️ Real value is ${fmtFull(target-fvReal)} short of your target in today's money`;
    statusEl.style.color=meetsTarget?'var(--green2)':'var(--coral)';
  }

  state.settings=state.settings||{};
  state.settings.freedomTarget=target;
  state.settings.inflationRate=inflation;
  saveData();
  renderRetireChart(age,targetAge,monthly,annual,current,inflation);
}

let retireChartInstance=null;

function renderRetireChart(age,targetAge,monthly,annual,current,inflation) {
  const canvas=document.getElementById('retireChart');
  if(!canvas) return;
  const r=annual/100/12, years=Math.max(1,targetAge-age);
  const nominal=[],real=[],labels=[];
  for(let y=0;y<=years;y++){
    const n=y*12;
    const fv=current*Math.pow(1+r,n)+monthly*(Math.pow(1+r,n)-1)/r;
    nominal.push(Math.round(fv));
    real.push(Math.round(fv/Math.pow(1+(inflation||5.5)/100,y)));
    labels.push('Yr '+(age+y));
  }
  if(retireChartInstance){retireChartInstance.destroy();retireChartInstance=null;}
  retireChartInstance=new Chart(canvas,{
    type:'line',
    data:{labels,datasets:[
      {label:'Nominal value',data:nominal,borderColor:'#40916c',borderWidth:2,pointRadius:0,fill:true,backgroundColor:'rgba(64,145,108,0.12)',tension:0.4},
      {label:"Real (today's money)",data:real,borderColor:'#52b788',borderWidth:1.5,borderDash:[5,4],pointRadius:0,fill:false,tension:0.4}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:true,position:'top',labels:{color:'#4a7c59',font:{family:'DM Mono,monospace',size:10},boxWidth:12,padding:16}},
        tooltip:{backgroundColor:'#fff',borderColor:'rgba(45,106,79,0.20)',borderWidth:1.5,titleColor:'#8fb89a',bodyColor:'#1b3a2d',titleFont:{family:'DM Mono,monospace',size:10},bodyFont:{family:'DM Mono,monospace',size:11},padding:10,callbacks:{label:ctx=>' R '+ctx.parsed.y.toLocaleString('en-ZA')}}
      },
      scales:{
        x:{ticks:{color:'#8fb89a',font:{family:'DM Mono,monospace',size:10},maxTicksLimit:8,maxRotation:0},grid:{color:'rgba(45,106,79,0.06)'},border:{color:'rgba(45,106,79,0.10)'}},
        y:{min:0,ticks:{color:'#8fb89a',font:{family:'DM Mono,monospace',size:10},maxTicksLimit:5,callback:v=>v>=1000000?'R'+(v/1000000).toFixed(1)+'m':v>=1000?'R'+(v/1000).toFixed(0)+'k':'R'+v},grid:{color:'rgba(45,106,79,0.06)'},border:{color:'rgba(45,106,79,0.10)'}}
      }}
  });
}

// ============================================================
// MODALS
// ============================================================
let currentModal=null,editId=null;
let selectedEmoji='💰',selectedColor=COLORS[0];

function openModal(type,id) {
  currentModal=type; editId=id||null;
  const titles={expense:'Add Expense',transaction:'Add Transaction',category:id?'Edit Category':'New Category',investment:id?'Edit Investment':'New Investment',saving:id?'Edit Goal':'New Savings Goal',liability:id?'Edit Liability':'Add Liability / Debt',recurring:'Add Recurring Transaction',income:'Set Monthly Income'};
  const bodies={expense:renderExpenseForm,transaction:renderTransactionForm,category:()=>renderCategoryForm(id),investment:()=>renderInvestmentForm(id),saving:()=>renderSavingForm(id),liability:()=>renderLiabilityForm(id),recurring:renderRecurringForm,income:renderIncomeForm};
  document.getElementById('modalTitle').textContent=titles[type]||'';
  document.getElementById('modalBody').innerHTML=(bodies[type]||(() => ''))();
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); currentModal=null; editId=null; }
function closeModalOnBg(e) { if(e.target===document.getElementById('modalOverlay')) closeModal(); }

function renderExpenseForm() {
  const cats=state.categories||[],today=new Date().toISOString().split('T')[0];
  return `<div class="form-group"><label class="form-label">Amount (R)</label><input class="form-input" type="number" id="expAmount" placeholder="0.00" inputmode="decimal"/></div>
    <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="expCat">${cats.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Note (optional)</label><input class="form-input" type="text" id="expNote" placeholder="e.g. Pick n Pay"/></div>
    <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="expDate" value="${today}"/></div>
    <button class="btn-primary" onclick="saveExpense()">Add Expense</button>`;
}

function renderTransactionForm() {
  const cats=state.categories||[],today=new Date().toISOString().split('T')[0];
  return `<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="txType" onchange="toggleTxCat()"><option value="expense">Expense</option><option value="income">Income</option></select></div>
    <div class="form-group"><label class="form-label">Amount (R)</label><input class="form-input" type="number" id="txAmount" placeholder="0.00" inputmode="decimal"/></div>
    <div class="form-group" id="txCatGroup"><label class="form-label">Category</label><select class="form-select" id="txCat">${cats.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Note</label><input class="form-input" type="text" id="txNote" placeholder="Description"/></div>
    <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="txDate" value="${today}"/></div>
    <button class="btn-primary" onclick="saveTransaction()">Save Transaction</button>`;
}

function toggleTxCat() { document.getElementById('txCatGroup').style.display=document.getElementById('txType').value==='income'?'none':'block'; }

function renderRecurringForm() {
  const cats=state.categories||[];
  return `<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="recType" onchange="toggleRecCat()"><option value="expense">Expense</option><option value="income">Income</option></select></div>
    <div class="form-group"><label class="form-label">Amount (R)</label><input class="form-input" type="number" id="recAmount" placeholder="0.00" inputmode="decimal"/></div>
    <div class="form-group" id="recCatGroup"><label class="form-label">Category</label><select class="form-select" id="recCat">${cats.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Description</label><input class="form-input" type="text" id="recNote" placeholder="e.g. Rent, Salary"/></div>
    <p style="font-size:0.72rem;color:var(--text3);margin-bottom:12px;line-height:1.5">Auto-added on the 1st of each month you open the app.</p>
    <button class="btn-primary" onclick="saveRecurring()">Save Recurring</button>`;
}

function toggleRecCat() { document.getElementById('recCatGroup').style.display=document.getElementById('recType').value==='income'?'none':'block'; }

function renderLiabilityForm(id) {
  const lib=id?(state.liabilities||[]).find(l=>l.id===id):null;
  const types=[{t:'Home Loan',i:'🏠'},{t:'Vehicle Finance',i:'🚗'},{t:'Credit Card',i:'💳'},{t:'Personal Loan',i:'💰'},{t:'Student Loan',i:'🎓'},{t:'Other',i:'🏦'}];
  return `<div class="form-group"><label class="form-label">Name</label><input class="form-input" type="text" id="libName" value="${lib?lib.name:''}" placeholder="e.g. Home Loan — FNB"/></div>
    <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="libType">${types.map(({t,i})=>`<option value="${t}" data-icon="${i}"${lib&&lib.type===t?' selected':''}>${i} ${t}</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Outstanding Balance (R)</label><input class="form-input" type="number" id="libBalance" value="${lib?lib.balance:''}" placeholder="0" inputmode="decimal"/></div>
      <div class="form-group"><label class="form-label">Interest Rate (% p.a.)</label><input class="form-input" type="number" id="libRate" value="${lib?lib.rate:''}" placeholder="11.5" step="0.1" inputmode="decimal"/></div>
    </div>
    <div class="form-group"><label class="form-label">Minimum Monthly Payment (R)</label><input class="form-input" type="number" id="libPayment" value="${lib?lib.minPayment:''}" placeholder="0" inputmode="decimal"/></div>
    <div class="form-group"><label class="form-label">Color</label><div class="color-picker">${COLORS.map(c=>`<div class="color-swatch${(lib?lib.color:selectedColor)===c?' selected':''}" style="background:${c}" onclick="selectColor(this,'${c}')"></div>`).join('')}</div></div>
    <button class="btn-primary" onclick="saveLiability()">${lib?'Update':'Add'} Liability</button>
    ${lib?`<button class="btn-danger" onclick="deleteLiability('${lib.id}')">Delete</button>`:''}`;
}

function renderCategoryForm(id) {
  const cat=id?(state.categories||[]).find(c=>c.id===id):null;
  if(cat){selectedEmoji=cat.icon;selectedColor=cat.color;}
  return `<div class="form-group"><label class="form-label">Name</label><input class="form-input" type="text" id="catName" value="${cat?cat.name:''}" placeholder="e.g. Groceries"/></div>
    <div class="form-group"><label class="form-label">Icon</label><div class="emoji-picker" id="emojiPicker">${EMOJIS.map(e=>`<button class="emoji-btn${cat&&cat.icon===e?' selected':''}" onclick="selectEmoji(this,'${e}')">${e}</button>`).join('')}</div></div>
    <div class="form-group"><label class="form-label">Color</label><div class="color-picker">${COLORS.map(c=>`<div class="color-swatch${(cat?cat.color:selectedColor)===c?' selected':''}" style="background:${c}" onclick="selectColor(this,'${c}')"></div>`).join('')}</div></div>
    <div class="form-group"><label class="form-label">Monthly Budget (R)</label><input class="form-input" type="number" id="catBudget" value="${cat?cat.budget:''}" placeholder="0" inputmode="decimal"/></div>
    <button class="btn-primary" onclick="saveCategory()">${cat?'Update':'Add'} Category</button>
    ${cat?`<button class="btn-danger" onclick="deleteCategory('${cat.id}')">Delete Category</button>`:''}`;
}

function renderInvestmentForm(id) {
  const inv=id?(state.investments||[]).find(i=>i.id===id):null;
  if(inv) selectedColor=inv.color;
  return `<div class="form-group"><label class="form-label">Name</label><input class="form-input" type="text" id="invName" value="${inv?inv.name:''}" placeholder="e.g. TFSA — Allan Gray"/></div>
    <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="invType">${['Investment','Retirement','Property','Crypto','Shares','Other'].map(t=>`<option value="${t}"${inv&&inv.type===t?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Current Value (R)</label><input class="form-input" type="number" id="invValue" value="${inv?inv.value:''}" placeholder="0" inputmode="decimal"/></div>
      <div class="form-group"><label class="form-label">Monthly Contrib. (R)</label><input class="form-input" type="number" id="invContrib" value="${inv?inv.contributions:''}" placeholder="0" inputmode="decimal"/></div>
    </div>
    <div class="form-group"><label class="form-label">Annual Return (%)</label><input class="form-input" type="number" id="invGrowth" value="${inv?inv.growth:''}" placeholder="10" step="0.1" inputmode="decimal"/></div>
    <div class="form-group"><label class="form-label">Color</label><div class="color-picker">${COLORS.map(c=>`<div class="color-swatch${(inv?inv.color:selectedColor)===c?' selected':''}" style="background:${c}" onclick="selectColor(this,'${c}')"></div>`).join('')}</div></div>
    <button class="btn-primary" onclick="saveInvestment()">${inv?'Update':'Add'} Investment</button>
    ${inv?`<button class="btn-danger" onclick="deleteInvestment('${inv.id}')">Delete</button>`:''}`;
}

function renderSavingForm(id) {
  const sv=id?(state.savings||[]).find(s=>s.id===id):null;
  if(sv) selectedColor=sv.color;
  return `<div class="form-group"><label class="form-label">Goal Name</label><input class="form-input" type="text" id="svName" value="${sv?sv.name:''}" placeholder="e.g. Emergency Fund"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Target (R)</label><input class="form-input" type="number" id="svTarget" value="${sv?sv.target:''}" placeholder="0" inputmode="decimal"/></div>
      <div class="form-group"><label class="form-label">Current (R)</label><input class="form-input" type="number" id="svCurrent" value="${sv?sv.current:''}" placeholder="0" inputmode="decimal"/></div>
    </div>
    <div class="form-group"><label class="form-label">Monthly Contribution (R)</label><input class="form-input" type="number" id="svMonthly" value="${sv?sv.monthly:''}" placeholder="0" inputmode="decimal"/></div>
    <div class="form-group"><label class="form-label">Color</label><div class="color-picker">${COLORS.map(c=>`<div class="color-swatch${(sv?sv.color:selectedColor)===c?' selected':''}" style="background:${c}" onclick="selectColor(this,'${c}')"></div>`).join('')}</div></div>
    <button class="btn-primary" onclick="saveSaving()">${sv?'Update':'Add'} Goal</button>
    ${sv?`<button class="btn-danger" onclick="deleteSaving('${sv.id}')">Delete Goal</button>`:''}`;
}

function renderIncomeForm() {
  const k=currentKey();
  return `<div class="form-group"><label class="form-label">Monthly Income (R) — ${MONTHS[viewMonth]} ${viewYear}</label>
    <input class="form-input" type="number" id="incomeAmount" value="${state.income[k]||0}" inputmode="decimal"/></div>
    <button class="btn-primary" onclick="saveIncome()">Save Income</button>`;
}

function selectEmoji(btn,emoji){document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');selectedEmoji=emoji;}
function selectColor(swatch,color){document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));swatch.classList.add('selected');selectedColor=color;}

// ============================================================
// SAVE HANDLERS
// ============================================================
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}

function saveExpense(){
  const amount=parseFloat(document.getElementById('expAmount').value);
  if(!amount||amount<=0){showToast('Enter a valid amount');return;}
  const catId=document.getElementById('expCat').value,note=document.getElementById('expNote').value,date=document.getElementById('expDate').value;
  state.transactions.push({id:uid(),type:'expense',amount,catId,note,date,month:date.substring(0,7)});
  saveData();closeModal();renderAll();showToast('Expense added');
}

function saveTransaction(){
  const amount=parseFloat(document.getElementById('txAmount').value);
  if(!amount||amount<=0){showToast('Enter a valid amount');return;}
  const type=document.getElementById('txType').value,catId=type==='expense'?document.getElementById('txCat').value:null;
  const note=document.getElementById('txNote').value,date=document.getElementById('txDate').value;
  state.transactions.push({id:uid(),type,amount,catId,note,date,month:date.substring(0,7)});
  saveData();closeModal();renderAll();showToast('Transaction saved');
}

function deleteTransaction(id){
  if(!confirm('Delete this transaction?'))return;
  state.transactions=state.transactions.filter(t=>t.id!==id);
  saveData();renderAll();showToast('Deleted');
}

function saveRecurring(){
  const amount=parseFloat(document.getElementById('recAmount').value);
  if(!amount||amount<=0){showToast('Enter a valid amount');return;}
  const type=document.getElementById('recType').value;
  const catId=type==='expense'?document.getElementById('recCat').value:null;
  const note=document.getElementById('recNote').value.trim();
  if(!note){showToast('Enter a description');return;}
  if(!state.recurringTx)state.recurringTx=[];
  state.recurringTx.push({id:uid(),type,amount,catId,note});
  saveData();closeModal();renderAll();showToast('Recurring transaction saved');
}

function deleteRecurring(id){
  if(!confirm('Delete recurring transaction?'))return;
  state.recurringTx=state.recurringTx.filter(r=>r.id!==id);
  saveData();renderAll();showToast('Deleted');
}

function saveLiability(){
  const name=document.getElementById('libName').value.trim();
  if(!name){showToast('Enter a name');return;}
  const sel=document.getElementById('libType');
  const type=sel.value;
  const icon=sel.options[sel.selectedIndex]?.getAttribute('data-icon')||'🏦';
  const balance=parseFloat(document.getElementById('libBalance').value)||0;
  const rate=parseFloat(document.getElementById('libRate').value)||0;
  const minPayment=parseFloat(document.getElementById('libPayment').value)||0;
  const cp=document.querySelector('.color-swatch.selected'),color=cp?cp.style.background:selectedColor;
  if(editId){const lib=state.liabilities.find(l=>l.id===editId);if(lib)Object.assign(lib,{name,type,icon,balance,rate,minPayment,color});}
  else{if(!state.liabilities)state.liabilities=[];state.liabilities.push({id:uid(),name,type,icon,balance,rate,minPayment,color});}
  saveData();closeModal();renderAll();showToast('Liability saved');
}

function editLiability(id){openModal('liability',id);}
function deleteLiability(id){state.liabilities=state.liabilities.filter(l=>l.id!==id);saveData();closeModal();renderAll();showToast('Deleted');}

function saveCategory(){
  const name=document.getElementById('catName').value.trim();
  if(!name){showToast('Enter a category name');return;}
  const budget=parseFloat(document.getElementById('catBudget').value)||0;
  const ep=document.getElementById('emojiPicker');
  const icon=ep?(ep.querySelector('.emoji-btn.selected')?.textContent||selectedEmoji):selectedEmoji;
  const cp=document.querySelector('.color-swatch.selected'),color=cp?cp.style.background:selectedColor;
  if(editId){const cat=state.categories.find(c=>c.id===editId);if(cat)Object.assign(cat,{name,icon,color,budget});}
  else state.categories.push({id:uid(),name,icon,color,budget,type:'expense'});
  saveData();closeModal();renderAll();showToast(editId?'Category updated':'Category added');
}

function editCategory(id){openModal('category',id);}
function deleteCategory(id){state.categories=state.categories.filter(c=>c.id!==id);state.transactions=state.transactions.filter(t=>t.catId!==id);saveData();closeModal();renderAll();showToast('Category deleted');}

function saveInvestment(){
  const name=document.getElementById('invName').value.trim();
  if(!name){showToast('Enter a name');return;}
  const type=document.getElementById('invType').value,value=parseFloat(document.getElementById('invValue').value)||0;
  const contributions=parseFloat(document.getElementById('invContrib').value)||0,growth=parseFloat(document.getElementById('invGrowth').value)||0;
  const cp=document.querySelector('.color-swatch.selected'),color=cp?cp.style.background:selectedColor;
  if(editId){const inv=state.investments.find(i=>i.id===editId);if(inv)Object.assign(inv,{name,type,value,contributions,growth,color});}
  else{if(!state.investments)state.investments=[];state.investments.push({id:uid(),name,type,value,contributions,growth,color});}
  saveData();closeModal();renderAll();showToast('Investment saved');
}

function editInvestment(id){openModal('investment',id);}
function deleteInvestment(id){state.investments=state.investments.filter(i=>i.id!==id);saveData();closeModal();renderAll();showToast('Deleted');}

function saveSaving(){
  const name=document.getElementById('svName').value.trim();
  if(!name){showToast('Enter a name');return;}
  const target=parseFloat(document.getElementById('svTarget').value)||0,current=parseFloat(document.getElementById('svCurrent').value)||0;
  const monthly=parseFloat(document.getElementById('svMonthly').value)||0;
  const cp=document.querySelector('.color-swatch.selected'),color=cp?cp.style.background:selectedColor;
  if(editId){const sv=state.savings.find(s=>s.id===editId);if(sv)Object.assign(sv,{name,target,current,monthly,color});}
  else{if(!state.savings)state.savings=[];state.savings.push({id:uid(),name,target,current,monthly,color});}
  saveData();closeModal();renderAll();showToast('Savings goal saved');
}

function editSaving(id){openModal('saving',id);}
function deleteSaving(id){state.savings=state.savings.filter(s=>s.id!==id);saveData();closeModal();renderAll();showToast('Deleted');}

function saveIncome(){
  const amount=parseFloat(document.getElementById('incomeAmount').value)||0;
  if(!state.income)state.income={};
  state.income[currentKey()]=amount;
  saveData();closeModal();renderAll();showToast('Income saved');
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}

// ============================================================
// BOOT
// ============================================================
document.getElementById('totalIncome').addEventListener('click',()=>openModal('income'));
updateMonthLabel();

(async()=>{
  const {data:{session}}=await sb.auth.getSession();
  if(session){
    currentUser=session.user;
    await loadFromSupabase();
    applyRecurringTransactions();
    showApp();renderAll();
    setTimeout(()=>calcRetirement(),100);
  } else {
    showAuth('login');
  }
  sb.auth.onAuthStateChange(async(event,session)=>{
    if(event==='SIGNED_OUT'){currentUser=null;showAuth('login');}
    if(event==='SIGNED_IN'&&session)currentUser=session.user;
  });
})();
