let data = [];
let deleteIndex = null;
let selectedKategori = [];
let editIndex = null;

// 🔥 PAGINATION
let currentPage = 1;
let itemsPerPage = 7;

// LOAD
function loadData() {
  db.ref("keuangan").on("value", snapshot => {
    data = snapshot.val() || [];
    currentPage = 1; // reset page
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

function tambahData() {
  let nama = document.getElementById("nama").value;
  let nominal = parseInt(document.getElementById("nominal").value);
  let kategori = document.getElementById("kategori").value;
  let tipe = document.getElementById("tipe").value;
  let wallet = document.getElementById("wallet").value;
  let tanggal = document.getElementById("tanggal").value;

  if (!nama || !nominal) return alert("Isi semua!");

  if (editIndex !== null) {
    // 🔥 EDIT MODE
    data[editIndex] = { nama, nominal, kategori, tipe, wallet, tanggal };
  } else {
    // 🔥 TAMBAH MODE
    data.unshift({ nama, nominal, kategori, tipe, wallet, tanggal });
  }

  saveData();
  closeSheet();
}

// EDIT
function editData(item) {
  document.getElementById("nama").value = item.nama;
  document.getElementById("nominal").value = item.nominal;
  document.getElementById("kategori").value = item.kategori;
  document.getElementById("tipe").value = item.tipe;
  document.getElementById("wallet").value = item.wallet;
  document.getElementById("tanggal").value = item.tanggal;

  editIndex = data.findIndex(d =>
    d.nama === item.nama &&
    d.nominal === item.nominal &&
    d.tanggal === item.tanggal
  );

  document.getElementById("formTitle").innerText = "Edit Transaksi";

  openSheet(true);
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

  listData.forEach(item => {
    if (item.tipe === "masuk") {
      saldo += item.nominal;
      masuk += item.nominal;
    } else {
      saldo -= item.nominal;
      keluar += item.nominal;
    }
  });

  // 🔥 PAGINATION LOGIC
  let start = (currentPage - 1) * itemsPerPage;
  let end = start + itemsPerPage;
  let paginatedData = listData.slice(start, end);

  paginatedData.forEach((item, i) => {
    let warna = item.tipe === "masuk" ? "#22c55e" : "#ef4444";

    list.innerHTML += `
      <div class="item" onclick='editData(${JSON.stringify(item)})'>
        <div class="item-left">
          <div class="item-title">${item.nama}</div>
          <div class="item-sub">${item.kategori} • ${item.tanggal}</div>
        </div>

        <div class="item-right">
          <div style="color:${warna}">
            Rp ${item.nominal.toLocaleString("id-ID")}
          </div>
          <button class="delete-btn" onclick="event.stopPropagation(); openDelete(${start + i})">Hapus</button>
        </div>
      </div>
    `;
  });

  // 🔥 PAGINATION UI
  let totalPages = Math.ceil(listData.length / itemsPerPage);

  list.innerHTML += `
    <div style="display:flex;justify-content:center;gap:10px;margin-top:12px;">
      <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""}>Prev</button>
      <span>Page ${currentPage} / ${totalPages || 1}</span>
      <button onclick="nextPage(${listData.length})" ${currentPage === totalPages ? "disabled" : ""}>Next</button>
    </div>
  `;

  let saldoText = saldo < 0 
    ? `- Rp${Math.abs(saldo).toLocaleString("id-ID")}` 
    : `Rp ${saldo.toLocaleString("id-ID")}`;

  document.getElementById("saldo").innerText = saldoText;
  document.getElementById("totalMasuk").innerText = "Rp " + masuk.toLocaleString("id-ID");
  document.getElementById("totalKeluar").innerText = "Rp " + keluar.toLocaleString("id-ID");

  renderLaporan(listData);
}

// 🔥 NEXT PAGE
function nextPage(totalData) {
  let totalPages = Math.ceil(totalData / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    render();
  }
}

// 🔥 PREV PAGE
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    render();
  }
}

// LAPORAN
function renderLaporan(listData = data) {
  let masukMap = {}, keluarMap = {};
  let totalMasuk = 0;
  let totalKeluar = 0;

  listData.forEach(item => {
    if (item.tipe === "masuk") {
      masukMap[item.kategori] = (masukMap[item.kategori] || 0) + item.nominal;
      totalMasuk += item.nominal;
    } else {
      keluarMap[item.kategori] = (keluarMap[item.kategori] || 0) + item.nominal;
      totalKeluar += item.nominal;
    }
  });

  document.getElementById("totalMasukReport").innerText =
    "Rp " + totalMasuk.toLocaleString("id-ID");

  document.getElementById("totalKeluarReport").innerText =
    "Rp " + totalKeluar.toLocaleString("id-ID");

  let masukEl = document.getElementById("laporanMasuk");
  masukEl.innerHTML = "";

  for (let k in masukMap) {
    masukEl.innerHTML += `
      <div class="report-item text-masuk">
        <span>${k}</span>
        <b>Rp ${masukMap[k].toLocaleString("id-ID")}</b>
      </div>
    `;
  }

  let keluarEl = document.getElementById("laporanKeluar");
  keluarEl.innerHTML = "";

  for (let k in keluarMap) {
    keluarEl.innerHTML += `
      <div class="report-item text-keluar">
        <span>${k}</span>
        <b>Rp ${keluarMap[k].toLocaleString("id-ID")}</b>
      </div>
    `;
  }
}

// TOGGLE
function toggleMasuk() {
  let el = document.getElementById("laporanMasuk");
  el.style.display = el.style.display === "block" ? "none" : "block";
}

function toggleKeluar() {
  let el = document.getElementById("laporanKeluar");
  el.style.display = el.style.display === "block" ? "none" : "block";
}

// FILTER PANEL
function toggleFilter() {
  let panel = document.getElementById("filterPanel");
  panel.style.display = panel.style.display === "block" ? "none" : "block";
}

// GENERATE KATEGORI
function generateKategoriFilter() {
  let container = document.getElementById("filterKategori");
  if (!container) return;

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

// UPDATE KATEGORI
function updateKategori(el) {
  if (el.checked) {
    if (!selectedKategori.includes(el.value)) {
      selectedKategori.push(el.value);
    }
  } else {
    selectedKategori = selectedKategori.filter(k => k !== el.value);
  }
}

// SELECT ALL
function selectAllKategori() {
  selectedKategori = [];
  document.querySelectorAll("#filterKategori input").forEach(cb => {
    cb.checked = true;
    selectedKategori.push(cb.value);
  });
}

// CLEAR
function clearAllKategori() {
  selectedKategori = [];
  document.querySelectorAll("#filterKategori input").forEach(cb => {
    cb.checked = false;
  });
}

// APPLY FILTER
function applyFilter() {
  let from = document.getElementById("fromMonth").value;
  let to = document.getElementById("toMonth").value;

  let filtered = data.filter(d => {
    let bulan = new Date(d.tanggal).toISOString().slice(0,7);

    return (!from || bulan >= from) &&
           (!to || bulan <= to) &&
           (selectedKategori.length === 0 || selectedKategori.includes(d.kategori));
  });

  currentPage = 1; // 🔥 penting biar gak bug
  render(filtered);
  toggleFilter();
}

// RESET
function resetFilter() {
  selectedKategori = [];
  currentPage = 1;
  render();
  toggleFilter();
}

// SHEET
function openSheet(isEdit = false) {
  if (!isEdit) {
    editIndex = null;

    document.getElementById("formTitle").innerText = "Tambah Transaksi";

    document.getElementById("nama").value = "";
    document.getElementById("nominal").value = "";
    document.getElementById("tanggal").valueAsDate = new Date();
  }

  document.getElementById("sheet").classList.add("active");
}

function closeSheet() {
  document.getElementById("sheet").classList.remove("active");
  editIndex = null; // 🔥 extra safety
}

// JADI Title Case

function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// DRAG
function initSheetDrag() {
  let sheet = document.getElementById("sheet");
  let dragBar = document.getElementById("dragBar");

  if (!dragBar) return;

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
