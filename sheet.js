/*
  sheet.js
  Penghubung data Google Sheets (File → Share → Publish to web → CSV).
  Hanya mengurus pengambilan dan pembacaan data. Tampilan diatur di file Anda sendiri.
*/
(function (global) {
  'use strict';

  /* ===================== KONFIGURASI ===================== */
  const CONFIG = {
    // Satu atau lebih sumber data. Nama di sebelah kiri bebas,
    // dipakai saat memanggil SheetData.get("nama").
    // Setiap tab/sheet perlu link CSV sendiri.
      sources: {
  utama: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDjOZV7Bgcr6RzOr7GaRCY8qYU41MhD6HzoXwSrKqgRocTrke9twbcKS8LF3w5H1KwZKqxbmo-DnS9/pub?gid=686242649&single=true&output=csv",
  tabBaru: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDjOZV7Bgcr6RzOr7GaRCY8qYU41MhD6HzoXwSrKqgRocTrke9twbcKS8LF3w5H1KwZKqxbmo-DnS9/pub?gid=606396282&single=true&output=csv",
  resumeGt: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDjOZV7Bgcr6RzOr7GaRCY8qYU41MhD6HzoXwSrKqgRocTrke9twbcKS8LF3w5H1KwZKqxbmo-DnS9/pub?gid=606396282&single=true&output=csv"
},
    refreshMs: 60000,   // pembaruan otomatis dalam milidetik (60000 = 1 menit). 0 = nonaktif
    pakaiCache: true    // simpan data terakhir di browser agar tampil cepat dan tetap ada jika gagal
  };

  const CACHE_PREFIX = "sheetdata:";
  const state = {};        // nama -> { status, header, rows, objects, updatedAt, error }
  const listeners = [];    // fungsi yang dipanggil saat data berubah
  let sudahAdaData = false;

  /* ===================== PARSER CSV ===================== */
  // Aman untuk koma, tanda kutip, dan baris baru di dalam sel
  function parseCSV(teks) {
    const hasil = [];
    let baris = [], sel = "", dalamKutip = false;
    for (let i = 0; i < teks.length; i++) {
      const ch = teks[i];
      if (dalamKutip) {
        if (ch === '"') {
          if (teks[i + 1] === '"') { sel += '"'; i++; }
          else dalamKutip = false;
        } else sel += ch;
      } else if (ch === '"') {
        dalamKutip = true;
      } else if (ch === ",") {
        baris.push(sel); sel = "";
      } else if (ch === "\n") {
        baris.push(sel); hasil.push(baris); baris = []; sel = "";
      } else if (ch !== "\r") {
        sel += ch;
      }
    }
    if (sel !== "" || baris.length) { baris.push(sel); hasil.push(baris); }
    return hasil;
  }

  // Mengubah teks angka format Indonesia menjadi angka:
  // "4.200.000" -> 4200000 ; "4.200.000,5" -> 4200000.5 ; "Rp 1.500" -> 1500 ; kosong -> 0
  function toNumber(nilai) {
    if (typeof nilai === "number") return nilai;
    let s = String(nilai ?? "").trim().replace(/\s/g, "").replace(/Rp/gi, "").replace(/%/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/\./g, "");
    const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  // Mengubah header + baris menjadi array objek, misalnya { Toko: "Berkah", Nilai: "4.200.000" }
  function toObjects(header, rows) {
    return rows.map((r) => {
      const o = {};
      header.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
      return o;
    });
  }

  /* ===================== CACHE ===================== */
  function bacaCache(nama) {
    if (!CONFIG.pakaiCache) return null;
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + nama);
      if (!raw) return null;
      const c = JSON.parse(raw);
      return {
        header: c.header,
        rows: c.rows,
        objects: toObjects(c.header, c.rows),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : null
      };
    } catch (e) {
      return null;
    }
  }

  function simpanCache(nama, header, rows, updatedAt) {
    if (!CONFIG.pakaiCache) return;
    try {
      localStorage.setItem(CACHE_PREFIX + nama, JSON.stringify({
        header, rows, updatedAt: updatedAt.toISOString()
      }));
    } catch (e) { /* penyimpanan penuh atau diblokir, abaikan */ }
  }

  /* ===================== PENGAMBILAN DATA ===================== */
  function notify() {
    sudahAdaData = true;
    listeners.forEach((fn) => {
      try { fn(api); } catch (e) { console.error("SheetData listener:", e); }
    });
    window.dispatchEvent(new CustomEvent("sheet:update", { detail: api }));
  }

  async function muatSatu(nama, url) {
    if (!url || url.includes("TEMPEL_LINK")) {
      state[nama] = { status: "kosong", header: [], rows: [], objects: [], updatedAt: null, error: "Link belum diisi" };
      return;
    }

    const lama = state[nama] || {};
    state[nama] = { ...lama, status: "memuat", error: null };

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = parseCSV(await res.text()).filter((r) => r.some((c) => c.trim() !== ""));
      if (!data.length) throw new Error("Spreadsheet kosong");

      const header = data[0].map((h) => h.trim());
      const rows = data.slice(1);
      const updatedAt = new Date();

      state[nama] = { status: "ok", header, rows, objects: toObjects(header, rows), updatedAt, error: null };
      simpanCache(nama, header, rows, updatedAt);
    } catch (e) {
      // Jika gagal, tetap pakai data terakhir yang tersimpan (jika ada)
      const cache = bacaCache(nama);
      state[nama] = cache
        ? { ...cache, status: "error", error: e.message }
        : { status: "error", header: [], rows: [], objects: [], updatedAt: null, error: e.message };
    }
  }

  async function refresh() {
    await Promise.all(Object.entries(CONFIG.sources).map(([nama, url]) => muatSatu(nama, url)));
    notify();
  }

  /* ===================== API PUBLIK ===================== */
  const api = {
    config: CONFIG,

    // Mengambil satu sumber. Hasilnya berisi:
    // status ("memuat" | "cache" | "ok" | "error" | "kosong"),
    // header (array nama kolom), rows (array of array),
    // objects (array of object), updatedAt (Date), error (teks)
    get(nama) {
      return state[nama] || { status: "kosong", header: [], rows: [], objects: [], updatedAt: null, error: null };
    },

    // Mendaftarkan fungsi yang dijalankan setiap data diperbarui.
    // Jika data sudah ada, fungsi langsung dijalankan sekali.
    onUpdate(fn) {
      listeners.push(fn);
      if (sudahAdaData) fn(api);
    },

    refresh,
    toNumber
  };

  global.SheetData = api;

  // Mulai: tampilkan cache dulu (jika ada), lalu ambil data terbaru
  function init() {
    Object.keys(CONFIG.sources).forEach((nama) => {
      const c = bacaCache(nama);
      if (c) state[nama] = { ...c, status: "cache", error: null };
    });
    if (Object.keys(state).length) notify();

    refresh();
    if (CONFIG.refreshMs > 0) setInterval(refresh, CONFIG.refreshMs);
  }

  init();
})(window);
