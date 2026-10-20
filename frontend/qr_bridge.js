/* qr_bridge.js — load AFTER script.js (and after barber_ui.js if you use it).
   Publishes each barber's own QR under THEIR shop name, and shows that QR
   (not another barber's) when a customer picks "UPI QR" for that shop.
   Works on the same browser/device today; other devices need the backend
   endpoint (see notes). Does not edit any existing function, only wraps. */
(function () {
  'use strict';
  const PREFIX = 'bqShopPay:';
  const key = n => PREFIX + String(n || '').trim().toLowerCase();
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };

  /* Collect this barber's QR from either settings screen */
  function myPay() {
    const old = rd('barberUpi') || {};              // your existing Settings
    const m = rd('bw_media_v1') || {};              // new Settings (barber_ui.js)
    return { qr: m.qr || old.qr || '', id: m.upiId || old.id || '' };
  }
  function publish() {
    try {
      const shop = S && S.barber && S.barber.shopName;
      if (!shop) return;
      const p = myPay();
      if (p.qr) localStorage.setItem(key(shop), JSON.stringify(p));
      else localStorage.removeItem(key(shop));
    } catch (e) { console.warn('QR publish failed', e); }
  }

  /* Re-publish after any save that can change the QR */
  ['bqSaveSettings', 'saveBarberProfile', 'syncBarberToCustomerShop'].forEach(n => {
    const f = window[n];
    if (typeof f !== 'function') return;
    window[n] = function () { const r = f.apply(this, arguments); publish(); return r; };
  });
  window.addEventListener('storage', () => { /* other tab saved */ });
  setInterval(publish, 3000);
  publish();

  /* Customer side: use the QR that belongs to the selected shop */
  const _upd = window.updateUpiQr;
  window.updateUpiQr = async function () {
    await _upd.apply(this, arguments);
    try {
      if (S.shopPay) return;                         // server already gave one
      const p = S.pendingJoin, s = p && S.shops[p.shopId];
      const hit = s && rd(key(s.name));
      if (hit && hit.qr) {
        S.shopPay = { upi_qr_url: '', upi_id: hit.id || '', _local: hit.qr };
        const opt = document.getElementById('pay-upi_qr');
        if (opt) opt.style.display = 'flex';
      }
    } catch (e) { console.warn(e); }
  };
  const _sel = window.selectPayMethod;
  window.selectPayMethod = function (method) {
    _sel.apply(this, arguments);
    const pay = S.shopPay;
    if (method === 'upi_qr' && pay && pay._local) {
      const sec = document.getElementById('upi-qr-section');
      const img = document.getElementById('upi-qr-img');
      const id = document.getElementById('upi-id-text');
      if (sec) sec.style.display = 'block';
      if (img) img.src = pay._local;
      if (id) id.textContent = pay.upi_id ? 'UPI ID: ' + pay.upi_id : '';
    }
  };
})();
