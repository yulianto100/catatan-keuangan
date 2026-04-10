const BIN_ID = "69d7469b36566621a893076b";
const API_KEY = "$2a$10$muEfJZR3SbcfGp/bnvG70OkpHIiWIScvYv3F18/flHtGPmAjFzilu";
const SHEET_API = "https://script.google.com/macros/s/AKfycbyuxRrgiCMZJk_Kuj8wQJHOmzPxFmFhxUloWN7XqffdgVX9ZA5xw_HwUuVvo0jEuOXn/exec";


let data = [];
let deleteIndex = null;

window.onload = () => {
  loadCloud();

  document.getElementById("tanggal").valueAsDate = new Date();
  document.getElementById("filterBulan").value =
    new Date().toISOString().slice(0,7);

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
}

// SAVE
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

async function syncToSheet() {
  await fetch(SHEET_API, {
    method: "POST",
    body: JSON.stringify(data)
  });
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
  saveCloud();
  syncToSheet();

  closeSheet();
}

// 🔥 DELETE FLOW
function openDelete(index) {
  deleteIndex = index;
  document.getElementById("popup").style.display = "flex";
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

function confirmDelete() {
  if (deleteIndex !== null) {
    data.splice(deleteIndex, 1);

    render();
    saveCloud();
    syncToSheet();

    deleteIndex = null;
  }

  closePopup();
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

    let div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between">
        <b>${item.nama}</b>
        <b style="color:${warna}">Rp ${formatRupiah(item.nominal)}</b>
      </div>
      <small>${item.kategori} • ${formatTanggal(item.tanggal)}</small>
      <button onclick="openDelete(${i})">Hapus</button>
    `;

    list.appendChild(div);
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
    masukEl.innerHTML += `<div class="report-item">
      <span>${k}</span>
      <b style="color:#22c55e">Rp ${formatRupiah(masukMap[k])}</b>
    </div>`;
  }

  let keluarEl = document.getElementById("laporanKeluar");
  keluarEl.innerHTML = "<h4>⬇️ Pengeluaran</h4>";

  for (let k in keluarMap) {
    keluarEl.innerHTML += `<div class="report-item">
      <span>${k}</span>
      <b style="color:#ef4444">Rp ${formatRupiah(keluarMap[k])}</b>
    </div>`;
  }
}

// FILTER
function filterBulan() {
  let bulan = document.getElementById("filterBulan").value;

  let filtered = data.filter(d =>
    new Date(d.tanggal).toISOString().slice(0,7) === bulan
  );

  render(filtered);
}

// SHEET
function openSheet() {
  document.getElementById("sheet").classList.add("active");
}

function closeSheet() {
  document.getElementById("sheet").classList.remove("active");
}

// DRAG
function initSheetDrag() {
  let sheet = document.getElementById("sheet");
  let dragBar = document.getElementById("dragBar");

  let startY = 0;

  dragBar.addEventListener("touchstart", e => {
    startY = e.touches[0].clientY;
  });

  dragBar.addEventListener("touchmove", e => {
    let move = e.touches[0].clientY - startY;

    if (move > 0) {
      sheet.style.transform = `translateY(${move}px)`;
    }
  });

  dragBar.addEventListener("touchend", e => {
    let move = e.changedTouches[0].clientY - startY;

    if (move > 100) closeSheet();

    sheet.style.transform = "translateY(0)";
  });
}