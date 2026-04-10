const BIN_ID = "69d7469b36566621a893076b";
const API_KEY = "$2a$10$muEfJZR3SbcfGp/bnvG70OkpHIiWIScvYv3F18/flHtGPmAjFzilu";
const SHEET_API = "https://script.google.com/macros/s/AKfycbyuxRrgiCMZJk_Kuj8wQJHOmzPxFmFhxUloWN7XqffdgVX9ZA5xw_HwUuVvo0jEuOXn/exec";

let data = [];
let deleteIndex = null;
let selectedKategori = [];

window.onload = () => {
  loadCloud();
  document.getElementById("tanggal").valueAsDate = new Date();
  initSheetDrag();
};

// FORMAT
function formatRupiah(n) {
  return n.toLocaleString("id-ID");
}

function formatTanggal(t) {
  return new Date(t).toISOString().split("T")[0];
}

// LOAD
async function loadCloud() {
  let res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
    headers: { "X-Master-Key": API_KEY }
  });

  let json = await res.json();
  data = json.record?.data || [];

  render();
  generateKategoriFilter();
}

// SAVE JSONBIN
async function saveCloud() {
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY
    },
    body: JSON.stringify({ data })
  });
}

// 🔥 SYNC GOOGLE SHEET (FIX UTAMA)
async function syncToSheet() {
  try {
    await fetch(SHEET_API, {
      method: "POST",
      body: JSON.stringify(data)
    });
    console.log("✅ Sync ke Google Sheet berhasil");
  } catch (err) {
    console.log("❌ Sync gagal:", err);
  }
}

// TAMBAH
function tambahData() {
  let nama = document.getElementById("nama").value;
  let nominal = parseInt(document.getElementById("nominal").value);
  let kategori = document.getElementById("kategori").value;
  let tipe = document.getElementById("tipe").value;
  let wallet = document.getElementById("wallet").value;
  let tanggal = document.getElementById("tanggal").value;

  if (!nama || !nominal) return alert("Isi semua!");

  data.unshift({ nama, nominal, kategori, tipe, wallet, tanggal });

  render();
  generateKategoriFilter();

  saveCloud();
  syncToSheet(); // 🔥 WAJIB

  // RESET FORM
  document.getElementById("nama").value = "";
  document.getElementById("nominal").value = "";
  document.getElementById("tanggal").valueAsDate = new Date();

  closeSheet();
}

// DELETE
function openDelete(index) {
  deleteIndex = index;
  document.getElementById("popup").style.display = "flex";
}

function confirmDelete() {
  data.splice(deleteIndex, 1);

  render();
  generateKategoriFilter();

  saveCloud();
  syncToSheet(); // 🔥 WAJIB

  closePopup();
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

// RENDER
function render(listData = data) {
  let list = document.getElementById("list");
  list.innerHTML = "";

  let saldo = 0, masuk = 0, keluar = 0;

  listData.forEach((item, i) => {
    if (item.tipe === "masuk") {
      saldo += item.nominal;
      masuk += item.nominal;
    } else {
      saldo -= item.nominal;
      keluar += item.nominal;
    }

    let warna = item.tipe === "masuk" ? "#22c55e" : "#ef4444";

    list.innerHTML += `
      <div class="item">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <b>${item.nama}</b><br>
            <small>${item.kategori} • ${formatTanggal(item.tanggal)}</small>
          </div>

          <div style="text-align:right">
            <b style="color:${warna}">Rp ${formatRupiah(item.nominal)}</b><br>
            <button onclick="openDelete(${i})" style="background:#ef4444;margin-top:5px;width:auto;padding:6px 10px;">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("saldo").innerText = "Rp " + formatRupiah(saldo);
  document.getElementById("totalMasuk").innerText = "Rp " + formatRupiah(masuk);
  document.getElementById("totalKeluar").innerText = "Rp " + formatRupiah(keluar);

  renderLaporan(listData);
}

// LAPORAN
function renderLaporan(listData = data) {
  let masukMap = {}, keluarMap = {};

  listData.forEach(item => {
    if (item.tipe === "masuk") {
      masukMap[item.kategori] = (masukMap[item.kategori] || 0) + item.nominal;
    } else {
      keluarMap[item.kategori] = (keluarMap[item.kategori] || 0) + item.nominal;
    }
  });

  let masukEl = document.getElementById("laporanMasuk");
  masukEl.innerHTML = "<h4>⬆️ Pemasukan</h4>";

  for (let k in masukMap) {
    masukEl.innerHTML += `
      <div style="background:#064e3b;padding:10px;border-radius:10px;margin-bottom:6px">
        <span>${k}</span>
        <b style="float:right;color:#4ade80">Rp ${formatRupiah(masukMap[k])}</b>
      </div>
    `;
  }

  let keluarEl = document.getElementById("laporanKeluar");
  keluarEl.innerHTML = "<h4>⬇️ Pengeluaran</h4>";

  for (let k in keluarMap) {
    keluarEl.innerHTML += `
      <div style="background:#7f1d1d;padding:10px;border-radius:10px;margin-bottom:6px">
        <span>${k}</span>
        <b style="float:right;color:#f87171">Rp ${formatRupiah(keluarMap[k])}</b>
      </div>
    `;
  }
}
