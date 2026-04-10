let data = [];
let deleteIndex = null;

window.onload = () => {
  loadData();
  document.getElementById("tanggal").valueAsDate = new Date();
  initSheetDrag();
};

// 🔥 LOAD REALTIME
function loadData() {
  db.ref("keuangan").on("value", snapshot => {
    data = snapshot.val() || [];
    render();
  });
}

// 🔥 SAVE
function saveData() {
  db.ref("keuangan").set(data);
}

// FORMAT
function formatRupiah(n) {
  return n.toLocaleString("id-ID");
}

function formatTanggal(t) {
  return new Date(t).toISOString().split("T")[0];
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

  saveData();

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
  saveData();
  closePopup();
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

// RENDER
function render() {
  let list = document.getElementById("list");
  list.innerHTML = "";

  let saldo = 0, masuk = 0, keluar = 0;

  data.forEach((item, i) => {
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
        <b>${item.nama}</b>
        <small>${item.kategori} • ${formatTanggal(item.tanggal)}</small>
        <b style="float:right;color:${warna}">Rp ${formatRupiah(item.nominal)}</b>
        <button onclick="openDelete(${i})">🗑️</button>
      </div>
    `;
  });

  document.getElementById("saldo").innerText = "Rp " + formatRupiah(saldo);
  document.getElementById("totalMasuk").innerText = "Rp " + formatRupiah(masuk);
  document.getElementById("totalKeluar").innerText = "Rp " + formatRupiah(keluar);

  renderLaporan();
}

// LAPORAN
function renderLaporan() {
  let masukMap = {}, keluarMap = {};

  data.forEach(item => {
    if (item.tipe === "masuk") {
      masukMap[item.kategori] = (masukMap[item.kategori] || 0) + item.nominal;
    } else {
      keluarMap[item.kategori] = (keluarMap[item.kategori] || 0) + item.nominal;
    }
  });

  let masukEl = document.getElementById("laporanMasuk");
  masukEl.innerHTML = "<h4>⬆️ Pemasukan</h4>";

  for (let k in masukMap) {
    masukEl.innerHTML += `<div>${k} <b>Rp ${formatRupiah(masukMap[k])}</b></div>`;
  }

  let keluarEl = document.getElementById("laporanKeluar");
  keluarEl.innerHTML = "<h4>⬇️ Pengeluaran</h4>";

  for (let k in keluarMap) {
    keluarEl.innerHTML += `<div>${k} <b>Rp ${formatRupiah(keluarMap[k])}</b></div>`;
  }
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
    if (move > 0) sheet.style.transform = `translateY(${move}px)`;
  });

  dragBar.addEventListener("touchend", e => {
    let move = e.changedTouches[0].clientY - startY;
    if (move > 100) closeSheet();
    sheet.style.transform = "translateY(0)";
  });
}
