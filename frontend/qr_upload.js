/* =========================================================
   BARBERQ — PER-SHOP UPI QR: UPLOAD TO SERVER + SHOW TO CUSTOMERS
   Paste at the VERY END of script.js (after everything else).
   Barber: Settings → Save now uploads the QR / UPI ID to the backend.
   Customer: the Pay popup loads that shop's own QR from the backend.
   ========================================================= */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  let pickedQr = null;   // the QR file the barber chose in Settings

  /* ---- remember the chosen file (script.js only keeps a preview) ---- */
  const basePreview = window.bqPreviewImage;
  window.bqPreviewImage = function (input, previewId) {
    const out = basePreview.apply(this, arguments);
    if (previewId === "bq-upi-qr-preview" && input && input.files && input.files[0]) {
      pickedQr = input.files[0];
    }
    return out;
  };

  /* ---- shrink big phone photos; white background so QR never turns black ---- */
  function toPng(file) {
    return new Promise(resolve => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const g = c.getContext("2d");
        g.fillStyle = "#fff";
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => resolve(b || file), "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function uploadUpi(file, upiId) {
    const shop = S.barber && S.barber.shopName;
    const msg = $("bq-settings-message");
    if (!shop) {
      toast("⚠️", "Register your shop in Profile first");
      return false;
    }
    const fd = new FormData();
    fd.append("shop_name", shop);
    fd.append("upi_id", upiId || "");
    if (file) fd.append("qr", await toPng(file), "qr.png");

    if (msg) msg.textContent = "Uploading… (the server may take a few seconds to wake up)";
    try {
      const r = await fetch(BQ_BASE + "/api/shops/upi", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) throw new Error(j.error || "Upload failed");
      if (msg) msg.textContent = "Saved. Customers will now see your QR when they pay.";
      toast("✅", "QR saved — customers can now pay you");
      return true;
    } catch (e) {
      if (msg) msg.textContent = "Not uploaded: " + (e.message || "server unreachable");
      toast("⚠️", e.message || "Could not upload the QR");
      return false;
    }
  }

  /* ---- Settings → Save also uploads to the backend ---- */
  const baseSave = window.bqSaveSettings;
  window.bqSaveSettings = async function () {
    const file = pickedQr;
    const upiId = ($("bq-upi-id") ? $("bq-upi-id").value : "").trim();
    const validId = !upiId || /^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(upiId);

    baseSave.apply(this, arguments);           // keeps local save + validation

    if (!validId || (!file && !upiId)) return;
    if (await uploadUpi(file, upiId)) pickedQr = null;
  };

  /* ---- customer side: load THIS shop's QR from the backend ---- */
  window.updateUpiQr = async function () {
    const p = S.pendingJoin;
    const s = p && S.shops[p.shopId];
    const opt = $("pay-upi_qr");
    S.shopPay = null;
    if (opt) opt.style.display = "none";
    if (!s) return;
    try {
      const r = await fetch(BQ_BASE + "/api/shops/upi?shop_name=" + encodeURIComponent(s.name));
      const j = await r.json();
      if (r.ok && j.success && j.upi_qr_url) {
        S.shopPay = { upi_id: j.upi_id, upi_qr_url: j.upi_qr_url };
        if (opt) opt.style.display = "flex";
        if (S.payMethod === "upi_qr") selectPayMethod("upi_qr");   // already chosen
      }
    } catch (e) {
      console.warn("Could not load shop UPI details:", e);
    }
  };
})();
