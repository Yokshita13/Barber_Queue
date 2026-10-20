/* layout_fix.js
   Load LAST (after queue_redesign.js):
   <script src="layout_fix.js"></script>
   1) Desktop: lets the dashboard use the full width next to the sidebar
      instead of sitting in a narrow column on the left.
   2) Phone: tighter headings, single-column cards, full-width buttons,
      and nothing wider than the screen. */
(function () {
  "use strict";
  const css = document.createElement("style");
  css.id = "layout-fix";
  css.textContent = `
  /* ---------- every redesigned page: never wider than its container ---------- */
  .an,.st,.pf,.sx,.cl,.bw,.qm,.sv{width:100%;max-width:100%;overflow-wrap:anywhere}
  #s-barb .scroll{overflow-x:hidden}
  .st-grid,.sv-grid{grid-template-columns:repeat(auto-fill,minmax(min(210px,100%),1fr))!important}

  /* ---------- desktop / large screens ---------- */
  @media (min-width:900px){
    #s-barb,
    #s-barb .scroll,
    #s-barb .scroll.pad,
    #s-barb [id^="b-"][id$="-tab"]{max-width:none!important;width:100%!important}
    #s-barb [id^="b-"][id$="-tab"]{margin-left:0!important;margin-right:0!important}
    .an,.st,.pf,.sx,.cl,.bw,.qm,.sv{max-width:1600px}
  }

  /* ---------- phones ---------- */
  @media (max-width:600px){
    #s-barb .scroll.pad{padding-left:12px!important;padding-right:12px!important}

    /* headings */
    .an-head h2,.st-head h2,.pf-head h2,.sx h2,.cl-head h2,.bw-head h2,.qm-head h2,.sv-head h2{font-size:19px!important;line-height:1.25}
    .an-head p,.st-head p,.pf-head p,.cl-head p,.bw-head p,.qm-head p,.sv-head p,.sx-sub{font-size:12px!important}
    .an-badge,.st-badge,.bw-badge,.qm-badge,.sv-badge{width:42px!important;height:42px!important;border-radius:11px!important}
    .an-badge .an-ic,.st-badge .st-ic,.bw-badge .bw-ic,.qm-badge .qm-ic,.sv-badge .sv-ic{width:22px;height:22px}

    /* header tools go full width */
    .an-head-r,.st-tools,.bw-tools,.qm-tools,.cl-tools{margin-left:0!important;width:100%;flex:1 1 100%;display:flex;gap:8px}
    .an-head-r>*,.bw-tools>*,.qm-tools>*{flex:1 1 0;min-width:0;justify-content:center}
    .st-tools .st-search,.sv-search{max-width:none;flex:1 1 100%;margin-left:0}
    .st-add{flex:1 1 100%;justify-content:center}

    /* KPI cards: one per row, compact */
    .an-kpis,.st-kpis,.bw-kpis,.qm-kpis{grid-template-columns:1fr!important}
    .an-kpi,.st-kpi,.bw-kpi,.qm-kpi{padding:12px!important}
    .an-spark{display:none}
    .an-kv,.st-kv,.bw-kv,.qm-kv{font-size:24px!important}

    /* panels */
    .an-panel,.st-card,.pf-card,.sx-card,.bw-box,.qm-box,.sv-box,.cl-box{padding:12px!important}
    .an-bars{height:170px}
    .an-ph{flex-wrap:wrap}
    .an-seg{margin-left:0}
    .an-tag{margin-left:0}

    /* tables / toolbars */
    .bw-filters,.qm-r{margin-left:0!important;flex:1 1 100%;justify-content:flex-start!important}
    .bw-search{max-width:none!important;flex:1 1 100%}
    .qm-th .qm-r{width:100%}
    .qm-add{flex:1;justify-content:center}

    /* calendar */
    .cl-range{width:100%;justify-content:space-between}
    .cl-main{max-height:70vh}

    /* services / staff cards: single column */
    .st-grid,.sv-grid{grid-template-columns:1fr!important}
    .sv-card,.st-card{min-height:0!important}

    /* profile + settings */
    .pf-av{width:88px;height:88px}
    .pf-row{flex-wrap:wrap;gap:4px}
    .pf-row strong{text-align:left}
    .sx-row{gap:10px}
  }

  /* very small phones (and the 260px preview) */
  @media (max-width:340px){
    .an-kv,.st-kv,.bw-kv,.qm-kv{font-size:20px!important}
    .an-kico,.st-kico,.bw-kico,.qm-kico{width:38px!important;height:38px!important}
    .bw-pill,.qm-pill,.an-pill,.cl-btn{padding:8px 10px;font-size:12px}
  }
  `;
  document.head.appendChild(css);
})();