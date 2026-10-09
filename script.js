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
  myTok:7,
  mySvc:'Hair Cut',
  myShopId:0,

  selectedSvc:0,
  selectedShop:null,

  pendingJoin:null,
  payMethod:'online',
  payments:[],

  // Customer activity is recorded only after real actions.
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
    {id:3,name:'Classic Barber',owner:'Suresh Kumar',rating:4.4,rev:98,addr:'Chowk, Lucknow',cur:5,q:8,wait:36,open:false,clr:'#a29bfe',ico:'🪒',svcs:[0,1]},
  ],

  bq:[
    // {tok:3,name:'Rajesh K.',svc:'Hair Cut',dur:20,st:'cur',eta:0},
    // {tok:4,name:'Amit S.',svc:'Beard Trim',dur:15,st:'nxt',eta:20},
    // {tok:5,name:'Priya M.',svc:'Hair Color',dur:60,st:'wait',eta:35},
    // {tok:6,name:'Suresh P.',svc:'Hair Cut',dur:20,st:'wait',eta:95},
    // {tok:7,name:'Anuj T.',svc:'Hair Spa',dur:90,st:'wait',eta:115},
    // {tok:8,name:'Deepa R.',svc:'Facial',dur:45,st:'wait',eta:205},
  ],

  earn:0,
  doneCnt:0,
  onlineCollected:0

};







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

// function syncBarberToCustomerShop(){

//   const b = S.barber;

//   if(!b || !b.name || !b.shopName) return;

//   let shop = S.shops.find(s => s.isBarberProfile);

//   if(!shop){
//     shop = { id: S.shops.length, isBarberProfile: true, cur: 0, q: 0, wait: 0 };
//     S.shops.push(shop);
//   }

//   Object.assign(shop, {
//     name:        b.shopName,
//     owner:       b.name,
//     rating:      Number(b.rating) || 0,
//     rev:         Number(b.ratingCount) || 0,
//     addr:        b.address || 'Address not set',
//     open:        S.shopOpen,
//     clr:         '#00d4aa',
//     ico:         '✂️',
//     svcs:        S.services.map((_, i) => i),
//     photo:       b.photo || '',
//     phone:       b.phone || '',
//     openingTime: b.openingTime || '',
//     closingTime: b.closingTime || ''
//   });

//   syncShopStats();      // fills in q / cur / wait and publishes
// }

// function syncBarberToCustomerShop() {

//   const b = S.barber;

//   if (!b || !b.name || !b.shopName) {
//     return;
//   }

//   const existing = S.shops.find(s => s.isBarberProfile === true);

//   const shopData = {
//     id: existing ? existing.id : S.shops.length,
//     name: b.shopName,
//     owner: b.name,
//     rating: Number(b.rating) || 0,
//     rev: Number(b.ratingCount) || 0,
//     addr: b.address || 'Address not set',
//     cur: 0,
//     q: 0,
//     wait: 0,
//     open: S.shopOpen,
//     clr: '#00d4aa',
//     ico: '✂️',
//     svcs: [0,1,2,3,4],
//     isBarberProfile: true,
//     photo: b.photo || '',
//     phone: b.phone || '',
//     openingTime: b.openingTime || '',
//     closingTime: b.closingTime || ''
//   };

//   if (existing) {

//     const index = S.shops.findIndex(
//       s => s.isBarberProfile === true
//     );

//     S.shops[index] = shopData;

//   } else {

//     S.shops.push(shopData);

//   }
// }
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

function demoAs(r){
  S.role=r;
  go(r==='customer'?'s-cust':'s-barb');
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
            console.error("OTP input fields are missing.");
            return;
        }

        const enteredOTP = fields.map(el => el.value.trim()).join("");

        console.log("Entered OTP:", enteredOTP);
        console.log("Generated OTP:", generatedOTP);

        if (enteredOTP !== generatedOTP || generatedOTP === "") {
            toast("⚠️", "Invalid OTP — please try again");

            fields.forEach(el => el.value = "");
            fields[0].focus();
            return;
        }

        // Wait for all split HTML files to finish loading.
        try {
            await componentsReady;
        } catch (error) {
            console.error("BarberQ components failed to load:", error);
            toast("⚠️", "Please wait for BarberQ to finish loading.");
            return;
        }

        const roleScreen = document.getElementById("s-role");

        if (!roleScreen) {
            console.error("s-role was not loaded. Check role.html and index.html.");
            toast("⚠️", "Role screen could not be loaded.");
            return;
        }

        // Navigate only after the target screen definitely exists.
        go("s-role");

        setTimeout(() => {
            toast("✅", "OTP verified successfully!");
        }, 100);
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

const UPI_VPA = 'yokshitajaiswal@okicici';
const UPI_PAYEE_NAME = 'Barber-Q';

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


function updateUpiQr() {

    const qrImg = document.getElementById('upi-qr-img');

    if (!qrImg) {
        console.warn('UPI QR image element not found');
        return;
    }

    qrImg.src = 'QR.webp';
    qrImg.alt = 'UPI QR Code';

    qrImg.style.position = 'absolute';
    qrImg.style.width = '227px';
    qrImg.style.height = 'auto';
    qrImg.style.maxWidth = 'none';
    qrImg.style.left = '-23px';
    qrImg.style.top = '-60px';
    qrImg.style.padding = '0';
    qrImg.style.margin = '0';
    qrImg.style.borderRadius = '0';
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

    const qrSection = document.getElementById('upi-qr-section');
    if (qrSection) qrSection.style.display = method === 'online' ? 'block' : 'none';

    const button = document.getElementById('pay-btn-label');
    if (!button) return;

    button.textContent = method === 'shop'
        ? 'Confirm & Join (Pay at Shop)'
        : 'Pay & Join Queue';
}


async function processPayment() {
    const p = S.pendingJoin;
    if (!p) { toast('⚠️', 'No pending queue request'); return; }

    const s = S.shops[p.shopId];
    if (!s) { toast('⚠️', 'Shop information not found'); return; }

    if (S.payMethod !== 'online') {
        finalizeJoin(p, s, false);
        return;
    }

    const button = document.getElementById('pay-btn-label');
    if (button) button.innerHTML = '<span class="spinner"></span> Creating order…';

    try {
        const orderRes = await fetch('http://127.0.0.1:5000/api/payments/create-order', {
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
            name: 'Barber-Q',
            description: p.svcName + ' · Token #' + p.tok,
            handler: async function (response) {

                const verifyRes = await fetch('http://127.0.0.1:5000/api/payments/verify', {
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
                    finalizeJoin(p, s, true);
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
            theme: { color: '#f5c842' }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (err) {
        console.error(err);
        toast('⚠️', 'Could not start payment — please try again');
        if (button) button.textContent = 'Pay & Join Queue';
    }
}


function finalizeJoin(p, s, paidOnline) {

    S.inQueue = true;
    S.myTok = p.tok;
    S.mySvc = p.svcName;
    S.myShopId = p.shopId;

    s.q++;

    if (!Array.isArray(S.payments)) S.payments = [];

    // S.payments.unshift({
    //     id: 'PAY' + Date.now().toString().slice(-8),
    //     shop: s.name,
    //     svc: p.svcName,
    //     amount: p.price,
    //     method: paidOnline ? 'Online' : 'Pay at Shop',
    //     status: paidOnline ? 'Paid' : 'Pending',
    //     date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    // });

S.payments.unshift({
  id: 'PAY' + Date.now().toString().slice(-8),
  shop: s.name,
  shopId: p.shopId,
  token: p.tok,
  svc: p.svcName,
  amount: p.price,
  method: paidOnline ? 'Online' : 'Pay at Shop',
  status: paidOnline ? 'Paid' : 'Pending',
  date: new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short'
  }),
  createdAt: new Date().toISOString(),
  timestamp: Date.now()
});











    if (paidOnline) {
        if (typeof S.onlineCollected !== 'number') S.onlineCollected = 0;
        S.onlineCollected += p.price;

        if (!S.paymentMethods.includes('Online Payment')) {
            S.paymentMethods.push('Online Payment');
        }
    } else {
        if (!S.paymentMethods.includes('Pay at Shop')) {
            S.paymentMethods.push('Pay at Shop');
        }
    }

    closeModal('m-pay');

    const tokenEl = document.getElementById('ok-tok');
    const subEl = document.getElementById('ok-sub');
    const serviceEl = document.getElementById('ok-svc');

    if (tokenEl) tokenEl.textContent = S.myTok;
    if (subEl) subEl.textContent = 'Token #' + S.myTok + ' · ~' + s.wait + ' min wait';
    if (serviceEl) serviceEl.textContent = S.mySvc;

    const note = document.getElementById('ok-pay-note');
    if (note) {
        note.style.color = paidOnline ? 'var(--green)' : 'var(--txt2)';
        note.textContent = paidOnline
            ? '✅ Payment of ₹' + p.price + ' received'
            : '💵 Pay ₹' + p.price + ' at the shop';
    }

    openModal('m-ok');

    toast(
        paidOnline ? '✅' : '🎫',
        paidOnline ? 'Payment successful!' : 'Added to queue — pay at shop'
    );

    setTimeout(() => {
        toast('🔔', 'Heads up! 2 people ahead of you in queue');
    }, 12000);
}

function leaveQ(){

  S.inQueue=false;

  toast('👋','You left the queue');

  if(S.selectedShop!==null)
    openShop(S.selectedShop);
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


function doneToken(){

  if(S.bq.length===0)return;

  const done=S.bq.shift();

  S.doneCnt++;

  const sv=S.services.find(
    s=>s.name===done.svc
  );

  // if(sv)
  //   S.earn+=sv.price; 

if (sv) {
  S.earn += sv.price;
}

// Record every completed customer for barber analytics
if (!Array.isArray(S.barberVisits)) {
  S.barberVisits = [];
}

const completedAt = new Date();

S.barberVisits.unshift({
  token: done.tok,
  service: done.svc,
  price: sv ? sv.price : 0,
  createdAt: completedAt.toISOString(),
  timestamp: completedAt.getTime()
});

























  if(S.inQueue && S.myTok===done.tok){

    const shopId=S.myShopId;
    const shop=S.shops[shopId];

    const visit={
      token:done.tok,
      shopId:shopId,
      shop:shop ? shop.name : 'Barber Shop',
      service:done.svc,
      date:new Date().toLocaleDateString('en-IN',{
        day:'2-digit',
        month:'short',
        year:'numeric'
      }),












createdAt: new Date().toISOString(),
timestamp: Date.now()










    };

    S.queueHistory.unshift(visit);
    S.lastCompletedVisit=visit;

    // A pay-at-shop payment becomes a completed payment now.
    const payment=S.payments.find(p=>
      p.token===done.tok && p.status==='Pending'
    );

    if(payment){
      payment.status='Paid';

      if(!S.paymentMethods.includes('Pay at Shop')){
        S.paymentMethods.push('Pay at Shop');
      }
    }

    S.inQueue=false;
    S.myTok=null;
    S.mySvc='';
    S.myShopId=null;
  }

  const doneEl=document.getElementById('b-done');
  const earnEl=document.getElementById('b-earn');

  if(doneEl) doneEl.textContent=S.doneCnt;
  if(earnEl) earnEl.textContent='₹'+S.earn.toLocaleString('en-IN');

  if(S.bq.length>0){

    S.bq[0].st='cur';

    if(S.bq.length>1)
      S.bq[1].st='nxt';

  }

  renderBQ();

  if(S.lastCompletedVisit && S.lastCompletedVisit.token===done.tok){
    toast('✅','Your service is complete! Your visit has been added to history.');
  }else{
    toast('✅','Token completed! Calling next customer.');
  }
}


function skipToken(){

  if(S.bq.length<2){

    toast(
      '⚠️',
      'Only one customer in queue'
    );

    return;
  }

  const sk=S.bq.shift();

  sk.st='wait';

  const last=S.bq[S.bq.length-1];

  sk.eta=(last?.eta||10)+sk.dur;

  S.bq.push(sk);

  S.bq[0].st='cur';

  if(S.bq.length>1)
    S.bq[1].st='nxt';

  renderBQ();

  toast(
    '⏭️',
    'Token skipped to end of queue.'
  );
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

function addWalkinCustomer() {

  const nameInput = document.getElementById('walkin-name');
  const serviceSelect = document.getElementById('walkin-service');

  const name = nameInput.value.trim();

  if (!name) {
    toast('⚠️', 'Please enter customer name');
    nameInput.focus();
    return;
  }

  const serviceId = Number(serviceSelect.value);

  const service = S.services.find(
    s => s.id === serviceId
  );

  if (!service) {
    toast('⚠️', 'Please select a service');
    return;
  }

  const customer = {
    tok: nextTok++,
    name: name,
    svc: service.name,
    dur: service.dur,
    st: S.bq.length === 0 ? 'cur' : 'wait',
    eta: calculateWalkinETA()
  };

  S.bq.push(customer);

  closeModal('m-walkin');

  renderBQ();

  toast(
    '✅',
    `${name} added to the queue`
  );
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
    const name = document.getElementById('ep-name').value.trim();
    const phone = document.getElementById('ep-phone').value.trim();
    const locEl = document.getElementById('ep-location');
    const location = locEl ? locEl.value.trim() : '';

    if (name === '') {
        toast('⚠️', 'Please enter a valid name');
        return;
    }

    if (!/^\d{10}$/.test(phone)) {
        toast('⚠️', 'Please enter a valid 10-digit phone number');
        return;
    }

    S.user.name = name;
    S.user.phone = '+91 ' + phone;
    S.user.location = location || 'Not set';

    closeModal('m-editprof');
    updateUserAvatar();
    renderProfile();
    toast('✅', 'Profile updated successfully');
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
    shopId:visit.shopId,
    shop:visit.shop,
    rating:S.rating,
    review:review,
    date:new Date().toLocaleDateString('en-IN',{
      day:'2-digit',
      month:'short',
      year:'numeric'
    })
  });

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

      <button class="card card-p"
      style="text-align:center;border:none;cursor:pointer"
      onclick="openModal('m-chat')">
        <div style="font-size:26px;margin-bottom:6px">💬</div>
        <div style="font-size:13px;font-weight:600">Live Chat</div>
        <div style="font-size:11px;color:var(--txt2);margin-top:2px">Avg reply: 2 min</div>
      </button>

      <a href="mailto:support@barberq.app"
      class="card card-p"
      style="text-decoration:none;color:var(--txt);text-align:center;display:block">
        <div style="font-size:26px;margin-bottom:6px">✉️</div>
        <div style="font-size:13px;font-weight:600">Email Us</div>
        <div style="font-size:11px;color:var(--txt2);margin-top:2px">support@barberq.app</div>
      </a>

      <button class="card card-p"
      style="text-align:center;border:none;cursor:pointer"
      onclick="toast('📄','Redirecting to raise a ticket...')">
        <div style="font-size:26px;margin-bottom:6px">📄</div>
        <div style="font-size:13px;font-weight:600">Raise a Ticket</div>
        <div style="font-size:11px;color:var(--txt2);margin-top:2px">For payment issues</div>
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

function toggleFaq(i){

  const el=document.getElementById('faq-a-'+i);
  const arrow=document.getElementById('faq-arrow-'+i);

  const open = el.style.display==='block';

  el.style.display = open?'none':'block';
  arrow.textContent = open?'＋':'－';
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


// ═══════ REAL-TIME SIM ═══════
setInterval(()=>{
  const barberScreen = document.getElementById('s-barb');
  const queueTab = document.getElementById('b-queue-tab');

  if(
    barberScreen &&
    queueTab &&
    barberScreen.classList.contains('active') &&
    queueTab.style.display !== 'none' &&
    S.bq.length < 9 &&
    Math.random() < 0.35
  ){
    addDemoCustomer();
  }
},9000);


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
