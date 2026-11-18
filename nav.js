/* nav.js: menu sidebar kanan atas, dipakai di semua halaman */
(function () {
  'use strict';

  /* ===================== PENGATURAN MENU ===================== */
  const MENU = [
    {
      label: 'Monitoring Kunjungan',
      desc: 'Kunjungan harian tim sales',
      href: 'monitoring-kunjungan.html',
      icon: 'map-pin'
    },
    {
      label: 'Data Tim Sales',
      desc: 'Daftar dan data anggota tim',
      href: 'data-tim-sales.html',
      icon: 'users'
    },
    {
      label: 'Monitoring Insentif SC',
      desc: 'Insentif Sales Coordinator',
      href: 'monitoring-insentif-sc.html',
      icon: 'wallet'
    }
  ];

  const halamanIni = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* ===================== GAYA ===================== */
  const css = `
    .nav-toggle{position:fixed;top:max(16px,env(safe-area-inset-top));right:16px;z-index:70;display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:14px;background:rgba(255,255,255,.92);color:#334155;cursor:pointer;box-shadow:0 0 0 1px rgba(15,23,42,.06),0 8px 18px -10px rgba(15,23,42,.35);transition:transform .15s ease,color .2s ease,background-color .2s ease}
    .nav-toggle:hover{color:#234CE0;background:#fff}
    .nav-toggle:active{transform:scale(.94)}
    .nav-toggle svg{width:18px;height:18px}
    .nav-overlay{position:fixed;inset:0;z-index:80;background:rgba(7,11,20,.45);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .25s ease}
    .nav-drawer{position:fixed;top:0;right:0;bottom:0;z-index:90;display:flex;flex-direction:column;width:min(82vw,300px);padding:max(20px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom));background:#fff;box-shadow:-24px 0 48px -24px rgba(7,11,20,.45);transform:translateX(104%);visibility:hidden;transition:transform .32s cubic-bezier(.22,.9,.28,1),visibility .32s}
    .nav-open{overflow:hidden}
    .nav-open .nav-overlay{opacity:1;pointer-events:auto}
    .nav-open .nav-drawer{transform:translateX(0);visibility:visible}
    .nav-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}
    .nav-brand{font-size:9.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#234CE0}
    .nav-sub{font-size:14px;font-weight:800;color:#0B1220;margin-top:2px}
    .nav-close{display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:12px;background:#f1f5f9;color:#475569;cursor:pointer}
    .nav-close svg{width:16px;height:16px}
    .nav-list{display:flex;flex-direction:column;gap:6px}
    .nav-link{display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;text-decoration:none;color:#1B2B47;transition:background-color .2s ease}
    .nav-link:hover{background:#f1f5f9}
    .nav-link[aria-current="page"]{background:#EEF4FF;box-shadow:inset 0 0 0 1px #BCD2FF}
    .nav-link > svg{width:16px;height:16px;flex-shrink:0;color:#cbd5e1}
    .nav-ico{display:grid;place-items:center;width:38px;height:38px;flex-shrink:0;border-radius:12px;background:#f1f5f9;color:#64748b}
    .nav-ico svg{width:17px;height:17px}
    .nav-link[aria-current="page"] .nav-ico{background:#234CE0;color:#fff}
    .nav-text{display:flex;flex-direction:column;flex:1;min-width:0}
    .nav-name{font-size:13px;font-weight:800;color:#0B1220}
    .nav-desc{font-size:11px;font-weight:500;color:#94a3b8;margin-top:2px}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ===================== MARKUP ===================== */
  const daftar = MENU.map((m) => {
    const aktif = halamanIni === m.href.toLowerCase();
    return `
      <a class="nav-link" href="${m.href}"${aktif ? ' aria-current="page"' : ''}>
        <span class="nav-ico"><i data-lucide="${m.icon}"></i></span>
        <span class="nav-text">
          <span class="nav-name">${m.label}</span>
          <span class="nav-desc">${m.desc}</span>
        </span>
        <i data-lucide="chevron-right"></i>
      </a>`;
  }).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" id="navToggle" class="nav-toggle" aria-label="Buka menu" aria-expanded="false" aria-controls="navDrawer">
      <i data-lucide="menu"></i>
    </button>
    <div id="navOverlay" class="nav-overlay"></div>
    <aside id="navDrawer" class="nav-drawer" role="dialog" aria-modal="true" aria-label="Menu utama" aria-hidden="true">
      <div class="nav-head">
        <div>
          <p class="nav-brand">SFA · Tangerang</p>
          <p class="nav-sub">Menu utama</p>
        </div>
        <button type="button" id="navClose" class="nav-close" aria-label="Tutup menu">
          <i data-lucide="x"></i>
        </button>
      </div>
      <nav class="nav-list">${daftar}</nav>
    </aside>
  `);

  /* ===================== PERILAKU ===================== */
  const $ = (id) => document.getElementById(id);
  const tombol = $('navToggle');
  const overlay = $('navOverlay');
  const drawer = $('navDrawer');
  const tutup = $('navClose');

  function buka(on) {
    document.body.classList.toggle('nav-open', on);
    tombol.setAttribute('aria-expanded', on ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) tutup.focus({ preventScroll: true });
  }

  tombol.addEventListener('click', () => buka(!document.body.classList.contains('nav-open')));
  tutup.addEventListener('click', () => buka(false));
  overlay.addEventListener('click', () => buka(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') buka(false); });

  // Sentuhan di dalam menu tidak ikut memicu "tarik untuk memperbarui"
  ['touchstart', 'touchmove'].forEach((ev) =>
    drawer.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));

  if (window.lucide) window.lucide.createIcons();
})();