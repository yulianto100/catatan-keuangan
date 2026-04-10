let data = [];
let deleteIndex = null;
let selectedKategori = [];

// LOAD
function loadData() {
  db.ref("keuangan").on("value", snapshot => {
    data = snapshot.val() || [];
    render();
    generateKategoriFilter();
  });
}

function saveData() {
  db.ref("keuangan").set(data);
}

window.onload = () => {
  loadData();
  document.getElementById("tanggal").valueAsDate = new Date();
  initSheetDrag();
};

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
        <div style="display:flex;justify-content:space-between">
          <div>
            <b>${item.nama}</b><br>
            <small>${item.kategori} • ${item.tanggal}</small>
          </div>

          <div style="text-align:right">
            <b style="color:${warna}">Rp ${item.nominal.toLocaleString("id-ID")}</b><br>
            <button onclick="openDelete(${i})">🗑️</button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("saldo").innerText = "Rp " + saldo.toLocaleString("id-ID");
  document.getElementById("totalMasuk").innerText = "Rp " + masuk.toLocaleString("id-ID");
  document.getElementById("totalKeluar").innerText = "Rp " + keluar.toLocaleString("id-ID");

  renderLaporan(listData);
}

// LAPORAN
function renderLaporan(listData) {
  let masukMap = {}, keluarMap = {};

  listData.forEach(item => {
    if (item.tipe === "masuk") {
      masukMap[item.kategori] = (masukMap[item.kategori] || 0) + item.nominal;
    } else {
      keluarMap[item.kategori] = (keluarMap[item.kategori] || 0) + item.nominal;
    }
  });

  let masukEl = document.getElementById("laporanMasuk");
  masukEl.innerHTML = "<h4 style='color:#22c55e'>⬆️ Pemasukan</h4>";

  for (let k in masukMap) {
    masukEl.innerHTML += `<div>${k} Rp ${masukMap[k].toLocaleString("id-ID")}</div>`;
  }

  let keluarEl = document.getElementById("laporanKeluar");
  keluarEl.innerHTML = "<h4 style='color:#ef4444'>⬇️ Pengeluaran</h4>";

  for (let k in keluarMap) {
    keluarEl.innerHTML += `<div>${k} Rp ${keluarMap[k].toLocaleString("id-ID")}</div>`;
  }
}

// FILTER
function toggleFilter() {
  let panel = document.getElementById("filterPanel");

  if (panel.classList.contains("show")) {
    panel.classList.remove("show");
    setTimeout(() => panel.style.display = "none", 200);
  } else {
    panel.style.display = "block";
    setTimeout(() => panel.classList.add("show"), 10);
  }
}

function generateKategoriFilter() {
  let container = document.getElementById("filterKategori");
  let unik = [...new Set(data.map(d => d.kategori))];

  container.innerHTML = "";
  unik.forEach(k => {
    container.innerHTML += `
      <div class="filter-item">
        <input type="checkbox" value="${k}" onchange="updateKategori(this)">
        <span>${k}</span>
      </div>
    `;
  });
}

function updateKategori(el) {
  if (el.checked) selectedKategori.push(el.value);
  else selectedKategori = selectedKategori.filter(k => k !== el.value);
}

function applyFilter() {
  let from = document.getElementById("fromMonth").value;
  let to = document.getElementById("toMonth").value;

  let filtered = data.filter(d => {
    let bulan = new Date(d.tanggal).toISOString().slice(0,7);

    return (!from || bulan >= from) &&
           (!to || bulan <= to) &&
           (selectedKategori.length === 0 || selectedKategori.includes(d.kategori));
  });

  render(filtered);
  toggleFilter();
}

function resetFilter() {
  selectedKategori = [];
  render();
  toggleFilter();
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
