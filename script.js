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
    {tok:3,name:'Rajesh K.',svc:'Hair Cut',dur:20,st:'cur',eta:0},
    {tok:4,name:'Amit S.',svc:'Beard Trim',dur:15,st:'nxt',eta:20},
    {tok:5,name:'Priya M.',svc:'Hair Color',dur:60,st:'wait',eta:35},
    {tok:6,name:'Suresh P.',svc:'Hair Cut',dur:20,st:'wait',eta:95},
    {tok:7,name:'Anuj T.',svc:'Hair Spa',dur:90,st:'wait',eta:115},
    {tok:8,name:'Deepa R.',svc:'Facial',dur:45,st:'wait',eta:205},
  ],

  earn:1840,
  doneCnt:8,
  onlineCollected:0

};


// ═══════ NAV ═══════
function go(id){

  const cur=document.querySelector('.screen.active');

  if(cur)S.prev=cur.id;

  document.querySelectorAll('.screen')
    .forEach(s=>s.classList.remove('active'));

  document.getElementById(id).classList.add('active');

  if(id==='s-cust'){
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

        <div style="width:48px;height:48px;border-radius:12px;background:${s.clr}20;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">
          ${s.ico}
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


function openPayModal() {
    const p = S.pendingJoin;

    if (!p) {
        toast('⚠️', 'No pending queue request');
        return;
    }

    const amountEl = document.getElementById('pay-amt');
    const serviceEl = document.getElementById('pay-svc');

    if (amountEl) {
        amountEl.textContent = '₹' + p.price;
    }

    if (serviceEl) {
        serviceEl.textContent =
            p.svcName + ' · Token #' + p.tok;
    }

    // Always show QR when payment modal opens
    // updateUpiQr();
    selectPayMethod('online');
    openModal('m-pay');
}


function selectPayMethod(method) {
    S.payMethod = method;

    document
        .querySelectorAll('.pay-opt')
        .forEach(el => {
            el.classList.remove('sel');
        });

    const selected =
        document.getElementById('pay-' + method);

    if (selected) {
        selected.classList.add('sel');
    }

    const qrSection =
        document.getElementById('upi-qr-section');

    const button =
        document.getElementById('pay-btn-label');

    // Show QR only for online payment
    if (qrSection) {
        qrSection.style.display =
            method === 'online' ? 'block' : 'none';
    }

    if (!button) return;

    if (method === 'shop') {
        button.textContent =
            'Confirm & Join (Pay at Shop)';
    } else {
        button.textContent =
            'Pay & Join Queue';
    }
}


function processPayment() {
    const p = S.pendingJoin;

    if (!p) {
        toast('⚠️', 'No pending queue request');
        return;
    }

    const s = S.shops[p.shopId];

    if (!s) {
        toast('⚠️', 'Shop information not found');
        return;
    }

    if (S.payMethod === 'online') {

        const button =
            document.getElementById('pay-btn-label');

        if (button) {
            button.innerHTML =
                '<span class="spinner"></span> Processing…';
        }

        /*
         * DEMO PAYMENT
         * Replace this with Razorpay/backend
         * verification for real payments.
         */
        setTimeout(() => {
            finalizeJoin(p, s, true);
        }, 1000);

        return;
    }

    finalizeJoin(p, s, false);
}


function finalizeJoin(p, s, paidOnline) {

    S.inQueue = true;
    S.myTok = p.tok;
    S.mySvc = p.svcName;
    S.myShopId = p.shopId;

    s.q++;

    if (!Array.isArray(S.payments)) {
        S.payments = [];
    }

    S.payments.unshift({
        id:
            'PAY' +
            Date.now()
                .toString()
                .slice(-8),

        shop: s.name,
        svc: p.svcName,
        amount: p.price,

        method:
            paidOnline
                ? 'Online'
                : 'Pay at Shop',

        status:
            paidOnline
                ? 'Paid'
                : 'Pending',

        date:
            new Date().toLocaleDateString(
                'en-IN',
                {
                    day: '2-digit',
                    month: 'short'
                }
            )
    });

    if (paidOnline) {

        if (typeof S.onlineCollected !== 'number') {
            S.onlineCollected = 0;
        }

        S.onlineCollected += p.price;
    }

    closeModal('m-pay');

    const tokenEl =
        document.getElementById('ok-tok');

    const subEl =
        document.getElementById('ok-sub');

    const serviceEl =
        document.getElementById('ok-svc');

    if (tokenEl) {
        tokenEl.textContent = S.myTok;
    }

    if (subEl) {
        subEl.textContent =
            'Token #' +
            S.myTok +
            ' · ~' +
            s.wait +
            ' min wait';
    }

    if (serviceEl) {
        serviceEl.textContent = S.mySvc;
    }

    const note =
        document.getElementById('ok-pay-note');

    if (note) {

        note.style.color =
            paidOnline
                ? 'var(--green)'
                : 'var(--txt2)';

        note.textContent =
            paidOnline
                ? '✅ Payment of ₹' +
                  p.price +
                  ' received'
                : '💵 Pay ₹' +
                  p.price +
                  ' at the shop';
    }

    openModal('m-ok');

    toast(
        paidOnline ? '✅' : '🎫',
        paidOnline
            ? 'Payment successful!'
            : 'Added to queue — pay at shop'
    );

    setTimeout(() => {

        toast(
            '🔔',
            'Heads up! 2 people ahead of you in queue'
        );

    }, 12000);
}

// ═══════════════════════════════════════ UPI QR CODE ═══════════════════════════════════════

function updateUpiQr() {

    const qrImg = document.getElementById('upi-qr-img');

    if (!qrImg) {
        console.warn('UPI QR image element not found');
        return;
    }

    // Use the existing QR.webp poster
    qrImg.src = 'QR.webp';
    qrImg.alt = 'UPI QR Code';

    // Crop the poster and show ONLY the QR area
    qrImg.style.position = 'absolute';
    qrImg.style.width = '227px';
    qrImg.style.height = 'auto';
    qrImg.style.maxWidth = 'none';

    // QR position inside your 927 × 1288 image
    qrImg.style.left = '-23px';
    qrImg.style.top = '-60px';

    qrImg.style.padding = '0';
    qrImg.style.margin = '0';
    qrImg.style.borderRadius = '0';
}
// ═══════════════════════════════════════ COPY UPI ID ═══════════════════════════════════════

function openPayModal() {

    const p = S.pendingJoin;

    if (!p) {
        toast('⚠️', 'No pending queue request');
        return;
    }

    const amountEl = document.getElementById('pay-amt');
    const serviceEl = document.getElementById('pay-svc');

    if (amountEl) {
        amountEl.textContent = '₹' + p.price;
    }

    if (serviceEl) {
        serviceEl.textContent =
            p.svcName + ' · Token #' + p.tok;
    }

    updateUpiQr();

    selectPayMethod('online');

    openModal('m-pay');
}

function openPayModal(){

  const p=S.pendingJoin;

  if(!p)return;

  document.getElementById('pay-amt').textContent='₹'+p.price;

  document.getElementById('pay-svc').textContent=
    p.svcName+' · Token #'+p.tok;

  updateUpiQr(p.price, p.svcName+' - Token '+p.tok);

  selectPayMethod('online');

  openModal('m-pay');
}

function selectPayMethod(m){

  S.payMethod=m;

  document.querySelectorAll('.pay-opt')
  .forEach(el=>el.classList.remove('sel'));

  document.getElementById('pay-'+m).classList.add('sel');

  document.getElementById('pay-btn-label').textContent=
    m==='shop'
    ?'Confirm & Join (Pay at Shop)'
    :'Pay & Join Queue';

  const qrSection=document.getElementById('upi-qr-section');
  if(qrSection) qrSection.style.display = m==='online' ? 'block' : 'none';
}

function processPayment(){

  const p=S.pendingJoin;

  if(!p)return;

  const s=S.shops[p.shopId];

  if(S.payMethod==='online'){

    document.getElementById('pay-btn-label').innerHTML=
      '<span class="spinner"></span> Processing…';

    setTimeout(()=>{
      finalizeJoin(p,s,true);
    },1000);

  }else{

    finalizeJoin(p,s,false);

  }
}


function finalizeJoin(p,s,paidOnline){

  S.inQueue=true;

  S.myTok=p.tok;

  S.mySvc=p.svcName;

  S.myShopId=p.shopId;

  s.q++;

  S.payments.unshift({
    id:'PAY'+Date.now().toString().slice(-8),
    shop:s.name,
    svc:p.svcName,
    amount:p.price,
    method:paidOnline?'Online':'Pay at Shop',
    status:paidOnline?'Paid':'Pending',
    date:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short'})
  });

  if(paidOnline){
    S.onlineCollected+=p.price;

    if(!S.paymentMethods.includes('Online Payment')){
      S.paymentMethods.push('Online Payment');
    }
  }

  closeModal('m-pay');

  document.getElementById('ok-tok').textContent=S.myTok;

  document.getElementById('ok-sub').textContent=
    'Token #'+S.myTok+' · ~'+s.wait+' min wait';

  document.getElementById('ok-svc').textContent=S.mySvc;

  const note=document.getElementById('ok-pay-note');

  if(note){
    note.style.color=paidOnline?'var(--green)':'var(--txt2)';
    note.textContent=paidOnline
      ?'✅ Payment of ₹'+p.price+' received'
      :'💵 Pay ₹'+p.price+' at the shop';
  }

  openModal('m-ok');

  toast(
    paidOnline?'✅':'🎫',
    paidOnline?'Payment successful!':'Added to queue — pay at shop'
  );

  setTimeout(
    ()=>toast('🔔','Heads up! 2 people ahead of you in queue'),
    12000
  );
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

  if(sv)
    S.earn+=sv.price;

  // Record a customer visit ONLY when the customer's own queue token
  // is actually completed. Joining a queue does not count as a visit.
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
      })
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


const walkinNames=[
  'Vikram R.',
  'Sanjeev P.',
  'Kavya S.',
  'Rohit M.',
  'Meera K.',
  'Arjun D.',
  'Sneha T.'
];

let nextTok=9;


function addDemoCustomer(){

  const sv=
    S.services[
      Math.floor(
        Math.random()*S.services.length
      )
    ];

  const last=
    S.bq[S.bq.length-1];

  const n={
    tok:nextTok++,
    name:
      walkinNames[
        Math.floor(
          Math.random()*walkinNames.length
        )
      ],
    svc:sv.name,
    dur:sv.dur,
    st:'wait',
    eta:(last?.eta||10)+sv.dur
  };

  S.bq.push(n);

  if(S.bq.length===1)
    S.bq[0].st='cur';

  else if(S.bq.length===2)
    S.bq[1].st='nxt';

  renderBQ();

  toast(
    '👋',
    'New customer added to queue!'
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

  const n=
    document.getElementById('sn').value.trim();

  const p=
    parseInt(
      document.getElementById('sp').value
    );

  const d=
    parseInt(
      document.getElementById('sd').value
    );

  const e=
    document.getElementById('se').value||'💼';

  if(!n||isNaN(p)||isNaN(d)){

    toast(
      '⚠️',
      'Please fill all fields'
    );

    return;
  }

  S.services.push({
    id:S.services.length+1,
    name:n,
    price:p,
    dur:d,
    ico:e
  });

  closeModal('m-svc');

  renderSvcs();

  toast(
    '✅',
    `Service "${n}" added!`
  );

  document.getElementById('sn').value='';
  document.getElementById('sp').value='';
  document.getElementById('sd').value='';
  document.getElementById('se').value='💇';
}


function delSvc(i){

  const n=S.services[i].name;

  S.services.splice(i,1);

  renderSvcs();

  toast(
    '🗑️',
    `"${n}" removed`
  );
}


function renderAnalytics(){

  const el=
    document.getElementById('b-analytics');

  if(!el)return;

  const days=[
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun'
  ];

  const vals=[
    12,
    18,
    9,
    22,
    28,
    35,
    16
  ];

  const mx=Math.max(...vals);

  el.innerHTML=`

    <div class="card card-p"
    style="margin-bottom:14px">

      <div style="font-size:12px;color:var(--txt2);margin-bottom:4px">
        Total Revenue (This Week)
      </div>

      <div style="font-size:34px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold)">
        ₹12,840
      </div>

      <div style="font-size:13px;color:var(--green);margin-top:4px">
        ↑ 18% from last week
      </div>

    </div>

    <div class="card card-p"
    style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">

      <div>
        <div style="font-size:12px;color:var(--txt2);margin-bottom:4px">
          Collected Online (Today)
        </div>
        <div style="font-size:22px;font-weight:800;font-family:'Syne',sans-serif;color:var(--cyan)">
          ₹${S.onlineCollected.toLocaleString('en-IN')}
        </div>
      </div>

      <span style="font-size:30px">📲</span>

    </div>


    <div class="card card-p"
    style="margin-bottom:14px">

      <div style="font-size:15px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:16px">
        Customers This Week
      </div>

      <div class="abar-wrap">

        ${vals.map((v,i)=>`

          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">

            <div class="abar ${i===4?'hi':''}"
            style="height:${Math.round(v/mx*68)}px">
            </div>

            <div class="abar-label">
              ${days[i]}
            </div>

          </div>

        `).join('')}

      </div>

    </div>


    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">

      <div class="stat"
      style="text-align:center">

        <div class="stat-n"
        style="color:var(--green)">
          140
        </div>

        <div class="stat-l">
          Total Clients
        </div>

      </div>


      <div class="stat"
      style="text-align:center">

        <div class="stat-n"
        style="color:var(--gold)">
          4.8★
        </div>

        <div class="stat-l">
          Avg Rating
        </div>

      </div>

    </div>


    <div class="card card-p">

      <div style="font-size:15px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:14px">
        Top Services
      </div>

      ${S.services.map((s,i)=>{

        const pct=[
          52,
          31,
          8,
          6,
          3
        ][i]||2;

        return`

          <div style="margin-bottom:12px">

            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">

              <span>
                ${s.ico} ${s.name}
              </span>

              <span style="color:var(--gold);font-weight:500">
                ${pct}%
              </span>

            </div>

            <div class="pbar">

              <div class="pfill"
              style="width:${pct}%">
              </div>

            </div>

          </div>

        `

      }).join('')}

    </div>

    <div style="height:20px"></div>

  `;
}


function bTab(name,el){

  document.getElementById('b-queue-tab').style.display=
    name==='queue'?'block':'none';

  document.getElementById('b-svc-tab').style.display=
    name==='svc'?'block':'none';

  document.getElementById('b-analytics-tab').style.display=
    name==='analytics'?'block':'none';

  if(el){

    document.querySelectorAll('#b-tabs .tab')
    .forEach(t=>t.classList.remove('on'));

    el.classList.add('on');
  }

  if(name==='svc')
    renderSvcs();

  if(name==='analytics')
    renderAnalytics();
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

// ═══════ PROFILE ═══════
function renderProfile(){

  const isB = S.role === 'barber';

  // BARBER PROFILE
  if(isB){

    document.getElementById('prof-body').innerHTML = `

      <div style="text-align:center;padding:24px 0 28px">

        <div class="av"
        style="
          width:80px;
          height:80px;
          margin:0 auto 14px;
          font-size:30px;
          background:var(--cdim);
          border:3px solid var(--cyan);
          color:var(--cyan)
        ">
          R
        </div>

        <div style="
          font-size:22px;
          font-weight:800;
          font-family:'Syne',sans-serif
        ">
          Rahul Sharma
        </div>

        <div style="
          color:var(--txt2);
          font-size:13px;
          margin-top:4px
        ">
          Royal Cuts · Hazratganj, Lucknow
        </div>

        <span class="tag tgreen" style="margin-top:10px">
          Verified Barber
        </span>

      </div>

      <div style="margin-bottom:20px">

        <div class="prow">
          <div class="prow-ico">📱</div>
          <div style="flex:1">
            <div class="prow-lab">Phone</div>
            <div class="prow-val">+91 98765 43210</div>
          </div>
          <span style="color:var(--txt2)">›</span>
        </div>

        <div class="prow">
          <div class="prow-ico">🏪</div>
          <div style="flex:1">
            <div class="prow-lab">Shop Name</div>
            <div class="prow-val">Royal Cuts</div>
          </div>
          <span style="color:var(--txt2)">›</span>
        </div>

        <div class="prow">
          <div class="prow-ico">📍</div>
          <div style="flex:1">
            <div class="prow-lab">Address</div>
            <div class="prow-val">Hazratganj, Lucknow</div>
          </div>
          <span style="color:var(--txt2)">›</span>
        </div>

        <div class="prow">
          <div class="prow-ico">🕐</div>
          <div style="flex:1">
            <div class="prow-lab">Hours</div>
            <div class="prow-val">9:00 AM – 8:00 PM</div>
          </div>
          <span style="color:var(--txt2)">›</span>
        </div>

        <div class="prow">
          <div class="prow-ico">⭐</div>
          <div style="flex:1">
            <div class="prow-lab">My Rating</div>
            <div class="prow-val">4.8 / 5.0</div>
          </div>
          <span style="color:var(--txt2)">›</span>
        </div>

        <div class="prow" style="cursor:pointer" onclick="toast('💳','Payout account: HDFC Bank ••••4821')">
          <div class="prow-ico">🏦</div>
          <div style="flex:1">
            <div class="prow-lab">Payout Account</div>
            <div class="prow-val">HDFC Bank ••••4821</div>
          </div>
          <span style="color:var(--txt2)">›</span>
        </div>

        <div class="prow" style="cursor:pointer" onclick="go('s-support')">
          <div class="prow-ico">🎧</div>
          <div style="flex:1">
            <div class="prow-lab">Support</div>
            <div class="prow-val">Help &amp; Support</div>
          </div>
          <span style="color:var(--txt2)">›</span>
        </div>

      </div>

      <div style="font-size:15px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:12px">
        Online Payments Collected Today
      </div>

      <div class="card card-p" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--txt2);font-size:13px">Via Barber-Q Pay</span>
        <span style="font-size:22px;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold)">
          ₹${S.onlineCollected.toLocaleString('en-IN')}
        </span>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">

        <button class="btn btn-outline btn-full"
          onclick="editProfile()">
          ✏️ Edit Profile
        </button>

        <button class="btn btn-outline btn-full"
          onclick="toast('📷','Shop photo upload coming soon!')">
          📷 Update Shop Photo
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
