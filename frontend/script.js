// ═══════ STATE ═══════
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
  shops:[
    {id:0,name:'Royal Cuts',owner:'Rahul Sharma',rating:4.8,rev:234,addr:'Hazratganj, Lucknow',cur:3,q:6,wait:28,open:true,clr:'#f5c842',ico:'👑',svcs:[0,1,2,3]},
    {id:1,name:'The Blade Room',owner:'Amit Singh',rating:4.6,rev:189,addr:'Gomtinagar, Lucknow',cur:7,q:4,wait:18,open:true,clr:'#00d4aa',ico:'⚔️',svcs:[0,1,4]},
    {id:2,name:'Style Studio',owner:'Priya Verma',rating:4.9,rev:312,addr:'Alambagh, Lucknow',cur:12,q:2,wait:8,open:true,clr:'#ff6b9d',ico:'💎',svcs:[0,1,2,3,4]},
    {id:3,name:'Classic Barber',owner:'Suresh Kumar',rating:3.4,rev:98,addr:'Chowk, Lucknow',cur:0,q:8,wait:36,open:false,clr:'#a29bfe',ico:'🪒',svcs:[0,1]},
  ],
  bq:[],
  earn:0,
  doneCnt:0,
  onlineCollected:0
};

// CUSTOMER DATA: separate profile and history for each phone number
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

    // Load existing customer or initialize a separate new customer.
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

    // Active queue details should be restored from the backend
    // when backend support for customer queue lookup is implemented.
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

// Customer side: read the published shop into S.shops.
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
      data.id = S.shops.length;     // ids are indexes into S.shops
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

  syncShopStats();      // ← this is what publishes it to the customer side
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

// Tell the database about the barber's shop (name, address, open/closed)
// so customers can book it. Only sends when something changed.
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

// A customer tab that is already open picks up changes live.
window.addEventListener('storage', e => {

  if(e.key !== PUBLIC_SHOP_KEY && e.key !== PUBLIC_SHOP_KEY + 'Photo') return;
  if(S.role === 'barber') return;           // the barber tab owns this data

  loadPublishedShop();

  const cust = document.getElementById('s-cust');
  if(cust && cust.classList.contains('active')) renderShops();
});

// Load saved barber services
const savedServices = localStorage.getItem('barberServices');

if (savedServices) {
  S.services = JSON.parse(savedServices);
}

// ═══════ NAV ═══════
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
    const response = await fetch(
      "https://barber-queue-backend-9z52.onrender.com/api/queue?shop_name=" +
      encodeURIComponent(shopName)
    );

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

// function demoAs(r) {
//   S.role = r;

//   if (r === "customer") {
//     go("s-cust");
//   } else {
//     // Temporary demo shop selection
//     S.barber.shopName = "Royal Cuts";
//     go("s-barb");
//     loadBarberQueue(S.barber.shopName);
//   }
// }

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

// ═══════ HELPERS ═══════
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

// ═══════ AUTH ═══════
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

        document.getElementById("ph-show").textContent =
            "+91 " + phone;

        document.getElementById("otp-message").innerHTML =
            "Use code <strong>" + generatedOTP + "</strong> to continue";

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

    toast("✅", "Profile loaded successfully");
}

    function otpFwd(input, index) {

        input.value = input.value.replace(/\D/g, "");

        if (input.value.length === 1 && index < 3) {

            document
                .getElementById("o" + (index + 1))
                .focus();
        }
    }


    function otpBack(input, index, event) {

        if (
            event.key === "Backspace" &&
            input.value === "" &&
            index > 0
        ) {

            document
                .getElementById("o" + (index - 1))
                .focus();
        }
    }

// ═══════ CUSTOMER ═══════
function renderShops(){

  document.getElementById('shop-list').innerHTML=

  S.shops.map(s=>`

    <div class="shop-card"
    onclick="openShop(${s.id})">

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">

<div style="
  width:48px;
  height:48px;
  border-radius:12px;
  background:${s.clr}20;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  flex-shrink:0;
  overflow:hidden;
">
  ${
    s.photo
      ? `<img
          src="${s.photo}"
          alt="${s.name}"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
          "
        >`
      : s.ico
  }
</div>

        <div style="flex:1;min-width:0">

          <div style="font-weight:700;font-size:15px;font-family:'Syne',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${s.name}
          </div>

          <div style="font-size:12px;color:var(--txt2)">
            ${s.addr}
          </div>

        </div>

        <span class="tag ${s.open?'tgreen':'tred'}"
        style="flex-shrink:0">
          ${s.open?'Open':'Closed'}
        </span>

      </div>

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">

        <span class="tag tgray">
          ⭐ ${s.rating} (${s.rev})
        </span>

        <span class="tag tgray">
          🎫 Queue: ${s.q}
        </span>

        <span class="tag tgray">
          ⏱ ~${s.wait} min
        </span>

      </div>

      <div style="display:flex;justify-content:space-between;align-items:center">

        <div style="font-size:13px;color:var(--txt2)">
          Serving:
          <strong style="color:var(--gold)">
            #${s.cur}
          </strong>
        </div>

        <div style="font-size:13px;color:var(--gold);font-weight:500">
          View & Join →
        </div>

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

      <div style="font-size:52px;margin-bottom:8px">
        ${s.ico}
      </div>

      <div style="font-size:24px;font-weight:800;font-family:'Syne',sans-serif;margin-bottom:6px">
        ${s.name}
      </div>

      <div style="color:var(--txt2);font-size:13px;margin-bottom:10px">
        ${s.addr} · ${s.owner}
      </div>

      <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">

        <span class="tag"
        style="background:rgba(0,0,0,.3);border:1px solid ${s.clr}40;color:${s.clr}">
          ⭐ ${s.rating} · ${s.rev} reviews
        </span>

        <span class="tag ${s.open?'tgreen':'tred'}">
          ${s.open?'● Open':'● Closed'}
        </span>

      </div>

    </div>


    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px">

      <div class="stat"
      style="text-align:center;padding:14px 8px">

        <div class="stat-n"
        style="color:var(--gold);font-size:26px">
          #${s.cur}
        </div>

        <div class="stat-l">
          Serving Now
        </div>

      </div>


      <div class="stat"
      style="text-align:center;padding:14px 8px">

        <div class="stat-n"
        style="font-size:26px">
          ${s.q}
        </div>

        <div class="stat-l">
          In Queue
        </div>

      </div>


      <div class="stat"
      style="text-align:center;padding:14px 8px">

        <div class="stat-n"
        style="color:var(--cyan);font-size:26px">
          ${s.wait}
        </div>

        <div class="stat-l">
          Min Wait
        </div>

      </div>

    </div>


    <div style="font-size:17px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px">
      Services Offered
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">

      ${s.svcs.map(si=>{

        const sv=S.services[si];

        return`

          <div class="card card-p"
          style="display:flex;align-items:center;gap:10px">

            <span style="font-size:24px">
              ${sv.ico}
            </span>

            <div>

              <div style="font-weight:500;font-size:14px">
                ${sv.name}
              </div>

              <div style="color:var(--gold);font-weight:600;font-size:14px">
                ₹${sv.price}
              </div>

              <div style="color:var(--txt2);font-size:12px">
                ~${sv.dur} min
              </div>

            </div>

          </div>

        `

      }).join('')}

    </div>


    <div style="font-size:17px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px">
      Live Queue Preview
    </div>


    ${S.bq.slice(0,5).map(q=>`

      <div class="qi ${q.st==='cur'?'cur':q.st==='nxt'?'nxt':''}">

        <div class="qi-num"
        style="background:${q.st==='cur'?'var(--gdim)':q.st==='nxt'?'var(--cdim)':'var(--s3)'};color:${q.st==='cur'?'var(--gold)':q.st==='nxt'?'var(--cyan)':'var(--txt2)'}">

          ${q.tok}

        </div>

        <div style="flex:1">

          <div style="font-size:14px;font-weight:500">
            ${q.st==='cur'?q.name:'Customer '+q.tok}
          </div>

          <div style="font-size:12px;color:var(--txt2)">
            ${q.svc}
          </div>

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

        <div style="font-size:12px;color:var(--txt2);margin-bottom:4px">
          You're in queue!
        </div>

        <div style="font-size:60px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold);line-height:1">
          #${S.myTok}
        </div>

        <div style="font-size:13px;color:var(--txt2);margin-top:4px">
          ${S.mySvc}
        </div>

        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">

          <button class="btn btn-red btn-sm"
          onclick="leaveQ()">
            Leave Queue
          </button>

          <button class="btn btn-outline btn-sm"
          onclick="openModal('m-rate');document.getElementById('rate-shop-name').textContent='${s.name}'">
            Rate Shop ⭐
          </button>

        </div>

      </div>

    `:`

      <button class="btn ${s.open?'btn-gold':'btn-outline'} btn-full"
      style="height:52px;font-size:16px;margin-top:16px"
      onclick="${s.open?"openJoinModal()":'toast(\"⛔\",\"This shop is currently closed\")'}">

        ${s.open?'Join Queue →':'Shop is Closed'}

      </button>

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

      <div class="svc-chip ${i===0?'sel':''}"
      onclick="pickSvc(${i})">

        <div style="font-size:24px">
          ${sv.ico}
        </div>

        <div style="font-size:13px;font-weight:500;margin-top:4px">
          ${sv.name}
        </div>

        <div class="svc-price">
          ₹${sv.price}
        </div>

      </div>

    `

  }).join('');

  updateJoinInfo();
}


function pickSvc(i){

  S.selectedSvc=i;

  document.querySelectorAll('.svc-chip')
  .forEach(
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

// ═══════════════════════════════════════ PAYMENT FLOW ═══════════════════════════════════════

// const UPI_VPA = 'yokshitajaiswal@okicici';
// const UPI_PAYEE_NAME = 'Barber-Q';

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


// function updateUpiQr() {

//     const qrImg = document.getElementById('upi-qr-img');

//     if (!qrImg) {
//         console.warn('UPI QR image element not found');
//         return;
//     }

//     qrImg.src = 'QR.webp';
//     qrImg.alt = 'UPI QR Code';

//     qrImg.style.position = 'absolute';
//     qrImg.style.width = '227px';
//     qrImg.style.height = 'auto';
//     qrImg.style.maxWidth = 'none';
//     qrImg.style.left = '-23px';
//     qrImg.style.top = '-60px';
//     qrImg.style.padding = '0';
//     qrImg.style.margin = '0';
//     qrImg.style.borderRadius = '0';
// }
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


// function selectPayMethod(method) {
//     S.payMethod = method;

//     document.querySelectorAll('.pay-opt').forEach(el => el.classList.remove('sel'));

//     const selected = document.getElementById('pay-' + method);
//     if (selected) selected.classList.add('sel');

//     const qrSection = document.getElementById('upi-qr-section');
//     if (qrSection) qrSection.style.display = method === 'online' ? 'block' : 'none';

//     const button = document.getElementById('pay-btn-label');
//     if (!button) return;

//     button.textContent = method === 'shop'
//         ? 'Confirm & Join (Pay at Shop)'
//         : 'Pay & Join Queue';
// }
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
    button.textContent =
        method === 'shop'   ? 'Confirm & Join (Pay at Shop)' :
        method === 'upi_qr' ? "I've Paid — Join Queue" :
                              'Pay & Join Queue';
}

async function processPayment() {
    const p = S.pendingJoin;
    if (!p) { toast('⚠️', 'No pending queue request'); return; }

    const s = S.shops[p.shopId];
    if (!s) { toast('⚠️', 'Shop information not found'); return; }

    // if (S.payMethod !== 'online') {
    //     finalizeJoin(p, s, false);
    //     return;
    // }
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
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
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
                    // finalizeJoin(p, s, true);
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
                preferences: { show_default_blocks: true }   // cards/netbanking still available
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
          // service_duration: (S.services.find(x => x.name === p.svcName) || {}).dur
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

    // Use the token and ID returned by the database.
    p.tok = booking.token;
    S.myQueueEntryId = booking.id;
    S.inQueue = true;
    S.myTok = booking.token;
    S.mySvc = p.svcName;
    S.myShopId = p.shopId;

    // Update local shop information.
    s.q = (s.q || 0) + 1;

    // Record payment information in the current browser session.
    if (!Array.isArray(S.payments)) S.payments = [];
    if (!Array.isArray(S.paymentMethods)) S.paymentMethods = [];

    S.payments.unshift({
      id: "PAY" + Date.now().toString().slice(-8),
      shop: s.name,
      shopId: p.shopId,
      token: booking.token,
      svc: p.svcName,
      amount: p.price,
      // method: paidOnline ? "Online" : "Pay at Shop",
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

    // Close payment modal and show confirmation.
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
      // note.style.color = paidOnline ? "var(--green)" : "var(--txt2)";
      // note.textContent = paidOnline
      //   ? "✅ Payment of ₹" + p.price + " received"
      //   : "💵 Pay ₹" + p.price + " at the shop";
      note.textContent = paidOnline
      ? "✅ Payment of ₹" + p.price + " received"
      : extra.payment_method === 'upi_qr'
      ? "📲 UPI payment sent — the barber will confirm it"
      : "💵 Pay ₹" + p.price + " at the shop";
    }

    openModal("m-ok");

    toast(
      "✅",
      paidOnline
        ? "Payment successful and booking saved!"
        : "Added to queue — pay at shop"
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

        <div style="font-size:52px;margin-bottom:12px">
          🎫
        </div>

        <div style="font-size:20px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:8px">
          No Active Queue
        </div>

        <p style="color:var(--txt2);font-size:14px;margin-bottom:20px">
          Browse nearby shops and join a queue!
        </p>

        <button class="btn btn-gold"
        onclick="cTab('home',null)">
          Find Barbers →
        </button>

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

        <span style="font-size:20px">
          🔔
        </span>

        <div>

          <div style="font-weight:500;font-size:14px">
            Almost your turn!
          </div>

          <div style="font-size:12px;color:var(--txt2)">
            ${ahead} customer${ahead!==1?'s':''} ahead of you
          </div>

        </div>

      </div>

    `:''}


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

      <div class="stat"
      style="text-align:center">

        <div class="stat-n"
        style="color:var(--gold)">
          #${s.cur}
        </div>

        <div class="stat-l">
          Serving Now
        </div>

      </div>


      <div class="stat"
      style="text-align:center">

        <div class="stat-n"
        style="color:var(--cyan)">
          ${ahead}
        </div>

        <div class="stat-l">
          Ahead of You
        </div>

      </div>

    </div>


    <div class="stat"
    style="margin-bottom:16px">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">

        <span style="color:var(--txt2);font-size:14px">
          Estimated wait
        </span>

        <span style="font-size:20px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold)">
          ~${s.wait} min
        </span>

      </div>

      <div class="pbar">

        <div class="pfill"
        style="width:${prog}%">
        </div>

      </div>

      <div style="font-size:12px;color:var(--txt2);margin-top:6px;text-align:right">
        Progress to your turn
      </div>

    </div>


    <div style="display:flex;gap:10px">

      <button class="btn btn-red"
      style="flex:1"
      onclick="leaveQ();cTab('queue',null)">
        Leave Queue
      </button>

      <button class="btn btn-outline"
      style="flex:1"
      onclick="openModal('m-rate');document.getElementById('rate-shop-name').textContent='${s.name}'">
        Rate Shop ⭐
      </button>

    </div>

    <div style="height:20px"></div>

  `;
}


function cTab(name,el){

  document.getElementById('cust-home').style.display=
    name==='home'?'block':'none';

  document.getElementById('cust-queue').style.display=
    name==='queue'?'block':'none';

  if(el){

    document.querySelectorAll('#c-tabs .tab')
    .forEach(t=>t.classList.remove('on'));

    el.classList.add('on');
  }

  if(name==='queue')
    renderMyQ();
}

// ── Ask the backend for a shop's active queue (same data the barber sees) ──
async function cqFetchQueue(shopName){
  const res = await fetch(
    "https://barber-queue-backend-9z52.onrender.com/api/queue?shop_name=" + encodeURIComponent(shopName)
  );
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

// ── Work out where the customer is in that queue ──
function cqApply(list){

  S.myQueueList = list;

  const idx = list.findIndex(q => String(q.id) === String(S.myQueueEntryId));

  // Not in the active queue any more. Wait for two polls in a row so a
  // single hiccup is never mistaken for "service finished".
  if(idx === -1){
    S._cqMiss = (S._cqMiss || 0) + 1;
    if(S._cqMiss >= 2) completeMyVisit();
    return;
  }

  S._cqMiss = 0;

  // Remember when the person at the front started being served,
  // so the time left can count down between polls.
  const head = list[0];
  if(S._cqHeadId !== head.id){
    S._cqHeadId    = head.id;
    S._cqHeadSince = Date.now();
  }
}

// Position and time left, recalculated from the clock every time it is drawn.
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

// The barber marked this customer's token complete.
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

  // A pay-at-shop payment becomes a completed payment now.
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

  toast('✅', 'Your service is complete! Your visit has been added to history.');
  renderMyQ();
}

// ── Customer polling (every 5 s while the customer is using the app) ──
let cqBusy = false;

async function pollCustomer(){

  if(cqBusy || S.role !== 'customer') return;
  cqBusy = true;

  try{
    const bshop = S.shops.find(s => s.isBarberProfile);
    const mine  = S.inQueue ? S.shops[S.myShopId] : null;

    // 1) Live numbers on the barber's shop card.
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

    // 2) Customer is queued at some other shop.
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

// Redraw every 15 s so the minutes keep counting down between polls.
setInterval(() => {
  const el = document.getElementById('my-q');
  if(S.inQueue && el && el.offsetParent !== null) renderMyQ();
}, 15000);

// ── My Queue tab, now with live position and time left ──
function renderMyQ(){

  const el = document.getElementById('my-q');
  if(!el) return;

  if(!S.inQueue){

    el.innerHTML = `

      <div style="text-align:center;padding:60px 20px">

        <div style="font-size:52px;margin-bottom:12px">🎫</div>

        <div style="font-size:20px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:8px">
          No Active Queue
        </div>

        <p style="color:var(--txt2);font-size:14px;margin-bottom:20px">
          Browse nearby shops and join a queue!
        </p>

        <button class="btn btn-gold" onclick="cTab('home',null)">
          Find Barbers →
        </button>

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

    headline = info.inService
      ? '~' + info.svc + ' min'
      : '~' + info.done + ' min';

    detail = info.inService
      ? 'Your service is in progress'
      : 'Your turn starts in ~' + info.wait + ' min · service ~' + info.svc + ' min';

    prog = info.inService
      ? Math.max(5, Math.min(100, Math.round(100 - (info.svc / (info.dur || 1)) * 100)))
      : Math.max(5, Math.round(100 - ahead * 15));

    almost = info.inService
      ? 'Your service is in progress'
      : ahead + ' customer' + (ahead !== 1 ? 's' : '') + ' ahead of you';

  }else{
    // Still waiting for the first answer from the backend.
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


// ── Barber profile survives a page reload ──
// (Live Server reloads on every file save, which used to empty the profile,
//  so the dashboard stopped asking the backend for the queue.)
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

// Same as before, but the barber's saved profile is loaded first, so the
// dashboard knows its shop and starts asking the backend for the queue.
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









// ═══════ BARBER ═══════
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

// function doneToken(){

//   if(S.bq.length===0)return;

//   const done=S.bq.shift();

//   S.doneCnt++;

//   const sv=S.services.find(
//     s=>s.name===done.svc
//   );

//   // if(sv)
//   //   S.earn+=sv.price; 

// if (sv) {
//   S.earn += sv.price;
// }

// // Record every completed customer for barber analytics
// if (!Array.isArray(S.barberVisits)) {
//   S.barberVisits = [];
// }

// const completedAt = new Date();

// S.barberVisits.unshift({
//   token: done.tok,
//   service: done.svc,
//   price: sv ? sv.price : 0,
//   createdAt: completedAt.toISOString(),
//   timestamp: completedAt.getTime()
// });

//   if(S.inQueue && S.myTok===done.tok){

//     const shopId=S.myShopId;
//     const shop=S.shops[shopId];

//     const visit={
//       token:done.tok,
//       shopId:shopId,
//       shop:shop ? shop.name : 'Barber Shop',
//       service:done.svc,
//       date:new Date().toLocaleDateString('en-IN',{
//         day:'2-digit',
//         month:'short',
//         year:'numeric'
//       }),

// createdAt: new Date().toISOString(),
// timestamp: Date.now()

//     };

//     S.queueHistory.unshift(visit);
//     S.lastCompletedVisit=visit;

//     // A pay-at-shop payment becomes a completed payment now.
//     const payment=S.payments.find(p=>
//       p.token===done.tok && p.status==='Pending'
//     );

//     if(payment){
//       payment.status='Paid';

//       if(!S.paymentMethods.includes('Pay at Shop')){
//         S.paymentMethods.push('Pay at Shop');
//       }
//     }

//     S.inQueue=false;
//     S.myTok=null;
//     S.mySvc='';
//     S.myShopId=null;
//   }

//   const doneEl=document.getElementById('b-done');
//   const earnEl=document.getElementById('b-earn');

//   if(doneEl) doneEl.textContent=S.doneCnt;
//   if(earnEl) earnEl.textContent='₹'+S.earn.toLocaleString('en-IN');

//   if(S.bq.length>0){

//     S.bq[0].st='cur';

//     if(S.bq.length>1)
//       S.bq[1].st='nxt';

//   }

//   renderBQ();

//   if(S.lastCompletedVisit && S.lastCompletedVisit.token===done.tok){
//     toast('✅','Your service is complete! Your visit has been added to history.');
//   }else{
//     toast('✅','Token completed! Calling next customer.');
//   }
// }

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
        // shop_name: S.barber.shopName || "Royal Cuts",
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

  // Validation
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

  // Add service
  const newService = {
    id: Date.now(),
    name: n,
    price: p,
    dur: d,
    ico: e
  };

  S.services.push(newService);

  // Save permanently in browser
  localStorage.setItem(
    'barberServices',
    JSON.stringify(S.services)
  );

  // Close modal
  closeModal('m-svc');

  // Refresh service list
  renderSvcs();

  // Reset form
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

  // SAVE UPDATED SERVICES
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
// Hair
  '💇','💇‍♂️','💇‍♀️','💈','✂️','🧴',
  
  // Beard / Shaving
  '🧔','🪒','👨‍🦰','👨‍🦱',
  
  // Beauty / Skin
  '💆','🧖','🧖‍♂️','🧖‍♀️','✨',
  
  // Nails
  '💅',
  
  // Hair styling / Coloring
  '🎨','🖌️','🌈',,
  
  // Makeup / Beauty
  '💄','👄','👁️','💋',
  
  // Spa / Grooming
  '🛁','🧼','🧽','🌸','🌺','🌹',

  // 😀 Smileys & People
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
  '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩',
  '🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣',
  '😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬',
  '🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗',
  '🤔','🤭','🤫','🤥','😶',
  '😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱',
  '😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷',

  // 👨 People
  '👶','🧒','👦','👧','🧑','👱','👨','👩',
  '🧔','👴','👵','🙍','🙎','🙅','🙆','💁',
  '🙋','🧏','🙇','🤦','🤷','👮','👷','💂',
  '🕵️','👩‍⚕️','👨‍⚕️','👩‍🏫','👨‍🏫',
  '👩‍💻','👨‍💻','👩‍🍳','👨‍🍳','👩‍🎨','👨‍🎨',
  '👩‍🚀','👨‍🚀','🤵','👰',,

  // 👍 Gestures
  '👍','👎','👌','✌️','🤞','🤟','🤘','🤙',
  '👈','👉','👆','👇','☝️','✋','🤚','🖐️',
  '🖖','👏','🙌','👐','🤲','🙏','💪','🤝',
  '👋','💅',

  // 💇 Salon / Beauty / Grooming
  '💇','💇‍♂️','💇‍♀️','💈','✂️','🪮','🪒',
  '🧔','🧴','💆','💆‍♂️','💆‍♀️',
  '🧖','🧖‍♂️','🧖‍♀️','💅','💄',
  '👄','👁️','👀','🪞',
  '🛁','🧽','🎨','🖌️','💎',
  '👑','⭐','🌟','🔥','💫',

  // 🐶 Animals
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
  '🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
  '🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆',
  '🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝',
  '🪲','🐞','🦋','🐌','🐢','🐍','🦎','🐙',
  '🦀','🐠','🐟','🐡','🦈','🐳','🐋','🦭',

  // 🌸 Nature
  '🌸','🌺','🌹','🌷','🌻','🌼','🌱','🌿',
  '☘️','🍀','🌳','🌴','🌵','🌾','🍃','🍂',
  '🍁','🍄','🌍','🌎','🌏','🌙','🌞','☀️',
  '🌤️','⛅','🌧️','⛈️','🌩️','❄️','☃️',
  '🌈','⚡','🔥','💧','🌊','⭐','🌟',

  // 🍎 Food & Drinks
  '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓',
  '🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅',
  '🍆','🥑','🥦','🥕','🌽','🌶️','🫑','🥒',
  '🥬','🧄','🧅','🥔','🍞','🥐','🥨','🧀',
  '🍔','🍟','🍕','🌭','🌮','🌯','🥗','🍿',
  '🍩','🍪','🎂','🍰','🧁','🍫','🍭','🍬',
  '☕','🍵','🧋','🥤','🧃','🍹','🍸','🍺',

  // ❤️ Symbols
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍',
  '🤎','💔','❣️','💕','💞','💓','💗','💖',
  '💘','💝',
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

  // Only successful online payments count here.
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

// ═══════ PAYMENT HISTORY (for profile) ═══════
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

 // Update top-right barber avatar
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


  
  // S.barber.name = name;
  // S.barber.phone = '+91 ' + phone;
  // S.barber.shopName = shop;
  // S.barber.address = address;
  // S.barber.openingTime = opening;
  // S.barber.closingTime = closing;
  // S.barber.payoutBank = bank;
  // S.barber.payoutLast4 = last4;


  // closeModal('m-editbarber');
  // renderBarberProfile();

  // toast('✅','Barber profile updated successfully');

S.barber.name = name;
S.barber.phone = '+91 ' + phone;
S.barber.shopName = shop;
S.barber.address = address;
S.barber.openingTime = opening;
S.barber.closingTime = closing;
S.barber.payoutBank = bank;
S.barber.payoutLast4 = last4;

// NEW
syncBarberToCustomerShop();

saveBarberProfileLocal();

closeModal('m-editbarber');

renderBarberProfile();

toast('✅','Barber profile updated successfully');

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

      toast('📷','Shop photo updated successfully');

    };

    reader.readAsDataURL(file);
  };


  input.click();
}


function logoutBarber(){

  S.role = null;

  toast(
    '👋',
    'Logged out successfully'
  );

  setTimeout(() => {
    go('s-land');
  }, 600);
}


function deleteBarberAccount(){

  const confirmed = confirm(
    'Are you sure you want to delete your barber account?'
  );

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

  toast(
    '🗑️',
    'Barber account deleted'
  );

  setTimeout(() => {
    go('s-land');
  }, 700);
}


function renderProfile(){

  const isB = S.role === 'barber';

// ═══════ BARBER PROFILE ═══════
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
        ✏️ Edit Profile
      </button>


      <button
        class="btn btn-outline btn-full"
        onclick="toast('📷','Shop photo upload coming soon!')"
      >
        📷 Update Shop Photo
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

  // ═══════ CUSTOMER PROFILE ═══════

  const userName = S.user.name || 'Customer';
  const userPhone = S.user.phone || 'Phone not available';
  const userLocation = S.user.location || 'Not set';
  const visitCount = S.queueHistory.length;
  const ratedCount = S.ratedShops.length;
  const paymentMethodText = S.paymentMethods.length
    ? S.paymentMethods.join(' · ')
    : 'No payment methods used yet';

  const initial = userName.charAt(0).toUpperCase();


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
        background:var(--gdim);
        border:3px solid var(--gold);
        color:var(--gold)
      ">
        ${initial}
      </div>

      <div style="
        font-size:22px;
        font-weight:800;
        font-family:'Syne',sans-serif
      ">
        ${userName}
      </div>

      <div style="
        color:var(--txt2);
        font-size:13px;
        margin-top:4px
      ">
        ${userPhone}
      </div>

      <span class="tag tg" style="margin-top:10px">
        Customer
      </span>

    </div>


    <div style="margin-bottom:20px">

      <div class="prow">

        <div class="prow-ico">📱</div>

        <div style="flex:1">

          <div class="prow-lab">
            Phone
          </div>

          <div class="prow-val">
            ${userPhone}
          </div>

        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <div class="prow">

        <div class="prow-ico">📍</div>

        <div style="flex:1">

          <div class="prow-lab">
            Location
          </div>

          <div class="prow-val">
            ${userLocation}
          </div>

        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <div class="prow">

        <div class="prow-ico">🎫</div>

        <div style="flex:1">

          <div class="prow-lab">
            Queue History
          </div>

          <div class="prow-val">
            ${visitCount} ${visitCount===1?'visit':'visits'}
          </div>

        </div>

        <span style="color:var(--txt2)">›</span>

      </div>


      <div class="prow">

        <div class="prow-ico">⭐</div>

        <div style="flex:1">

          <div class="prow-lab">
            Shops Rated
          </div>

          <div class="prow-val">
            ${ratedCount} ${ratedCount===1?'shop':'shops'}
          </div>

        </div>

        <span style="color:var(--txt2)">›</span>

      </div>

      <div class="prow" style="cursor:pointer" onclick="showPaymentMethods()">

        <div class="prow-ico">💳</div>

        <div style="flex:1">

          <div class="prow-lab">
            Payment Methods
          </div>

          <div class="prow-val">
            ${paymentMethodText}
          </div>

        </div>

        <span style="color:var(--txt2)">›</span>

      </div>

      <div class="prow" style="cursor:pointer" onclick="go('s-support')">

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

    <div style="font-size:15px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px">
      Payment History
    </div>

    <div style="margin-bottom:20px">
      ${renderPaymentHistory()}
    </div>


    <div style="
      display:flex;
      flex-direction:column;
      gap:10px
    ">

      <button class="btn btn-outline btn-full"
        onclick="editProfile()">
        ✏️ Edit Profile
      </button>

      <button class="btn btn-red btn-full"
        onclick="logout()">
        Logout
      </button>

      <button class="btn btn-ghost btn-full"
        style="color:var(--red)"
        onclick="toast('⚠️','Account deletion requires email confirmation')">
        Delete Account
      </button>

    </div>

    <div style="height:24px"></div>

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

    // If the current profile has no phone number,
    // check whether this number already has saved data.
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

                // Build a short "Area, City" style string
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


// ═══════ RATING ═══════
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

  if(S.ratedShops.some(r=>r.shopId===visit.shopId)){
    toast('ℹ️','You have already rated this shop.');
    return;
  }

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

  toast(
    '⭐',
    `Thanks for rating ${S.rating} star${S.rating!==1?'s':''}!`
  );

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

// ═══════ SUPPORT / CUSTOMER CARE ═══════
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

// ═══════ LOAD HTML COMPONENTS ═══════

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

// ═══════ STAY ON THE SAME SCREEN AFTER A PAGE RELOAD ═══════
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

    // A customer who is in a queue goes straight back to "My Queue".
    if(S.inQueue && v.screen !== 's-prof'){
      const tabs = document.querySelectorAll('#c-tabs .tab');
      cTab('queue', tabs[1] || null);
    }
  })();
})();

// ═══════ RATE AFTER THE SERVICE · LIVE ANALYTICS · REAL RATING ═══════
const BQ_BASE = 'https://barber-queue-backend-9z52.onrender.com';

// ── 1. Customer: work out what happened to my token, then offer the rating ──
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

  // Cannot tell, or still waiting / being served: keep the booking as it is.
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

  // The rating window opens only now, after the service.
  if(status === 'completed'){
    const nameEl = document.getElementById('rate-shop-name');
    if(nameEl) nameEl.textContent = S.lastCompletedVisit.shop;
    openModal('m-rate');
  }
};

// "Rate Shop" is hidden while the customer is still waiting; after the
// service it is offered on the empty My Queue screen.
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
  if(v && !S.ratedShops.some(r => r.shopId === v.shopId)){
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

// Send the rating to the database so the barber sees it.
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

// ── 2. Barber: real numbers from the database ──
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

  // Online payments are only known on the device that took them.
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
      ${st.week.services.length
        ? st.week.services.map(([name, count]) => `
            <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--s3)">
              <span>${esc2(name)}</span><strong>${count}</strong>
            </div>`).join('')
        : '<div class="muted">No completed services recorded this week yet.</div>'}
    </div>`;
};

function esc2(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}

// Refresh the numbers right after "Done", and every few seconds.
const _doneTokenBase = doneToken;
doneToken = async function(){
  await _doneTokenBase();
  refreshBarberStats();
};

setInterval(refreshBarberStats, 6000);
setTimeout(refreshBarberStats, 1500);

// ═══════ SHOP SEARCH + FILTER CHIPS (All / Top Rated / Nearby / Open Now) ═══════
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

// ═══════════════════════════════════════════════════════════════
// FIXES: leaveQ · restore active queue & history from the backend ·
//        working Help & Support (FAQ, assistant chat, tickets)
// Paste at the very END of script.js (after everything else).
// ═══════════════════════════════════════════════════════════════
(function(){

  const digits10 = p => String(p || '').replace(/\D/g, '').slice(-10);

  // ── 1. Every booking is stored against the customer's phone number ──
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

  // ── 2. Leave Queue (was missing) ──
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
      // 404 / "already closed" also means the booking is gone: just clear it here.
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

    // an unpaid pay-at-shop booking is no longer owed
    const pay = (S.payments || []).find(p => p.status === 'Pending' && p.shopId === S.myShopId);
    if(pay) pay.status = 'Cancelled';

    saveCurrentCustomer();
    toast('👋', 'You left the queue');

    if(document.getElementById('s-shop')?.classList.contains('active')) go('s-cust');
    renderMyQ();
    if(typeof pollCustomer === 'function') pollCustomer();
  };

  // ── 3. Restore active queue + visit history for this phone number ──
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

  // After a page reload only S.user came back — reload this number's saved
  // data too, otherwise the next save would overwrite it with an empty history.
  try{
    const v = JSON.parse(sessionStorage.getItem('barberqView') || 'null');
    if(v && v.role !== 'barber' && v.user && digits10(v.user.phone).length === 10){
      _loadCustomerBase(v.user.phone, v.user.name);
      Object.assign(S.user, v.user);
      componentsReady.then(() => restoreFromBackend(v.user.phone, true)).catch(() => {});
    }
  }catch(e){}

  // ── 4. Help & Support ──
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
      // server unreachable: keep it on this device so nothing is lost
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

  // close sheets when leaving the screen
  const _goBase = go;
  go = function(id){ closeSheets(); _goBase(id); };

  componentsReady.then(ensureSupportUI).catch(() => {});
})();

(function(){
  const MAX_IMG = 3, MAX_VID = 1;
  const MAX_IMG_BYTES = 5 * 1024 * 1024, MAX_VID_BYTES = 25 * 1024 * 1024, MAX_VID_SECONDS = 30;

  let picked = [];                       // [{file, kind, url}]
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── pictures are shrunk in the browser before upload ──
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

  // ── add the picker to the rating pop-up ──
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

  // a fresh pop-up starts empty
  const _openModalBase = openModal;
  openModal = function(id){
    if(id === 'm-rate'){ injectPicker(); resetPicked(); }
    _openModalBase(id);
  };

  // ── upload after the rating is saved ──
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

  // ── gallery on the shop page ──
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
                return m.kind === 'video'
                  ? `<div data-bq-media="${src}" data-kind="video" style="position:relative;width:88px;height:88px;border-radius:10px;overflow:hidden;background:#000;cursor:pointer">
                       <video src="${src}#t=0.1" preload="metadata" muted style="width:100%;height:100%;object-fit:cover;pointer-events:none"></video>
                       <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px">▶️</span></div>`
                  : `<img src="${src}" data-bq-media="${src}" data-kind="image" loading="lazy"
                       style="width:88px;height:88px;object-fit:cover;border-radius:10px;cursor:pointer">`;
              }).join('')}
            </div>` : ''}
        </div>`).join('')}
      <div style="height:24px"></div>`;

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
