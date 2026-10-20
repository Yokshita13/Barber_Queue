//STATE 
const S={
  role:null,
  prev:'s-land',
  rating:0,
  shopOpen:true,
  user:{
    name:'',
    phone:'',
    location:''
  },
  barber:{
    name:'',
    phone:'',
    shopName:'',
    address:'',
    openingTime:'',
    closingTime:'',
    rating:0,
    ratingCount:0,
    payoutBank:'',
    payoutLast4:'',
    photo:'',
    onlineCollected:0
  },
  inQueue:false,
  myTok:'',
  mySvc:'',
  myShopId:0,
  selectedSvc:0,
  selectedShop:null,
  pendingJoin:null,
  payMethod:'online',
  payments:[],
  queueHistory:[],
  ratedShops:[],
  paymentMethods:[],
  lastCompletedVisit:null,
  services:[
    {id:1,name:'Hair Cut',price:250,dur:20,ico:'💇'},
    {id:2,name:'Beard Trim',price:150,dur:15,ico:'🧔'},
    {id:3,name:'Hair Color',price:800,dur:60,ico:'🎨'},
    {id:4,name:'Facial',price:600,dur:45,ico:'✨'},
    {id:5,name:'Hair Spa',price:1200,dur:90,ico:'💆'},
  ],
  shops:[],
  bq:[],
  earn:0,
  doneCnt:0,
  onlineCollected:0
};

const CUSTOMER_STORAGE_KEY = "barberQCustomers";
const ACTIVE_CUSTOMER_KEY = "barberQActiveCustomer";
function getCustomerKey(phone) {
    return String(phone || "").replace(/\D/g, "").slice(-10);
}
function getAllCustomers() {
    try {
        return JSON.parse(
            localStorage.getItem(CUSTOMER_STORAGE_KEY) || "{}"
        );
    } catch (error) {
        console.error("Could not load customer records:", error);
        return {};
    }
}

function saveCurrentCustomer() {
    const phone = getCustomerKey(S.user.phone);
    if (!phone) return false;
    const customers = getAllCustomers();
    customers[phone] = {
        name: S.user.name || "Customer",
        phone: S.user.phone,
        location: S.user.location || "Not set",
        queueHistory: S.queueHistory || [],
        ratedShops: S.ratedShops || [],
        payments: S.payments || [],
        paymentMethods: S.paymentMethods || [],
        lastCompletedVisit: S.lastCompletedVisit || null
    };
    try {
        localStorage.setItem(
            CUSTOMER_STORAGE_KEY,
            JSON.stringify(customers)
        );
        localStorage.setItem(ACTIVE_CUSTOMER_KEY, phone);
        return true;
    } catch (error) {
        console.error("Could not save customer:", error);
        toast("⚠️", "Could not save customer data");
        return false;
    }
}

function loadCustomer(phone, enteredName = "") {
    const key = getCustomerKey(phone);
    if (!key) return false;
    const customers = getAllCustomers();
    const saved = customers[key];
    S.user = saved ? {
        name: saved.name || enteredName || "Customer",
        phone: saved.phone || "+91 " + key,
        location: saved.location || "Not set"
    } : {
        name: enteredName || "Customer",
        phone: "+91 " + key,
        location: "Not set"
    };
    S.queueHistory = saved?.queueHistory || [];
    S.ratedShops = saved?.ratedShops || [];
    S.payments = saved?.payments || [];
    S.paymentMethods = saved?.paymentMethods || [];
    S.lastCompletedVisit = saved?.lastCompletedVisit || null;
    S.inQueue = false;
    S.myTok = "";
    S.mySvc = "";
    S.myShopId = 0;
    localStorage.setItem(ACTIVE_CUSTOMER_KEY, key);
    saveCurrentCustomer();
    updateUserAvatar();
    return true;
}

const PUBLIC_SHOP_KEY = 'barberShopPublic';
function publishBarberShop(){
  try{
    const shop = S.shops.find(s => s.isBarberProfile);
    if(!shop){
      localStorage.removeItem(PUBLIC_SHOP_KEY);
      localStorage.removeItem(PUBLIC_SHOP_KEY + 'Photo');
      return;
    }
    const { photo, ...rest } = shop;
    localStorage.setItem(PUBLIC_SHOP_KEY, JSON.stringify(rest));
    if(photo) localStorage.setItem(PUBLIC_SHOP_KEY + 'Photo', photo);
    else      localStorage.removeItem(PUBLIC_SHOP_KEY + 'Photo');
  }catch(e){
    console.warn('Could not publish barber shop:', e);
  }
}

function loadPublishedShop(){
  try{
    const raw = localStorage.getItem(PUBLIC_SHOP_KEY);
    if(!raw){
      S.shops = S.shops.filter(s => !s.isBarberProfile);
      return false;
    }
    const data = JSON.parse(raw);
    data.photo = localStorage.getItem(PUBLIC_SHOP_KEY + 'Photo') || '';
    data.isBarberProfile = true;
    const i = S.shops.findIndex(s => s.isBarberProfile);
    if(i >= 0){
      data.id = S.shops[i].id;
      S.shops[i] = data;
    }else{
      data.id = S.shops.length;     
      S.shops.push(data);
    }
    return true;
  }catch(e){
    console.warn('Could not load published shop:', e);
    return false;
  }
}

function unpublishBarberShop(){
  S.shops = S.shops.filter(s => !s.isBarberProfile);
  try{
    localStorage.removeItem(PUBLIC_SHOP_KEY);
    localStorage.removeItem(PUBLIC_SHOP_KEY + 'Photo');
  }catch(e){}
}

function syncBarberToCustomerShop(){
  const b = S.barber;
  if(!b || !b.name || !b.shopName) return;
  let shop = S.shops.find(s => s.isBarberProfile);
  if(!shop){
    shop = { id: S.shops.length, isBarberProfile: true, cur: 0, q: 0, wait: 0 };
    S.shops.push(shop);
  }
  Object.assign(shop, {
    name:        b.shopName,
    owner:       b.name,
    rating:      Number(b.rating) || 0,
    rev:         Number(b.ratingCount) || 0,
    addr:        b.address || 'Address not set',
    open:        S.shopOpen,
    clr:         '#00d4aa',
    ico:         '✂️',
    svcs:        S.services.map((_, i) => i),
    photo:       b.photo || '',
    phone:       b.phone || '',
    openingTime: b.openingTime || '',
    closingTime: b.closingTime || ''
  });
  syncShopStats();     
}

function syncShopStats(){
  const shop = S.shops.find(s => s.isBarberProfile);
  if(!shop) return;
  shop.q    = S.bq.length;
  shop.cur  = S.bq[0] ? S.bq[0].tok : 0;
  shop.wait = S.bq.reduce((t, q) => t + (Number(q.dur) || 0), 0);
  shop.open = S.shopOpen;
  publishBarberShop();
  registerShopInBackend();
}

let _shopSyncSig = '';

async function registerShopInBackend(){
  const b = S.barber;
  if(!b || !b.shopName) return;
  const payload = {
    shop_name:   b.shopName,
    address:     b.address || '',
    barber_name: b.name || '',
    open:        S.shopOpen
  };
  const sig = JSON.stringify(payload);
  if(sig === _shopSyncSig) return;
  try{
    const r = await fetch('https://barber-queue-backend-9z52.onrender.com/api/shops/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if(r.ok && j.success) _shopSyncSig = sig;
  }catch(e){
    console.warn('Could not register shop in backend:', e);
  }
}

window.addEventListener('storage', e => {
  if(e.key !== PUBLIC_SHOP_KEY && e.key !== PUBLIC_SHOP_KEY + 'Photo') return;
  if(S.role === 'barber') return;           // the barber tab owns this data
  loadPublishedShop();
  const cust = document.getElementById('s-cust');
  if(cust && cust.classList.contains('active')) renderShops();
});

const savedServices = localStorage.getItem('barberServices');
if (savedServices) {
  S.services = JSON.parse(savedServices);
}

function go(id){
  const cur=document.querySelector('.screen.active');
  if(cur)S.prev=cur.id;
  document.querySelectorAll('.screen')
    .forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='s-cust'){
    if(S.role !== 'barber') loadPublishedShop(); 
    renderShops();
    renderMyQ();
    updateUserAvatar();
  }
  if(id==='s-barb'){
    renderBQ();
    renderSvcs();
    renderAnalytics();
  }
  if(id==='s-prof')
    renderProfile();

  if(id==='s-support')
    renderSupport();
}

async function loadBarberQueue(shopName) {
  if (!shopName) {
    console.error("Shop name is missing.");
    toast("⚠️", "No shop is assigned to this barber.");
    return;
  }
  try {
    const response = await fetch("https://barber-queue-backend-9z52.onrender.com/api/queue?shop_name=" + encodeURIComponent(shopName));
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Could not load queue");
    }
    S.bq = result.queue.map((q, index) => ({
      id: q.id,
      tok: q.token,
      name: q.name,
      svc: q.service,
      dur: q.duration,
      st:
        q.status === "serving" || q.status === "cur"
          ? "cur"
          : index === 1
            ? "nxt"
            : "wait",
      eta: 0
    }));
    renderBQ();
    syncShopStats();
  } catch (error) {
    console.error("Queue loading error:", error);
    toast("⚠️", error.message || "Could not load the queue");
  }
}

function demoAs(r) {
  S.role = r;
  if (r === "customer") {
    go("s-cust");
    return;
  }
  go("s-barb");
  if (S.barber.shopName) {
    loadBarberQueue(S.barber.shopName);
  } else {
    console.warn("The barber has no shop assigned yet.");
    toast("⚠️", "Please select or assign a shop to this barber.");
  }
}

function openProfile(){
  go('s-prof');
}

function showEl(id){
  document.getElementById(id).style.display='block';
}

function hideEl(id){
  document.getElementById(id).style.display='none';
}

function openModal(id){
  document.getElementById(id).classList.add('open');
}

function closeModal(id){
  document.getElementById(id).classList.remove('open');
}

let tTimer;

function toast(ico,msg){
  document.getElementById('t-ico').textContent=ico;
  document.getElementById('t-msg').textContent=msg;
  const el=document.getElementById('toast');
  el.classList.add('show');
  clearTimeout(tTimer);
  tTimer=setTimeout(
    ()=>el.classList.remove('show'),
    3000
  );
}

let generatedOTP = "";
let componentsReady = Promise.resolve();

function sendOtp() {
  const phone = document.getElementById("ph").value.trim();
  const nameVal = document.getElementById("pname").value.trim();
  const locEl = document.getElementById("ploc");
  const locVal = locEl ? locEl.value.trim() : '';
  if (!/^\d{10}$/.test(phone)) {
    toast("⚠️","Please enter a valid 10-digit phone number");
    return;
  }
  S.user.phone = '+91 ' + phone;
  S.user.name = nameVal || 'Customer';
  S.user.location = locVal || 'Not set';
  generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
  console.log("Generated OTP:", generatedOTP);
  document.getElementById("ph-show").textContent ="+91 " + phone;
  document.getElementById("otp-message").innerHTML ="Use code <strong>" + generatedOTP + "</strong> to continue";
  document.getElementById("auth-p1").style.display = "none";
  document.getElementById("auth-p2").style.display = "block";
  document.getElementById("o0").value = "";
  document.getElementById("o1").value = "";
  document.getElementById("o2").value = "";
  document.getElementById("o3").value = "";
  document.getElementById("o0").focus();
}

async function verifyOtp() {
  const fields = [
    document.getElementById("o0"),
    document.getElementById("o1"),
    document.getElementById("o2"),
    document.getElementById("o3")
    ];
    if (fields.some(el => !el)) {
        toast("⚠️", "OTP fields are missing");
        return;
    }
    const enteredOTP = fields.map(el => el.value.trim()).join("");
    if (!generatedOTP || enteredOTP !== generatedOTP) {
        toast("⚠️", "Invalid OTP — please try again");
        fields.forEach(el => el.value = "");
        fields[0].focus();
        return;
    }
    try {
        await componentsReady;
    } catch (error) {
        console.error(error);
        toast("⚠️", "Please wait for the app to load");
        return;
    }
    const phone = document.getElementById("ph").value.trim();
    const name = document.getElementById("pname").value.trim();
    if (!loadCustomer(phone, name)) {
        toast("⚠️", "Could not load customer profile");
        return;
    }
    generatedOTP = "";
    go("s-role");
    toast("Profile loaded successfully");
}

function otpFwd(input, index) {
  input.value = input.value.replace(/\D/g, "");
  if (input.value.length === 1 && index < 3) {
    document.getElementById("o" + (index + 1)).focus();
  }
}

function otpBack(input, index, event) {
  if (event.key === "Backspace" && input.value === "" && index > 0) {
    document.getElementById("o" + (index - 1)).focus();
        }
    }

function renderShops(){
  document.getElementById('shop-list').innerHTML=
  S.shops.map(s=>`
  <div class="shop-card" onclick="openShop(${s.id})">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
    <div style="width:48px;height:48px;border-radius:12px;background:${s.clr}20;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;overflow:hidden;">
    ${s.photo ? `<img src="${s.photo}" alt="${s.name}" style="width:100%;height:100%;object-fit:cover;">` : s.ico}
    </div>
    <div style="flex:1;min-width:0">
    <div style="font-weight:700;font-size:15px;font-family:'Syne',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
    <div style="font-size:12px;color:var(--txt2)">${s.addr}</div>
    </div>
    <span class="tag ${s.open?'tgreen':'tred'}"style="flex-shrink:0">${s.open?'Open':'Closed'}</span>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
    <span class="tag tgray">⭐ ${s.rating} (${s.rev})</span>
    <span class="tag tgray">🎫 Queue: ${s.q}</span>
    <span class="tag tgray">⏱ ~${s.wait} min</span>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:13px;color:var(--txt2)">Serving:<strong style="color:var(--gold)">#${s.cur}</strong></div>
        <div style="font-size:13px;color:var(--gold);font-weight:500">View & Join →</div>
    </div>
  </div>
  `).join('');
}

function openShop(id){
  S.selectedShop=id;
  const s=S.shops[id];
  document.getElementById('sh-title').textContent=s.name;
  const inQ=S.inQueue&&S.myShopId===id;
  document.getElementById('sh-body').innerHTML=`
    <div style="background:${s.clr}12;border:1px solid ${s.clr}30;border-radius:var(--rl);padding:20px;margin-bottom:18px;text-align:center">
      ${s.photo
  ? `<img src="${s.photo}" alt="${s.name}" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px;margin-bottom:12px">`
  : `<div style="font-size:52px;margin-bottom:8px">${s.ico}</div>`}
      <div style="font-size:24px;font-weight:800;font-family:'Syne',sans-serif;margin-bottom:6px">${s.name}</div>
      <div style="color:var(--txt2);font-size:13px;margin-bottom:10px">${s.addr} · ${s.owner}</div>
      <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">
        <span class="tag"style="background:rgba(0,0,0,.3);border:1px solid ${s.clr}40;color:${s.clr}">⭐ ${s.rating} · ${s.rev} reviews</span>
        <span class="tag ${s.open?'tgreen':'tred'}">${s.open?'● Open':'● Closed'}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px">
      <div class="stat" style="text-align:center;padding:14px 8px">
        <div class="stat-n" style="color:var(--gold);font-size:26px">#${s.cur}</div>
        <div class="stat-l">Serving Now</div>
      </div>
      <div class="stat" style="text-align:center;padding:14px 8px">
        <div class="stat-n" style="font-size:26px">${s.q}</div>
        <div class="stat-l">In Queue</div>
      </div>
      <div class="stat" style="text-align:center;padding:14px 8px">
        <div class="stat-n" style="color:var(--cyan);font-size:26px">${s.wait}</div>
        <div class="stat-l">Min Wait</div>
      </div>
    </div>
    <div style="font-size:17px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px">Services Offered</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">
      ${s.svcs.map(si=>{
        const sv=S.services[si];
        return`
          <div class="card card-p"style="display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">${sv.ico}</span>
            <div>
              <div style="font-weight:500;font-size:14px">${sv.name}</div>
              <div style="color:var(--gold);font-weight:600;font-size:14px">₹${sv.price}</div>
              <div style="color:var(--txt2);font-size:12px">~${sv.dur} min</div>
            </div>
          </div>
        `
      }).join('')}
    </div>
    <div style="font-size:17px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px">Live Queue Preview</div>
    ${S.bq.slice(0,5).map(q=>`
      <div class="qi ${q.st==='cur'?'cur':q.st==='nxt'?'nxt':''}">
        <div class="qi-num"style="background:${q.st==='cur'?'var(--gdim)':q.st==='nxt'?'var(--cdim)':'var(--s3)'};color:${q.st==='cur'?'var(--gold)':q.st==='nxt'?'var(--cyan)':'var(--txt2)'}">${q.tok}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500">${q.st==='cur'?q.name:'Customer '+q.tok}</div>
          <div style="font-size:12px;color:var(--txt2)">${q.svc}</div>
        </div>
        <div>
          ${
            q.st==='cur'
            ?'<span class="tag tg pulse">Now</span>'
            :q.st==='nxt'
            ?'<span class="tag tgreen">Next</span>'
            :'<span style="font-size:12px;color:var(--txt2)">~'+q.eta+' min</span>'
          }
        </div>
      </div>
    `).join('')}
    ${inQ?`
      <div style="background:var(--gdim);border:2px solid var(--gold);border-radius:var(--rl);padding:20px;margin-top:16px;text-align:center">
        <div style="font-size:12px;color:var(--txt2);margin-bottom:4px">You're in queue!</div>
        <div style="font-size:60px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold);line-height:1">#${S.myTok}</div>
        <div style="font-size:13px;color:var(--txt2);margin-top:4px">${S.mySvc}</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
          <button class="btn btn-red btn-sm" onclick="leaveQ()">Leave Queue</button>
          <button class="btn btn-outline btn-sm"onclick="openModal('m-rate');document.getElementById('rate-shop-name').textContent='${s.name}'">Rate Shop ⭐</button>
        </div>
      </div>
    `:`
      <button class="btn ${s.open?'btn-gold':'btn-outline'} btn-full" style="height:52px;font-size:16px;margin-top:16px" onclick="${s.open?"openJoinModal()":'toast(\"⛔\",\"This shop is currently closed\")'}">${s.open?'Join Queue →':'Shop is Closed'}</button>
    `}
    <div style="height:24px"></div>
  `;
  go('s-shop');
  if(s.open)
    buildJoinModal();
}

function buildJoinModal(){
  const s=S.shops[S.selectedShop];
  S.selectedSvc=0;
  document.getElementById('m-svcs').innerHTML=
  s.svcs.map((si,i)=>{
    const sv=S.services[si];
    return`
      <div class="svc-chip ${i===0?'sel':''}"onclick="pickSvc(${i})">
        <div style="font-size:24px">${sv.ico}</div>
        <div style="font-size:13px;font-weight:500;margin-top:4px">${sv.name}</div>
        <div class="svc-price">₹${sv.price}</div>
      </div>
    `
  }).join('');
  updateJoinInfo();
}

function pickSvc(i){
  S.selectedSvc=i;
  document.querySelectorAll('.svc-chip').forEach(
    (c,idx)=>c.classList.toggle('sel',idx===i)
  );
  updateJoinInfo();
}

function updateJoinInfo(){
  const s=S.shops[S.selectedShop];
  document.getElementById('m-tok').textContent='#'+(s.q+1);
  document.getElementById('m-wait').textContent='~'+s.wait+' min';
}

function openJoinModal(){
  buildJoinModal();
  openModal('m-join');
}

function confirmJoin() {
    const s = S.shops[S.selectedShop];
    if (!s) {
        toast('⚠️', 'Shop information not found');
        return;
    }
    const svcIdx = s.svcs[S.selectedSvc];
    const sv = S.services[svcIdx];
    if (!sv) {
        toast('⚠️', 'Service information not found');
        return;
    }
    S.pendingJoin = {
        shopId: S.selectedShop,
        svcName: sv.name,
        price: sv.price,
        tok: s.q + 1
    };
    closeModal('m-join');
    openPayModal();
}

async function updateUpiQr() {
  const p = S.pendingJoin;
  const s = p && S.shops[p.shopId];
  S.shopPay = null;
  const opt = document.getElementById('pay-upi_qr');
  if (opt) opt.style.display = 'none';
  if (!s) return;
  try {
    const r = await fetch(BQ_BASE + '/api/shops');
    const j = await r.json();
    const hit = (j.shops || []).find(x => x.name.toLowerCase() === s.name.toLowerCase());
    if (hit && hit.upi_qr_url) {
      S.shopPay = hit;
      if (opt) opt.style.display = 'flex';
    }
  } catch (e) { console.warn('Could not load shop UPI details:', e); }
}

function openPayModal() {
  const p = S.pendingJoin;
    if (!p) {
        toast('⚠️', 'No pending queue request');
        return;
    }
    const amountEl = document.getElementById('pay-amt');
    const serviceEl = document.getElementById('pay-svc');
    if (amountEl) amountEl.textContent = '₹' + p.price;
    if (serviceEl) serviceEl.textContent = p.svcName + ' · Token #' + p.tok;
    updateUpiQr();
    const payBtnLabel = document.getElementById('pay-btn-label');
    if (payBtnLabel) payBtnLabel.textContent = 'Pay & Join Queue';
    selectPayMethod('online');
    openModal('m-pay');
}

function selectPayMethod(method) {
    S.payMethod = method;
    document.querySelectorAll('.pay-opt').forEach(el => el.classList.remove('sel'));
    const selected = document.getElementById('pay-' + method);
    if (selected) selected.classList.add('sel');
    const pay = S.shopPay;
    const qrSection = document.getElementById('upi-qr-section');
    if (qrSection) {
        const show = method === 'upi_qr' && pay && pay.upi_qr_url;
        qrSection.style.display = show ? 'block' : 'none';
        if (show) {
            document.getElementById('upi-qr-img').src = BQ_BASE + pay.upi_qr_url;
            document.getElementById('upi-id-text').textContent = pay.upi_id ? 'UPI ID: ' + pay.upi_id : '';
        }
    }
    const button = document.getElementById('pay-btn-label');
    if (!button) return;
    button.textContent =method === 'shop'   ? 'Confirm & Join (Pay at Shop)' :method === 'upi_qr' ? "I've Paid — Join Queue" :'Pay & Join Queue';
}

async function processPayment() {
    const p = S.pendingJoin;
    if (!p) { toast('⚠️', 'No pending queue request'); return; }
    const s = S.shops[p.shopId];
    if (!s) { toast('⚠️', 'Shop information not found'); return; }
      if (S.payMethod === 'upi_qr') {
        finalizeJoin(p, s, false, { payment_method: 'upi_qr' });
        return;
      }
      if (S.payMethod !== 'online') {
        finalizeJoin(p, s, false, { payment_method: 'shop' });
        return;
      }
    const button = document.getElementById('pay-btn-label');
    if (button) button.innerHTML = '<span class="spinner"></span> Creating order…';
    try {
        const orderRes = await fetch('https://barber-queue-backend-9z52.onrender.com/api/payments/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: p.price })
        });
        if (!orderRes.ok) throw new Error('Could not create order');
        const order = await orderRes.json();
        const options = {
            key: order.key_id,
            amount: order.amount,
            currency: order.currency,
            order_id: order.order_id,
            name: 'Glowora', // was 'Barber-Q'
            description: p.svcName + ' · Token #' + p.tok,
            handler: async function (response) {
                const verifyRes = await fetch('https://barber-queue-backend-9z52.onrender.com/api/payments/verify', {
                    method: 'POST',headers: { 'Content-Type': 'application/json' },body: JSON.stringify({
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature
                })
              });
                const result = await verifyRes.json();
                if (result.verified) {
                  finalizeJoin(p, s, true, {
                    payment_method: 'razorpay',
                    razorpay_payment_id: response.razorpay_payment_id
                  });
                } else {
                    toast('⚠️', 'Payment verification failed');
                    if (button) button.textContent = 'Pay & Join Queue';
                }
            },
            modal: {
                ondismiss: function () {
                    if (button) button.textContent = 'Pay & Join Queue';
                    toast('ℹ️', 'Payment cancelled');
                }
            },
            theme: { color: '#f5c842' },
            config: {
              display: {
                blocks: {
                  upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] }
                },
                sequence: ['block.upi'],
                preferences: { show_default_blocks: true }   
              }
            }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (err) {
        console.error(err);
        toast('⚠️', 'Could not start payment — please try again');
        if (button) button.textContent = 'Pay & Join Queue';
    }
}

async function finalizeJoin(p, s, paidOnline, extra = {}) {
  if (!s || !p) {
    toast("⚠️", "Booking information is missing");
    return;
  }
  try {
    const response = await fetch(
      "https://barber-queue-backend-9z52.onrender.com/api/queue",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          shop_name: s.name,
          service_name: p.svcName,
          customer_name: S.user.name || "Demo Customer",
          shop_address: s.addr,
          shop_owner: s.owner,
          service_price: p.price,
          service_duration: (S.services.find(x => x.name === p.svcName) || {}).dur,
          ...extra
        })
      }
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Booking could not be saved");
    }
    const booking = result.booking;
    p.tok = booking.token;
    S.myQueueEntryId = booking.id;
    S.inQueue = true;
    S.myTok = booking.token;
    S.mySvc = p.svcName;
    S.myShopId = p.shopId;
    s.q = (s.q || 0) + 1;
    if (!Array.isArray(S.payments)) S.payments = [];
    if (!Array.isArray(S.paymentMethods)) S.paymentMethods = [];
    S.payments.unshift({
      id: "PAY" + Date.now().toString().slice(-8),
      shop: s.name,
      shopId: p.shopId,
      token: booking.token,
      svc: p.svcName,
      amount: p.price,
      method: paidOnline ? "Online" : (extra.payment_method === 'upi_qr' ? "UPI QR" : "Pay at Shop"),
      status: paidOnline ? "Paid" : "Pending",
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short"
      }),
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    });
    if (paidOnline) {
      if (typeof S.onlineCollected !== "number") {
        S.onlineCollected = 0;
      }
      S.onlineCollected += p.price;
      if (!S.paymentMethods.includes("Online Payment")) {
        S.paymentMethods.push("Online Payment");
      }
    } else if (!S.paymentMethods.includes("Pay at Shop")) {
      S.paymentMethods.push("Pay at Shop");
    }
    closeModal("m-pay");
    const tokenEl = document.getElementById("ok-tok");
    const subEl = document.getElementById("ok-sub");
    const serviceEl = document.getElementById("ok-svc");
    const note = document.getElementById("ok-pay-note");
    if (tokenEl) tokenEl.textContent = booking.token;
    if (subEl) {
      subEl.textContent =
        "Token #" + booking.token + " · ~" + s.wait + " min wait";
    }
    if (serviceEl) serviceEl.textContent = p.svcName;
    if (note) {
      note.textContent = paidOnline
      ? "✅ Payment of ₹" + p.price + " received"
      : extra.payment_method === 'upi_qr'
      ? "📲 UPI payment sent — the barber will confirm it"
      : "💵 Pay ₹" + p.price + " at the shop";
    }
    openModal("m-ok");
    toast(
      "✅",paidOnline ? "Payment successful and booking saved!" : "Added to queue — pay at shop"
    );
  } catch (error) {
    console.error("Booking error:", error);
    toast("⚠️", error.message || "Could not save booking");
  }
}

function renderMyQ(){
  const el=document.getElementById('my-q');
  if(!el)return;
  if(!S.inQueue){
    el.innerHTML=`
      <div style="text-align:center;padding:60px 20px">
        <div style="font-size:52px;margin-bottom:12px">🎫</div>
        <div style="font-size:20px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:8px">No Active Queue</div>
        <p style="color:var(--txt2);font-size:14px;margin-bottom:20px">Browse nearby shops and join a queue!</p>
        <button class="btn btn-gold" onclick="cTab('home',null)">Find Barbers →</button>
      </div>
    `;
    return;
  }
  const s=S.shops[S.myShopId];
  const ahead=Math.max(0,S.myTok-s.cur);
  const prog=Math.max(
    5,
    Math.round(100-ahead*15)
  );
  el.innerHTML=`
    ${ahead<=2?`
      <div class="notif">
        <span style="font-size:20px">🔔</span>
        <div>
          <div style="font-weight:500;font-size:14px">Almost your turn!</div>
          <div style="font-size:12px;color:var(--txt2)">${ahead} customer${ahead!==1?'s':''} ahead of you</div>
        </div>
      </div>
    `:''}
    <div style="background:var(--gdim);border:2px solid var(--gold);border-radius:var(--rxl);padding:28px;text-align:center;margin-bottom:18px">
      <div style="font-size:12px;color:var(--txt2);margin-bottom:6px">${s.name}</div>
      <div style="font-size:13px;color:var(--txt2);margin-bottom:4px">Your Token</div>
      <div style="font-size:80px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold);line-height:1">#${S.myTok}</div>
      <div style="font-size:14px;color:var(--txt2);margin-top:6px">${S.mySvc}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
      <div class="stat" style="text-align:center">
        <div class="stat-n" style="color:var(--gold)">#${s.cur}</div>
        <div class="stat-l">Serving Now</div>
      </div>
      <div class="stat" style="text-align:center">
        <div class="stat-n" style="color:var(--cyan)">${ahead}</div>
        <div class="stat-l">Ahead of You</div>
      </div>
    </div>
    <div class="stat"  style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="color:var(--txt2);font-size:14px">Estimated wait</span>
        <span style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold)">~${s.wait} min</span>
      </div>
      <div class="pbar">
        </div>
          <div class="pfill"style="width:${prog}%"></div>
        </div>
      <div style="font-size:12px;color:var(--txt2);margin-top:6px;text-align:right">Progress to your turn</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-red" style="flex:1" onclick="leaveQ();cTab('queue',null)">Leave Queue</button>
      <button class="btn btn-outline"style="flex:1"onclick="openModal('m-rate');document.getElementById('rate-shop-name').textContent='${s.name}'">Rate Shop ⭐</button>
    </div>
    <div style="height:20px"></div>
  `;
}

function cTab(name,el){
  document.getElementById('cust-home').style.display=name==='home'?'block':'none';
  document.getElementById('cust-queue').style.display=name==='queue'?'block':'none';
  if(el){
    document.querySelectorAll('#c-tabs .tab').forEach(t=>t.classList.remove('on'));
    el.classList.add('on');
  }
  if(name==='queue')
    renderMyQ();
}

async function cqFetchQueue(shopName){
  const res = await fetch("https://barber-queue-backend-9z52.onrender.com/api/queue?shop_name=" + encodeURIComponent(shopName));
  const result = await res.json();
  if(!res.ok || !result.success){
    throw new Error(result.error || "Could not load queue");
  }
  return result.queue.map(q => ({
    id:     q.id,
    tok:    q.token,
    name:   q.name,
    svc:    q.service,
    dur:    Number(q.duration) || 0,
    status: q.status
  }));
}

function cqApply(list){
  S.myQueueList = list;
  const idx = list.findIndex(q => String(q.id) === String(S.myQueueEntryId));
  if(idx === -1){
    S._cqMiss = (S._cqMiss || 0) + 1;
    if(S._cqMiss >= 2) completeMyVisit();
    return;
  }
  S._cqMiss = 0;
  const head = list[0];
  if(S._cqHeadId !== head.id){
    S._cqHeadId    = head.id;
    S._cqHeadSince = Date.now();
  }
}

function cqCalc(){
  const list = S.myQueueList;
  if(!Array.isArray(list) || !list.length) return null;
  const idx = list.findIndex(q => String(q.id) === String(S.myQueueEntryId));
  if(idx === -1) return null;
  const elapsedMin = S._cqHeadSince ? (Date.now() - S._cqHeadSince) / 60000 : 0;
  const headLeft   = Math.max(0, Math.ceil(list[0].dur - elapsedMin));
  let wait = 0;
  for(let j = 0; j < idx; j++){
    wait += j === 0 ? headLeft : list[j].dur;
  }
  const mine      = list[idx];
  const inService = idx === 0;
  const svc       = inService ? headLeft : mine.dur;
  return {
    ahead: idx,
    wait,                       // minutes until my turn starts
    svc,                        // minutes my service takes (or has left)
    done: wait + svc,           // minutes until I am finished
    dur: mine.dur,
    serving: list[0].tok,
    inService
  };
}

function completeMyVisit(){
  const shop = S.shops[S.myShopId];
  const visit = {
    token:   S.myTok,
    shopId:  S.myShopId,
    shop:    shop ? shop.name : 'Barber Shop',
    service: S.mySvc,
    date: new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }),
    createdAt: new Date().toISOString(),
    timestamp: Date.now()
  };
  S.queueHistory.unshift(visit);
  S.lastCompletedVisit = visit;
  const payment = S.payments.find(p =>
    p.token === S.myTok && p.shopId === S.myShopId && p.status === 'Pending'
  );
  if(payment) payment.status = 'Paid';
  S.inQueue = false;
  S.myTok = '';
  S.mySvc = '';
  S.myQueueEntryId = null;
  S.myQueueList = null;
  S._cqMiss = 0;
  S._cqHeadId = null;
  toast('Your service is complete! Your visit has been added to history.');
  renderMyQ();
}

let cqBusy = false;

async function pollCustomer(){
  if(cqBusy || S.role !== 'customer') return;
  cqBusy = true;
  try{
    const bshop = S.shops.find(s => s.isBarberProfile);
    const mine  = S.inQueue ? S.shops[S.myShopId] : null;
    if(bshop){
      try{
        const list = await cqFetchQueue(bshop.name);
        bshop.q    = list.length;
        bshop.cur  = list[0] ? list[0].tok : 0;
        bshop.wait = list.reduce((t, q) => t + q.dur, 0);
        if(mine === bshop && S.myQueueEntryId) cqApply(list);
      }catch(e){
        console.warn('Shop queue refresh failed:', e.message);
      }
    }
    if(mine && mine !== bshop && S.myQueueEntryId){
      try{
        cqApply(await cqFetchQueue(mine.name));
      }catch(e){
        console.warn('My queue refresh failed:', e.message);
      }
    }
    const cust = document.getElementById('s-cust');
    if(cust && cust.classList.contains('active')){
      renderShops();
      renderMyQ();
    }
  }finally{
    cqBusy = false;
  }
}

setInterval(pollCustomer, 5000);
setInterval(() => {
  const el = document.getElementById('my-q');
  if(S.inQueue && el && el.offsetParent !== null) renderMyQ();
}, 15000);

function renderMyQ(){
  const el = document.getElementById('my-q');
  if(!el) return;
  if(!S.inQueue){
    el.innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <div style="font-size:52px;margin-bottom:12px">🎫</div>
        <div style="font-size:20px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:8px">No Active Queue</div>
        <p style="color:var(--txt2);font-size:14px;margin-bottom:20px">Browse nearby shops and join a queue!</p>
        <button class="btn btn-gold" onclick="cTab('home',null)">Find Barbers →</button>
      </div>
    `;
    return;
  }
  const s = S.shops[S.myShopId];
  if(!s){
    S.inQueue = false;
    return renderMyQ();
  }
  const info = cqCalc();
  let ahead, serving, headline, detail, prog, almost;
  if(info){
    ahead   = info.ahead;
    serving = info.serving;
    headline = info.inService ? '~' + info.svc + ' min' : '~' + info.done + ' min';
    detail = info.inService ? 'Your service is in progress' : 'Your turn starts in ~' + info.wait + ' min · service ~' + info.svc + ' min';
    prog = info.inService ? Math.max(5, Math.min(100, Math.round(100 - (info.svc / (info.dur || 1)) * 100))) : Math.max(5, Math.round(100 - ahead * 15));
    almost = info.inService ? 'Your service is in progress' : ahead + ' customer' + (ahead !== 1 ? 's' : '') + ' ahead of you';
  }else{
    ahead    = Math.max(0, Number(S.myTok) - s.cur) || 0;
    serving  = s.cur;
    headline = 'Checking…';
    detail   = 'Getting your live position';
    prog     = 5;
    almost   = '';
  }
  el.innerHTML = `

    ${info && (info.inService || ahead <= 2) ? `

      <div class="notif">

        <span style="font-size:20px">🔔</span>

        <div>

          <div style="font-weight:500;font-size:14px">
            ${info.inService ? "It's your turn!" : 'Almost your turn!'}
          </div>

          <div style="font-size:12px;color:var(--txt2)">
            ${almost}
          </div>

        </div>

      </div>

    ` : ''}


    <div style="background:var(--gdim);border:2px solid var(--gold);border-radius:var(--rxl);padding:28px;text-align:center;margin-bottom:18px">

      <div style="font-size:12px;color:var(--txt2);margin-bottom:6px">
        ${s.name}
      </div>

      <div style="font-size:13px;color:var(--txt2);margin-bottom:4px">
        Your Token
      </div>

      <div style="font-size:80px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold);line-height:1">
        #${S.myTok}
      </div>

      <div style="font-size:14px;color:var(--txt2);margin-top:6px">
        ${S.mySvc}
      </div>

    </div>


    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">

      <div class="stat" style="text-align:center">
        <div class="stat-n" style="color:var(--gold)">#${serving}</div>
        <div class="stat-l">Serving Now</div>
      </div>

      <div class="stat" style="text-align:center">
        <div class="stat-n" style="color:var(--cyan)">${ahead}</div>
        <div class="stat-l">Ahead of You</div>
      </div>

    </div>


    <div class="stat" style="margin-bottom:16px">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">

        <span style="color:var(--txt2);font-size:14px">
          Time left
        </span>

        <span style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold)">
          ${headline}
        </span>

      </div>

      <div class="pbar">
        <div class="pfill" style="width:${prog}%"></div>
      </div>

      <div style="font-size:12px;color:var(--txt2);margin-top:6px;text-align:right">
        ${detail}
      </div>

    </div>


    <div style="display:flex;gap:10px">

      <button class="btn btn-red" style="flex:1"
      onclick="leaveQ();cTab('queue',null)">
        Leave Queue
      </button>

      <button class="btn btn-outline" style="flex:1"
      onclick="openModal('m-rate');document.getElementById('rate-shop-name').textContent='${s.name}'">
        Rate Shop ⭐
      </button>

    </div>

    <div style="height:20px"></div>
  `;
}
function saveBarberProfileLocal(){
  try{
    const { photo, ...profile } = S.barber;
    localStorage.setItem('barberProfile', JSON.stringify(profile));

    if(photo) localStorage.setItem('barberProfilePhoto', photo);
    else      localStorage.removeItem('barberProfilePhoto');
  }catch(e){
    console.warn('Could not save barber profile:', e);
  }
}

function restoreBarberProfile(){
  if(S.barber.shopName) return;          // already loaded in this tab

  try{
    const raw = localStorage.getItem('barberProfile');
    if(!raw) return;

    Object.assign(S.barber, JSON.parse(raw));
    S.barber.photo = localStorage.getItem('barberProfilePhoto') || '';

    syncBarberToCustomerShop();
  }catch(e){
    console.warn('Could not restore barber profile:', e);
  }
}

function demoAs(r){
  S.role = r;

  if(r === 'customer'){
    go('s-cust');
    return;
  }

  restoreBarberProfile();
  go('s-barb');

  if(S.barber.shopName){
    loadBarberQueue(S.barber.shopName);
  }else{
    console.warn('The barber has no shop assigned yet.');
    toast('⚠️', 'Please open Profile → Edit Profile and add your shop details.');
  }
}

// BARBER 
function renderBQ(){

  document.getElementById('b-inq').textContent=
    S.bq.length;

  document.getElementById('b-qlist').innerHTML=

  S.bq.map((q,i)=>`

    <div class="qi ${q.st}"
    style="animation-delay:${i*.04}s">

      <div class="qi-num"
      style="background:${q.st==='cur'?'var(--gdim)':q.st==='nxt'?'var(--cdim)':'var(--s3)'};color:${q.st==='cur'?'var(--gold)':q.st==='nxt'?'var(--cyan)':'var(--txt2)'}">

        ${q.tok}

      </div>

      <div style="flex:1;min-width:0">

        <div style="font-weight:500;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${q.name}
        </div>

        <div style="font-size:12px;color:var(--txt2)">
          ${q.svc} · ${q.dur} min
        </div>

      </div>

      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">

        ${
          q.st==='cur'
          ?
          `<span class="tag tg pulse">● Now Serving</span>

          <div style="display:flex;gap:6px;margin-top:4px">

            <button class="btn btn-green btn-sm"
            onclick="doneToken()">
              Done ✓
            </button>

            <button class="btn btn-outline btn-sm"
            onclick="skipToken()">
              Skip ⏭
            </button>

          </div>`

          :

          q.st==='nxt'
          ?
          `<span class="tag tgreen">
            Next Up
          </span>`

          :

          `<span style="font-size:12px;color:var(--txt2)">
            ~${q.eta} min
          </span>`
        }

      </div>

    </div>

  `).join('')+

  (
    S.bq.length===0
    ?
    `<div style="text-align:center;padding:40px;color:var(--txt2)">

      <div style="font-size:40px;margin-bottom:10px">
        ✅
      </div>

      <div style="font-size:16px;font-weight:500">
        Queue is clear!
      </div>

    </div>`
    :
    ''
  );
}
async function doneToken() {
  if (S.bq.length === 0) return;

  const current = S.bq[0];

  if (!current.id) {
    toast("⚠️", "This token has no database ID. Refresh the queue.");
    // await loadBarberQueue(S.barber.shopName || "Royal Cuts");
    await loadBarberQueue(S.barber.shopName);
    return;
  }

  try {
    const response = await fetch(
      `https://barber-queue-backend-9z52.onrender.com/api/queue/${current.id}/complete`,
      { method: "POST" }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Could not complete token");
    }
    await loadBarberQueue(S.barber.shopName);

    S.doneCnt++;

    const service = S.services.find(s => s.name === current.svc);
    if (service) S.earn += service.price;

    const doneEl = document.getElementById("b-done");
    const earnEl = document.getElementById("b-earn");

    if (doneEl) doneEl.textContent = S.doneCnt;
    if (earnEl) {
      earnEl.textContent = "₹" + S.earn.toLocaleString("en-IN");
    }

    toast("✅", "Token completed!");

  } catch (error) {
    console.error("Complete token error:", error);
    toast("⚠️", error.message || "Could not complete token");
  }
}

async function skipToken() {
  if (!S.bq.length) return;

  const current = S.bq[0];

  if (!current.id) {
    toast("⚠️", "Refresh the queue before skipping this token");
    // await loadBarberQueue(S.barber.shopName || "Royal Cuts");
    await loadBarberQueue(S.barber.shopName);
    return;
  }

  try {
    const response = await fetch(
      `https://barber-queue-backend-9z52.onrender.com/api/queue/${current.id}/skip`,
      { method: "POST" }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Could not skip token");
    }

    await loadBarberQueue(S.barber.shopName);
    toast("⏭️", "Token skipped");

  } catch (error) {
    console.error("Skip token error:", error);
    toast("⚠️", error.message || "Could not skip token");
  }
}

let nextTok = 1;

function openWalkinModal() {

  const nameInput = document.getElementById('walkin-name');
  const serviceSelect = document.getElementById('walkin-service');

  if (!nameInput || !serviceSelect) {
    console.error('Walk-in form elements not found');
    return;
  }

  nameInput.value = '';

  serviceSelect.innerHTML = '';

  S.services.forEach(service => {

    const option = document.createElement('option');

    option.value = service.id;

    option.textContent =
      `${service.name} — ₹${service.price} (${service.dur} min)`;

    serviceSelect.appendChild(option);

  });

  openModal('m-walkin');

  setTimeout(() => {
    nameInput.focus();
  }, 100);
}
async function addWalkinCustomer() {
  const nameInput = document.getElementById("walkin-name");
  const serviceSelect = document.getElementById("walkin-service");

  const name = nameInput.value.trim();
  const serviceId = Number(serviceSelect.value);
  const service = S.services.find(s => s.id === serviceId);

  if (!name) {
    toast("⚠️", "Please enter customer name");
    nameInput.focus();
    return;
  }

  if (!service) {
    toast("⚠️", "Please select a service");
    return;
  }
  if (!S.barber.shopName) {
      toast("⚠️", "This barber has no assigned shop.");
      return;
  }
  try {
    const response = await fetch("https://barber-queue-backend-9z52.onrender.com/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: S.barber.shopName,
        service_name: service.name,
        customer_name: name
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Could not add walk-in customer");
    }

    closeModal("m-walkin");
    await loadBarberQueue(S.barber.shopName);

    nameInput.value = "";
    toast("✅", `${name} added to the queue`);

  } catch (error) {
    console.error("Walk-in error:", error);
    toast("⚠️", error.message || "Could not save walk-in customer");
  }
}

function calculateWalkinETA() {

  if (S.bq.length === 0) {
    return 0;
  }

  return S.bq.reduce(
    (total, customer) => total + Number(customer.dur || 0),
    0
  );
}

function toggleShop(){

  S.shopOpen=!S.shopOpen;
  syncShopStats();

  const el=
    document.getElementById('shop-status');

  el.textContent=
    S.shopOpen?'● Open':'● Closed';

  el.className=
    'tag '+(
      S.shopOpen
      ?
      'tgreen pulse'
      :
      'tred'
    );

  toast(
    S.shopOpen?'✅':'⛔',
    S.shopOpen
    ?
    'Shop is now Open for bookings'
    :
    'Shop is now Closed'
  );
}


function renderSvcs(){

  const el=
    document.getElementById('b-svclist');

  if(!el)return;

  el.innerHTML=

  S.services.map((s,i)=>`

    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);margin-bottom:8px">

      <span style="font-size:28px">
        ${s.ico}
      </span>

      <div style="flex:1">

        <div style="font-weight:500;font-size:14px">
          ${s.name}
        </div>

        <div style="font-size:12px;color:var(--txt2)">
          ~${s.dur} min
        </div>

      </div>

      <div style="color:var(--gold);font-weight:700;font-size:18px;font-family:'Syne',sans-serif;margin-right:8px">
        ₹${s.price}
      </div>

      <button class="btn btn-red btn-sm"
      onclick="delSvc(${i})">
        ✕
      </button>

    </div>

  `).join('');
}

function addSvc(){

  const nameEl = document.getElementById('sn');
  const priceEl = document.getElementById('sp');
  const durationEl = document.getElementById('sd');
  const emojiEl = document.getElementById('svc-ico');

  if(!nameEl || !priceEl || !durationEl || !emojiEl){
    console.error('Add Service fields are missing.');
    toast('⚠️','Add Service form is not loaded correctly');
    return;
  }

  const n = nameEl.value.trim();
  const p = parseInt(priceEl.value);
  const d = parseInt(durationEl.value);
  const e = emojiEl.value.trim() || '💇';
  if(!n){
    toast('⚠️','Please enter service name');
    nameEl.focus();
    return;
  }

  if(isNaN(p) || p < 0){
    toast('⚠️','Please enter a valid price');
    priceEl.focus();
    return;
  }

  if(isNaN(d) || d < 5){
    toast('⚠️','Please enter a valid duration');
    durationEl.focus();
    return;
  }

  const newService = {
    id: Date.now(),
    name: n,
    price: p,
    dur: d,
    ico: e
  };

  S.services.push(newService);
  localStorage.setItem(
    'barberServices',
    JSON.stringify(S.services)
  );
  closeModal('m-svc');
  renderSvcs();
  nameEl.value = '';
  priceEl.value = '';
  durationEl.value = '';
  emojiEl.value = '💇';
  const selectedEmoji = document.getElementById('emoji-selected');
  if(selectedEmoji){
    selectedEmoji.textContent = '💇';
  }
  const picker = document.getElementById('emoji-picker');
  if(picker){
    picker.style.display = 'none';
  }

  toast(
    '✅',
    `Service "${n}" added!`
  );
}


function delSvc(i){

  const n = S.services[i].name;

  S.services.splice(i, 1);

  localStorage.setItem(
    'barberServices',
    JSON.stringify(S.services)
  );

  renderSvcs();

  toast(
    '🗑️',
    `"${n}" removed`
  );
}

const serviceEmojis = [
  '💇','💇‍♂️','💇‍♀️','💈','✂️','🧴','🧔','🪒','👨‍🦰','👨‍🦱','💆','🧖','🧖‍♂️','🧖‍♀️','✨','💅','🎨','🖌️','🌈','💄','👄','💋','🧼','🧽','🌸','🌺','🌹','😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','🥳','🤗','🤭',
  '😴','🤤','😷','👨','👩','🧔','👴','👵','🙍','👰','💅','💇','💇‍♂️','💇‍♀️','✂️',,'🧔','🧴','💆','💆‍♂️','💆‍♀️','🧖','🧖‍♂️','🧖‍♀️','💅','💄','👄','🪞','🛁','🧽','🎨','⭐','🌟','🔥','💫','🌸','🌺','🌹','🌷','🌻','🌼',
  '🍁','🌈','⚡','🔥','💧','🌊','⭐','🌟','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓',
  '🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','❤️','🧡','💛','💚','💙','💜','❣️','💕','💞','💓','💗','💖','💘','💝',
];
function loadEmojiPicker(){
  const grid = document.getElementById('emoji-grid');
  if(!grid) return;
  grid.innerHTML = serviceEmojis.map(emoji => `
    <button
      type="button"
      onclick="selectServiceEmoji('${emoji}')"
      style="
        border:none;
        background:transparent;
        font-size:24px;
        cursor:pointer;
        border-radius:8px;
        padding:6px;
      "
      title="${emoji}">
      ${emoji}
    </button>
  `).join('');
}
function toggleEmojiPicker(){

  const picker = document.getElementById('emoji-picker');

  if(!picker) return;

  if(picker.style.display === 'none' || picker.style.display === ''){
    picker.style.display = 'block';
    loadEmojiPicker();
  }else{
    picker.style.display = 'none';
  }
}
function selectServiceEmoji(emoji){

  const selected = document.getElementById('emoji-selected');
  const hidden = document.getElementById('svc-ico');
  const picker = document.getElementById('emoji-picker');

  if(selected) selected.textContent = emoji;
  if(hidden) hidden.value = emoji;

  if(picker) picker.style.display = 'none';
}

function renderAnalytics() {
  const container = document.getElementById('b-analytics');
  if (!container) return;

  if (!Array.isArray(S.barberVisits)) {
    S.barberVisits = [];
  }

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfWeek = new Date(todayStart);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(
    startOfWeek.getDate() - ((day + 6) % 7)
  );

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const visits = S.barberVisits.filter(v => {
    const date = new Date(v.createdAt);
    return !isNaN(date.getTime());
  });

  const thisWeek = visits.filter(v => {
    const date = new Date(v.createdAt);
    return date >= startOfWeek && date < endOfWeek;
  });

  const todayVisits = visits.filter(v => {
    return new Date(v.createdAt) >= todayStart;
  });

  const revenueThisWeek = thisWeek.reduce(
    (total, v) => total + Number(v.price || 0),
    0
  );
  const onlineToday = (S.payments || []).filter(p => {
    if (p.method !== 'Online' || p.status !== 'Paid') {
      return false;
    }

    const date = new Date(
      p.createdAt || p.timestamp || ''
    );

    return !isNaN(date.getTime()) &&
      date >= todayStart &&
      date <= now;
  }).reduce((total, p) => total + Number(p.amount || 0), 0);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const dailyCounts = days.map((_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);

    return thisWeek.filter(v => {
      const visitDate = new Date(v.createdAt);
      return visitDate.toDateString() === date.toDateString();
    }).length;
  });

  const maxCount = Math.max(1, ...dailyCounts);

  const services = {};

  thisWeek.forEach(v => {
    services[v.service] = (services[v.service] || 0) + 1;
  });

  const topServices = Object.entries(services)
    .sort((a, b) => b[1] - a[1]);

  const ratings = Array.isArray(S.ratings)
    ? S.ratings.map(r => Number(r.rating))
        .filter(r => Number.isFinite(r) && r >= 1 && r <= 5)
    : [];

  const averageRating = ratings.length
    ? (ratings.reduce((sum, rating) => sum + rating, 0) /
       ratings.length).toFixed(1) + ' ★'
    : '—';

  container.innerHTML = `
    <div class="card pad" style="margin-bottom:12px">
      <div class="muted">Total Revenue (This Week)</div>
      <div style="font-size:30px;font-weight:800;color:var(--gold)">
        ₹${revenueThisWeek.toLocaleString('en-IN')}
      </div>
      <div class="muted">
        Based on completed services recorded this week
      </div>
    </div>

    <div class="card pad" style="margin-bottom:12px">
      <div class="muted">Collected Online (Today)</div>
      <div style="font-size:28px;font-weight:800;color:var(--green)">
        ₹${onlineToday.toLocaleString('en-IN')}
      </div>
    </div>

    <div class="card pad" style="margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:20px">
        Completed Customers This Week
      </div>

      <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;align-items:end">
        ${days.map((name, i) => `
          <div style="text-align:center;font-size:11px">
            <div style="height:100px;display:flex;align-items:flex-end;justify-content:center">
              <div style="width:70%;max-width:35px;height:${dailyCounts[i] ? Math.max(8, dailyCounts[i] / maxCount * 100) : 0}px;background:var(--gold);border-radius:5px 5px 0 0"></div>
            </div>
            <div class="muted">${name}</div>
            <div>${dailyCounts[i]}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px">
      <div class="card pad">
        <div style="font-size:28px;font-weight:800;color:var(--green)">
          ${thisWeek.length}
        </div>
        <div class="muted">Completed Visits This Week</div>
      </div>

      <div class="card pad">
        <div style="font-size:28px;font-weight:800;color:var(--gold)">
          ${averageRating}
        </div>
        <div class="muted">Average Rating</div>
      </div>
    </div>

    <div class="card pad">
      <div style="font-weight:700;margin-bottom:16px">
        Top Services This Week
      </div>

      ${
        topServices.length
          ? topServices.map(([name, count]) => `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--s3)">
                <span>${name}</span>
                <strong>${count}</strong>
              </div>
            `).join('')
          : '<div class="muted">No completed services recorded this week yet.</div>'
      }
    </div>
  `;
}

function bTab(tab, el){

  const tabs = {
    queue: 'b-queue-tab',
    svc: 'b-svc-tab',
    analytics: 'b-analytics-tab',
    profile: 'b-profile-tab'
  };

  Object.values(tabs).forEach(id => {
    const section = document.getElementById(id);
    if(section) section.style.display = 'none';
  });

  const target = document.getElementById(tabs[tab]);

  if(target){
    target.style.display = 'block';
  }

  document.querySelectorAll('#b-tabs .tab').forEach(t => {
    t.classList.remove('on');
  });

  if(el){
    el.classList.add('on');
  }

  if(tab === 'queue'){
    renderBQ();
  }

  if(tab === 'svc'){
    renderSvcs();
  }

  if(tab === 'analytics'){
    renderAnalytics();
  }

  if(tab === 'profile'){
    renderBarberProfile();
  }
}

// PAYMENT HISTORY (for profile)
function renderPaymentHistory(){

  if(!S.payments.length){

    return `
      <div style="text-align:center;padding:24px 0;color:var(--txt2);font-size:13px">
        No payments yet — they'll show up here after you join a queue.
      </div>
    `;
  }

  return S.payments.map(p=>`

    <div class="prow" style="align-items:flex-start;flex-wrap:wrap">

      <div class="prow-ico">
        ${p.method==='Online'?'💳':'💵'}
      </div>

      <div style="flex:1;min-width:140px">
        <div class="prow-val">${p.svc} · ${p.shop}</div>
        <div class="prow-lab">${p.date} · ${p.method} · ${p.id}</div>
      </div>

      <div style="text-align:right">
        <div style="font-weight:700;color:var(--gold)">₹${p.amount}</div>
        <span class="tag ${refundTagClass(p.status)}" style="margin-top:4px;font-size:10px">
          ${p.status}
        </span>
      </div>

      ${p.status==='Paid' ? `
        <button class="btn btn-outline btn-sm" style="width:100%;margin-top:8px" onclick="requestRefund('${p.id}')">
          Request Refund
        </button>
      ` : ''}

    </div>

  `).join('');
}

function refundTagClass(status){
  if(status==='Paid') return 'tgreen';
  if(status==='Refund Requested') return 'tg';
  if(status==='Refunded') return 'tgray';
  return 'tgray';
}
function requestRefund(paymentId){

  const payment = S.payments.find(p => p.id === paymentId);
  if(!payment) return;

  if(payment.status !== 'Paid'){
    toast('⚠️', 'This payment cannot be refunded');
    return;
  }

  payment.status = 'Refund Requested';
  renderProfile();
  toast('⏳', 'Refund requested — processing...');

  setTimeout(() => {
    const p = S.payments.find(x => x.id === paymentId);
    if(!p || p.status !== 'Refund Requested') return;

    p.status = 'Refunded';
    S.onlineCollected = Math.max(0, S.onlineCollected - p.amount);

    if(document.getElementById('s-prof')?.classList.contains('active')){
      renderProfile();
    }

    toast('✅', '₹'+p.amount+' refunded for '+p.svc);
  }, 2500);
}

function renderBarberProfile(){
  const b = S.barber || {};

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if(el) el.textContent = value;
  };

  setText(
    'barber-profile-name',
    b.name || 'Not set'
  );

  setText(
    'barber-profile-fullname',
    b.name || 'Not set'
  );

  setText(
    'barber-profile-phone',
    b.phone || 'Not set'
  );

  setText(
    'barber-profile-shop',
    b.shopName || 'Shop name not set'
  );

  setText(
    'barber-profile-shopname',
    b.shopName || 'Not set'
  );

  setText(
    'barber-profile-address',
    b.address || 'Not set'
  );

  const hours =
    b.openingTime && b.closingTime
      ? b.openingTime + ' – ' + b.closingTime
      : 'Not set';

  setText(
    'barber-profile-hours',
    hours
  );

  const rating =
    Number(b.rating) > 0
      ? Number(b.rating).toFixed(1) + ' / 5.0'
      : 'No ratings yet';

  setText(
    'barber-profile-rating',
    rating
  );

  setText(
    'barber-profile-rating-count',
    `${Number(b.ratingCount) || 0} reviews`
  );

  const bank =
    b.payoutBank && b.payoutLast4
      ? b.payoutBank + ' ••••' + b.payoutLast4
      : 'Not set';

  setText(
    'barber-profile-bank',
    bank
  );

  const topAvatar = document.getElementById('barber-top-avatar');

  if (topAvatar) {

    if (b.photo) {

      topAvatar.innerHTML = `
        <img
          src="${b.photo}"
          alt="Barber"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
            border-radius:50%;
          "
        >
      `;

    } else {

      topAvatar.textContent =
        b.name
          ? b.name.charAt(0).toUpperCase()
          : 'B';

    }
  }

  setText(
    'barber-profile-online',
    '₹' + (
      Number(b.onlineCollected) || 0
    ).toLocaleString('en-IN')
  );


  const photo =
    document.getElementById('barber-profile-photo');

  if(photo){

    if(b.photo){

      photo.innerHTML = `
        <img
          src="${b.photo}"
          alt="Shop Photo"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
            border-radius:50%;
          "
        >
      `;

    }else{

      photo.textContent =
        b.name
          ? b.name.charAt(0).toUpperCase()
          : 'B';

    }
  }
}

function editBarberProfile(){

  const b = S.barber || {};

  const fields = {
    'bp-name': b.name || '',
    'bp-phone': (b.phone || '').replace('+91 ', ''),
    'bp-shop': b.shopName || '',
    'bp-address': b.address || '',
    'bp-open': b.openingTime || '',
    'bp-close': b.closingTime || '',
    'bp-bank': b.payoutBank || '',
    'bp-last4': b.payoutLast4 || ''
  };

  Object.entries(fields).forEach(([id, value]) => {

    const el = document.getElementById(id);

    if(el){
      el.value = value;
    }

  });

  openModal('m-editbarber');
}

function saveBarberProfile(){

  const name =
    document.getElementById('bp-name')?.value.trim() || '';

  const phone =
    document.getElementById('bp-phone')?.value.trim() || '';

  const shop =
    document.getElementById('bp-shop')?.value.trim() || '';

  const address =
    document.getElementById('bp-address')?.value.trim() || '';

  const opening =
    document.getElementById('bp-open')?.value || '';

  const closing =
    document.getElementById('bp-close')?.value || '';

  const bank =
    document.getElementById('bp-bank')?.value.trim() || '';

  const last4 =
    document.getElementById('bp-last4')?.value.trim() || '';


  if(!name){
    toast('⚠️','Please enter your full name');
    return;
  }


  if(!/^\d{10}$/.test(phone)){
    toast('⚠️','Please enter a valid 10-digit phone number');
    return;
  }


  if(!shop){
    toast('⚠️','Please enter your shop name');
    return;
  }


  if(!address){
    toast('⚠️','Please enter your shop address');
    return;
  }


  if(!opening || !closing){
    toast('⚠️','Please enter opening and closing time');
    return;
  }


  if(opening >= closing){
    toast('⚠️','Closing time must be after opening time');
    return;
  }


  if(bank && !/^[A-Za-z ]+$/.test(bank)){
    toast('⚠️','Please enter a valid bank name');
    return;
  }


  if(last4 && !/^\d{4}$/.test(last4)){
    toast('⚠️','Account number must contain exactly 4 digits');
    return;
  }

S.barber.name = name;
S.barber.phone = '+91 ' + phone;
S.barber.shopName = shop;
S.barber.address = address;
S.barber.openingTime = opening;
S.barber.closingTime = closing;
S.barber.payoutBank = bank;
S.barber.payoutLast4 = last4;

syncBarberToCustomerShop();
saveBarberProfileLocal();
closeModal('m-editbarber');
renderBarberProfile();
toast('Barber profile updated successfully');
}

function updateShopPhoto(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';
  input.onchange = function(){
    const file = input.files[0];
    if(!file) return;
    if(file.size > 5 * 1024 * 1024){
      toast('⚠️','Image must be smaller than 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e){
      S.barber.photo = e.target.result;
      syncBarberToCustomerShop();
      renderBarberProfile();
      toast('Shop photo updated successfully');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function logoutBarber(){
  S.role = null;
  toast('Logged out successfully');
  setTimeout(() => {
    go('s-land');
  }, 600);
}

function deleteBarberAccount(){
  const confirmed = confirm('Are you sure you want to delete your barber account?');
  if(!confirmed) return;
  S.barber = {
    name:'',
    phone:'',
    shopName:'',
    address:'',
    openingTime:'',
    closingTime:'',
    rating:0,
    ratingCount:0,
    payoutBank:'',
    payoutLast4:'',
    photo:'',
    onlineCollected:0
  };
  S.role = null;
  toast('Barber account deleted');
  setTimeout(() => {
    go('s-land');
  }, 700);
}

function renderProfile(){
  const isB = S.role === 'barber';
//  BARBER PROFILE 
if(isB){
  const b = S.barber;
  const barberName = b.name || 'Barber Name Not Set';
  const phone = b.phone || 'Phone not set';
  const shopName = b.shopName || 'Shop name not set';
  const address = b.address || 'Address not set';
  const hours =
    b.openingTime && b.closingTime
      ? `${b.openingTime} – ${b.closingTime}`
      : 'Hours not set';
  const rating =
    b.ratingCount > 0
      ? `${b.rating.toFixed(1)} / 5.0 (${b.ratingCount} reviews)`
      : 'No ratings yet';
  const payout =
    b.payoutBank && b.payoutLast4
      ? `${b.payoutBank} ••••${b.payoutLast4}`
      : 'Payout account not set';
  const initial =
    barberName.charAt(0).toUpperCase();
  document.getElementById('prof-body').innerHTML = `
    <div style="
      text-align:center;
      padding:24px 0 28px
    ">

      <div class="av"
        style="
          width:80px;
          height:80px;
          margin:0 auto 14px;
          font-size:30px;
          background:var(--cdim);
          border:3px solid var(--cyan);
          color:var(--cyan)
        "
      >
        ${initial}
      </div>

      <div style="
        font-size:22px;
        font-weight:800;
        font-family:'Syne',sans-serif
      ">
        ${barberName}
      </div>

      <div style="
        color:var(--txt2);
        font-size:13px;
        margin-top:4px
      ">
        ${shopName}
      </div>

      <span class="tag tgreen" style="margin-top:10px">
        Verified Barber
      </span>

    </div>


    <div style="margin-bottom:20px">

      <!-- Phone -->
      <div class="prow">

        <div class="prow-ico">📱</div>

        <div style="flex:1">
          <div class="prow-lab">
            Phone
          </div>

          <div class="prow-val">
            ${phone}
          </div>
        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <!-- Shop Name -->
      <div class="prow">

        <div class="prow-ico">🏪</div>

        <div style="flex:1">
          <div class="prow-lab">
            Shop Name
          </div>

          <div class="prow-val">
            ${shopName}
          </div>
        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <!-- Address -->
      <div class="prow">

        <div class="prow-ico">📍</div>

        <div style="flex:1">
          <div class="prow-lab">
            Address
          </div>

          <div class="prow-val">
            ${address}
          </div>
        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <!-- Hours -->
      <div class="prow">

        <div class="prow-ico">🕐</div>

        <div style="flex:1">
          <div class="prow-lab">
            Hours
          </div>

          <div class="prow-val">
            ${hours}
          </div>
        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <!-- Rating -->
      <div class="prow">

        <div class="prow-ico">⭐</div>

        <div style="flex:1">
          <div class="prow-lab">
            My Rating
          </div>

          <div class="prow-val">
            ${rating}
          </div>
        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <!-- Payout -->
      <div class="prow">

        <div class="prow-ico">🏦</div>

        <div style="flex:1">
          <div class="prow-lab">
            Payout Account
          </div>

          <div class="prow-val">
            ${payout}
          </div>
        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <!-- Support -->
      <div
        class="prow"
        style="cursor:pointer"
        onclick="go('s-support')"
      >

        <div class="prow-ico">🎧</div>

        <div style="flex:1">

          <div class="prow-lab">
            Support
          </div>

          <div class="prow-val">
            Help &amp; Support
          </div>

        </div>

        <span style="color:var(--txt2)">›</span>

      </div>

    </div>


    <!-- Online Payments -->

    <div style="
      font-size:15px;
      font-weight:700;
      font-family:'Syne',sans-serif;
      margin-bottom:12px
    ">
      Online Payments Collected Today
    </div>

    <div
      class="card card-p"
      style="
        margin-bottom:20px;
        display:flex;
        justify-content:space-between;
        align-items:center
      "
    >

      <span style="
        color:var(--txt2);
        font-size:13px
      ">
        Via Barber-Q Pay
      </span>

      <span style="
        font-size:22px;
        font-weight:800;
        font-family:'Syne',sans-serif;
        color:var(--gold)
      ">
        ₹${S.onlineCollected.toLocaleString('en-IN')}
      </span>

    </div>


    <!-- Buttons -->

    <div style="
      display:flex;
      flex-direction:column;
      gap:10px
    ">

      <button
        class="btn btn-outline btn-full"
        onclick="editBarberProfile()"
      >
         Edit Profile
      </button>


      <button
        class="btn btn-outline btn-full"
        onclick="toast('📷','Shop photo upload coming soon!')"
      >
        Update Shop Photo
      </button>


      <button
        class="btn btn-red btn-full"
        onclick="logout()"
      >
        Logout
      </button>


      <button
        class="btn btn-ghost btn-full"
        style="color:var(--red)"
        onclick="toast('⚠️','Account deletion requires email confirmation')"
      >
        Delete Account
      </button>

    </div>

    <div style="height:24px"></div>

  `;

  return;
}
    // CUSTOMER PROFILE — responsive dashboard matching the supplied reference
  const userName = S.user.name || 'Customer';
  const userPhone = S.user.phone || '';
  const userLocation = S.user.location && S.user.location !== 'Not set' ? S.user.location : '';
  const visits = Array.isArray(S.queueHistory) ? S.queueHistory : [];
  const ratings = Array.isArray(S.ratedShops) ? S.ratedShops : [];
  const payments = Array.isArray(S.payments) ? S.payments : [];
  const methods = Array.isArray(S.paymentMethods) ? S.paymentMethods : [];

  const initial = (userName.trim().charAt(0) || 'C').toUpperCase();

  const spent = payments
    .filter(p => String(p.status || '').toLowerCase() === 'paid')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const ratedShopIds = new Set(ratings.map(r => String(r.shopId ?? r.shop ?? '')));
  const ratedCount = ratedShopIds.size;

  const profileCompletion =
    (userName && userName !== 'Customer' ? 1 : 0) +
    (userPhone ? 1 : 0) +
    (userLocation ? 1 : 0);

  const completionPercent = Math.round((profileCompletion / 3) * 100);

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));

  const dateLabel = value => {
    if (!value) return 'Date unavailable';

    const d = new Date(value);

    return Number.isNaN(d.getTime())
      ? esc(value)
      : d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short'
        });
  };

  const shopNameFor = item =>
    item.shop ||
    item.shopName ||
    (S.shops.find(s => String(s.id) === String(item.shopId)) || {}).name ||
    'Barber shop';

  const historyRows = visits.slice(0, 3).map(v => `
    <div class="bq-row">
      <span class="bq-status-dot"></span>

      <div class="bq-row-copy">
        <strong>
          ${esc(shopNameFor(v))} · ${esc(v.service || v.svc || 'Service')}
        </strong>
        <small>
          Token #${esc(v.token || v.tok || '—')} ·
          ${dateLabel(v.date || v.createdAt)}
        </small>
      </div>

      <b class="bq-gold">
        ${v.amount || v.price ? '₹' + esc(v.amount || v.price) : ''}
      </b>
    </div>
  `).join('');

  const ratingRows = (S.ratedShops || [])
  .slice()
  .reverse()
  .map(r => {
    const shopName = r.shop || "Unknown shop";
    const stars = Math.max(0, Math.min(5, Number(r.rating) || 0));

    return `
      <div class="bq-inset">
        <span class="bq-shop-icon">⭐</span>

        <div class="bq-inset-copy">
          <strong>${esc(shopName)}</strong>
          <small>
            ${"★".repeat(stars)}${"☆".repeat(5 - stars)}
            · ${stars}/5 stars
          </small>
          <small>
            ${esc(r.review || "No written review")}
          </small>
          <small>
            Rated on ${esc(r.date || "Date unavailable")}
          </small>
        </div>

        <span class="bq-rating-label">Rated</span>
      </div>
    `;
  })
  .join("");

  const paymentRows = payments.slice(0, 3).map(p => `
    <div class="bq-inset">
      <span class="bq-payment-icon">
        ${String(p.method || '').toLowerCase().includes('upi') ? '▦' : '▰'}
      </span>

      <div class="bq-inset-copy">
        <strong>
          ${esc(shopNameFor(p))}
          <span class="bq-paid">${esc(p.status || 'RECORDED').toUpperCase()}</span>
        </strong>

        <small>
          ${esc(p.method || 'Payment')} ·
          ${dateLabel(p.date || p.createdAt)}
        </small>
      </div>

      <b class="bq-price">
        ${p.amount != null ? '₹' + esc(p.amount) : '—'}
      </b>
    </div>
  `).join('');

  const safeHistory = historyRows ||
    '<div class="bq-empty">Your completed visits will appear here.</div>';

  const safeRatings = ratingRows ||
  '<div class="bq-empty">No shop ratings yet. Complete a visit and rate the shop to see your history here.</div>';

  const safePayments = paymentRows ||
    '<div class="bq-empty">Your payment records will appear here.</div>';

  const body = document.getElementById('prof-body');
  if (!body) return;

  body.innerHTML = `
    <style>
      #s-prof .prof-card,
      #s-prof .profile-shell,
      #s-prof .page-wrap {
        max-width: none;
      }

      #s-prof #prof-body {
        width: 100%;
        min-width: 0;
      }

      .bq-profile-dashboard {
        color: #f3f0e9;
        width: 100%;
        min-width: 0;
        font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      }

      .bq-profile-dashboard * {
        box-sizing: border-box;
      }

      .bq-profile-dashboard .bq-topbar {
        min-height: 49px;
        display: flex;
        align-items: center;
        gap: 26px;
        padding: 0 14px;
        margin-bottom: 13px;
        border-bottom: 1px solid #1b1a21;
      }

      .bq-profile-dashboard .bq-brand {
        color: #ffc12f;
        font-size: 14px;
        font-weight: 950;
        letter-spacing: .3px;
        white-space: nowrap;
      }

      .bq-profile-dashboard .bq-brand span {
        color: #f7e6ba;
      }

      .bq-profile-dashboard .bq-nav {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .bq-profile-dashboard .bq-nav button {
        border: 0;
        border-radius: 99px;
        padding: 7px 12px;
        background: transparent;
        color: #a5a2ac;
        font-size: 9px;
      }

      .bq-profile-dashboard .bq-nav button.active {
        color: #19120a;
        background: #ffc12f;
        font-weight: 900;
      }

      .bq-profile-dashboard .bq-top-avatar {
        margin-left: auto;
        width: 27px;
        height: 27px;
        border: 0;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #ffc12f, #ff9638);
        color: #1b1408;
        font-weight: 900;
      }

      .bq-profile-dashboard .bq-layout {
        display: grid;
        grid-template-columns: minmax(215px, 27%) minmax(0, 1fr);
        gap: 13px;
        align-items: stretch;
      }

      .bq-profile-dashboard .bq-side {
        display: flex;
        flex-direction: column;
        min-width: 0;
        padding: 15px 13px;
        border: 1px solid #493718;
        border-radius: 16px;
        background:
          radial-gradient(circle at 50% 10%, rgba(255,190,40,.15), transparent 28%),
          #111117;
      }

      .bq-profile-dashboard .bq-identity {
        text-align: center;
        padding: 0 0 15px;
      }

      .bq-profile-dashboard .bq-ring {
        width: 70px;
        height: 70px;
        margin: 0 auto 7px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        position: relative;
        background: conic-gradient(#ffc12f ${completionPercent}%, #39302a 0);
      }

      .bq-profile-dashboard .bq-ring:before {
        content: "";
        position: absolute;
        inset: 2px;
        border-radius: 50%;
        background: #111117;
      }

      .bq-profile-dashboard .bq-ring b {
        z-index: 1;
        font-size: 23px;
        color: #ffc12f;
      }

      .bq-profile-dashboard .bq-percent {
        font-size: 8px;
        font-weight: 900;
        color: #ffc12f;
      }

      .bq-profile-dashboard .bq-identity h2 {
        font-size: 16px;
        margin: 5px 0 3px;
        font-weight: 800;
      }

      .bq-profile-dashboard .bq-muted {
        color: #888793;
        font-size: 9px;
      }

      .bq-profile-dashboard .bq-pill {
        display: inline-flex;
        margin-top: 7px;
        padding: 4px 9px;
        border-radius: 99px;
        background: #ffc12f16;
        color: #ffc12f;
        font-size: 9px;
        font-weight: 800;
      }

      .bq-profile-dashboard .bq-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px;
        margin-bottom: 10px;
      }

      .bq-profile-dashboard .bq-stat {
        min-width: 0;
        text-align: center;
        padding: 10px 3px;
        background: #191922;
        border: 1px solid #282631;
        border-radius: 11px;
      }

      .bq-profile-dashboard .bq-stat strong {
        display: block;
        font-size: 15px;
        margin-bottom: 3px;
        overflow-wrap: anywhere;
      }

      .bq-profile-dashboard .bq-stat span {
        color: #888793;
        font-size: 7px;
        letter-spacing: .3px;
        font-weight: 900;
      }

      .bq-profile-dashboard .bq-finish {
        border: 1px solid #543052;
        border-radius: 12px;
        padding: 10px;
        background: linear-gradient(120deg, #4a2a4b60, #1c1524a0);
      }

      .bq-profile-dashboard .bq-finish h3 {
        margin: 0 0 5px;
        font-size: 10px;
      }

      .bq-profile-dashboard .bq-finish p {
        color: #aaa3b3;
        font-size: 8px;
        line-height: 1.5;
        margin: 0 0 8px;
      }

      .bq-profile-dashboard .bq-progress {
        height: 4px;
        border-radius: 10px;
        background: #352c3a;
        overflow: hidden;
      }

      .bq-profile-dashboard .bq-progress div {
        height: 100%;
        background: linear-gradient(90deg, #ffc12f, #ff9d35);
        border-radius: inherit;
      }

      .bq-profile-dashboard .bq-progress-meta {
        display: flex;
        justify-content: space-between;
        gap: 5px;
        margin-top: 6px;
        font-size: 7px;
        color: #888793;
      }

      .bq-profile-dashboard .bq-actions {
        display: grid;
        gap: 7px;
        margin-top: auto;
        padding-top: 16px;
      }

      .bq-profile-dashboard button {
        font: inherit;
        cursor: pointer;
      }

      .bq-profile-dashboard .bq-primary,
      .bq-profile-dashboard .bq-logout {
        width: 100%;
        border-radius: 99px;
        padding: 10px;
        font-size: 10px;
        font-weight: 900;
      }

      .bq-profile-dashboard .bq-primary {
        border: 0;
        color: #201407;
        background: linear-gradient(100deg, #ffca39, #ff9737);
      }

      .bq-profile-dashboard .bq-logout {
        border: 1px solid #63312f;
        background: #5d24242e;
        color: #ff6d78;
      }

      .bq-profile-dashboard .bq-content {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        align-content: start;
        min-width: 0;
      }

      .bq-profile-dashboard .bq-card {
        min-width: 0;
        padding: 13px;
        background: rgba(17,17,24,.96);
        border: 1px solid #25242d;
        border-radius: 15px;
      }

      .bq-profile-dashboard .bq-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 11px;
      }

      .bq-profile-dashboard .bq-heading {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 10px;
        font-weight: 900;
      }

      .bq-profile-dashboard .bq-icon {
        width: 17px;
        height: 17px;
        display: grid;
        place-items: center;
        border-radius: 5px;
        flex-shrink: 0;
        background: #ffc12f20;
        color: #ffc12f;
        font-size: 9px;
      }

      .bq-profile-dashboard .bq-link {
        border: 0;
        padding: 0;
        background: none;
        color: #ffc12f;
        font-size: 8px;
        font-weight: 900;
        white-space: nowrap;
      }

      .bq-profile-dashboard .bq-detail-list,
      .bq-profile-dashboard .bq-rows {
        display: grid;
        gap: 7px;
      }

      .bq-profile-dashboard .bq-inset,
      .bq-profile-dashboard .bq-detail {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        padding: 8px;
        border: 1px solid #282731;
        border-radius: 10px;
        background: #191920;
      }

      .bq-profile-dashboard .bq-detail-copy,
      .bq-profile-dashboard .bq-inset-copy,
      .bq-profile-dashboard .bq-row-copy {
        flex: 1;
        min-width: 0;
      }

      .bq-profile-dashboard .bq-eyebrow {
        color: #777580;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .5px;
        margin-bottom: 3px;
      }

      .bq-profile-dashboard .bq-value {
        color: #ffc12f;
        font-size: 9px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .bq-profile-dashboard .bq-value.normal {
        color: #eee9e2;
      }

      .bq-profile-dashboard .bq-mini-btn {
        border: 0;
        border-radius: 99px;
        padding: 5px 8px;
        background: #ffc12f;
        color: #1d1609;
        font-size: 8px;
        font-weight: 900;
        white-space: nowrap;
      }

      .bq-profile-dashboard .bq-chevron {
        color: #777580;
        font-size: 16px;
      }

      .bq-profile-dashboard .bq-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .bq-profile-dashboard .bq-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #7ce1b0;
        flex-shrink: 0;
      }

      .bq-profile-dashboard .bq-row strong,
      .bq-profile-dashboard .bq-inset-copy strong {
        display: block;
        font-size: 9px;
        font-weight: 800;
        overflow-wrap: anywhere;
        margin-bottom: 3px;
      }

      .bq-profile-dashboard .bq-row small,
      .bq-profile-dashboard .bq-inset-copy small {
        display: block;
        font-size: 7px;
        color: #888793;
        line-height: 1.4;
      }

      .bq-profile-dashboard .bq-gold,
      .bq-profile-dashboard .bq-price {
        color: #ffc12f;
        font-size: 9px;
        font-weight: 900;
        white-space: nowrap;
      }

      .bq-profile-dashboard .bq-shop-icon,
      .bq-profile-dashboard .bq-payment-icon {
        width: 16px;
        height: 16px;
        display: grid;
        place-items: center;
        border-radius: 5px;
        flex-shrink: 0;
        background: #34305e;
        color: #c3b7ff;
        font-size: 10px;
      }

      .bq-profile-dashboard .bq-payment-icon {
        background: #27272d;
        color: #e7d7a2;
      }

      .bq-profile-dashboard .bq-rating-label {
        color: #ffc12f;
        font-size: 8px;
        font-weight: 800;
      }

      .bq-profile-dashboard .bq-paid {
        color: #7ce1b0;
        background: #45be8520;
        border-radius: 4px;
        padding: 2px 4px;
        font-size: 7px;
      }

      .bq-profile-dashboard .bq-support {
        grid-column: 1 / -1;
      }

      .bq-profile-dashboard .bq-support-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .bq-profile-dashboard .bq-support-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        min-width: 0;
        padding: 10px;
        border: 1px solid #282731;
        border-radius: 11px;
        background: #191920;
        color: inherit;
        text-align: left;
      }

      .bq-profile-dashboard .bq-support-icon {
        width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 5px;
        background: #273b3c;
        font-size: 10px;
      }

      .bq-profile-dashboard .bq-support-item strong {
        display: block;
        font-size: 9px;
        margin: 1px 0 4px;
      }

      .bq-profile-dashboard .bq-support-item small {
        display: block;
        color: #888793;
        font-size: 7px;
        line-height: 1.4;
      }

      .bq-profile-dashboard .bq-empty {
        color: #888793;
        font-size: 8px;
        padding: 7px 2px;
        line-height: 1.5;
      }

      @media (max-width: 850px) {
        .bq-profile-dashboard .bq-layout {
          grid-template-columns: 1fr;
        }

        .bq-profile-dashboard .bq-side {
          min-height: 0;
        }

        .bq-profile-dashboard .bq-actions {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 560px) {
        .bq-profile-dashboard .bq-topbar {
          gap: 9px;
          padding: 0 3px;
        }

        .bq-profile-dashboard .bq-brand {
          font-size: 12px;
        }

        .bq-profile-dashboard .bq-nav {
          gap: 1px;
        }

        .bq-profile-dashboard .bq-nav button {
          padding: 7px 8px;
        }

        .bq-profile-dashboard .bq-content {
          grid-template-columns: 1fr;
          gap: 9px;
        }

        .bq-profile-dashboard .bq-support {
          grid-column: auto;
        }

        .bq-profile-dashboard .bq-support-grid {
          grid-template-columns: 1fr;
        }

        .bq-profile-dashboard .bq-card {
          padding: 12px;
        }

        .bq-profile-dashboard .bq-row strong,
        .bq-profile-dashboard .bq-inset-copy strong {
          font-size: 10px;
        }

        .bq-profile-dashboard .bq-row small,
        .bq-profile-dashboard .bq-inset-copy small {
          font-size: 8px;
        }
      }
    </style>

    <div class="bq-profile-dashboard">
      <header class="bq-topbar">
        <div class="bq-brand">Glowora</div>

        <nav class="bq-nav" aria-label="Customer navigation">
          <button type="button" onclick="go('s-cust')">Home</button>
          <button type="button"
            onclick="cTab('queue', document.querySelector('#c-tabs .tab:nth-child(2)'))">
            My ticket
          </button>
          <button type="button" class="active" onclick="go('s-prof')">
            Profile
          </button>
        </nav>

        <button class="bq-top-avatar" type="button" aria-label="Customer account">
          ${esc(initial)}
        </button>
      </header>

      <div class="bq-layout">
        <aside class="bq-side">
          <div class="bq-identity">
            <div class="bq-ring"><b>${esc(initial)}</b></div>
            <div class="bq-percent">${completionPercent}%</div>
            <h2>${esc(userName)}</h2>
            <div class="bq-muted">
              ${userPhone ? esc(userPhone) : 'Add your phone number'}
            </div>
            <span class="bq-pill">● Customer</span>
          </div>

          <div class="bq-stats">
            <div class="bq-stat">
              <strong>${visits.length}</strong>
              <span>VISITS</span>
            </div>

            <div class="bq-stat">
              <strong>${ratedCount}</strong>
              <span>SHOPS RATED</span>
            </div>

            <div class="bq-stat">
              <strong>₹${spent.toLocaleString('en-IN')}</strong>
              <span>SPENT</span>
            </div>
          </div>

          <section class="bq-finish">
            <h3>Finish your profile ✨</h3>
            <p>
              Add your phone and location to get queue alerts and see shops
              near you first.
            </p>

            <div class="bq-progress">
              <div style="width:${completionPercent}%"></div>
            </div>

            <div class="bq-progress-meta">
              <span>${profileCompletion} of 3 done</span>
              <span>${!userPhone ? '+Phone ' : ''}${!userLocation ? '+Location' : ''}</span>
            </div>
          </section>

          <div class="bq-actions">
            <button class="bq-primary" type="button" onclick="editProfile()">✎ &nbsp; Edit profile</button>
            <button class="bq-logout" type="button" onclick="logout()">Logout</button>
            <button class="bq-delete-account" type="button" style="color:var(--red)" onclick="toast('⚠️','Account deletion requires email confirmation')">Delete Account</button>
          </div>
        </aside>

        <div class="bq-content">
          <section class="bq-card">
            <div class="bq-card-head">
              <div class="bq-heading">
                <span class="bq-icon">▣</span>
                Personal details
              </div>
            </div>

            <div class="bq-detail-list">
              <div class="bq-detail">
                <div class="bq-detail-copy">
                  <div class="bq-eyebrow">PHONE</div>
                  <div class="bq-value">
                    ${userPhone ? esc(userPhone) : 'Not added yet'}
                  </div>
                </div>

                <button class="bq-mini-btn" type="button" onclick="editProfile()">
                  + ${userPhone ? 'Edit' : 'Add'}
                </button>
              </div>

              <div class="bq-detail">
                <div class="bq-detail-copy">
                  <div class="bq-eyebrow">LOCATION</div>
                  <div class="bq-value">
                    ${userLocation ? esc(userLocation) : 'Not set'}
                  </div>
                </div>

                <button class="bq-mini-btn" type="button" onclick="editProfile()">
                  + ${userLocation ? 'Edit' : 'Set'}
                </button>
              </div>

              <button class="bq-detail"
                style="width:100%;text-align:left;color:inherit"
                type="button"
                onclick="toast('Queue alerts are managed by your Glowora account.')">

                <div class="bq-detail-copy">
                  <div class="bq-eyebrow">NOTIFICATIONS</div>
                  <div class="bq-value normal">Queue alerts on</div>
                </div>

                <span class="bq-chevron">›</span>
              </button>
            </div>
          </section>

          <section class="bq-card">
            <div class="bq-card-head">
              <div class="bq-heading">
                <span class="bq-icon" style="background:#16352e;color:#85e1b3">▦</span>
                Queue history
              </div>

              <button class="bq-link" type="button" onclick="showAllProfileHistory()">
                View all
              </button>
            </div>

            <div class="bq-rows">${safeHistory}</div>
          </section>

          <section class="bq-card">
            <div class="bq-card-head">
              <div class="bq-heading">
                <span class="bq-icon" style="background:#34301b">★</span>
                Shops rated
              </div>

              <button class="bq-link" type="button" onclick="openProfileRate()">
                Rate a recent visit
              </button>
            </div>

            <div class="bq-rows">${safeRatings}</div>
          </section>

          <section class="bq-card">
            <div class="bq-card-head">
              <div class="bq-heading">
                <span class="bq-icon" style="background:#302348;color:#c7a9ff">▰</span>
                Payments
              </div>

              <button class="bq-link" type="button" onclick="showAllProfilePayments()">
                History
              </button>
            </div>

            <div class="bq-rows">
              ${safePayments}

              <div class="bq-inset">
                <span class="bq-payment-icon">▤</span>

                <div class="bq-inset-copy">
                  <strong>Methods used</strong>
                  <small>
                    ${methods.length
                      ? esc(methods.join(' · '))
                      : 'No payment methods used yet'}
                  </small>
                </div>
              </div>
            </div>
          </section>

          <section class="bq-card bq-support">
            <div class="bq-card-head">
              <div class="bq-heading">
                <span class="bq-icon" style="background:#38252c;color:#ff9ca7">♧</span>
                Help &amp; support
              </div>
            </div>

            <div class="bq-support-grid">
              <button class="bq-support-item" type="button" onclick="go('s-support')">
                <span class="bq-support-icon">☏</span>
                <span>
                  <strong>Chat with us</strong>
                  <small>Replies within a few hours</small>
                </span>
              </button>

              <button class="bq-support-item" type="button" onclick="go('s-support')">
                <span class="bq-support-icon" style="background:#403323">📝</span>
                <span>
                  <strong>Raise a ticket</strong>
                  <small>Report a booking or payment issue</small>
                </span>
              </button>

              <button class="bq-support-item" type="button" onclick="go('s-support')">
                <span class="bq-support-icon" style="background:#332348;color:#d7aaff">?</span>
                <span>
                  <strong>FAQs</strong>
                  <small>How queues and booking work</small>
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function showPaymentMethods(){

  if(!S.paymentMethods.length){
    toast('💳','No payment methods used yet.');
    return;
  }

  toast('💳','Methods used: '+S.paymentMethods.join(', '));
}

function editProfile() {
    document.getElementById('ep-name').value = S.user.name || '';
    document.getElementById('ep-phone').value = (S.user.phone || '').replace('+91 ', '');

    const locEl = document.getElementById('ep-location');
    if (locEl) locEl.value = (S.user.location && S.user.location !== 'Not set') ? S.user.location : '';

    openModal('m-editprof');
}


function saveProfileEdit() {
    const name = document.getElementById("ep-name").value.trim();
    const phoneInput = document.getElementById("ep-phone").value.trim();
    const locationInput = document.getElementById("ep-location");

    const location = locationInput
        ? locationInput.value.trim()
        : "";

    const phoneDigits = phoneInput.replace(/\D/g, "").slice(-10);

    if (!name) {
        toast("⚠️", "Please enter your name");
        return;
    }

    if (!/^\d{10}$/.test(phoneDigits)) {
        toast("⚠️", "Enter a valid 10-digit phone number");
        return;
    }

    const customers = getAllCustomers();
    const oldPhone = String(S.user.phone || "")
        .replace(/\D/g, "")
        .slice(-10);

    if (!oldPhone) {
        const existingCustomer = customers[phoneDigits];

        if (existingCustomer) {
            loadCustomer(phoneDigits);
        } else {
            S.user.phone = phoneDigits;
        }
    } else if (oldPhone !== phoneDigits) {
        toast(
            "⚠️",
            "To change your number, verify the new number first."
        );
        return;
    }

    S.user.name = name;
    S.user.location = location || "Not set";
    S.user.phone = phoneDigits;

    if (!saveCurrentCustomer()) {
        toast("⚠️", "Could not save your profile");
        return;
    }

    closeModal("m-editprof");
    updateUserAvatar();
    renderProfile();

    toast("✅", "Profile saved successfully");
}

function useMyLocation(inputId, btn) {

    if (!navigator.geolocation) {
        toast('⚠️', 'Your browser does not support location access');
        return;
    }

    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    const originalLabel = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (position) => {

            const { latitude, longitude } = position.coords;

            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                );

                if (!res.ok) throw new Error('Reverse geocoding failed');

                const data = await res.json();
                const addr = data.address || {};
                const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
                const city = addr.city || addr.town || addr.village || addr.state_district || '';

                const shortAddress = [area, city].filter(Boolean).join(', ') || data.display_name || 'Location found';

                inputEl.value = shortAddress;
                toast('📍', 'Location detected');

            } catch (err) {
                console.error(err);
                toast('⚠️', 'Could not determine address from location');
            } finally {
                btn.innerHTML = originalLabel;
                btn.disabled = false;
            }
        },
        (error) => {
            btn.innerHTML = originalLabel;
            btn.disabled = false;

            if (error.code === error.PERMISSION_DENIED) {
                toast('⚠️', 'Location permission denied');
            } else {
                toast('⚠️', 'Could not get your location');
            }
        },
        { timeout: 10000 }
    );
}

function updateUserAvatar() {

    const avatar = document.getElementById('top-avatar');

    if (!avatar) return;

    const name = S.user.name || 'Customer';

    avatar.textContent = name.charAt(0).toUpperCase();
}


function logout(){

  toast(
    '👋',
    'Logged out successfully'
  );

  setTimeout(()=>{

    S.role=null;

    S.inQueue=false;

    go('s-land');

  },600);
}

// RATING 
function setStar(n){

  S.rating=n;
  document
    .querySelectorAll('#star-row .star-btn')
    .forEach(
      (b,i)=>{
        b.textContent=i<n?'⭐':'☆'
      }
    );
}

function submitRating(){

  if(!S.rating){

    toast(
      '⚠️',
      'Please select a star rating'
    );

    return;
  }

  if(!S.lastCompletedVisit){
    toast(
      'ℹ️',
      'You can rate a shop after completing your service.'
    );
    return;
  }

  const visit=S.lastCompletedVisit;

  const review=document.getElementById('rate-txt')?.value.trim() || '';

  S.ratedShops.push({
    shopId: visit.shopId,
    shop: visit.shop,
    rating: S.rating,
    review: review,
    date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    })
});
if (!saveCurrentCustomer()) return;

  closeModal('m-rate');

  toast(`Thanks for rating ${S.rating} star${S.rating!==1?'s':''}!` );

  S.rating=0;

  document
    .querySelectorAll('#star-row .star-btn')
    .forEach(
      b=>b.textContent='☆'
    );

  const rateTxt=document.getElementById('rate-txt');
  if(rateTxt) rateTxt.value='';

  if(document.getElementById('s-prof')?.classList.contains('active')){
    renderProfile();
  }
}

// SUPPORT / CUSTOMER CARE
const FAQS=[
  {
    q:'How do I join a queue?',
    a:'Open a shop, pick a service, and tap "Join Queue." You\'ll get a token number and can track your position live from "My Queue."'
  },
  {
    q:'Can I cancel after joining?',
    a:'Yes — go to "My Queue" and tap "Leave Queue" any time before your turn comes up.'
  },
  {
    q:'How is the wait time calculated?',
    a:'It\'s estimated from how many people are ahead of you and the average service duration at that shop.'
  },
  {
    q:'I paid online — how do refunds work?',
    a:'Refunds for online payments are processed to your original payment method within 3–5 business days. Share your payment ID with support to speed things up.'
  },
  {
    q:'Is my payment information safe?',
    a:'Yes. All online payments run through encrypted, secure payment gateways — Barber-Q never stores your card details.'
  },
  {
    q:'What if the shop marks me "Done" by mistake?',
    a:'Reach out via Live Chat or call support right away and we\'ll get it corrected with the shop.'
  }
];

function renderSupport(){

  document.getElementById('support-body').innerHTML = `

    <div style="text-align:center;padding:20px 0 24px">
      <div style="font-size:44px;margin-bottom:8px">🎧</div>
      <div style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif">
        How can we help?
      </div>
      <p style="color:var(--txt2);font-size:13px;margin-top:4px">
        We're here every day, 9 AM – 9 PM
      </p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">

      <a href="tel:+911234567890"
      class="card card-p"
      style="text-decoration:none;color:var(--txt);text-align:center;display:block">
        <div style="font-size:26px;margin-bottom:6px">📞</div>
        <div style="font-size:13px;font-weight:600">Call Us</div>
        <div style="font-size:11px;color:var(--txt2);margin-top:2px">+91 12345 67890</div>
      </a>

    <button class="card card-p" style="text-align:center;border:none;cursor:pointer" onclick="toast('ℹ️','Live Chat is currently unavailable. Please email support.')">
      <div style="font-size:26px;margin-bottom:6px">💬</div>
      <div style="font-size:13px;font-weight:600">Live Chat</div>
      <div style="font-size:11px;color:var(--txt2);margin-top:2px">Currently unavailable</div>
    </button>

      <a href="mailto:support@barberq.app"
      class="card card-p"
      style="text-decoration:none;color:var(--txt);text-align:center;display:block">
        <div style="font-size:26px;margin-bottom:6px">✉️</div>
        <div style="font-size:13px;font-weight:600">Email Us</div>
        <div style="font-size:11px;color:var(--txt2);margin-top:2px">support@barberq.app</div>
      </a>

      <button class="card card-p" style="text-align:center;border:none;cursor:pointer" onclick="openTicketForm()">
        <div style="font-size:26px;margin-bottom:6px">📄</div>
        <div style="font-size:13px;font-weight:600">Raise a Ticket</div>
        <div style="font-size:11px;color:var(--txt2);margin-top:2px">Submit a support request</div>
      </button>

    </div>

    <div style="font-size:16px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px">
      Frequently Asked Questions
    </div>

    <div id="faq-list">
      ${FAQS.map((f,i)=>`
        <div class="faq-item">
          <div class="faq-q" onclick="toggleFaq(${i})">
            <span>${f.q}</span>
            <span id="faq-arrow-${i}">＋</span>
          </div>
          <div class="faq-a" id="faq-a-${i}" style="display:none">${f.a}</div>
        </div>
      `).join('')}
    </div>

    <div style="height:24px"></div>

  `;
}
function openTicketForm() {
    const subject = prompt("Enter the ticket subject:");
    if (subject === null) return;

    if (!subject.trim()) {
        toast("⚠️", "Ticket subject is required");
        return;
    }

    const description = prompt("Describe your issue:");
    if (description === null) return;

    if (!description.trim()) {
        toast("⚠️", "Please describe your issue");
        return;
    }

    const ticket = {
        id: "BQ-" + Date.now(),
        phone: S.user.phone || "",
        subject: subject.trim(),
        description: description.trim(),
        status: "Open",
        createdAt: new Date().toISOString()
    };

    try {
        const key = "barberQTickets";
        const tickets = JSON.parse(localStorage.getItem(key) || "[]");

        tickets.push(ticket);
        localStorage.setItem(key, JSON.stringify(tickets));

        toast("✅", "Ticket created: " + ticket.id);
    } catch (error) {
        console.error("Ticket creation failed:", error);
        toast("⚠️", "Could not save your ticket");
    }
}

function toggleFaq(i) {
    const answer = document.getElementById("faq-a-" + i);
    const arrow = document.getElementById("faq-arrow-" + i);

    if (!answer || !arrow) {
        console.error("FAQ elements not found:", i);
        return;
    }

    const isOpen = answer.style.display === "block";

    answer.style.display = isOpen ? "none" : "block";
    arrow.textContent = isOpen ? "＋" : "−";
}

function sendChatMsg(){

  const inp=document.getElementById('chat-inp');
  const msg=inp.value.trim();

  if(!msg)return;

  const box=document.getElementById('chat-box');

  box.innerHTML += `<div class="chat-msg me">${msg}</div>`;

  inp.value='';

  box.scrollTop=box.scrollHeight;

  setTimeout(()=>{

    box.innerHTML += `<div class="chat-msg them">Thanks for reaching out! A support agent will be with you shortly. In the meantime, check the FAQs below — they cover most common questions. 🎧</div>`;

    box.scrollTop=box.scrollHeight;

  },900);
}

// LOAD HTML COMPONENTS 

async function loadComponent(containerId, fileName) {
  const container = document.getElementById(containerId);

  if (!container) {
    throw new Error('Container not found: ' + containerId);
  }

  const response = await fetch(fileName);

  if (!response.ok) {
    throw new Error(fileName + ' could not be loaded (' + response.status + ')');
  }

  const html = await response.text();
  container.innerHTML = html;
  console.log('✓ Loaded ' + fileName);
}

setInterval(() => {
  if (S.role === "barber" && S.barber.shopName) {
    loadBarberQueue(S.barber.shopName);
  }
}, 5000);

async function loadComponents() {
  try {
    await Promise.all([
      loadComponent('landing-container', 'landing.html'),
      loadComponent('authentication-container', 'authentication.html'),
      loadComponent('role-container', 'role.html'),
      loadComponent('customer-container', 'customer_dashboard.html'),
      loadComponent('shop-container', 'shop_detail.html'),
      loadComponent('barber-container', 'barber_dashboard.html'),
      loadComponent('profile-container', 'profile.html'),
      loadComponent('support-container', 'support.html'),
      loadComponent('modals-container', 'modals.html'),
      loadComponent('edit-profile-container', 'edit_profile.html'),
      loadComponent('payment-container', 'payment.html'),
      loadComponent('service-container', 'service.html'),
      loadComponent('success-container', 'success.html')
    ]);

    console.log('✓ All BarberQ HTML components loaded');
  } catch (error) {
    console.error('❌ BarberQ loading failed:', error);
  }
}

componentsReady = loadComponents();

// STAY ON THE SAME SCREEN AFTER A PAGE RELOAD
(function(){
  const VIEW_KEY = 'barberqView';
  const RESTORABLE = ['s-cust', 's-shop', 's-barb', 's-prof', 's-support'];

  const baseGo = go;
  go = function(id){
    baseGo(id);
    try{
      if(RESTORABLE.includes(id) && S.role){
        sessionStorage.setItem(VIEW_KEY, JSON.stringify({
          role: S.role, screen: id, user: S.user
        }));
      }else if(id === 's-land' || id === 's-role'){
        sessionStorage.removeItem(VIEW_KEY);
      }
    }catch(e){}
  };

  (async function restoreView(){
    let v = null;
    try{ v = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null'); }catch(e){}
    if(!v || !v.role) return;

    try{ await componentsReady; }catch(e){ return; }

    S.role = v.role;
    if(v.user) Object.assign(S.user, v.user);

    if(v.role === 'barber'){
      restoreBarberProfile();
      go('s-barb');
      if(S.barber.shopName) loadBarberQueue(S.barber.shopName);
      return;
    }

    go(v.screen === 's-prof' ? 's-prof' : 's-cust');

    if(S.inQueue && v.screen !== 's-prof'){
      const tabs = document.querySelectorAll('#c-tabs .tab');
      cTab('queue', tabs[1] || null);
    }
  })();
})();

// RATE AFTER THE SERVICE · LIVE ANALYTICS · REAL RATING
const BQ_BASE = 'https://barber-queue-backend-9z52.onrender.com';

completeMyVisit = async function(){

  if(S._finishing || !S.myQueueEntryId) return;
  S._finishing = true;

  const entryId = S.myQueueEntryId;
  let status = null;

  try{
    const r = await fetch(BQ_BASE + '/api/queue/' + entryId + '/status');
    if(r.status === 404){
      status = 'gone';
    }else{
      const j = await r.json();
      if(r.ok && j.success) status = j.status;
    }
  }catch(e){ /* server unreachable */ }

  if(!status || ['waiting', 'serving', 'cur', 'nxt', 'wait'].includes(status)){
    S._cqMiss = 0;
    S._finishing = false;
    return;
  }

  const shop = S.shops[S.myShopId];

  if(status === 'completed'){

    const visit = {
      token:   S.myTok,
      shopId:  S.myShopId,
      shop:    shop ? shop.name : 'Barber Shop',
      entryId: entryId,
      service: S.mySvc,
      date: new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      }),
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    S.queueHistory.unshift(visit);
    S.lastCompletedVisit = visit;
    saveCurrentCustomer();
    const payment = S.payments.find(p =>
      p.token === S.myTok && p.shopId === S.myShopId && p.status === 'Pending'
    );
    if(payment) payment.status = 'Paid';

    toast('✅', 'Your service is complete! Please rate your visit.');
  }
  else{
    toast('⏭️', status === 'skipped'
      ? 'Your token was skipped. Please speak to the barber.'
      : 'This booking is no longer active.');
    }
  saveCurrentCustomer();
  S.inQueue = false;
  S.myTok = '';
  S.mySvc = '';
  S.myQueueEntryId = null;
  S.myQueueList = null;
  S._cqMiss = 0;
  S._cqHeadId = null;
  S._finishing = false;

  renderMyQ();

  if(status === 'completed'){
    const nameEl = document.getElementById('rate-shop-name');
    if(nameEl) nameEl.textContent = S.lastCompletedVisit.shop;
    openModal('m-rate');
  }
};

const _renderMyQBase = renderMyQ;
renderMyQ = function(){
  _renderMyQBase();

  const el = document.getElementById('my-q');
  if(!el) return;

  if(S.inQueue){
    el.querySelectorAll('button').forEach(b => {
      if(/Rate Shop/.test(b.textContent)) b.remove();
    });
    return;
  }

  const v = S.lastCompletedVisit;
  if(v){
    el.insertAdjacentHTML('beforeend', `
      <div style="text-align:center;padding-bottom:30px;margin-top:-30px">
        <button class="btn btn-outline" onclick="rateLastVisit()">
          Rate your last visit ⭐
        </button>
      </div>`);
  }
};

function rateLastVisit(){
  const v = S.lastCompletedVisit;
  if(!v) return;
  const nameEl = document.getElementById('rate-shop-name');
  if(nameEl) nameEl.textContent = v.shop;
  openModal('m-rate');
}
const _submitRatingBase = submitRating;
submitRating = function(){
  const stars  = S.rating;
  const review = (document.getElementById('rate-txt') || {}).value || '';
  const visit  = S.lastCompletedVisit;
  const before = S.ratedShops.length;

  _submitRatingBase();

  if(visit && S.ratedShops.length > before){
    fetch(BQ_BASE + '/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_name: visit.shop,
        stars: stars,
        review: review,
        queue_id: visit.entryId
      })
    }).catch(e => console.warn('Could not send rating:', e));
    renderMyQ();
  }
};
let _statsSig = '';

async function refreshBarberStats(){

  if(S.role !== 'barber' || !S.barber.shopName) return;

  try{
    const tz = -new Date().getTimezoneOffset();      // IST = 330
    const r = await fetch(
      BQ_BASE + '/api/analytics?shop_name=' +
      encodeURIComponent(S.barber.shopName) + '&tz=' + tz
    );
    const j = await r.json();
    if(!r.ok || !j.success) return;

    S.barberStats = j;
    S.doneCnt = j.today.done;
    S.earn    = j.today.earnings;
    const set = (id, text) => {
      const el = document.getElementById(id);
      if(el) el.textContent = text;
    };
    set('b-done', S.doneCnt);
    set('b-earn', '₹' + Math.round(S.earn).toLocaleString('en-IN'));
    set('b-wait', j.today.avg_wait == null ? '—' : j.today.avg_wait);
    const ratingChanged =
      S.barber.rating !== j.rating.average ||
      S.barber.ratingCount !== j.rating.count;
    S.barber.rating      = j.rating.average;
    S.barber.ratingCount = j.rating.count;
    if(ratingChanged) syncBarberToCustomerShop();
    const sig = JSON.stringify(j);
    if(sig !== _statsSig){
      _statsSig = sig;
      const shown = id => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none' && el.offsetParent !== null;
      };
      if(shown('b-analytics-tab')) renderAnalytics();
      if(shown('b-profile-tab'))   renderBarberProfile();
    }
  }catch(e){ /* server unreachable: keep what is on screen */ }
}

renderAnalytics = function(){
  const container = document.getElementById('b-analytics');
  if(!container) return;
  refreshBarberStats();
  const st = S.barberStats || {
    today: { done: 0, earnings: 0, avg_wait: null },
    week:  { daily: [0,0,0,0,0,0,0], done: 0, revenue: 0, services: [] },
    rating: { average: 0, count: 0 }
  };
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const onlineToday = (S.payments || []).filter(p => {
    if(p.method !== 'Online' || p.status !== 'Paid') return false;
    const d = new Date(p.createdAt || p.timestamp || '');
    return !isNaN(d.getTime()) && d >= todayStart && d <= now;
  }).reduce((t, p) => t + Number(p.amount || 0), 0);
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const daily = st.week.daily;
  const maxCount = Math.max(1, ...daily);
  const averageRating = st.rating.count
    ? st.rating.average.toFixed(1) + ' ★ (' + st.rating.count + ')'
    : '—';
  container.innerHTML = `
    <div class="card pad" style="margin-bottom:12px">
      <div class="muted">Total Revenue (This Week)</div>
      <div style="font-size:30px;font-weight:800;color:var(--gold)">
        ₹${Math.round(st.week.revenue).toLocaleString('en-IN')}
      </div>
      <div class="muted">Based on completed services this week</div>
    </div>

    <div class="card pad" style="margin-bottom:12px">
      <div class="muted">Collected Online (Today)</div>
      <div style="font-size:28px;font-weight:800;color:var(--green)">
        ₹${onlineToday.toLocaleString('en-IN')}
      </div>
    </div>
    <div class="card pad" style="margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:20px">Completed Customers This Week</div>
      <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;align-items:end">
        ${days.map((name, i) => `
          <div style="text-align:center;font-size:11px">
            <div style="height:100px;display:flex;align-items:flex-end;justify-content:center">
              <div style="width:70%;max-width:35px;height:${daily[i] ? Math.max(8, daily[i] / maxCount * 100) : 0}px;background:var(--gold);border-radius:5px 5px 0 0"></div>
            </div>
            <div class="muted">${name}</div>
            <div>${daily[i]}</div>
          </div>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px">
      <div class="card pad">
        <div style="font-size:28px;font-weight:800;color:var(--green)">${st.week.done}</div>
        <div class="muted">Completed Visits This Week</div>
      </div>
      <div class="card pad">
        <div style="font-size:28px;font-weight:800;color:var(--gold)">${averageRating}</div>
        <div class="muted">Average Rating</div>
      </div>
    </div>
    <div class="card pad">
      <div style="font-weight:700;margin-bottom:16px">Top Services This Week</div>
      ${st.week.services.length ? st.week.services.map(([name, count]) => `
        <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--s3)">
          <span>${esc2(name)}</span><strong>${count}</strong>
        </div>`).join('') : '<div class="muted">No completed services recorded this week yet.</div>'}
    </div>`;
};

function esc2(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}

const _doneTokenBase = doneToken;

doneToken = async function(){
  await _doneTokenBase();
  refreshBarberStats();
};

setInterval(refreshBarberStats, 6000);
setTimeout(refreshBarberStats, 1500);
S.shopFilter = 'all';
S.shopQuery  = '';

function bqVisibleShops(){
  let list = S.shops.slice();                 // same objects, ids untouched
  const q = (S.shopQuery || '').trim().toLowerCase();
  if(q){
    list = list.filter(s =>
      [s.name, s.addr, s.owner].some(v => String(v || '').toLowerCase().includes(q))
    );
  }
  if(S.shopFilter === 'top'){
    list = list
      .filter(s => Number(s.rating) >= 4.5)
      .sort((a, b) => Number(b.rating) - Number(a.rating));
  }
  if(S.shopFilter === 'open'){
    list = list.filter(s => s.open);
  }
  if(S.shopFilter === 'near'){
    const loc = String((S.user && S.user.location) || '').toLowerCase();
    const words = loc.split(/[,\s\-–]+/).filter(w => w.length >= 3 && w !== 'not' && w !== 'set');
    if(words.length){
      const score = s => words.filter(w => String(s.addr || '').toLowerCase().includes(w)).length;
      list = list.filter(s => score(s) > 0).sort((a, b) => score(b) - score(a));
    }
  }
  return list;
}
const _renderShopsBase = renderShops;
renderShops = function(){
  const all = S.shops;
  const shown = bqVisibleShops();
  S.shops = shown;
  try{ _renderShopsBase(); }
  finally{ S.shops = all; }
  const box = document.getElementById('shop-list');
  if(box && shown.length === 0){
    const msg = S.shopFilter === 'near' && !/\w{3,}/.test(((S.user && S.user.location) || '').replace(/not set/i, ''))
      ? 'Set your location in Profile to see nearby shops.'
      : S.shopFilter === 'top'
        ? 'No shops with a 4.5★+ rating yet.'
        : 'No shops match your search.';
    box.innerHTML = `<div style="text-align:center;padding:40px 10px;color:var(--txt2)">${msg}</div>`;
  }
};

(async function wireShopFilters(){
  try{ await componentsReady; }catch(e){ return; }
  const home = document.getElementById('cust-home');
  if(!home) return;
  const input = home.querySelector('input.inp');
  const chips = [...home.querySelectorAll('span.tag')].filter(el =>
    /All|Top Rated|Nearby|Open Now/.test(el.textContent)
  );
  const keyOf = el => {
    const t = el.textContent;
    return /Top Rated/.test(t) ? 'top'
         : /Nearby/.test(t)    ? 'near'
         : /Open Now/.test(t)  ? 'open'
         : 'all';
  };

  const paint = () => chips.forEach(el => {
    el.className = 'tag ' + (keyOf(el) === S.shopFilter ? 'tg' : 'tgray');
  });

  chips.forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const key = keyOf(el);
      // tapping the active chip again goes back to "All"
      S.shopFilter = (S.shopFilter === key && key !== 'all') ? 'all' : key;
      paint();
      renderShops();
    });
  });

  if(input){
    input.addEventListener('input', () => {
      S.shopQuery = input.value;
      renderShops();
    });
  }

  paint();
})();
(function(){

  const digits10 = p => String(p || '').replace(/\D/g, '').slice(-10);
  const _fetchBase = window.fetch.bind(window);
  window.fetch = function(url, opts){
    try{
      if(typeof url === 'string' && /\/api\/queue$/.test(url) &&
         opts && opts.method === 'POST' && typeof opts.body === 'string'){
        const body = JSON.parse(opts.body);
        if(!body.customer_phone){
          body.customer_phone = digits10(S.user && S.user.phone);
          opts = Object.assign({}, opts, { body: JSON.stringify(body) });
        }
      }
    }catch(e){}
    return _fetchBase(url, opts);
  };
  window.leaveQ = async function(){
    if(!S.inQueue || !S.myQueueEntryId){
      toast('ℹ️', 'You are not in a queue');
      return;
    }
    if(!confirm('Leave the queue? You will lose your token.')) return;

    const entryId = S.myQueueEntryId;
    try{
      const r = await fetch(BQ_BASE + '/api/queue/' + entryId + '/cancel', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if(!r.ok && r.status !== 404 && r.status !== 400){
        throw new Error(j.error || 'Could not leave the queue');
      }
    }catch(e){
      toast('⚠️', e.message || 'Could not reach the server — try again');
      return;
    }

    S.inQueue = false; S.myTok = ''; S.mySvc = '';
    S.myQueueEntryId = null; S.myQueueList = null;
    S._cqMiss = 0; S._cqHeadId = null;
    const pay = (S.payments || []).find(p => p.status === 'Pending' && p.shopId === S.myShopId);
    if(pay) pay.status = 'Cancelled';

    saveCurrentCustomer();
    toast('👋', 'You left the queue');

    if(document.getElementById('s-shop')?.classList.contains('active')) go('s-cust');
    renderMyQ();
    if(typeof pollCustomer === 'function') pollCustomer();
  };
  function shopIndexFor(a){
    let i = S.shops.findIndex(s => s.name.toLowerCase() === String(a.shop_name).toLowerCase());
    if(i >= 0) return i;
    S.shops.push({ id: S.shops.length, name: a.shop_name, owner: '', rating: 0, rev: 0,
      addr: a.shop_address || '', cur: 0, q: 0, wait: 0, open: true,
      clr: '#00d4aa', ico: '✂️', svcs: [] });
    return S.shops.length - 1;
  }

  async function restoreFromBackend(phone, afterReload){
    const key = digits10(phone);
    if(key.length !== 10) return;
    const same = () => digits10(S.user && S.user.phone) === key;   // user may have switched number

    try{
      const r = await fetch(BQ_BASE + '/api/customers/' + key + '/active');
      const j = await r.json();
      if(same() && r.ok && j.success && j.active && !S.inQueue){
        const a = j.active;
        S.myShopId = shopIndexFor(a);
        S.inQueue = true; S.myTok = a.token; S.mySvc = a.service;
        S.myQueueEntryId = a.id; S.myQueueList = null; S._cqMiss = 0;
      }
    }catch(e){ console.warn('Active queue lookup failed:', e.message); }

    try{
      const r = await fetch(BQ_BASE + '/api/customers/' + key + '/history');
      const j = await r.json();
      if(same() && r.ok && j.success){
        S.queueHistory = S.queueHistory || [];
        const have = new Set(S.queueHistory.map(v => String(v.entryId)));
        j.visits.forEach(v => {
          if(have.has(String(v.id))) return;
          const d = new Date(v.completed_at);
          let shopId = S.shops.findIndex(s => s.name.toLowerCase() === v.shop_name.toLowerCase());
          S.queueHistory.push({
            token: v.token, shopId: shopId, shop: v.shop_name, entryId: v.id,
            service: v.service,
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            createdAt: d.toISOString(), timestamp: d.getTime()
          });
        });
        S.queueHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
    }catch(e){ console.warn('History lookup failed:', e.message); }

    if(!same()) return;
    saveCurrentCustomer();

    if(document.getElementById('s-prof')?.classList.contains('active')) renderProfile();
    if(document.getElementById('s-cust')?.classList.contains('active')){
      renderShops(); renderMyQ();
      if(afterReload && S.inQueue){
        const tabs = document.querySelectorAll('#c-tabs .tab');
        cTab('queue', tabs[1] || null);
      }
    }
  }

  const _loadCustomerBase = loadCustomer;
  loadCustomer = function(phone, enteredName){
    const ok = _loadCustomerBase(phone, enteredName);
    if(ok) restoreFromBackend(phone, false);
    return ok;
  };
  try{
    const v = JSON.parse(sessionStorage.getItem('barberqView') || 'null');
    if(v && v.role !== 'barber' && v.user && digits10(v.user.phone).length === 10){
      _loadCustomerBase(v.user.phone, v.user.name);
      Object.assign(S.user, v.user);
      componentsReady.then(() => restoreFromBackend(v.user.phone, true)).catch(() => {});
    }
  }catch(e){}
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LOCAL_TK = 'barberQTickets';

function ensureSupportUI(){
    if(document.getElementById('bq-chat')) return;
    const css = document.createElement('style');
    css.textContent = `
      .bq-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:none;align-items:flex-end;justify-content:center}
      .bq-ov.on{display:flex}
      .bq-sheet{background:var(--s2,#1a1a24);color:var(--txt,#fff);width:100%;max-width:480px;border-radius:20px 20px 0 0;padding:18px;max-height:88vh;overflow:auto;box-sizing:border-box}
      .bq-sheet h3{margin:0 0 4px;font-family:'Syne',sans-serif}
      .bq-sub{font-size:12px;color:var(--txt2,#aaa);margin-bottom:10px}
      .bq-msgs{height:240px;overflow:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
      .bq-m{max-width:82%;padding:9px 12px;border-radius:14px;font-size:13px;line-height:1.4}
      .bq-m.me{align-self:flex-end;background:var(--cyan,#00d4aa);color:#000}
      .bq-m.them{align-self:flex-start;background:rgba(255,255,255,.08)}
      .bq-f{width:100%;box-sizing:border-box;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;font:inherit;margin-bottom:10px}
      .bq-btn{padding:11px 16px;border-radius:10px;border:none;font-weight:700;cursor:pointer;background:var(--cyan,#00d4aa);color:#000;font:inherit;font-weight:700}
      .bq-btn.g{background:rgba(255,255,255,.1);color:inherit}
      .bq-faq{border:1px solid rgba(255,255,255,.1);border-radius:12px;margin-bottom:8px;overflow:hidden}
      .bq-faq-q{display:flex;justify-content:space-between;gap:10px;padding:13px 14px;cursor:pointer;font-size:14px;font-weight:600;width:100%;background:none;border:none;color:inherit;text-align:left;font-family:inherit}
      .bq-faq-a{display:none;padding:0 14px 14px;font-size:13px;color:var(--txt2,#aaa);line-height:1.5}
      .bq-faq.open .bq-faq-a{display:block}`;
    document.head.appendChild(css);
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="bq-ov" id="bq-chat"><div class="bq-sheet">
        <h3>💬 Help Assistant</h3>
        <div class="bq-sub">Automated answers to common questions. For anything about your money or token, raise a ticket.</div>
        <div class="bq-msgs" id="bq-msgs"></div>
        <div style="display:flex;gap:8px">
          <input class="bq-f" id="bq-chat-in" placeholder="Type your question..." autocomplete="off" style="flex:1">
          <button class="bq-btn" type="button" id="bq-chat-send" style="margin-bottom:10px">Send</button></div>
        <div style="display:flex;gap:8px">
          <button class="bq-btn" type="button" data-bq="ticket" style="flex:1">Raise a ticket</button>
          <button class="bq-btn g" type="button" data-bq="close" style="flex:1">Close</button></div>
      </div></div>
      <div class="bq-ov" id="bq-ticket"><div class="bq-sheet">
        <h3>📄 Raise a Ticket</h3>
        <div class="bq-sub">We reply on the number you logged in with.</div>
        <select class="bq-f" id="bq-tk-cat"><option>Payment issue</option><option>Wrong token / queue problem</option>
          <option>Shop marked me Done by mistake</option><option>Refund request</option><option>Other</option></select>
        <input class="bq-f" id="bq-tk-sub" placeholder="Subject" maxlength="150">
        <textarea class="bq-f" id="bq-tk-msg" rows="4" placeholder="Describe the problem (include payment ID or token no. if you have it)"></textarea>
        <button class="bq-btn" type="button" id="bq-tk-send" style="width:100%;margin-bottom:8px">Submit Ticket</button>
        <button class="bq-btn g" type="button" data-bq="close" style="width:100%">Cancel</button>
      </div></div>`;
    document.body.appendChild(wrap);
    document.addEventListener('click', e => {
      const t = e.target;
      if(!t || !t.closest) return;
      if(t.classList.contains('bq-ov') || t.closest('[data-bq="close"]')){ closeSheets(); return; }
      const q = t.closest('.bq-faq-q');
      if(q){
        e.preventDefault(); e.stopPropagation();
        const item = q.parentElement;
        item.classList.toggle('open');
        q.lastElementChild.textContent = item.classList.contains('open') ? '－' : '＋';
        return;
      }
      if(t.closest('#bq-chat-send'))        { chatSend(); return; }
      if(t.closest('#bq-tk-send'))          { ticketSend(); return; }
      if(t.closest('[data-bq="chat"]'))     { openChat(); return; }
      if(t.closest('[data-bq="ticket"]'))   { openTicket(); return; }
    }, true);

    document.getElementById('bq-chat-in').addEventListener('keydown', e => {
      if(e.key === 'Enter'){ e.preventDefault(); chatSend(); }
    });
  }

  function closeSheets(){ document.querySelectorAll('.bq-ov').forEach(o => o.classList.remove('on')); }

  function addMsg(text, who){
    const box = document.getElementById('bq-msgs');
    const d = document.createElement('div');
    d.className = 'bq-m ' + who; d.textContent = text;
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }

  function botReply(msg){
    const m = msg.toLowerCase();
    if(/refund|paid|payment|money|charged/.test(m)) return FAQS[3].a + ' If it is not sorted, please raise a ticket.';
    if(/safe|secure|card/.test(m))                  return FAQS[4].a;
    if(/cancel|leave/.test(m))                      return FAQS[1].a;
    if(/wait|time|long|eta/.test(m))                return FAQS[2].a;
    if(/join|token|book|queue/.test(m))             return FAQS[0].a;
    if(/done|mistake|wrong/.test(m))                return FAQS[5].a + ' Raising a ticket is the fastest way.';
    if(/^(hi|hello|hey)\b/.test(m.trim()))          return 'Hello! 👋 What would you like help with?';
    return "I couldn't find an answer to that. Please tap “Raise a ticket” and our team will follow up.";
  }

  function chatSend(){
    const inp = document.getElementById('bq-chat-in');
    const msg = inp.value.trim();
    if(!msg) return;
    addMsg(msg, 'me'); inp.value = '';
    setTimeout(() => addMsg(botReply(msg), 'them'), 500);
  }

  function openChat(){
    ensureSupportUI();
    const box = document.getElementById('bq-msgs');
    if(!box.children.length) addMsg("Hi! 👋 I'm the Barber-Q help assistant. Ask me about queues, wait times or payments.", 'them');
    document.getElementById('bq-chat').classList.add('on');
    setTimeout(() => document.getElementById('bq-chat-in').focus(), 50);
  }

  function openTicket(){
    ensureSupportUI();
    closeSheets();
    ['bq-tk-sub', 'bq-tk-msg'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('bq-ticket').classList.add('on');
  }

  async function ticketSend(){
    const sub = document.getElementById('bq-tk-sub').value.trim();
    const msg = document.getElementById('bq-tk-msg').value.trim();
    const cat = document.getElementById('bq-tk-cat').value;
    if(sub.length < 3){ toast('⚠️', 'Please add a subject'); return; }
    if(msg.length < 5){ toast('⚠️', 'Please describe the problem'); return; }
    const btn = document.getElementById('bq-tk-send');
    btn.disabled = true;
    try{
      const r = await fetch(BQ_BASE + '/api/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits10(S.user.phone), category: cat, subject: sub, description: msg })
      });
      const j = await r.json();
      if(!r.ok || !j.success) throw new Error(j.error || 'Could not save the ticket');
      toast('✅', 'Ticket ' + j.ticket.ref + ' raised');
    }catch(e){
      try{
        const list = JSON.parse(localStorage.getItem(LOCAL_TK) || '[]');
        list.push({ id: 'BQ-' + Date.now(), phone: S.user.phone || '', subject: sub, description: msg,
                    category: cat, status: 'Saved on this device', createdAt: new Date().toISOString() });
        localStorage.setItem(LOCAL_TK, JSON.stringify(list));
        toast('⚠️', 'Server unreachable — ticket saved on this device only');
      }catch(_){ toast('⚠️', e.message || 'Could not save the ticket'); }
    }
    btn.disabled = false;
    closeSheets();
    if(document.getElementById('s-support')?.classList.contains('active')) renderSupport();
  }

  async function myTicketsHtml(){
    const key = digits10(S.user && S.user.phone);
    if(key.length !== 10) return '';
    let list = [];
    try{
      const r = await fetch(BQ_BASE + '/api/tickets?phone=' + key);
      const j = await r.json();
      if(r.ok && j.success) list = j.tickets;
    }catch(e){}
    if(!list.length) return '';
    return `
      <div style="font-size:16px;font-weight:700;font-family:'Syne',sans-serif;margin:22px 0 10px">My Tickets</div>
      ${list.slice(0, 5).map(t => `
        <div class="card card-p" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700">
            <span>${esc(t.ref)} · ${esc(t.subject)}</span><span style="color:var(--cyan)">${esc(t.status)}</span></div>
          <div style="font-size:12px;color:var(--txt2);margin-top:4px">${esc(t.description)}</div>
        </div>`).join('')}`;
  }

  renderSupport = function(){
    ensureSupportUI();
    document.getElementById('support-body').innerHTML = `
      <div style="text-align:center;padding:20px 0 24px">
        <div style="font-size:44px;margin-bottom:8px">🎧</div>
        <div style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif">How can we help?</div>
        <p style="color:var(--txt2);font-size:13px;margin-top:4px">We're here every day, 9 AM – 9 PM</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">
        <a href="tel:+911234567890" class="card card-p" style="text-decoration:none;color:var(--txt);text-align:center;display:block">
          <div style="font-size:26px;margin-bottom:6px">📞</div><div style="font-size:13px;font-weight:600">Call Us</div>
          <div style="font-size:11px;color:var(--txt2);margin-top:2px">+91 12345 67890</div></a>
        <button type="button" class="card card-p" data-bq="chat" style="text-align:center;border:none;cursor:pointer">
          <div style="font-size:26px;margin-bottom:6px">💬</div><div style="font-size:13px;font-weight:600">Help Assistant</div>
          <div style="font-size:11px;color:var(--txt2);margin-top:2px">Instant answers</div></button>
        <a href="mailto:support@barberq.app" class="card card-p" style="text-decoration:none;color:var(--txt);text-align:center;display:block">
          <div style="font-size:26px;margin-bottom:6px">✉️</div><div style="font-size:13px;font-weight:600">Email Us</div>
          <div style="font-size:11px;color:var(--txt2);margin-top:2px">support@barberq.app</div></a>
        <button type="button" class="card card-p" data-bq="ticket" style="text-align:center;border:none;cursor:pointer">
          <div style="font-size:26px;margin-bottom:6px">📄</div><div style="font-size:13px;font-weight:600">Raise a Ticket</div>
          <div style="font-size:11px;color:var(--txt2);margin-top:2px">Submit a support request</div></button>
      </div>
      <div style="font-size:16px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px">Frequently Asked Questions</div>
      ${FAQS.map(f => `
        <div class="bq-faq">
          <button type="button" class="bq-faq-q"><span>${esc(f.q)}</span><span>＋</span></button>
          <div class="bq-faq-a">${esc(f.a)}</div>
        </div>`).join('')}
      <div id="bq-my-tickets"></div>
      <div style="height:24px"></div>`;
    myTicketsHtml().then(h => {
      const el = document.getElementById('bq-my-tickets');
      if(el) el.innerHTML = h;
    });
  };
  const _goBase = go;
  go = function(id){ closeSheets(); _goBase(id); };
  componentsReady.then(ensureSupportUI).catch(() => {});
})();

(function(){
  const MAX_IMG = 3, MAX_VID = 1;
  const MAX_IMG_BYTES = 5 * 1024 * 1024, MAX_VID_BYTES = 25 * 1024 * 1024, MAX_VID_SECONDS = 30;
  let picked = [];                       // [{file, kind, url}]
  const esc = s => String(s).replace(/[&<>"']/g, c =>({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function shrink(file){
    return new Promise(resolve => {
      if(file.type === 'image/gif') return resolve(file);
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(b => resolve(b ? new File([b], 'photo.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(u); resolve(file); };
      img.src = u;
    });
  }
  function videoSeconds(file){
    return new Promise(resolve => {
      const v = document.createElement('video'), u = URL.createObjectURL(file);
      v.preload = 'metadata';
      v.onloadedmetadata = () => { URL.revokeObjectURL(u); resolve(v.duration); };
      v.onerror = () => { URL.revokeObjectURL(u); resolve(0); };
      v.src = u;
    });
  }
  function paintPreviews(){
    const box = document.getElementById('bq-previews');
    if(!box) return;
    box.innerHTML = picked.map((p, i) => `
      <div style="position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;background:#000;flex-shrink:0">
        ${p.kind === 'image'
          ? `<img src="${p.url}" style="width:100%;height:100%;object-fit:cover">`
          : `<video src="${p.url}" muted style="width:100%;height:100%;object-fit:cover"></video>
             <span style="position:absolute;left:4px;bottom:2px;font-size:14px">🎬</span>`}
        <button type="button" data-bq-rm="${i}" style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,.7);color:#fff;cursor:pointer;line-height:1">×</button>
      </div>`).join('');
  }
  function resetPicked(){
    picked.forEach(p => URL.revokeObjectURL(p.url));
    picked = [];
    paintPreviews();
  }

  async function addFiles(list){
    for(const f of Array.from(list)){
      const isImg = f.type.startsWith('image/'), isVid = f.type.startsWith('video/');
      if(!isImg && !isVid){ toast('⚠️', f.name + ' is not a photo or video'); continue; }

      if(isImg){
        if(picked.filter(p => p.kind === 'image').length >= MAX_IMG){ toast('⚠️', 'Up to ' + MAX_IMG + ' photos'); continue; }
        const small = await shrink(f);
        if(small.size > MAX_IMG_BYTES){ toast('⚠️', 'Photo is too large (max 5 MB)'); continue; }
        picked.push({ file: small, kind: 'image', url: URL.createObjectURL(small) });
      }else{
        if(picked.filter(p => p.kind === 'video').length >= MAX_VID){ toast('⚠️', 'Only 1 video allowed'); continue; }
        if(f.size > MAX_VID_BYTES){ toast('⚠️', 'Video is too large (max 25 MB)'); continue; }
        if(!/mp4|webm/.test(f.type)){ toast('⚠️', 'Video must be MP4 or WEBM'); continue; }
        const secs = await videoSeconds(f);
        if(secs > MAX_VID_SECONDS){ toast('⚠️', 'Video must be 30 seconds or shorter'); continue; }
        picked.push({ file: f, kind: 'video', url: URL.createObjectURL(f) });
      }
    }
    paintPreviews();
  }

  function injectPicker(){
    const txt = document.getElementById('rate-txt');
    if(!txt || document.getElementById('bq-pick')) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'text-align:left;margin:-6px 0 16px';
    wrap.innerHTML = `
      <input type="file" id="bq-pick" accept="image/*,video/mp4,video/webm" multiple style="display:none">
      <button type="button" id="bq-pick-btn" class="btn btn-outline btn-sm" style="width:100%">📷 Add photos or video</button>
      <div style="font-size:11px;color:var(--txt2);margin-top:6px">Up to 3 photos and 1 video (30 sec). Visible to everyone on the shop page.</div>
      <div id="bq-previews" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>`;
    txt.insertAdjacentElement('afterend', wrap);
    const input = wrap.querySelector('#bq-pick');
    wrap.querySelector('#bq-pick-btn').addEventListener('click', () => input.click());
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    wrap.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-bq-rm]');
      if(!b) return;
      const [p] = picked.splice(Number(b.dataset.bqRm), 1);
      if(p) URL.revokeObjectURL(p.url);
      paintPreviews();
    });
  }
  componentsReady.then(injectPicker).catch(() => {});
  const _openModalBase = openModal;
  openModal = function(id){
    if(id === 'm-rate'){ injectPicker(); resetPicked(); }
    _openModalBase(id);
  };
  const _submitBase = submitRating;
  submitRating = function(){
    const visit = S.lastCompletedVisit;
    const before = S.ratedShops.length;
    const files = picked.map(p => p.file);
    _submitBase();
    if(visit && S.ratedShops.length > before && files.length && visit.entryId){
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      toast('⏫', 'Uploading your photos…');
      fetch(BQ_BASE + '/api/queue/' + visit.entryId + '/media', { method: 'POST', body: fd })
        .then(r => r.json().then(j => ({ r, j })))
        .then(({ r, j }) => {
          if(!r.ok || !j.success) throw new Error(j.error || 'Upload failed');
          toast('✅', 'Photos added to the shop page');
          if(document.getElementById('s-shop')?.classList.contains('active')) loadGallery();
        })
        .catch(e => toast('⚠️', e.message || 'Could not upload the photos'));
    }
    if(S.ratedShops.length > before) resetPicked();
  };
  function lightbox(m){
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    o.innerHTML = m.kind === 'video'
      ? `<video src="${m.src}" controls autoplay style="max-width:100%;max-height:90vh"></video>`
      : `<img src="${m.src}" style="max-width:100%;max-height:90vh">`;
    o.addEventListener('click', e => { if(e.target === o) o.remove(); });
    document.body.appendChild(o);
  }
  async function loadGallery(){
    const body = document.getElementById('sh-body');
    const shop = S.shops[S.selectedShop];
    if(!body || !shop) return;
    let list = [];
    try{
      const r = await fetch(BQ_BASE + '/api/shops/reviews?shop_name=' + encodeURIComponent(shop.name));
      const j = await r.json();
      if(r.ok && j.success) list = j.reviews;
    }catch(e){ return; }
    let box = document.getElementById('bq-gallery');
    if(!box){
      box = document.createElement('div');
      box.id = 'bq-gallery';
      body.appendChild(box);
    }
    if(!list.length){ box.innerHTML = ''; return; }
    box.innerHTML = `
      <div style="font-size:17px;font-weight:700;font-family:'Syne',sans-serif;margin:8px 0 12px">
        Customer Photos & Reviews
      </div>
      ${list.map(rv => `
        <div class="card card-p" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
            <strong>${esc(rv.name)}</strong>
            <span>${'⭐'.repeat(rv.stars)}</span>
          </div>
          ${rv.review ? `<div style="font-size:13px;color:var(--txt2);margin-bottom:8px">${esc(rv.review)}</div>` : ''}
          ${rv.media.length ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${rv.media.map(m => {
                const src = BQ_BASE + m.url;
                return m.kind === 'video' ? `<div data-bq-media="${src}" data-kind="video" style="position:relative;width:88px;height:88px;border-radius:10px;overflow:hidden;background:#000;cursor:pointer">
                <video src="${src}#t=0.1" preload="metadata" muted style="width:100%;height:100%;object-fit:cover;pointer-events:none"></video>
                  <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px">▶️</span></div>`: `<img src="${src}" data-bq-media="${src}" data-kind="image" loading="lazy"style="width:88px;height:88px;object-fit:cover;border-radius:10px;cursor:pointer">`;}).join('')}</div>` : ''}</div>`).join('')}
                  ${Number(shop.rev) > list.length ? `<div style="text-align:center;font-size:12px;color:var(--txt2);margin:4px 0 12px">+${Number(shop.rev) - list.length} more rating${Number(shop.rev) - list.length === 1 ? '' : 's'} without details</div>` : ''}<div style="height:24px"></div>`;
      box.onclick = e => {
      const m = e.target.closest && e.target.closest('[data-bq-media]');
      if(m) lightbox({ src: m.dataset.bqMedia, kind: m.dataset.kind });
    };
  }
  const _openShopBase = openShop;
  openShop = function(id){
    _openShopBase(id);
    loadGallery();
  };
})();

/* =========================================================
   BARBERQ — DASHBOARD / BOOKINGS / CALENDAR / STAFF / SETTINGS
   Wraps bTab(); queue, services, analytics and profile logic is untouched.
   ========================================================= */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const setText = (id, v) => { const n = $(id); if (n) n.textContent = v; };

  const NEW_TABS = {
    dashboard: "b-dashboard-tab",
    bookings: "b-bookings-tab",
    calendar: "b-calendar-tab",
    staff: "b-staff-tab",
    settings: "b-settings-tab"
  };
  const ALL_IDS = ["b-queue-tab", "b-svc-tab", "b-analytics-tab", "b-profile-tab", ...Object.values(NEW_TABS)];
  const originalBTab = window.bTab;

  function hideAll() {
    ALL_IDS.forEach(id => { const s = $(id); if (s) s.style.display = "none"; });
  }
  function tabButton(tab) {
    return document.querySelector('#b-tabs .tab[data-tab="' + tab + '"]');
  }
  function highlight(tab, el) {
    document.querySelectorAll("#b-tabs .tab").forEach(t => t.classList.remove("on"));
    const b = el || tabButton(tab);
    if (!b) return;
    b.classList.add("on");
    const bar = $("b-tabs");
    if (bar && bar.scrollTo) {
      bar.scrollTo({ left: b.offsetLeft - (bar.clientWidth - b.clientWidth) / 2, behavior: "smooth" });
    }
  }

  window.bTab = function (tab, el) {
    hideAll();
    if (Object.prototype.hasOwnProperty.call(NEW_TABS, tab)) {
      const target = $(NEW_TABS[tab]);
      if (!target) return;
      target.style.display = "block";
      highlight(tab, el);
      if (tab === "dashboard") bqRefreshOverview();
      if (tab === "bookings") bqLoadBookings();
      if (tab === "calendar") bqRenderCalendar();
      if (tab === "staff") bqLoadStaff();
      if (tab === "settings") bqRenderSettings();
      return;
    }
    if (typeof originalBTab === "function") {
      highlight(tab, el);
      originalBTab(tab, el || tabButton(tab));
    }
  };

  /* ---------------- DASHBOARD ---------------- */
  const PALETTE = ["#3b82f6", "#a78bfa", "#f5c842", "#4ade80", "#f472b6", "#fb923c"];

  window.bqRefreshOverview = function () {
    const st = S.barberStats;
    setText("bq-overview-queue", (S.bq || []).length);
    setText("bq-overview-done", S.doneCnt || 0);
    setText("bq-overview-revenue", "₹" + Math.round(S.earn || 0).toLocaleString("en-IN"));
    setText("bq-overview-wait",
      st && st.today && st.today.avg_wait != null ? st.today.avg_wait : "—");

    // live queue (top 5)
    const list = $("bq-overview-queue-list");
    if (list) {
      const q = (S.bq || []).slice(0, 5);
      list.innerHTML = q.length ? q.map(c => `
        <div class="bq-q-row ${c.st === "cur" ? "cur" : ""}">
          <div class="bq-q-num">${esc(c.tok)}</div>
          <div class="bq-q-main"><strong>${esc(c.name)}</strong><span>${esc(c.svc)} · ${esc(c.dur)} min</span></div>
          <span class="tag ${c.st === "cur" ? "tg" : c.st === "nxt" ? "tgreen" : "tgray"}">
            ${c.st === "cur" ? "Now" : c.st === "nxt" ? "Next" : "Waiting"}</span>
        </div>`).join("")
        : '<p class="bq-muted">No customers are currently in the queue.</p>';
    }

    // weekly bar chart
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const daily = st && st.week && Array.isArray(st.week.daily) ? st.week.daily : [0, 0, 0, 0, 0, 0, 0];
    const max = Math.max(1, ...daily);
    const chart = $("bq-week-chart");
    if (chart) {
      chart.innerHTML = days.map((d, i) => `
        <div class="bq-bar">
          <div class="bq-bar-track"><div class="bq-bar-fill" style="height:${daily[i] ? Math.max(8, daily[i] / max * 100) : 0}px"></div></div>
          ${d}<b>${daily[i] || 0}</b>
        </div>`).join("");
    }

    // service mix donut
    const services = st && st.week && Array.isArray(st.week.services) ? st.week.services.slice(0, 6) : [];
    const total = services.reduce((t, s) => t + Number(s[1] || 0), 0);
    const donut = $("bq-donut");
    const legend = $("bq-donut-legend");
    setText("bq-donut-total", total);
    if (donut && legend) {
      if (!total) {
        donut.style.background = "var(--s3,#23232f)";
        legend.innerHTML = '<span class="bq-muted">No completed services this week yet.</span>';
      } else {
        let acc = 0;
        const stops = services.map((s, i) => {
          const from = acc / total * 100;
          acc += Number(s[1]);
          return PALETTE[i % PALETTE.length] + " " + from + "% " + (acc / total * 100) + "%";
        });
        donut.style.background = "conic-gradient(" + stops.join(",") + ")";
        legend.innerHTML = services.map((s, i) =>
          `<div><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(s[0])}<b>${esc(s[1])}</b></div>`).join("");
      }
    }
  };

  /* ---------------- BOOKINGS ---------------- */
  /* Appointment shape:
     { id, customer, service, date:'YYYY-MM-DD', start:'HH:MM', end:'HH:MM',
       status:'pending|confirmed|completed|cancelled', staff }
     Provide data with bqSetAppointments([...]) or set
     window.BQ_APPOINTMENTS_URL (GET ?shop_name=... → {appointments:[...]}). */
  window.bqAppointments = [];

  window.bqSetAppointments = function (list) {
    window.bqAppointments = Array.isArray(list) ? list : [];
    bqRenderBookings();
    bqRenderCalendar();
  };

  window.bqLoadBookings = async function () {
    const url = window.BQ_APPOINTMENTS_URL;
    if (url && S.barber && S.barber.shopName) {
      try {
        const r = await fetch(url + "?shop_name=" + encodeURIComponent(S.barber.shopName));
        const j = await r.json();
        if (r.ok && Array.isArray(j.appointments)) window.bqAppointments = j.appointments;
      } catch (e) { console.warn("Could not load appointments:", e); }
    }
    bqRenderBookings();
  };

  window.bqRenderBookings = function () {
    const body = $("bq-bookings-body");
    if (!body) return;
    const search = ($("bq-booking-search")?.value || "").trim().toLowerCase();
    const filter = $("bq-booking-filter")?.value || "all";

    const rows = window.bqAppointments.filter(a =>
      (filter === "all" || a.status === filter) &&
      (!search || [a.customer, a.service].some(v => String(v || "").toLowerCase().includes(search))));

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="5" class="bq-empty">${
        window.bqAppointments.length ? "No bookings match your filters." : "No appointments yet."}</td></tr>`;
      return;
    }
    body.innerHTML = rows.map(a => `
      <tr>
        <td><strong>${esc(a.customer)}</strong></td>
        <td>${esc(a.service)}</td>
        <td>${esc(a.date)}<br><span class="bq-muted">${esc(a.start)}${a.end ? " – " + esc(a.end) : ""}</span></td>
        <td><span class="bq-badge ${esc(a.status)}">${esc(a.status)}</span></td>
        <td>
          <select class="bq-status-select" onchange="bqSetStatus('${esc(a.id)}',this.value)">
            ${["pending", "confirmed", "completed", "cancelled"].map(s =>
              `<option value="${s}" ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </td>
      </tr>`).join("");
  };

  window.bqSetStatus = function (id, status) {
    const a = window.bqAppointments.find(x => String(x.id) === String(id));
    if (!a) return;
    a.status = status;
    bqRenderBookings();
    bqRenderCalendar();
    toast("✅", "Booking marked " + status);
  };

  /* ---------------- CALENDAR ---------------- */
  let weekOffset = 0;
  const isoDate = d =>
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  window.bqCalendarToday = function () { weekOffset = 0; bqRenderCalendar(); };
  window.bqChangeWeek = function (dir) { weekOffset += Number(dir) || 0; bqRenderCalendar(); };

  window.bqRenderCalendar = function () {
    const grid = $("bq-calendar-grid");
    const range = $("bq-calendar-range");
    if (!grid || !range) return;

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = d => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    range.textContent = fmt(start) + " – " + fmt(end);

    const b = (window.S && S.barber) || {};
    let openH = parseInt((b.openingTime || "09:00").split(":")[0], 10);
    let closeH = parseInt((b.closingTime || "20:00").split(":")[0], 10);
    if (!(openH >= 0 && closeH > openH)) { openH = 9; closeH = 20; }

    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });

    let html = '<div class="bq-cal-head">Time</div>' + dates.map(d => `
      <div class="bq-cal-head ${d.toDateString() === today.toDateString() ? "today" : ""}">
        ${d.toLocaleDateString("en-IN", { weekday: "short" })}<b>${d.getDate()}</b>
      </div>`).join("");

    for (let h = openH; h <= closeH; h++) {
      const hh = String(h).padStart(2, "0");
      html += `<div class="bq-cal-time">${hh}:00</div>`;
      dates.forEach(d => {
        const iso = isoDate(d);
        const events = window.bqAppointments.filter(a =>
          a.date === iso && String(a.start || "").slice(0, 2) === hh);
        html += `<div class="bq-cal-cell ${d.toDateString() === today.toDateString() ? "today" : ""}">
          ${events.map(a => `
            <div class="bq-event ${esc(a.status)}" title="${esc(a.service)}">
              <b>${esc(a.customer)}</b>${esc(a.start)} · ${esc(a.service)}
            </div>`).join("")}
        </div>`;
      });
    }
    grid.innerHTML = html;
  };

  /* ---------------- STAFF (saved on this device) ---------------- */
  const STAFF_KEY = "barberStaff";
  const readStaff = () => {
    try { return JSON.parse(localStorage.getItem(STAFF_KEY) || "[]"); } catch (e) { return []; }
  };
  const writeStaff = list => {
    try { localStorage.setItem(STAFF_KEY, JSON.stringify(list)); return true; }
    catch (e) { toast("⚠️", "Could not save team data"); return false; }
  };

  window.bqLoadStaff = function () {
    const grid = $("bq-staff-grid");
    if (!grid) return;
    const b = S.barber || {};
    const cards = [];

    if (b.name) {
      cards.push(`
        <div class="bq-staff-card">
          <span class="bq-staff-rating">⭐ ${Number(b.rating) > 0 ? Number(b.rating).toFixed(1) : "—"}</span>
          <div class="bq-staff-head">
            <div class="bq-staff-av">${b.photo ? `<img src="${esc(b.photo)}" alt="">` : esc(b.name.charAt(0).toUpperCase())}</div>
            <div><div class="bq-staff-name">${esc(b.name)}</div><div class="bq-staff-sub">Owner · ${esc(b.shopName || "Shop")}</div></div>
          </div>
          <div class="bq-staff-spec"><span>Role</span><strong>Owner / Head barber</strong></div>
          <div class="bq-staff-metrics">
            <div><span>Done today</span><strong>${S.doneCnt || 0}</strong></div>
            <div><span>Reviews</span><strong>${Number(b.ratingCount) || 0}</strong></div>
          </div>
        </div>`);
    }

    readStaff().forEach(m => cards.push(`
      <div class="bq-staff-card">
        <div class="bq-staff-head">
          <div class="bq-staff-av">${esc(String(m.name || "?").charAt(0).toUpperCase())}</div>
          <div><div class="bq-staff-name">${esc(m.name)}</div><div class="bq-staff-sub">${esc(m.phone ? "+91 " + m.phone : "Team member")}</div></div>
        </div>
        <div class="bq-staff-spec"><span>Specialist</span><strong>${esc(m.role || "Barber")}</strong></div>
        <button class="btn btn-outline btn-sm bq-staff-del" onclick="bqDeleteStaff('${esc(m.id)}')">Remove</button>
      </div>`));

    grid.innerHTML = cards.length ? cards.join("") : `
      <div class="bq-empty-card"><span>♙</span><strong>No team members yet</strong>
        <p>Tap “＋ Add” to add your first team member.</p></div>`;
  };

  window.bqOpenStaffModal = function () {
    ["bq-staff-name", "bq-staff-role", "bq-staff-phone"].forEach(id => { const n = $(id); if (n) n.value = ""; });
    openModal("m-staff");
  };

  window.bqAddStaff = function () {
    const name = $("bq-staff-name").value.trim();
    const role = $("bq-staff-role").value.trim();
    const phone = $("bq-staff-phone").value.replace(/\D/g, "").slice(-10);
    if (!name) { toast("⚠️", "Please enter a name"); return; }
    if ($("bq-staff-phone").value.trim() && phone.length !== 10) {
      toast("⚠️", "Enter a valid 10-digit phone number"); return;
    }
    const list = readStaff();
    list.push({ id: "st" + Date.now(), name, role, phone });
    if (!writeStaff(list)) return;
    closeModal("m-staff");
    bqLoadStaff();
    toast("✅", name + " added to your team");
  };

  window.bqDeleteStaff = function (id) {
    if (!confirm("Remove this team member?")) return;
    writeStaff(readStaff().filter(m => m.id !== id));
    bqLoadStaff();
    toast("🗑️", "Team member removed");
  };

  /* ---------------- SETTINGS ---------------- */
  const UPI_KEY = "barberUpi";
  let pending = { "bq-shop-photo-preview": null, "bq-upi-qr-preview": null };

  window.bqJump = function (id) {
    const n = $(id);
    if (n) n.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.bqRenderSettings = function () {
    const b = (window.S && S.barber) || {};
    setText("bq-settings-shop", b.shopName || "Not set");
    setText("bq-settings-owner", b.name || "Not set");
    setText("bq-settings-address", b.address || "Not set");
    setText("bq-settings-hours", [b.openingTime, b.closingTime].filter(Boolean).join(" – ") || "Not set");

    const photo = $("bq-shop-photo-preview");
    if (photo && b.photo && !pending["bq-shop-photo-preview"]) { photo.src = b.photo; photo.hidden = false; }

    let upi = {};
    try { upi = JSON.parse(localStorage.getItem(UPI_KEY) || "{}"); } catch (e) {}
    const idEl = $("bq-upi-id");
    if (idEl && !idEl.value) idEl.value = upi.id || "";
    const qr = $("bq-upi-qr-preview");
    if (qr && upi.qr && !pending["bq-upi-qr-preview"]) { qr.src = upi.qr; qr.hidden = false; }
  };

  window.bqPreviewImage = function (input, previewId) {
    const file = input && input.files && input.files[0];
    const preview = $(previewId);
    if (!file || !preview) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      input.value = ""; toast("⚠️", "Please choose a JPG, PNG or WebP image"); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      input.value = ""; toast("⚠️", "Image must be smaller than 5 MB"); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.hidden = false;
      pending[previewId] = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.bqSaveSettings = function () {
    const msg = $("bq-settings-message");
    const upiId = ($("bq-upi-id")?.value || "").trim();
    const newPhoto = pending["bq-shop-photo-preview"];
    const newQr = pending["bq-upi-qr-preview"];

    if (upiId && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(upiId)) {
      toast("⚠️", "Enter a valid UPI ID, e.g. name@bank"); return;
    }
    if (!newPhoto && !newQr && !upiId) {
      if (msg) msg.textContent = "Choose a photo, QR code or enter a UPI ID first."; return;
    }

    const done = [];
    if (newPhoto) {
      S.barber.photo = newPhoto;
      syncBarberToCustomerShop();
      saveBarberProfileLocal();
      renderBarberProfile();
      pending["bq-shop-photo-preview"] = null;
      done.push("shop photo");
    }
    if (newQr || upiId) {
      let old = {};
      try { old = JSON.parse(localStorage.getItem(UPI_KEY) || "{}"); } catch (e) {}
      try {
        localStorage.setItem(UPI_KEY, JSON.stringify({ id: upiId || old.id || "", qr: newQr || old.qr || "" }));
        pending["bq-upi-qr-preview"] = null;
        done.push("UPI details");
      } catch (e) { toast("⚠️", "Could not save UPI details on this device"); }
    }
    if (msg) msg.textContent = "Saved: " + done.join(" and ") + ".";
    if (done.length) toast("✅", "Settings saved");
  };

  /* ---------------- AUTO-REFRESH HOOKS ---------------- */
  const visible = id => { const n = $(id); return n && n.style.display === "block"; };

  const oldRenderBQ = window.renderBQ;
  if (typeof oldRenderBQ === "function") {
    window.renderBQ = function () {
      const out = oldRenderBQ.apply(this, arguments);
      if (visible("b-dashboard-tab")) bqRefreshOverview();
      return out;
    };
  }

  setInterval(() => {
    if (S.role !== "barber") return;
    if (visible("b-dashboard-tab")) bqRefreshOverview();
    if (visible("b-staff-tab")) bqLoadStaff();
  }, 4000);
})();

/* =========================================================
   BARBERQ — QUEUE → BOOKINGS / CALENDAR BRIDGE
   Every customer who joins the live queue becomes a booking.
   Queue, services, analytics and profile code is untouched.
   ========================================================= */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, "0");
  const isoDate = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const hhmm = d => pad(d.getHours()) + ":" + pad(d.getMinutes());
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const OPEN = ["pending", "confirmed"];
  const storeKey = shop => "barberBookings:" + shop;

  let activeShop = "";
  const doneIds = new Set();   // tokens the barber just pressed "Done" on

  function readStore(shop) {
    try { return JSON.parse(localStorage.getItem(storeKey(shop)) || "[]"); }
    catch (e) { return []; }
  }
  function writeStore() {
    if (!activeShop) return;
    try {
      localStorage.setItem(storeKey(activeShop),
        JSON.stringify(window.bqAppointments.slice(-500)));
    } catch (e) { console.warn("Could not save bookings:", e); }
  }
  const visible = id => { const n = $(id); return !!n && n.style.display === "block"; };

  /* ---- sync live queue (S.bq) into bookings ---- */
  function sync(reconcile) {
    const shop = S.barber && S.barber.shopName;
    if (!shop) return;

    if (activeShop !== shop) {
      activeShop = shop;
      window.bqAppointments = readStore(shop);
    }
    if (!Array.isArray(window.bqAppointments)) window.bqAppointments = [];

    const list = window.bqAppointments;
    const live = Array.isArray(S.bq) ? S.bq : [];
    const liveIds = new Set(live.map(q => String(q.id)));
    let changed = false;

    live.forEach(q => {
      if (q.id == null) return;
      const status = q.st === "cur" ? "confirmed" : "pending";
      const found = list.find(a => String(a.id) === String(q.id));

      if (!found) {
        const now = new Date();
        const dur = Number(q.dur) || 20;
        const end = new Date(now.getTime() + dur * 60000);
        list.push({
          id: q.id, token: q.tok, customer: q.name, service: q.svc,
          date: isoDate(now), start: hhmm(now), end: hhmm(end),
          dur, status, source: "queue"
        });
        changed = true;
      } else if (OPEN.includes(found.status) && found.status !== status) {
        found.status = status;
        changed = true;
      }
    });

    // Entries that left the queue after a successful refresh
    if (reconcile) {
      list.forEach(a => {
        if (a.source === "queue" && OPEN.includes(a.status) && !liveIds.has(String(a.id))) {
          a.status = doneIds.has(String(a.id)) ? "completed" : "cancelled";
          changed = true;
        }
      });
    }

    if (changed) writeStore();
  }

  function repaint() {
    if (visible("b-bookings-tab")) window.bqRenderBookings();
    if (visible("b-calendar-tab")) window.bqRenderCalendar();
  }

  /* ---- hook queue loading (runs every 5 s already) ---- */
  const origLoad = window.loadBarberQueue;
  window.loadBarberQueue = async function () {
    const before = S.bq;
    const result = await origLoad.apply(this, arguments);
    const ok = S.bq !== before;      // S.bq is replaced only on a successful load
    sync(ok);
    repaint();
    return result;
  };

  /* ---- remember which token the barber completed ---- */
  const origDone = window.doneToken;
  window.doneToken = async function () {
    const cur = S.bq && S.bq[0];
    if (cur && cur.id != null) doneIds.add(String(cur.id));
    try { return await origDone.apply(this, arguments); }
    finally { if (cur && cur.id != null) doneIds.delete(String(cur.id)); }
  };

  /* ---- BOOKINGS TABLE ---- */
  window.bqRenderBookings = function () {
    const body = $("bq-bookings-body");
    if (!body) return;
    sync(false);

    const search = ($("bq-booking-search")?.value || "").trim().toLowerCase();
    const filter = $("bq-booking-filter")?.value || "all";
    const all = (window.bqAppointments || []).slice().reverse();   // newest first

    const rows = all.filter(a =>
      (filter === "all" || a.status === filter) &&
      (!search || [a.customer, a.service, a.token].some(v =>
        String(v || "").toLowerCase().includes(search))));

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="5" class="bq-empty">${
        all.length ? "No bookings match your filters." : "No appointments yet."}</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(a => `
      <tr>
        <td><strong>${a.token != null ? "#" + esc(a.token) + " · " : ""}${esc(a.customer)}</strong></td>
        <td>${esc(a.service)}</td>
        <td>${esc(a.date)}<br><span class="bq-muted">${esc(a.start)}${a.end ? " – " + esc(a.end) : ""}</span></td>
        <td><span class="bq-badge ${esc(a.status)}">${esc(a.status)}</span></td>
        <td>
          <select class="bq-status-select" onchange="bqSetStatus('${esc(a.id)}',this.value)">
            ${["pending", "confirmed", "completed", "cancelled"].map(s =>
              `<option value="${s}" ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </td>
      </tr>`).join("");
  };

  window.bqSetStatus = function (id, status) {
    const a = (window.bqAppointments || []).find(x => String(x.id) === String(id));
    if (!a) return;
    a.status = status;
    writeStore();
    window.bqRenderBookings();
    if (visible("b-calendar-tab")) window.bqRenderCalendar();
    toast("✅", "Booking marked " + status);
  };

  /* ---- CALENDAR (hour range grows to include every booking) ---- */
  let weekOffset = 0;
  window.bqCalendarToday = function () { weekOffset = 0; window.bqRenderCalendar(); };
  window.bqChangeWeek = function (dir) { weekOffset += Number(dir) || 0; window.bqRenderCalendar(); };

  window.bqRenderCalendar = function () {
    const grid = $("bq-calendar-grid");
    const range = $("bq-calendar-range");
    if (!grid || !range) return;
    sync(false);

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = d => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    range.textContent = fmt(start) + " – " + fmt(end);

    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
    const isoSet = new Set(dates.map(isoDate));
    const weekItems = (window.bqAppointments || []).filter(a => isoSet.has(a.date));

    const b = (window.S && S.barber) || {};
    let openH = parseInt((b.openingTime || "09:00").split(":")[0], 10);
    let closeH = parseInt((b.closingTime || "20:00").split(":")[0], 10);
    if (!(openH >= 0 && closeH > openH)) { openH = 9; closeH = 20; }

    weekItems.forEach(a => {
      const h = parseInt(String(a.start || "").slice(0, 2), 10);
      if (h >= 0) { openH = Math.min(openH, h); closeH = Math.max(closeH, h); }
    });

    let html = '<div class="bq-cal-head">Time</div>' + dates.map(d => `
      <div class="bq-cal-head ${d.toDateString() === today.toDateString() ? "today" : ""}">
        ${d.toLocaleDateString("en-IN", { weekday: "short" })}<b>${d.getDate()}</b>
      </div>`).join("");

    for (let h = openH; h <= closeH; h++) {
      const hh = pad(h);
      html += `<div class="bq-cal-time">${hh}:00</div>`;
      dates.forEach(d => {
        const iso = isoDate(d);
        const events = weekItems.filter(a =>
          a.date === iso && String(a.start || "").slice(0, 2) === hh);
        html += `<div class="bq-cal-cell ${d.toDateString() === today.toDateString() ? "today" : ""}">
          ${events.map(a => `
            <div class="bq-event ${esc(a.status)}" title="${esc(a.service)} · ${esc(a.status)}">
              <b>${a.token != null ? "#" + esc(a.token) + " " : ""}${esc(a.customer)}</b>${esc(a.start)} · ${esc(a.service)}
            </div>`).join("")}
        </div>`;
      });
    }
    grid.innerHTML = html;
  };

  /* first pass in case the queue is already loaded */
  sync(false);
})();

/* =========================================================
   BARBERQ — KEEP SETTINGS "BUSINESS INFORMATION" IN SYNC
   ========================================================= */
(function () {
  "use strict";

  const settingsVisible = () => {
    const n = document.getElementById("b-settings-tab");
    return !!n && n.style.display === "block";
  };

  // saveBarberProfile(), updateShopPhoto() and the stats refresh all end by
  // calling renderBarberProfile(), so hooking it covers every profile change.
  const baseRenderBarberProfile = window.renderBarberProfile;
  window.renderBarberProfile = function () {
    const out = baseRenderBarberProfile.apply(this, arguments);
    if (typeof window.bqRenderSettings === "function") window.bqRenderSettings();
    return out;
  };

  // Also repaint right after the Save button, in case the profile was saved
  // while another flow is running.
  const baseSave = window.saveBarberProfile;
  window.saveBarberProfile = function () {
    const out = baseSave.apply(this, arguments);
    if (settingsVisible() && typeof window.bqRenderSettings === "function") {
      window.bqRenderSettings();
    }
    return out;
  };

  // Fill the boxes immediately if the tab is already open when this loads.
  if (settingsVisible()) window.bqRenderSettings();
})();
window.S = S;   // expose the state object so the add-on code can read S.barber

/* =========================================================
   BARBERQ — LIVE WAIT ESTIMATE FROM THE QUEUE
   Wait for a new customer = total duration of everyone in the queue.
   ========================================================= */
(function () {
  "use strict";

  function liveWait() {
    const q = Array.isArray(S.bq) ? S.bq : [];
    return q.reduce((t, c) => t + (Number(c.dur) || 0), 0);
  }

  function paintWait() {
    if (S.role !== "barber") return;
    const w = liveWait();
    ["b-wait", "bq-overview-wait"].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.textContent !== String(w)) el.textContent = w;
    });
  }

  // repaint whenever the queue or dashboard re-renders
  const baseRenderBQ = window.renderBQ;
  window.renderBQ = function () {
    const out = baseRenderBQ.apply(this, arguments);
    paintWait();
    return out;
  };

  const baseOverview = window.bqRefreshOverview;
  if (typeof baseOverview === "function") {
    window.bqRefreshOverview = function () {
      const out = baseOverview.apply(this, arguments);
      paintWait();
      return out;
    };
  }

  // the backend refresh runs on its own 6-second timer and overwrites the
  // value, so correct it again every second
  setInterval(paintWait, 1000);
  paintWait();
})();

/* =========================================================
   BARBERQ — DEMO CUSTOMER MUST REGISTER BEFORE RATING
   Registered (OTP-login) customers are not affected.
   ========================================================= */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const digits10 = p => String(p || "").replace(/\D/g, "").slice(-10);
  const isDemo = () => digits10(S.user && S.user.phone).length !== 10;

  let allowRate = false;   // lets the rating modal open right after registering

  /* ---- build the registration modal once ---- */
  function ensureModal() {
    if ($("m-demoreg")) return;
    const wrap = document.createElement("div");
    wrap.className = "overlay";
    wrap.id = "m-demoreg";
    wrap.innerHTML = `
      <div class="modal">
        <div style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif;margin-bottom:6px;">Register to leave a rating</div>
        <p style="color:var(--txt2);font-size:13px;margin:0 0 18px;line-height:1.5">
          Please add your name and phone number first. Your visit and rating will be saved to your profile.</p>
        <div style="margin-bottom:14px">
          <label>Full Name</label>
          <input class="inp" id="demoreg-name" type="text" maxlength="50" placeholder="Your name">
        </div>
        <div style="margin-bottom:20px">
          <label>Phone Number</label>
          <input class="inp" id="demoreg-phone" type="tel" maxlength="10" inputmode="numeric" placeholder="10-digit mobile number">
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-outline" style="flex:1" type="button" id="demoreg-cancel">Cancel</button>
          <button class="btn btn-gold" style="flex:1" type="button" id="demoreg-save">Register &amp; Rate</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    $("demoreg-cancel").addEventListener("click", () => {
      closeModal("m-demoreg");
      toast("ℹ️", "Register to leave a rating");
    });
    $("demoreg-save").addEventListener("click", registerDemo);
    $("demoreg-phone").addEventListener("input", e => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    });
    wrap.addEventListener("keydown", e => { if (e.key === "Enter") registerDemo(); });
  }

  function openRegister() {
    ensureModal();
    $("demoreg-name").value = (S.user && S.user.name && S.user.name !== "Customer") ? S.user.name : "";
    $("demoreg-phone").value = "";
    openModal("m-demoreg");
    setTimeout(() => $("demoreg-name").focus(), 100);
  }

  /* ---- save the new customer, keep this visit, merge any old record ---- */
  function registerDemo() {
    const name = $("demoreg-name").value.trim();
    const phone = $("demoreg-phone").value.replace(/\D/g, "");

    if (name.length < 2) { toast("⚠️", "Please enter your name"); $("demoreg-name").focus(); return; }
    if (!/^\d{10}$/.test(phone)) { toast("⚠️", "Enter a valid 10-digit phone number"); $("demoreg-phone").focus(); return; }

    const existing = getAllCustomers()[phone];

    S.user.name = name;
    S.user.phone = "+91 " + phone;
    if (!S.user.location || S.user.location === "Not set") {
      S.user.location = (existing && existing.location) || "Not set";
    }

    // if this number already has a saved profile, keep its history too
    if (existing) {
      const merge = (mine, theirs, keyOf) => {
        const seen = new Set((mine || []).map(keyOf));
        (theirs || []).forEach(x => { if (!seen.has(keyOf(x))) mine.push(x); });
        return mine;
      };
      S.queueHistory = merge(S.queueHistory || [], existing.queueHistory, v => String(v.entryId || v.timestamp));
      S.ratedShops = merge(S.ratedShops || [], existing.ratedShops, r => [r.shopId, r.date, r.rating, r.review].join("|"));
      S.payments = merge(S.payments || [], existing.payments, p => String(p.id));
      S.paymentMethods = Array.from(new Set([...(S.paymentMethods || []), ...(existing.paymentMethods || [])]));
    }

    if (!saveCurrentCustomer()) return;
    updateUserAvatar();
    closeModal("m-demoreg");
    toast("✅", "Registered — please rate your visit");

    // now show the rating form
    allowRate = true;
    try { openModal("m-rate"); } finally { allowRate = false; }
  }

  /* ---- gate the rating modal ---- */
  const baseOpenModal = openModal;
  openModal = function (id) {
    if (id === "m-rate" && !allowRate && isDemo()) {
      openRegister();
      return;
    }
    baseOpenModal(id);
  };

  /* ---- safety net: never submit a rating without a registered number ---- */
  const baseSubmitRating = submitRating;
  submitRating = function () {
    if (isDemo()) {
      closeModal("m-rate");
      openRegister();
      return;
    }
    return baseSubmitRating.apply(this, arguments);
  };

  /* ---- send the customer's name/phone along with the rating ---- */
  const baseFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    try {
      if (typeof url === "string" && /\/api\/ratings$/.test(url) &&
          opts && typeof opts.body === "string") {
        const body = JSON.parse(opts.body);
        body.customer_name = S.user.name || "";
        body.customer_phone = digits10(S.user.phone);
        opts = Object.assign({}, opts, { body: JSON.stringify(body) });
      }
    } catch (e) {}
    return baseFetch(url, opts);
  };
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const LABEL = { male: "👨 Men", female: "👩 Women", unisex: "👥 Unisex" };
  const genderOf = s => (s && s.gender) || "unisex";

  const DEMO_TYPES = {
    "royal cuts": "male",
    "the blade room": "male",
    "style studio": "unisex",
    "classic barber": "male"
  };
  S.shops.forEach(s => {
    if (!s.gender) s.gender = DEMO_TYPES[String(s.name).toLowerCase()] || "unisex";
  });

  function ensureTypeField() {
    if ($("bp-type")) return;
    const shopInput = $("bp-shop");
    if (!shopInput) return;
    const box = document.createElement("div");
    box.innerHTML = `
      <label>Shop Type</label>
      <select class="inp" id="bp-type">
        <option value="male">Male (men only)</option>
        <option value="female">Female (women only)</option>
        <option value="unisex">Unisex (men &amp; women)</option>
      </select>`;
    shopInput.parentElement.insertAdjacentElement("afterend", box);
  }

  const baseEdit = window.editBarberProfile;
  window.editBarberProfile = function () {
    ensureTypeField();
    const out = baseEdit.apply(this, arguments);
    const sel = $("bp-type");
    if (sel) sel.value = (S.barber && S.barber.shopType) || "unisex";
    return out;
  };

  // 2) save it with the rest of the profile (it is persisted by saveBarberProfileLocal)
  const baseSave = window.saveBarberProfile;
  window.saveBarberProfile = function () {
    const sel = $("bp-type");
    const prev = S.barber.shopType;
    if (sel) S.barber.shopType = sel.value;
    const out = baseSave.apply(this, arguments);
    const modal = $("m-editbarber");
    if (modal && modal.classList.contains("open")) S.barber.shopType = prev; // validation failed
    return out;
  };

  // 3) copy it onto the public shop that customers see
  const baseSync = window.syncBarberToCustomerShop;
  window.syncBarberToCustomerShop = function () {
    const out = baseSync.apply(this, arguments);
    const shop = S.shops.find(s => s.isBarberProfile);
    if (shop) {
      const g = (S.barber && S.barber.shopType) || "unisex";
      if (shop.gender !== g) {
        shop.gender = g;
        publishBarberShop();
      }
    }
    return out;
  };

  const baseSettings = window.bqRenderSettings;
  window.bqRenderSettings = function () {
    const out = baseSettings.apply(this, arguments);
    const grid = document.querySelector("#b-settings-tab .bq-shop-info");
    if (grid) {
      if (!$("bq-settings-type")) {
        const d = document.createElement("div");
        d.innerHTML = '<span>Shop type</span><strong id="bq-settings-type"></strong>';
        grid.appendChild(d);
      }
      const g = (S.barber && S.barber.shopType) || "";
      $("bq-settings-type").textContent = g ? LABEL[g] : "Not set";
    }
    return out;
  };

  S.genderFilter = S.genderFilter || "all";

  function genderMatch(s) {
    const f = S.genderFilter;
    if (f === "all") return true;
    const g = genderOf(s);
    if (f === "unisex") return g === "unisex";
    return g === f || g === "unisex";
  }

  const baseVisible = window.bqVisibleShops;
  window.bqVisibleShops = function () {
    return baseVisible.apply(this, arguments).filter(genderMatch);
  };

  function decorateCards() {
    document.querySelectorAll("#shop-list .shop-card").forEach(card => {
      if (card.querySelector("[data-gender-tag]")) return;
      const m = /openShop\((\d+)\)/.exec(card.getAttribute("onclick") || "");
      const shop = m && S.shops.find(s => s.id === Number(m[1]));
      const row = card.querySelector(".tag.tgray");
      if (!shop || !row) return;
      const t = document.createElement("span");
      t.className = "tag tgray";
      t.setAttribute("data-gender-tag", "1");
      t.textContent = LABEL[genderOf(shop)];
      row.parentElement.appendChild(t);
    });
  }

  const baseRenderShops = window.renderShops;
  window.renderShops = function () {
    const out = baseRenderShops.apply(this, arguments);
    decorateCards();
    return out;
  };

  const CHIPS = [
    { key: "male", text: "👨 Male" },
    { key: "female", text: "👩 Female" },
    { key: "unisex", text: "👥 Unisex" }
  ];

  (async function addGenderChips() {
    try { await componentsReady; } catch (e) { return; }
    const home = $("cust-home");
    if (!home) return;

    const existing = [...home.querySelectorAll("span.tag")].filter(el =>
      /All|Top Rated|Nearby|Open Now/.test(el.textContent));
    if (!existing.length || home.querySelector("[data-gender]")) return;

    const last = existing[existing.length - 1];
    const allChip = existing.find(el => /^\s*All\s*$/.test(el.textContent));
    if (last.parentElement) last.parentElement.style.overflowX = "auto";

    let anchor = last;
    const mine = CHIPS.map(c => {
      const el = document.createElement("span");
      el.className = "tag tgray";
      el.dataset.gender = c.key;
      el.textContent = c.text;
      el.style.cssText = "cursor:pointer;flex-shrink:0;white-space:nowrap";
      anchor.insertAdjacentElement("afterend", el);
      anchor = el;
      return el;
    });

    const paint = () => {
      mine.forEach(el => {
        el.className = "tag " + (el.dataset.gender === S.genderFilter ? "tg" : "tgray");
      });
      if (allChip && S.genderFilter !== "all") allChip.className = "tag tgray";
    };

    mine.forEach(el => el.addEventListener("click", () => {
      S.genderFilter = S.genderFilter === el.dataset.gender ? "all" : el.dataset.gender;
      renderShops();
      paint();
    }));

    existing.forEach(el => el.addEventListener("click", () => {
      if (el === allChip) S.genderFilter = "all";
      setTimeout(() => { renderShops(); paint(); }, 0);
    }));

    paint();
  })();
})();

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const isNewShop = () => !(S.barber && S.barber.shopName);
  function prepareTypeField() {
    const sel = $("bp-type");
    if (!sel) return;

    if (!sel.querySelector('option[value=""]')) {
      const ph = document.createElement("option");
      ph.value = "";
      ph.disabled = true;
      ph.textContent = "Select shop type…";
      sel.insertBefore(ph, sel.firstChild);
    }
    const label = sel.parentElement.querySelector("label");
    if (label && !/\*/.test(label.textContent)) label.textContent = "Shop Type *";

    sel.value = (S.barber && S.barber.shopType) || "";
  }

  function setRegistrationMode() {
    const modal = $("m-editbarber");
    if (!modal) return;
    const title = modal.querySelector(".modal > div");
    const saveBtn = modal.querySelector("button.btn-gold");
    const reg = isNewShop();
    if (title) title.textContent = reg ? "Register Your Shop" : "Edit Barber Profile";
    if (saveBtn) saveBtn.textContent = reg ? "Register Shop" : "Save Changes";
  }

  const baseEdit = window.editBarberProfile;
  window.editBarberProfile = function () {
    const out = baseEdit.apply(this, arguments);
    prepareTypeField();
    setRegistrationMode();
    return out;
  };
  const baseSave = window.saveBarberProfile;
  window.saveBarberProfile = function () {
    const sel = $("bp-type");
    if (sel && !sel.value) {
      toast("⚠️", "Please select your shop type (Male, Female or Unisex)");
      sel.focus();
      return;
    }
    const wasNew = isNewShop();
    const out = baseSave.apply(this, arguments);
    if (wasNew && !isNewShop()) toast("🎉", "Your shop is registered!");
    return out;
  };

  const baseGo = window.go;
  window.go = function (id) {
    const out = baseGo.apply(this, arguments);
    if (id === "s-barb" && S.role === "barber" && isNewShop()) {
      setTimeout(() => {
        const modal = $("m-editbarber");
        if (modal && !modal.classList.contains("open")) window.editBarberProfile();
      }, 400);
    }
    return out;
  };
})();

/* =========================================================
   BARBERQ — REAL "DELETE ACCOUNT" FOR BARBERS
   Wipes the saved profile, public shop, services, team,
   bookings and UPI details, so it differs from Logout.
   ========================================================= */
(function () {
  "use strict";

  const DEFAULT_SERVICES = [
    { id: 1, name: "Hair Cut", price: 250, dur: 20, ico: "💇" },
    { id: 2, name: "Beard Trim", price: 150, dur: 15, ico: "🧔" },
    { id: 3, name: "Hair Color", price: 800, dur: 60, ico: "🎨" },
    { id: 4, name: "Facial", price: 600, dur: 45, ico: "✨" },
    { id: 5, name: "Hair Spa", price: 1200, dur: 90, ico: "💆" }
  ];

  window.deleteBarberAccount = function () {
    const shop = S.barber && S.barber.shopName;
    const msg = "Delete your barber account permanently?\n\n" +
      "This removes your profile, shop listing, services, team, bookings " +
      "and UPI details from this device. It cannot be undone.";
    if (!confirm(msg)) return;

    // 1) saved data on this browser
    try {
      ["barberProfile", "barberProfilePhoto", "barberServices",
       "barberStaff", "barberUpi"].forEach(k => localStorage.removeItem(k));
      Object.keys(localStorage)
        .filter(k => k.indexOf("barberBookings:") === 0)
        .forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem("barberqView");
    } catch (e) { console.warn("Could not clear saved data:", e); }

    // 2) remove the shop customers see (also clears barberShopPublic)
    unpublishBarberShop();

    // 3) reset everything held in memory
    S.barber = {
      name: "", phone: "", shopName: "", address: "",
      openingTime: "", closingTime: "", rating: 0, ratingCount: 0,
      payoutBank: "", payoutLast4: "", photo: "", onlineCollected: 0, shopType: ""
    };
    S.services = DEFAULT_SERVICES.map(s => Object.assign({}, s));
    S.bq = [];
    S.earn = 0;
    S.doneCnt = 0;
    S.barberStats = null;
    S.shopOpen = true;
    window.bqAppointments = [];

    S.role = null;
    toast("Your barber account was deleted");
    setTimeout(() => go("s-land"), 700);
  };
})();

(function () {
  'use strict';
  const CREW = 'bqShopCrew:', ASSIGN = 'bqCrewAssign:';
  const k = (p, n) => p + String(n || '').trim().toLowerCase();
  const rd = (key, d) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || d; } catch (e) { return d; } };
  const wr = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- barber side: publish crew list for this shop ---------- */
  function publishCrew() {
    try {
      const b = S.barber || {};
      if (!b.shopName) return;
      const list = [];
      if (b.name) list.push({ id: 'owner', name: b.name, role: 'Owner / Head barber' });
      rd('barberStaff', []).forEach(m => list.push({ id: m.id, name: m.name, role: m.role || 'Barber' }));
      wr(k(CREW, b.shopName), list);
    } catch (e) { /* ignore */ }
  }
  setInterval(publishCrew, 3000); publishCrew();

  /* ---------- customer side: chooser inside Join popup ---------- */
  let picked = '';                 // '' = anyone
  let pickedFor = null;

  function renderPicker() {
    const host = document.getElementById('m-svcs');
    if (!host) return;
    const s = S.shops[S.selectedShop];
    let box = document.getElementById('bq-crew-pick');
    if (!box) {
      box = document.createElement('div');
      box.id = 'bq-crew-pick';
      box.style.cssText = 'margin:14px 0 4px';
      host.insertAdjacentElement('afterend', box);
      box.addEventListener('click', e => {
        const c = e.target.closest('[data-crew]');
        if (!c) return;
        picked = c.getAttribute('data-crew');
        renderPicker();
      });
    }
    if (!s) { box.innerHTML = ''; return; }
    if (pickedFor !== s.name) { pickedFor = s.name; picked = ''; }
    const crew = rd(k(CREW, s.name), []);
    const chip = (val, title, sub, on) =>
      '<button type="button" data-crew="' + esc(val) + '" style="flex:0 0 auto;min-width:104px;text-align:left;padding:10px 12px;border-radius:12px;cursor:pointer;font:inherit;color:inherit;' +
      'background:' + (on ? 'var(--gdim)' : 'var(--s2)') + ';border:1.5px solid ' + (on ? 'var(--gold)' : 'var(--b1)') + '">' +
      '<div style="font-weight:600;font-size:13px">' + esc(title) + '</div>' +
      '<div style="font-size:11px;color:var(--txt2);margin-top:2px">' + esc(sub) + '</div></button>';
    box.innerHTML =
      '<div style="font-size:13px;font-weight:600;margin-bottom:8px">Choose your barber</div>' +
      '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">' +
      chip('', 'Anyone', 'First available', picked === '') +
      crew.map(m => chip(m.name, m.name, m.role, picked === m.name)).join('') +
      '</div>';
  }

  const _build = window.buildJoinModal;
  window.buildJoinModal = function () {
    const r = _build.apply(this, arguments);
    renderPicker();
    return r;
  };

  /* send the choice with the booking and remember it per queue entry */
  const _fin = window.finalizeJoin;
  window.finalizeJoin = async function (p, s, paidOnline, extra) {
    extra = Object.assign({}, extra || {});
    const who = picked;
    extra.staff_name = who || 'Anyone';
    const before = S.myQueueEntryId;
    const r = await _fin.call(this, p, s, paidOnline, extra);
    try {
      if (s && S.myQueueEntryId && S.myQueueEntryId !== before) {
        const key = k(ASSIGN, s.name), m = rd(key, {});
        m[String(S.myQueueEntryId)] = who || 'Anyone';
        wr(key, m);
      }
    } catch (e) { /* ignore */ }
    return r;
  };

  /* ---------- barber side: show the requested barber on queue rows ---------- */
  const _bq = window.renderBQ;
  window.renderBQ = function () {
    const r = _bq.apply(this, arguments);
    try {
      const shop = S.barber && S.barber.shopName;
      if (!shop) return r;
      const m = rd(k(ASSIGN, shop), {});
      const rows = document.querySelectorAll('#b-qlist .qi');
      rows.forEach((row, i) => {
        const q = S.bq[i];
        if (!q) return;
        const who = q.staff || m[String(q.id)];     // q.staff once backend returns it
        if (!who) return;
        const sub = row.querySelector('div[style*="font-size:12px"]');
        if (sub && !sub.querySelector('.bq-crew-tag'))
          sub.insertAdjacentHTML('beforeend', ' · <b class="bq-crew-tag" style="color:var(--gold)">' +
            (who === 'Anyone' ? 'Any barber' : '✂ ' + esc(who)) + '</b>');
      });
    } catch (e) { /* ignore */ }
    return r;
  };
})();

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rd = (key, d) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || d; } catch (e) { return d; } };
  const wr = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { toast('⚠️', 'Could not save on this device'); return false; } };
  const money = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fmtFull = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtShort = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtDay = d => d.toLocaleDateString('en-US', { weekday: 'short' });
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#ec4899', '#f59e0b', '#22d3ee', '#f87171', '#a3e635'];
  const GRADS = ['#7c6cff,#4338ca', '#14b8a6,#0f766e', '#3b82f6,#1d4ed8', '#ec4899,#be185d',
                 '#f59e0b,#b45309', '#22d3ee,#0e7490', '#f87171,#b91c1c', '#a3e635,#4d7c0f'];
  const STATUS = { 'Available': 'av', 'With Customer': 'wc', 'On Break': 'br', 'Off today': 'off' };
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const shopKey = () => String((S.barber && S.barber.shopName) || '').trim().toLowerCase();
  const K_ASSIGN = () => 'bqCrewAssign:' + shopKey();   // written by crew_picker.js
  const K_SERVED = () => 'bqServedBy:' + shopKey();     // owner's manual assignment
  const K_SALARY = () => 'bqStaffSalary:' + shopKey();  // { name: {fixed, pct} }
  const K_META = () => 'bqStaffMeta:' + shopKey();      // { name: {status, rating} }

  const TAB_ID = 'b-staffstats-tab';
  let period = '7';
  let cache = null;
  let chartGeom = null;
  let editing = null;

  /* ================= data ================= */
  function team() {
    const b = S.barber || {};
    const list = [];
    if (b.name) list.push({ name: b.name, role: 'Owner / Head barber' });
    rd('barberStaff', []).forEach(m => {
      if (m && m.name && !list.some(x => x.name === m.name)) list.push({ name: m.name, role: m.role || 'Barber' });
    });
    return list.map((m, i) => Object.assign(m, { i }));
  }

  function getRange() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const from = period === 'month'
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : addDays(today, -(Number(period) - 1));
    const days = [];
    for (let d = new Date(from); d <= today; d = addDays(d, 1)) days.push(new Date(d));
    const n = days.length;
    return {
      from, to: today, days, n,
      prevFrom: addDays(from, -n), prevTo: addDays(from, -1),
      label: period === '7' ? 'last 7 days' : period === '30' ? 'last 30 days' : 'this month',
      factor: Math.min(1, n / 30)
    };
  }

  const priceOf = a => {
    const s = (S.services || []).find(x => x.name === a.service);
    return s ? Number(s.price) || 0 : 0;
  };

  function compute() {
    const members = team();
    const meta = rd(K_META(), {}), salary = rd(K_SALARY(), {});
    const served = rd(K_SERVED(), {}), asked = rd(K_ASSIGN(), {});
    const r = getRange();
    const f = iso(r.from), t = iso(r.to), pf = iso(r.prevFrom), pt = iso(r.prevTo);

    const completed = (window.bqAppointments || []).filter(a => a && a.status === 'completed');
    const done = completed.filter(a => a.date >= f && a.date <= t);
    const prevCount = completed.filter(a => a.date >= pf && a.date <= pt).length;

    const dayIdx = {};
    r.days.forEach((d, i) => { dayIdx[iso(d)] = i; });

    const stats = {};
    members.forEach(m => { stats[m.name] = { count: 0, revenue: 0, daily: r.days.map(() => 0), svc: {} }; });
    const svcTotals = {}, weekdays = [0, 0, 0, 0, 0, 0, 0], unassigned = [];
    let revenue = 0;

    done.forEach(a => {
      const price = priceOf(a);
      revenue += price;
      svcTotals[a.service] = (svcTotals[a.service] || 0) + 1;
      weekdays[new Date(a.date + 'T00:00:00').getDay()]++;
      const key = String(a.id);
      const asking = asked[key] && asked[key] !== 'Anyone' ? asked[key] : '';
      const who = served[key] || asking;
      if (who && stats[who]) {
        const s = stats[who];
        s.count++; s.revenue += price;
        s.daily[dayIdx[a.date]]++;
        s.svc[a.service] = (s.svc[a.service] || 0) + 1;
      } else unassigned.push(a);
    });

    const maxCount = Math.max(0, ...members.map(m => stats[m.name].count));
    const rows = members.map(m => {
      const s = stats[m.name], sal = salary[m.name] || {}, mt = meta[m.name] || {};
      const fixed = Number(sal.fixed) || 0, pct = Number(sal.pct) || 0;
      const rating = Number(mt.rating) > 0 ? Number(mt.rating) : null;
      return {
        m, s, fixed, pct, rating,
        payable: fixed * r.factor + s.revenue * pct / 100,
        status: STATUS[mt.status] ? mt.status : 'Available',
        perf: maxCount ? Math.round(s.count / maxCount * 100) : 0
      };
    });
    return { r, rows, done, prevCount, revenue, svcTotals, weekdays, unassigned };
  }

  /* ================= render ================= */
  const setText = (id, v) => { const n = $(id); if (n) n.textContent = v; };
  const setTrend = (id, text, cls) => { const n = $(id); if (n) { n.textContent = text; n.className = 'sa-ktrend ' + (cls || ''); } };

  function renderHeader(c) {
    setText('sa-range-text', fmtFull(c.r.from) + ' - ' + fmtFull(c.r.to));
    setText('sa-dist-period', c.r.label);
    const sel = $('sa-period'); if (sel && sel.value !== period) sel.value = period;
    const b = S.barber || {}, av = $('sa-owner-av');
    if (av) {
      if (b.photo) av.innerHTML = '<img alt="" src="' + esc(b.photo) + '">';
      else av.textContent = initials(b.name || 'B');
    }
    const dot = $('sa-bell-dot'); if (dot) dot.hidden = !c.unassigned.length;
  }

  function renderKpis(c) {
    const n = c.rows.length;
    const active = c.rows.filter(x => x.status !== 'Off today').length;
    const rated = c.rows.filter(x => x.rating !== null);
    const avg = rated.length ? rated.reduce((t, x) => t + x.rating, 0) / rated.length : null;
    const cur = c.done.length, prev = c.prevCount;

    setText('sa-k-staff', n);
    setTrend('sa-k-staff-t', n ? (n > 1 ? 'Owner + ' + (n - 1) + ' crew' : 'Just you so far') : 'Add team members', n ? 'up' : 'mu');
    setText('sa-k-active', active);
    setTrend('sa-k-active-t', n ? Math.round(active / n * 100) + '% of team' : '—', 'up');
    setText('sa-k-rating', avg === null ? '—' : avg.toFixed(1));
    setTrend('sa-k-rating-t', rated.length ? rated.length + ' of ' + n + ' rated' : 'Add ratings with ✎', rated.length ? 'up' : 'mu');
    setText('sa-k-customers', cur);
    if (prev > 0) {
      const p = Math.round((cur - prev) / prev * 100);
      setTrend('sa-k-customers-t', (p >= 0 ? '↑ ' : '↓ ') + Math.abs(p) + '% from last period', p >= 0 ? 'up' : 'dn');
    } else setTrend('sa-k-customers-t', cur ? 'New activity this period' : 'No completed services yet', 'mu');
  }

  function smooth(pts, lo, hi) {
    const cl = v => Math.max(lo, Math.min(hi, v));
    let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + cl(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) +
           ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + cl(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) +
           ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }

  function renderChart(c) {
    const host = $('sa-chart'), leg = $('sa-chart-legend');
    if (!host) return;
    if (!c.rows.length) { host.innerHTML = '<div class="sa-empty">Add your name and team members to see performance.</div>'; leg.innerHTML = ''; chartGeom = null; return; }

    const n = c.r.n, W = 560, H = 240, L = 34, R = 12, T = 12, B = 40, pw = W - L - R, ph = H - T - B;
    const dataMax = Math.max(0, ...c.rows.flatMap(x => x.s.daily));
    const step = Math.max(1, Math.ceil(dataMax / 4)), max = step * 4;
    const x = i => n < 2 ? L + pw / 2 : L + i * pw / (n - 1);
    const y = v => T + ph - (v / max) * ph;

    let grid = '';
    for (let k = 0; k <= 4; k++) {
      const yy = y(k * step);
      grid += '<line class="sa-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/>' +
              '<text class="sa-ax" x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + (k * step) + '</text>';
    }
    const every = Math.max(1, Math.ceil(n / 7));
    c.r.days.forEach((d, i) => {
      if (i % every) return;
      if (n <= 7) grid += '<text class="sa-ax-s" x="' + x(i) + '" y="' + (H - 20) + '" text-anchor="middle">' + fmtDay(d) + '</text>' +
                          '<text class="sa-ax-s" x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + fmtShort(d) + '</text>';
      else grid += '<text class="sa-ax-s" x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + fmtShort(d) + '</text>';
    });

    let defs = '', series = '';
    c.rows.forEach(row => {
      const col = COLORS[row.m.i % COLORS.length];
      const pts = row.s.daily.map((v, i) => [x(i), y(v)]);
      defs += '<linearGradient id="sa-g' + row.m.i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".28"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient>';
      if (pts.length < 2) { series += '<circle cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="4" fill="' + col + '"/>'; return; }
      const d = smooth(pts, T, T + ph);
      series += '<path d="' + d + ' L' + pts[n - 1][0] + ',' + (T + ph) + ' L' + pts[0][0] + ',' + (T + ph) + ' Z" fill="url(#sa-g' + row.m.i + ')"/>' +
                '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    });

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Customers served per day by each staff member"><defs>' + defs + '</defs>' +
      grid + series + '<line class="sa-guide" id="sa-guide" x1="0" x2="0" y1="' + T + '" y2="' + (T + ph) + '"/></svg>' +
      '<div class="sa-tip" id="sa-tip" hidden></div>';
    chartGeom = { W, L, pw, n, x, days: c.r.days, rows: c.rows };

    leg.innerHTML = c.rows.map(row =>
      '<li><i style="background:' + COLORS[row.m.i % COLORS.length] + '"></i>' + esc(row.m.name.split(/\s+/)[0]) + '</li>').join('');
  }

  function onChartMove(e) {
    const host = $('sa-chart'), g = chartGeom;
    const svg = host && host.querySelector('svg'), tip = $('sa-tip'), guide = $('sa-guide');
    if (!svg || !g || !tip || !guide) return;
    const rc = svg.getBoundingClientRect();
    const xv = (e.clientX - rc.left) / rc.width * g.W;
    let i = g.n < 2 ? 0 : Math.round((xv - g.L) / g.pw * (g.n - 1));
    i = Math.max(0, Math.min(g.n - 1, i));
    const gx = g.x(i);
    guide.setAttribute('x1', gx); guide.setAttribute('x2', gx); guide.style.opacity = 1;
    tip.innerHTML = '<b>' + fmtDay(g.days[i]) + ', ' + fmtShort(g.days[i]) + '</b>' +
      g.rows.map(r => '<span><i style="background:' + COLORS[r.m.i % COLORS.length] + '"></i>' +
        esc(r.m.name.split(/\s+/)[0]) + ': <strong>' + r.s.daily[i] + '</strong></span>').join('');
    tip.hidden = false;
    const px = gx / g.W * rc.width;
    tip.style.left = Math.max(70, Math.min(rc.width - 70, px)) + 'px';
  }
  function onChartLeave() {
    const tip = $('sa-tip'), guide = $('sa-guide');
    if (tip) tip.hidden = true;
    if (guide) guide.style.opacity = 0;
  }

  function renderDonut(c) {
    const host = $('sa-donut'), leg = $('sa-donut-legend');
    if (!host) return;
    const total = c.done.length;
    let list = Object.entries(c.svcTotals).sort((a, b) => b[1] - a[1]);
    const rest = list.slice(5).reduce((t, e) => t + e[1], 0);
    list = list.slice(0, 5);
    if (rest) list.push(['Other', rest]);

    const R = 70, C = 2 * Math.PI * R, gap = list.length > 1 ? 3 : 0;
    let cum = 0, segs = '';
    list.forEach(([name, v], i) => {
      const frac = v / total, len = Math.max(0, frac * C - gap);
      segs += '<circle class="sa-seg" cx="90" cy="90" r="' + R + '" fill="none" stroke="' + COLORS[i % COLORS.length] +
        '" stroke-width="22" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) +
        '" stroke-dashoffset="' + (-cum * C).toFixed(2) + '" transform="rotate(-90 90 90)"><title>' + esc(name) + ': ' + v + '</title></circle>';
      cum += frac;
    });
    host.innerHTML = '<svg viewBox="0 0 180 180" role="img" aria-label="Service distribution">' +
      '<circle cx="90" cy="90" r="' + R + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="22"/>' + segs + '</svg>' +
      '<div class="sa-donut-c"><span>Total</span><strong>' + total + '</strong></div>';
    leg.innerHTML = list.length
      ? list.map(([name, v], i) => '<li><i style="background:' + COLORS[i % COLORS.length] + '"></i><span>' + esc(name) + '</span><b>' + v + '</b></li>').join('')
      : '<li class="sa-mute">No completed services in this range yet.</li>';
  }

  function renderTable(c) {
    const body = $('sa-tbody');
    if (!body) return;
    if (!c.rows.length) { body.innerHTML = '<tr><td colspan="8" class="sa-empty">Add your name in Profile and team members in the Staff tab.</td></tr>'; return; }
    body.innerHTML = c.rows.slice()
      .sort((a, b) => b.s.count - a.s.count || a.m.name.localeCompare(b.m.name))
      .map(row => {
        const col = COLORS[row.m.i % COLORS.length], g = GRADS[row.m.i % GRADS.length], nm = esc(row.m.name);
        return '<tr>' +
          '<td><div class="sa-person"><span class="sa-av" style="background:linear-gradient(135deg,' + g + ')">' + esc(initials(row.m.name)) + '</span><strong>' + nm + '</strong></div></td>' +
          '<td class="sa-mute sa-role">' + esc(row.m.i === 0 && /owner/i.test(row.m.role) ? 'Owner' : row.m.role) + '</td>' +
          '<td class="sa-num"><strong>' + row.s.count + '</strong></td>' +
          '<td>' + (row.rating !== null ? '<span class="sa-star">★</span> ' + row.rating.toFixed(1) : '<span class="sa-mute">—</span>') + '</td>' +
          '<td><select class="sa-status s-' + STATUS[row.status] + '" data-status="' + nm + '" aria-label="Status of ' + nm + '">' +
            Object.keys(STATUS).map(s => '<option' + (s === row.status ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></td>' +
          '<td><div class="sa-pbar"><i><b style="width:' + row.perf + '%;background:' + col + '"></b></i><span>' + row.perf + '%</span></div></td>' +
          '<td><strong>' + money(row.payable) + '</strong></td>' +
          '<td><button type="button" class="sa-edit" data-edit="' + nm + '" title="Edit pay, rating and status" aria-label="Edit ' + nm + '">✎</button></td></tr>';
      }).join('');
  }

  function renderTop(c) {
    const host = $('sa-top');
    if (!host) return;
    const best = c.rows.slice().sort((a, b) => b.s.count - a.s.count)[0];
    if (!best || !best.s.count) { host.innerHTML = '<div class="sa-empty" style="padding:14px 0">No services assigned to a barber in this range yet.</div>'; return; }
    const share = c.done.length ? Math.round(best.s.count / c.done.length * 100) : 0;
    host.innerHTML =
      '<div class="sa-top-h"><span class="sa-av" style="background:linear-gradient(135deg,' + GRADS[best.m.i % GRADS.length] + ')">' + esc(initials(best.m.name)) + '</span>' +
      '<div><strong>' + esc(best.m.name) + '</strong><small>' + esc(best.m.role) + '</small>' +
      (best.rating !== null ? '<em><span class="sa-star">★</span> ' + best.rating.toFixed(1) + '</em>' : '') + '</div></div>' +
      '<div class="sa-top-stats"><div><strong>' + best.s.count + '</strong><span>Customers</span></div>' +
      '<div><strong>' + share + '%</strong><span>Of all services</span></div>' +
      '<div><strong>' + money(best.s.revenue) + '</strong><span>Earnings</span></div></div>';
  }

  const ICO = {
    up: '<svg class="sa-ic" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    cut: '<svg class="sa-ic" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',
    star: '<svg class="sa-ic sa-fill" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    cal: '<svg class="sa-ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
  };

  function renderInsights(c) {
    const host = $('sa-insights');
    if (!host) return;
    const total = c.done.length;
    const best = c.rows.slice().sort((a, b) => b.s.count - a.s.count)[0];
    const topSvc = Object.entries(c.svcTotals).sort((a, b) => b[1] - a[1])[0];
    const rated = c.rows.filter(x => x.rating !== null);
    const avg = rated.length ? rated.reduce((t, x) => t + x.rating, 0) / rated.length : null;
    const wd = c.weekdays.indexOf(Math.max(...c.weekdays));

    const tiles = [
      ['up', '#2f6df6', best && best.s.count
        ? esc(best.m.name.split(/\s+/)[0]) + ' served ' + best.s.count + ' customers (' + Math.round(best.s.count / total * 100) + '% of total).'
        : 'Assign completed services to a barber to see who leads.'],
      ['cut', '#0f9488', topSvc
        ? esc(topSvc[0]) + ' remains the most booked service (' + Math.round(topSvc[1] / total * 100) + '%).'
        : 'Service trends appear once bookings are completed.'],
      ['star', '#6d4aff', avg !== null
        ? 'Team average rating is ' + avg.toFixed(1) + ' across ' + rated.length + ' rated member' + (rated.length > 1 ? 's' : '') + '.'
        : 'Add a rating to each member with ✎ to track team quality.'],
      ['cal', '#a8730f', total
        ? esc(WEEKDAYS[wd]) + ' is your busiest day. Consider extra staff availability.'
        : 'Not enough data yet to find your busiest day.']
    ];
    host.innerHTML = tiles.map(t => '<div class="sa-ins"><span class="sa-ins-ico" style="background:' + t[1] + '">' + ICO[t[0]] + '</span><span>' + t[2] + '</span></div>').join('');
  }

  function renderUnassigned(c) {
    const host = $('sa-unassigned');
    if (!host) return;
    if (!c.unassigned.length) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    host.innerHTML =
      '<h3 class="sa-ph">Unassigned services (' + c.unassigned.length + ')</h3>' +
      '<p class="sa-pd" style="margin-bottom:8px">Booked as “Anyone”. Choose who served them so counts and pay are correct.</p>' +
      c.unassigned.slice(-20).reverse().map(a =>
        '<div class="sa-un-row"><div><strong>' + (a.token != null ? '#' + esc(a.token) + ' · ' : '') + esc(a.customer) + '</strong>' +
        '<span>' + esc(a.service) + ' · ' + esc(a.date) + ' ' + esc(a.start) + '</span></div>' +
        '<select data-assign="' + esc(a.id) + '"><option value="">Assign…</option>' +
        c.rows.map(r => '<option value="' + esc(r.m.name) + '">' + esc(r.m.name) + '</option>').join('') + '</select></div>').join('');
  }

  function render() {
    if (!$('sa-root')) return;
    cache = compute();
    renderHeader(cache); renderKpis(cache); renderChart(cache); renderDonut(cache);
    renderTable(cache); renderTop(cache); renderInsights(cache); renderUnassigned(cache);
  }

  /* ================= edit popup ================= */
  function previewPay() {
    if (!cache || editing == null) return;
    const row = cache.rows.find(x => x.m.name === editing); if (!row) return;
    const fixed = Number($('sa-m-salary').value) || 0, pct = Number($('sa-m-pct').value) || 0;
    const pay = fixed * cache.r.factor + row.s.revenue * pct / 100;
    setText('sa-m-preview', 'Payable for ' + cache.r.label + ': ' + money(pay) +
      ' (salary ' + money(fixed * cache.r.factor) + ' + commission ' + money(row.s.revenue * pct / 100) + ')');
  }
  function openEdit(name) {
    const row = cache && cache.rows.find(x => x.m.name === name); if (!row) return;
    editing = name;
    setText('sa-m-name', name + ' · ' + row.m.role);
    $('sa-m-salary').value = row.fixed || '';
    $('sa-m-pct').value = row.pct || '';
    $('sa-m-rating').value = row.rating !== null ? row.rating : '';
    $('sa-m-status').value = row.status;
    previewPay();
    $('sa-modal').hidden = false;
    $('sa-m-salary').focus();
  }
  function closeEdit() { editing = null; const m = $('sa-modal'); if (m) m.hidden = true; }
  function saveEdit() {
    if (editing == null) return;
    const fixed = Number($('sa-m-salary').value) || 0;
    const pct = Number($('sa-m-pct').value) || 0;
    const rawRating = $('sa-m-rating').value.trim();
    const rating = rawRating === '' ? 0 : Number(rawRating);
    if (fixed < 0 || pct < 0 || pct > 100) { toast('⚠️', 'Salary must be 0 or more and commission 0–100%'); return; }
    if (isNaN(rating) || rating < 0 || rating > 5) { toast('⚠️', 'Rating must be between 0 and 5'); return; }
    const sal = rd(K_SALARY(), {}); sal[editing] = { fixed, pct };
    const meta = rd(K_META(), {}); meta[editing] = { status: $('sa-m-status').value, rating };
    if (wr(K_SALARY(), sal) && wr(K_META(), meta)) { toast('✅', 'Saved ' + editing); closeEdit(); render(); }
  }

  /* ================= events ================= */
  function wire() {
    const root = $('sa-root');
    if (!root || root.dataset.wired) return !!root;
    root.dataset.wired = '1';

    root.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'sa-period') { period = t.value; render(); return; }
      if (t.dataset.status !== undefined) {
        const meta = rd(K_META(), {});
        meta[t.dataset.status] = Object.assign({}, meta[t.dataset.status], { status: t.value });
        if (wr(K_META(), meta)) render();
        return;
      }
      if (t.dataset.assign !== undefined && t.value) {
        const m = rd(K_SERVED(), {}); m[String(t.dataset.assign)] = t.value;
        if (wr(K_SERVED(), m)) { toast('✅', 'Assigned to ' + t.value); render(); }
      }
    });
    root.addEventListener('click', e => {
      const ed = e.target.closest('[data-edit]');
      if (ed) { openEdit(ed.getAttribute('data-edit')); return; }
      if (e.target.closest('#sa-bell')) {
        const u = $('sa-unassigned');
        if (u && !u.hidden) u.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else toast('✅', 'All completed services are assigned');
      }
    });
    const chart = $('sa-chart');
    chart.addEventListener('pointermove', onChartMove);
    chart.addEventListener('pointerleave', onChartLeave);

    const modal = $('sa-modal');
    modal.addEventListener('click', e => { if (e.target === modal) closeEdit(); });
    $('sa-m-cancel').addEventListener('click', closeEdit);
    $('sa-m-save').addEventListener('click', saveEdit);
    ['sa-m-salary', 'sa-m-pct'].forEach(id => $(id).addEventListener('input', previewPay));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeEdit(); });
    return true;
  }

  /* ================= tab switching ================= */
  const baseBTab = window.bTab;
  window.bTab = function (tab, el) {
    const sec = $(TAB_ID);
    if (tab === 'staffstats' && sec) {
      document.querySelectorAll('[id^="b-"][id$="-tab"]').forEach(n => { n.style.display = 'none'; });
      sec.style.display = 'block';
      document.querySelectorAll('#b-tabs .tab').forEach(t => t.classList.remove('on'));
      const b = el || document.querySelector('#b-tabs .tab[data-tab="staffstats"]');
      if (b) b.classList.add('on');
      wire(); render();
      return;
    }
    if (sec) sec.style.display = 'none';
    return baseBTab.apply(this, arguments);
  };
  window.bqRefreshStaffStats = render;

  /* live refresh while visible (not while editing or using a control) */
  setInterval(() => {
    const sec = $(TAB_ID), root = $('sa-root');
    if (!sec || sec.style.display !== 'block' || S.role !== 'barber') return;
    if ($('sa-modal') && !$('sa-modal').hidden) return;
    if (root && root.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) return;
    render();
  }, 5000);

  const ready = (typeof componentsReady !== 'undefined' ? componentsReady : Promise.resolve());
  Promise.resolve(ready).then(wire).catch(() => {});
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const digits10 = p => String(p || "").replace(/\D/g, "").slice(-10);
  const fmt12 = t => {
    const [h, m] = String(t).split(":").map(Number);
    return (h % 12 || 12) + ":" + pad(m) + " " + (h < 12 ? "AM" : "PM");
  };
  const fmtDate = s => new Date(s + "T00:00:00")
    .toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  async function api(path, opts) {
    const r = await fetch(BQ_BASE + path, opts);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.success) throw new Error(j.error || ("Server error " + r.status + " — booking is not available on the server yet"));
    return j;
  }
  const send = (method, body) => ({
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });

  const STATUS_TEXT = {
    pending: "Waiting for barber", confirmed: "Confirmed ✅", rejected: "Declined",
    cancelled: "Cancelled", expired: "Expired", completed: "Completed"
  };
  const STATUS_TAG = {
    pending: "tg", confirmed: "tgreen", completed: "tgreen",
    rejected: "tred", cancelled: "tgray", expired: "tgray"
  };

  /* =====================================================
     CUSTOMER — slot picker
     ===================================================== */
  const B = { shop: null, cfg: null, svc: 0, date: "", slot: "", slots: [], reason: "", mine: [], sent: false };

  const myPhone = () => digits10(S.user && S.user.phone) || digits10(localStorage.getItem("bqBookPhone"));
  const myName = () => {
    const n = S.user && S.user.name;
    return (n && n !== "Customer") ? n : (localStorage.getItem("bqBookName") || "");
  };
  const currentSvc = () => {
    const s = B.shop;
    return s ? S.services[s.svcs[B.svc]] : null;
  };
  const chip = (on, off) =>
    "flex:0 0 auto;padding:10px 12px;border-radius:12px;font:inherit;color:inherit;text-align:center;" +
    "cursor:" + (off ? "not-allowed" : "pointer") + ";opacity:" + (off ? ".35" : "1") + ";" +
    "background:" + (on ? "var(--gdim)" : "var(--s2)") + ";" +
    "border:1.5px solid " + (on ? "var(--gold)" : "var(--b1)");
  const label = t => '<div style="font-size:13px;font-weight:600;margin:16px 0 8px">' + t + "</div>";

  function ensureModal() {
    if ($("m-advbook")) return;
    const wrap = document.createElement("div");
    wrap.className = "overlay";
    wrap.id = "m-advbook";
    wrap.innerHTML = `
      <div class="modal" style="max-height:90vh;overflow:auto">
        <div style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif">Book a time slot</div>
        <div id="bk-shop" style="font-size:13px;color:var(--txt2);margin-top:2px"></div>
        ${label("1. Choose a service")}
        <div id="bk-svcs" style="display:flex;gap:8px;flex-wrap:wrap"></div>
        ${label("2. Choose a date")}
        <div id="bk-dates" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px"></div>
        ${label("3. Choose a time")}
        <div id="bk-slots" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div>
        <div id="bk-who" style="margin-top:14px"></div>
        <div id="bk-note" style="font-size:12px;color:var(--txt2);margin:14px 0;line-height:1.5"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline" style="flex:1" type="button" id="bk-cancel">Close</button>
          <button class="btn btn-gold" style="flex:1" type="button" id="bk-submit">Request booking</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    wrap.addEventListener("click", e => {
      const t = e.target;
      if (t === wrap || t.closest("#bk-cancel")) { closeModal("m-advbook"); return; }
      const svc = t.closest("[data-svc]");
      if (svc) { B.svc = Number(svc.dataset.svc); B.slot = ""; paintSvcs(); loadSlots(); return; }
      const dt = t.closest("[data-date]");
      if (dt && !dt.disabled) { B.date = dt.dataset.date; B.slot = ""; paintDates(); loadSlots(); return; }
      const sl = t.closest("[data-slot]");
      if (sl && !sl.disabled) { B.slot = sl.dataset.slot; paintSlots(); paintNote(); return; }
      if (t.closest("#bk-submit")) submitBooking();
    });
  }

  function paintSvcs() {
    const s = B.shop;
    if (!s) return;
    $("bk-svcs").innerHTML = s.svcs.map((si, i) => {
      const sv = S.services[si];
      if (!sv) return "";
      return '<button type="button" data-svc="' + i + '" style="' + chip(i === B.svc, false) + '">' +
        '<div style="font-size:20px">' + esc(sv.ico) + "</div>" +
        '<div style="font-size:13px;font-weight:600">' + esc(sv.name) + "</div>" +
        '<div style="font-size:11px;color:var(--txt2)">₹' + sv.price + " · " + sv.dur + " min</div></button>";
    }).join("");
  }

  function paintDates() {
    const cfg = B.cfg;
    if (!cfg) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let html = "";
    for (let i = 0; i <= cfg.advance_days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = iso(d);
      const off = cfg.days.indexOf((d.getDay() + 6) % 7) === -1 || cfg.off_dates.indexOf(key) !== -1;
      html += '<button type="button" data-date="' + key + '" ' + (off ? "disabled " : "") +
        'style="' + chip(key === B.date, off) + ';min-width:62px">' +
        '<div style="font-size:11px;color:var(--txt2)">' + d.toLocaleDateString("en-IN", { weekday: "short" }) + "</div>" +
        '<div style="font-size:18px;font-weight:700">' + d.getDate() + "</div>" +
        '<div style="font-size:11px;color:var(--txt2)">' + d.toLocaleDateString("en-IN", { month: "short" }) + "</div></button>";
    }
    $("bk-dates").innerHTML = html;
  }

  function paintSlots() {
    const box = $("bk-slots");
    if (!B.date) {
      box.style.display = "block";
      box.innerHTML = '<span style="font-size:13px;color:var(--txt2)">Pick a date first.</span>';
      return;
    }
    if (!B.slots.length) {
      box.style.display = "block";
      box.innerHTML = '<span style="font-size:13px;color:var(--txt2)">' +
        esc(B.reason || "No free slots on this day.") + "</span>";
      return;
    }
    box.style.display = "grid";
    box.innerHTML = B.slots.map(s =>
      '<button type="button" data-slot="' + s.time + '" ' + (s.available ? "" : "disabled ") +
      'style="' + chip(s.time === B.slot, !s.available) + ';font-size:13px;font-weight:600">' +
      fmt12(s.time) + "</button>").join("");
  }

  function paintWho() {
    const need = myPhone().length !== 10;
    $("bk-who").innerHTML = need ? `
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">Your details</div>
      <input class="inp" id="bk-name" type="text" maxlength="50" placeholder="Your name" value="${esc(myName())}" style="margin-bottom:8px">
      <input class="inp" id="bk-phone" type="tel" maxlength="10" inputmode="numeric" placeholder="10-digit mobile number">` : "";
    const ph = $("bk-phone");
    if (ph) ph.addEventListener("input", () => { ph.value = ph.value.replace(/\D/g, "").slice(0, 10); });
  }

  function paintNote() {
    const sv = currentSvc();
    $("bk-note").textContent = (B.date && B.slot && sv)
      ? fmtDate(B.date) + " · " + fmt12(B.slot) + " · " + sv.name + " · ₹" + sv.price +
        ". The barber must confirm your request. Pay at the shop."
      : "The barber confirms your request. You can cancel from My Bookings.";
  }

  async function loadSlots() {
    const sv = currentSvc();
    if (!B.date) { paintSlots(); return; }
    $("bk-slots").style.display = "block";
    $("bk-slots").innerHTML = '<span style="font-size:13px;color:var(--txt2)">Loading…</span>';
    try {
      const j = await api("/api/bookings/slots?shop_name=" + enc(B.shop.name) +
        "&date=" + B.date + "&duration=" + (sv ? sv.dur : 30));
      B.slots = j.slots;
      B.reason = j.reason || "";
    } catch (e) {
      B.slots = [];
      B.reason = e.message;
    }
    paintSlots();
    paintNote();
  }

  window.bkOpen = async function () {
    const s = S.shops[S.selectedShop];
    if (!s) return;
    ensureModal();
    Object.assign(B, { shop: s, cfg: null, svc: 0, date: "", slot: "", slots: [], reason: "" });
    $("bk-shop").textContent = s.name;
    $("bk-dates").innerHTML = '<span style="font-size:13px;color:var(--txt2)">Loading…</span>';
    paintSvcs(); paintSlots(); paintWho(); paintNote();
    openModal("m-advbook");
    try {
      B.cfg = (await api("/api/bookings/availability?shop_name=" + enc(s.name))).config;
    } catch (e) {
      closeModal("m-advbook");
      toast("⚠️", e.message || "Booking is not available for this shop yet");
      return;
    }
    paintDates();
  };

  async function submitBooking() {
    const sv = currentSvc();
    if (!sv) { toast("⚠️", "Choose a service"); return; }
    if (!B.date || !B.slot) { toast("⚠️", "Choose a date and a time"); return; }

    let name = myName(), phone = myPhone();
    if (phone.length !== 10) {
      name = ($("bk-name") ? $("bk-name").value : "").trim();
      phone = digits10($("bk-phone") ? $("bk-phone").value : "");
      if (name.length < 2) { toast("⚠️", "Please enter your name"); return; }
      if (phone.length !== 10) { toast("⚠️", "Enter a valid 10-digit phone number"); return; }
    }

    const btn = $("bk-submit");
    btn.disabled = true;
    try {
      await api("/api/bookings", send("POST", {
        shop_name: B.shop.name, customer_name: name || "Customer", customer_phone: phone,
        service_name: sv.name, duration: sv.dur, price: sv.price, date: B.date, start: B.slot
      }));
      try {
        localStorage.setItem("bqBookPhone", phone);
        if (name) localStorage.setItem("bqBookName", name);
      } catch (e) { /* ignore */ }
      closeModal("m-advbook");
      toast("📅", "Request sent. You will see it in My Bookings once the barber confirms.");
      refreshMine();
    } catch (e) {
      toast("⚠️", e.message || "Could not book");
      loadSlots();           // slot may have been taken meanwhile
    }
    btn.disabled = false;
  }

  /* ---- "Book for later" button on the shop page ---- */
  const baseOpenShop = window.openShop;
  window.openShop = function () {
    const out = baseOpenShop.apply(this, arguments);
    const body = $("sh-body");
    if (body) {
      const btn = document.createElement("button");
      btn.id = "bk-open-btn";
      btn.type = "button";
      btn.className = "btn btn-outline btn-full";
      btn.style.cssText = "height:48px;margin-top:10px";
      btn.textContent = "📅 Book for later";
      btn.addEventListener("click", window.bkOpen);
      const join = Array.prototype.find.call(body.querySelectorAll("button"),
        b => /Join Queue|Shop is Closed/.test(b.textContent));
      if (join) join.insertAdjacentElement("afterend", btn);
      else body.appendChild(btn);
    }
    return out;
  };

  /* ---- My Bookings (inside the My Queue tab) ---- */
  function myBookingsHtml() {
    if (!B.mine.length) return "";
    const today = iso(new Date());
    const rows = B.mine
      .filter(b => b.date >= today || b.status === "pending")
      .concat(B.mine.filter(b => b.date < today && b.status !== "pending").reverse().slice(0, 3));
    if (!rows.length) return "";
    return '<div style="margin-top:24px"><div style="font-size:17px;font-weight:700;font-family:\'Syne\',sans-serif;margin-bottom:10px">My Bookings</div>' +
      rows.map(b => {
        const canCancel = (b.status === "pending" || b.status === "confirmed") &&
          (b.date + " " + b.start) > (iso(new Date()) + " " + pad(new Date().getHours()) + ":" + pad(new Date().getMinutes()));
        return '<div class="card card-p" style="margin-bottom:10px">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">' +
          '<div><div style="font-weight:600;font-size:14px">' + esc(b.service_name) + " · " + esc(b.shop_name) + "</div>" +
          '<div style="font-size:12px;color:var(--txt2);margin-top:2px">' + fmtDate(b.date) + " · " + fmt12(b.start) + "</div></div>" +
          '<span class="tag ' + (STATUS_TAG[b.status] || "tgray") + '" style="flex-shrink:0">' + (STATUS_TEXT[b.status] || esc(b.status)) + "</span></div>" +
          (canCancel ? '<button class="btn btn-red btn-sm" style="margin-top:10px" onclick="bkCancel(' + b.id + ')">Cancel booking</button>' : "") +
          "</div>";
      }).join("") + "</div>";
  }

  const baseMyQ = window.renderMyQ;
  window.renderMyQ = function () {
    const out = baseMyQ.apply(this, arguments);
    const el = $("my-q");
    const html = myBookingsHtml();
    if (el && html) el.insertAdjacentHTML("beforeend", html);
    return out;
  };

  window.bkCancel = async function (id) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api("/api/bookings/" + id, send("PATCH", { action: "cancel", by: "customer", phone: myPhone() }));
      toast("✅", "Booking cancelled");
    } catch (e) {
      toast("⚠️", e.message || "Could not cancel");
    }
    refreshMine();
  };

  async function refreshMine() {
    if (S.role !== "customer") return;
    const phone = myPhone();
    if (phone.length !== 10) return;
    try {
      const j = await api("/api/bookings?phone=" + phone);
      const old = {};
      B.mine.forEach(b => { old[b.id] = b.status; });
      j.bookings.forEach(b => {
        if (B.sent && old[b.id] === "pending" && b.status === "confirmed") {
          toast("✅", "Your booking at " + b.shop_name + " is confirmed for " + fmtDate(b.date) + ", " + fmt12(b.start));
        } else if (B.sent && old[b.id] === "pending" && b.status === "rejected") {
          toast("ℹ️", "The barber could not take your booking at " + b.shop_name);
        }
      });
      B.mine = j.bookings;
      B.sent = true;
      const el = $("my-q");
      if (el && el.offsetParent !== null) window.renderMyQ();
    } catch (e) { /* offline: keep what is shown */ }
  }
  setInterval(refreshMine, 20000);
  setTimeout(refreshMine, 2500);

  const A = { list: [], first: true, seen: {}, auto: {}, dirty: false, off: [] };
  const shopName = () => (S.barber && S.barber.shopName) || "";

  const calStatus = s => (s === "rejected" || s === "expired") ? "cancelled" : s;
  const toAppt = b => ({
    id: "adv-" + b.id, token: null, customer: b.customer_name,
    service: b.service_name + " · advance", date: b.date, start: b.start, end: b.end,
    dur: b.duration, status: calStatus(b.status), source: "advance", phone: b.customer_phone
  });

  const visible = id => { const n = $(id); return !!n && n.style.display === "block"; };

  function renderRequests() {
    const tab = $("b-bookings-tab");
    if (!tab) return;
    let box = $("bk-requests");
    if (!box) {
      box = document.createElement("div");
      box.id = "bk-requests";
      tab.insertBefore(box, tab.firstChild);
    }
    const pend = A.list.filter(b => b.status === "pending");
    if (!pend.length) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="card card-p" style="margin-bottom:14px;border:1px solid var(--gold)">' +
      '<div style="font-weight:700;margin-bottom:10px">📅 Booking requests (' + pend.length + ")</div>" +
      pend.map(b =>
        '<div style="padding:10px 0;border-top:1px solid var(--b1)">' +
        '<div style="font-weight:600;font-size:14px">' + esc(b.customer_name) +
        ' <span style="font-weight:400;color:var(--txt2);font-size:12px">· ' + esc(b.customer_phone) + "</span></div>" +
        '<div style="font-size:12px;color:var(--txt2);margin:2px 0 8px">' + esc(b.service_name) + " · " +
        fmtDate(b.date) + " · " + fmt12(b.start) + " – " + fmt12(b.end) + " · ₹" + Math.round(b.price) + "</div>" +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-green btn-sm" onclick="bkDecide(' + b.id + ',\'confirm\')">Confirm ✓</button>' +
        '<button class="btn btn-red btn-sm" onclick="bkDecide(' + b.id + ',\'reject\')">Reject</button></div></div>'
      ).join("") + "</div>";
  }

  window.bkDecide = async function (id, action) {
    try {
      await api("/api/bookings/" + id, send("PATCH", { action, by: "barber", shop_name: shopName() }));
      toast("✅", action === "confirm" ? "Booking confirmed" : "Booking rejected");
    } catch (e) {
      toast("⚠️", e.message || "Could not update the booking");
    }
    pullBarber();
  };

  async function autoConfigure() {
    const shop = shopName();
    if (!shop || A.auto[shop]) return;
    A.auto[shop] = true;
    try {
      const cfg = (await api("/api/bookings/availability?shop_name=" + enc(shop))).config;
      const b = S.barber || {};
      if (!cfg.configured && b.openingTime && b.closingTime) {
        await api("/api/bookings/availability", send("POST", {
          shop_name: shop, days: cfg.days, open: b.openingTime, close: b.closingTime,
          slot_minutes: cfg.slot_minutes, advance_days: cfg.advance_days,
          cancel_hours: cfg.cancel_hours, off_dates: cfg.off_dates
        }));
      }
    } catch (e) { A.auto[shop] = false; }
  }

  async function pullBarber() {
    if (S.role !== "barber" || !shopName()) return;
    autoConfigure();
    try {
      const j = await api("/api/bookings?shop_name=" + enc(shopName()));
      A.list = j.bookings;
      const keep = (window.bqAppointments || []).filter(a => String(a.id).indexOf("adv-") !== 0);
      window.bqAppointments = keep.concat(j.bookings.map(toAppt));

      j.bookings.forEach(b => {
        if (b.status === "pending" && !A.seen[b.id]) {
          A.seen[b.id] = true;
          if (!A.first) toast("📅", "New booking request from " + b.customer_name);
        }
      });
      A.first = false;

      renderRequests();
      if (visible("b-bookings-tab") && window.bqRenderBookings) window.bqRenderBookings();
      if (visible("b-calendar-tab") && window.bqRenderCalendar) window.bqRenderCalendar();
    } catch (e) { /* offline or shop not registered yet */ }
  }
  setInterval(pullBarber, 10000);
  setTimeout(pullBarber, 2500);

  const baseLoad = window.bqLoadBookings;
  window.bqLoadBookings = async function () {
    const out = await baseLoad.apply(this, arguments);
    pullBarber();
    return out;
  };
  const baseRender = window.bqRenderBookings;
  window.bqRenderBookings = function () {
    const out = baseRender.apply(this, arguments);
    renderRequests();
    return out;
  };
  const baseSet = window.bqSetStatus;
  window.bqSetStatus = async function (id, status) {
    if (String(id).indexOf("adv-") !== 0) return baseSet.apply(this, arguments);
    const action = { confirmed: "confirm", completed: "complete", cancelled: "cancel" }[status];
    if (!action) { toast("ℹ️", "A request can only be confirmed or rejected"); pullBarber(); return; }
    try {
      await api("/api/bookings/" + String(id).slice(4), send("PATCH", { action, by: "barber", shop_name: shopName() }));
      toast("✅", "Booking marked " + status);
    } catch (e) {
      toast("⚠️", e.message || "Could not update the booking");
    }
    pullBarber();
  };

  function ensureSettingsCard() {
    const tab = $("b-settings-tab");
    if (!tab) return;
    if (!$("bk-settings")) {
      const card = document.createElement("div");
      card.id = "bk-settings";
      card.className = "card pad";
      card.style.cssText = "margin-top:14px";
      card.innerHTML = `
        <div style="font-weight:700;font-size:16px;margin-bottom:4px">📅 Advance booking</div>
        <div class="muted" style="margin-bottom:12px">Customers can book time slots within these hours.</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:6px">Working days</div>
        <div id="bk-days" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${DAYS.map((d, i) => '<label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" value="' + i + '"> ' + d + "</label>").join("")}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div><label>Opens</label><input class="inp" type="time" id="bk-open"></div>
          <div><label>Closes</label><input class="inp" type="time" id="bk-close"></div>
          <div><label>Slot length</label><select class="inp" id="bk-slot">
            <option value="15">15 min</option><option value="20">20 min</option><option value="30">30 min</option>
            <option value="45">45 min</option><option value="120">120 min</option></select></div>
          <div><label>Book ahead</label><select class="inp" id="bk-ahead">
            <option value="7">7 days</option><option value="14">14 days</option>
            <option value="30">30 days</option><option value="60">60 days</option><option value="120">120 days</option><option value="365">365 days</option></select></div>
          <div style="grid-column:1/-1"><label>Customers can cancel until</label><select class="inp" id="bk-cutoff">
            <option value="0">Any time before the slot</option><option value="1">1 hour before</option>
            <option value="2">2 hours before</option><option value="4">4 hours before</option>
            <option value="12">12 hours before</option><option value="24">24 hours before</option></select></div>
        </div>
        <div style="font-size:13px;font-weight:600;margin-bottom:6px">Days off</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input class="inp" type="date" id="bk-offdate" style="flex:1">
          <button type="button" class="btn btn-outline btn-sm" id="bk-addoff">Add</button>
        </div>
        <div id="bk-offlist" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px"></div>
        <button type="button" class="btn btn-gold btn-full" id="bk-savecfg">Save booking settings</button>
        <div class="muted" id="bk-cfgmsg" style="margin-top:8px"></div>`;
      tab.appendChild(card);

      card.addEventListener("input", () => { A.dirty = true; });
      card.addEventListener("change", () => { A.dirty = true; });
      $("bk-addoff").addEventListener("click", () => {
        const v = $("bk-offdate").value;
        if (!v) return;
        if (A.off.indexOf(v) === -1) A.off.push(v);
        A.off.sort();
        A.dirty = true;
        $("bk-offdate").value = "";
        paintOff();
      });
      $("bk-offlist").addEventListener("click", e => {
        const x = e.target.closest("[data-off]");
        if (!x) return;
        A.off = A.off.filter(d => d !== x.dataset.off);
        A.dirty = true;
        paintOff();
      });
      $("bk-savecfg").addEventListener("click", saveCfg);
      A.dirty = false;
      loadCfg(true);
    } else if (!A.dirty) {
      loadCfg(false);
    }
  }

  function paintOff() {
    $("bk-offlist").innerHTML = A.off.map(d =>
      '<span class="tag tgray" style="cursor:pointer" data-off="' + d + '">' + fmtDate(d) + " ✕</span>").join("") ||
      '<span class="muted">No days off added.</span>';
  }

  async function loadCfg(force) {
    if (!shopName()) return;
    try {
      const c = (await api("/api/bookings/availability?shop_name=" + enc(shopName()))).config;
      if (A.dirty && !force) return;
      document.querySelectorAll("#bk-days input").forEach(i => { i.checked = c.days.indexOf(Number(i.value)) !== -1; });
      const b = S.barber || {};
      $("bk-open").value = c.configured ? c.open : (b.openingTime || c.open);
      $("bk-close").value = c.configured ? c.close : (b.closingTime || c.close);
      $("bk-slot").value = String(c.slot_minutes);
      $("bk-ahead").value = String(c.advance_days);
      $("bk-cutoff").value = String(c.cancel_hours);
      A.off = c.off_dates.slice();
      paintOff();
    } catch (e) {
      const m = $("bk-cfgmsg");
      if (m) m.textContent = "Save your shop details in Profile first, then come back here.";
    }
  }

  async function saveCfg() {
    const days = Array.prototype.filter.call(document.querySelectorAll("#bk-days input"), i => i.checked).map(i => Number(i.value));
    if (!days.length) { toast("⚠️", "Choose at least one working day"); return; }
    if (!$("bk-open").value || !$("bk-close").value || $("bk-open").value >= $("bk-close").value) {
      toast("⚠️", "Closing time must be after opening time"); return;
    }
    try {
      await api("/api/bookings/availability", send("POST", {
        shop_name: shopName(), days, open: $("bk-open").value, close: $("bk-close").value,
        slot_minutes: Number($("bk-slot").value), advance_days: Number($("bk-ahead").value),
        cancel_hours: Number($("bk-cutoff").value), off_dates: A.off
      }));
      A.dirty = false;
      $("bk-cfgmsg").textContent = "Saved. Customers will now see these slots.";
      toast("✅", "Booking settings saved");
    } catch (e) {
      $("bk-cfgmsg").textContent = e.message;
      toast("⚠️", e.message || "Could not save");
    }
  }

  const baseSettings = window.bqRenderSettings;
  window.bqRenderSettings = function () {
    const out = baseSettings.apply(this, arguments);
    ensureSettingsCard();
    return out;
  };
})();

(function () {
  "use strict";

  const css = document.createElement("style");
  css.textContent = `
  #b-analytics-tab > div[style*="Syne"]:first-child{display:none}
  .an{--an-bg:#0a1230;--an-card:#0d1738;--an-line:rgba(120,140,255,.18);--an-txt:#eef1ff;--an-mute:#8f9bc4;
      --an-green:#22e39a;--an-gold:#f5b73b;color:var(--an-txt);font-family:'DM Sans',sans-serif}
  .an *{box-sizing:border-box}
  .an-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
  .an-badge{width:48px;height:48px;border-radius:12px;background:#17206b;border:1px solid #3b4bd6;display:grid;place-items:center;color:#8da0ff}
  .an-head h2{margin:0;font:800 22px 'Syne',sans-serif}
  .an-head p{margin:2px 0 0;font-size:13px;color:var(--an-mute)}
  .an-head-r{margin-left:auto;display:flex;gap:8px}
  .an-pill{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;background:var(--an-card);
      border:1px solid var(--an-line);color:var(--an-txt);font:600 12px 'DM Sans',sans-serif;cursor:default}
  button.an-pill{cursor:pointer}
  button.an-pill:hover{border-color:#5b6cff}
  .an-ic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .an-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}
  .an-kpi{position:relative;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:center;padding:16px;
      border-radius:16px;overflow:hidden;border:1px solid var(--c);
      background:linear-gradient(135deg,color-mix(in srgb,var(--c) 22%,#0a1230),#0a1230 70%);
      box-shadow:0 0 22px -10px var(--c)}
  .an-kico{grid-row:1/3;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
      background:color-mix(in srgb,var(--c) 55%,#0a1230);color:#fff}
  .an-kl{font-size:12px;color:#c3cbf0}
  .an-kv{font:800 26px 'Syne',sans-serif;line-height:1.1}
  .an-kn{grid-column:1/3;font-size:12px;color:var(--an-mute);margin-top:4px}
  .an-kn.up{color:var(--an-green)}.an-kn.dn{color:#ff7b7b}
  .an-spark{position:absolute;right:10px;bottom:10px;width:90px;height:40px;opacity:.9}
  .an-k1{--c:#6a4bff}.an-k2{--c:#12b8a0}.an-k3{--c:#2f6df6}.an-k4{--c:#d9a02c}
  .an-grid{display:grid;grid-template-columns:1fr;gap:14px}
  .an-col{display:flex;flex-direction:column;gap:14px;min-width:0}
  .an-panel{padding:16px;border-radius:16px;background:var(--an-card);border:1px solid var(--an-line)}
  .an-ph{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px}
  .an-ph h3{margin:0;font:700 15px 'Syne',sans-serif}
  .an-ph p{margin:2px 0 0;font-size:12px;color:var(--an-mute)}
  .an-ph .an-ic{color:#7f93ff;margin-top:2px}
  .an-seg{margin-left:auto;display:flex;background:#0a1230;border-radius:9px;padding:3px}
  .an-seg button{border:0;background:none;color:var(--an-mute);font:600 12px 'DM Sans',sans-serif;padding:6px 12px;border-radius:7px;cursor:pointer}
  .an-seg button.on{background:#3340ff;color:#fff}
  .an-tag{margin-left:auto;font-size:12px;padding:5px 9px;border-radius:8px;background:#141f55;color:#9fb0ff;white-space:nowrap}
  .an-bars{position:relative;display:grid;gap:6px;align-items:end;height:190px;padding-left:22px;
      background:repeating-linear-gradient(to top,rgba(120,140,255,.12) 0 1px,transparent 1px 25%)}
  .an-bar{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:11px;color:var(--an-mute);min-width:0}
  .an-bar i{display:block;width:60%;max-width:34px;border-radius:5px 5px 0 0;background:#f5b73b;box-shadow:0 0 14px -2px #f5b73b88;min-height:0}
  .an-bar b{color:var(--an-txt);font-weight:600;margin-bottom:3px}
  .an-bar span{margin-top:6px;text-align:center;line-height:1.25}
  .an-yax{position:absolute;left:0;top:0;bottom:46px;display:flex;flex-direction:column;justify-content:space-between;font-size:10px;color:var(--an-mute)}
  .an-svc{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:#111c47;margin-bottom:8px}
  .an-svc-ico{width:42px;height:42px;border-radius:50%;background:#3340ff;display:grid;place-items:center;flex:none}
  .an-svc-m{flex:1;min-width:0}
  .an-svc-t{display:flex;justify-content:space-between;font-size:13px;gap:8px}
  .an-svc-t small{display:block;color:var(--an-mute);font-size:11px}
  .an-track{height:6px;border-radius:6px;background:#0a1230;margin-top:6px;overflow:hidden}
  .an-track b{display:block;height:100%;background:linear-gradient(90deg,#3340ff,#6a7bff)}
  .an-ins{display:flex;align-items:center;gap:12px;padding:10px 4px;border-top:1px solid var(--an-line);font-size:13px}
  .an-ins:first-of-type{border-top:0}
  .an-ins-ico{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;flex:none;color:#fff}
  .an-ins small{display:block;color:var(--an-mute);font-size:11px}
  .an-empty{padding:18px 0;text-align:center;color:var(--an-mute);font-size:13px}
  @media(min-width:720px){.an-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media(min-width:900px){.an-grid{grid-template-columns:minmax(0,1.9fr) minmax(0,1fr)}}`;
  document.head.appendChild(css);

  /* ---------- helpers ---------- */
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inr = n => "₹" + Math.round(n || 0).toLocaleString("en-IN");
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const ic = p => '<svg class="an-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    bars: '<rect x="4" y="12" width="4" height="8"/><rect x="10" y="5" width="4" height="15"/><rect x="16" y="9" width="4" height="11"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    rupee: '<path d="M6 4h12M6 9h12M9 4c6 0 6 9 0 9H6l8 7"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    check: '<circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/>',
    star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3"/>',
    trend: '<polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.1" y2="15.9"/><line x1="14.5" y1="14.5" x2="20" y2="20"/><line x1="8.1" y1="8.1" x2="12" y2="12"/>'
  };

  let mode = "week";

  function weekRange() {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  }
  const fmtS = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtF = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  function line(vals, W, H, pad) {
    const max = Math.max(1, ...vals);
    const x = i => pad + i * (W - 2 * pad) / (vals.length - 1);
    const y = v => H - pad - v / max * (H - 2 * pad);
    const pts = vals.map((v, i) => [x(i), y(v)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    return { pts, d, base: H - pad, x, y, max };
  }

  /* ---------- main render ---------- */
  window.renderAnalytics = function () {
    const box = document.getElementById("b-analytics");
    if (!box) return;
    if (typeof refreshBarberStats === "function") refreshBarberStats();

    const st = S.barberStats || {
      today: { done: 0, earnings: 0, avg_wait: null },
      week: { daily: [0, 0, 0, 0, 0, 0, 0], done: 0, revenue: 0, services: [] },
      rating: { average: 0, count: 0 }
    };
    const week = st.week || {};
    const dates = weekRange();
    const todayStr = new Date().toDateString();

    /* online collected today (same logic as before) */
    const now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const online = (S.payments || []).filter(p => {
      if (p.method !== "Online" || p.status !== "Paid") return false;
      const d = new Date(p.createdAt || p.timestamp || "");
      return !isNaN(d) && d >= t0 && d <= now;
    }).reduce((t, p) => t + Number(p.amount || 0), 0);

    /* series for the charts */
    const useMonth = mode === "month" && st.month && Array.isArray(st.month.daily);
    const counts = useMonth ? st.month.daily : (week.daily || [0, 0, 0, 0, 0, 0, 0]);
    const labels = useMonth
      ? counts.map((_, i) => ({ a: String(i + 1), b: "" }))
      : dates.map(d => ({ a: d.toLocaleDateString("en-US", { weekday: "short" }), b: fmtS(d) }));
    const totalDone = counts.reduce((t, n) => t + n, 0);
    const revenue = Number(week.revenue) || 0;

    /* daily revenue: backend value if present, else split weekly revenue by daily counts */
    const wkCount = (week.daily || []).reduce((t, n) => t + n, 0);
    const revDaily = Array.isArray(week.daily_revenue) ? week.daily_revenue
      : (week.daily || []).map(n => wkCount ? revenue * n / wkCount : 0);

    /* week-over-week % (shown only when the backend sends last week's numbers) */
    const pct = (cur, prev) => prev > 0 ? Math.round((cur - prev) / prev * 100) : null;
    const revPct = pct(revenue, Number(week.prev_revenue));
    const donePct = pct(Number(week.done) || 0, Number(week.prev_done));
    const trendNote = (p, fallback) => p === null
      ? '<div class="an-kn">' + fallback + "</div>"
      : '<div class="an-kn ' + (p >= 0 ? "up" : "dn") + '">' + (p >= 0 ? "↑ " : "↓ ") + Math.abs(p) + "% from last week</div>";

    const rated = st.rating && st.rating.count > 0;

    /* sparkline in revenue card */
    const sp = line(revDaily.length > 1 ? revDaily : [0, 0], 90, 40, 3);
    const spark = '<svg class="an-spark" viewBox="0 0 90 40"><defs><linearGradient id="an-sg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#8b7bff" stop-opacity=".35"/><stop offset="1" stop-color="#8b7bff" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + sp.d + " L87," + sp.base + " L3," + sp.base + ' Z" fill="url(#an-sg)"/>' +
      '<path d="' + sp.d + '" fill="none" stroke="#8b7bff" stroke-width="1.8" stroke-linejoin="round"/></svg>';

    /* bar chart */
    const bmax = Math.max(1, ...counts);
    const ymax = Math.max(5, Math.ceil(bmax / 5) * 5);
    const bars = counts.map((n, i) =>
      '<div class="an-bar"><b>' + n + '</b><i style="height:' + (n ? Math.max(6, n / ymax * 130) : 0) + 'px"></i>' +
      "<span>" + esc(labels[i].a) + (labels[i].b ? "<br>" + esc(labels[i].b) : "") + "</span></div>").join("");
    const yax = [ymax, Math.round(ymax * .8), Math.round(ymax * .6), Math.round(ymax * .4), Math.round(ymax * .2), 0]
      .map(v => "<span>" + v + "</span>").join("");

    /* revenue line */
    const W = 560, H = 170, L = 34, ln = line(revDaily, W, H - 34, 14);
    const rmax = Math.max(1, ...revDaily);
    const peak = revDaily.indexOf(Math.max(...revDaily));
    let rGrid = "";
    [0, .5, 1].forEach(f => {
      const yy = ln.base - f * (ln.base - 14);
      rGrid += '<line x1="' + L + '" x2="' + (W - 8) + '" y1="' + yy + '" y2="' + yy + '" stroke="rgba(120,140,255,.14)"/>' +
        '<text x="' + (L - 6) + '" y="' + (yy + 3) + '" text-anchor="end" font-size="10" fill="#8f9bc4">' + Math.round(rmax * f) + "</text>";
    });
    const px = i => L + i * (W - L - 14) / 6;
    const rpts = revDaily.map((v, i) => [px(i), ln.base - v / rmax * (ln.base - 14)]);
    const rd = rpts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const rLabels = dates.map((d, i) =>
      '<text x="' + px(i) + '" y="' + (H - 16) + '" text-anchor="middle" font-size="10" fill="#8f9bc4">' + d.toLocaleDateString("en-US", { weekday: "short" }) + "</text>" +
      '<text x="' + px(i) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="10" fill="#8f9bc4">' + fmtS(d) + "</text>").join("");
    const rdots = rpts.map((p, i) =>
      '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === peak && revDaily[i] > 0 ? 5 : 3.5) + '" fill="' +
      (i === peak && revDaily[i] > 0 ? "#f5b73b" : "#5b6cff") + '"/>').join("");
    const revChart = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="Daily revenue this week"><defs>' +
      '<linearGradient id="an-rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5b73b" stop-opacity=".3"/><stop offset="1" stop-color="#f5b73b" stop-opacity="0"/></linearGradient></defs>' +
      rGrid + '<path d="' + rd + " L" + rpts[6][0] + "," + ln.base + " L" + rpts[0][0] + "," + ln.base + ' Z" fill="url(#an-rg)"/>' +
      '<path d="' + rd + '" fill="none" stroke="#f5b73b" stroke-width="2" stroke-linejoin="round"/>' + rdots + rLabels + "</svg>";

    /* top services */
    const svcs = (week.services || []).slice(0, 5);
    const svcTotal = svcs.reduce((t, s) => t + Number(s[1] || 0), 0);
    const svcHtml = svcs.length ? svcs.map(([name, n]) => {
      const p = svcTotal ? Math.round(n / svcTotal * 100) : 0;
      return '<div class="an-svc"><span class="an-svc-ico">' + ic(ICON.cut) + "</span>" +
        '<div class="an-svc-m"><div class="an-svc-t"><span>' + esc(name) + "<small>" + n + " booking" + (n === 1 ? "" : "s") + "</small></span><span>" + p + "%</span></div>" +
        '<div class="an-track"><b style="width:' + p + '%"></b></div></div></div>';
    }).join("") : '<div class="an-empty">No completed services recorded this week yet.</div>';

    /* quick insights */
    const insights = [];
    if (revPct !== null) insights.push(["#12b8a0", ICON.trend, "Revenue " + (revPct >= 0 ? "increased" : "dropped") + " by " + Math.abs(revPct) + "%", "Compared to last week"]);
    else if (revenue > 0) insights.push(["#12b8a0", ICON.trend, "You earned " + inr(revenue) + " this week", "From completed services"]);
    insights.push(["#5b4bd6", ICON.users, (week.done || 0) + " customer" + ((week.done || 0) === 1 ? "" : "s") + " completed" + ((week.done || 0) === 1 ? " a visit" : " visits"), "This week"]);
    if (counts.some(n => n)) {
      const bi = counts.indexOf(Math.max(...counts));
      if (!useMonth) insights.push(["#2f6df6", ICON.cal, DAYS[bi] + " was your busiest day", counts[bi] + " completed visit" + (counts[bi] === 1 ? "" : "s")]);
    }
    insights.push(svcs.length > 2
      ? ["#d9a02c", ICON.star, esc(svcs[0][0]) + " leads your services", "Most booked this week"]
      : ["#d9a02c", ICON.star, "Focus on more services", "Add more services to increase revenue"]);
    const insHtml = insights.slice(0, 4).map(i =>
      '<div class="an-ins"><span class="an-ins-ico" style="background:' + i[0] + '">' + ic(i[1]) + "</span><div>" + i[2] + "<small>" + i[3] + "</small></div></div>").join("");

    box.innerHTML = `
    <div class="an">
      <div class="an-head">
        <span class="an-badge">${ic(ICON.bars)}</span>
        <div><h2>Analytics</h2><p>Track your performance and grow your business.</p></div>
        <div class="an-head-r">
          <span class="an-pill">${ic(ICON.cal)}${fmtS(dates[0])}, ${dates[0].getFullYear()} - ${fmtS(dates[6])}, ${dates[6].getFullYear()}</span>
          <button type="button" class="an-pill" data-an="export">${ic(ICON.dl)}Export</button>
        </div>
      </div>

      <div class="an-kpis">
        <div class="an-kpi an-k1"><span class="an-kico">${ic(ICON.rupee)}</span>
          <span class="an-kl">Total Revenue (This Week)</span><span class="an-kv">${inr(revenue)}</span>${trendNote(revPct, "Completed services this week")}${spark}</div>
        <div class="an-kpi an-k2"><span class="an-kico">${ic(ICON.card)}</span>
          <span class="an-kl">Collected Online (Today)</span><span class="an-kv">${inr(online)}</span>
          <div class="an-kn">${online ? "Paid through the app" : "No online collections yet"}</div></div>
        <div class="an-kpi an-k3"><span class="an-kico">${ic(ICON.check)}</span>
          <span class="an-kl">Completed Visits This Week</span><span class="an-kv">${week.done || 0}</span>${trendNote(donePct, "Since Monday")}</div>
        <div class="an-kpi an-k4"><span class="an-kico">${ic(ICON.star)}</span>
          <span class="an-kl">Average Rating</span><span class="an-kv">${rated ? Number(st.rating.average).toFixed(1) + " ★" : "—"}</span>
          <div class="an-kn">${rated ? st.rating.count + " review" + (st.rating.count === 1 ? "" : "s") : "No ratings yet"}</div></div>
      </div>

      <div class="an-grid">
        <div class="an-col">
          <div class="an-panel">
            <div class="an-ph">${ic(ICON.bars)}<div><h3>Completed Customers This ${useMonth ? "Month" : "Week"}</h3><p>Number of customers who completed their visits.</p></div>
              <div class="an-seg"><button type="button" data-an="week" class="${mode === "week" ? "on" : ""}">Week</button><button type="button" data-an="month" class="${mode === "month" ? "on" : ""}">Month</button></div></div>
            <div class="an-bars" style="grid-template-columns:repeat(${counts.length},minmax(0,1fr))"><div class="an-yax">${yax}</div>${bars}</div>
          </div>
          <div class="an-panel">
            <div class="an-ph">${ic(ICON.trend)}<div><h3>Revenue Trend</h3><p>Daily revenue for this week.</p></div><span class="an-tag">Total: ${inr(revenue)}</span></div>
            ${revChart}
          </div>
        </div>
        <div class="an-col">
          <div class="an-panel"><div class="an-ph">${ic(ICON.star)}<div><h3>Top Services This Week</h3><p>Most popular services based on completed visits.</p></div></div>${svcHtml}</div>
          <div class="an-panel"><div class="an-ph">${ic(ICON.bulb)}<div><h3>Quick Insights</h3></div></div>${insHtml}</div>
        </div>
      </div>
    </div>`;

    /* store for export */
    box._an = { dates, counts: week.daily || [], revDaily, services: week.services || [], revenue };
  };

  /* ---------- clicks: Week/Month toggle + Export ---------- */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("#b-analytics [data-an]");
    if (!b) return;
    const act = b.dataset.an;
    if (act === "week" || act === "month") {
      if (act === "month" && !(S.barberStats && S.barberStats.month)) {
        toast("ℹ️", "Month view needs a 'month.daily' list from the analytics API");
      }
      mode = act;
      window.renderAnalytics();
      return;
    }
    if (act === "export") {
      const d = document.getElementById("b-analytics")._an;
      if (!d) return;
      const rows = [["Date", "Completed customers", "Revenue (INR)"]]
        .concat(d.dates.map((x, i) => [x.toISOString().slice(0, 10), d.counts[i] || 0, Math.round(d.revDaily[i] || 0)]))
        .concat([[], ["Top services"], ["Service", "Bookings"]], d.services);
      const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "glowora-analytics-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast("✅", "Analytics exported");
    }
  });

  /* repaint if the tab is already open when this file loads */
  const tab = document.getElementById("b-analytics-tab");
  if (tab && tab.style.display === "block") window.renderAnalytics();
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast("⚠️", "Could not save on this device"); return false; } };
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const shop = () => String((S.barber && S.barber.shopName) || "").trim().toLowerCase();
  const K_META = () => "bqStaffMeta:" + shop();      // shared with Staff Stats
  const K_BIO = () => "bqStaffBio:" + shop();
  const K_SERVED = () => "bqServedBy:" + shop();
  const K_ASSIGN = () => "bqCrewAssign:" + shop();

  const GRADS = ["#8b5cf6,#5b21b6", "#14b8a6,#0f766e", "#d946ef,#86198f", "#3b82f6,#1d4ed8", "#8b5cf6,#4338ca", "#f59e0b,#b45309"];
  const FRAMES = ["#a23df0", "#18c7a8", "#c94bf0", "#4f6dff", "#7b4bff", "#e0a23a"];
  const STATUS = {
    "Available": ["Active", "ok"], "With Customer": ["With customer", "bl"],
    "On Break": ["On break", "wa"], "Off today": ["On leave", "wa"]
  };
  const ic = p => '<svg class="st-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3"/>',
    cup: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.7" y2="16.7"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.1" y2="15.9"/><line x1="14.5" y1="14.5" x2="20" y2="20"/><line x1="8.1" y1="8.1" x2="12" y2="12"/>',
    chev: '<polyline points="9 18 15 12 9 6"/>'
  };

  /* ---------- styles ---------- */
  const css = document.createElement("style");
  css.textContent = `
  #b-staff-tab > .bq-heading-row,#b-staff-tab > #bq-staff-grid,#b-staff-tab > .bq-footnote{display:none!important}
  .st{--card:#0b1030;--line:rgba(130,120,255,.22);--mute:#97a0c9;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .st *{box-sizing:border-box}
  .st-ic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .st-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px}
  .st-badge{width:56px;height:56px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#7c3aed,#3b1fa8);box-shadow:0 0 22px -6px #7c3aed}
  .st-head h2{margin:0;font:800 28px 'Syne',sans-serif;background:linear-gradient(90deg,#b08cff,#4cc3ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  .st-head p{margin:2px 0 0;font-size:13px;color:var(--mute)}
  .st-tools{margin-left:auto;display:flex;gap:10px;flex-wrap:wrap;flex:1 1 320px;justify-content:flex-end}
  .st-add{display:flex;align-items:center;gap:8px;border:0;border-radius:12px;padding:12px 18px;color:#fff;cursor:pointer;font:700 14px 'DM Sans',sans-serif;
      background:linear-gradient(90deg,#8b2fff,#2d7bff);box-shadow:0 0 20px -6px #7c3aed}
  .st-search{display:flex;align-items:center;gap:8px;flex:1 1 200px;max-width:360px;padding:0 14px;border-radius:12px;background:var(--card);border:1px solid var(--line);color:var(--mute)}
  .st-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:#eef1ff;font:14px 'DM Sans',sans-serif;padding:12px 0}
  .st-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:18px}
  .st-kpi{display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;border:1px solid var(--c);
      background:linear-gradient(135deg,color-mix(in srgb,var(--c) 20%,#080c26),#080c26 70%);box-shadow:0 0 22px -12px var(--c)}
  .st-kico{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;flex:none;color:#fff;background:color-mix(in srgb,var(--c) 60%,#080c26)}
  .st-kico .st-ic{width:26px;height:26px}
  .st-kl{font-size:13px;color:#d4daf7}.st-kv{font:800 30px 'Syne',sans-serif;line-height:1.1}.st-kn{font-size:12px;color:var(--mute)}
  .st-k1{--c:#a23df0}.st-k2{--c:#18c7a8}.st-k3{--c:#3b6dff}.st-k4{--c:#e0a23a}
  .st-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
  .st-card{position:relative;padding:18px 16px 16px;border-radius:18px;border:1px solid var(--f);
      background:linear-gradient(160deg,color-mix(in srgb,var(--f) 10%,#080c26),#080c26 60%);box-shadow:0 0 22px -14px var(--f);display:flex;flex-direction:column}
  .st-tag{position:absolute;top:16px;right:14px;font-size:11px;font-weight:600;padding:4px 10px;border-radius:7px}
  .st-tag.ok{color:#2de2b5;background:rgba(24,199,168,.16);border:1px solid rgba(24,199,168,.35)}
  .st-tag.wa{color:#f0b64a;background:rgba(224,162,58,.14);border:1px solid rgba(224,162,58,.4)}
  .st-tag.bl{color:#7ea6ff;background:rgba(59,109,255,.16);border:1px solid rgba(59,109,255,.4)}
  .st-av{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font:700 22px 'Syne',sans-serif;color:#fff;overflow:hidden;margin-bottom:12px;
      background:linear-gradient(135deg,var(--g));box-shadow:0 0 18px -4px var(--f)}
  .st-av img{width:100%;height:100%;object-fit:cover}
  .st-name{font:700 17px 'Syne',sans-serif}
  .st-role{font-size:13px;color:#8fa4ff;margin:2px 0 6px}
  .st-rate{font-size:12px;color:var(--mute)}.st-rate b{color:#f5b73b;font-weight:700;font-size:13px}.st-rate span{color:#6f8cff}
  .st-met{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:14px 0 12px;padding-top:12px;border-top:1px solid var(--line);text-align:center}
  .st-met div{display:flex;flex-direction:column;align-items:center;gap:1px}
  .st-met .st-ic{width:15px;height:15px;color:#6f8cff}
  .st-met strong{font:700 16px 'DM Sans',sans-serif}.st-met small{font-size:11px;color:var(--mute)}
  .st-bio{font-size:12.5px;line-height:1.5;color:#c3caea;flex:1;margin-bottom:14px}
  .st-view{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:11px;border-radius:12px;cursor:pointer;color:#eef1ff;
      font:600 13px 'DM Sans',sans-serif;background:linear-gradient(90deg,#10184a,#0b1030);border:1px solid var(--f)}
  .st-view .st-ic{width:14px;height:14px}
  .st-empty{grid-column:1/-1;text-align:center;padding:40px 10px;color:var(--mute);font-size:14px}
  .st-pm .row{margin-bottom:12px}.st-pm label{display:block;font-size:12px;color:var(--mute);margin-bottom:4px}
  @media(min-width:720px){.st-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}`;
  document.head.appendChild(css);

  /* ---------- data ---------- */
  function weekBounds() {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return [iso(mon), iso(sun)];
  }

  function build() {
    const b = S.barber || {};
    const meta = rd(K_META(), {}), bios = rd(K_BIO(), {});
    const served = rd(K_SERVED(), {}), asked = rd(K_ASSIGN(), {});
    const [from, to] = weekBounds();
    const appts = (window.bqAppointments || []).filter(a => a && a.date >= from && a.date <= to);

    const members = [];
    if (b.name) members.push({ key: b.name, name: b.name, role: "Owner / Head barber", owner: true, photo: b.photo, shopName: b.shopName });
    rd("barberStaff", []).forEach(m => {
      if (m && m.name && !members.some(x => x.key === m.name))
        members.push({ key: m.name, id: m.id, name: m.name, role: m.role || "Barber", phone: m.phone });
    });

    members.forEach((m, i) => {
      m.i = i;
      const mt = meta[m.key] || {};
      m.status = STATUS[mt.status] ? mt.status : "Available";
      const own = Number(b.rating) > 0 && b.ratingCount > 0;
      m.rating = m.owner && own ? Number(b.rating) : (Number(mt.rating) > 0 ? Number(mt.rating) : null);
      m.reviews = m.owner && own ? Number(b.ratingCount) : 0;
      m.bio = bios[m.key] || (m.owner
        ? "Owner and head barber" + (m.shopName ? " at " + m.shopName + "." : ".")
        : "Specialist in " + String(m.role).toLowerCase() + ".");
      m.bookings = 0; m.services = 0;
    });
    appts.forEach(a => {
      const id = String(a.id), pick = asked[id] && asked[id] !== "Anyone" ? asked[id] : "";
      const who = members.find(m => m.key === (served[id] || pick));
      if (!who || a.status === "cancelled") return;
      who.bookings++;
      if (a.status === "completed") who.services++;
    });
    const totalServices = appts.filter(a => a.status === "completed").length;
    return { members, totalServices };
  }

  /* ---------- render ---------- */
  function shell() {
    const tab = $("b-staff-tab");
    if (!tab) return null;
    let root = $("st-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "st-root";
    root.className = "st";
    root.innerHTML = `
      <div class="st-head">
        <span class="st-badge">${ic(ICON.users)}</span>
        <div><h2>Our Crew</h2><p>Meet the talented people who make your experience special.</p></div>
        <div class="st-tools">
          <button type="button" class="st-add" data-st="add">${ic(ICON.plus)}Add Staff Member</button>
          <label class="st-search">${ic(ICON.search)}<input id="st-q" type="search" placeholder="Search staff..." autocomplete="off"></label>
        </div>
      </div>
      <div class="st-kpis" id="st-kpis"></div>
      <div class="st-grid" id="st-grid"></div>
      <p class="bq-muted" style="margin-top:14px;font-size:12px">Team members are saved on this device. Bookings and services count this week's appointments assigned to each person.</p>`;
    tab.insertBefore(root, tab.firstChild);

    $("st-q").addEventListener("input", paint);
    root.addEventListener("click", e => {
      if (e.target.closest("[data-st='add']")) { window.bqOpenStaffModal(); return; }
      const v = e.target.closest("[data-view]");
      if (v) openProfile(v.dataset.view);
    });
    return root;
  }

  function paint() {
    if (!$("st-root")) return;
    const { members, totalServices } = build();
    const q = ($("st-q").value || "").trim().toLowerCase();
    const rated = members.filter(m => m.rating !== null);
    const avg = rated.length ? rated.reduce((t, m) => t + m.rating, 0) / rated.length : null;
    const active = members.filter(m => m.status !== "Off today").length;

    const k = (cls, icon, label, val, note) =>
      '<div class="st-kpi ' + cls + '"><span class="st-kico">' + ic(icon) + '</span><div><div class="st-kl">' + label +
      '</div><div class="st-kv">' + val + '</div><div class="st-kn">' + note + "</div></div></div>";
    $("st-kpis").innerHTML =
      k("st-k1", ICON.users, "Total Staff", members.length, "Active members") +
      k("st-k2", ICON.user, "Active Today", active, "On duty") +
      k("st-k3", ICON.star, "Avg. Rating", avg === null ? "—" : avg.toFixed(1), "Across all staff") +
      k("st-k4", ICON.cup, "Total Services", totalServices, "This week");

    const list = members.filter(m => !q || (m.name + " " + m.role).toLowerCase().includes(q));
    $("st-grid").innerHTML = list.length ? list.map(m => {
      const [label, cls] = STATUS[m.status];
      const g = GRADS[m.i % GRADS.length], f = FRAMES[m.i % FRAMES.length];
      const rateLine = m.rating !== null
        ? "<b>★ " + m.rating.toFixed(1) + "</b>" + (m.reviews ? " <span>(" + m.reviews + " review" + (m.reviews === 1 ? "" : "s") + ")</span>" : "")
        : '<span style="color:#97a0c9">No rating yet</span>';
      return '<div class="st-card" style="--f:' + f + '"><span class="st-tag ' + cls + '">' + label + "</span>" +
        '<div class="st-av" style="--g:' + g + '">' + (m.photo ? '<img alt="" src="' + esc(m.photo) + '">' : esc(m.name.charAt(0).toUpperCase())) + "</div>" +
        '<div class="st-name">' + esc(m.name) + '</div><div class="st-role">' + esc(m.role) + '</div><div class="st-rate">' + rateLine + "</div>" +
        '<div class="st-met"><div>' + ic(ICON.cal) + "<strong>" + m.bookings + "</strong><small>Bookings</small></div>" +
        "<div>" + ic(ICON.cut) + "<strong>" + m.services + "</strong><small>Services</small></div>" +
        "<div>" + ic(ICON.star) + "<strong>" + (m.rating !== null ? m.rating.toFixed(1) : "—") + "</strong><small>Rating</small></div></div>" +
        '<div class="st-bio">' + esc(m.bio) + "</div>" +
        '<button type="button" class="st-view" data-view="' + esc(m.key) + '">View Profile' + ic(ICON.chev) + "</button></div>";
    }).join("") : '<div class="st-empty">' + (members.length
      ? "No team members match your search."
      : "No team members yet. Tap “Add Staff Member” to add your first one.") + "</div>";
  }

  window.bqLoadStaff = function () { if (shell()) paint(); };

  /* ---------- profile popup ---------- */
  function ensureProfileModal() {
    if ($("m-stprofile")) return;
    const w = document.createElement("div");
    w.className = "overlay";
    w.id = "m-stprofile";
    w.innerHTML = `
      <div class="modal st st-pm" style="max-height:90vh;overflow:auto">
        <div id="stp-head" style="display:flex;align-items:center;gap:12px;margin-bottom:16px"></div>
        <div class="row"><label>Status</label>
          <select class="inp" id="stp-status">${Object.keys(STATUS).map(s => "<option>" + s + "</option>").join("")}</select></div>
        <div class="row"><label>Rating (0–5)</label><input class="inp" id="stp-rating" type="number" min="0" max="5" step="0.1" inputmode="decimal" placeholder="optional"></div>
        <div class="row"><label>About</label><textarea class="inp" id="stp-bio" rows="3" maxlength="140" placeholder="Short description shown on the card"></textarea></div>
        <div id="stp-phone" style="font-size:12px;color:var(--mute);margin-bottom:14px"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-outline" style="flex:1" type="button" id="stp-close">Close</button>
          <button class="btn btn-gold" style="flex:1" type="button" id="stp-save">Save</button>
        </div>
        <button class="btn btn-outline btn-full" style="margin-top:10px;color:#ff6b6b;border-color:#ff6b6b" type="button" id="stp-remove">Remove from team</button>
      </div>`;
    document.body.appendChild(w);
    w.addEventListener("click", e => { if (e.target === w) closeModal("m-stprofile"); });
    $("stp-close").addEventListener("click", () => closeModal("m-stprofile"));
  }

  function openProfile(key) {
    const m = build().members.find(x => x.key === key);
    if (!m) return;
    ensureProfileModal();
    const g = GRADS[m.i % GRADS.length];
    $("stp-head").innerHTML =
      '<div class="st-av" style="--g:' + g + ';--f:' + FRAMES[m.i % FRAMES.length] + ';margin:0">' +
      (m.photo ? '<img alt="" src="' + esc(m.photo) + '">' : esc(m.name.charAt(0).toUpperCase())) + "</div>" +
      '<div><div class="st-name">' + esc(m.name) + '</div><div class="st-role" style="margin:0">' + esc(m.role) + "</div></div>";
    $("stp-status").value = m.status;
    $("stp-rating").value = m.rating !== null ? m.rating : "";
    $("stp-rating").disabled = !!(m.owner && m.reviews);
    $("stp-bio").value = rd(K_BIO(), {})[m.key] || "";
    $("stp-phone").textContent = m.phone ? "Phone: +91 " + m.phone : (m.owner ? "Edit your details in Profile." : "");
    $("stp-remove").style.display = m.owner ? "none" : "block";

    $("stp-save").onclick = () => {
      const raw = $("stp-rating").value.trim(), r = raw === "" ? 0 : Number(raw);
      if (isNaN(r) || r < 0 || r > 5) { toast("⚠️", "Rating must be between 0 and 5"); return; }
      const mt = rd(K_META(), {});
      mt[m.key] = Object.assign({}, mt[m.key], { status: $("stp-status").value });
      if (!$("stp-rating").disabled) mt[m.key].rating = r;
      const bios = rd(K_BIO(), {}); bios[m.key] = $("stp-bio").value.trim();
      if (wr(K_META(), mt) && wr(K_BIO(), bios)) {
        closeModal("m-stprofile");
        paint();
        toast("✅", "Saved " + m.name);
      }
    };
    $("stp-remove").onclick = () => {
      closeModal("m-stprofile");
      window.bqDeleteStaff(m.id);
    };
    openModal("m-stprofile");
  }

  /* ---------- "About" field in the Add popup ---------- */
  function ensureBioField() {
    if ($("bq-staff-bio")) return;
    const role = $("bq-staff-role");
    if (!role) return;
    const d = document.createElement("div");
    d.innerHTML = '<label>About (optional)</label><textarea class="inp" id="bq-staff-bio" rows="2" maxlength="140" placeholder="e.g. Expert in modern cuts and beard styling"></textarea>';
    role.parentElement.insertAdjacentElement("afterend", d);
  }
  const baseOpen = window.bqOpenStaffModal;
  window.bqOpenStaffModal = function () {
    ensureBioField();
    const out = baseOpen.apply(this, arguments);
    const bio = $("bq-staff-bio"); if (bio) bio.value = "";
    return out;
  };
  const baseAdd = window.bqAddStaff;
  window.bqAddStaff = function () {
    const name = ($("bq-staff-name") || {}).value ? $("bq-staff-name").value.trim() : "";
    const bio = ($("bq-staff-bio") || {}).value ? $("bq-staff-bio").value.trim() : "";
    const before = rd("barberStaff", []).length;
    const out = baseAdd.apply(this, arguments);
    if (bio && name && rd("barberStaff", []).length > before) {
      const bios = rd(K_BIO(), {}); bios[name] = bio; wr(K_BIO(), bios);
      paint();
    }
    return out;
  };

  /* repaint now if the tab is already open */
  const tab = $("b-staff-tab");
  if (tab && tab.style.display === "block") window.bqLoadStaff();
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
  const ic = p => '<svg class="pf-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
    shop: '<path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><rect x="10" y="14" width="4" height="6"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.1" y2="15.9"/><line x1="14.5" y1="14.5" x2="20" y2="20"/><line x1="8.1" y1="8.1" x2="12" y2="12"/>',
    star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3"/>',
    id: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0"/><line x1="15" y1="10" x2="19" y2="10"/><line x1="15" y1="14" x2="19" y2="14"/>'
  };

  const css = document.createElement("style");
  css.textContent = `
  #b-profile-tab > *:not(#pf-root){display:none!important}
  .pf{--card:#0a0f33;--line:rgba(110,110,255,.22);--mute:#97a0c9;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .pf *{box-sizing:border-box}
  .pf-ic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .pf-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
  .pf-badge{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;color:#c9b8ff;background:#241a6b;border:1px solid #5a43d8}
  .pf-head h2{margin:0;font:800 24px 'Syne',sans-serif}
  .pf-head p{margin:2px 0 0;font-size:13px;color:var(--mute)}
  .pf-grid{display:grid;grid-template-columns:1fr;gap:14px}
  .pf-col{display:flex;flex-direction:column;gap:14px;min-width:0}
  .pf-card{border-radius:18px;padding:18px;background:var(--card);border:1px solid var(--line)}
  .pf-hero{text-align:center;padding:28px 18px 22px;border-color:#5b3df0;
      background:radial-gradient(120% 90% at 50% 0%,#2a1f8f 0%,#0a0f33 62%);box-shadow:0 0 30px -12px #6a4bff}
  .pf-av{position:relative;width:104px;height:104px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;
      border:2px solid #38e1ff;box-shadow:0 0 24px -2px #38e1ff99,inset 0 0 18px -6px #38e1ff;
      font:700 42px 'Syne',sans-serif;color:#38e1ff;background:#0a1240}
  .pf-av img{width:100%;height:100%;border-radius:50%;object-fit:cover}
  .pf-pen{position:absolute;right:-2px;bottom:4px;width:30px;height:30px;border-radius:50%;border:0;cursor:pointer;
      display:grid;place-items:center;color:#fff;background:#5b3df0;box-shadow:0 0 0 3px #0a0f33}
  .pf-name{font:700 24px 'Syne',sans-serif}
  .pf-role{font-size:13px;color:var(--mute);margin:2px 0 8px}
  .pf-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600;
      color:#d9cfff;background:#2a1f8f;border:1px solid #6a4bff}
  .pf-contact{margin-top:16px;display:inline-flex;flex-direction:column;gap:8px;text-align:left;font-size:13.5px}
  .pf-contact div{display:flex;align-items:center;gap:10px}
  .pf-contact .pf-ic{color:#8da0ff}
  .pf-h3{margin:0 0 12px;font:700 15px 'Syne',sans-serif;display:flex;align-items:center;gap:8px}
  .pf-btn{margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;cursor:pointer;
      font:600 12px 'DM Sans',sans-serif;color:#eef1ff;background:#141b55;border:1px solid #3b46c8}
  .pf-shop{display:flex;gap:14px}
  .pf-shop-ico{width:52px;height:52px;border-radius:14px;flex:none;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#6a4bff,#3a2cc0)}
  .pf-shop-ico .pf-ic{width:26px;height:26px}
  .pf-shop h4{margin:0 0 4px;font:700 16px 'Syne',sans-serif}
  .pf-shop p{margin:0 0 4px;font-size:12.5px;line-height:1.5;color:#c3caea}
  .pf-pill{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600}
  .pf-pill.on{color:#2de2b5;background:rgba(24,199,168,.14);border:1px solid rgba(24,199,168,.4)}
  .pf-pill.off{color:#ff8b8b;background:rgba(255,107,107,.12);border:1px solid rgba(255,107,107,.4)}
  .pf-pill i{width:7px;height:7px;border-radius:50%;background:currentColor}
  .pf-row{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid var(--line);font-size:13.5px}
  .pf-row:first-of-type{border-top:0}
  .pf-row span{color:var(--mute);flex:none}
  .pf-row strong{font-weight:600;text-align:right;overflow-wrap:anywhere}
  .pf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center}
  .pf-stat .pf-si{width:54px;height:54px;margin:0 auto 8px;border-radius:14px;display:grid;place-items:center;color:#fff;background:var(--c)}
  .pf-stat .pf-si .pf-ic{width:24px;height:24px}
  .pf-stat strong{display:block;font:700 22px 'Syne',sans-serif}
  .pf-stat small{font-size:12px;color:var(--mute)}
  .pf-foot{display:flex;gap:10px;flex-wrap:wrap}
  .pf-foot button{flex:1 1 140px;padding:11px;border-radius:11px;cursor:pointer;font:600 13px 'DM Sans',sans-serif;color:#eef1ff;background:#141b55;border:1px solid #3b46c8}
  .pf-foot button.danger{color:#ff8b8b;border-color:#ff6b6b;background:transparent}
  @media(min-width:820px){.pf-grid{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr)}}`;
  document.head.appendChild(css);

  function shell() {
    const tab = $("b-profile-tab");
    if (!tab) return null;
    let root = $("pf-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "pf-root";
    root.className = "pf";
    tab.insertBefore(root, tab.firstChild);
    root.addEventListener("click", e => {
      const a = e.target.closest("[data-pf]");
      if (!a) return;
      const act = a.dataset.pf;
      if (act === "photo") window.updateShopPhoto();
      else if (act === "edit") window.editBarberProfile();
      else if (act === "logout") window.logoutBarber();
      else if (act === "delete") window.deleteBarberAccount();
    });
    return root;
  }

  function paint() {
    const root = shell();
    if (!root) return;
    const b = S.barber || {};

    /* remember when the account was first seen, so "Date of Joining" is stable */
    if (b.name && !b.joinedAt) {
      b.joinedAt = new Date().toISOString();
      if (typeof saveBarberProfileLocal === "function") saveBarberProfileLocal();
    }
    const joined = b.joinedAt
      ? new Date(b.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
    const staffCount = (b.name ? 1 : 0) + rd("barberStaff", []).length;
    const weekDone = S.barberStats && S.barberStats.week ? Number(S.barberStats.week.done) || 0 : 0;
    const rating = Number(b.rating) > 0 ? Number(b.rating).toFixed(1) : "—";
    const hours = b.openingTime && b.closingTime ? b.openingTime + " – " + b.closingTime : "";
    const bank = b.payoutBank && b.payoutLast4 ? b.payoutBank + " ••••" + b.payoutLast4 : "Not set";
    const open = S.shopOpen !== false;
    const nm = b.name || "Not set";

    const row = (l, v) => '<div class="pf-row"><span>' + l + "</span><strong>" + esc(v) + "</strong></div>";
    const stat = (c, icon, n, l) =>
      '<div class="pf-stat" style="--c:' + c + '"><div class="pf-si">' + ic(icon) + "</div><strong>" + n + "</strong><small>" + l + "</small></div>";

    root.innerHTML = `
      <div class="pf-head"><span class="pf-badge">${ic(ICON.user)}</span>
        <div><h2>Profile</h2><p>Manage your personal and shop information.</p></div></div>
      <div class="pf-grid">
        <div class="pf-col">
          <div class="pf-card pf-hero">
            <div class="pf-av">${b.photo ? '<img alt="" src="' + esc(b.photo) + '">' : esc(nm.charAt(0).toUpperCase())}
              <button type="button" class="pf-pen" data-pf="photo" aria-label="Change photo">${ic(ICON.pen)}</button></div>
            <div class="pf-name">${esc(nm)}</div>
            <div class="pf-role">Owner</div>
            <span class="pf-chip">${ic(ICON.id)}Shop Owner</span>
            <div><div class="pf-contact">
              <div>${ic(ICON.phone)}${esc(b.phone || "Phone not set")}</div>
              <div>${ic(ICON.mail)}${esc(b.email || "Email not set")}</div></div></div>
          </div>
          <div class="pf-card">
            <h3 class="pf-h3">Shop Information<button type="button" class="pf-btn" data-pf="edit">${ic(ICON.pen)}Edit</button></h3>
            <div class="pf-shop"><span class="pf-shop-ico">${ic(ICON.shop)}</span>
              <div><h4>${esc(b.shopName || "Shop name not set")}</h4>
                <p>${esc(b.address || "Address not set")}</p>
                ${hours ? "<p>Hours: " + esc(hours) + "</p>" : ""}
                <span class="pf-pill ${open ? "on" : "off"}"><i></i>${open ? "Open" : "Closed"}</span></div></div>
          </div>
        </div>
        <div class="pf-col">
          <div class="pf-card">
            <h3 class="pf-h3">Personal Information</h3>
            ${row("Full Name", nm)}${row("Phone Number", b.phone || "Not set")}${row("Email Address", b.email || "Not set")}
            ${row("Role", "Owner / Head Barber")}${row("Date of Joining", joined)}${row("Payout Account", bank)}
          </div>
          <div class="pf-card">
            <h3 class="pf-h3">Quick Stats</h3>
            <div class="pf-stats">
              ${stat("#4b3fd8", ICON.users, staffCount, "Total Staff")}
              ${stat("#8a3fd1", ICON.cut, weekDone, "Services This Week")}
              ${stat("#2f5fd6", ICON.star, rating, "Avg. Rating")}
            </div>
          </div>
          <div class="pf-foot">
            <button type="button" data-pf="logout">Logout</button>
            <button type="button" class="danger" data-pf="delete">Delete Account</button>
          </div>
        </div>
      </div>`;
  }

  /* keep every existing caller working: run the old render, then ours */
  const baseRender = window.renderBarberProfile;
  window.renderBarberProfile = function () {
    const out = typeof baseRender === "function" ? baseRender.apply(this, arguments) : undefined;
    paint();
    return out;
  };

  /* ---------- Email field in the Edit popup ---------- */
  function ensureEmailField() {
    if ($("bp-email")) return;
    const phone = $("bp-phone");
    if (!phone) return;
    const d = document.createElement("div");
    d.innerHTML = '<label>Email Address</label><input class="inp" id="bp-email" type="email" maxlength="80" placeholder="you@example.com">';
    phone.parentElement.insertAdjacentElement("afterend", d);
  }
  const baseEdit = window.editBarberProfile;
  window.editBarberProfile = function () {
    ensureEmailField();
    const out = baseEdit.apply(this, arguments);
    const el = $("bp-email"); if (el) el.value = (S.barber && S.barber.email) || "";
    return out;
  };
  const baseSave = window.saveBarberProfile;
  window.saveBarberProfile = function () {
    const el = $("bp-email"), email = el ? el.value.trim() : "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast("⚠️", "Please enter a valid email address");
      if (el) el.focus();
      return;
    }
    const out = baseSave.apply(this, arguments);
    const modal = $("m-editbarber");
    if (!(modal && modal.classList.contains("open"))) {      // base accepted the save
      S.barber.email = email;
      if (typeof saveBarberProfileLocal === "function") saveBarberProfileLocal();
      window.renderBarberProfile();
    }
    return out;
  };

  /* repaint now, and when the shop is toggled open/closed */
  paint();
  const baseToggle = window.toggleShop;
  if (typeof baseToggle === "function") {
    window.toggleShop = function () {
      const out = baseToggle.apply(this, arguments);
      paint();
      return out;
    };
  }
})();
/* remember Open/Closed across reloads */
(function () {
  const KEY = "barberShopOpen";
  const paintBtn = () => {
    const el = document.getElementById("shop-status");
    if (!el) return;
    el.textContent = S.shopOpen ? "● Open" : "● Closed";
    el.className = "tag " + (S.shopOpen ? "tgreen pulse" : "tred");
  };

  const base = window.toggleShop;
  window.toggleShop = function () {
    const out = base.apply(this, arguments);
    try { localStorage.setItem(KEY, S.shopOpen ? "1" : "0"); } catch (e) {}
    return out;
  };

  const saved = localStorage.getItem(KEY);
  if (saved !== null) {
    S.shopOpen = saved === "1";
    paintBtn();
    if (typeof syncShopStats === "function") syncShopStats();   // tell customers
  }
})();
/* auto open / close by the shop's opening hours */
(function () {
  const toMin = t => { const [h, m] = String(t || "").split(":").map(Number); return h * 60 + (m || 0); };

  function insideHours() {
    const b = S.barber || {};
    if (!b.openingTime || !b.closingTime) return null;          // hours not set
    const n = new Date(), now = n.getHours() * 60 + n.getMinutes();
    const o = toMin(b.openingTime), c = toMin(b.closingTime);
    return o < c ? (now >= o && now < c) : (now >= o || now < c); // handles past-midnight hours
  }

  let last = null;
  function tick() {
    if (S.role !== "barber") return;
    if (localStorage.getItem("bqAutoHours") === "0") return;     // set to "0" to turn this off
    const inside = insideHours();
    if (inside === null) return;
    if (inside !== last) {                                       // only act when the clock crosses open/close time
      last = inside;
      if (S.shopOpen !== inside) window.toggleShop();            // updates button, toast and customers
    }
  }

  setInterval(tick, 30000);
  setTimeout(tick, 3000);
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
  const PREF_KEY = "bqPrefs";
  const prefs = Object.assign({ compact: false, noMotion: false, bookingAlerts: true }, rd(PREF_KEY, {}));
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} };
  const ic = p => '<svg class="sx-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    shop: '<path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.1" y2="15.9"/><line x1="14.5" y1="14.5" x2="20" y2="20"/><line x1="8.1" y1="8.1" x2="12" y2="12"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12" y2="17"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    chev: '<polyline points="9 18 15 12 9 6"/>',
    back: '<polyline points="15 18 9 12 15 6"/>'
  };

  const css = document.createElement("style");
  css.textContent = `
  #b-settings-tab:not(.sx-detail) > :not(#sx-root){display:none!important}
  #b-settings-tab.sx-detail > :not(#sx-root):not(.sx-show){display:none!important}
  #b-settings-tab.sx-detail #sx-home{display:none}
  #b-settings-tab:not(.sx-detail) #sx-back{display:none}
  .sx{--card:#0a0f33;--line:rgba(110,110,255,.22);--mute:#97a0c9;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .sx *{box-sizing:border-box}
  .sx-ic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .sx h2{margin:0;font:800 26px 'Syne',sans-serif}
  .sx-sub{margin:4px 0 18px;font-size:13px;color:var(--mute)}
  .sx-grid{display:grid;grid-template-columns:1fr;gap:14px}
  .sx-col{display:flex;flex-direction:column;gap:14px;min-width:0}
  .sx-card{border-radius:18px;padding:18px;background:var(--card);border:1px solid var(--line)}
  .sx-card h3{margin:0;font:700 16px 'Syne',sans-serif}
  .sx-card > p{margin:3px 0 10px;font-size:12px;color:var(--mute)}
  .sx-row{display:flex;align-items:center;gap:14px;width:100%;padding:13px 0;border:0;border-top:1px solid var(--line);background:none;
      color:inherit;text-align:left;cursor:pointer;font:inherit}
  .sx-row:first-of-type{border-top:0}
  .sx-row:hover .sx-ch{color:#fff}
  .sx-ico{width:42px;height:42px;border-radius:12px;flex:none;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#6a4bff,#3a2cc0)}
  .sx-ico .sx-ic{width:20px;height:20px}
  .sx-t{flex:1;min-width:0}.sx-t b{display:block;font-weight:600;font-size:14px}.sx-t small{font-size:11.5px;color:var(--mute)}
  .sx-ch{color:var(--mute)}
  .sx-sw{position:relative;width:42px;height:24px;border-radius:14px;border:0;cursor:pointer;flex:none;background:#2a3070;transition:background .15s}
  .sx-sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s}
  .sx-sw[aria-checked="true"]{background:#1f7bff}.sx-sw[aria-checked="true"]::after{transform:translateX(18px)}
  .sx-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:14px;padding:8px 12px;border-radius:10px;cursor:pointer;
      font:600 13px 'DM Sans',sans-serif;color:#eef1ff;background:#141b55;border:1px solid #3b46c8}
  .sx-detail-title{margin:0 0 14px;font:800 20px 'Syne',sans-serif}
  .sx-compact .pad{padding-left:10px!important;padding-right:10px!important}
  .sx-compact .card,.sx-compact .stat,.sx-compact .qi{padding:10px!important}
  .sx-compact .sx-card,.sx-compact .an-panel,.sx-compact .st-card,.sx-compact .pf-card,.sx-compact .bq-panel{padding:12px!important}
  .sx-compact .sx-row{padding:8px 0}
  .sx-nomo *,.sx-nomo *::before,.sx-nomo *::after{animation:none!important;transition:none!important}
  @media(min-width:820px){.sx-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}`;
  document.head.appendChild(css);

  function applyPrefs() {
    document.documentElement.classList.toggle("sx-compact", !!prefs.compact);
    document.documentElement.classList.toggle("sx-nomo", !!prefs.noMotion);
  }
  applyPrefs();

  /* booking-request alerts can be switched off */
  const baseToast = window.toast;
  if (typeof baseToast === "function") {
    window.toast = function (a, b) {
      if (prefs.bookingAlerts === false && /New booking request/.test(String(b || a))) return;
      return baseToast.apply(this, arguments);
    };
  }

  const tabBtn = () => $("b-settings-tab");
  const row = (id, icon, title, sub) =>
    '<button type="button" class="sx-row" data-sx="' + id + '"><span class="sx-ico">' + ic(icon) + '</span><span class="sx-t"><b>' +
    title + "</b><small>" + sub + '</small></span><span class="sx-ch">' + ic(ICON.chev) + "</span></button>";
  const sw = (id, icon, title, sub, on) =>
    '<div class="sx-row" style="cursor:default"><span class="sx-ico">' + ic(icon) + '</span><span class="sx-t"><b>' + title +
    "</b><small>" + sub + '</small></span><button type="button" class="sx-sw" role="switch" data-sw="' + id +
    '" aria-label="' + title + '" aria-checked="' + (on ? "true" : "false") + '"></button></div>';

  let shown = [];
  function clearShown() {
    shown.forEach(n => n && n.classList.remove("sx-show"));
    shown = [];
  }
  function showDetail(title, nodes, notif) {
    const tab = tabBtn();
    clearShown();
    shown = nodes.filter(Boolean);
    shown.forEach(n => n.classList.add("sx-show"));
    $("sx-detail-title").textContent = title;
    $("sx-notif").style.display = notif ? "block" : "none";
    tab.classList.add("sx-detail");
    tab.scrollTop = 0;
  }
  function home() {
    clearShown();
    const tab = tabBtn();
    if (!tab) return;
    tab.classList.remove("sx-detail");
    if ($("sx-notif")) $("sx-notif").style.display = "none";
  }

  const saveParts = () => [
    document.querySelector("#b-settings-tab > button.btn-gold"),
    $("bq-settings-message")
  ];

  const ACTIONS = {
    info: () => showDetail("Shop Information", [$("bq-sec-info"), $("bq-sec-photo")].concat(saveParts())),
    hours: () => window.editBarberProfile(),
    services: () => window.bTab("svc"),
    pay: () => showDetail("UPI & Payment Settings", [$("bq-sec-pay")].concat(saveParts())),
    booking: () => {
      if (typeof window.bqRenderSettings === "function") window.bqRenderSettings();   // creates the card
      showDetail("Advance Booking", [$("bk-settings")]);
    },
    profile: () => window.bTab("profile"),
    logout: () => window.logoutBarber(),
    notif: () => showDetail("Notification Preferences", [], true),
    help: () => window.go("s-support"),
    contact: () => { window.location.href = "mailto:support@barberq.app?subject=Glowora%20support"; }
  };

  function shell() {
    const tab = tabBtn();
    if (!tab) return null;
    let root = $("sx-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "sx-root";
    root.className = "sx";
    root.innerHTML = `
      <div id="sx-back"><button type="button" class="sx-back" data-sx="back">${ic(ICON.back)}Back to settings</button>
        <h3 class="sx-detail-title" id="sx-detail-title"></h3></div>
      <div id="sx-notif" style="display:none"><div class="sx-card">
        ${sw("bookingAlerts", ICON.cal, "New booking requests", "Show an alert when a customer asks for a time slot", prefs.bookingAlerts)}
        <p style="margin:12px 0 0">Saved on this device.</p></div></div>
      <div id="sx-home">
        <h2>Settings</h2>
        <p class="sx-sub">Manage your shop, preferences and account settings.</p>
        <div class="sx-grid">
          <div class="sx-col">
            <div class="sx-card"><h3>Shop Settings</h3><p>Update your shop details, timings and services.</p>
              ${row("info", ICON.shop, "Shop Information", "Edit name, address, photo")}
              ${row("hours", ICON.clock, "Opening Hours", "Set your shop timings")}
              ${row("services", ICON.scissors, "Services &amp; Pricing", "Manage services and rates")}
              ${row("pay", ICON.card, "UPI &amp; Payment Settings", "Configure payment methods")}
              ${row("booking", ICON.cal, "Advance Booking", "Days, slots and days off")}</div>
            <div class="sx-card"><h3>Appearance</h3><p>Customise your dashboard look.</p>
              ${sw("compact", ICON.grid, "Compact View", "Tighter spacing on every page", prefs.compact)}
              ${sw("noMotion", ICON.zap, "Reduce Motion", "Turn off animations", prefs.noMotion)}</div>
          </div>
          <div class="sx-col">
            <div class="sx-card"><h3>Account Settings</h3><p>Manage your profile and security.</p>
              ${row("profile", ICON.user, "Profile Information", "Update your personal details")}
              ${row("notif", ICON.bell, "Notification Preferences", "Choose what you want to receive")}
              ${row("logout", ICON.logout, "Logout", "Sign out of this device")}</div>
            <div class="sx-card"><h3>Support &amp; Help</h3><p>Get help or contact our support team.</p>
              ${row("help", ICON.help, "Help Center", "FAQs and guides")}
              ${row("contact", ICON.chat, "Contact Support", "We're here to help")}</div>
          </div>
        </div>
      </div>`;
    tab.insertBefore(root, tab.firstChild);

    root.addEventListener("click", e => {
      const s = e.target.closest("[data-sw]");
      if (s) {
        const k = s.dataset.sw;
        prefs[k] = !prefs[k];
        savePrefs();
        applyPrefs();
        root.querySelectorAll('[data-sw="' + k + '"]').forEach(x => x.setAttribute("aria-checked", prefs[k] ? "true" : "false"));
        return;
      }
      const r = e.target.closest("[data-sx]");
      if (!r) return;
      if (r.dataset.sx === "back") { home(); return; }
      const fn = ACTIONS[r.dataset.sx];
      if (fn) fn();
    });
    return root;
  }

  /* opening the Settings tab always starts on the home grid */
  const baseBTab = window.bTab;
  window.bTab = function (tab) {
    const out = baseBTab.apply(this, arguments);
    if (tab === "settings") { shell(); home(); }
    else if (tabBtn()) tabBtn().classList.remove("sx-detail");
    return out;
  };

  shell();
  const t = tabBtn();
  if (t && t.style.display === "block") home();
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const mins = t => { const [h, m] = String(t || "").split(":").map(Number); return isNaN(h) ? NaN : h * 60 + (m || 0); };
  const hhmm = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  const ic = p => '<svg class="cl-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    left: '<polyline points="15 18 9 12 15 6"/>', right: '<polyline points="9 18 15 12 9 6"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    shop: '<path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>'
  };
  const COLORS = ["#8b5cf6", "#14b8a6", "#f59e0b", "#3b82f6", "#ec4899", "#22d3ee"];
  const PX = 58;                                   // pixels per hour
  const cleanSvc = s => String(s || "").replace(/\s·\sadvance$/, "");
  const colorOf = name => {
    const i = (S.services || []).findIndex(s => s.name === name);
    if (i >= 0) return COLORS[i % COLORS.length];
    let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return COLORS[h % COLORS.length];
  };
  const monday = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

  let ws = monday(new Date());                      // week start shown
  let miniM = new Date(ws.getFullYear(), ws.getMonth(), 1);

  const css = document.createElement("style");
  css.textContent = `
  #b-calendar-tab > :not(#cl-root){display:none!important}
  .cl{--card:#0a0f33;--line:rgba(110,110,255,.2);--mute:#97a0c9;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .cl *{box-sizing:border-box}
  .cl-ic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .cl-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
  .cl-badge{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:#c9b8ff;background:#241a6b;border:1px solid #5a43d8}
  .cl-head h2{margin:0;font:800 24px 'Syne',sans-serif}.cl-head p{margin:2px 0 0;font-size:13px;color:var(--mute)}
  .cl-tools{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .cl-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;cursor:pointer;color:#eef1ff;
      font:600 13px 'DM Sans',sans-serif;background:var(--card);border:1px solid var(--line)}
  .cl-btn:hover{border-color:#5b6cff}
  .cl-range{display:inline-flex;align-items:center;gap:10px;padding:6px 8px 6px 12px;border-radius:10px;background:var(--card);border:1px solid var(--line);font:600 13px 'DM Sans',sans-serif}
  .cl-range button{border:0;background:none;color:inherit;cursor:pointer;display:grid;place-items:center;padding:4px}
  .cl-add{border:0;background:linear-gradient(90deg,#7c3aed,#4f46e5);box-shadow:0 0 18px -6px #7c3aed}
  .cl-layout{display:grid;grid-template-columns:1fr;gap:14px}
  .cl-side{display:flex;flex-direction:column;gap:14px}
  .cl-box{border-radius:16px;padding:14px;background:var(--card);border:1px solid var(--line)}
  .cl-mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font:700 15px 'Syne',sans-serif}
  .cl-mh button{border:0;background:none;color:inherit;cursor:pointer;display:grid;place-items:center;padding:4px}
  .cl-mg{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:12px}
  .cl-mg .w{color:var(--mute);font-size:11px;padding:4px 0}
  .cl-mg button{border:0;background:none;color:#eef1ff;height:30px;border-radius:50%;cursor:pointer;font:inherit}
  .cl-mg button.o{color:#5f6896}
  .cl-mg button.in{background:rgba(110,100,255,.16);border-radius:0}
  .cl-mg button.t{background:#6a4bff;color:#fff;font-weight:700;border-radius:50%}
  .cl-leg div{display:flex;align-items:center;gap:10px;padding:8px 2px;font-size:13px}
  .cl-leg i{width:10px;height:10px;border-radius:50%;flex:none}
  .cl-leg b{margin-left:auto;font-weight:600}
  .cl-main{border-radius:16px;background:var(--card);border:1px solid var(--line);overflow:auto;max-height:74vh;min-width:0}
  .cl-grid{display:grid;grid-template-columns:54px repeat(7,minmax(104px,1fr));min-width:820px}
  .cl-dh{position:sticky;top:0;z-index:4;padding:10px 4px;text-align:center;font-size:13px;background:var(--card);border-bottom:1px solid var(--line)}
  .cl-dh b{display:block;font-weight:700}.cl-dh small{color:var(--mute);font-size:11px}
  .cl-dh.today{background:#5b3df0;border-radius:10px;margin:6px 4px 0;border-bottom:0}
  .cl-dh.today small{color:#dcd3ff}
  .cl-times div{height:${PX}px;font-size:11px;color:var(--mute);text-align:right;padding-right:8px;transform:translateY(-7px)}
  .cl-times{padding-top:8px}
  .cl-col{position:relative;border-left:1px solid var(--line);
      background:repeating-linear-gradient(to bottom,transparent 0,transparent ${PX - 1}px,rgba(110,110,255,.14) ${PX - 1}px,rgba(110,110,255,.14) ${PX}px)}
  .cl-col.today{background-color:rgba(91,61,240,.1)}
  .cl-ev{position:absolute;padding:6px 8px;border-radius:9px;overflow:hidden;cursor:pointer;font-size:11px;line-height:1.3;border:1px solid var(--c);
      background:color-mix(in srgb,var(--c) 28%,#0a0f33);box-shadow:0 0 14px -8px var(--c);text-align:left;color:#eef1ff;font-family:inherit}
  .cl-ev:hover{filter:brightness(1.2);z-index:3}
  .cl-ev .t{font-size:10.5px;color:#dfe4ff;display:flex;align-items:center;gap:5px}
  .cl-ev .t span{display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:var(--c);color:#fff;flex:none}
  .cl-ev .t .cl-ic{width:10px;height:10px}
  .cl-ev strong{display:block;font-size:12px;font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cl-ev em{font-style:normal;color:#c3caea;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
  .cl-ev.pending{border-style:dashed}
  .cl-ev.cancelled{opacity:.4;text-decoration:line-through}
  .cl-now{position:absolute;left:0;right:0;height:2px;background:#ff5d8f;z-index:2;pointer-events:none}
  .cl-now::before{content:"";position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:#ff5d8f}
  .cl-pm{display:grid;gap:10px;font-size:14px}.cl-pm span{color:var(--mute);font-size:12px;display:block}
  @media(min-width:1000px){.cl-layout{grid-template-columns:270px minmax(0,1fr)}}`;
  document.head.appendChild(css);

  function shell() {
    const tab = $("b-calendar-tab");
    if (!tab) return null;
    let root = $("cl-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "cl-root";
    root.className = "cl";
    root.innerHTML = `
      <div class="cl-head"><span class="cl-badge">${ic(ICON.shop)}</span>
        <div><h2>Calendar</h2><p>View and manage your appointments and schedule.</p></div>
        <div class="cl-tools">
          <div class="cl-range">${ic(ICON.cal)}<span id="cl-range"></span>
            <button type="button" data-cl="prev" aria-label="Previous week">${ic(ICON.left)}</button>
            <button type="button" data-cl="next" aria-label="Next week">${ic(ICON.right)}</button></div>
          <button type="button" class="cl-btn" data-cl="today">Today</button>
          <button type="button" class="cl-btn cl-add" data-cl="add">${ic(ICON.plus)}Add Walk-in</button>
        </div>
      </div>
      <div class="cl-layout">
        <div class="cl-side"><div class="cl-box" id="cl-mini"></div><div class="cl-box cl-leg" id="cl-leg"></div></div>
        <div class="cl-main" id="cl-main"></div>
      </div>`;
    tab.insertBefore(root, tab.firstChild);

    root.addEventListener("click", e => {
      const a = e.target.closest("[data-cl]");
      if (a) {
        const k = a.dataset.cl;
        if (k === "prev") window.bqChangeWeek(-1);
        else if (k === "next") window.bqChangeWeek(1);
        else if (k === "today") window.bqCalendarToday();
        else if (k === "add") window.openWalkinModal();
        else if (k === "mprev" || k === "mnext") { miniM = new Date(miniM.getFullYear(), miniM.getMonth() + (k === "mnext" ? 1 : -1), 1); paint(); }
        return;
      }
      const d = e.target.closest("[data-day]");
      if (d) { ws = monday(new Date(d.dataset.day + "T00:00:00")); miniM = new Date(ws.getFullYear(), ws.getMonth(), 1); paint(); return; }
      const ev = e.target.closest("[data-ev]");
      if (ev) openEvent(ev.dataset.ev);
    });
    return root;
  }

  function layout(evs) {                              // side-by-side lanes for overlapping events
    evs.sort((a, b) => a.s - b.s || a.e - b.e);
    let cluster = [], cols = [], end = -1;
    const close = () => { cluster.forEach(x => { x.n = Math.max(1, cols.length); }); cluster = []; cols = []; end = -1; };
    evs.forEach(ev => {
      if (ev.s >= end && cluster.length) close();
      let i = cols.findIndex(c => c <= ev.s);
      if (i < 0) { i = cols.length; cols.push(0); }
      cols[i] = ev.e; ev.lane = i; cluster.push(ev);
      end = Math.max(end, ev.e);
    });
    close();
  }

  function paint() {
    const root = shell();
    if (!root) return;
    const all = window.bqAppointments || [];
    const today = new Date(), todayIso = iso(today);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d; });
    const wkIso = new Set(days.map(iso));

    /* header range */
    const f = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    $("cl-range").textContent = f(days[0]) + " - " + f(days[6]) + ", " + days[6].getFullYear();

    /* events this week */
    const week = all.filter(a => a && wkIso.has(a.date) && !isNaN(mins(a.start)))
      .map(a => {
        const s = mins(a.start);
        let e = mins(a.end); if (isNaN(e) || e <= s) e = s + (Number(a.dur) || 30);
        return { a, s, e, svc: cleanSvc(a.service) };
      });

    /* hour range */
    const b = S.barber || {};
    let h0 = parseInt(String(b.openingTime || "09:00").split(":")[0], 10);
    let h1 = parseInt(String(b.closingTime || "20:00").split(":")[0], 10);
    if (!(h0 >= 0 && h1 > h0)) { h0 = 9; h1 = 20; }
    week.forEach(x => { h0 = Math.min(h0, Math.floor(x.s / 60)); h1 = Math.max(h1, Math.ceil(x.e / 60)); });
    h1 = Math.min(24, h1);
    const hours = h1 - h0;

    /* main grid */
    let html = '<div class="cl-grid"><div class="cl-dh" style="background:var(--card)"></div>' + days.map(d => {
      const t = iso(d) === todayIso;
      return '<div class="cl-dh' + (t ? " today" : "") + '"><b>' + d.toLocaleDateString("en-US", { weekday: "short" }) + "</b><small>" +
        d.getDate() + " " + d.toLocaleDateString("en-US", { month: "short" }) + "</small></div>";
    }).join("");
    html += '<div class="cl-times">' + Array.from({ length: hours }, (_, i) => "<div>" + pad(h0 + i) + ":00</div>").join("") + "</div>";

    days.forEach(d => {
      const key = iso(d), isToday = key === todayIso;
      const evs = week.filter(x => x.a.date === key);
      layout(evs);
      html += '<div class="cl-col' + (isToday ? " today" : "") + '" style="height:' + (hours * PX + 8) + 'px;margin-top:0">';
      evs.forEach(x => {
        const top = (x.s - h0 * 60) / 60 * PX + 8;
        const ht = Math.max(40, (x.e - x.s) / 60 * PX - 3);
        const w = 100 / x.n;
        html += '<button type="button" class="cl-ev ' + esc(x.a.status) + '" data-ev="' + esc(x.a.id) + '" style="--c:' + colorOf(x.svc) +
          ";top:" + top + "px;height:" + ht + "px;left:calc(" + (x.lane * w) + "% + 3px);width:calc(" + w + '% - 6px)">' +
          '<span class="t"><span>' + ic(ICON.user) + "</span>" + hhmm(x.s) + " - " + hhmm(x.e) + "</span>" +
          "<strong>" + (x.a.status === "completed" ? "✓ " : "") + esc(x.a.customer) + "</strong><em>" + esc(x.svc) + "</em></button>";
      });
      if (isToday) {
        const nm = today.getHours() * 60 + today.getMinutes();
        if (nm >= h0 * 60 && nm <= h1 * 60) html += '<div class="cl-now" style="top:' + ((nm - h0 * 60) / 60 * PX + 8) + 'px"></div>';
      }
      html += "</div>";
    });
    html += "</div>";
    const main = $("cl-main"), keepTop = main.scrollTop, keepLeft = main.scrollLeft;
    main.innerHTML = html;
    main.scrollTop = keepTop; main.scrollLeft = keepLeft;

    /* mini month */
    const first = new Date(miniM.getFullYear(), miniM.getMonth(), 1);
    const gridStart = monday(first);
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
      if (i >= 35 && d.getMonth() !== miniM.getMonth()) break;
      const k = iso(d);
      const cls = (d.getMonth() !== miniM.getMonth() ? "o " : "") + (wkIso.has(k) ? "in " : "") + (k === todayIso ? "t" : "");
      cells += '<button type="button" class="' + cls + '" data-day="' + k + '">' + d.getDate() + "</button>";
    }
    $("cl-mini").innerHTML =
      '<div class="cl-mh"><span>' + miniM.toLocaleDateString("en-US", { month: "long", year: "numeric" }) + "</span><span>" +
      '<button type="button" data-cl="mprev" aria-label="Previous month">' + ic(ICON.left) + '</button><button type="button" data-cl="mnext" aria-label="Next month">' + ic(ICON.right) + "</button></span></div>" +
      '<div class="cl-mg">' + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(w => '<div class="w">' + w + "</div>").join("") + cells + "</div>";

    /* service legend (this week, cancelled ignored) */
    const counts = {};
    week.filter(x => x.a.status !== "cancelled" && x.a.status !== "rejected").forEach(x => { counts[x.svc] = (counts[x.svc] || 0) + 1; });
    const rows = Object.entries(counts).sort((p, q) => q[1] - p[1]);
    $("cl-leg").innerHTML = rows.length
      ? rows.map(([n, c]) => '<div><i style="background:' + colorOf(n) + '"></i>' + esc(n) + "<b>" + c + "</b></div>").join("")
      : '<div style="color:var(--mute)">No appointments this week.</div>';
  }

  /* ---------- appointment popup ---------- */
  function openEvent(id) {
    const a = (window.bqAppointments || []).find(x => String(x.id) === String(id));
    if (!a) return;
    let w = $("m-clev");
    if (!w) {
      w = document.createElement("div");
      w.className = "overlay"; w.id = "m-clev";
      w.innerHTML = '<div class="modal cl"><div id="clev-body" class="cl-pm"></div><div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn btn-outline" style="flex:1" type="button" id="clev-close">Close</button></div></div>';
      document.body.appendChild(w);
      w.addEventListener("click", e => { if (e.target === w) closeModal("m-clev"); });
      $("clev-close").addEventListener("click", () => closeModal("m-clev"));
    }
    const e = a.end ? " – " + a.end : "";
    $("clev-body").innerHTML =
      '<div style="font:800 20px \'Syne\',sans-serif">' + (a.token != null ? "#" + esc(a.token) + " · " : "") + esc(a.customer) + "</div>" +
      "<div><span>Service</span>" + esc(cleanSvc(a.service)) + "</div>" +
      "<div><span>When</span>" + esc(a.date) + " · " + esc(a.start) + esc(e) + "</div>" +
      (a.phone ? "<div><span>Phone</span>" + esc(a.phone) + "</div>" : "") +
      '<div><span>Status</span><select class="inp" id="clev-status">' +
      ["pending", "confirmed", "completed", "cancelled"].map(s => "<option" + (s === a.status ? " selected" : "") + ">" + s + "</option>").join("") + "</select></div>";
    $("clev-status").onchange = ev => { closeModal("m-clev"); window.bqSetStatus(a.id, ev.target.value); };
    openModal("m-clev");
  }

  /* ---------- public hooks used by the rest of the app ---------- */
  window.bqRenderCalendar = paint;
  window.bqChangeWeek = function (dir) {
    ws = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 7 * (Number(dir) || 0));
    miniM = new Date(ws.getFullYear(), ws.getMonth(), 1);
    paint();
  };
  window.bqCalendarToday = function () {
    ws = monday(new Date());
    miniM = new Date(ws.getFullYear(), ws.getMonth(), 1);
    paint();
  };

  setInterval(() => {                                 
    const t = $("b-calendar-tab");
    if (t && t.style.display === "block") paint();
  }, 60000);

  shell();
  const t = $("b-calendar-tab");
  if (t && t.style.display === "block") paint();
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const inr = n => "₹" + Math.round(n || 0).toLocaleString("en-IN");
  const ic = p => '<svg class="sv-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.1" y2="15.9"/><line x1="14.5" y1="14.5" x2="20" y2="20"/><line x1="8.1" y1="8.1" x2="12" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.7" y2="16.7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    bars: '<rect x="4" y="12" width="4" height="8"/><rect x="10" y="5" width="4" height="15"/><rect x="16" y="9" width="4" height="11"/>',
    rupee: '<path d="M6 4h12M6 9h12M9 4c6 0 6 9 0 9H6l8 7"/>',
    users: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3"/>',
    cup: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
    crown: '<path d="M2 8l4 4 6-8 6 8 4-4-2 12H4z"/>',
    gem: '<polygon points="6 3 18 3 22 9 12 21 2 9"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9h6M9 12h6M11 12c3 0 3 5-1 5"/>'
  };
  const FRAMES = ["#5b6cff", "#14b8a6", "#e0459a", "#3b82f6", "#e0a23a", "#a23df0"];
  const EMOJIS = ['💇','💇‍♂️','💇‍♀️','✂️','🧴','🧔','🪒','👨‍🦰','👨‍🦱','💆','🧖','🧖‍♂️','🧖‍♀️','✨','💅','🎨','🖌️','🌈','💄','👄','🧼','🧽','🌸','🌺','🌹','😀','😄','😊','😇','😉','😌','😍','🥰','🥳','🤗','🤭','👨','👩','🧔','👴','👵','🙍','👰','🧴','💆','💆‍♂️','💆‍♀️','🧖','🧖‍♂️','🧖‍♀️','💅','🪞','🛁','⭐','🌟','🔥','💫','🌸','🌺','🌹','🌷','🌻','🌼','🍁','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','❤️','🧡','💛','💚','💙','💜','❣️','💕','💞','💓','💗','💖','💘','💝'];
  const BADGE = {
    popular: ["Popular", ICON.star], luxury: ["Luxury", ICON.star], value: ["Best Value", ICON.crown], premium: ["Premium", ICON.gem]
  };
  let query = "";
  let editing = -1;                                   

  const css = document.createElement("style");
  css.textContent = `
  #b-svc-tab > :not(#sv-root){display:none!important}
  .sv{--card:#0a0f33;--line:rgba(110,110,255,.2);--mute:#97a0c9;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .sv *{box-sizing:border-box}
  .sv-ic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .sv-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px}
  .sv-badge{width:56px;height:56px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#6a4bff,#3a2cc0);border:1px solid #8b7bff}
  .sv-badge .sv-ic{width:28px;height:28px}
  .sv-head h2{margin:0;font:800 26px 'Syne',sans-serif}.sv-head p{margin:3px 0 0;font-size:13px;color:var(--mute)}
  .sv-search{margin-left:auto;display:flex;align-items:center;gap:8px;flex:1 1 220px;max-width:340px;padding:0 14px;border-radius:12px;background:var(--card);border:1px solid var(--line);color:var(--mute)}
  .sv-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:#eef1ff;font:14px 'DM Sans',sans-serif;padding:12px 0}
  .sv-layout{display:grid;grid-template-columns:1fr;gap:16px}
    .sv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;align-content:start}
  .sv-card{position:relative;display:flex;flex-direction:column;padding:18px;border-radius:18px;border:1.5px solid var(--f);min-height:200px;
      background:linear-gradient(160deg,color-mix(in srgb,var(--f) 14%,#080c26),#080c26 62%);box-shadow:0 0 24px -12px var(--f)}
  .sv-tag{position:absolute;top:14px;right:14px;display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:8px;font-size:11.5px;font-weight:600;
      color:#fff;background:color-mix(in srgb,var(--f) 35%,#0a0f33);border:1px solid color-mix(in srgb,var(--f) 70%,transparent)}
  .sv-tag .sv-ic{width:12px;height:12px}
  .sv-ico{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:28px;margin-bottom:12px;
      background:linear-gradient(135deg,color-mix(in srgb,var(--f) 80%,#fff),color-mix(in srgb,var(--f) 70%,#000));box-shadow:0 0 18px -4px var(--f)}
  .sv-name{font:700 20px 'Syne',sans-serif;margin-bottom:6px}
  .sv-desc{font-size:13px;line-height:1.5;color:#c8cfee;flex:1;margin-bottom:14px}
  .sv-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .sv-dur{display:flex;align-items:center;gap:6px;font-size:13px;color:#d4daf7;padding-right:10px;border-right:1px solid var(--line);white-space:nowrap}
  .sv-price{font:700 18px 'Syne',sans-serif;color:#f5b73b;white-space:nowrap}
  .sv-act{margin-left:auto;display:flex;gap:8px}
  .sv-act button{width:34px;height:34px;border-radius:50%;cursor:pointer;display:grid;place-items:center;color:#7fb2ff;background:rgba(59,109,255,.18);border:1px solid rgba(59,109,255,.55)}
  .sv-act button.del{color:#ff6b8b;background:rgba(255,80,120,.14);border-color:rgba(255,80,120,.5)}
  .sv-add{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;padding:20px;border-radius:18px;min-height:200px;
      border:1.5px dashed #4a55d8;background:rgba(40,40,140,.12)}
  .sv-add .c{width:62px;height:62px;border-radius:50%;display:grid;place-items:center;color:#8da0ff;border:2px solid #4a55d8;margin-bottom:6px}
  .sv-add .c .sv-ic{width:30px;height:30px}
  .sv-add b{font:700 18px 'Syne',sans-serif}.sv-add small{font-size:12.5px;color:var(--mute);max-width:200px}
  .sv-addbtn{margin-top:10px;display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 26px;cursor:pointer;color:#fff;font:700 14px 'DM Sans',sans-serif;
      background:linear-gradient(90deg,#8b2fff,#2d7bff);box-shadow:0 0 20px -6px #7c3aed}
  .sv-side{display:flex;flex-direction:column;gap:14px;min-width:0}
  .sv-box{border-radius:18px;padding:16px;background:var(--card);border:1px solid var(--line)}
  .sv-box h3{margin:0 0 12px;display:flex;align-items:center;gap:8px;font:700 15px 'Syne',sans-serif}
  .sv-box h3 .sv-ic{color:#7f93ff}
  .sv-ov{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .sv-st{padding:12px;border-radius:14px;border:1px solid var(--c);background:linear-gradient(135deg,color-mix(in srgb,var(--c) 18%,#080c26),#080c26 75%)}
  .sv-st .i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#fff;background:var(--c);margin-bottom:6px}
  .sv-st strong{display:block;font:800 22px 'Syne',sans-serif}.sv-st small{font-size:11.5px;color:var(--mute)}
  .sv-top{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13px}
  .sv-top .e{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:17px;flex:none;background:linear-gradient(135deg,#5b6cff,#3a2cc0)}
  .sv-top .m{flex:1;min-width:0}.sv-top .m b{display:block;font-weight:600}.sv-top .m small{color:var(--mute);font-size:11px}
  .sv-bar{width:70px;height:6px;border-radius:6px;background:#0d1440;overflow:hidden;flex:none}.sv-bar i{display:block;height:100%;background:var(--c)}
  .sv-top .p{width:34px;text-align:right;font-size:12px;color:#d4daf7}
  .sv-tip{display:flex;gap:10px;font-size:12px;color:#c8cfee;line-height:1.5}.sv-tip .sv-ic{color:#f5b73b;flex:none;margin-top:2px}
  .sv-empty{color:var(--mute);font-size:13px;padding:6px 0}
  .sv-form{display:grid;gap:12px}.sv-form label{display:block;font-size:12px;color:var(--mute);margin-bottom:4px}
  .sv-emo{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .sv-emo button{font-size:20px;width:38px;height:38px;border-radius:10px;cursor:pointer;background:#0d1440;border:1px solid var(--line)}
  .sv-emo button.on{border-color:#8b7bff;background:#241a6b}
  @media(min-width:1100px){.sv-layout{grid-template-columns:minmax(0,1fr) 300px}}`;
  document.head.appendChild(css);

  /* ---------- helpers ---------- */
  const saveServices = () => {
    try { localStorage.setItem("barberServices", JSON.stringify(S.services)); } catch (e) { toast("⚠️", "Could not save services"); return false; }
    if (typeof syncBarberToCustomerShop === "function") { try { syncBarberToCustomerShop(); } catch (e) { /* ignore */ } }
    return true;
  };
  const weekCounts = () => {
    const m = {};
    ((S.barberStats && S.barberStats.week && S.barberStats.week.services) || []).forEach(([n, c]) => { m[n] = Number(c) || 0; });
    return m;
  };

  function badges(counts) {
    const list = S.services || [], out = {};
    if (!list.length) return out;
    const byPrice = list.map((s, i) => [i, Number(s.price) || 0]).sort((a, b) => b[1] - a[1]);
    const topSold = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (topSold && topSold[1] > 0) { const i = list.findIndex(s => s.name === topSold[0]); if (i >= 0) out[i] = "popular"; }
    if (list.length >= 3) {
      if (!(byPrice[0][0] in out)) out[byPrice[0][0]] = "luxury";
      const cheap = byPrice[byPrice.length - 1][0];
      if (!(cheap in out)) out[cheap] = "value";
    }
    if (list.length >= 4 && !(byPrice[1][0] in out)) out[byPrice[1][0]] = "premium";
    return out;
  }

  /* ---------- shell + paint ---------- */
  function shell() {
    const tab = $("b-svc-tab");
    if (!tab) return null;
    let root = $("sv-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "sv-root";
    root.className = "sv";
    root.innerHTML = `
      <div class="sv-head"><span class="sv-badge">${ic(ICON.cut)}</span>
        <div><h2>Services</h2><p>Manage your service menu and pricing.</p></div>
        <label class="sv-search">${ic(ICON.search)}<input id="sv-q" type="search" placeholder="Search services..." autocomplete="off"></label></div>
      <div class="sv-layout"><div class="sv-grid" id="sv-grid"></div><div class="sv-side" id="sv-side"></div></div>`;
    tab.insertBefore(root, tab.firstChild);
    $("sv-q").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); paint(); });
    root.addEventListener("click", e => {
      const a = e.target.closest("[data-sv]");
      if (!a) return;
      const k = a.dataset.sv, i = Number(a.dataset.i);
      if (k === "add") openForm(-1);
      else if (k === "edit") openForm(i);
      else if (k === "del") {
        const s = S.services[i];
        if (s && confirm('Remove "' + s.name + '" from your menu?')) window.delSvc(i);
      }
    });
    return root;
  }

  function paint() {
    if (!shell()) return;
    const counts = weekCounts(), bd = badges(counts);
    const list = (S.services || []).map((s, i) => ({ s, i }))
      .filter(x => !query || x.s.name.toLowerCase().includes(query));

    $("sv-grid").innerHTML = list.map(({ s, i }) => {
      const f = FRAMES[i % FRAMES.length], b = bd[i] ? BADGE[bd[i]] : null;
      return '<div class="sv-card" style="--f:' + f + '">' +
        (b ? '<span class="sv-tag">' + ic(b[1]) + b[0] + "</span>" : "") +
        '<div class="sv-ico">' + esc(s.ico || "✂️") + '</div><div class="sv-name">' + esc(s.name) + "</div>" +
        '<div class="sv-desc">' + esc(s.desc || "Professional " + String(s.name).toLowerCase() + " service.") + "</div>" +
        '<div class="sv-foot"><span class="sv-dur">' + ic(ICON.clock) + esc(s.dur) + ' min</span><span class="sv-price">₹' + esc(s.price) + "   </span>" +
        '<span class="sv-act"><button type="button" data-sv="edit" data-i="' + i + '" aria-label="Edit ' + esc(s.name) + '">' + ic(ICON.edit) + "</button>" +
        '<button type="button" class="del" data-sv="del" data-i="' + i + '" aria-label="Delete ' + esc(s.name) + '">' + ic(ICON.trash) + "</button></span></div></div>";
    }).join("") + (query ? "" :
      '<div class="sv-add"><span class="c">' + ic(ICON.plus) + "</span><b>Add New Service</b><small>Expand your service menu and reach more customers.</small>" +
      '<button type="button" class="sv-addbtn" data-sv="add">' + ic(ICON.plus) + "Add Service</button></div>");
    if (query && !list.length) $("sv-grid").innerHTML = '<div class="sv-empty">No services match your search.</div>';

    /* side panel */
    const today = iso(new Date());
    const bookingsToday = (window.bqAppointments || []).filter(a => a && a.date === today && a.status !== "cancelled" && a.status !== "rejected").length;
    const revenue = S.barberStats && S.barberStats.today ? Number(S.barberStats.today.earnings) || 0 : Number(S.earn) || 0;
    const rating = Number(S.barber && S.barber.rating) > 0 ? Number(S.barber.rating).toFixed(1) : "—";
    const stat = (c, icon, v, l) => '<div class="sv-st" style="--c:' + c + '"><div class="i">' + ic(icon) + "</div><strong>" + v + "</strong><small>" + l + "</small></div>";

    const top = Object.entries(counts).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = top.reduce((t, e) => t + e[1], 0);
    const topHtml = top.length ? top.map(([n, c], k) => {
      const sv = (S.services || []).find(x => x.name === n), p = total ? Math.round(c / total * 100) : 0;
      return '<div class="sv-top" style="--c:' + FRAMES[k % FRAMES.length] + '"><span class="e">' + esc(sv ? sv.ico : "✂️") + '</span><div class="m"><b>' + esc(n) +
        "</b><small>" + c + " booking" + (c === 1 ? "" : "s") + '</small></div><span class="sv-bar"><i style="width:' + p + '%"></i></span><span class="p">' + p + "%</span></div>";
    }).join("") : '<div class="sv-empty">No completed services this week yet.</div>';

    // $("sv-side").innerHTML =
    //   '<div class="sv-box"><h3>' + ic(ICON.bars) + 'Service Overview</h3><div class="sv-ov">' +
    //   stat("#3b6dff", ICON.cut, (S.services || []).length, "Total Services") +
    //   stat("#14b8a6", ICON.rupee, inr(revenue), "Total Revenue (Today)") +
    //   stat("#a23df0", ICON.users, bookingsToday, "Bookings (Today)") +
    //   stat("#e0a23a", ICON.star, rating, "Avg. Rating") + "</div></div>" ;
      // '<div class="sv-box"><h3>' + ic(ICON.cup) + "Top Services</h3>" + topHtml + "</div>" ;
      // '<div class="sv-box"><div class="sv-tip">' + ic(ICON.bulb) + "<div><b>Quick Tip</b><br>Keep your service menu updated for better customer experience and higher bookings.</div></div></div>";
  }

  /* ---------- add / edit popup ---------- */
  function ensureForm() {
    if ($("m-svform")) return;
    const w = document.createElement("div");
    w.className = "overlay"; w.id = "m-svform";
    w.innerHTML = `
      <div class="modal sv" style="max-height:90vh;overflow:auto">
        <div id="svf-title" style="font:800 20px 'Syne',sans-serif;margin-bottom:16px"></div>
        <div class="sv-form">
          <div><label>Service name</label><input class="inp" id="svf-name" maxlength="40" placeholder="e.g. Hair Cut"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div><label>Price (₹)</label><input class="inp" id="svf-price" type="number" min="0" inputmode="numeric"></div>
            <div><label>Duration (min)</label><input class="inp" id="svf-dur" type="number" min="5" step="5" inputmode="numeric"></div></div>
          <div><label>Description (optional)</label><textarea class="inp" id="svf-desc" rows="2" maxlength="90" placeholder="Shown on your service card"></textarea></div>
          <div><label>Icon</label><input class="inp" id="svf-ico" maxlength="4" style="width:90px;font-size:20px;text-align:center"><div class="sv-emo" id="svf-emo"></div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:18px">
          <button class="btn btn-outline" style="flex:1" type="button" id="svf-cancel">Cancel</button>
          <button class="btn btn-gold" style="flex:1" type="button" id="svf-save">Save</button></div>
      </div>`;
    document.body.appendChild(w);
    $("svf-emo").innerHTML = EMOJIS.map(e => '<button type="button" data-e="' + e + '">' + e + "</button>").join("");
    $("svf-emo").addEventListener("click", ev => {
      const b = ev.target.closest("[data-e]");
      if (b) { $("svf-ico").value = b.dataset.e; mark(); }
    });
    $("svf-ico").addEventListener("input", mark);
    w.addEventListener("click", ev => { if (ev.target === w) closeModal("m-svform"); });
    $("svf-cancel").addEventListener("click", () => closeModal("m-svform"));
    $("svf-save").addEventListener("click", saveForm);
  }
  const mark = () => $("svf-emo").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.e === $("svf-ico").value));

  function openForm(i) {
    ensureForm();
    editing = i;
    const s = i >= 0 ? S.services[i] : { name: "", price: "", dur: "", desc: "", ico: "💇" };
    $("svf-title").textContent = i >= 0 ? "Edit service" : "Add new service";
    $("svf-name").value = s.name; $("svf-price").value = s.price; $("svf-dur").value = s.dur;
    $("svf-desc").value = s.desc || ""; $("svf-ico").value = s.ico || "💇";
    mark();
    openModal("m-svform");
    setTimeout(() => $("svf-name").focus(), 80);
  }

  function saveForm() {
    const name = $("svf-name").value.trim(), price = parseInt($("svf-price").value, 10), dur = parseInt($("svf-dur").value, 10);
    const desc = $("svf-desc").value.trim(), ico = $("svf-ico").value.trim() || "💇";
    if (!name) { toast("⚠️", "Please enter a service name"); $("svf-name").focus(); return; }
    if (isNaN(price) || price < 0) { toast("⚠️", "Please enter a valid price"); $("svf-price").focus(); return; }
    if (isNaN(dur) || dur < 5) { toast("⚠️", "Duration must be at least 5 minutes"); $("svf-dur").focus(); return; }
    if (S.services.some((s, k) => k !== editing && s.name.toLowerCase() === name.toLowerCase())) { toast("⚠️", "A service with this name already exists"); return; }

    if (editing >= 0) Object.assign(S.services[editing], { name, price, dur, desc, ico });
    else S.services.push({ id: Date.now(), name, price, dur, desc, ico });
    if (!saveServices()) return;
    closeModal("m-svform");
    paint();
    toast("✅", editing >= 0 ? '"' + name + '" updated' : '"' + name + '" added');
  }

  /* ---------- hook into the app ---------- */
  window.renderSvcs = paint;
  setInterval(() => {
    const t = $("b-svc-tab"), m = $("m-svform");
    if (t && t.style.display === "block" && !(m && m.classList.contains("open")) && document.activeElement !== $("sv-q")) paint();
  }, 6000);

  shell();
  const t = $("b-svc-tab");
  if (t && t.style.display === "block") paint();
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmt12 = t => {
    const [h, m] = String(t || "").split(":").map(Number);
    return isNaN(h) ? "" : (h % 12 || 12) + ":" + pad(m || 0) + " " + (h < 12 ? "AM" : "PM");
  };
  const cleanSvc = s => String(s || "").replace(/\s·\sadvance$/, "");
  const ic = p => '<svg class="bw-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    x: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    check: '<circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.7" y2="16.7"/>',
    filter: '<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>',
    chev: '<polyline points="6 9 12 15 18 9"/>', right: '<polyline points="9 18 15 12 9 6"/>', left: '<polyline points="15 18 9 12 15 6"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    users: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    dots: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3"/>'
  };
  const STATUSES = ["pending", "confirmed", "completed", "cancelled"];
  const PAGE = 8;
  const st = { range: "7", page: 1, q: "", svc: "all", status: "all", sel: new Set() };

  const css = document.createElement("style");
  css.textContent = `
  #b-bookings-tab > :not(#bw-root):not(#bk-requests){display:none!important}
  .bw{--card:#0a0f33;--line:rgba(110,110,255,.2);--mute:#97a0c9;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .bw *{box-sizing:border-box}
  .bw-ic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .bw-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px}
  .bw-badge{width:54px;height:54px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#6a4bff,#3a2cc0)}
  .bw-eye{font-size:11px;letter-spacing:.12em;color:#8da0ff;font-weight:700}
  .bw-head h2{margin:2px 0;font:800 22px 'Syne',sans-serif}.bw-head p{margin:0;font-size:12.5px;color:var(--mute)}
  .bw-tools{margin-left:auto;display:flex;gap:10px;flex-wrap:wrap}
  .bw-pill{position:relative;display:inline-flex;align-items:center;gap:10px;padding:11px 14px;border-radius:12px;background:var(--card);border:1px solid var(--line);font:600 13px 'DM Sans',sans-serif;color:#eef1ff}
  .bw-pill select{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
  button.bw-pill{cursor:pointer;background:#1a1a6b;border-color:#4a4ad8}
  .bw-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px}
  .bw-kpi{display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;border:1px solid var(--c);
      background:linear-gradient(135deg,color-mix(in srgb,var(--c) 22%,#080c26),#080c26 72%);box-shadow:0 0 22px -12px var(--c)}
  .bw-kico{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;flex:none;color:#fff;background:color-mix(in srgb,var(--c) 70%,#080c26)}
  .bw-kico .bw-ic{width:24px;height:24px}
  .bw-kl{font-size:12.5px;color:#d4daf7}.bw-kv{font:800 30px 'Syne',sans-serif;line-height:1.1}
  .bw-kn{font-size:12px;color:var(--mute)}.bw-kn.up{color:#22e39a}.bw-kn.dn{color:#ff7b7b}
  .bw-k1{--c:#3b6dff}.bw-k2{--c:#14b8a6}.bw-k3{--c:#e0459a}.bw-k4{--c:#d9a02c}
  .bw-layout{display:grid;grid-template-columns:1fr;gap:14px}
  .bw-box{border-radius:18px;padding:16px;background:var(--card);border:1px solid var(--line);min-width:0}
  .bw-th{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
  .bw-th h3{margin:0;font:700 15px 'Syne',sans-serif}.bw-th small{display:block;font-size:12px;color:var(--mute);margin-top:2px}
  .bw-filters{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;flex:1 1 360px;justify-content:flex-end}
  .bw-search{display:flex;align-items:center;gap:8px;flex:1 1 180px;max-width:300px;padding:0 12px;border-radius:10px;background:#0d1440;border:1px solid var(--line);color:var(--mute)}
  .bw-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:#eef1ff;font:13px 'DM Sans',sans-serif;padding:10px 0}
  .bw-sel{position:relative;display:inline-flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:#0d1440;border:1px solid var(--line);font-size:13px}
  .bw-sel select{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
  .bw-ib{display:grid;place-items:center;width:40px;border-radius:10px;background:#0d1440;border:1px solid var(--line);color:#eef1ff;cursor:pointer}
  .bw-bulk{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;margin-bottom:10px;border-radius:10px;background:#141b55;font-size:13px}
  .bw-bulk button{padding:6px 12px;border-radius:8px;border:1px solid #3b46c8;background:#0d1440;color:#eef1ff;cursor:pointer;font:600 12px 'DM Sans',sans-serif}
  .bw-scroll{overflow-x:auto}
  table.bw-t{width:100%;border-collapse:collapse;min-width:720px;font-size:13px}
  .bw-t th{text-align:left;padding:12px 10px;font-size:11.5px;letter-spacing:.08em;color:#aab4e0;background:#0d1440;font-weight:700}
  .bw-t td{padding:11px 10px;border-top:1px solid var(--line);vertical-align:middle}
  .bw-t input[type=checkbox]{width:16px;height:16px;accent-color:#6a4bff}
  .bw-cu{display:flex;align-items:center;gap:12px}
  .bw-av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;flex:none;background:linear-gradient(135deg,#6a7bff,#4b3fd8)}
  .bw-cu b{display:block;font-weight:600}.bw-cu small,.bw-sv small{color:var(--mute);font-size:11.5px}
  .bw-sv{display:flex;align-items:center;gap:10px}.bw-sv>span{font-size:20px}.bw-sv b{display:block;font-weight:600}
  .bw-dt{display:flex;align-items:center;gap:8px;color:#d4daf7;white-space:nowrap}.bw-dt .bw-ic{width:16px;height:16px;color:#8da0ff}
  .bw-badge2{display:inline-block;min-width:84px;text-align:center;padding:6px 10px;border-radius:7px;font-size:12px;font-weight:700;text-transform:capitalize}
  .bw-badge2.completed{background:#0f7a5a;color:#d6fff0}.bw-badge2.confirmed{background:#2540b8;color:#e3e9ff}
  .bw-badge2.pending{background:#8a5a0a;color:#ffe9bf}.bw-badge2.cancelled,.bw-badge2.rejected{background:#8f2340;color:#ffdce6}
  .bw-badge2.expired{background:#3a3f66;color:#d0d5f0}
  .bw-mg{display:flex;align-items:center;gap:8px}
  .bw-mgs{position:relative;display:grid;place-items:center;width:34px;height:30px;border-radius:8px;border:1px solid var(--line);background:#0d1440}
  .bw-mgs select{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
  .bw-dots{border:0;background:none;color:#aab4e0;cursor:pointer;padding:4px}
  .bw-empty{text-align:center;color:var(--mute);padding:30px 10px!important}
  .bw-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:12px;font-size:12.5px;color:var(--mute)}
  .bw-pg{display:flex;gap:6px}.bw-pg button{min-width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:#0d1440;color:#eef1ff;cursor:pointer;font:600 13px 'DM Sans',sans-serif}
  .bw-pg button.on{background:#6a4bff;border-color:#6a4bff}.bw-pg button:disabled{opacity:.4;cursor:default}
  .bw-side{display:flex;flex-direction:column;gap:14px}
  .bw-qa{display:flex;align-items:center;gap:12px;width:100%;margin-top:8px;padding:10px;border-radius:12px;cursor:pointer;color:#eef1ff;text-align:left;font:inherit;
      background:color-mix(in srgb,var(--c) 14%,#0a0f33);border:1px solid color-mix(in srgb,var(--c) 55%,transparent)}
  .bw-qa .i{width:42px;height:42px;border-radius:10px;display:grid;place-items:center;color:#fff;flex:none;background:var(--c)}
  .bw-qa b{display:block;font-size:13.5px}.bw-qa small{font-size:11.5px;color:var(--mute)}.bw-qa .bw-ic:last-child{margin-left:auto;color:var(--mute)}
  .bw-happy{background:linear-gradient(135deg,#171a73,#0a0f33);border-color:#3b46c8}
  .bw-happy p{margin:6px 0 0;font-size:13px}.bw-happy em{display:block;margin-top:10px;text-align:right;font:italic 700 16px 'Syne',sans-serif;color:#e063ff;line-height:1.25}
  .bw-pm{display:grid;gap:10px;font-size:14px}.bw-pm span{display:block;color:var(--mute);font-size:12px}
  @media(min-width:720px){.bw-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media(min-width:1100px){.bw-layout{grid-template-columns:minmax(0,1fr) 300px}}`;
  document.head.appendChild(css);

  /* ---------- data ---------- */
  const all = () => (window.bqAppointments || []).filter(a => a && a.date);
  const isCancel = s => s === "cancelled" || s === "rejected";

  function periods() {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    let from, to = t, pf, pt;
    if (st.range === "all") return { from: "0000-00-00", to: "9999-12-31", pf: null, pt: null, label: "All time" };
        if (st.range === "upcoming") { const e = addDays(t, 90); return { from: iso(t), to: iso(e), pf: null, pt: null, label: "Upcoming" }; }
    if (st.range === "month") {
      from = new Date(t.getFullYear(), t.getMonth(), 1);
      pf = new Date(t.getFullYear(), t.getMonth() - 1, 1); pt = new Date(t.getFullYear(), t.getMonth(), 0);
    } else {
      const n = Number(st.range);
      from = addDays(t, -(n - 1)); pf = addDays(from, -n); pt = addDays(from, -1);
    }
    const f = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return { from: iso(from), to: iso(to), pf: iso(pf), pt: iso(pt), label: f(from) + " - " + f(to) };
  }
  const inRange = (a, f, t) => a.date >= f && a.date <= t;
  const pct = (cur, prev) => prev > 0 ? Math.round((cur - prev) / prev * 100) : null;

  function trend(cur, prev, vs, invert) {
    const p = pct(cur, prev);
    if (p === null) return '<div class="bw-kn">' + (cur ? "New this period" : "Nothing yet") + "</div>";
    const good = invert ? p <= 0 : p >= 0;
    return '<div class="bw-kn ' + (good ? "up" : "dn") + '">' + (p >= 0 ? "↑ +" : "↓ ") + p + "% from " + vs + "</div>";
  }

  /* ---------- shell ---------- */
  function shell() {
    const tab = $("b-bookings-tab");
    if (!tab) return null;
    let root = $("bw-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "bw-root";
    root.className = "bw";
    root.innerHTML = `
      <div class="bw-head"><span class="bw-badge">${ic(ICON.cal)}</span>
        <div><div class="bw-eye">BOOKINGS</div><h2>Manage Appointments &amp; Bookings</h2><p>View, track and manage all customer bookings and appointments.</p></div>
        <div class="bw-tools">
          <label class="bw-pill">${ic(ICON.cal)}<span id="bw-range"></span>${ic(ICON.chev)}
            <select id="bw-rsel" aria-label="Date range"><option value="7">Last 7 days</option><option value="30">Last 30 days</option>
              <option value="month">This month</option><option value="upcoming">Upcoming</option><option value="all">All time</option></select></label>
          <button type="button" class="bw-pill" data-bw="refresh">${ic(ICON.refresh)}Refresh</button>
        </div>
      </div>
      <div class="bw-kpis" id="bw-kpis"></div>
      <div class="bw-layout">
        <div class="bw-box">
          <div class="bw-th"><span class="bw-badge" style="width:36px;height:36px;border-radius:10px">${ic(ICON.cal)}</span>
            <div><h3>All Bookings</h3><small>List of all customer bookings and appointments.</small></div>
            <div class="bw-filters">
              <label class="bw-search">${ic(ICON.search)}<input id="bw-q" type="search" placeholder="Search customer, service or phone..." autocomplete="off"></label>
              <label class="bw-sel"><span id="bw-svcl">All Services</span>${ic(ICON.chev)}<select id="bw-svc" aria-label="Service"></select></label>
              <label class="bw-sel"><span id="bw-stl">All Statuses</span>${ic(ICON.chev)}
                <select id="bw-stsel" aria-label="Status"><option value="all">All Statuses</option>${STATUSES.map(s => '<option value="' + s + '">' + s[0].toUpperCase() + s.slice(1) + "</option>").join("")}</select></label>
              <button type="button" class="bw-ib" data-bw="clear" title="Clear filters" aria-label="Clear filters">${ic(ICON.filter)}</button>
            </div>
          </div>
          <div id="bw-bulk"></div>
          <div class="bw-scroll"><table class="bw-t"><thead><tr>
            <th style="width:34px"><input type="checkbox" id="bw-all" aria-label="Select all"></th><th>CUSTOMER</th><th>SERVICE</th><th>DATE &amp; TIME</th><th>STATUS</th><th>MANAGE</th></tr></thead>
            <tbody id="bw-body"></tbody></table></div>
          <div class="bw-foot"><span id="bw-count"></span><div class="bw-pg" id="bw-pg"></div></div>
        </div>
        <div class="bw-side">
          <div class="bw-box"><div class="bw-th" style="margin-bottom:0"><span class="bw-badge" style="width:36px;height:36px;border-radius:10px">${ic(ICON.users)}</span>
            <div><h3>Quick Actions</h3><small>Manage bookings and customer requests.</small></div></div>
            <button type="button" class="bw-qa" style="--c:#3b6dff" data-bw="walkin"><span class="i">${ic(ICON.plus)}</span><span><b>Add Walk-in</b><small>Add a customer to the queue</small></span>${ic(ICON.right)}</button>
            <button type="button" class="bw-qa" style="--c:#4b5cf0" data-bw="calendar"><span class="i">${ic(ICON.cal)}</span><span><b>View Calendar</b><small>Check full schedule</small></span>${ic(ICON.right)}</button>
            <button type="button" class="bw-qa" style="--c:#e0459a" data-bw="cancelled"><span class="i">${ic(ICON.x)}</span><span><b>View Cancellations</b><small>See cancelled bookings</small></span>${ic(ICON.right)}</button>
            <button type="button" class="bw-qa" style="--c:#2f8fe0" data-bw="history"><span class="i">${ic(ICON.users)}</span><span><b>Customer History</b><small>Search by phone number</small></span>${ic(ICON.right)}</button>
          </div>
        </div>
      </div>`;
    tab.insertBefore(root, tab.firstChild);

    $("bw-rsel").addEventListener("change", e => { st.range = e.target.value; st.page = 1; st.sel.clear(); paint(); });
    $("bw-q").addEventListener("input", e => { st.q = e.target.value.trim().toLowerCase(); st.page = 1; paint(); });
    $("bw-svc").addEventListener("change", e => { st.svc = e.target.value; st.page = 1; paint(); });
    $("bw-stsel").addEventListener("change", e => { st.status = e.target.value; st.page = 1; paint(); });
    $("bw-all").addEventListener("change", e => {
      rows().slice((st.page - 1) * PAGE, st.page * PAGE).forEach(a => e.target.checked ? st.sel.add(String(a.id)) : st.sel.delete(String(a.id)));
      paint();
    });

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-bw]");
      if (b) {
        const k = b.dataset.bw;
        if (k === "refresh") { if (window.bqLoadBookings) window.bqLoadBookings(); toast("🔄", "Bookings refreshed"); }
        else if (k === "clear") { st.q = ""; st.svc = "all"; st.status = "all"; st.page = 1; $("bw-q").value = ""; paint(); }
        else if (k === "walkin") window.openWalkinModal();
        else if (k === "calendar") window.bTab("calendar");
        else if (k === "cancelled") { st.status = "cancelled"; st.page = 1; st.range = "all"; paint(); }
        else if (k === "history") { $("bw-q").focus(); toast("🔎", "Type a customer's phone number in the search box"); }
        else if (k === "page") { st.page = Number(b.dataset.p); paint(); }
        else if (k === "bulk") bulk(b.dataset.s);
        return;
      }
      const d = e.target.closest("[data-detail]");
      if (d) openDetail(d.dataset.detail);
    });
    root.addEventListener("change", e => {
      const c = e.target.closest("[data-sel]");
      if (c) { c.checked ? st.sel.add(c.dataset.sel) : st.sel.delete(c.dataset.sel); paint(); return; }
      const m = e.target.closest("[data-stat]");
      if (m) window.bqSetStatus(m.dataset.stat, m.value);
    });
    return root;
  }

  /* ---------- filtering ---------- */
  function rows() {
    const p = periods();
    return all().filter(a => {
      if (!inRange(a, p.from, p.to)) return false;
      if (st.status !== "all" && a.status !== st.status && !(st.status === "cancelled" && a.status === "rejected")) return false;
      if (st.svc !== "all" && cleanSvc(a.service) !== st.svc) return false;
      if (st.q && ![a.customer, cleanSvc(a.service), a.phone, a.token != null ? "#" + a.token : ""].some(v => String(v || "").toLowerCase().includes(st.q))) return false;
      return true;
    }).sort((x, y) => (y.date + (y.start || "")).localeCompare(x.date + (x.start || "")));
  }

  function bulk(status) {
    const ids = Array.from(st.sel);
    st.sel.clear();
    ids.forEach(id => window.bqSetStatus(id, status));
  }

  /* ---------- paint ---------- */
  function paint() {
    if (!shell()) return;
    const p = periods(), list = all(), today = iso(new Date()), yest = iso(addDays(new Date(), -1));
    $("bw-range").textContent = p.label;
    $("bw-rsel").value = st.range;

    const cur = list.filter(a => inRange(a, p.from, p.to));
    const prev = p.pf ? list.filter(a => inRange(a, p.pf, p.pt)) : [];
    const vs = st.range === "month" ? "last month" : st.range === "30" ? "previous 30 days" : "last week";
    const cnt = (arr, fn) => arr.filter(fn).length;
    const k = (cls, icon, label, val, note) =>
      '<div class="bw-kpi ' + cls + '"><span class="bw-kico">' + ic(icon) + '</span><div><div class="bw-kl">' + label + '</div><div class="bw-kv">' + val + "</div>" + note + "</div></div>";
    $("bw-kpis").innerHTML =
      k("bw-k1", ICON.cal, "Total Bookings", cur.length, p.pf ? trend(cur.length, prev.length, vs) : '<div class="bw-kn">All time</div>') +
      k("bw-k2", ICON.clock, "Today's Bookings", cnt(list, a => a.date === today), trend(cnt(list, a => a.date === today), cnt(list, a => a.date === yest), "yesterday")) +
      k("bw-k3", ICON.x, "Cancelled", cnt(cur, a => isCancel(a.status)), p.pf ? trend(cnt(cur, a => isCancel(a.status)), cnt(prev, a => isCancel(a.status)), vs, true) : '<div class="bw-kn">All time</div>') +
      k("bw-k4", ICON.check, "Completed", cnt(cur, a => a.status === "completed"), p.pf ? trend(cnt(cur, a => a.status === "completed"), cnt(prev, a => a.status === "completed"), vs) : '<div class="bw-kn">All time</div>');

    /* service filter options */
    const names = Array.from(new Set(list.map(a => cleanSvc(a.service)).concat((S.services || []).map(s => s.name)))).filter(Boolean).sort();
    const sel = $("bw-svc");
    sel.innerHTML = '<option value="all">All Services</option>' + names.map(n => "<option" + (n === st.svc ? " selected" : "") + ">" + esc(n) + "</option>").join("");
    sel.value = st.svc;
    $("bw-svcl").textContent = st.svc === "all" ? "All Services" : st.svc;
    $("bw-stsel").value = st.status;
    $("bw-stl").textContent = st.status === "all" ? "All Statuses" : st.status[0].toUpperCase() + st.status.slice(1);

    /* table */
    const r = rows(), pages = Math.max(1, Math.ceil(r.length / PAGE));
    if (st.page > pages) st.page = pages;
    const slice = r.slice((st.page - 1) * PAGE, st.page * PAGE);
    $("bw-body").innerHTML = slice.length ? slice.map(a => {
      const sv = (S.services || []).find(s => s.name === cleanSvc(a.service));
      const id = esc(a.id), opts = STATUSES.includes(a.status) ? STATUSES : [a.status].concat(STATUSES);
      return "<tr><td><input type=\"checkbox\" data-sel=\"" + id + "\"" + (st.sel.has(String(a.id)) ? " checked" : "") + "></td>" +
        '<td><div class="bw-cu"><span class="bw-av">' + esc(String(a.customer || "?").charAt(0).toUpperCase()) + "</span><div><b>" + esc(a.customer) +
        "</b><small>" + (a.phone ? "+91 " + esc(a.phone) : a.token != null ? "Token #" + esc(a.token) : "Walk-in") + "</small></div></div></td>" +
        '<td><div class="bw-sv"><span>' + esc(sv ? sv.ico : "✂️") + "</span><div><b>" + esc(cleanSvc(a.service)) + "</b><small>" + (a.dur ? esc(a.dur) + " min" : "") + "</small></div></div></td>" +
        '<td><div class="bw-dt">' + ic(ICON.cal) + esc(a.date) + " " + esc(fmt12(a.start)) + "</div></td>" +
        '<td><span class="bw-badge2 ' + esc(a.status) + '">' + esc(a.status) + "</span></td>" +
        '<td><div class="bw-mg"><label class="bw-mgs">' + ic(ICON.chev) + '<select data-stat="' + id + '" aria-label="Change status">' +
        opts.map(s => "<option" + (s === a.status ? " selected" : "") + ">" + s + "</option>").join("") + '</select></label>' +
        '<button type="button" class="bw-dots" data-detail="' + id + '" aria-label="Details">' + ic(ICON.dots) + "</button></div></td></tr>";
    }).join("") : '<tr><td colspan="6" class="bw-empty">' + (all().length ? "No bookings match your filters." : "No appointments yet.") + "</td></tr>";

    $("bw-all").checked = slice.length > 0 && slice.every(a => st.sel.has(String(a.id)));
    $("bw-bulk").innerHTML = st.sel.size
      ? '<div class="bw-bulk"><b>' + st.sel.size + ' selected</b>Mark as:' +
        ["confirmed", "completed", "cancelled"].map(s => '<button type="button" data-bw="bulk" data-s="' + s + '">' + s + "</button>").join("") + "</div>" : "";

    const from = r.length ? (st.page - 1) * PAGE + 1 : 0, to = Math.min(r.length, st.page * PAGE);
    $("bw-count").textContent = r.length ? "Showing " + from + "–" + to + " of " + r.length + " bookings" : "Showing 0 bookings";
    const nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - st.page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== "…") nums.push("…");
    $("bw-pg").innerHTML =
      '<button type="button" data-bw="page" data-p="' + Math.max(1, st.page - 1) + '"' + (st.page === 1 ? " disabled" : "") + ' aria-label="Previous page">' + ic(ICON.left) + "</button>" +
      nums.map(n => n === "…" ? '<button type="button" disabled>…</button>'
        : '<button type="button" data-bw="page" data-p="' + n + '" class="' + (n === st.page ? "on" : "") + '">' + n + "</button>").join("") +
      '<button type="button" data-bw="page" data-p="' + Math.min(pages, st.page + 1) + '"' + (st.page === pages ? " disabled" : "") + ' aria-label="Next page">' + ic(ICON.right) + "</button>";
  }

  /* ---------- details popup ---------- */
  function openDetail(id) {
    const a = all().find(x => String(x.id) === String(id));
    if (!a) return;
    let w = $("m-bwd");
    if (!w) {
      w = document.createElement("div");
      w.className = "overlay"; w.id = "m-bwd";
      w.innerHTML = '<div class="modal bw"><div id="bwd-body" class="bw-pm"></div><button class="btn btn-outline btn-full" style="margin-top:16px" type="button" id="bwd-close">Close</button></div>';
      document.body.appendChild(w);
      w.addEventListener("click", e => { if (e.target === w) closeModal("m-bwd"); });
      $("bwd-close").addEventListener("click", () => closeModal("m-bwd"));
    }
    $("bwd-body").innerHTML =
      '<div style="font:800 20px \'Syne\',sans-serif">' + (a.token != null ? "#" + esc(a.token) + " · " : "") + esc(a.customer) + "</div>" +
      "<div><span>Service</span>" + esc(cleanSvc(a.service)) + (a.dur ? " · " + esc(a.dur) + " min" : "") + "</div>" +
      "<div><span>Date &amp; time</span>" + esc(a.date) + " · " + esc(fmt12(a.start)) + (a.end ? " – " + esc(fmt12(a.end)) : "") + "</div>" +
      (a.phone ? "<div><span>Phone</span>+91 " + esc(a.phone) + "</div>" : "") +
      "<div><span>Status</span>" + esc(a.status) + "</div>" +
      "<div><span>Booked via</span>" + (a.source === "advance" ? "Advance booking" : "Live queue") + "</div>";
    openModal("m-bwd");
  }

  /* ---------- hook into the app ---------- */
  const base = window.bqRenderBookings;
  window.bqRenderBookings = function () {
    const out = typeof base === "function" ? base.apply(this, arguments) : undefined;
    paint();
    return out;
  };

  shell();
  const t = $("b-bookings-tab");
  if (t && t.style.display === "block") paint();
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
  const inr = n => "₹" + Math.round(n || 0).toLocaleString("en-IN");
  const ic = p => '<svg class="qm-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    glass: '<path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 2 4l3 2-3 2a5 5 0 0 0-2 4v4M17 2v4a5 5 0 0 1-2 4l-3 2 3 2a5 5 0 0 1 2 4v4"/>',
    star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    x: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    right: '<polyline points="9 18 15 12 9 6"/>', left: '<polyline points="15 18 9 12 15 6"/>',
    dots: '<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>',
    pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/>'
  };
  const AV = ["#6a4bff", "#14b8a6", "#3b6dff", "#d946ef", "#e0a23a", "#ec4899"];
  const PAGE = 8;
  let page = 1;

  const css = document.createElement("style");
  css.textContent = `
  #b-queue-tab > :not(#qm-root){display:none!important}
  .qm{--card:#0a0f33;--line:rgba(110,110,255,.2);--mute:#97a0c9;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .qm *{box-sizing:border-box}
  .qm-ic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .qm-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px}
  .qm-badge{width:58px;height:58px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#4f3df0,#2a1f8f);border:1px solid #8b7bff;box-shadow:0 0 22px -6px #6a4bff}
  .qm-badge .qm-ic{width:30px;height:30px}
  .qm-head h2{margin:0;font:800 26px 'Syne',sans-serif}.qm-head h2 span{background:linear-gradient(90deg,#d946ef,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent}
  .qm-head p{margin:3px 0 0;font-size:13px;color:var(--mute)}
  .qm-tools{margin-left:auto;display:flex;gap:10px;flex-wrap:wrap}
  .qm-pill{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:var(--card);border:1px solid var(--line);font:600 13px 'DM Sans',sans-serif}
  .qm-pill i{width:9px;height:9px;border-radius:50%;background:#22e39a;box-shadow:0 0 8px #22e39a}
  .qm-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px}
  .qm-kpi{display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;border:1px solid var(--c);
      background:linear-gradient(135deg,color-mix(in srgb,var(--c) 24%,#080c26),#080c26 72%);box-shadow:0 0 22px -10px var(--c)}
  .qm-kico{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;flex:none;color:#fff;background:color-mix(in srgb,var(--c) 70%,#080c26)}
  .qm-kico .qm-ic{width:26px;height:26px}
  .qm-kl{font-size:12.5px;color:#d4daf7}.qm-kv{font:800 30px 'Syne',sans-serif;line-height:1.1}
  .qm-kn{font-size:12px;color:var(--mute)}.qm-kn.up{color:#22e39a}.qm-kn.dn{color:#ff7b7b}
  .qm-k1{--c:#3b6dff}.qm-k2{--c:#14b8a6}.qm-k3{--c:#a23df0}.qm-k4{--c:#d9a02c}
  .qm-layout{display:grid;grid-template-columns:1fr;gap:14px}
  .qm-box{border-radius:18px;padding:16px;background:var(--card);border:1px solid var(--line);min-width:0}
  .qm-th{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
  .qm-th .ico{color:#7f93ff}.qm-th .ico .qm-ic{width:32px;height:32px}
  .qm-th h3{margin:0;font:700 16px 'Syne',sans-serif;color:#9fe8ff}.qm-th small{display:block;font-size:12px;color:var(--mute);margin-top:2px}
  .qm-r{margin-left:auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .qm-act{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:10px;font-size:13px;font-weight:600;border:1px solid rgba(34,227,154,.4);color:#2de2b5;background:rgba(24,199,168,.1)}
  .qm-act i{width:9px;height:9px;border-radius:50%;background:currentColor}
  .qm-act.off{color:#ff8b8b;border-color:rgba(255,107,107,.4);background:rgba(255,107,107,.1)}
  .qm-add{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;color:#fff;font:700 13px 'DM Sans',sans-serif;background:#3b3bf0}
  .qm-scroll{overflow-x:auto;border-radius:12px;border:1px solid var(--line)}
  table.qm-t{width:100%;border-collapse:collapse;min-width:760px;font-size:13px}
  .qm-t th{text-align:left;padding:12px 10px;font-size:12px;color:#d4daf7;background:#0d1440;font-weight:600}
  .qm-t td{padding:10px;border-top:1px solid var(--line);vertical-align:middle}
  .qm-t tr.cur td{background:rgba(59,59,240,.12)}
  .qm-cu{display:flex;align-items:center;gap:12px}
  .qm-av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;flex:none}
  .qm-cu b{display:block;font-weight:600}.qm-cu small,.qm-sv small{color:var(--mute);font-size:11.5px}
  .qm-sv{display:flex;align-items:center;gap:10px}.qm-sv>span{font-size:22px}.qm-sv b{display:block;font-weight:600}
  .qm-bb{display:flex;align-items:center;gap:8px;color:#d4daf7}.qm-bb .qm-ic{width:16px;height:16px;color:#8da0ff}
  .qm-w{display:flex;align-items:center;gap:8px;color:#d4daf7;white-space:nowrap}.qm-w .qm-ic{width:15px;height:15px;color:#8da0ff}
  .qm-s{display:inline-block;min-width:92px;text-align:center;padding:6px 12px;border-radius:7px;font-size:12px;font-weight:700}
  .qm-s.wait{background:#6b4a0b;color:#ffe2a8;border:1px solid #a9771a}
  .qm-s.cur{background:#2540b8;color:#e3e9ff;border:1px solid #4d6bff}
  .qm-s.nxt{background:#0f6b53;color:#d6fff0;border:1px solid #1fa37f}
  .qm-ac{display:flex;align-items:center;gap:8px}
  .qm-b{padding:8px 16px;border-radius:8px;border:0;cursor:pointer;color:#fff;font:600 13px 'DM Sans',sans-serif;background:#2d2fb8}
  .qm-b.done{background:#0f9d6e}.qm-b.skip{background:#141b55;border:1px solid #3b46c8}
  .qm-dots{border:0;background:none;color:#aab4e0;cursor:pointer;padding:4px}
  .qm-empty{text-align:center;padding:34px 10px!important;color:var(--mute)}
  .qm-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:12px;font-size:12.5px;color:var(--mute)}
  .qm-pg{display:flex;gap:6px}.qm-pg button{min-width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:#0d1440;color:#eef1ff;cursor:pointer;font:600 13px 'DM Sans',sans-serif}
  .qm-pg button.on{background:#4b3fe8;border-color:#4b3fe8}.qm-pg button:disabled{opacity:.4;cursor:default}
  .qm-side{display:flex;flex-direction:column;gap:14px}
  .qm-side h3{margin:0;font:700 16px 'Syne',sans-serif}.qm-side .sub{font-size:12px;color:var(--mute);margin:2px 0 8px}
  .qm-qh{display:flex;align-items:center;gap:10px}.qm-qh .qm-ic{width:30px;height:30px;color:#38c8ff}
  .qm-qa{display:flex;align-items:center;gap:12px;width:100%;margin-top:8px;padding:10px;border-radius:12px;cursor:pointer;color:#eef1ff;text-align:left;font:inherit;
      background:color-mix(in srgb,var(--c) 12%,#0a0f33);border:1px solid color-mix(in srgb,var(--c) 40%,transparent)}
  .qm-qa .i{width:42px;height:42px;border-radius:10px;display:grid;place-items:center;color:#fff;flex:none;background:var(--c)}
  .qm-qa b{display:block;font-size:13.5px}.qm-qa small{font-size:11.5px;color:var(--mute)}.qm-qa>.qm-ic{margin-left:auto;color:var(--mute)}
  .qm-flow-h{display:flex;align-items:flex-start;gap:10px}.qm-flow-h .qm-ic{width:22px;height:22px;color:#8da0ff;margin-top:2px}
  .qm-peak{margin-left:auto;text-align:center;padding:6px 10px;border-radius:9px;background:#2a1f8f;border:1px solid #5a43d8;font-size:11px;line-height:1.35}
  .qm-peak b{display:block;font-size:12px}
  .qm-bars{display:flex;align-items:flex-end;gap:6px;height:96px;margin-top:10px}
  .qm-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:10px;color:var(--mute);min-width:0}
  .qm-bar i{display:block;width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#8b5cf6,#3b3bf0);min-height:3px;margin-bottom:5px}
  .qm-bar i.pk{background:linear-gradient(180deg,#c9a9ff,#8b5cf6)}
  .qm-pm{display:grid;gap:10px;font-size:14px}.qm-pm span{display:block;color:var(--mute);font-size:12px}
  @media(min-width:720px){.qm-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media(min-width:1100px){.qm-layout{grid-template-columns:minmax(0,1fr) 320px}}`;
  document.head.appendChild(css);

  const shopKey = () => String((S.barber && S.barber.shopName) || "").trim().toLowerCase();

  /* ---------- shell ---------- */
  function shell() {
    const tab = $("b-queue-tab");
    if (!tab) return null;
    let root = $("qm-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "qm-root";
    root.className = "qm";
    root.innerHTML = `
      <div class="qm-head"><span class="qm-badge">${ic(ICON.clock)}</span>
        <div><h2><span>Queue</span> Management</h2><p>Track your live queue, manage walk-ins and keep your customers happy.</p></div>
        <div class="qm-tools"><span class="qm-pill">${ic(ICON.cal)}<span id="qm-date"></span></span><span class="qm-pill"><i></i>Live</span></div></div>
      <div class="qm-kpis" id="qm-kpis"></div>
      <div class="qm-layout">
        <div class="qm-box">
          <div class="qm-th"><span class="ico">${ic(ICON.users)}</span><div><h3>Live Queue</h3><small>Customers currently waiting for service.</small></div>
            <div class="qm-r"><span class="qm-act" id="qm-act"><i></i><span></span></span>
              <button type="button" class="qm-add" data-q="walkin">${ic(ICON.plus)}Add Walk-in</button></div></div>
          <div class="qm-scroll"><table class="qm-t"><thead><tr><th style="width:44px">#</th><th>Customer</th><th>Service</th><th>Barber</th><th>Waiting Time</th><th>Status</th><th>Action</th></tr></thead>
            <tbody id="qm-body"></tbody></table></div>
          <div class="qm-foot"><span id="qm-count"></span><div class="qm-pg" id="qm-pg"></div></div>
        </div>
        <div class="qm-side">
          <div class="qm-box"><div class="qm-qh">${ic(ICON.bolt)}<div><h3>Quick Actions</h3><div class="sub" style="margin:0">Manage your queue with ease.</div></div></div>
            <button type="button" class="qm-qa" style="--c:#14b8a6" data-q="walkin"><span class="i">${ic(ICON.users)}</span><span><b>Add Walk-in Customer</b><small>Quickly add a new customer</small></span>${ic(ICON.right)}</button>
            <button type="button" class="qm-qa" style="--c:#8b3fe0" data-q="bookings"><span class="i">${ic(ICON.cal)}</span><span><b>View Bookings</b><small>Check scheduled appointments</small></span>${ic(ICON.right)}</button>
            <button type="button" class="qm-qa" style="--c:#2f6df0" data-q="calendar"><span class="i">${ic(ICON.cal)}</span><span><b>Open Calendar</b><small>See your daily schedule</small></span>${ic(ICON.right)}</button>
            <button type="button" class="qm-qa" style="--c:#e0459a" data-q="cancels"><span class="i">${ic(ICON.x)}</span><span><b>View Cancellations</b><small>See cancelled bookings</small></span>${ic(ICON.right)}</button></div>
          <div class="qm-box"><div class="qm-flow-h">${ic(ICON.clock)}<div><h3>Today's Queue Flow</h3><div class="sub" style="margin:0">Live trend of your queue.</div></div><div class="qm-peak" id="qm-peak"></div></div>
            <div class="qm-bars" id="qm-flow"></div></div>
        </div>
      </div>`;
    tab.insertBefore(root, tab.firstChild);

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-q]");
      if (!b) return;
      const k = b.dataset.q;
      if (k === "walkin") window.openWalkinModal();
      else if (k === "bookings") window.bTab("bookings");
      else if (k === "calendar") window.bTab("calendar");
      else if (k === "cancels") { window.bTab("bookings"); const c = document.querySelector('#bw-root [data-bw="cancelled"]'); if (c) c.click(); }
      else if (k === "done") window.doneToken();
      else if (k === "skip") window.skipToken();
      else if (k === "view") openDetail(b.dataset.id);
      else if (k === "remove") removeEntry(b.dataset.id);
      else if (k === "page") { page = Number(b.dataset.p); paint(); }
    });
    return root;
  }

  /* ---------- paint ---------- */
  function paint() {
    if (!shell()) return;
    const q = Array.isArray(S.bq) ? S.bq : [];
    const assign = rd("bqCrewAssign:" + shopKey(), {});
    $("qm-date").textContent = "Today, " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    /* flow log: highest queue length seen in each hour of today */
    const now = new Date(), dayKey = "bqQueueFlow:" + shopKey() + ":" + now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
    const flow = rd(dayKey, {});
    if (S.role === "barber" && shopKey()) {
      const h = now.getHours();
      if (q.length > (flow[h] || 0) || flow[h] === undefined) {
        flow[h] = Math.max(flow[h] || 0, q.length);
        try { localStorage.setItem(dayKey, JSON.stringify(flow)); } catch (e) { /* ignore */ }
      }
    }

    /* KPIs */
    const totalWait = q.reduce((t, c) => t + (Number(c.dur) || 0), 0);
    const done = Number(S.doneCnt) || 0, earn = Number(S.earn) || 0;
    const daily = S.barberStats && S.barberStats.week && S.barberStats.week.daily;
    const yIdx = (now.getDay() + 5) % 7;
    const yest = daily && now.getDay() !== 1 ? Number(daily[yIdx]) : null;
    let servedNote = '<div class="qm-kn">Completed today</div>';
    if (yest > 0) {
      const p = Math.round((done - yest) / yest * 100);
      servedNote = '<div class="qm-kn ' + (p >= 0 ? "up" : "dn") + '">' + (p >= 0 ? "↑ +" : "↓ ") + p + "% from yesterday</div>";
    }
    const k = (c, icon, l, v, n) => '<div class="qm-kpi ' + c + '"><span class="qm-kico">' + ic(icon) + '</span><div><div class="qm-kl">' + l + '</div><div class="qm-kv">' + v + "</div>" + n + "</div></div>";
    $("qm-kpis").innerHTML =
      k("qm-k1", ICON.users, "Total in Queue", q.length, '<div class="qm-kn">' + (q.length ? "~" + totalWait + " min of work waiting" : "Queue is clear") + "</div>") +
      k("qm-k2", ICON.check, "Served Today", done, servedNote) +
      k("qm-k3", ICON.glass, "Avg. Wait Time", totalWait + " min", '<div class="qm-kn">For a customer joining now</div>') +
      k("qm-k4", ICON.star, "Today's Earnings", inr(earn), '<div class="qm-kn">From completed services</div>');

    /* status pill */
    const act = $("qm-act");
    act.className = "qm-act" + (S.shopOpen === false ? " off" : "");
    act.lastChild.textContent = S.shopOpen === false ? "Shop is closed" : "Queue is active";

    /* table */
    const pages = Math.max(1, Math.ceil(q.length / PAGE));
    if (page > pages) page = pages;
    const start = (page - 1) * PAGE;
    let before = q.slice(0, start).reduce((t, c) => t + (Number(c.dur) || 0), 0);
    $("qm-body").innerHTML = q.length ? q.slice(start, start + PAGE).map((c, n) => {
      const idx = start + n, svc = (S.services || []).find(s => s.name === c.svc);
      const wait = before; before += Number(c.dur) || 0;
      const barber = assign[String(c.id)];
      const status = c.st === "cur" ? ["cur", "In Progress"] : c.st === "nxt" ? ["nxt", "Next Up"] : ["wait", "Waiting"];
      const action = c.st === "cur"
        ? '<button type="button" class="qm-b done" data-q="done">Done ✓</button><button type="button" class="qm-b skip" data-q="skip">Skip</button>'
        : '<button type="button" class="qm-b" data-q="view" data-id="' + esc(c.id) + '">View</button>';
      return '<tr class="' + (c.st === "cur" ? "cur" : "") + '"><td>' + (idx + 1) + "</td>" +
        '<td><div class="qm-cu"><span class="qm-av" style="background:' + AV[idx % AV.length] + '">' + esc(String(c.name || "?").charAt(0).toUpperCase()) + "</span><div><b>" + esc(c.name) + "</b><small>Token #" + esc(c.tok) + "</small></div></div></td>" +
        '<td><div class="qm-sv"><span>' + esc(svc ? svc.ico : "✂️") + "</span><div><b>" + esc(c.svc) + "</b><small>" + (svc ? "₹" + esc(svc.price) + " • " : "") + esc(c.dur) + " min</small></div></div></td>" +
        '<td><span class="qm-bb">' + ic(ICON.user) + esc(barber ? (barber === "Anyone" ? "Any barber" : barber) : "—") + "</span></td>" +
        '<td><span class="qm-w">' + ic(ICON.clock) + (c.st === "cur" ? "Now" : wait + " min") + "</span></td>" +
        '<td><span class="qm-s ' + status[0] + '">' + status[1] + "</span></td>" +
        '<td><div class="qm-ac">' + action + '<button type="button" class="qm-dots" data-q="view" data-id="' + esc(c.id) + '" aria-label="More">' + ic(ICON.dots) + "</button></div></td></tr>";
    }).join("") : '<tr><td colspan="7" class="qm-empty">✅ Queue is clear! Add a walk-in to get started.</td></tr>';

    $("qm-count").textContent = "Showing " + (q.length ? Math.min(PAGE, q.length - start) : 0) + " of " + q.length + " customer" + (q.length === 1 ? "" : "s");
    $("qm-pg").innerHTML = pages < 2 ? "" :
      '<button type="button" data-q="page" data-p="' + Math.max(1, page - 1) + '"' + (page === 1 ? " disabled" : "") + ' aria-label="Previous">' + ic(ICON.left) + "</button>" +
      Array.from({ length: pages }, (_, i) => '<button type="button" data-q="page" data-p="' + (i + 1) + '" class="' + (i + 1 === page ? "on" : "") + '">' + (i + 1) + "</button>").join("") +
      '<button type="button" data-q="page" data-p="' + Math.min(pages, page + 1) + '"' + (page === pages ? " disabled" : "") + ' aria-label="Next">' + ic(ICON.right) + "</button>";

    /* flow chart */
    const b = S.barber || {};
    let h0 = parseInt(String(b.openingTime || "09:00").split(":")[0], 10), h1 = parseInt(String(b.closingTime || "18:00").split(":")[0], 10);
    if (!(h0 >= 0 && h1 > h0)) { h0 = 9; h1 = 18; }
    Object.keys(flow).forEach(h => { h0 = Math.min(h0, Number(h)); h1 = Math.max(h1, Number(h)); });
    if (h1 - h0 > 12) h1 = h0 + 12;
    const hrs = Array.from({ length: h1 - h0 + 1 }, (_, i) => h0 + i);
    const mx = Math.max(1, ...hrs.map(h => flow[h] || 0));
    const peakH = hrs.reduce((a, h) => (flow[h] || 0) > (flow[a] || 0) ? h : a, hrs[0]);
    const lab = h => (h % 12 || 12) + (h < 12 ? "am" : "pm");
    $("qm-flow").innerHTML = hrs.map(h => '<div class="qm-bar"><i class="' + (h === peakH && flow[h] ? "pk" : "") + '" style="height:' + ((flow[h] || 0) / mx * 70) + 'px"></i>' + lab(h) + "</div>").join("");
    $("qm-peak").innerHTML = flow[peakH] ? "Peak<b>" + lab(peakH) + "</b>" + flow[peakH] + " in queue" : "Peak<b>—</b>collecting";
  }

  /* ---------- details / remove ---------- */
  function openDetail(id) {
    const c = (S.bq || []).find(x => String(x.id) === String(id));
    if (!c) return;
    let w = $("m-qmd");
    if (!w) {
      w = document.createElement("div");
      w.className = "overlay"; w.id = "m-qmd";
      w.innerHTML = '<div class="modal qm"><div id="qmd-body" class="qm-pm"></div><div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn btn-outline" style="flex:1" type="button" id="qmd-close">Close</button>' +
        '<button class="btn btn-outline" style="flex:1;color:#ff6b6b;border-color:#ff6b6b" type="button" id="qmd-remove">Remove</button></div></div>';
      document.body.appendChild(w);
      w.addEventListener("click", e => { if (e.target === w) closeModal("m-qmd"); });
      $("qmd-close").addEventListener("click", () => closeModal("m-qmd"));
    }
    const svc = (S.services || []).find(s => s.name === c.svc), barber = rd("bqCrewAssign:" + shopKey(), {})[String(c.id)];
    const wait = (S.bq || []).slice(0, (S.bq || []).indexOf(c)).reduce((t, x) => t + (Number(x.dur) || 0), 0);
    $("qmd-body").innerHTML =
      '<div style="font:800 20px \'Syne\',sans-serif">#' + esc(c.tok) + " · " + esc(c.name) + "</div>" +
      "<div><span>Service</span>" + esc(c.svc) + (svc ? " · ₹" + esc(svc.price) : "") + " · " + esc(c.dur) + " min</div>" +
      "<div><span>Barber</span>" + esc(barber ? (barber === "Anyone" ? "Any barber" : barber) : "Not chosen") + "</div>" +
      "<div><span>Estimated wait</span>" + (c.st === "cur" ? "Being served now" : wait + " min") + "</div>";
    $("qmd-remove").onclick = () => { closeModal("m-qmd"); removeEntry(c.id); };
    openModal("m-qmd");
  }

  async function removeEntry(id) {
    const c = (S.bq || []).find(x => String(x.id) === String(id));
    if (!c || !confirm("Remove " + c.name + " from the queue?")) return;
    try {
      const r = await fetch(BQ_BASE + "/api/queue/" + id + "/cancel", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 404) throw new Error(j.error || "Could not remove the customer");
      toast("🗑️", c.name + " removed from the queue");
      await loadBarberQueue(S.barber.shopName);
    } catch (e) { toast("⚠️", e.message || "Could not remove the customer"); }
  }

  /* ---------- hook into the app ---------- */
  const base = window.renderBQ;
  window.renderBQ = function () {
    const out = typeof base === "function" ? base.apply(this, arguments) : undefined;
    paint();
    return out;
  };
  setInterval(() => {                                // stats (served / earnings) arrive on their own timer
    const t = $("b-queue-tab");
    if (t && t.style.display !== "none" && S.role === "barber") paint();
  }, 3000);

  shell();
  paint();
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const inr = n => "₹" + Math.round(n || 0).toLocaleString("en-IN");
  const ic = p => '<svg class="db-ic" viewBox="0 0 24 24">' + p + "</svg>";
  const ICON = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    bars: '<rect x="4" y="12" width="4" height="8"/><rect x="10" y="5" width="4" height="15"/><rect x="16" y="9" width="4" height="11"/>'
  };
  const DONUT = ["#3b82f6", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6"];
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cleanSvc = s => String(s || "").replace(/\s·\sadvance$/, "");
  const fmt12 = t => {
    const [h, m] = String(t || "").split(":").map(Number);
    return isNaN(h) ? "" : (h % 12 || 12) + ":" + pad(m || 0) + " " + (h < 12 ? "AM" : "PM");
  };
  const stamp = a => new Date(a.date + "T" + (a.start || "00:00") + ":00").getTime();

  const css = document.createElement("style");
  css.textContent = `
  #b-dashboard-tab > :not(#db-root){display:none!important}
  .db{--card:#0a0f33;--line:rgba(110,110,255,.22);--mute:#97a0c9;color:#eef1ff;font-family:'DM Sans',sans-serif;
      display:flex;flex-direction:column;gap:14px;min-height:calc(100vh - 150px)}
  .db *{box-sizing:border-box}
  .db-ic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .db-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .db-badge{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;color:#fff;background:#3b2fd0;border:1px solid #6a5bff}
  .db-badge .db-ic{width:24px;height:24px}
  .db-head h2{margin:0;font:800 24px 'Syne',sans-serif}
  .db-head p{margin:2px 0 0;font-size:13px;color:var(--mute)}
  .db-tools{margin-left:auto;display:flex;gap:10px;flex-wrap:wrap}
  .db-pill{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:10px;background:#0b1138;border:1px solid #3b46c8;
      color:#eef1ff;font:600 13px 'DM Sans',sans-serif}
  button.db-pill{cursor:pointer}
  button.db-pill:hover{border-color:#7b8bff}
  .db-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .db-kpi{padding:16px 18px;border-radius:14px;border:1px solid var(--c);
      background:linear-gradient(135deg,color-mix(in srgb,var(--c) 22%,#080c26),#080c26 78%)}
  .db-kl{font-size:13.5px;color:#d4daf7}
  .db-kv{font:800 34px 'Syne',sans-serif;line-height:1.15;margin:4px 0}
  .db-kn{font-size:13px;color:var(--mute)}
  .db-kn.up{color:#22e39a;font-weight:600}.db-kn.dn{color:#ff7b7b;font-weight:600}
  .db-k1{--c:#4b6bff}.db-k2{--c:#14b8a6}.db-k3{--c:#e0a23a}.db-k4{--c:#a23df0}
  .db-main{flex:1;display:grid;grid-template-columns:1fr;gap:14px;min-height:340px}
  .db-col{display:flex;flex-direction:column;gap:14px;min-width:0}
  .db-grow{flex:1}
  .db-bottom{display:grid;grid-template-columns:1fr;gap:14px}
  .db-box{display:flex;flex-direction:column;padding:16px 18px;border-radius:14px;background:var(--card);border:1px solid var(--line);min-width:0}
  .db-box h3{margin:0;font:700 15.5px 'Syne',sans-serif}
  .db-qh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
  .db-sub{font-size:12.5px;color:var(--mute)}
  .db-link{display:inline-flex;align-items:center;gap:5px;border:0;background:none;cursor:pointer;color:#7f93ff;font:600 13.5px 'DM Sans',sans-serif}
  .db-link .db-ic{width:15px;height:15px}
  /* weekly chart */
  .db-chart{flex:1;display:flex;flex-direction:column;min-height:230px}
  .db-plot{position:relative;flex:1;min-height:170px;margin:6px 0 0 30px}
  .db-gl{position:absolute;left:0;right:0;height:0;border-top:1px solid rgba(110,110,255,.16)}
  .db-gl span{position:absolute;left:-30px;top:-8px;width:22px;text-align:right;font-size:11.5px;color:var(--mute)}
  .db-cols{position:absolute;inset:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3.5%;padding:0 1.5%}
  .db-col1{display:flex;align-items:flex-end;height:100%}
  .db-col1 i{display:block;width:100%;border-radius:6px 6px 0 0;background:#f5b73b;min-height:0;box-shadow:0 0 18px -6px #f5b73b99;position:relative}
  .db-col1 i b{position:absolute;top:-19px;left:0;right:0;text-align:center;font-size:12px;font-weight:600;color:#eef1ff}
  .db-xl{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3.5%;padding:8px 1.5% 0;margin-left:30px;text-align:center;font-size:13px;color:#c3cbf0}
  .db-xl .t{color:#f5b73b;font-weight:600}
  .db-none{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--mute);font-size:13.5px;pointer-events:none}
  /* lists */
  .db-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line);font-size:14px}
  .db-row .l{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .db-row .r{flex:none;color:var(--mute);font-size:12.5px}
  .db-tag{flex:none;min-width:70px;text-align:center;padding:3px 10px;border-radius:7px;font-size:12px;font-weight:700;color:#fff}
  .db-tag.cur{background:#2540b8}.db-tag.nxt{background:#0f6b53}.db-tag.wait{background:#6b4a0b;color:#ffe2a8}
  .db-empty{flex:1;display:flex;align-items:center;justify-content:center;padding:18px 0;color:var(--mute);font-size:13.5px;text-align:center;border-top:1px solid var(--line)}
  .db-qa{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .db-qa button{padding:13px 14px;border-radius:10px;cursor:pointer;text-align:left;color:#eef1ff;font:600 14px 'DM Sans',sans-serif;
      border:1px solid var(--c);background:color-mix(in srgb,var(--c) 14%,#0a0f33)}
  .db-qa button:hover{background:color-mix(in srgb,var(--c) 26%,#0a0f33)}
  /* donut */
  .db-mix{flex:1;display:flex;align-items:center;gap:22px;flex-wrap:wrap}
  .db-donut{position:relative;width:104px;height:104px;flex:none}
  .db-donut svg{width:100%;height:100%;transform:rotate(-90deg)}
  .db-donut b{position:absolute;inset:0;display:grid;place-items:center;font:700 22px 'Syne',sans-serif}
  .db-leg{display:flex;flex-direction:column;gap:7px;font-size:13.5px}
  .db-leg span{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
  .db-leg i{width:8px;height:8px;border-radius:50%}
  @media(min-width:720px){.db-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.db-bottom{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(min-width:980px){.db-main{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}}`;
  document.head.appendChild(css);

  function shell() {
    const tab = $("b-dashboard-tab");
    if (!tab) return null;
    let root = $("db-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "db-root";
    root.className = "db";
    tab.insertBefore(root, tab.firstChild);

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-db]");
      if (!b) return;
      const k = b.dataset.db;
      if (k === "refresh") {
        if (typeof refreshBarberStats === "function") refreshBarberStats();
        if (S.barber && S.barber.shopName && typeof loadBarberQueue === "function") loadBarberQueue(S.barber.shopName);
        toast("🔄", "Dashboard refreshed");
        setTimeout(paint, 600);
      } else if (["queue", "bookings", "calendar", "settings"].indexOf(k) !== -1) {
        window.bTab(k);
      }
    });
    return root;
  }

  /* ---------- pieces ---------- */
  function chart(daily, todayIdx) {
    const total = daily.reduce((t, n) => t + n, 0);
    const top = Math.max(4, Math.ceil(Math.max(...daily) / 4) * 4);     // axis max, multiple of 4
    const lines = [4, 3, 2, 1, 0].map(i => {
      const v = top / 4 * i;
      return '<div class="db-gl" style="top:' + (100 - i * 25) + '%"><span>' + v + "</span></div>";
    }).join("");
    const cols = daily.map((n, i) =>
      '<div class="db-col1" title="' + DAYS[i] + ": " + n + '"><i style="height:' + (n ? Math.max(3, n / top * 100) : 0) + '%">' + (n ? "<b>" + n + "</b>" : "") + "</i></div>").join("");
    const labels = DAYS.map((d, i) => "<span" + (i === todayIdx ? ' class="t"' : "") + ">" + d + "</span>").join("");
    return '<div class="db-chart"><div class="db-plot">' + lines + '<div class="db-cols">' + cols + "</div>" +
      (total ? "" : '<div class="db-none">No completed visits yet this week.<br>Finished services will appear here.</div>') +
      '</div><div class="db-xl">' + labels + "</div></div>";
  }

  function donut(services) {
    const top = services.slice(0, 4);
    const total = top.reduce((t, s) => t + Number(s[1] || 0), 0);
    const R = 34, C = 2 * Math.PI * R;
    let ring = '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="14"/>';
    let cum = 0;
    if (total) {
      top.forEach((s, i) => {
        const frac = Number(s[1]) / total;
        const len = Math.max(0, frac * C - (top.length > 1 ? 2 : 0));
        ring += '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="' + DONUT[i % DONUT.length] +
          '" stroke-width="14" stroke-dasharray="' + len.toFixed(2) + " " + (C - len).toFixed(2) +
          '" stroke-dashoffset="' + (-cum * C).toFixed(2) + '"/>';
        cum += frac;
      });
    }
    const legend = total
      ? top.map((s, i) => '<span><i style="background:' + DONUT[i % DONUT.length] + '"></i>' +
          esc(s[0]) + " " + Math.round(Number(s[1]) / total * 100) + "%</span>").join("")
      : '<span style="color:var(--mute)">No completed services this week yet.</span>';
    return '<div class="db-mix"><div class="db-donut"><svg viewBox="0 0 100 100">' + ring + "</svg><b>" + total +
      '</b></div><div class="db-leg">' + legend + "</div></div>";
  }

  function upcoming() {
    const now = Date.now();
    const list = (window.bqAppointments || [])
      .filter(a => a && a.date && (a.status === "pending" || a.status === "confirmed") && stamp(a) >= now - 15 * 60000)
      .sort((x, y) => stamp(x) - stamp(y)).slice(0, 4);
    if (!list.length) return '<div class="db-empty">No upcoming bookings.</div>';
    const today = new Date().toDateString();
    return list.map(a => {
      const d = new Date(a.date + "T00:00:00");
      const when = d.toDateString() === today ? fmt12(a.start)
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + fmt12(a.start);
      return '<div class="db-row"><span class="l">' + esc(when) + " · " + esc(a.customer) + '</span><span class="r">' + esc(cleanSvc(a.service)) + "</span></div>";
    }).join("");
  }

  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    if (m < 1440) return Math.round(m / 60) + " hr ago";
    return Math.round(m / 1440) + " d ago";
  }

  function activity() {
    const now = Date.now();
    const list = (window.bqAppointments || [])
      .filter(a => a && a.date && stamp(a) <= now + 60000)
      .sort((x, y) => stamp(y) - stamp(x)).slice(0, 4);
    if (!list.length) return '<div class="db-empty">Activity will show up here as customers come in.</div>';
    return list.map(a => {
      const t = a.status === "completed" ? esc(a.customer) + "'s " + esc(cleanSvc(a.service).toLowerCase()) + " done"
        : a.status === "cancelled" || a.status === "rejected" ? esc(a.customer) + " cancelled"
        : "New booking · " + esc(a.customer);
      return '<div class="db-row"><span class="l">' + t + '</span><span class="r">' + ago(stamp(a)) + "</span></div>";
    }).join("");
  }

  /* ---------- build ---------- */
  function build() {
    const q = Array.isArray(S.bq) ? S.bq : [];
    const st = S.barberStats || null;
    const done = Number(S.doneCnt) || 0;
    const earn = Number(S.earn) || 0;
    const totalWait = q.reduce((t, c) => t + (Number(c.dur) || 0), 0);
    const now = new Date();
    const todayIdx = (now.getDay() + 6) % 7;
    const dateLabel = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    const daily = st && st.week && Array.isArray(st.week.daily) && st.week.daily.length === 7
      ? st.week.daily.map(n => Number(n) || 0) : [0, 0, 0, 0, 0, 0, 0];
    const weekTotal = daily.reduce((t, n) => t + n, 0);
    const yest = now.getDay() !== 1 ? daily[(now.getDay() + 5) % 7] : 0;
    let doneNote = '<div class="db-kn">Since opening</div>';
    if (yest > 0) {
      const p = Math.round((done - yest) / yest * 100);
      doneNote = '<div class="db-kn ' + (p >= 0 ? "up" : "dn") + '">' + (p >= 0 ? "↑ " : "↓ ") + Math.abs(p) + "% vs yesterday</div>";
    }
    const services = st && st.week && Array.isArray(st.week.services) ? st.week.services : [];

    const kpi = (cls, label, val, note) =>
      '<div class="db-kpi ' + cls + '"><div class="db-kl">' + label + '</div><div class="db-kv">' + val + "</div>" + note + "</div>";

    const live = q.slice(0, 5).map(c => {
      const t = c.st === "cur" ? ["cur", "Now"] : c.st === "nxt" ? ["nxt", "Next"] : ["wait", "Waiting"];
      return '<div class="db-row"><span class="l">#' + esc(c.tok) + " " + esc(c.name) + '</span><span class="db-tag ' + t[0] + '">' + t[1] + "</span></div>";
    }).join("") || '<div class="db-empty">No customers are currently in the queue.</div>';

    const qa = (k, c, label) => '<button type="button" style="--c:' + c + '" data-db="' + k + '">' + label + "</button>";

    return `
      <div class="db-head"><span class="db-badge">${ic(ICON.grid)}</span>
        <div><h2>Dashboard</h2><p>Your daily overview and shop activity.</p></div>
        <div class="db-tools"><span class="db-pill">${ic(ICON.cal)}${esc(dateLabel)}</span>
          <button type="button" class="db-pill" data-db="refresh">${ic(ICON.refresh)}Refresh</button></div></div>

      <div class="db-kpis">
        ${kpi("db-k1", "In queue", q.length, '<div class="db-kn">' + (q.length ? "~" + totalWait + " min of work" : "Queue is clear") + "</div>")}
        ${kpi("db-k2", "Completed today", done, doneNote)}
        ${kpi("db-k3", "Today's earnings", inr(earn), '<div class="db-kn">From completed services</div>')}
        ${kpi("db-k4", "Average wait", totalWait + " min", '<div class="db-kn">Queue estimate</div>')}
      </div>

      <div class="db-main">
        <div class="db-box"><div class="db-qh"><h3>Completed this week</h3><span class="db-sub">${weekTotal} visit${weekTotal === 1 ? "" : "s"}</span></div>
          ${chart(daily, todayIdx)}</div>
        <div class="db-col">
          <div class="db-box db-grow"><div class="db-qh"><h3>Live queue</h3>
            <button type="button" class="db-link" data-db="queue">Manage${ic(ICON.arrow)}</button></div>${live}</div>
          <div class="db-box"><div class="db-qh"><h3>Quick actions</h3></div><div class="db-qa">
            ${qa("queue", "#14b8a6", "Manage queue")}${qa("bookings", "#a23df0", "Bookings")}
            ${qa("calendar", "#3b82f6", "Calendar")}${qa("settings", "#ec4899", "Settings")}</div></div>
        </div>
      </div>

      <div class="db-bottom">
        <div class="db-box"><div class="db-qh"><h3>Service mix</h3><span class="db-sub">This week</span></div>${donut(services)}</div>
        <div class="db-box"><div class="db-qh"><h3>Next bookings</h3>
          <button type="button" class="db-link" data-db="bookings">View all${ic(ICON.arrow)}</button></div>${upcoming()}</div>
        <div class="db-box"><div class="db-qh"><h3>Recent activity</h3></div>${activity()}</div>
      </div>`;
  }

  function paint() {
    const root = shell();
    if (!root) return;
    const html = build();
    if (root._sig !== html) { root._sig = html; root.innerHTML = html; }
  }

  /* keep every existing caller working: run the old refresh, then ours */
  const base = window.bqRefreshOverview;
  window.bqRefreshOverview = function () {
    const out = typeof base === "function" ? base.apply(this, arguments) : undefined;
    paint();
    return out;
  };

  setInterval(() => {
    const t = $("b-dashboard-tab");
    if (t && t.style.display === "block" && S.role === "barber") paint();
  }, 4000);

  shell();
  const t = $("b-dashboard-tab");
  if (t && t.style.display === "block") paint();
})();

(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const busy = new Set();
  async function act(id, kind) {
    const key = kind + ":" + id;
    if (busy.has(key)) return;
    const c = (S.bq || []).find(x => String(x.id) === String(id));
    if (!c) { toast("⚠️", "That customer is no longer in the queue"); return; }
    if (!S.barber || !S.barber.shopName) { toast("⚠️", "Set up your shop first"); return; }
    if (kind === "done" && !confirm("Mark " + c.name + " (#" + c.tok + ") as done?")) return;

    busy.add(key);
    try {
      const r = await fetch(BQ_BASE + "/api/queue/" + id + "/" + (kind === "done" ? "complete" : "skip"), { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) throw new Error(j.error || "Could not update the queue");

      await loadBarberQueue(S.barber.shopName);

      if (kind === "done") {
        if (typeof window.bqSetStatus === "function") { try { window.bqSetStatus(id, "completed"); } catch (e) { /* ignore */ } }
        const sv = (S.services || []).find(s => s.name === c.svc);
        S.doneCnt = (Number(S.doneCnt) || 0) + 1;
        S.earn = (Number(S.earn) || 0) + (sv ? Number(sv.price) || 0 : 0);
        const d = $("b-done"), e = $("b-earn");
        if (d) d.textContent = S.doneCnt;
        if (e) e.textContent = "₹" + Math.round(S.earn).toLocaleString("en-IN");
        if (typeof refreshBarberStats === "function") refreshBarberStats();
        toast("✅", c.name + " marked done");
      } else {
        toast("⏭️", c.name + " skipped");
      }
    } catch (e) {
      toast("⚠️", e.message || "Could not update the queue");
    } finally {
      busy.delete(key);
    }
  }
  window.bqQueueAct = act;

  /* ---------- put the buttons on every waiting row ---------- */
  function decorate() {
    const body = $("qm-body");
    if (!body) return;
    body.querySelectorAll('button.qm-b[data-q="view"]').forEach(v => {
      const id = v.getAttribute("data-id");
      const wrap = document.createElement("span");
      wrap.style.cssText = "display:contents";
      wrap.innerHTML =
        '<button type="button" class="qm-b done" data-q2="done" data-id="' + id + '">Done ✓</button>' +
        '<button type="button" class="qm-b skip" data-q2="skip" data-id="' + id + '">Skip</button>';
      v.replaceWith(wrap);
    });
  }

  /* queue_redesign repaints on its own timer, so re-decorate after every repaint */
  function watch() {
    const root = $("qm-root");
    if (!root) return false;
    new MutationObserver(decorate).observe(root, { childList: true, subtree: true });
    decorate();
    return true;
  }
  if (!watch()) {
    const t = setInterval(() => { if (watch()) clearInterval(t); }, 500);
  }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-q2]");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    act(b.getAttribute("data-id"), b.getAttribute("data-q2"));
  }, true);
})();

(function () {
  "use strict";

  const pad = n => String(n).padStart(2, "0");
  const isoDate = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const hhmm = d => pad(d.getHours()) + ":" + pad(d.getMinutes());
  const visible = id => { const n = document.getElementById(id); return !!n && n.style.display === "block"; };

  let busy = false, lastRun = 0;

  async function pull(force) {
    const shop = window.S && S.barber && S.barber.shopName;
    if (!shop || S.role !== "barber" || busy) return;
    if (!force && Date.now() - lastRun < 8000) return;
    busy = true; lastRun = Date.now();
    try {
      const r = await fetch(BQ_BASE + "/api/queue/history?days=90&shop_name=" + encodeURIComponent(shop));
      const j = await r.json();
      if (!r.ok || !j.success || !Array.isArray(j.history)) return;
      if (!Array.isArray(window.bqAppointments)) window.bqAppointments = [];
      const list = window.bqAppointments;
      let changed = false;

      j.history.forEach(h => {
        const status = h.status === "completed" ? "completed" : "cancelled";
        const joined = h.joined_at ? new Date(h.joined_at) : null;
        const finished = h.completed_at ? new Date(h.completed_at) : null;
        const when = finished || joined;
        if (!when || isNaN(when)) return;
        const dur = Number(h.duration) || 20;

        const found = list.find(a => String(a.id) === String(h.id));
        if (found) {
          if (found.status !== status) { found.status = status; changed = true; }
          if (finished && found.date !== isoDate(finished)) { found.date = isoDate(finished); changed = true; }
          if (h.price != null && found.price !== h.price) { found.price = h.price; found.phone = h.phone; changed = true; }
        } else {
          const start = finished ? new Date(finished.getTime() - dur * 60000) : joined;
          list.push({
            id: h.id, token: h.token, customer: h.name, service: h.service,
            date: isoDate(when), start: hhmm(start),
            end: hhmm(finished || new Date(start.getTime() + dur * 60000)),
            dur, status, source: "queue", price: h.price, phone: h.phone
          });
          changed = true;
        }
      });

      if (changed) {
        try { localStorage.setItem("barberBookings:" + shop, JSON.stringify(list.slice(-500))); } catch (e) { /* ignore */ }
        if (visible("b-bookings-tab") && window.bqRenderBookings) window.bqRenderBookings();
        if (visible("b-calendar-tab") && window.bqRenderCalendar) window.bqRenderCalendar();
        if (visible("b-dashboard-tab") && window.bqRefreshOverview) window.bqRefreshOverview();
      }
    } catch (e) { /* offline: keep what we have */ }
    finally { busy = false; }
  }
  window.bqPullHistory = () => pull(true);

  const origLoad = window.loadBarberQueue;
  if (typeof origLoad === "function") {
    window.loadBarberQueue = async function () {
      const out = await origLoad.apply(this, arguments);
      pull(false);
      return out;
    };
  }

  const origTab = window.bTab;
  if (typeof origTab === "function") {
    window.bTab = function () {
      const out = origTab.apply(this, arguments);
      pull(true);
      return out;
    };
  }

  setInterval(() => pull(false), 10000);
  setTimeout(() => pull(true), 2000);
})();

(function () {
  "use strict";

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobile = isIOS || /Android/i.test(navigator.userAgent);

  function upiQuery() {
    const pay = S.shopPay, p = S.pendingJoin;
    if (!pay || !pay.upi_id || !p) return "";
    const shop = (S.shops && S.shops[p.shopId] && S.shops[p.shopId].name) || "Shop";
    return "pa=" + encodeURIComponent(pay.upi_id) +
           "&pn=" + encodeURIComponent(shop) +
           "&am=" + encodeURIComponent(Number(p.price) || 0) +
           "&cu=INR&tn=" + encodeURIComponent("Token " + (p.tok || ""));
  }

  function openUpi(scheme) {
    const q = upiQuery();
    if (!q) { toast("⚠️", "This shop has not added a UPI ID. Scan the QR with your UPI app."); return; }
    if (!isMobile) { toast("📱", "Open this page on your phone to pay with a UPI app, or scan the QR."); return; }
    window.location.href = (scheme || "upi://pay") + "?" + q;
  }
  window.bqOpenUpi = openUpi;

  function decorate() {
    const sec = document.getElementById("upi-qr-section");
    const img = document.getElementById("upi-qr-img");
    if (!sec || sec.style.display === "none") return;

    if (img && !img.dataset.upiTap) {           
      img.dataset.upiTap = "1";
      img.style.cursor = "pointer";
      img.title = "Tap to open your UPI app";
      img.addEventListener("click", () => openUpi());
    }

    let box = document.getElementById("upi-open-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "upi-open-box";
      box.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px";
      sec.appendChild(box);
    }
    const hasId = !!(S.shopPay && S.shopPay.upi_id);
    box.style.display = hasId ? "flex" : "none";
    const html = isIOS
      ? '<button type="button" class="btn btn-gold btn-sm" onclick="bqOpenUpi(\'gpay://upi/pay\')">Google Pay</button>' +
        '<button type="button" class="btn btn-gold btn-sm" onclick="bqOpenUpi(\'phonepe://pay\')">PhonePe</button>' +
        '<button type="button" class="btn btn-gold btn-sm" onclick="bqOpenUpi(\'paytmmp://pay\')">Paytm</button>'
      : '<button type="button" class="btn btn-gold btn-sm" onclick="bqOpenUpi()">Pay with UPI app</button>';
    if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
  }

  const base = window.selectPayMethod || selectPayMethod;
  selectPayMethod = function () {
    const out = base.apply(this, arguments);
    decorate();
    return out;
  };
  window.selectPayMethod = selectPayMethod;
})();

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const desk = () => window.matchMedia("(min-width:980px)").matches;
  const svcOf = (s, i) => S.services[s.svcs[i]];
  const tone = w => w <= 10 ? ["Light", "#22c55e"] : w <= 20 ? ["Moderate", "#f5b73b"] : ["Busy", "#ff8a4c"];
  const gLabel = { male: "Men", female: "Women", unisex: "Unisex" };
  const grad = s => `linear-gradient(135deg,${s.clr || "#7c5cff"},color-mix(in srgb,${s.clr || "#7c5cff"} 35%,#ff4fa3))`;
  const art = (s, cls) => s.photo
    ? `<img class="${cls}" src="${esc(s.photo)}" alt="${esc(s.name)}">`
    : `<span class="${cls}">${esc(s.ico || "💈")}</span>`;

  /* ---------------- CSS ---------------- */
  const css = document.createElement("style");
  css.textContent = `
  #cust-home > :not(#cx-home){display:none!important}
  .cx{--c:#0c1030;--c2:#10153d;--ln:rgba(120,120,255,.16);--mu:#98a1cc;--gold:#f5b73b;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .cx *{box-sizing:border-box}
  .cx button{font-family:inherit}
  .cx-loc{font-size:12px;color:var(--mu);margin:2px 0 8px}
  .cx-hi{font:800 30px/1.1 'Syne',sans-serif;margin:0 0 14px}
  .cx-hi em{font-style:normal;background:linear-gradient(90deg,#f5b73b,#ff5fa2);-webkit-background-clip:text;background-clip:text;color:transparent}
  .cx-big{display:none;font:800 38px/1.1 'Syne',sans-serif;margin:0 0 6px}
  .cx-big em{font-style:normal;color:var(--gold)}
  .cx-sub{display:none;font-size:13px;color:var(--mu);margin:0 0 14px}
  .cx-search{display:flex;align-items:center;gap:10px;background:var(--c);border:1px solid var(--ln);border-radius:16px;padding:0 8px 0 14px;margin-bottom:12px}
  .cx-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:#eef1ff;font:14px 'DM Sans',sans-serif;padding:14px 0}
  .cx-search b{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--gold);color:#1a1200}
  .cx-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;scrollbar-width:none}
  .cx-chips::-webkit-scrollbar{display:none}
  .cx-chip{flex:none;cursor:pointer;border:1px solid var(--ln);background:var(--c);color:#d9defa;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;white-space:nowrap}
  .cx-chip.on{background:var(--gold);color:#1a1200;border-color:var(--gold)}
  .cx-h{display:flex;justify-content:space-between;align-items:baseline;margin:16px 0 10px;font:700 15px 'Syne',sans-serif}
  .cx-h small{font:12px 'DM Sans',sans-serif;color:var(--gold)}
  .cx-h .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff4d6d;margin-right:6px}
  .cx-fast{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
  .cx-fast::-webkit-scrollbar{display:none}
  .cx-fc{position:relative;flex:none;width:170px;height:128px;border-radius:20px;padding:14px;cursor:pointer;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;gap:6px}
  .cx-fc .bg{position:absolute;right:-6px;top:-4px;font-size:58px;opacity:.9}
  .cx-fc img.bg{width:90px;height:90px;object-fit:cover;border-radius:16px;font-size:0}
  .cx-fc b{position:relative;font:700 16px 'Syne',sans-serif}
  .cx-pills{position:relative;display:flex;gap:6px}
  .cx-pills span{background:rgba(0,0,0,.32);border-radius:999px;padding:4px 9px;font-size:11.5px;font-weight:600}
  .cx-list{display:flex;flex-direction:column;gap:10px}
  .cx-card{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:var(--c);border:1px solid var(--ln);cursor:pointer;position:relative}
  .cx-card.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold) inset,0 0 26px -12px var(--gold)}
  .cx-card.off{opacity:.55}
  .cx-ico{width:48px;height:48px;border-radius:14px;flex:none;display:grid;place-items:center;font-size:24px;overflow:hidden;background:var(--c2)}
  .cx-ico img{width:100%;height:100%;object-fit:cover}
  .cx-mid{flex:1;min-width:0}
  .cx-nm{display:flex;align-items:center;gap:8px;font:700 15px 'Syne',sans-serif;min-width:0}
  .cx-nm span.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cx-tag{flex:none;font:700 9.5px 'DM Sans',sans-serif;letter-spacing:.06em;padding:3px 7px;border-radius:6px;text-transform:uppercase}
  .cx-tag.o{color:#34d399;background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.4)}
  .cx-tag.c{color:#ff6b8b;background:rgba(255,107,139,.12);border:1px solid rgba(255,107,139,.4)}
  .cx-meta{font-size:12px;color:var(--mu);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cx-meta b{color:var(--gold);font-weight:600}
  .cx-now{flex:none;text-align:right;border-left:1px dashed var(--ln);padding-left:12px;font-size:10px;letter-spacing:.1em;color:var(--mu)}
  .cx-now strong{display:block;font:800 22px 'Syne',sans-serif;color:var(--gold);letter-spacing:0}
  .cx-wait{display:none;flex:none;text-align:right}
  .cx-wait strong{font:800 26px 'Syne',sans-serif;color:var(--gold)}
  .cx-wait small{display:block;font-size:10px;letter-spacing:.1em;color:var(--mu)}
  .cx-lq{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:8px;font-size:11px;color:var(--mu)}
  .cx-lq i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:600 10px 'DM Sans',sans-serif;font-style:normal;background:var(--c2);border:1px solid var(--ln);color:#cfd6ff}
  .cx-lq i.d{background:rgba(52,211,153,.18);border-color:rgba(52,211,153,.5);color:#34d399}
  .cx-lq i.n{background:var(--gold);border-color:var(--gold);color:#1a1200}
  .cx-fz{position:absolute;top:-1px;right:14px;background:var(--gold);color:#1a1200;font:800 9px 'DM Sans',sans-serif;letter-spacing:.1em;padding:3px 9px;border-radius:0 0 8px 8px;display:none}
  .cx-empty{text-align:center;padding:34px 10px;color:var(--mu)}

  /* ---- detail ---- */
  .cx-det{--c:#0c1030;--c2:#10153d;--ln:rgba(120,120,255,.16);--mu:#98a1cc;--gold:#f5b73b;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .cx-det *{box-sizing:border-box}
  .cx-hero{position:relative;border-radius:22px;overflow:hidden;min-height:190px;display:flex;flex-direction:column;justify-content:flex-end;padding:18px}
  .cx-hero .art{position:absolute;right:18px;top:10px;font-size:92px;line-height:1;filter:drop-shadow(0 10px 22px rgba(0,0,0,.35))}
  .cx-hero img.art{width:130px;height:130px;object-fit:cover;border-radius:22px;font-size:0}
  .cx-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(7,9,31,.85));pointer-events:none}
  .cx-hero>*:not(.art){position:relative;z-index:1}
  .cx-hero h2{margin:0;font:800 28px 'Syne',sans-serif;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .cx-hero p{margin:4px 0 0;font-size:12.5px;color:#d8dcf5}
  .cx-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
  .cx-st>div{background:var(--c);border:1px solid var(--ln);border-radius:14px;padding:11px 12px}
  .cx-st>div.hl{border-color:rgba(245,183,59,.55);background:linear-gradient(135deg,rgba(245,183,59,.14),var(--c))}
  .cx-st small{display:block;font-size:9.5px;letter-spacing:.1em;color:var(--mu);text-transform:uppercase}
  .cx-st strong{font:800 21px 'Syne',sans-serif}
  .cx-st .hl strong{color:var(--gold)}
  .cx-st .x{display:none}
  .cx-sec{display:flex;justify-content:space-between;align-items:baseline;margin:16px 0 8px;font:700 14px 'Syne',sans-serif}
  .cx-sec small{font:12px 'DM Sans',sans-serif;color:var(--gold)}
  .cx-svs{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
  .cx-svc{cursor:pointer;text-align:left;color:#eef1ff;background:var(--c);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}
  .cx-svc.on{border-color:var(--gold);background:rgba(245,183,59,.1)}
  .cx-svc b{display:block;font-size:13px;font-weight:600}
  .cx-svc span{font-size:12px;color:var(--gold)}
  .cx-svc em{font-style:normal;font-size:11.5px;color:var(--mu)}
  .cx-rv{background:var(--c);border:1px solid var(--ln);border-radius:14px;padding:11px 13px;margin-bottom:8px;font-size:12.5px;color:#cfd5f5}
  .cx-rv b{color:#fff}.cx-rv i{font-style:normal;color:var(--gold);margin-left:6px}
  .cx-cta{position:sticky;bottom:10px;z-index:5;display:flex;gap:8px;margin-top:16px}
  .cx-go{flex:1;border:0;cursor:pointer;border-radius:16px;padding:15px;font:800 15px 'DM Sans',sans-serif;color:#1a1200;background:linear-gradient(90deg,#f5b73b,#ff8a3d);box-shadow:0 10px 26px -10px #f5b73b}
  .cx-go[disabled]{background:#262b55;color:#8a93c4;box-shadow:none;cursor:not-allowed}
  .cx-alt{flex:none;border:1px solid var(--ln);cursor:pointer;border-radius:16px;padding:0 16px;font:700 14px 'DM Sans',sans-serif;color:#eef1ff;background:var(--c)}
  .cx-tabs{display:flex;gap:6px;background:var(--c2);border:1px solid var(--ln);border-radius:14px;padding:4px;margin:16px 0 4px}
  .cx-tab{flex:1;border:0;cursor:pointer;border-radius:10px;padding:10px;font:700 13px 'DM Sans',sans-serif;color:var(--mu);background:none}
  .cx-tab.on{background:var(--gold);color:#1a1200}
  .cx-pane[hidden]{display:none}
  .cx-tk{background:rgba(245,183,59,.1);border:1.5px solid var(--gold);border-radius:20px;padding:18px;text-align:center;margin-top:14px}
  .cx-tk small{font-size:12px;color:var(--mu)}
  .cx-tk strong{display:block;font:800 54px/1 'Syne',sans-serif;color:var(--gold);margin:4px 0}
  .cx-tk div{display:flex;gap:8px;justify-content:center;margin-top:10px}
  .cx-tk button{cursor:pointer;border-radius:12px;padding:9px 16px;font-weight:700;font-size:13px;border:1px solid var(--ln);background:var(--c);color:#eef1ff}
  .cx-tk button.r{color:#ff6b8b;border-color:rgba(255,107,139,.5)}

  /* ---- desktop split ---- */
  #cx-detail{display:none}
  @media (min-width:980px){
    .cx-wrap{display:grid;grid-template-columns:minmax(340px,400px) 1fr;gap:22px;align-items:start}
    .cx-hi,.cx-loc,.cx-h.fastH,.cx-fast{display:none}
    .cx-big,.cx-sub{display:block}
    .cx-left{position:sticky;top:8px;max-height:calc(100vh - 90px);overflow:auto;padding-right:4px}
    .cx-now{display:none}
    .cx-wait{display:block}
    .cx-card{padding:14px}
    .cx-card.fz .cx-fz{display:block}
    .cx-card.fz{border-color:var(--gold)}
    #cx-detail{display:block;background:var(--c);border:1px solid var(--ln);border-radius:26px;padding:16px;min-height:480px}
    .cx-hero{min-height:230px;padding:24px}
    .cx-hero h2{font-size:36px}
    .cx-hero .art{font-size:130px;right:34px;top:14px}
    .cx-hero img.art{width:180px;height:180px}
    .cx-st{grid-template-columns:repeat(4,1fr)}
    .cx-st .x{display:block}
    .cx-cta{position:static}
    .cx-pick{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .cx-det .cx-svs{grid-template-columns:repeat(3,1fr)}
  }`;
  document.head.appendChild(css);

  /* ---------------- home ---------------- */
  const ICO_SEARCH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#98a1cc" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  const CHIPS = [["all", "All"], ["open", "⚡ Open now"], ["top", "⭐ Top rated"], ["near", "📍 Nearby"], ["male", "Men"], ["female", "Women"]];

  function ensureRoot() {
    if ($("cx-home")) return true;
    const home = $("cust-home");
    if (!home) return false;
    const r = document.createElement("div");
    r.id = "cx-home";
    r.className = "cx";
    r.innerHTML = `
      <div class="cx-wrap">
        <div class="cx-left">
          <div class="cx-loc" id="cx-loc"></div>
          <h1 class="cx-hi" id="cx-hi"></h1>
          <h1 class="cx-big">Skip the wait,<br><em>book your chair.</em></h1>
          <p class="cx-sub" id="cx-sub"></p>
          <label class="cx-search">${ICO_SEARCH}<input id="cx-q" type="search" placeholder="Search shops or services" autocomplete="off"><b>≡</b></label>
          <div class="cx-chips" id="cx-chips"></div>
          <div class="cx-h fastH"><span><span class="dot"></span>Shortest wait right now</span></div>
          <div class="cx-fast" id="cx-fast"></div>
          <div class="cx-h"><span>All shops near you</span><small id="cx-count"></small></div>
          <div class="cx-list" id="cx-list"></div>
        </div>
        <div id="cx-detail"></div>
      </div>`;
    home.insertBefore(r, home.firstChild);

    r.addEventListener("input", e => {
      if (e.target.id === "cx-q") { S.shopQuery = e.target.value; window.renderShops(); }
    });
    r.addEventListener("click", e => {
      const chip = e.target.closest("[data-f]");
      if (chip) { setFilter(chip.dataset.f); return; }
      const card = e.target.closest("[data-id]");
      if (card) window.openShop(Number(card.dataset.id));
    });
    return true;
  }

  function setFilter(f) {
    if (f === "all") { S.shopFilter = "all"; S.genderFilter = "all"; }
    else if (f === "male" || f === "female") S.genderFilter = S.genderFilter === f ? "all" : f;
    else S.shopFilter = S.shopFilter === f ? "all" : f;
    window.renderShops();
  }

  function pills(s) {
    if (!s.open) return "";
    const out = [];
    for (let k = -2; k <= 3; k++) {
      const n = (Number(s.cur) || 0) + k;
      if (n < 1) continue;
      out.push(`<i class="${k < 0 ? "d" : k === 0 ? "n" : ""}">${k < 0 ? "✓" : n}</i>`);
    }
    return out.length ? `<div class="cx-lq">Live queue&nbsp;${out.join("")}</div>` : "";
  }

  function card(s, fastestId) {
    const g = gLabel[s.gender || "unisex"];
    const t = tone(s.wait);
    return `<div class="cx-card ${s.open ? "" : "off"} ${s.id === fastestId ? "fz" : ""} ${desk() && S.selectedShop === s.id ? "on" : ""}" data-id="${s.id}">
      <span class="cx-fz">FASTEST</span>
      <div class="cx-ico">${s.photo ? `<img src="${esc(s.photo)}" alt="">` : esc(s.ico || "💈")}</div>
      <div class="cx-mid">
        <div class="cx-nm"><span class="t">${esc(s.name)}</span><span class="cx-tag ${s.open ? "o" : "c"}">${s.open ? "Open" : "Closed"}</span></div>
        <div class="cx-meta">${esc(s.addr)} · ${g} · ★ ${esc(s.rating)} <b>(${esc(s.rev)})</b>${s.open ? ` · ${esc(s.q)} waiting · <b>~${esc(s.wait)} min</b>` : ""}</div>
        ${pills(s)}
      </div>
      ${s.open
        ? `<div class="cx-now">NOW<strong>#${esc(s.cur)}</strong></div>
           <div class="cx-wait"><strong>${esc(s.wait)}</strong><small>MIN WAIT</small><small style="color:${t[1]};letter-spacing:0">● ${t[0]}</small></div>`
        : `<div class="cx-wait" style="display:block"><small>${s.openingTime ? "OPENS " + esc(s.openingTime) : "CLOSED"}</small></div>
           <div class="cx-now"><strong style="color:var(--mu)">—</strong></div>`}
    </div>`;
  }

  let lastSig = "";
  function paint() {
    if (!ensureRoot()) return;
    const list = (window.bqVisibleShops ? window.bqVisibleShops() : S.shops.slice());
    const open = list.filter(s => s.open).sort((a, b) => a.wait - b.wait);
    const fastestId = open.length > 1 ? open[0].id : -1;

    $("cx-loc").textContent = "📍 " + ((S.user && S.user.location) && !/not set/i.test(S.user.location) ? S.user.location : "Set your location in Profile");
    const nm = (S.user && S.user.name) || "there";
    $("cx-hi").innerHTML = `Hey ${esc(nm.split(" ")[0])}, <em>no more waiting around.</em>`;
    $("cx-sub").textContent = `${open.length} shop${open.length === 1 ? "" : "s"} near you · live queues, updated every few seconds`;

    const q = $("cx-q"); if (q && q !== document.activeElement && q.value !== (S.shopQuery || "")) q.value = S.shopQuery || "";
    $("cx-chips").innerHTML = CHIPS.map(([k, l]) => {
      const on = k === "all" ? (S.shopFilter === "all" && (S.genderFilter || "all") === "all")
        : (k === "male" || k === "female") ? S.genderFilter === k : S.shopFilter === k;
      return `<button type="button" class="cx-chip ${on ? "on" : ""}" data-f="${k}">${l}</button>`;
    }).join("");

    $("cx-fast").innerHTML = open.slice(0, 5).map((s, i) => `
      <div class="cx-fc" data-id="${s.id}" style="background:${grad(s)}">
        ${art(s, "bg")}
        <b>${esc(s.name)}</b>
        <div class="cx-pills"><span>⏱ ${esc(s.wait)} min</span><span>★ ${esc(s.rating)}</span></div>
      </div>`).join("") || `<div class="cx-empty">No shops are open right now.</div>`;

    $("cx-count").textContent = list.length + " found";
    $("cx-list").innerHTML = list.length
      ? list.map(s => card(s, fastestId)).join("")
      : `<div class="cx-empty">${S.shopFilter === "near" ? "Set your location in Profile to see nearby shops." : "No shops match your search."}</div>`;

    if (desk()) {
      const cur = S.shops[S.selectedShop];
      const target = cur && list.find(s => s.id === cur.id) ? cur : (open[0] || list[0]);
      if (target) {
        if (S.selectedShop !== target.id) { S.selectedShop = target.id; if (target.open) buildJoinModal(); }
        const sig = [target.id, target.cur, target.q, target.wait, target.open, S.inQueue, S.myTok, S.selectedSvc, S.cxTab].join("|");
        if (sig !== lastSig || !$("cx-detail").innerHTML) { lastSig = sig; showDetail(target); }
        document.querySelectorAll("#cx-list .cx-card").forEach(c => c.classList.toggle("on", Number(c.dataset.id) === target.id));
      } else $("cx-detail").innerHTML = '<div class="cx-empty">Pick a shop to see its live queue.</div>';
    }
  }

  /* ---------------- shop detail ---------------- */
  function detailHtml(s) {
    const inQ = S.inQueue && S.myShopId === s.id;
    const sel = svcOf(s, Math.min(S.selectedSvc || 0, s.svcs.length - 1)) || svcOf(s, 0);
    const g = gLabel[s.gender || "unisex"];
    return `<div class="cx-det" data-shop="${s.id}">
      <div class="cx-hero" style="background:${grad(s)}">
        ${art(s, "art")}
        <h2>${esc(s.name)} <span class="cx-tag ${s.open ? "o" : "c"}">${s.open ? "Open" : "Closed"}</span></h2>
        <p>${esc(s.addr)} · ${g} · ★ ${esc(s.rating)} (${esc(s.rev)} reviews)</p>
      </div>
      <div class="cx-st">
        <div class="hl"><small>Your wait</small><strong>~${esc(s.wait)} min</strong></div>
        <div><small>Serving</small><strong>#${esc(s.cur)}</strong></div>
        <div><small>Ahead</small><strong>${esc(s.q)}</strong></div>
        <div class="x"><small>Closes</small><strong>${esc(s.closingTime || "—")}</strong></div>
      </div>
      ${inQ ? `<div class="cx-tk"><small>You're in the queue</small><strong>#${esc(S.myTok)}</strong><small>${esc(S.mySvc)}</small>
        <div><button class="r" data-act="leave">Leave queue</button><button data-act="rate" data-name="${esc(s.name)}">Rate shop ⭐</button></div></div>`
      : (() => {
          const tab = s.open ? (S.cxTab || "now") : "later";
          return `<div class="cx-tabs">
            <button type="button" class="cx-tab ${tab === "now" ? "on" : ""}" data-tab="now">🎫 Join now</button>
            <button type="button" class="cx-tab ${tab === "later" ? "on" : ""}" data-tab="later">📅 Book later</button>
          </div>
          <div class="cx-pane" data-pane="now" ${tab === "now" ? "" : "hidden"}>
            <div class="cx-sec"><span>Pick a service</span><small>${s.svcs.length} available</small></div>
            <div class="cx-svs">${s.svcs.map((si, i) => { const v = S.services[si]; return `
              <button type="button" class="cx-svc ${i === (S.selectedSvc || 0) ? "on" : ""}" data-svc="${i}">
                <b>${esc(v.ico)} ${esc(v.name)}</b><span>₹${esc(v.price)}</span> <em>· ${esc(v.dur)} min</em></button>`; }).join("")}</div>
            <div class="cx-cta">
              <button type="button" class="cx-go" data-act="join" ${s.open ? "" : "disabled"}>${s.open ? `🎫 Get my token · ₹${esc(sel ? sel.price : 0)}` : "Shop is closed"}</button>
            </div>
          </div>
          <div class="cx-pane" data-pane="later" ${tab === "later" ? "" : "hidden"}>
            <div class="cx-sec"><span>Reserve a slot</span></div>
            <div class="cx-rv">Choose a date and time that suits you and we'll hold your spot.</div>
            <div class="cx-cta">
              <button type="button" class="cx-go" data-act="book">📅 Choose date &amp; time</button>
            </div>
          </div>`;
        })()}
      <div class="cx-sec"><span>What people say</span></div>
      <div id="cx-rev"><div class="cx-rv">Loading reviews…</div></div>
      <div id="bq-gallery"></div>
      <div style="height:24px"></div>
    </div>`;
  }

  async function loadReviews(s) {
    const box = $("cx-rev");
    if (!box) return;
    try {
      const r = await fetch(BQ_BASE + "/api/shops/reviews?shop_name=" + encodeURIComponent(s.name));
      const j = await r.json();
      const cur = document.querySelector(".cx-det");
      if (!cur || Number(cur.dataset.shop) !== s.id || !$("cx-rev")) return;
      const list = ((j && j.success && j.reviews) || []).filter(rv => rv && String(rv.review || "").trim());
      $("cx-rev").innerHTML = list.length
        ? list.slice(0, 4).map(rv => `<div class="cx-rv"><b>${esc(rv.name || "Customer")}</b><i>${"★".repeat(rv.stars || 0)}</i><div>${esc(rv.review || "")}</div></div>`).join("")
        : '<div class="cx-rv">No written reviews yet.</div>';
    } catch (e) { if ($("cx-rev")) $("cx-rev").innerHTML = ""; }
  }

  function showDetail(s) {
    const box = $("cx-detail");
    if (!box) return;
    box.innerHTML = detailHtml(s);
    loadReviews(s);
  }

  /* shared clicks inside any detail (desktop pane or phone screen) */
  document.addEventListener("click", e => {
    const det = e.target.closest(".cx-det");
    if (!det) return;
    const s = S.shops[Number(det.dataset.shop)];
    if (!s) return;
    S.selectedShop = s.id;

    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) {
      S.cxTab = tabBtn.dataset.tab;
      det.querySelectorAll(".cx-tab").forEach(b => b.classList.toggle("on", b === tabBtn));
      det.querySelectorAll(".cx-pane").forEach(p => { p.hidden = p.dataset.pane !== S.cxTab; });
      lastSig = "";
      return;
    }

    const svc = e.target.closest("[data-svc]");
    if (svc) {
      S.selectedSvc = Number(svc.dataset.svc);
      det.querySelectorAll(".cx-svc").forEach(b => b.classList.toggle("on", b === svc));
      const v = svcOf(s, S.selectedSvc), go = det.querySelector('[data-act="join"]');
      if (v && go && s.open) go.textContent = "🎫 Get my token · ₹" + v.price;
      lastSig = "";
      return;
    }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    switch (act.dataset.act) {
      case "join": if (s.open) { buildJoinModalKeep(s); confirmJoin(); } break;
      case "book": window.bkOpen && window.bkOpen(); break;
      case "leave": window.leaveQ && window.leaveQ(); break;
      case "rate":
        openModal("m-rate");
        const n = $("rate-shop-name"); if (n) n.textContent = act.dataset.name;
        break;
    }
  });
  function buildJoinModalKeep(s) {      // confirmJoin() reads S.selectedSvc / S.selectedShop
    S.selectedShop = s.id;
    S.selectedSvc = Math.min(S.selectedSvc || 0, s.svcs.length - 1);
  }

  /* ---------------- hook into the existing functions ---------------- */
  const baseRender = window.renderShops;
  window.renderShops = function () {
    const out = baseRender.apply(this, arguments);
    try { paint(); } catch (err) { console.error("customer UI:", err); }
    return out;
  };

  const baseOpen = window.openShop;
  window.openShop = function (id) {
    const s = S.shops[id];
    if (!s) return;
    if (desk() && $("cx-detail")) {
      S.selectedShop = id;
      S.selectedSvc = 0;
      if (s.open) buildJoinModal();
      lastSig = "";
      paint();
      return;
    }
    const out = baseOpen.apply(this, arguments);       // keeps go('s-shop'), gallery loader, join modal
    const body = $("sh-body");
    if (body) { body.innerHTML = detailHtml(s); loadReviews(s); }
    return out;
  };

  window.addEventListener("resize", () => { lastSig = ""; try { paint(); } catch (e) {} });
  (async function init() {
    try { await componentsReady; } catch (e) { return; }
    try { paint(); } catch (e) { console.error(e); }
  })();
})();

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const css = document.createElement("style");
  css.textContent = `
  /* ---------- payment ---------- */
  #m-pay .modal.px{width:100%;max-width:460px;max-height:94vh;overflow:auto;padding:20px;border-radius:26px;color:#eef1ff;font-family:'DM Sans',sans-serif;
    background:radial-gradient(120% 80% at 100% 100%,rgba(124,58,237,.28),transparent 60%),linear-gradient(180deg,#0a0e2e,#070a22);
    border:1px solid rgba(120,120,255,.2)}
  .px *{box-sizing:border-box}
  .px button{font-family:inherit}
  .px-head{display:flex;align-items:center;gap:14px;margin-bottom:16px}
  .px-ico{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:24px;flex:none;background:rgba(245,183,59,.12);border:1.5px solid rgba(245,183,59,.6);box-shadow:0 0 22px -6px #f5b73b}
  .px-head h3{margin:0;font:700 24px 'DM Sans',sans-serif}
  .px-head small{display:block;margin-top:2px;font-size:13.5px;color:#8fa0ff}
  .px-amt{display:flex;align-items:center;gap:12px;padding:16px;border-radius:20px;margin-bottom:20px;border:1.5px solid #f5b73b;
    background:linear-gradient(135deg,rgba(245,183,59,.2),rgba(245,183,59,.04));box-shadow:0 0 30px -12px #f5b73b}
  .px-amt .ci{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;flex:none;font:800 20px 'DM Sans',sans-serif;color:#f5b73b;background:rgba(245,183,59,.14);border:1px solid rgba(245,183,59,.4)}
  .px-amt span{flex:1;font-size:14px;color:#b8c0e8}
  .px-amt strong{font:800 34px 'DM Sans',sans-serif;color:#f5b73b;letter-spacing:-.5px}
  .px h4{margin:0 0 10px;font:700 17px 'DM Sans',sans-serif}
  .px .pay-opt{display:flex;align-items:center;gap:14px;padding:13px 14px;margin-bottom:10px;border-radius:18px;cursor:pointer;
    background:rgba(20,26,70,.55);border:1px solid rgba(120,120,255,.22);transition:.15s}
  .px .pay-opt .oi{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font-size:21px;flex:none;background:rgba(70,90,200,.28);border:1px solid rgba(120,130,255,.35)}
  .px .pay-opt .ot{flex:1;min-width:0}
  .px .pay-opt .ot b{display:block;font:700 16px 'DM Sans',sans-serif}
  .px .pay-opt .ot small{display:block;margin-top:2px;font-size:12.5px;color:#8fa0ff}
  .px .pay-opt .rd{width:26px;height:26px;border-radius:50%;flex:none;display:grid;place-items:center;border:2px solid #4a55a8;color:transparent;font-size:14px;font-weight:800}
  .px .pay-opt.sel{border-color:#f5b73b;background:linear-gradient(135deg,rgba(245,183,59,.16),rgba(20,26,70,.55));box-shadow:0 0 26px -10px #f5b73b}
  .px .pay-opt.sel .oi{background:rgba(245,183,59,.14);border-color:rgba(245,183,59,.5)}
  .px .pay-opt.sel .rd{background:#f5b73b;border-color:#f5b73b;color:#1a1200}
  #upi-qr-section.px-qr{text-align:center;padding:14px;margin:-2px 0 12px;border-radius:18px;background:rgba(20,26,70,.55);border:1px dashed rgba(120,130,255,.4)}
  #upi-qr-section.px-qr img{width:180px;max-width:70%;border-radius:14px;background:#fff;padding:8px}
  #upi-id-text{margin-top:8px;font-size:13px;color:#b8c0e8;word-break:break-all}
  .px-btns{display:grid;grid-template-columns:1fr 1.5fr;gap:12px;margin-top:16px}
  .px-back,.px-go{display:flex;align-items:center;justify-content:center;gap:10px;min-height:56px;border-radius:18px;cursor:pointer;font:700 16px/1.15 'DM Sans',sans-serif;text-align:center}
  .px-back{color:#eef1ff;background:rgba(20,26,70,.6);border:1px solid rgba(120,130,255,.3)}
  .px-go{border:0;color:#1a1200;background:linear-gradient(90deg,#f5b73b,#ff9a3d);box-shadow:0 12px 28px -12px #f5b73b}
  .px-go:disabled{opacity:.7}
  @media (max-width:380px){.px-amt strong{font-size:28px}.px-btns{grid-template-columns:1fr}}

  /* ---------- support ---------- */
  .sp{--c:#0c1030;--ln:rgba(120,120,255,.18);--mu:#98a1cc;color:#eef1ff;font-family:'DM Sans',sans-serif;max-width:1100px;margin:0 auto}
  .sp *{box-sizing:border-box}
  .sp-top{text-align:center;padding:10px 0 22px}
  .sp-hs{width:56px;height:56px;margin:0 auto 10px;border-radius:50%;display:grid;place-items:center;font-size:26px;background:rgba(245,183,59,.1);border:1.5px solid #f5b73b;box-shadow:0 0 24px -6px #f5b73b}
  .sp-top h2{margin:0;font:800 30px 'Syne',sans-serif}.sp-top h2 em{font-style:normal;color:#f5b73b}
  .sp-top h5{margin:6px 0 2px;font:700 17px 'DM Sans',sans-serif;color:#c9d2ff}
  .sp-top p{margin:0;font-size:12.5px;color:var(--mu)}
  .sp-cards{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:20px}
  .sp-card{display:flex;align-items:center;gap:14px;width:100%;padding:16px;border-radius:18px;text-decoration:none;color:inherit;text-align:left;cursor:pointer;border:1.5px solid var(--k);
    background:linear-gradient(135deg,color-mix(in srgb,var(--k) 16%,#0a0e2e),#0a0e2e 70%);box-shadow:0 0 26px -16px var(--k);font-family:inherit}
  .sp-card .ci{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:23px;flex:none;background:var(--k);box-shadow:0 0 18px -4px var(--k)}
  .sp-card .tx{flex:1;min-width:0}
  .sp-card b{display:block;font:700 17px 'DM Sans',sans-serif}
  .sp-card small{display:block;margin-top:2px;font-size:13.5px;color:#cdd3f3;overflow:hidden;text-overflow:ellipsis}
  .sp-card .ch{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex:none;background:rgba(255,255,255,.07);border:1px solid var(--ln);font-size:18px}
  .sp-faq{padding:14px;border-radius:22px;background:rgba(12,16,48,.7);border:1px solid var(--ln)}
  .sp-fh{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 4px 12px;margin-bottom:8px;border-bottom:1px solid var(--ln)}
  .sp-fh b{display:flex;align-items:center;gap:10px;font:700 18px 'DM Sans',sans-serif}
  .sp-va{cursor:pointer;border-radius:999px;padding:8px 14px;font:600 13px 'DM Sans',sans-serif;color:#f5b73b;background:none;border:1px solid #f5b73b}
  .sp .bq-faq{border-radius:14px;margin-bottom:8px;border:1px solid var(--ln);background:rgba(20,26,70,.45);overflow:hidden}
  .sp .bq-faq-q{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;font:500 14.5px 'DM Sans',sans-serif;color:#eef1ff;background:none;border:0;text-align:left;cursor:pointer}
  .sp .bq-faq-q .qm{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;flex:none;font:800 13px 'DM Sans',sans-serif;color:#1a1200;background:#f5b73b}
  .sp .bq-faq-q .qt{flex:1}
  .sp .bq-faq-q .pl{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;flex:none;background:rgba(255,255,255,.06);border:1px solid var(--ln)}
  .sp .bq-faq-a{display:none;padding:0 16px 14px 54px;font-size:13.5px;line-height:1.55;color:var(--mu)}
  .sp .bq-faq.open .bq-faq-a{display:block}
  .sp .bq-faq.more{display:none}.sp.all .bq-faq.more{display:block}
  @media (min-width:760px){.sp-cards{grid-template-columns:1fr 1fr;gap:14px}.sp-card{padding:20px}.sp-faq{padding:18px 20px}}`;
  document.head.appendChild(css);

  /* ================= PAYMENT ================= */
  function buildPay() {
    const m = $("m-pay");
    if (!m || m.dataset.px) return;
    const box = m.querySelector(".modal") || m.firstElementChild;
    if (!box) return;
    m.dataset.px = "1";
    box.classList.add("px");
    box.innerHTML = `
      <div class="px-head"><div class="px-ico">💳</div><div><h3>Payment</h3><small id="pay-svc"></small></div></div>
      <div class="px-amt"><div class="ci">₹</div><span>Amount to Pay</span><strong id="pay-amt">₹0</strong></div>
      <h4>Choose Payment Method</h4>
      <div class="pay-opt sel" id="pay-online" onclick="selectPayMethod('online')">
        <div class="oi">💳</div><div class="ot"><b>Pay Online Now</b><small>UPI, Card, Wallet – secured checkout</small></div><div class="rd">✓</div></div>
      <div class="pay-opt" id="pay-upi_qr" style="display:none" onclick="selectPayMethod('upi_qr')">
        <div class="oi">▦</div><div class="ot"><b>Pay with Shop's UPI QR</b><small>Scan and pay the barber directly</small></div><div class="rd">✓</div></div>
      <div id="upi-qr-section" class="px-qr" style="display:none"><img id="upi-qr-img" alt="Shop UPI QR"><div id="upi-id-text"></div></div>
      <div class="pay-opt" id="pay-shop" onclick="selectPayMethod('shop')">
        <div class="oi">💵</div><div class="ot"><b>Pay at Shop</b><small>Settle in cash or card after your service</small></div><div class="rd">✓</div></div>
      <div class="px-btns">
        <button type="button" class="px-back" id="pay-back">← Back</button>
        <button type="button" class="px-go" id="pay-go">👥 <span id="pay-btn-label">Pay &amp; Join Queue</span></button>
      </div>`;
    $("pay-back").addEventListener("click", () => closeModal("m-pay"));
    $("pay-go").addEventListener("click", () => processPayment());
  }

  const CARDS = {
    call:  { k: "#ff2d6f", ico: "📞" },
    chat:  { k: "#10b981", ico: "💬" },
    mail:  { k: "#3b6cff", ico: "✉️" },
    tkt:   { k: "#f5b73b", ico: "📄" }
  };
  const card = (c, title, sub, attrs, tag) => `
    <${tag} ${attrs} class="sp-card" style="--k:${c.k}">
      <span class="ci">${c.ico}</span><span class="tx"><b>${title}</b><small>${sub}</small></span><span class="ch">›</span>
    </${tag}>`;

  function rebuildSupport() {
    const body = $("support-body");
    if (!body || typeof FAQS === "undefined") return;
    const LIMIT = 6;
    body.innerHTML = `
      <div class="sp">
        <div class="sp-top">
          <div class="sp-hs">🎧</div>
          <h2>Help <em>&amp;</em> Support</h2>
          <h5>How can we help?</h5>
          <p>We're here every day, 9 AM – 9 PM</p>
        </div>
        <div class="sp-cards">
          ${card(CARDS.call, "Call Us", "+91 12345 67890", 'href="tel:+911234567890"', "a")}
          ${card(CARDS.chat, "Help Assistant", "Instant answers", 'type="button" data-bq="chat"', "button")}
          ${card(CARDS.mail, "Email Us", "support@barberq.app", 'href="mailto:support@barberq.app"', "a")}
          ${card(CARDS.tkt, "Raise a Ticket", "Submit a support request", 'type="button" data-bq="ticket"', "button")}
        </div>
        <div class="sp-faq">
          <div class="sp-fh"><b>💬 Frequently Asked Questions</b>
            ${FAQS.length > LIMIT ? '<button type="button" class="sp-va" id="sp-va">+ View All</button>' : ""}</div>
          ${FAQS.map((f, i) => `
            <div class="bq-faq ${i >= LIMIT ? "more" : ""}">
              <button type="button" class="bq-faq-q"><span class="qm">?</span><span class="qt">${esc(f.q)}</span><span class="pl">＋</span></button>
              <div class="bq-faq-a">${esc(f.a)}</div>
            </div>`).join("")}
        </div>
        <div id="bq-my-tickets"></div>
        <div style="height:24px"></div>
      </div>`;
    const va = $("sp-va");
    if (va) va.addEventListener("click", () => {
      const sp = body.querySelector(".sp");
      const all = sp.classList.toggle("all");
      va.textContent = all ? "− Show less" : "+ View All";
    });
  }

  const baseSupport = window.renderSupport;
  window.renderSupport = function () {
    const out = baseSupport.apply(this, arguments);   // keeps the My Tickets loader
    try { rebuildSupport(); } catch (e) { console.error("support UI:", e); }
    return out;
  };
  renderSupport = window.renderSupport;

  (async function init() {
    try { await componentsReady; } catch (e) { return; }
    buildPay();
    if ($("s-support") && $("s-support").classList.contains("active")) window.renderSupport();
  })();
})();

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const desk = () => window.matchMedia("(min-width:980px)").matches;
  const svcOf = (s, i) => S.services[s.svcs[i]];
  const tone = w => w <= 10 ? ["Light", "#22c55e"] : w <= 20 ? ["Moderate", "#f5b73b"] : ["Busy", "#ff8a4c"];
  const gLabel = { male: "Men", female: "Women", unisex: "Unisex" };
  const grad = s => `linear-gradient(135deg,${s.clr || "#7c5cff"},color-mix(in srgb,${s.clr || "#7c5cff"} 35%,#ff4fa3))`;
  const art = (s, cls) => s.photo
    ? `<img class="${cls}" src="${esc(s.photo)}" alt="${esc(s.name)}">`
    : `<span class="${cls}">${esc(s.ico || "💈")}</span>`;

  const css = document.createElement("style");
  css.textContent = `
  #cust-home > :not(#cx-home){display:none!important}
  .cx{--c:#0c1030;--c2:#10153d;--ln:rgba(120,120,255,.16);--mu:#98a1cc;--gold:#f5b73b;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .cx *{box-sizing:border-box}
  .cx button{font-family:inherit}
  .cx-loc{font-size:12px;color:var(--mu);margin:2px 0 8px}
  .cx-hi{font:800 30px/1.1 'Syne',sans-serif;margin:0 0 14px}
  .cx-hi em{font-style:normal;background:linear-gradient(90deg,#f5b73b,#ff5fa2);-webkit-background-clip:text;background-clip:text;color:transparent}
  .cx-big{display:none;font:800 38px/1.1 'Syne',sans-serif;margin:0 0 6px}
  .cx-big em{font-style:normal;color:var(--gold)}
  .cx-sub{display:none;font-size:13px;color:var(--mu);margin:0 0 14px}
  .cx-search{display:flex;align-items:center;gap:10px;background:var(--c);border:1px solid var(--ln);border-radius:16px;padding:0 8px 0 14px;margin-bottom:12px}
  .cx-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:#eef1ff;font:14px 'DM Sans',sans-serif;padding:14px 0}
  .cx-search b{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--gold);color:#1a1200}
  .cx-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;scrollbar-width:none}
  .cx-chips::-webkit-scrollbar{display:none}
  .cx-chip{flex:none;cursor:pointer;border:1px solid var(--ln);background:var(--c);color:#d9defa;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;white-space:nowrap}
  .cx-chip.on{background:var(--gold);color:#1a1200;border-color:var(--gold)}
  .cx-h{display:flex;justify-content:space-between;align-items:baseline;margin:16px 0 10px;font:700 15px 'Syne',sans-serif}
  .cx-h small{font:12px 'DM Sans',sans-serif;color:var(--gold)}
  .cx-h .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff4d6d;margin-right:6px}
  .cx-fast{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
  .cx-fast::-webkit-scrollbar{display:none}
  .cx-fc{position:relative;flex:none;width:170px;height:128px;border-radius:20px;padding:14px;cursor:pointer;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;gap:6px}
  .cx-fc .bg{position:absolute;right:-6px;top:-4px;font-size:58px;opacity:.9}
  .cx-fc img.bg{width:90px;height:90px;object-fit:cover;border-radius:16px;font-size:0}
  .cx-fc b{position:relative;font:700 16px 'Syne',sans-serif}
  .cx-pills{position:relative;display:flex;gap:6px}
  .cx-pills span{background:rgba(0,0,0,.32);border-radius:999px;padding:4px 9px;font-size:11.5px;font-weight:600}
  .cx-list{display:flex;flex-direction:column;gap:10px}
  .cx-card{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:var(--c);border:1px solid var(--ln);cursor:pointer;position:relative}
  .cx-card.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold) inset,0 0 26px -12px var(--gold)}
  .cx-card.off{opacity:.55}
  .cx-ico{width:48px;height:48px;border-radius:14px;flex:none;display:grid;place-items:center;font-size:24px;overflow:hidden;background:var(--c2)}
  .cx-ico img{width:100%;height:100%;object-fit:cover}
  .cx-mid{flex:1;min-width:0}
  .cx-nm{display:flex;align-items:center;gap:8px;font:700 15px 'Syne',sans-serif;min-width:0}
  .cx-nm span.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cx-tag{flex:none;font:700 9.5px 'DM Sans',sans-serif;letter-spacing:.06em;padding:3px 7px;border-radius:6px;text-transform:uppercase}
  .cx-tag.o{color:#34d399;background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.4)}
  .cx-tag.c{color:#ff6b8b;background:rgba(255,107,139,.12);border:1px solid rgba(255,107,139,.4)}
  .cx-meta{font-size:12px;color:var(--mu);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cx-meta b{color:var(--gold);font-weight:600}
  .cx-now{flex:none;text-align:right;border-left:1px dashed var(--ln);padding-left:12px;font-size:10px;letter-spacing:.1em;color:var(--mu)}
  .cx-now strong{display:block;font:800 22px 'Syne',sans-serif;color:var(--gold);letter-spacing:0}
  .cx-wait{display:none;flex:none;text-align:right}
  .cx-wait strong{font:800 26px 'Syne',sans-serif;color:var(--gold)}
  .cx-wait small{display:block;font-size:10px;letter-spacing:.1em;color:var(--mu)}
  .cx-lq{display:flex;align-items:center;gap:5px;margin-top:8px;font-size:11px;color:var(--mu);overflow:hidden}
  .cx-lq .lbl{display:none;margin-right:4px}
  .cx-lq i:nth-of-type(n+5){display:none}
  .cx-lq i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:600 10px 'DM Sans',sans-serif;font-style:normal;background:var(--c2);border:1px solid var(--ln);color:#cfd6ff}
  .cx-lq i.d{background:rgba(52,211,153,.18);border-color:rgba(52,211,153,.5);color:#34d399}
  .cx-lq i.n{background:var(--gold);border-color:var(--gold);color:#1a1200}
  .cx-fz{position:absolute;top:-1px;right:14px;background:var(--gold);color:#1a1200;font:800 9px 'DM Sans',sans-serif;letter-spacing:.1em;padding:3px 9px;border-radius:0 0 8px 8px;display:none}
  .cx-empty{text-align:center;padding:34px 10px;color:var(--mu)}

  /* ---- detail ---- */
  .cx-det{--c:#0c1030;--c2:#10153d;--ln:rgba(120,120,255,.16);--mu:#98a1cc;--gold:#f5b73b;color:#eef1ff;font-family:'DM Sans',sans-serif}
  .cx-det *{box-sizing:border-box}
  .cx-hero{position:relative;border-radius:22px;overflow:hidden;min-height:190px;display:flex;flex-direction:column;justify-content:flex-end;padding:18px}
  .cx-hero .art{position:absolute;right:18px;top:10px;font-size:92px;line-height:1;filter:drop-shadow(0 10px 22px rgba(0,0,0,.35))}
  .cx-hero img.art{width:130px;height:130px;object-fit:cover;border-radius:22px;font-size:0}
  .cx-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(7,9,31,.85));pointer-events:none}
  .cx-hero>*:not(.art){position:relative;z-index:1}
  .cx-hero h2{margin:0;font:800 28px 'Syne',sans-serif;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .cx-hero p{margin:4px 0 0;font-size:12.5px;color:#d8dcf5}
  .cx-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
  .cx-st>div{background:var(--c);border:1px solid var(--ln);border-radius:14px;padding:11px 12px}
  .cx-st>div.hl{border-color:rgba(245,183,59,.55);background:linear-gradient(135deg,rgba(245,183,59,.14),var(--c))}
  .cx-st small{display:block;font-size:9.5px;letter-spacing:.1em;color:var(--mu);text-transform:uppercase}
  .cx-st strong{font:800 21px 'Syne',sans-serif}
  .cx-st .hl strong{color:var(--gold)}
  .cx-st .x{display:none}
  .cx-sec{display:flex;justify-content:space-between;align-items:baseline;margin:16px 0 8px;font:700 14px 'Syne',sans-serif}
  .cx-sec small{font:12px 'DM Sans',sans-serif;color:var(--gold)}
  .cx-svs{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
  .cx-svc{cursor:pointer;text-align:left;color:#eef1ff;background:var(--c);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}
  .cx-svc.on{border-color:var(--gold);background:rgba(245,183,59,.1)}
  .cx-svc b{display:block;font-size:13px;font-weight:600}
  .cx-svc span{font-size:12px;color:var(--gold)}
  .cx-svc em{font-style:normal;font-size:11.5px;color:var(--mu)}
  .cx-rv{background:var(--c);border:1px solid var(--ln);border-radius:14px;padding:11px 13px;margin-bottom:8px;font-size:12.5px;color:#cfd5f5}
  .cx-rv b{color:#fff}.cx-rv i{font-style:normal;color:var(--gold);margin-left:6px}
  .cx-cta{position:sticky;bottom:10px;z-index:5;display:flex;gap:8px;margin-top:16px}
  .cx-go{flex:1;border:0;cursor:pointer;border-radius:16px;padding:15px;font:800 15px 'DM Sans',sans-serif;color:#1a1200;background:linear-gradient(90deg,#f5b73b,#ff8a3d);box-shadow:0 10px 26px -10px #f5b73b}
  .cx-go[disabled]{background:#262b55;color:#8a93c4;box-shadow:none;cursor:not-allowed}
  .cx-alt{flex:none;border:1px solid var(--ln);cursor:pointer;border-radius:16px;padding:0 16px;font:700 14px 'DM Sans',sans-serif;color:#eef1ff;background:var(--c)}
  .cx-tk{background:rgba(245,183,59,.1);border:1.5px solid var(--gold);border-radius:20px;padding:18px;text-align:center;margin-top:14px}
  .cx-tk small{font-size:12px;color:var(--mu)}
  .cx-tk strong{display:block;font:800 54px/1 'Syne',sans-serif;color:var(--gold);margin:4px 0}
  .cx-tk div{display:flex;gap:8px;justify-content:center;margin-top:10px}
  .cx-tk button{cursor:pointer;border-radius:12px;padding:9px 16px;font-weight:700;font-size:13px;border:1px solid var(--ln);background:var(--c);color:#eef1ff}
  .cx-tk button.r{color:#ff6b8b;border-color:rgba(255,107,139,.5)}

  .cx-pick{display:flex;flex-direction:column}
  .cx-psv{order:1}.cx-pr{order:2}.cx-prv{order:3}
  .cx-tabs{display:none}
  .cx-rsv-t{display:none}
  .cx-inline{display:none;position:static!important;background:none!important;padding:0!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important;inset:auto!important}
  .cx-inline.open{display:block}
  .cx-inline .modal{max-width:none!important;width:100%!important;max-height:none!important;overflow:visible!important;box-shadow:none!important;border:0!important;background:transparent!important;padding:0!important;transform:none!important;margin:0!important}
  .cx-inline #bk-cancel{display:none}
  .cx-inline .modal>div:first-child{display:none}
  /* ---- desktop split ---- */
  #cx-detail{display:none}
  @media (min-width:980px){
    .cx-wrap{display:grid;grid-template-columns:minmax(340px,400px) 1fr;gap:22px;align-items:start}
    .cx-hi,.cx-loc,.cx-h.fastH,.cx-fast{display:none}
    .cx-big,.cx-sub{display:block}
    .cx-left{position:sticky;top:8px;max-height:calc(100vh - 90px);overflow:auto;padding-right:4px}
    .cx-now{display:none}
    .cx-wait{display:block}
    .cx-lq .lbl{display:inline}
    .cx-lq i:nth-of-type(n+5){display:grid}
    .cx-card{padding:14px}
    .cx-card.fz .cx-fz{display:block}
    .cx-card.fz{border-color:var(--gold)}
    #cx-detail{display:block;background:var(--c);border:1px solid var(--ln);border-radius:26px;padding:16px;min-height:480px}
    .cx-hero{min-height:230px;padding:24px}
    .cx-hero h2{font-size:36px}
    .cx-hero .art{font-size:130px;right:34px;top:14px}
    .cx-hero img.art{width:180px;height:180px}
    .cx-st{grid-template-columns:repeat(4,1fr)}
    .cx-st .x{display:block}
    .cx-cta{position:static}
    .cx-pick{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .cx-det .cx-svs{grid-template-columns:repeat(3,1fr)}
    .cx-pick{display:grid;grid-template-columns:minmax(0,1fr) 340px;grid-template-areas:"sv pr" "rv pr";column-gap:18px;align-items:start}
    .cx-psv{grid-area:sv}.cx-pr{grid-area:pr;margin-top:16px}.cx-prv{grid-area:rv}
    .cx-rsv{background:var(--c2);border:1px solid var(--ln);border-radius:20px;padding:14px}
    .cx-tabs{display:grid;grid-template-columns:1fr 1fr;background:#080b26;border:1px solid var(--ln);border-radius:12px;padding:3px;margin-bottom:12px}
    .cx-tabs button{border:0;cursor:pointer;border-radius:9px;padding:9px;font:700 13px 'DM Sans',sans-serif;background:none;color:var(--mu)}
    .cx-tabs button.on{background:var(--gold);color:#1a1200}
    .cx-rsv-t{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--mu);margin:2px 0 12px}
    .cx-rsv-t strong{font:800 22px 'Syne',sans-serif;color:var(--gold)}
    .cx-rsv .cx-cta{margin-top:0}
    .cx-rsv .cx-alt{display:none}
    .cx-bkmsg{text-align:center;color:var(--mu);font-size:13px;padding:10px 0}
    .cx-bkmsg button{margin-top:10px;cursor:pointer;border-radius:12px;padding:10px 16px;font-weight:700;border:1px solid var(--ln);background:var(--c);color:#eef1ff}
  }`;
  document.head.appendChild(css);
  const ICO_SEARCH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#98a1cc" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  const CHIPS = [["all", "All"], ["open", "⚡ Open now"], ["top", "⭐ Top rated"], ["near", "📍 Nearby"], ["male", "Men"], ["female", "Women"]];

  function ensureRoot() {
    if ($("cx-home")) return true;
    const home = $("cust-home");
    if (!home) return false;
    const r = document.createElement("div");
    r.id = "cx-home";
    r.className = "cx";
    r.innerHTML = `
      <div class="cx-wrap">
        <div class="cx-left">
          <div class="cx-loc" id="cx-loc"></div>
          <h1 class="cx-hi" id="cx-hi"></h1>
          <h1 class="cx-big">Skip the wait,<br><em>book your chair.</em></h1>
          <p class="cx-sub" id="cx-sub"></p>
          <label class="cx-search">${ICO_SEARCH}<input id="cx-q" type="search" placeholder="Search shops or services" autocomplete="off"><b>≡</b></label>
          <div class="cx-chips" id="cx-chips"></div>
          <div class="cx-h fastH"><span><span class="dot"></span>Shortest wait right now</span></div>
          <div class="cx-fast" id="cx-fast"></div>
          <div class="cx-h"><span>All shops near you</span><small id="cx-count"></small></div>
          <div class="cx-list" id="cx-list"></div>
        </div>
        <div id="cx-detail"></div>
      </div>`;
    home.insertBefore(r, home.firstChild);

    r.addEventListener("input", e => {
      if (e.target.id === "cx-q") { S.shopQuery = e.target.value; window.renderShops(); }
    });
    r.addEventListener("click", e => {
      const chip = e.target.closest("[data-f]");
      if (chip) { setFilter(chip.dataset.f); return; }
      const card = e.target.closest("[data-id]");
      if (card) window.openShop(Number(card.dataset.id));
    });
    return true;
  }

  function setFilter(f) {
    if (f === "all") { S.shopFilter = "all"; S.genderFilter = "all"; }
    else if (f === "male" || f === "female") S.genderFilter = S.genderFilter === f ? "all" : f;
    else S.shopFilter = S.shopFilter === f ? "all" : f;
    window.renderShops();
  }

  function pills(s) {
    if (!s.open) return "";
    const out = [];
    for (let k = -2; k <= 3; k++) {
      const n = (Number(s.cur) || 0) + k;
      if (n < 1) continue;
      out.push(`<i class="${k < 0 ? "d" : k === 0 ? "n" : ""}">${k < 0 ? "✓" : n}</i>`);
    }
    return out.length ? `<div class="cx-lq"><span class="lbl">Live queue</span>${out.join("")}</div>` : "";
  }

  function card(s, fastestId) {
    const g = gLabel[s.gender || "unisex"];
    const t = tone(s.wait);
    return `<div class="cx-card ${s.open ? "" : "off"} ${s.id === fastestId ? "fz" : ""} ${desk() && S.selectedShop === s.id ? "on" : ""}" data-id="${s.id}">
      <span class="cx-fz">FASTEST</span>
      <div class="cx-ico">${s.photo ? `<img src="${esc(s.photo)}" alt="">` : esc(s.ico || "💈")}</div>
      <div class="cx-mid">
        <div class="cx-nm"><span class="t">${esc(s.name)}</span><span class="cx-tag ${s.open ? "o" : "c"}">${s.open ? "Open" : "Closed"}</span></div>
        <div class="cx-meta">${esc(s.addr)} · ${g} · ★ ${esc(s.rating)} <b>(${esc(s.rev)})</b>${s.open ? ` · ${esc(s.q)} waiting · <b>~${esc(s.wait)} min</b>` : ""}</div>
        ${pills(s)}
      </div>
      ${s.open
        ? `<div class="cx-now">NOW<strong>#${esc(s.cur)}</strong></div>
           <div class="cx-wait"><strong>${esc(s.wait)}</strong><small>MIN WAIT</small><small style="color:${t[1]};letter-spacing:0">● ${t[0]}</small></div>`
        : `<div class="cx-wait" style="display:block"><small>${s.openingTime ? "OPENS " + esc(s.openingTime) : "CLOSED"}</small></div>
           <div class="cx-now"><strong style="color:var(--mu)">—</strong></div>`}
    </div>`;
  }

  let lastSig = "";
  let tab = "now";          
  function paint() {
    if (!ensureRoot()) return;
    const list = (window.bqVisibleShops ? window.bqVisibleShops() : S.shops.slice());
    const open = list.filter(s => s.open).sort((a, b) => a.wait - b.wait);
    const fastestId = open.length > 1 ? open[0].id : -1;

    $("cx-loc").textContent = "📍 " + ((S.user && S.user.location) && !/not set/i.test(S.user.location) ? S.user.location : "Set your location in Profile");
    const nm = (S.user && S.user.name) || "there";
    $("cx-hi").innerHTML = `Hey ${esc(nm.split(" ")[0])}, <em>no more waiting around.</em>`;
    $("cx-sub").textContent = `${open.length} shop${open.length === 1 ? "" : "s"} near you · live queues, updated every few seconds`;

    const q = $("cx-q"); if (q && q !== document.activeElement && q.value !== (S.shopQuery || "")) q.value = S.shopQuery || "";
    $("cx-chips").innerHTML = CHIPS.map(([k, l]) => {
      const on = k === "all" ? (S.shopFilter === "all" && (S.genderFilter || "all") === "all")
        : (k === "male" || k === "female") ? S.genderFilter === k : S.shopFilter === k;
      return `<button type="button" class="cx-chip ${on ? "on" : ""}" data-f="${k}">${l}</button>`;
    }).join("");

    $("cx-fast").innerHTML = open.slice(0, 5).map((s, i) => `
      <div class="cx-fc" data-id="${s.id}" style="background:${grad(s)}">
        ${art(s, "bg")}
        <b>${esc(s.name)}</b>
        <div class="cx-pills"><span>⏱ ${esc(s.wait)} min</span><span>★ ${esc(s.rating)}</span></div>
      </div>`).join("") || `<div class="cx-empty">No shops are open right now.</div>`;

    $("cx-count").textContent = list.length + " found";
    $("cx-list").innerHTML = list.length
      ? list.map(s => card(s, fastestId)).join("")
      : `<div class="cx-empty">${S.shopFilter === "near" ? "Set your location in Profile to see nearby shops." : "No shops match your search."}</div>`;

    if (desk()) {
      const cur = S.shops[S.selectedShop];
      const target = cur && list.find(s => s.id === cur.id) ? cur : (open[0] || list[0]);
      if (target) {
        if (S.selectedShop !== target.id) { S.selectedShop = target.id; if (target.open) buildJoinModal(); }
        const sig = [target.id, target.cur, target.q, target.wait, target.open, S.inQueue, S.myTok, S.selectedSvc].join("|");
        const shown = document.querySelector("#cx-detail .cx-det");
        const keepBooking = tab === "later" && shown && Number(shown.dataset.shop) === target.id;
        if (!keepBooking && (sig !== lastSig || !$("cx-detail").innerHTML)) { lastSig = sig; showDetail(target); }
        document.querySelectorAll("#cx-list .cx-card").forEach(c => c.classList.toggle("on", Number(c.dataset.id) === target.id));
      } else $("cx-detail").innerHTML = '<div class="cx-empty">Pick a shop to see its live queue.</div>';
    }
  }

  function detailHtml(s) {
    const inQ = S.inQueue && S.myShopId === s.id;
    const sel = svcOf(s, Math.min(S.selectedSvc || 0, s.svcs.length - 1)) || svcOf(s, 0);
    const g = gLabel[s.gender || "unisex"];
    return `<div class="cx-det" data-shop="${s.id}">
      <div class="cx-hero" style="background:${grad(s)}">
        ${art(s, "art")}
        <h2>${esc(s.name)} <span class="cx-tag ${s.open ? "o" : "c"}">${s.open ? "Open" : "Closed"}</span></h2>
        <p>${esc(s.addr)} · ${g} · ★ ${esc(s.rating)} (${esc(s.rev)} reviews)</p>
      </div>
      <div class="cx-st">
        <div class="hl"><small>Your wait</small><strong>~${esc(s.wait)} min</strong></div>
        <div><small>Serving</small><strong>#${esc(s.cur)}</strong></div>
        <div><small>Ahead</small><strong>${esc(s.q)}</strong></div>
        <div class="x"><small>Closes</small><strong>${esc(s.closingTime || "—")}</strong></div>
      </div>
      <div class="cx-pick">
        <div class="cx-psv">${inQ || tab === "later" ? "" : `<div class="cx-sec"><span>Pick a service</span><small>${s.svcs.length} available</small></div>
          <div class="cx-svs">${s.svcs.map((si, i) => { const v = S.services[si]; return `
            <button type="button" class="cx-svc ${i === (S.selectedSvc || 0) ? "on" : ""}" data-svc="${i}">
              <b>${esc(v.ico)} ${esc(v.name)}</b><span>₹${esc(v.price)}</span> <em>· ${esc(v.dur)} min</em></button>`; }).join("")}</div>`}</div>
        <div class="cx-pr">${inQ ? `<div class="cx-tk"><small>You're in the queue</small><strong>#${esc(S.myTok)}</strong><small>${esc(S.mySvc)}</small>
            <div><button class="r" data-act="leave">Leave queue</button><button data-act="rate" data-name="${esc(s.name)}">Rate shop ⭐</button></div></div>`
          : `<div class="cx-rsv">
              <div class="cx-tabs"><button type="button" data-tab="now" class="${tab === "now" ? "on" : ""}">Join now</button><button type="button" data-tab="later" class="${tab === "later" ? "on" : ""}">Book later</button></div>
              ${tab === "later" ? `<div id="cx-bkhost"></div><div id="cx-bkmsg" class="cx-bkmsg"></div>` : `
              <div class="cx-rsv-t"><span>${esc(sel ? sel.name : "")} · ${esc(sel ? sel.dur : "")} min</span><strong>₹${esc(sel ? sel.price : 0)}</strong></div>
              <div class="cx-cta">
                <button type="button" class="cx-go" data-act="join" ${s.open ? "" : "disabled"}>${s.open ? `🎫 Get my token · ₹${esc(sel ? sel.price : 0)}` : "Shop is closed"}</button>
                <button type="button" class="cx-alt" data-act="book" title="Book for later">📅</button>
              </div>`}
            </div>`}</div>
        <div class="cx-prv">
          <div class="cx-sec"><span>What people say</span></div>
          <div id="cx-rev"><div class="cx-rv">Loading reviews…</div></div>
        </div>
      </div>
      <div id="bq-gallery"></div>
      <div style="height:24px"></div>
    </div>`;
  }

  async function loadReviews(s) {
    const box = $("cx-rev");
    if (!box) return;
    try {
      const r = await fetch(BQ_BASE + "/api/shops/reviews?shop_name=" + encodeURIComponent(s.name));
      const j = await r.json();
      const cur = document.querySelector(".cx-det");
      if (!cur || Number(cur.dataset.shop) !== s.id || !$("cx-rev")) return;
      const list = (j && j.success && j.reviews) || [];
      $("cx-rev").innerHTML = list.length
        ? list.slice(0, 4).map(rv => `<div class="cx-rv"><b>${esc(rv.name || "Customer")}</b><i>${"★".repeat(rv.stars || 0)}</i><div>${esc(rv.review || "")}</div></div>`).join("")
        : '<div class="cx-rv">No written reviews yet.</div>';
    } catch (e) { if ($("cx-rev")) $("cx-rev").innerHTML = ""; }
  }

  function showDetail(s) {
    const box = $("cx-detail");
    if (!box) return;
    releaseBooking();
    box.innerHTML = detailHtml(s);
    loadReviews(s);
    if (tab === "later") attachBooking(s);
  }
  let bkObs = null;
  function releaseBooking() {
    const ov = $("m-advbook");
    if (bkObs) { bkObs.disconnect(); bkObs = null; }
    if (ov) {
      ov.classList.remove("cx-inline", "open");
      if (ov.parentNode !== document.body) document.body.appendChild(ov);
    }
  }
  function attachBooking(s) {
    S.selectedShop = s.id;
    const p = window.bkOpen && window.bkOpen();            
    const ov = $("m-advbook"), host = $("cx-bkhost"), msg = $("cx-bkmsg");
    if (!ov || !host) return;
    ov.classList.add("cx-inline");
    host.appendChild(ov);
    if (msg) msg.innerHTML = "";
    if (bkObs) bkObs.disconnect();
    bkObs = new MutationObserver(() => {                  
      if (!ov.classList.contains("open") && $("cx-bkmsg")) {
        $("cx-bkmsg").innerHTML = 'Check <b>My Queue → My Bookings</b> for the status.<br><button type="button" data-act="rebook">Choose another time</button>';
      }
    });
    bkObs.observe(ov, { attributes: true, attributeFilter: ["class"] });
    Promise.resolve(p).catch(() => {});
  }
  document.addEventListener("click", e => {
    const det = e.target.closest(".cx-det");
    if (!det) return;
    const s = S.shops[Number(det.dataset.shop)];
    if (!s) return;
    S.selectedShop = s.id;
    const svc = e.target.closest("[data-svc]");
    if (svc) {
      S.selectedSvc = Number(svc.dataset.svc);
      det.querySelectorAll(".cx-svc").forEach(b => b.classList.toggle("on", b === svc));
      const v = svcOf(s, S.selectedSvc), go = det.querySelector('[data-act="join"]');
      if (v && go && s.open) go.textContent = "🎫 Get my token · ₹" + v.price;
      lastSig = "";
      return;
    }
    const tb = e.target.closest("[data-tab]");
    if (tb) { tab = tb.dataset.tab; lastSig = ""; showDetail(s); return; }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    switch (act.dataset.act) {
      case "join": if (s.open) { buildJoinModalKeep(s); confirmJoin(); } break;
      case "book": window.bkOpen && window.bkOpen(); break;
      case "rebook": showDetail(s); break;
      case "leave": window.leaveQ && window.leaveQ(); break;
      case "rate":
        openModal("m-rate");
        const n = $("rate-shop-name"); if (n) n.textContent = act.dataset.name;
        break;
    }
  });
  function buildJoinModalKeep(s) {      
    S.selectedShop = s.id;
    S.selectedSvc = Math.min(S.selectedSvc || 0, s.svcs.length - 1);
  }
  const baseRender = window.renderShops;
  window.renderShops = function () {
    const out = baseRender.apply(this, arguments);
    try { paint(); } catch (err) { console.error("customer UI:", err); }
    return out;
  };

  const baseOpen = window.openShop;
  window.openShop = function (id) {
    const s = S.shops[id];
    if (!s) return;
    if (desk() && $("cx-detail")) {
      S.selectedShop = id;
      S.selectedSvc = 0;
      tab = "now";
      if (s.open) buildJoinModal();
      lastSig = "";
      paint();
      return;
    }
    const out = baseOpen.apply(this, arguments);       
    const body = $("sh-body");
    if (body) { body.innerHTML = detailHtml(s); loadReviews(s); }
    return out;
  };

  window.addEventListener("resize", () => { lastSig = ""; if (!desk()) { tab = "now"; releaseBooking(); } try { paint(); } catch (e) {} });
  (async function init() {
    try { await componentsReady; } catch (e) { return; }
    try { paint(); } catch (e) { console.error(e); }
  })();
})();

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const css = document.createElement("style");
  css.textContent = `
  .qs{--c:#0c1030;--ln:rgba(120,120,255,.2);--mu:#98a1cc;--gold:#f5b73b;--grn:#34d399;color:#eef1ff;font-family:'DM Sans',sans-serif;max-width:1100px;margin:0 auto;padding-bottom:18px}
  .qs *{box-sizing:border-box}
  .qs button{font-family:inherit}
  .qs-h{margin:0 0 4px;font:800 26px 'Syne',sans-serif}
  .qs-sub{margin:0 0 16px;font-size:13px;color:var(--mu)}
  .qs-banner{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:18px;margin-bottom:14px;border:1px solid rgba(52,211,153,.55);
    background:linear-gradient(100deg,rgba(16,185,129,.28),rgba(16,185,129,.07) 70%)}
  .qs-banner .ck{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:20px;font-weight:800;color:#06281c;background:var(--grn);box-shadow:0 0 18px -2px var(--grn)}
  .qs-banner b{display:block;font:700 17px 'DM Sans',sans-serif;color:var(--grn)}
  .qs-banner small{font-size:12.5px;color:#bfeede}
  .qs-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
  .qs-box{background:var(--c);border:1px solid var(--ln);border-radius:20px;padding:16px;min-width:0}
  .qs-tok{grid-column:1/-1;display:flex;align-items:center;gap:14px;border:1.5px solid var(--gold);background:linear-gradient(135deg,rgba(245,183,59,.16),rgba(245,183,59,.03));box-shadow:0 0 34px -14px var(--gold)}
  .qs-tok .ic{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:24px;border:1.5px solid var(--gold);background:rgba(245,183,59,.1)}
  .qs-tok .l{flex:1;min-width:0}
  .qs-tok .l b{display:block;font:700 18px 'DM Sans',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .qs-tok .l small{display:block;margin-top:3px;font-size:12.5px;color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .qs-tok .r{flex:none;text-align:center;padding-left:14px;border-left:1px solid var(--ln)}
  .qs-tok .r small{display:block;font-size:12px;color:var(--mu)}
  .qs-tok .r strong{display:block;font:700 46px/1.05 'Playfair Display',Georgia,serif;color:var(--gold)}
  .qs-stat{grid-column:span 6;display:flex;flex-direction:column;gap:8px}
  .qs-stat .ic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:20px;background:linear-gradient(135deg,#4a63ff,#2a3bb8)}
  .qs-stat small{font-size:13px;color:var(--mu)}
  .qs-stat .v{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .qs-stat strong{font:800 28px 'Syne',sans-serif}
  .qs-live{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--grn);background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.35);padding:3px 9px;border-radius:999px}
  .qs-live::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--grn);animation:qsp 1.4s infinite}
  @keyframes qsp{50%{opacity:.25}}
  .qs-time{grid-column:1/-1;display:flex;align-items:center;gap:14px}
  .qs-time .ic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:24px;border:1.5px solid var(--gold);background:rgba(245,183,59,.08)}
  .qs-time .m{flex:1;min-width:0}
  .qs-time small{font-size:12.5px;color:var(--mu)}
  .qs-time strong{display:block;font:800 24px 'Syne',sans-serif;color:var(--gold)}
  .qs-bar{height:7px;border-radius:7px;background:#1a2050;overflow:hidden;margin-top:8px}
  .qs-bar i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,#f5b73b,#ff9a3d);transition:width .6s}
  .qs-time .n{font-size:11.5px;color:var(--mu);margin-top:6px}
  .qs-leave{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:10px;min-height:58px;cursor:pointer;border-radius:18px;
    font:700 16px 'DM Sans',sans-serif;color:#ff6b8b;background:rgba(255,80,120,.1);border:1.5px solid rgba(255,80,120,.65)}
  .qs-leave:hover{background:rgba(255,80,120,.18)}
  .qs-sec{margin:26px 0 10px;font:700 18px 'Syne',sans-serif}
  .qs-bk>div:first-child{display:none}              /* hide the old "My Bookings" heading */
  .qs-bk{margin-top:0!important}
  .qs-bk .card{background:var(--c)!important;border:1px solid var(--ln)!important;border-radius:16px!important;padding:14px!important}
  .qs-rate{text-align:center;margin-top:16px}
  /* empty */
  .qs-empty{text-align:center;padding:48px 16px 30px;border-radius:26px;border:1px solid var(--ln);background:radial-gradient(70% 60% at 50% 30%,rgba(245,183,59,.09),transparent 70%),var(--c)}
  .qs-empty .tk{font-size:62px;line-height:1;margin-bottom:14px;filter:drop-shadow(0 0 18px rgba(245,183,59,.5))}
  .qs-empty h3{margin:0 0 6px;font:800 26px 'Syne',sans-serif}
  .qs-empty p{margin:0 0 22px;font-size:14px;color:#c2c9ee}
  .qs-btn{border:0;cursor:pointer;border-radius:999px;padding:15px 34px;font:800 16px 'DM Sans',sans-serif;color:#1a1200;background:linear-gradient(90deg,#f5b73b,#ff9a3d);box-shadow:0 14px 30px -12px #f5b73b}
  @media (min-width:900px){
    .qs-h{font-size:30px}
    .qs-tok{grid-column:span 6}
    .qs-stat{grid-column:span 3}
    .qs-time{grid-column:span 7}
    .qs-leave{grid-column:span 5}
  }
  @media (max-width:380px){.qs-tok{flex-wrap:wrap}.qs-tok .r{border-left:0;padding-left:0;width:100%;display:flex;align-items:center;justify-content:space-between}.qs-tok .r strong{font-size:38px}}

  /* ---------- "You're in the Queue!" popup ---------- */
  #m-ok .modal.qo{width:100%;max-width:400px;max-height:94vh;overflow:auto;text-align:center;padding:26px 22px;border-radius:28px;color:#eef1ff;font-family:'DM Sans',sans-serif;
    background:radial-gradient(120% 70% at 50% 100%,rgba(124,58,237,.3),transparent 60%),linear-gradient(180deg,#0a0e2e,#070a22);border:1px solid rgba(120,120,255,.22)}
  .qo .em{font-size:46px;line-height:1;margin-bottom:8px}
  .qo h3{margin:0 0 6px;font:800 26px 'Syne',sans-serif}
  .qo #ok-sub{font-size:14.5px;color:#b3bcf0}
  .qo #ok-pay-note{display:inline-block;margin:12px 0 16px;padding:7px 14px;border-radius:12px;font-size:13.5px;font-weight:600;background:rgba(20,26,70,.7);border:1px solid rgba(120,130,255,.25)}
  .qo-tok{padding:18px 12px;border-radius:22px;border:1.5px solid var(--gold,#f5b73b);background:linear-gradient(135deg,rgba(245,183,59,.16),rgba(245,183,59,.03));box-shadow:0 0 34px -14px #f5b73b}
  .qo-tok small{display:block;font-size:14px;color:#b3bcf0}
  .qo-tok #ok-tok{display:block;font:700 76px/1.05 'Playfair Display',Georgia,serif;color:#f5b73b}
  .qo-tok #ok-svc{display:block;font-size:16px;color:#e4e8ff}
  .qo p{margin:16px 6px 18px;font-size:13.5px;line-height:1.5;color:#b3bcf0}
  .qo .qs-btn{width:100%;border-radius:18px;padding:16px}`;
  document.head.appendChild(css);

  /* ---------------- My Queue Status ---------------- */
  const baseMyQ = window.renderMyQ;
  window.renderMyQ = function () {
    const out = baseMyQ.apply(this, arguments);        // keeps polling, bookings and rate logic running
    try { rebuild(); } catch (e) { console.error("queue status UI:", e); }
    return out;
  };
  renderMyQ = window.renderMyQ;

  function rebuild() {
    const el = $("my-q");
    if (!el || el.querySelector(".qs")) return;

    // keep the pieces other add-ons put there
    const kids = [...el.children];
    const bookings = kids.find(k => /My Bookings/.test((k.firstElementChild || {}).textContent || "") && k.children.length > 1);
    const rate = kids.find(k => k.querySelector && k.querySelector('button[onclick*="rateLastVisit"]'));
    if (bookings) bookings.remove();
    if (rate) rate.remove();

    let html;
    const s = S.inQueue && S.shops[S.myShopId];
    if (!s) {
      html = `
        <div class="qs-empty">
          <div class="tk">🎫</div>
          <h3>No Active Queue</h3>
          <p>Browse nearby shops and join a queue!</p>
          <button type="button" class="qs-btn" onclick="cTab('home',null)">Find Barbers →</button>
        </div>`;
    } else {
      const info = (typeof cqCalc === "function") ? cqCalc() : null;
      let ahead, serving, head, detail, prog, almost;
      if (info) {
        ahead = info.ahead; serving = info.serving;
        head = info.inService ? "~" + info.svc + " min" : "~" + info.done + " min";
        detail = info.inService ? "Your service is in progress" : "Your turn starts in ~" + info.wait + " min";
        prog = info.inService
          ? Math.max(5, Math.min(100, Math.round(100 - (info.svc / (info.dur || 1)) * 100)))
          : Math.max(5, Math.round(100 - ahead * 15));
        almost = info.inService ? "Your service is in progress" : ahead + " customer" + (ahead !== 1 ? "s" : "") + " ahead of you";
      } else {
        ahead = Math.max(0, Number(S.myTok) - s.cur) || 0; serving = s.cur;
        head = "Checking…"; detail = "Getting your live position"; prog = 5; almost = "";
      }
      const turn = info && (info.inService || ahead <= 2);
      html = `
        ${turn ? `<div class="qs-banner"><span class="ck">✓</span><div><b>${info.inService ? "It's your turn!" : "Almost your turn!"}</b><small>${esc(almost)}</small></div></div>` : ""}
        <div class="qs-grid">
          <div class="qs-box qs-tok">
            <span class="ic">✂️</span>
            <div class="l"><b>${esc(s.name)}</b><small>${esc(S.mySvc)}${s.addr ? " · " + esc(s.addr) : ""}</small></div>
            <div class="r"><small>Your Token</small><strong>#${esc(S.myTok)}</strong><small>${esc(S.mySvc)}</small></div>
          </div>
          <div class="qs-box qs-stat"><span class="ic">👤</span><small>Serving Now</small>
            <div class="v"><strong>#${esc(serving)}</strong><span class="qs-live">Live</span></div></div>
          <div class="qs-box qs-stat"><span class="ic">👥</span><small>Ahead of You</small>
            <div class="v"><strong>${esc(ahead)}</strong><span class="qs-live">Live</span></div></div>
          <div class="qs-box qs-time">
            <span class="ic">🕒</span>
            <div class="m"><small>Time left</small><strong>${esc(head)}</strong>
              <div class="qs-bar"><i style="width:${prog}%"></i></div>
              <div class="n">${esc(detail)}</div></div>
          </div>
          <button type="button" class="qs-leave" onclick="leaveQ();cTab('queue',null)">⎋ Leave Queue</button>
        </div>`;
    }

    el.innerHTML = `<div class="qs">
      <h2 class="qs-h">My Queue Status</h2>
      <p class="qs-sub">Track your current queue and manage your bookings</p>
      ${html}
      <div id="qs-after"></div>
    </div>`;

    const after = $("qs-after");
    if (rate) after.appendChild(rate);
    if (bookings) {
      const h = document.createElement("div");
      h.className = "qs-sec"; h.textContent = "My Bookings";
      bookings.classList.add("qs-bk");
      after.appendChild(h);
      after.appendChild(bookings);
    }
  }

  /* ---------------- "You're in the Queue!" popup ---------------- */
  function buildOk() {
    const m = $("m-ok");
    if (!m || m.dataset.qo) return;
    const box = m.querySelector(".modal") || m.firstElementChild;
    if (!box) return;
    m.dataset.qo = "1";
    box.classList.add("qo");
    box.innerHTML = `
      <div class="em">🎉</div>
      <h3>You're in the Queue!</h3>
      <div id="ok-sub"></div>
      <div id="ok-pay-note"></div>
      <div class="qo-tok"><small>Your Token</small><span id="ok-tok">0</span><span id="ok-svc"></span></div>
      <p>We'll notify you when your turn is near.<br>Feel free to step out!</p>
      <button type="button" class="qs-btn" id="ok-view">View My Queue Status →</button>`;
    $("ok-view").addEventListener("click", () => {
      closeModal("m-ok");
      try { go("s-cust"); } catch (e) {}
      const tabs = document.querySelectorAll("#c-tabs .tab");
      cTab("queue", tabs[1] || null);
    });
  }

  (async function init() {
    try { await componentsReady; } catch (e) { return; }
    buildOk();
    if ($("my-q") && $("my-q").offsetParent !== null) window.renderMyQ();
  })();
})();

const panelState = {
  mode: 'join',      // 'join' | 'book'
  serviceId: null,
  slot: null,        // { date, time } once chosen
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const rupee = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Never show a negative wait; show "—" if the value is missing.
function fmtWait(min) {
  const n = Number(min);
  return Number.isFinite(n) ? `${Math.max(0, Math.round(n))} min` : '—';
}

function selectedService(shop) {
  const found = shop.services.find((s) => s.id === panelState.serviceId);
  const svc = found || shop.services[0] || null;
  panelState.serviceId = svc ? svc.id : null;
  return svc;
}

function renderStats(shop) {
  const items = [
    ['Your wait', fmtWait(shop.waitMin), 'is-accent'],
    ['Serving', shop.serving != null ? `#${shop.serving}` : '—', ''],
    ['Ahead', shop.ahead ?? 0, ''],
    ['Closes', shop.closesAt || 'Open today', ''],
  ];
  return `
    <div class="stat-row">
      ${items.map(([label, value, cls]) => `
        <div class="stat ${cls}">
          <span class="stat-label">${label}</span>
          <span class="stat-value">${esc(value)}</span>
        </div>`).join('')}
    </div>`;
}

function renderServices(shop) {
  return `
    <section class="services">
      <div class="section-head">
        <h3>Pick a service</h3>
        <span class="muted">${shop.services.length} available</span>
      </div>
      <div class="service-grid" role="radiogroup" aria-label="Services">
        ${shop.services.map((s) => `
          <button type="button" role="radio"
                  class="service ${s.id === panelState.serviceId ? 'is-selected' : ''}"
                  aria-checked="${s.id === panelState.serviceId}"
                  data-service="${esc(s.id)}">
            <span class="service-name">${esc(s.icon || '')} ${esc(s.name)}</span>
            <span class="service-meta">${rupee(s.price)} · ${esc(s.duration)} min</span>
          </button>`).join('')}
      </div>
    </section>`;
}

function renderActionCard(shop, svc) {
  const isJoin = panelState.mode === 'join';
  const slot = panelState.slot;

  const toggle = `
    <div class="mode-toggle" role="tablist">
      <button type="button" role="tab" aria-selected="${isJoin}"
              class="${isJoin ? 'is-active' : ''}" data-mode="join">Join now</button>
      <button type="button" role="tab" aria-selected="${!isJoin}"
              class="${!isJoin ? 'is-active' : ''}" data-mode="book">Book later</button>
    </div>`;

  const summary = svc
    ? `<div class="summary">
         <span>${esc(svc.name)} · ${esc(svc.duration)} min</span>
         <strong class="price">${rupee(svc.price)}</strong>
       </div>`
    : `<div class="summary muted">Select a service to continue</div>`;

  const body = isJoin
    ? `<button type="button" class="cta" data-action="join" ${svc ? '' : 'disabled'}>
         Get my token · ${svc ? rupee(svc.price) : ''}
       </button>`
    : `<button type="button" class="btn-secondary" data-action="pick-slot" ${svc ? '' : 'disabled'}>
         ${slot ? `${esc(slot.date)} · ${esc(slot.time)} (change)` : 'Choose date &amp; time'}
       </button>
       <button type="button" class="cta" data-action="confirm-booking"
               ${svc && slot ? '' : 'disabled'}>
         Confirm booking · ${svc ? rupee(svc.price) : ''}
       </button>`;

  return `<aside class="action-card">${toggle}${summary}${body}</aside>`;
}

function renderShopDetail(shop, mount = document.getElementById('shopDetailBody')) {
  const svc = selectedService(shop);
  mount.innerHTML = `
    ${renderStats(shop)}
    <div class="detail-grid">
      ${renderServices(shop)}
      ${renderActionCard(shop, svc)}
    </div>`;
  mount.__shop = shop;
}

// One delegated listener: no re-binding after each render.
function bindShopDetail(mount = document.getElementById('shopDetailBody')) {
  mount.addEventListener('click', (e) => {
    const shop = mount.__shop;
    if (!shop) return;

    const serviceBtn = e.target.closest('[data-service]');
    if (serviceBtn) {
      panelState.serviceId = serviceBtn.dataset.service;
      panelState.slot = null; // a new service may change available slots
      return renderShopDetail(shop, mount);
    }

    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn) {
      panelState.mode = modeBtn.dataset.mode;
      return renderShopDetail(shop, mount);
    }

    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn || actionBtn.disabled) return;
    const svc = selectedService(shop);

    switch (actionBtn.dataset.action) {
      case 'join':
        // hook into your existing join-queue call
        if (typeof joinQueue === 'function') joinQueue(shop.id, svc.id);
        break;
      case 'pick-slot':
        // hook into your existing date/time picker; call it with a callback
        if (typeof openSlotPicker === 'function') {
          openSlotPicker(shop, svc, (slot) => {
            panelState.slot = slot; // { date, time }
            renderShopDetail(shop, mount);
          });
        }
        break;
      case 'confirm-booking':
        if (typeof createBooking === 'function') {
          createBooking(shop.id, svc.id, panelState.slot);
        }
        break;
    }
  });
}

/* =====================================================================
   BARBERQ — FIX PATCH  (paste at the VERY END of script.js)
   Overrides the faulty functions above. Nothing else is changed.
   ===================================================================== */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const digits = p => String(p || '').replace(/\D/g, '').slice(-10);
  // remove < and > so user text can never become HTML
  const cleanText = v => String(v == null ? '' : v).replace(/[<>]/g, '').trim();

  /* ---------- 1. toast: works with toast('msg') and toast('✅','msg') ---------- */
  let toastTimer;
  window.toast = function (ico, msg) {
    if (msg === undefined) { msg = ico; ico = 'ℹ️'; }
    try {
      const prefs = JSON.parse(localStorage.getItem('bqPrefs') || '{}');
      if (prefs.bookingAlerts === false && /New booking request/.test(String(msg))) return;
    } catch (e) {}
    const el = $('toast');
    if (!el) return;
    if ($('t-ico')) $('t-ico').textContent = ico;
    if ($('t-msg')) $('t-msg').textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  };

  /* ---------- 2. stop double joins / double "Leave queue" prompts ----------
     The customer home UI was pasted twice, so every tap ran twice. */
  const baseConfirmJoin = window.confirmJoin;
  window.confirmJoin = function () {
    if (S.inQueue) {
      toast('ℹ️', "You're already in a queue. Leave it before joining another.");
      return;
    }
    return baseConfirmJoin.apply(this, arguments);
  };

  function once(name, ms) {
    const base = window[name];
    if (typeof base !== 'function') return;
    let last = 0;
    window[name] = function () {
      if (Date.now() - last < ms) return;
      try { return base.apply(this, arguments); }
      finally { last = Date.now(); }       // set AFTER, so a confirm() dialog can't let a repeat through
    };
  }
  once('confirmJoin', 600);
  once('leaveQ', 600);
  once('bkOpen', 600);

  const baseFinalize = window.finalizeJoin;   // blocks a double-tap on "Pay & Join"
  let joining = false;
  window.finalizeJoin = async function () {
    if (joining) return;
    joining = true;
    try { return await baseFinalize.apply(this, arguments); }
    finally { joining = false; }
  };

  /* ---------- 3. services: deleting one no longer breaks shops ----------
     Shops store service POSITIONS, so a delete shifted every shop's menu
     and openShop crashed on an undefined service. */
  function dropBadServiceIndexes() {
    const n = S.services.length;
    S.shops.forEach(s => {
      if (Array.isArray(s.svcs)) s.svcs = s.svcs.filter(i => Number.isInteger(i) && i >= 0 && i < n);
    });
  }
  ['openShop', 'buildJoinModal', 'renderShops'].forEach(name => {
    const base = window[name];
    if (typeof base !== 'function') return;
    window[name] = function () { dropBadServiceIndexes(); return base.apply(this, arguments); };
  });

  const baseDelSvc = window.delSvc;
  window.delSvc = function (i) {
    if (!S.services[i]) return;
    S.shops.forEach(s => {                       // keep demo shops pointing at the right services
      if (s.isBarberProfile || !Array.isArray(s.svcs)) return;
      s.svcs = s.svcs.filter(x => x !== i).map(x => (x > i ? x - 1 : x));
    });
    const out = baseDelSvc.apply(this, arguments);
    if (S.barber && S.barber.shopName) syncBarberToCustomerShop();   // customers see the new menu
    return out;
  };

  const baseAddSvc = window.addSvc;
  window.addSvc = function () {
    const out = baseAddSvc.apply(this, arguments);
    if (S.barber && S.barber.shopName) syncBarberToCustomerShop();
    return out;
  };

  /* ---------- 4. security: names can't inject HTML ---------- */
  const baseLoadPublished = window.loadPublishedShop;
  window.loadPublishedShop = function () {
    const ok = baseLoadPublished.apply(this, arguments);
    S.shops.forEach(s => {
      ['name', 'owner', 'addr'].forEach(k => { if (typeof s[k] === 'string') s[k] = cleanText(s[k]); });
    });
    return ok;
  };

  const baseSaveBarber = window.saveBarberProfile;
  window.saveBarberProfile = function () {
    ['bp-name', 'bp-shop', 'bp-address', 'bp-bank'].forEach(id => { const el = $(id); if (el) el.value = cleanText(el.value); });
    return baseSaveBarber.apply(this, arguments);
  };

  const baseRestoreBarber = window.restoreBarberProfile;
  window.restoreBarberProfile = function () {
    const out = baseRestoreBarber.apply(this, arguments);
    ['name', 'shopName', 'address', 'payoutBank', 'email'].forEach(k => {
      if (typeof S.barber[k] === 'string') S.barber[k] = cleanText(S.barber[k]);
    });
    if (S.barber.shopName) syncBarberToCustomerShop();
    return out;
  };

  const baseWalkin = window.addWalkinCustomer;
  window.addWalkinCustomer = function () {
    const el = $('walkin-name');
    if (el) el.value = cleanText(el.value);
    return baseWalkin.apply(this, arguments);
  };

  /* The old queue/shop renderers write raw, unescaped HTML into hidden lists.
     Hidden HTML still runs scripts, so switch those two writes off. The new
     screens (which escape everything) are what the user actually sees. */
  function muteInnerHTML(id) {
    const el = $(id);
    if (!el || el.__muted) return;
    el.__muted = true;
    Object.defineProperty(el, 'innerHTML', { configurable: true, get() { return ''; }, set() {} });
  }
  componentsReady.then(() => { muteInnerHTML('shop-list'); muteInnerHTML('b-qlist'); });

  /* ---------- 5. customer profile: phone keeps its "+91 " format ---------- */
  const baseSaveProfileEdit = window.saveProfileEdit;
  window.saveProfileEdit = function () {
    ['ep-name', 'ep-location'].forEach(id => { const el = $(id); if (el) el.value = cleanText(el.value); });
    const out = baseSaveProfileEdit.apply(this, arguments);
    const d = digits(S.user.phone);
    if (d.length === 10 && S.user.phone !== '+91 ' + d) {
      S.user.phone = '+91 ' + d;
      saveCurrentCustomer();
      if ($('s-prof') && $('s-prof').classList.contains('active')) renderProfile();
    }
    return out;
  };

  /* ---------- 6. barber profile screen: wrong buttons ----------
     Logout called logout() (customer logout), Update Shop Photo said "coming soon",
     Delete Account only showed a message. */
  const baseRenderProfile = window.renderProfile;
  window.renderProfile = function () {
    const out = baseRenderProfile.apply(this, arguments);
    if (S.role === 'barber') {
      document.querySelectorAll('#prof-body button').forEach(b => {
        const t = b.textContent.trim();
        if (t === 'Logout') b.setAttribute('onclick', 'logoutBarber()');
        else if (t === 'Update Shop Photo') b.setAttribute('onclick', 'updateShopPhoto()');
        else if (/^Delete Account/.test(t)) b.setAttribute('onclick', 'deleteBarberAccount()');
      });
    }
    return out;
  };

  /* ---------- 7. OTP: no console leak, expires, limited tries ---------- */
  let otp = '', otpExpires = 0, otpTries = 0;

  window.sendOtp = function () {
    const phone = ($('ph') ? $('ph').value : '').trim();
    if (!/^\d{10}$/.test(phone)) { toast('⚠️', 'Please enter a valid 10-digit phone number'); return; }
    S.user.phone = '+91 ' + phone;
    S.user.name = cleanText($('pname') ? $('pname').value : '') || 'Customer';
    S.user.location = cleanText($('ploc') ? $('ploc').value : '') || 'Not set';

    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    otp = String(1000 + (a[0] % 9000));
    otpExpires = Date.now() + 5 * 60 * 1000;
    otpTries = 0;

    if ($('ph-show')) $('ph-show').textContent = '+91 ' + phone;
    if ($('otp-message')) $('otp-message').innerHTML = 'Use code <strong>' + otp + '</strong> to continue';
    if ($('auth-p1')) $('auth-p1').style.display = 'none';
    if ($('auth-p2')) $('auth-p2').style.display = 'block';
    [0, 1, 2, 3].forEach(i => { const f = $('o' + i); if (f) f.value = ''; });
    if ($('o0')) $('o0').focus();
  };

  window.verifyOtp = async function () {
    const fields = [0, 1, 2, 3].map(i => $('o' + i));
    if (fields.some(f => !f)) { toast('⚠️', 'OTP fields are missing'); return; }
    const entered = fields.map(f => f.value.trim()).join('');
    const reset = () => { fields.forEach(f => { f.value = ''; }); fields[0].focus(); };

    if (!otp || Date.now() > otpExpires) { toast('⚠️', 'That code has expired. Please request a new one.'); reset(); return; }
    if (entered !== otp) {
      otpTries++;
      if (otpTries >= 5) { otp = ''; toast('⚠️', 'Too many wrong attempts. Please request a new code.'); }
      else toast('⚠️', 'Invalid OTP — please try again');
      reset();
      return;
    }
    try { await componentsReady; } catch (e) { toast('⚠️', 'Please wait for the app to load'); return; }
    const phone = ($('ph') ? $('ph').value : '').trim();
    const name = cleanText($('pname') ? $('pname').value : '');
    if (!loadCustomer(phone, name)) { toast('⚠️', 'Could not load customer profile'); return; }
    otp = '';
    go('s-role');
    toast('✅', 'Profile loaded successfully');
  };

  /* ---------- 8. emoji list had an empty slot that rendered as "undefined" ---------- */
  try {
    const clean = serviceEmojis.filter(Boolean);
    serviceEmojis.length = 0;
    clean.forEach(e => serviceEmojis.push(e));
  } catch (e) { /* list not present */ }
})();
(function () {
  'use strict';
  if (document.getElementById('bq-phone-fixes')) return;   // never add it twice

  const css = `
  html, body { max-width: 100%; overflow-x: hidden; }
  #b-settings-tab, #b-staffstats-tab, #b-svc-tab, #support-body { min-width: 0; max-width: 100%; }

  /* 1. Services: search box */
  body .sv-head { flex-wrap: wrap; }
  body .sv-search { flex: 1 1 100%; max-width: none; width: 100%; min-width: 0; margin-left: 0; }
  body .sv-search input { min-width: 0; width: 100%; }

  /* 2. Profile: Edit button */
  body .pf .pf-h3 { gap: 10px; }
  body .pf .pf-btn { flex: none; white-space: nowrap; width: auto; min-width: 0; }

  /* 3. Settings: Advance booking */
  #bk-settings { max-width: 100%; box-sizing: border-box; overflow: hidden; }
  #bk-settings * { box-sizing: border-box; }
  #bk-settings > div[style*="grid-template-columns"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  #bk-settings > div[style*="grid-template-columns"] > div { min-width: 0; }
  #bk-settings .inp, #bk-settings select,
  #bk-settings input[type="time"], #bk-settings input[type="date"] {
    width: 100%; min-width: 0; max-width: 100%; display: block;
  }
  #bk-settings label { display: block; }
  #bk-offdate { flex: 1 1 auto; min-width: 0; width: auto; }
  #bk-addoff { flex: none; white-space: nowrap; }
  #bk-days { gap: 8px 14px !important; }
  #bk-savecfg { white-space: nowrap; }

  /* 4. Help & Support */
  body .sp { width: 100%; min-width: 0; max-width: 100%; overflow-x: hidden; }
  body .sp .sp-cards { grid-template-columns: minmax(0, 1fr); }
  body .sp .sp-card { min-width: 0; max-width: 100%; }
  body .sp .sp-card .tx { min-width: 0; }
  body .sp .sp-card small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  body .sp .sp-card .ch { flex: none; }
  body .sp .sp-top h2 { font-size: clamp(22px, 7vw, 30px); overflow-wrap: anywhere; }
  body .sp .sp-fh { flex-wrap: wrap; }
  body .sp .bq-faq-q .qt { min-width: 0; overflow-wrap: anywhere; }

  /* 5. Staff analytics */
  #sa-root { width: 100%; min-width: 0; max-width: 100%; overflow-x: hidden; box-sizing: border-box; }
  #sa-root *, #sa-root *::before, #sa-root *::after { box-sizing: border-box; }
  #sa-root [class*="head"] { flex-wrap: wrap; gap: 10px; }
  #sa-root :has(> table) { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  @media (max-width: 600px) {
    #sa-root [class*="kpis"] { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    #sa-root [class*="kpi"]:not([class*="kpis"]) {
      flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px; min-width: 0;
    }
    #sa-root [class*="kpi"]:not([class*="kpis"]) > * { min-width: 0; max-width: 100%; }
    #sa-root [class*="kico"] { width: 40px; height: 40px; }
    #sa-root [class*="kico"] svg { width: 20px; height: 20px; }
    #sa-root .sa-ktrend { font-size: 11.5px; overflow-wrap: anywhere; }
    #sa-root select { max-width: 100%; }
  }`;

  const style = document.createElement('style');
  style.id = 'bq-phone-fixes';
  style.textContent = css;
  document.head.appendChild(style);
})();

(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const toMin = t => { const [h, m] = String(t || '').split(':').map(Number); return h * 60 + (m || 0); };

  function insideHours() {
    const b = S.barber || {};
    if (!b.openingTime || !b.closingTime) return null;            // hours not set yet
    const n = new Date(), now = n.getHours() * 60 + n.getMinutes();
    const o = toMin(b.openingTime), c = toMin(b.closingTime);
    return o < c ? (now >= o && now < c) : (now >= o || now < c); // also handles past-midnight hours
  }

  function paintBadge() {
    const el = $('shop-status');
    if (!el) return;
    el.textContent = S.shopOpen ? '● Open' : '● Closed';
    el.className = 'tag ' + (S.shopOpen ? 'tgreen pulse' : 'tred');
  }

  // set the state without a toast; saves it and tells customers
  function setOpen(open) {
    S.shopOpen = open;
    try { localStorage.setItem('barberShopOpen', open ? '1' : '0'); } catch (e) {}
    if (typeof syncShopStats === 'function') syncShopStats();
    paintBadge();
  }

  let lastInside = null;
  function tick() {
    paintBadge();                                                  // always keep the badge honest
    if (S.role !== 'barber') return;
    if (localStorage.getItem('bqAutoHours') === '0') return;       // "0" turns auto open/close off
    const inside = insideHours();
    if (inside === null) return;
    if (lastInside === null || inside !== lastInside) {            // first check after load, or clock crossed a time
      lastInside = inside;
      if (S.shopOpen !== inside) setOpen(inside);
    }
  }

  // repaint whenever a screen changes and whenever the barber presses the toggle
  const baseGo = window.go;
  window.go = function () { const out = baseGo.apply(this, arguments); tick(); return out; };

  const baseToggle = window.toggleShop;
  window.toggleShop = function () { const out = baseToggle.apply(this, arguments); paintBadge(); return out; };

  // if the barber changes opening/closing time, apply the new hours straight away
  const baseSave = window.saveBarberProfile;
  window.saveBarberProfile = function () {
    const out = baseSave.apply(this, arguments);
    lastInside = null; tick();
    return out;
  };

  componentsReady.then(() => { tick(); });
  setInterval(tick, 5000);
})();

/* =====================================================================
   FIX: stop the screen flipping + restyle the "Book a time slot" panel
   Paste at the VERY END of script.js
   ===================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 1. one layout only ---------- */
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');

  function guardDetailPanel() {
    const box = $('cx-detail');
    if (!box) return false;
    if (box.__guarded) return true;
    box.__guarded = true;
    Object.defineProperty(box, 'innerHTML', {
      configurable: true,
      get() { return desc.get.call(this); },
      set(html) {
        const s = String(html);
        if (s.indexOf('cx-pane') !== -1 && s.indexOf('cx-pick') === -1) return;
        desc.set.call(this, html);
      }
    });
    const now = desc.get.call(box);
    if (now.indexOf('cx-pane') !== -1 && now.indexOf('cx-pick') === -1) {   
      desc.set.call(box, '');
      if (typeof renderShops === 'function') renderShops();
    }
    return true;
  }
  componentsReady.then(() => {
    if (guardDetailPanel()) return;
    const t = setInterval(() => { if (guardDetailPanel()) clearInterval(t); }, 300);
  });

  const baseLeave = window.leaveQ;
  if (typeof baseLeave === 'function' && !baseLeave.__once) {
    let last = 0;
    window.leaveQ = function () {
      if (Date.now() - last < 800) return;
      try { return baseLeave.apply(this, arguments); } finally { last = Date.now(); }
    };
    window.leaveQ.__once = true;
  }
  const css = `
  /* "~28 min" showed as "-28 min" in the heading font */
  .cx-st strong, .cx-rsv-t strong { font-family: 'DM Sans', sans-serif !important; letter-spacing: -.3px; }

  #m-advbook:not(.cx-inline) .modal {
    position: relative; width: 100%; max-width: 440px; max-height: 92vh; overflow: auto; box-sizing: border-box;
    padding: 20px; border-radius: 26px; color: #eef1ff; font-family: 'DM Sans', sans-serif;
    background: radial-gradient(120% 70% at 100% 0%, rgba(124,58,237,.3), transparent 55%), linear-gradient(180deg, #0a0e2e, #070a22);
    border: 1px solid rgba(120,120,255,.25); box-shadow: 0 30px 80px -20px rgba(0,0,0,.8);
  }
  #m-advbook .modal * { box-sizing: border-box; }

  .bkx-head { display: flex; align-items: center; gap: 14px; margin-bottom: 4px; padding-right: 34px; }
  .bkx-ico { width: 52px; height: 52px; border-radius: 50%; flex: none; display: grid; place-items: center; font-size: 22px;
    border: 1.5px solid #f5b73b; background: rgba(245,183,59,.1); box-shadow: 0 0 22px -6px #f5b73b; }
  .bkx-t { font: 800 24px 'DM Sans', sans-serif; }
  .bkx-t em { font-style: normal; color: #f5b73b; }
  #bk-shop { margin: 2px 0 0 !important; font-size: 14px !important; color: #8fa0ff !important; }
  .bkx-x { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border-radius: 50%; cursor: pointer;
    color: #f5b73b; font-size: 20px; line-height: 1; background: rgba(245,183,59,.08); border: 1.5px solid #f5b73b; }
  .cx-inline .bkx-x { display: none; }

  .bkx-lab { display: flex; align-items: center; gap: 10px; margin: 20px 0 10px; font: 700 17px 'DM Sans', sans-serif; }
  .bkx-n { width: 28px; height: 28px; flex: none; border-radius: 50%; display: grid; place-items: center;
    font: 700 14px 'DM Sans', sans-serif; color: #f5b73b; border: 1.5px solid #f5b73b; }

  /* services */
  #m-advbook #bk-svcs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  #m-advbook #bk-svcs button, #m-advbook #bk-dates button {
    position: relative; padding: 12px 6px; border-radius: 16px; color: #eef1ff;
    background: rgba(20,26,70,.55) !important; border: 1.5px solid rgba(120,130,255,.28) !important;
  }
  #m-advbook #bk-svcs button > div:first-child {
    width: 46px; height: 46px; margin: 0 auto 8px; border-radius: 50%; display: grid; place-items: center;
    font-size: 22px !important; background: rgba(70,90,200,.3); border: 1px solid rgba(120,130,255,.4);
  }
  #m-advbook #bk-svcs button > div:nth-child(2) { font-size: 15px !important; font-weight: 700 !important; margin: 0 !important; }
  #m-advbook #bk-svcs button > div:nth-child(3) { font-size: 12px !important; color: #aab4e0 !important; margin-top: 2px; }

  /* dates */
  #m-advbook #bk-dates { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
  #m-advbook #bk-dates button { flex: 1 0 64px; min-width: 64px !important; }
  #m-advbook #bk-dates button > div:nth-child(2) { font-size: 22px !important; font-weight: 800; }
  #m-advbook #bk-dates button > div:first-child, #m-advbook #bk-dates button > div:last-child { color: #aab4e0 !important; }

  /* selected service / date (the script marks it with a gold border) */
  #m-advbook #bk-svcs button[style*="solid var(--gold)"],
  #m-advbook #bk-dates button[style*="solid var(--gold)"] {
    background: linear-gradient(180deg, rgba(245,183,59,.2), rgba(245,183,59,.06)) !important;
    border-color: #f5b73b !important; box-shadow: 0 0 24px -10px #f5b73b;
  }
  #m-advbook #bk-svcs button[style*="solid var(--gold)"]::after,
  #m-advbook #bk-dates button[style*="solid var(--gold)"]::after {
    content: "✓"; position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%;
    display: grid; place-items: center; font: 800 12px 'DM Sans', sans-serif; background: #f5b73b; color: #1a1200;
  }
  #m-advbook #bk-dates button[style*="solid var(--gold)"] > div:nth-child(2) { color: #f5b73b; }

  /* time slots */
  #m-advbook #bk-slots { gap: 10px !important; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  #m-advbook #bk-slots button {
    min-height: 44px; border-radius: 12px; color: #eef1ff;
    background: rgba(20,26,70,.55) !important; border: 1px solid rgba(120,130,255,.3) !important;
  }
  #m-advbook #bk-slots button[style*="solid var(--gold)"] {
    background: rgba(245,183,59,.16) !important; border: 1.5px solid #f5b73b !important; color: #f5b73b;
  }
  #m-advbook #bk-slots > span {
    display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 14px;
    border: 1px solid rgba(120,130,255,.25); background: rgba(20,26,70,.5); color: #8fa0ff !important; font-size: 15px !important;
  }
  #m-advbook #bk-slots > span::before { content: "🕒"; font-size: 22px; }

  /* note + buttons */
  #m-advbook #bk-note {
    display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px;
    background: rgba(40,60,160,.25); border: 1px solid rgba(120,130,255,.3); color: #b8c4ff !important; font-size: 12.5px !important;
  }
  #m-advbook #bk-note::before { content: "i"; flex: none; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center;
    background: #5b6cff; color: #fff; font: 700 12px 'DM Sans', sans-serif; }
  .bkx-btns { display: grid !important; grid-template-columns: 1fr 1.3fr; gap: 12px !important; }
  #bk-cancel, #bk-submit { min-height: 54px; border-radius: 16px; display: flex; align-items: center; justify-content: center; gap: 10px;
    font: 700 16px 'DM Sans', sans-serif; }
  #bk-cancel { color: #eef1ff; background: rgba(20,26,70,.6); border: 1px solid rgba(120,130,255,.35); }
  #bk-cancel::before { content: "←"; font-size: 20px; color: #8fa0ff; }
  #bk-submit { color: #1a1200; border: 0; background: linear-gradient(90deg, #f5b73b, #ff9a3d); box-shadow: 0 12px 28px -12px #f5b73b; }
  #bk-submit::before { content: "📅"; }
  #bk-submit:disabled { opacity: .7; }
  @media (max-width: 420px) { #m-advbook:not(.cx-inline) .modal { padding: 16px; border-radius: 22px; } .bkx-t { font-size: 21px; } }`;

  if (!$('bq-booking-ui')) {
    const st = document.createElement('style');
    st.id = 'bq-booking-ui';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 3. booking panel: structure (done once, after it is created) ---------- */
  function decorate() {
    const ov = $('m-advbook');
    const modal = ov && ov.querySelector('.modal');
    if (!modal || modal.dataset.bkx) return;
    modal.dataset.bkx = '1';

    const head = modal.firstElementChild, shop = $('bk-shop');
    if (head && shop) {
      head.className = 'bkx-head';
      head.removeAttribute('style');
      head.innerHTML = '<span class="bkx-ico">📅</span><div><div class="bkx-t">Book a <em>time slot</em></div></div>';
      head.lastElementChild.appendChild(shop);
    }

    modal.querySelectorAll(':scope > div').forEach(d => {            // "1. Choose a service" -> numbered step
      if (d.children.length || d.classList.contains('bkx-head')) return;
      const m = /^\s*(\d)\.\s+(.+)$/.exec(d.textContent);
      if (!m) return;
      d.className = 'bkx-lab';
      d.removeAttribute('style');
      d.innerHTML = '<span class="bkx-n">' + m[1] + '</span><span>' + esc(m[2]) + '</span>';
    });

    const submit = $('bk-submit');
    if (submit && submit.parentElement) submit.parentElement.classList.add('bkx-btns');

    const x = document.createElement('button');
    x.type = 'button'; x.className = 'bkx-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    x.addEventListener('click', () => closeModal('m-advbook'));
    modal.appendChild(x);
  }

  const baseBkOpen = window.bkOpen;
  if (typeof baseBkOpen === 'function') {
    window.bkOpen = function () {
      const out = baseBkOpen.apply(this, arguments);   // creates the panel synchronously
      decorate();
      return out;
    };
  }
  new MutationObserver(decorate).observe(document.body, { childList: true });
  decorate();
})();

(function () {
  'use strict';
  if (document.getElementById('bq-booking-desktop')) return;

  const css = `
  @media (min-width: 980px) {

    /* when the booking form is open: one full-width column, no empty left box */
    .cx-pick:has(#cx-bkhost) {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: "pr" "rv";
    }
    .cx-pick:has(#cx-bkhost) .cx-psv { display: none; }
    .cx-pick:has(#cx-bkhost) .cx-pr  { margin-top: 16px; }
    .cx-pick:has(#cx-bkhost) .cx-rsv { padding: 18px 22px; }
    .cx-pick:has(#cx-bkhost) .cx-tabs { max-width: 360px; }

    /* the form itself: two columns */
    #m-advbook.cx-inline .modal {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
      column-gap: 36px;
      align-items: start;
    }

    /* left: 1 service + 2 date */
    #m-advbook.cx-inline .modal > :nth-child(2) { grid-column: 1; grid-row: 1; margin-top: 4px; }   /* "1 Choose a service" */
    #m-advbook.cx-inline #bk-svcs   { grid-column: 1; grid-row: 2; }
    #m-advbook.cx-inline .modal > :nth-child(4) { grid-column: 1; grid-row: 3; }                   /* "2 Choose a date" */
    #m-advbook.cx-inline #bk-dates  { grid-column: 1; grid-row: 4; flex-wrap: wrap; overflow: visible; }

    /* right: 3 time */
    #m-advbook.cx-inline .modal > :nth-child(6) { grid-column: 2; grid-row: 1; margin-top: 4px; }   /* "3 Choose a time" */
    #m-advbook.cx-inline #bk-slots  { grid-column: 2; grid-row: 2 / span 3; align-content: start; }
    #m-advbook.cx-inline #bk-who    { grid-column: 2; grid-row: 5; }
    #m-advbook.cx-inline #bk-note   { grid-column: 1 / -1; grid-row: 6; margin: 18px 0 14px; }
    #m-advbook.cx-inline .bkx-btns  { grid-column: 1 / -1; grid-row: 7; max-width: 520px; margin-left: auto; width: 100%; }

    /* the step labels were hidden in some layouts; make sure they show here */
    #m-advbook.cx-inline .bkx-lab   { display: flex; }

    /* tidy: services 3 across, taller time list stays inside the card */
    #m-advbook.cx-inline #bk-svcs   { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    #m-advbook.cx-inline #bk-slots  { max-height: 360px; overflow-y: auto; padding-right: 4px; }
    #m-advbook.cx-inline #bk-dates button { flex: 0 0 74px; }
  }`;

  const st = document.createElement('style');
  st.id = 'bq-booking-desktop';
  st.textContent = css;
  document.head.appendChild(st);
})();
/* put the patch styles last, once (no observers) */
(function () {
  function order() {
    ['bq-phone-fixes', 'bq-booking-ui', 'bq-booking-desktop'].forEach(id => {
      const el = document.getElementById(id);
      if (el) document.head.appendChild(el);
    });
  }
  window.addEventListener('load', () => { order(); setTimeout(order, 2000); });
})();

(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const monthOf = s => { const [y, m] = s.split('-').map(Number); return new Date(y, m - 1, 1); };
  const fmt12 = t => { const [h, m] = String(t || '').split(':').map(Number);
    return isNaN(h) ? '' : (h % 12 || 12) + ':' + pad(m || 0) + ' ' + (h < 12 ? 'AM' : 'PM'); };
  const fmtDate = s => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const digits10 = p => String(p || '').replace(/\D/g, '').slice(-10);
  const innerDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');

  /* ---------- styles ---------- */
  if (!$('bq-cal-css')) {
    const st = document.createElement('style');
    st.id = 'bq-cal-css';
    st.textContent = `
    #m-advbook #bk-dates.bkc { display: block !important; overflow: visible !important; max-width: 380px; }
    .bkc-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font: 700 16px 'DM Sans', sans-serif; }
    .bkc-nav { width: 34px; height: 34px; border-radius: 50%; cursor: pointer; color: #eef1ff; font-size: 18px; line-height: 1;
      background: rgba(20,26,70,.6); border: 1px solid rgba(120,130,255,.35); }
    .bkc-nav:disabled { opacity: .3; cursor: default; }
    .bkc-g { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
    .bkc-w { text-align: center; font-size: 11px; color: #98a1cc; padding: 2px 0; }
    #m-advbook #bk-dates button.bkc-day { flex: none !important; min-width: 0 !important; padding: 0 !important; height: 40px; border-radius: 12px;
      font: 700 15px 'DM Sans', sans-serif; color: #eef1ff; cursor: pointer;
      background: rgba(20,26,70,.55) !important; border: 1px solid rgba(120,130,255,.3) !important; }
    #m-advbook #bk-dates button.bkc-day:disabled { opacity: .28; cursor: not-allowed; }
    #m-advbook #bk-dates button.bkc-day.today { box-shadow: inset 0 -3px 0 #f5b73b; }
    #m-advbook #bk-dates button.bkc-day.on { color: #1a1200; background: linear-gradient(90deg,#f5b73b,#ff9a3d) !important; border-color: #f5b73b !important; }
    .bkc-note { margin-top: 8px; font-size: 11.5px; color: #98a1cc; }

    #bq-mybk { margin: 14px 0 6px; padding: 14px; border-radius: 18px; background: #0c1030; border: 1px solid rgba(120,120,255,.2); color: #eef1ff; font-family: 'DM Sans', sans-serif; }
    #bq-mybk h4 { margin: 0 0 10px; font: 700 15px 'Syne', sans-serif; }
    .mb-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid rgba(120,120,255,.16); }
    .mb-row:first-of-type { border-top: 0; }
    .mb-main { flex: 1; min-width: 0; }
    .mb-main b { display: block; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mb-main small { font-size: 12px; color: #98a1cc; }
    .mb-st { flex: none; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: capitalize; background: #2a2f66; }
    .mb-st.confirmed, .mb-st.completed { background: #0f7a5a; }
    .mb-st.pending { background: #8a5a0a; }
    .mb-st.cancelled, .mb-st.rejected { background: #8f2340; }
    .mb-x { flex: none; cursor: pointer; border-radius: 8px; padding: 5px 10px; font: 600 12px 'DM Sans', sans-serif; color: #ff6b8b;
      background: none; border: 1px solid rgba(255,107,139,.5); }`;
    document.head.appendChild(st);
  }

  function renderCal(el) {
    const data = el.__data || [];
    const map = {}; data.forEach(d => { map[d.date] = d; });
    const keys = Object.keys(map).sort();
    if (!keys.length) return;
    const sel = data.find(d => d.on);
    if (!el.__nav || !el.__month) {
      const first = sel || data.find(d => !d.disabled) || data[0];
      el.__month = monthOf(first.date);
    }
    const m = el.__month, y = m.getFullYear(), mo = m.getMonth();
    const minM = monthOf(keys[0]), maxM = monthOf(keys[keys.length - 1]);
    const todayIso = isoOf(new Date());
    const lead = (new Date(y, mo, 1).getDay() + 6) % 7;            // Monday first
    const days = new Date(y, mo + 1, 0).getDate();

    let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => '<div class="bkc-w">' + w + '</div>').join('');
    for (let i = 0; i < lead; i++) cells += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const key = y + '-' + pad(mo + 1) + '-' + pad(d), info = map[key];
      const ok = info && !info.disabled;
      cells += '<button type="button" class="bkc-day' + (info && info.on ? ' on' : '') + (key === todayIso ? ' today' : '') + '"' +
        (ok ? ' data-date="' + key + '"' : ' disabled') + '>' + d + '</button>';
    }
    const html =
      '<div class="bkc-h"><button type="button" class="bkc-nav" data-bkc="prev" aria-label="Previous month"' + (m <= minM ? ' disabled' : '') + '>‹</button>' +
      '<span>' + m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</span>' +
      '<button type="button" class="bkc-nav" data-bkc="next" aria-label="Next month"' + (m >= maxM ? ' disabled' : '') + '>›</button></div>' +
      '<div class="bkc-g">' + cells + '</div>' +
      '<div class="bkc-note">Greyed days are days off or beyond the barber\'s booking window.</div>';
    innerDesc.set.call(el, html);
  }

  function hookDates() {
    const el = $('bk-dates');
    if (!el || el.__bkc) return;
    el.__bkc = true;
    el.classList.add('bkc');
    Object.defineProperty(el, 'innerHTML', {
      configurable: true,
      get() { return innerDesc.get.call(this); },
      set(html) {
        const tmp = document.createElement('div');
        innerDesc.set.call(tmp, String(html));
        const btns = tmp.querySelectorAll('[data-date]');
        if (!btns.length) { this.__data = null; innerDesc.set.call(this, html); return; }   // "Loading…"
        this.__data = Array.prototype.map.call(btns, b => ({
          date: b.dataset.date,
          disabled: b.hasAttribute('disabled'),
          on: (b.getAttribute('style') || '').indexOf('var(--gold)') !== -1
        }));
        renderCal(this);
      }
    });
    el.addEventListener('click', e => {
      const n = e.target.closest('[data-bkc]');
      if (!n || n.disabled) return;
      e.stopPropagation();
      const m = el.__month;
      el.__month = new Date(m.getFullYear(), m.getMonth() + (n.dataset.bkc === 'next' ? 1 : -1), 1);
      el.__nav = true;
      renderCal(el);
    });
    if (innerDesc.get.call(el).indexOf('data-date') !== -1) el.innerHTML = innerDesc.get.call(el);
  }

  const baseBkOpen = window.bkOpen;
  if (typeof baseBkOpen === 'function') {
    window.bkOpen = function () {
      const out = baseBkOpen.apply(this, arguments);
      hookDates();
      const el = $('bk-dates'); if (el) el.__nav = false;
      return out;
    };
  }
  hookDates();

  let myBookings = [];
  const bkPhone = () => digits10(S.user && S.user.phone) || digits10(localStorage.getItem('bqBookPhone'));

  function paintBookings() {
    const left = document.querySelector('#cx-home .cx-left');
    if (!left) return;
    let box = $('bq-mybk');
    if (!myBookings.length) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.id = 'bq-mybk';
      const anchor = left.querySelector('.cx-h.fastH') || left.querySelector('.cx-h');
      left.insertBefore(box, anchor);
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-cancel]');
        if (b && typeof window.bkCancel === 'function') window.bkCancel(Number(b.dataset.cancel));
      });
    }
    const now = isoOf(new Date()) + ' ' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes());
    const rows = myBookings.slice().sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)).slice(0, 6);
    const html = '<h4><span class="tab-ico">📅</span>My Bookings</h4>' + rows.map(b => {
      const live = (b.status === 'pending' || b.status === 'confirmed') && (b.date + ' ' + b.start) > now;
      return '<div class="mb-row"><div class="mb-main"><b>' + esc(b.service_name) + ' · ' + esc(b.shop_name) + '</b><small>' +
        esc(fmtDate(b.date)) + ' · ' + esc(fmt12(b.start)) + '</small></div>' +
        '<span class="mb-st ' + esc(b.status) + '">' + esc(b.status === 'pending' ? 'Waiting for barber' : b.status) + '</span>' +
        (live ? '<button type="button" class="mb-x" data-cancel="' + esc(b.id) + '">Cancel</button>' : '') + '</div>';
    }).join('');
    if (box.__html !== html) { box.__html = html; box.innerHTML = html; }
  }

  async function refreshBookings() {
    if (S.role !== 'customer') return;
    const p = bkPhone();
    if (p.length !== 10) return;
    try {
      const r = await fetch(BQ_BASE + '/api/bookings?phone=' + p);
      const j = await r.json();
      if (r.ok && j.success && Array.isArray(j.bookings)) { myBookings = j.bookings; paintBookings(); }
    } catch (e) { /* offline: keep what is shown */ }
  }

  const baseToast = window.toast;
  window.toast = function (a, b) {
    const out = baseToast.apply(this, arguments);
    if (/booking/i.test(String(b || a))) setTimeout(refreshBookings, 600);
    return out;
  };

  /* =====================================================================
     3. REVIEWS: show star-only ratings instead of "No written reviews yet"
     ===================================================================== */
  async function fillReviews() {
    const box = $('cx-rev'), det = document.querySelector('.cx-det');
    if (!box || !det || box.dataset.bqRev) return;
    box.dataset.bqRev = '1';
    const id = Number(det.dataset.shop);
    const shop = S.shops.find(s => s.id === id) || S.shops[id];
    if (!shop) return;
    let list = [];
    try {
      const r = await fetch(BQ_BASE + '/api/shops/reviews?shop_name=' + encodeURIComponent(shop.name));
      const j = await r.json();
      if (r.ok && j.success && Array.isArray(j.reviews)) list = j.reviews;
    } catch (e) { return; }
    await new Promise(res => setTimeout(res, 900));              // let the old loader finish first, then overwrite
    const now = $('cx-rev');
    if (!now || now !== box) return;
    const total = Number(shop.rev) || 0;
    let html = list.slice(0, 5).map(rv =>
      '<div class="cx-rv"><b>' + esc(rv.name || 'Customer') + '</b><i>' + '★'.repeat(Math.max(0, Math.min(5, rv.stars || 0))) + '</i>' +
      '<div>' + (String(rv.review || '').trim() ? esc(rv.review) : '<span style="opacity:.6">Rated without a comment</span>') + '</div></div>').join('');
    if (!list.length && total > 0) {
      html = '<div class="cx-rv"><b>★ ' + esc(shop.rating) + '</b> from ' + total + ' rating' + (total === 1 ? '' : 's') +
        '<div style="opacity:.7;margin-top:4px">Customers have not written comments yet.</div></div>';
    } else if (total > list.length && list.length) {
      html += '<div class="cx-rv" style="opacity:.75">+' + (total - list.length) + ' more rating' + (total - list.length === 1 ? '' : 's') + ' without comments</div>';
    } else if (!list.length) {
      html = '<div class="cx-rv">No ratings yet.</div>';
    }
    box.innerHTML = html;
  }

  const baseOpenShop = window.openShop;
  if (typeof baseOpenShop === 'function') {
    window.openShop = function () {
      const out = baseOpenShop.apply(this, arguments);
      setTimeout(fillReviews, 50);
      return out;
    };
  }

  /* one light timer for all three */
  let tick = 0;
  setInterval(() => {
    if (document.hidden) return;
    fillReviews();
    paintBookings();
    if (++tick % 12 === 0) refreshBookings();                    // about every 18 s
  }, 1500);
  componentsReady.then(() => setTimeout(refreshBookings, 1500));
})();

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const digits10 = p => String(p || "").replace(/\D/g, "").slice(-10);
  const phone = () => digits10(S.user && S.user.phone) || digits10(localStorage.getItem("bqBookPhone"));
  const fmtDate = s => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const fmt12 = t => { const [h, m] = String(t).split(":").map(Number); return (h % 12 || 12) + ":" + pad(m) + " " + (h < 12 ? "AM" : "PM"); };
  const STAT = {
    pending:   ["Waiting for barber", "#f5b73b"],
    confirmed: ["Confirmed ✓", "#34d399"],
    rejected:  ["Declined", "#ff6b8b"],
    cancelled: ["Cancelled", "#98a1cc"],
    completed: ["Completed", "#6aa8ff"],
    expired:   ["Expired", "#98a1cc"]
  };
  let list = [], loaded = false;

  const css = document.createElement("style");
  css.textContent = `
  #cust-bookings{display:none}
  .mb{max-width:900px;margin:0 auto;color:#eef1ff;font-family:'DM Sans',sans-serif;padding-bottom:24px}
  .mb h2{margin:0 0 4px;font:800 26px 'Syne',sans-serif}
  .mb .sub{margin:0 0 16px;font-size:13px;color:#98a1cc}
  .mb-sec{margin:22px 0 10px;font:700 15px 'Syne',sans-serif;color:#c9d2ff}
  .mb-card{display:flex;align-items:center;gap:14px;padding:14px;margin-bottom:10px;border-radius:18px;background:#0c1030;border:1px solid rgba(120,120,255,.2)}
  .mb-card .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;flex:none;font-size:22px;background:rgba(124,92,255,.22)}
  .mb-card .tx{flex:1;min-width:0}
  .mb-card b{display:block;font:700 15px 'DM Sans',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mb-card small{display:block;margin-top:3px;font-size:12.5px;color:#98a1cc}
  .mb-r{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
  .mb-tag{font-size:12px;font-weight:700;padding:4px 10px;border-radius:8px;white-space:nowrap;border:1px solid var(--k);color:var(--k);background:color-mix(in srgb,var(--k) 14%,transparent)}
  .mb-x{cursor:pointer;font:700 12.5px 'DM Sans',sans-serif;color:#ff6b8b;background:none;border:1px solid rgba(255,107,139,.7);border-radius:10px;padding:6px 12px}
  .mb-empty{text-align:center;padding:44px 16px;border-radius:24px;background:#0c1030;border:1px solid rgba(120,120,255,.2)}
  .mb-empty .e{font-size:48px;margin-bottom:8px}
  .mb-empty h3{margin:0 0 6px;font:800 21px 'Syne',sans-serif}
  .mb-empty p{margin:0 0 16px;font-size:14px;color:#c2c9ee}
  .mb-btn{border:0;cursor:pointer;border-radius:999px;padding:13px 28px;font:800 15px 'DM Sans',sans-serif;color:#1a1200;background:linear-gradient(90deg,#f5b73b,#ff9a3d)}
  .mb-ph{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
  .mb-ph input{padding:12px 14px;border-radius:12px;border:1px solid rgba(120,120,255,.3);background:#080b26;color:#eef1ff;font:15px 'DM Sans',sans-serif;width:200px}
  @media (max-width:520px){.mb-card{flex-wrap:wrap}.mb-r{flex-direction:row;width:100%;justify-content:space-between;align-items:center}}`;
  document.head.appendChild(css);

  /* ---------- data ---------- */
  async function load() {
    const ph = phone();
    if (ph.length !== 10) { list = []; loaded = true; paint(); return; }
    try {
      const r = await fetch(BQ_BASE + "/api/bookings?phone=" + ph);
      const j = await r.json();
      if (r.ok && j.bookings) list = j.bookings;
    } catch (e) { /* keep what we have */ }
    loaded = true;
    paint();
  }

  async function cancel(id) {
    if (!confirm("Cancel this booking?")) return;
    try {
      const r = await fetch(BQ_BASE + "/api/bookings/" + id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", by: "customer", phone: phone() })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) throw new Error(j.error || "Could not cancel");
      toast("✅", "Booking cancelled");
    } catch (e) { toast("⚠️", e.message || "Could not cancel"); }
    load();
  }

  /* ---------- view ---------- */
  function card(b) {
    const st = STAT[b.status] || [esc(b.status), "#98a1cc"];
    const now = new Date();
    const when = b.date + " " + b.start;
    const nowKey = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    const canCancel = (b.status === "pending" || b.status === "confirmed") && when > nowKey;
    return `<div class="mb-card">
      <div class="ic">📅</div>
      <div class="tx"><b>${esc(b.service_name)} · ${esc(b.shop_name)}</b><small>${esc(fmtDate(b.date))} · ${esc(fmt12(b.start))}</small></div>
      <div class="mb-r"><span class="mb-tag" style="--k:${st[1]}">${st[0]}</span>
        ${canCancel ? `<button type="button" class="mb-x" data-cancel="${b.id}">Cancel booking</button>` : ""}</div>
    </div>`;
  }

  function paint() {
    const box = $("cust-bookings");
    if (!box) return;
    let body;
    if (phone().length !== 10) {
      body = `<div class="mb-empty"><div class="e">📱</div><h3>Enter your phone number</h3>
        <p>Use the number you booked with to see your bookings.</p>
        <div class="mb-ph"><input id="mb-phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"><button type="button" class="mb-btn" id="mb-save">Show bookings</button></div></div>`;
    } else if (!loaded) {
      body = `<div class="mb-empty"><p>Loading your bookings…</p></div>`;
    } else if (!list.length) {
      body = `<div class="mb-empty"><div class="e">📅</div><h3>No bookings yet</h3>
        <p>Pick a shop and use <b>Book later</b> to reserve a time slot.</p>
        <button type="button" class="mb-btn" onclick="cTab('home',document.querySelector('#c-tabs .tab'))">Find Barbers →</button></div>`;
    } else {
      const today = new Date(); const tk = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
      const up = list.filter(b => b.date >= tk && b.status !== "cancelled" && b.status !== "rejected" && b.status !== "completed")
                     .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
      const past = list.filter(b => !up.includes(b)).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
      body = (up.length ? `<div class="mb-sec">Upcoming</div>${up.map(card).join("")}` : "") +
             (past.length ? `<div class="mb-sec">Past &amp; cancelled</div>${past.slice(0, 15).map(card).join("")}` : "");
    }
    box.innerHTML = `<div class="mb"><h2>My Bookings</h2><p class="sub">Your advance bookings and their status</p>${body}</div>`;
  }

  /* ---------- tab ---------- */
  function visible() { const b = $("cust-bookings"); return b && b.style.display === "block"; }

  window.bqShowBookings = function () {
    try { go("s-cust"); } catch (e) {}
    const tabs = document.querySelectorAll("#c-tabs .tab");
    cTab("bookings", $("mb-tab") || tabs[tabs.length - 1] || null);
  };

  const baseTab = window.cTab;
  window.cTab = function (name, el) {
    const out = baseTab.apply(this, arguments);
    const box = $("cust-bookings");
    if (box) {
      box.style.display = name === "bookings" ? "block" : "none";
      if (name === "bookings") { paint(); load(); }
    }
    return out;
  };
  cTab = window.cTab;

  async function init() {
    try { await componentsReady; } catch (e) { return; }
    const q = $("cust-queue");
    const tabs = document.querySelectorAll("#c-tabs .tab");
    if (!q || !tabs.length || $("cust-bookings")) return;
    const box = document.createElement("div");
    box.id = "cust-bookings";
    q.insertAdjacentElement("afterend", box);

    const t = tabs[tabs.length - 1].cloneNode(true);
    t.id = "mb-tab";
    t.removeAttribute("onclick");
    t.classList.remove("on");
    {
      // reuse the same icon-over-label structure as Home / Profile
      const texts = [];
      const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim()) texts.push(n);
      if (texts.length >= 2) {
        texts[0].nodeValue = "📅";
        texts[texts.length - 1].nodeValue = "My Bookings";
        for (let i = 1; i < texts.length - 1; i++) texts[i].nodeValue = "";
      } else {
        t.innerHTML = '<span style="display:block;line-height:1.1">📅</span>' +
                      '<span style="display:block">My Bookings</span>';
      }
    }
    tabs[tabs.length - 1].insertAdjacentElement("afterend", t);
    t.addEventListener("click", () => cTab("bookings", t));
    document.addEventListener("click", e => {
      const c = e.target.closest && e.target.closest("[data-cancel]");
      if (c) cancel(c.dataset.cancel);
      if (e.target.id === "mb-save") {
        const v = digits10(($("mb-phone") || {}).value);
        if (v.length !== 10) { toast("⚠️", "Enter a 10-digit number"); return; }
        try { localStorage.setItem("bqBookPhone", v); } catch (err) {}
        load();
      }
    });
    setInterval(() => { if (visible()) load(); }, 20000);
  }
  init();
})();

(function () {
  const css = document.createElement("style");
  css.textContent = `
    #toast{z-index:100000!important}
    .bq-f.bad{border-color:#ff6b8b!important;box-shadow:0 0 0 2px rgba(255,107,139,.25)}`;
  document.head.appendChild(css);

  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#bq-tk-send")) return;
    const sub = document.getElementById("bq-tk-sub");
    const msg = document.getElementById("bq-tk-msg");
    if (!sub || !msg) return;
    sub.classList.toggle("bad", sub.value.trim().length < 3);
    msg.classList.toggle("bad", msg.value.trim().length < 5);
    if (sub.classList.contains("bad")) sub.focus();
    else if (msg.classList.contains("bad")) msg.focus();
  }, true);

  document.addEventListener("input", e => {
    if (e.target.classList && e.target.classList.contains("bq-f")) e.target.classList.remove("bad");
  });

  const sub = () => document.getElementById("bq-tk-sub");
  new MutationObserver(() => {
    const s = sub();
    if (s && !s.dataset.req) { s.dataset.req = "1"; s.placeholder = "Subject (required)"; }
  }).observe(document.body, { childList: true, subtree: true });
})();

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const d10 = p => String(p || "").replace(/\D/g, "").slice(-10);
  const COL = { "Open": "#f5b73b", "In progress": "#6aa8ff", "Resolved": "#34d399" };
  const KEY = "bqTicketTokens", SEEN = "bqTicketSeen";
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ---------------- styles ---------------- */
  const css = document.createElement("style");
  css.textContent = `
  #toast{z-index:100000!important}
  .bq-f.bad{border-color:#ff6b8b!important;box-shadow:0 0 0 2px rgba(255,107,139,.25)}
  .tk-wrap{margin-top:22px;font-family:'DM Sans',sans-serif}
  .tk-wrap h4{margin:0 0 10px;font:700 17px 'Syne',sans-serif;color:"burlywood"}
  .tk-card{padding:14px;margin-bottom:10px;border-radius:16px;color:"burlywood";background:#0c1030;border:1px solid rgba(120,120,255,.2);color:#eef1ff}
  .tk-top{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:14px;font-weight:700}
  .tk-st{font-size:12px;padding:2px 9px;border-radius:8px;border:1px solid var(--k);color:var(--k);white-space:nowrap}
  .tk-d{font-size:13px;color:"burlywood";;margin:6px 0;white-space:pre-wrap}
  .tk-m{font-size:12px;color:#98a1cc}
  .tk-rp{margin-top:8px;padding:8px 10px;border-left:3px solid #f5b73b;color:"burlywood";background:rgba(245,183,59,.08);border-radius:0 10px 10px 0;font-size:13.5px;color:#eef1ff}
  .tk-rp small{display:block;color:#98a1cc;margin-top:3px}
  .tk-hint{font-size:12.5px;line-height:1.45;margin:0 0 10px;padding:9px 11px;border-radius:10px;background:rgba(245,183,59,.1);border:1px solid rgba(245,183,59,.35);color:"burlywood"}
  .tk-ta,.tk-sel{width:100%;margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(120,120,255,.3);background:#080b26;color:"burlywood";font:14px 'DM Sans',sans-serif}
  .tk-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .tk-row .tk-sel{width:auto;margin-top:0}
  .tk-btn{cursor:pointer;border:0;border-radius:12px;padding:10px 16px;font:700 14px 'DM Sans',sans-serif;color:"burlywood";background:linear-gradient(90deg,#f5b73b,#ff9a3d)}
  #sx-issues{display:none}
  #b-settings-tab.sx-detail.iss #sx-issues{display:block}
  #b-settings-tab.sx-detail.iss #sx-home{display:none!important}
  #sx-issues .tk-card{background:var(--c,#0c1030);color:"burlywood"}`;
  document.head.appendChild(css);

  /* ---------------- 1. private tickets via fetch wrapper ---------------- */
  const _fetch = window.fetch.bind(window);
  const tokens = () => jget(KEY, {});
  async function mine() {
    const t = tokens(), items = Object.keys(t).map(id => ({ id: Number(id), token: t[id] }));
    if (!items.length) return [];
    const r = await _fetch(BQ_BASE + "/api/support/mine", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items })
    });
    const j = await r.json();
    return (j && j.tickets) || [];
  }
  const jres = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

  window.fetch = function (url, opts) {
    try {
      if (typeof url === "string") {
        if (/\/api\/tickets$/.test(url) && opts && opts.method === "POST") {
          const body = JSON.parse(opts.body || "{}");
          const sel = $("bq-tk-shop");
          body.shop_name = sel ? sel.value : "";
          return _fetch(url.replace(/\/api\/tickets$/, "/api/support/tickets"),
            Object.assign({}, opts, { body: JSON.stringify(body) })).then(async res => {
            const copy = res.clone();
            try {
              const j = await copy.json();
              if (j && j.success && j.token) { const t = tokens(); t[j.ticket.id] = j.token; jset(KEY, t); }
            } catch (e) {}
            return res;
          });
        }
        if (/\/api\/tickets\?phone=/.test(url) && (!opts || !opts.method || opts.method === "GET")) {
          return mine().then(list => jres({ success: true, tickets: list })).catch(() => jres({ success: true, tickets: [] }));
        }
      }
    } catch (e) {}
    return _fetch(url, opts);
  };

  /* ---------------- 2. "My Tickets" with replies ---------------- */
  async function paintTickets() {
    const el = $("bq-my-tickets");
    if (!el) return;
    try {
      const list = await mine();
      if (!list.length) return;
      el.innerHTML = `<div class="tk-wrap"><h4>My Tickets</h4>${list.slice(0, 8).map(t => `
        <div class="tk-card">
          <div class="tk-top"><span>${esc(t.ref)} · ${esc(t.subject)}</span><span class="tk-st" style="--k:${COL[t.status] || "#98a1cc"}">${esc(t.status)}</span></div>
          ${t.shop_name ? `<div class="tk-m">About: ${esc(t.shop_name)}</div>` : ""}
          <div class="tk-d">${esc(t.description)}</div>
          ${t.replies.map(r => `<div class="tk-rp">${esc(r.message)}<small>${r.author === "shop" ? "The shop" : "Support"} · ${new Date(r.created_at).toLocaleString()}</small></div>`).join("")}
          ${t.status !== "Resolved" && !t.replies.length ? '<div class="tk-d">We have your request and will reply here.</div>' : ""}
        </div>`).join("")}</div>`;
    } catch (e) {}
  }
  const baseSupport = window.renderSupport;
  window.renderSupport = function () {
    const out = baseSupport.apply(this, arguments);
    setTimeout(paintTickets, 500);
    return out;
  };
  renderSupport = window.renderSupport;

  /* ---------------- 3. reply notifications ---------------- */
  async function checkReplies() {
    if (document.hidden && !("Notification" in window)) return;
    try {
      const list = await mine();
      const seen = jget(SEEN, null);
      const now = {}; list.forEach(t => { now[t.id] = t.replies.length; });
      if (seen) {
        list.forEach(t => {
          if (t.replies.length > (seen[t.id] || 0)) {
            const msg = "Reply on " + t.ref + ": " + t.replies[t.replies.length - 1].message.slice(0, 80);
            try { toast("💬", msg); } catch (e) {}
            try { if ("Notification" in window && Notification.permission === "granted") new Notification("Glowora support", { body: msg }); } catch (e) {}
          }
        });
      }
      jset(SEEN, now);
    } catch (e) {}
  }
  setInterval(checkReplies, 30000);
  setTimeout(checkReplies, 4000);

  /* ---------------- 4. ticket form: shop picker, hint, validation ---------------- */
  function lastShop() {
    if (S.inQueue && S.shops[S.myShopId]) return S.shops[S.myShopId].name;
    return (S.lastCompletedVisit && S.lastCompletedVisit.shop) || "";
  }
  function prepSheet() {
    const sheet = $("bq-ticket"), cat = $("bq-tk-cat");
    if (!sheet || !cat) return;
    let sel = $("bq-tk-shop");
    if (!sel) {
      const hint = document.createElement("div"); hint.className = "tk-hint"; hint.id = "bq-tk-hint";
      sel = document.createElement("select"); sel.className = "bq-f"; sel.id = "bq-tk-shop";
      cat.insertAdjacentElement("beforebegin", hint);
      cat.insertAdjacentElement("afterend", sel);
      cat.addEventListener("change", updHint);
      $("bq-tk-sub").placeholder = "Subject (required)";
    }
    const cur = lastShop();
    sel.innerHTML = '<option value="">Which shop is this about? (optional)</option>' +
      S.shops.filter(s => !s.isDemo).map(s => `<option ${s.name === cur ? "selected" : ""}>${esc(s.name)}</option>`).join("");
    updHint();
  }
  function updHint() {
    const h = $("bq-tk-hint"), c = $("bq-tk-cat");
    if (!h || !c) return;
    h.textContent = /mistake|Wrong token/i.test(c.value)
      ? "Joined the wrong shop? Open Queue Status and tap Leave Queue — it works instantly. Raise a ticket only if you cannot leave."
      : "Include your token number or payment ID so we can find it faster.";
  }
  new MutationObserver(() => {
    const sheet = $("bq-ticket");
    if (sheet && !sheet.dataset.w) {
      sheet.dataset.w = "1";
      new MutationObserver(() => { if (sheet.classList.contains("on")) prepSheet(); })
        .observe(sheet, { attributes: true, attributeFilter: ["class"] });
    }
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#bq-tk-send")) return;
    const sub = $("bq-tk-sub"), msg = $("bq-tk-msg");
    if (!sub || !msg) return;
    sub.classList.toggle("bad", sub.value.trim().length < 3);
    msg.classList.toggle("bad", msg.value.trim().length < 5);
    (sub.classList.contains("bad") ? sub : msg.classList.contains("bad") ? msg : null) && (sub.classList.contains("bad") ? sub : msg).focus();
    try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch (err) {}
  }, true);
  document.addEventListener("input", e => { if (e.target.classList && e.target.classList.contains("bq-f")) e.target.classList.remove("bad"); });

  /* ---------------- 5. barber: Customer Issues ---------------- */
  const shopName = () => (S.barber && S.barber.shopName) || "";
  async function loadIssues() {
    const box = $("sx-issues");
    if (!box) return;
    if (!shopName()) { box.innerHTML = '<div class="tk-card">Set your shop name first.</div>'; return; }
    box.innerHTML = '<div class="tk-card">Loading…</div>';
    try {
      const r = await _fetch(BQ_BASE + "/api/support/shop?shop_name=" + encodeURIComponent(shopName()));
      const j = await r.json();
      const list = (j && j.tickets) || [];
      box.innerHTML = list.length ? list.map(t => `
        <div class="tk-card" data-id="${t.id}">
          <div class="tk-top"><span>${esc(t.ref)} · ${esc(t.subject)}</span><span class="tk-st" style="--k:${COL[t.status] || "#98a1cc"}">${esc(t.status)}</span></div>
          <div class="tk-m">${esc(t.category)} · ${esc(t.phone)} · ${new Date(t.created_at).toLocaleString()}</div>
          <div class="tk-d">${esc(t.description)}</div>
          ${t.replies.map(x => `<div class="tk-rp">${esc(x.message)}<small>${x.author === "shop" ? "You" : "Support"} · ${new Date(x.created_at).toLocaleString()}</small></div>`).join("")}
          <textarea class="tk-ta" rows="2" placeholder="Reply to the customer…"></textarea>
          <div class="tk-row"><select class="tk-sel">${["Open", "In progress", "Resolved"].map(s => `<option ${s === t.status ? "selected" : ""}>${s}</option>`).join("")}</select>
            <button type="button" class="tk-btn" data-issue-send>Send / Update</button></div>
        </div>`).join("") : '<div class="tk-card">No customer issues for your shop. 🎉</div>';
    } catch (e) { box.innerHTML = '<div class="tk-card">Could not load tickets. Try again.</div>'; }
  }

  function addRow() {
    const root = $("sx-root");
    if (!root || root.querySelector('[data-sx="issues"]')) return;
    const help = root.querySelector('[data-sx="help"]');
    if (!help) return;
    const row = help.cloneNode(true);
    row.setAttribute("data-sx", "issues");
    const w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      n.nodeValue = n.nodeValue.replace("Help Center", "Customer Issues").replace("FAQs and guides", "Tickets from your customers");
    }
    help.insertAdjacentElement("afterend", row);
    const panel = document.createElement("div");
    panel.id = "sx-issues";
    root.appendChild(panel);
  }
  new MutationObserver(addRow).observe(document.body, { childList: true, subtree: true });
  addRow();

  document.addEventListener("click", e => {
    const tab = $("b-settings-tab");
    const sx = e.target.closest && e.target.closest("[data-sx]");
    if (sx && tab) {
      if (sx.dataset.sx === "issues") {
        tab.classList.add("sx-detail", "iss");
        const t = $("sx-detail-title"); if (t) t.textContent = "Customer Issues";
        tab.scrollTop = 0;
        loadIssues();
      } else tab.classList.remove("iss");
    }
    const send = e.target.closest && e.target.closest("[data-issue-send]");
    if (send) {
      const card = send.closest(".tk-card");
      _fetch(BQ_BASE + "/api/support/shop/" + card.dataset.id + "/reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_name: shopName(), message: card.querySelector("textarea").value, status: card.querySelector("select").value })
      }).then(r => r.json()).then(j => {
        if (!j.success) throw new Error(j.error || "Could not save");
        toast("✅", "Reply sent"); loadIssues();
      }).catch(err => toast("⚠️", err.message));
    }
  }, true);
  const baseB = window.bTab;
  if (baseB) window.bTab = function (tab) { const o = baseB.apply(this, arguments); const t = $("b-settings-tab"); if (t) t.classList.remove("iss"); return o; };
  setInterval(() => { const t = $("b-settings-tab"); if (t && t.classList.contains("iss")) loadIssues(); }, 45000);
})();

/* Ticket form: burlywood text, readable dropdown */
(function () {
  const css = document.createElement("style");
  css.textContent = `
    #bq-ticket .bq-f,
    #bq-ticket select.bq-f,
    #bq-ticket input.bq-f,
    #bq-ticket textarea.bq-f{color:burlywood!important}
    #bq-ticket .bq-f::placeholder{color:rgba(222,184,135,.6)!important}
    #bq-ticket select.bq-f option{background:#0c1030;color:burlywood}
    #bq-ticket .tk-hint{color:burlywood!important}
    #bq-ticket .bq-sub{color:rgba(222,184,135,.8)!important}`;
  document.head.appendChild(css);
})();

(function () {
  'use strict';
  const st = document.createElement('style');
  st.id = 'bq-tabbar-fix';
  st.textContent = `
  #c-tabs { display: flex !important; align-items: stretch; justify-content: space-around; }
  #c-tabs .tab {
    flex: 1 1 0 !important; min-width: 0;
    display: flex !important; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    text-align: center; padding-top: 8px; padding-bottom: 8px;
  }
  #c-tabs .tab .bq-ti { font-size: 20px; line-height: 1; }
  #c-tabs .tab .bq-tl { font-size: 11px; line-height: 1.1; white-space: nowrap; }
  #cust-queue, #my-q { padding-top: 18px; }
  #cust-queue h1, #cust-queue h2, #my-q h1, #my-q h2 { scroll-margin-top: 70px; }`;
  document.head.appendChild(st);

  function fixTab() {
    const bar = document.getElementById('c-tabs');
    const b = bar && bar.querySelector('[data-bkbtn]');
    if (!b || b.dataset.fixed) return;
    const ref = [...bar.querySelectorAll('.tab')].find(t => !t.hasAttribute('data-bkbtn'));
    // reuse the same classes as the Home tab's icon and label so they match exactly
    const leaves = ref ? [...ref.querySelectorAll('*')].filter(n => !n.children.length) : [];
    const iconCls  = leaves[0] ? leaves[0].className : '';
    const labelCls = leaves[1] ? leaves[1].className : '';
    b.innerHTML = '<span class="bq-ti ' + iconCls + '">📅</span><span class="bq-tl ' + labelCls + '">Bookings</span>';
    b.dataset.fixed = '1';
  }

  function run() { fixTab(); setTimeout(fixTab, 1500); }
  if (typeof componentsReady !== 'undefined') componentsReady.then(run); else run();
})();
/* Booking settings: slot length up to 120 min, book ahead up to 365 days */
(function () {
  'use strict';
  const SLOTS = [15, 20, 30, 45, 60, 90, 120];
  const AHEAD = [7, 14, 30, 60, 90, 180, 365];

  function fill(id, values, unit, fallback) {
    const sel = document.getElementById(id);
    if (!sel || sel.dataset.filled) return;
    const keep = Number(sel.value);
    sel.innerHTML = values.map(v => '<option value="' + v + '">' + v + ' ' + unit + '</option>').join('');
    sel.value = String(values.includes(keep) ? keep : fallback);
    sel.dataset.filled = '1';
  }

  setInterval(() => {
    if (document.hidden) return;
    fill('bk-slot', SLOTS, 'min', 30);
    fill('bk-ahead', AHEAD, 'days', 14);
  }, 1500);
})();
/* Demo shops removed: keep the app safe when the list is empty */
(function () {
  'use strict';

  // remove any leftover demo shops (also covers a cached old version)
  const DEMO = ['royal cuts', 'the blade room', 'style studio', 'classic barber'];
  function stripDemo() {
    S.shops = S.shops.filter(s => s.isBarberProfile || !DEMO.includes(String(s.name).toLowerCase()));
S.shops.forEach((s, i) => {
  if (s.isBarberProfile) {
    s.id = i;
  }
});// keep ids matching positions
  }
  stripDemo();

  // never open a shop that doesn't exist
  const baseOpenShop = window.openShop;
  window.openShop = function (id) {
    if (!S.shops[id]) return;
    return baseOpenShop.apply(this, arguments);
  };

  // friendly message when there are no shops yet
  const baseRender = window.renderShops;
  window.renderShops = function () {
    const out = baseRender.apply(this, arguments);
    const list = document.getElementById('cx-list');
    if (list && !S.shops.length) {
      list.innerHTML = '<div class="cx-empty">No barber shops have joined yet. Check back soon!</div>';
    }
    return out;
  };
})();

/* Load real registered shops from the BarberQ backend */
(async function loadRealBarberQShops() {
  const API = 'https://barber-queue-backend-9z52.onrender.com/api';

  const list = document.getElementById('shop-list');
  if (list) {
    list.innerHTML =
      '<div class="cx-empty">Loading registered barber shops...</div>';
  }

  try {
    const response = await fetch(`${API}/shops`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Shops API returned ${response.status}`);
    }

    const result = await response.json();

    // Support either {shops: [...]} or a direct array response.
    const shops = Array.isArray(result)
      ? result
      : Array.isArray(result.shops)
        ? result.shops
        : [];

    // Never show the old demo shops.
    const demoNames = new Set([
      'royal cuts',
      'the blade room',
      'style studio',
      'classic barber'
    ]);

    const realShops = shops.filter(shop => {
  if (!shop || shop.id == null || !shop.name) return false;

  const name = String(shop.name).trim().toLowerCase();
  const status = String(shop.status || '').trim().toLowerCase();

  // Never display demo shops.
  if (demoNames.has(name)) return false;

  // Never display shops marked as deleted.
  if (
    shop.is_deleted === true ||
    shop.deleted === true ||
    shop.deleted_at ||
    ['deleted', 'removed'].includes(status)
  ) {
    return false;
  }

  return true;
});

    // Keep any local barber-profile entry used by the barber dashboard.
    const barberProfile = (S.shops || []).find(shop => shop.isBarberProfile);

    // The existing UI uses array indexes for openShop(id).
    // Keep the real database ID separately as backendId.
    S.shops = realShops.map((shop, index) => ({
      ...shop,
      backendId: shop.id,
      id: index,
      name: shop.name,
      owner: shop.owner || '',
      addr: shop.address || shop.addr || 'Address not provided',
      open: String(shop.status || '').toLowerCase() === 'open',
      rating: Number(shop.rating || 0),
      rev: Number(shop.rev || shop.review_count || 0),
      q: Number(shop.queue_count || shop.q || 0),
      cur: Number(shop.current_token || shop.cur || 0),
      wait: Number(shop.wait_minutes || shop.wait || 0),
      photo: shop.photos?.[0]?.photo_url ||
             shop.photos?.[0]?.url ||
             shop.photo ||
             '',
      ico: '💈',
      clr: '#D4AF37'
    }));

    // Keep the barber's own profile available to existing dashboard code.
    if (barberProfile) {
      S.shops.push(barberProfile);
    }

    if (typeof renderShops === 'function') {
      renderShops();
    }

    console.log('Registered shops loaded:', realShops.length);

    if (realShops.length === 0 && list) {
      list.innerHTML =
        '<div class="cx-empty">No registered barber shops are available yet.</div>';
    }
  } catch (error) {
    console.error('Could not load registered shops:', error);

    if (list) {
      list.innerHTML =
        '<div class="cx-empty">Could not load shops. Please refresh and try again.</div>';
    }
  }
})();

/* =========================================================
   BARBERQ PATCH: FIX EMPTY RIGHT-SIDE SHOP DETAILS
   Paste at the VERY END of script.js
   ========================================================= */
(function fixBarberQShopDetails() {
  'use strict';

  function repairShopData() {
    if (typeof S === 'undefined' || !Array.isArray(S.shops)) return;

    if (!Array.isArray(S.services)) S.services = [];

    S.shops.forEach(function (shop, index) {
      if (!shop || typeof shop !== 'object') return;

      // Preserve the real backend ID, but keep UI IDs compatible
      // with code that accesses S.shops[id].
      if (shop.backendId == null && shop.id != null) {
        shop.backendId = shop.id;
      }
      shop.id = index;

      // The detail panel expects a list of service indexes.
      if (!Array.isArray(shop.svcs)) shop.svcs = [];

      shop.svcs = shop.svcs.filter(function (serviceIndex) {
        return Number.isInteger(serviceIndex) &&
          serviceIndex >= 0 &&
          serviceIndex < S.services.length &&
          S.services[serviceIndex] != null;
      });

      // Normalize backend fields used by the customer UI.
      shop.name = String(shop.name || 'Barber Shop');
      shop.addr = String(shop.addr || shop.address || 'Address not provided');
      shop.open = typeof shop.open === 'boolean'
        ? shop.open
        : String(shop.status || '').toLowerCase() === 'open';

      if (shop.rating == null) shop.rating = 0;
      if (shop.rev == null) shop.rev = shop.review_count || 0;
      if (shop.q == null) shop.q = shop.queue_count || 0;
      if (shop.cur == null) shop.cur = shop.current_token || 0;
      if (shop.wait == null) shop.wait = shop.wait_minutes || 0;
      if (!shop.ico) shop.ico = '💈';
      if (!shop.clr) shop.clr = '#D4AF37';
    });
  }

  // Repair data before existing shop functions run.
  ['openShop', 'renderShops'].forEach(function (name) {
    var original = window[name];
    if (typeof original !== 'function' || original.__bqDetailFix) return;

    var wrapped = function () {
      repairShopData();
      return original.apply(this, arguments);
    };

    wrapped.__bqDetailFix = true;
    window[name] = wrapped;
  });

  // The newer customer interface uses clicks inside #cx-list.
  // Capture the click first so missing svcs cannot crash its renderer.
  document.addEventListener('click', function (event) {
    if (event.target.closest('#cx-list, #cx-fast')) {
      repairShopData();
    }
  }, true);

  // Also handles shops loaded asynchronously from the backend.
  repairShopData();

  var attempts = 0;
  var repairTimer = setInterval(function () {
    repairShopData();
    attempts++;

    // Stop after 30 seconds; click handling remains available.
    if (attempts >= 120) clearInterval(repairTimer);
  }, 250);

  // Show a useful message instead of a blank service list.
  var detailObserver = new MutationObserver(function () {
    var detail = document.getElementById('cx-detail');
    if (!detail) return;

    var shopDetails = detail.querySelector('.cx-det');
    var serviceList = detail.querySelector('.cx-svs');

    if (shopDetails && serviceList && !serviceList.children.length &&
        !serviceList.dataset.emptyMessageAdded) {
      serviceList.dataset.emptyMessageAdded = 'true';
      serviceList.innerHTML =
        '<div class="cx-empty">Shop details loaded. Services have not been added yet.</div>';
    }
  });

  function watchDetail() {
    var detail = document.getElementById('cx-detail');
    if (detail && !detail.dataset.bqDetailObserved) {
      detail.dataset.bqDetailObserved = 'true';
      detailObserver.observe(detail, { childList: true, subtree: true });
    }
  }

  watchDetail();
  document.addEventListener('DOMContentLoaded', watchDetail);
})();

/* =========================================================
   BARBERQ: SHOW ONLY CURRENTLY REGISTERED SHOPS
   Temporary allowlist: Sanjana Makeovers is the only
   confirmed registered shop. Paste at end of script.js.
   ========================================================= */
(function () {
  'use strict';

  const API = 'https://barber-queue-backend-9z52.onrender.com/api';
  const ALLOWED_SHOPS = new Set(['sanjana makeovers']);
  let loading = false;

  function normalize(shop, index) {
    return {
      ...shop,
      backendId: shop.id,
      id: index,
      name: String(shop.name || 'Barber Shop'),
      owner: shop.owner || '',
      addr: shop.address || shop.addr || 'Address not provided',
      open: typeof shop.open === 'boolean'
        ? shop.open
        : String(shop.status || '').toLowerCase() === 'open',
      rating: Number(shop.rating || 0),
      rev: Number(shop.rev || shop.review_count || 0),
      q: Number(shop.queue_count || shop.q || 0),
      cur: Number(shop.current_token || shop.cur || 0),
      wait: Number(shop.wait_minutes || shop.wait || 0),
      svcs: Array.isArray(shop.svcs) ? shop.svcs : [],
      photo: shop.photos?.[0]?.photo_url ||
             shop.photos?.[0]?.url || shop.photo || '',
      ico: '💈',
      clr: '#D4AF37'
    };
  }

  function refreshUI() {
    try {
      if (typeof window.renderShops === 'function') {
        window.renderShops();
      }

      // Refresh the newer customer-shop interface if it is present.
      const allChip = document.querySelector(
        '#cx-chips [data-f="all"]'
      );
      if (allChip) allChip.click();

      document.querySelectorAll('#cx-list .cx-card').forEach(card => {
        card.classList.remove('on');
      });

      const detail = document.getElementById('cx-detail');
      if (detail && (!window.S || !S.shops.length)) {
        detail.innerHTML =
          '<div class="cx-empty">No registered barber shops are available.</div>';
      }
    } catch (error) {
      console.warn('BarberQ shop UI refresh issue:', error);
    }
  }

  async function loadRegisteredShops() {
    if (loading || typeof S === 'undefined' || !Array.isArray(S.shops)) {
      return;
    }

    loading = true;

    try {
      const response = await fetch(API + '/shops', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Shop API returned HTTP ' + response.status);
      }

      const result = await response.json();
      const records = Array.isArray(result)
        ? result
        : Array.isArray(result.shops) ? result.shops : [];

      // Do not trust old localStorage or demo shop records.
      // Only the confirmed registered shop is displayed for now.
      const realShops = records.filter(shop =>
        shop &&
        shop.id != null &&
        ALLOWED_SHOPS.has(String(shop.name || '').trim().toLowerCase())
      );

      S.shops = realShops.map(normalize);

      if (S.shops.length) {
        S.selectedShop = 0;
      }

      refreshUI();

      console.log(
        'BarberQ registered shops loaded:',
        S.shops.map(shop => ({ id: shop.backendId, name: shop.name }))
      );
    } catch (error) {
      console.error('Could not load registered shops:', error);

      // Avoid showing stale/unverified local shop cards on API failure.
      S.shops = [];
      refreshUI();

      const list = document.getElementById('cx-list');
      if (list) {
        list.innerHTML =
          '<div class="cx-empty">Could not load registered shops. Please refresh and try again.</div>';
      }
    } finally {
      loading = false;
    }
  }

  // Wait for the app's state and HTML components to initialize.
  let attempts = 0;
  const startup = setInterval(function () {
    attempts++;

    if (typeof S !== 'undefined' && Array.isArray(S.shops)) {
      clearInterval(startup);
      loadRegisteredShops();
    } else if (attempts >= 80) {
      clearInterval(startup);
      console.error('BarberQ: app state did not initialize in time.');
    }
  }, 250);

  // Expose a refresh function without replacing existing app functions.
  window.refreshRegisteredBarberQShops = loadRegisteredShops;
})();

/* BARBERQ: RESTORE PREDEFINED SERVICES FOR REGISTERED SHOPS */
(function () {
  'use strict';

  const PREDEFINED_SERVICES = [
    { name: 'Haircut', price: 250, duration: 20 },
    { name: 'Beard Trim', price: 150, duration: 15 },
    { name: 'Hair Color', price: 800, duration: 60 },
    { name: 'Facial', price: 600, duration: 45 },
    { name: 'Hair Spa', price: 1200, duration: 90 },
    { name: 'Head Massage', price: 200, duration: 20 },
    { name: 'Manicure', price: 300, duration: 30 },
    { name: 'Pedicure', price: 400, duration: 40 }
  ];

  function restoreServices() {
    if (typeof S === 'undefined' || !Array.isArray(S.shops)) return;

    if (!Array.isArray(S.services) || !S.services.length) {
      S.services = PREDEFINED_SERVICES.map((service, index) => ({
        id: index,
        name: service.name,
        price: service.price,
        duration: service.duration,
        minutes: service.duration
      }));
    }

    S.shops.forEach(shop => {
      if (!Array.isArray(shop.svcs) || !shop.svcs.length) {
        shop.svcs = S.services.map((_, index) => index);
      }
    });

    if (typeof window.renderShops === 'function') {
      window.renderShops();
    }

    console.log('BarberQ: predefined services restored', S.services);
  }

  // Wait until the shop-loading patch has finished.
  window.addEventListener('load', function () {
    setTimeout(restoreServices, 1500);
  });

  window.restoreBarberQServices = restoreServices;
})();
const response = await fetch(
  'https://barber-queue-backend-9z52.onrender.com/api/barbers/my-shop',
  {
    headers: {
      Authorization: 'Bearer ' + yourSavedBarberToken,
      Accept: 'application/json'
    }
  }
);

const result = await response.json();

if (!response.ok || !result.success || !result.shop) {
  throw new Error(result.error || 'Could not load your registered shop.');
}

const registeredShop = result.shop;
