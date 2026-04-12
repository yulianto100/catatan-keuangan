let data = [];
let deleteIndex = null;
let selectedKategori = [];
let editIndex = null;
let currentFilteredData = [];

let currentPage = 1;
let itemsPerPage = 7;

// ============================
// LOAD DATA
// ============================
function loadData() {
  db.ref("keuangan").on("value", snapshot => {
    let val = snapshot.val() || {};

    data = Object.keys(val).map(key => ({
      ...val[key],
      firebaseKey: key
    }));

    // 🔥 SORT TERBARU DI ATAS (PALING PENTING)
    data.sort((a, b) => b.id - a.id);

    currentPage = 1;
    render();
    generateKategoriFilter();
  });
}

window.onload = () => {
  loadData();

  let tgl = document.getElementById("tanggal");
  if (tgl) tgl.valueAsDate = new Date();

  initSheetDrag();
  toggleTransfer();
};

// ============================
// TAMBAH / EDIT / TRANSFER
// ============================
function generateId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

function tambahData() {
  let tanggal = document.getElementById("tanggal").value;
  let nama = document.getElementById("nama").value;
  let nominal = parseInt(document.getElementById("nominal").value);
  let kategori = document.getElementById("kategori").value;
  let tipe = document.getElementById("tipe").value;
  let wallet = document.getElementById("wallet").value;
  let isTransfer = document.getElementById("isTransfer").value;

  if (!nominal) return alert("Isi nominal!");

  // ================= EDIT =================
  if (editIndex) {
    db.ref("keuangan/" + editIndex).update({
      tanggal,
      nama,
      nominal,
      kategori,
      tipe,
      wallet
    });
    editIndex = null; // 🔥 WAJIB
    closeSheet();
    resetForm(); // 🔥 TAMBAHIN INI
    return;
  }

  // ================= TRANSFER =================
  if (isTransfer === "yes") {
    let from = document.getElementById("fromWallet").value;
    let to = document.getElementById("toWallet").value;

    if (from === to) return alert("Wallet tidak boleh sama!");

    let id1 = generateId();
    let id2 = generateId();

    db.ref("keuangan/" + id1).set({
      id: id1,
      tanggal,
      nama: "Transfer ke " + to,
      nominal,
      kategori: "Transfer",
      tipe: "keluar",
      wallet: from
    });

    db.ref("keuangan/" + id2).set({
      id: id2,
      tanggal,
      nama: "Transfer dari " + from,
      nominal,
      kategori: "Transfer",
      tipe: "masuk",
      wallet: to
    });

  } else {
    let id = generateId();

    db.ref("keuangan/" + id).set({
      id,
      tanggal,
      nama,
      nominal,
      kategori,
      tipe,
      wallet
    });
  }

  closeSheet();
}

// ============================
// EDIT
// ============================
function editDataById(id) {
  let item = data.find(d => d.firebaseKey == id);
  if (!item) return;

  openSheet(true);

  document.getElementById("nama").value = item.nama;
  document.getElementById("nominal").value = item.nominal;
  document.getElementById("kategori").value = item.kategori;
  document.getElementById("tipe").value = item.tipe;
  document.getElementById("wallet").value = item.wallet;
  document.getElementById("tanggal").value = item.tanggal;

  if (item.kategori === "Transfer") {
    document.getElementById("isTransfer").value = "yes";
  } else {
    document.getElementById("isTransfer").value = "no";
  }

  toggleTransfer();

  editIndex = id;
  document.getElementById("formTitle").innerText = "Edit Transaksi";
}

// ============================
// DELETE
// ============================
function openDelete(key) {
  deleteIndex = key;
  document.getElementById("popup").style.display = "flex";
}

function confirmDelete() {
  db.ref("keuangan/" + deleteIndex).remove();
  closePopup();
}

function closePopup() {
  let popup = document.getElementById("popup");
  popup.style.display = "none";
}

// ============================
// RENDER
// ============================
function render(listData = data) {
  currentFilteredData = listData;

  let list = document.getElementById("list");
  list.innerHTML = "";

  let saldo = 0, masuk = 0, keluar = 0;
  let cash = 0, bank = 0, ewallet = 0;

  listData.forEach(item => {
    let isMasuk = item.tipe === "masuk";

    saldo += isMasuk ? item.nominal : -item.nominal;
    masuk += isMasuk ? item.nominal : 0;
    keluar += !isMasuk ? item.nominal : 0;

    let val = isMasuk ? item.nominal : -item.nominal;

    if (item.wallet === "Cash") cash += val;
    if (item.wallet === "Bank") bank += val;
    if (item.wallet === "E-Wallet") ewallet += val;
  });

  let start = (currentPage - 1) * itemsPerPage;
  let paginatedData = listData.slice(start, start + itemsPerPage);

  paginatedData.forEach(item => {
    let warna = item.tipe === "masuk" ? "#22c55e" : "#ef4444";

    list.innerHTML += `
      <div class="item" onclick="editDataById('${item.firebaseKey}')">
        <div>
          <b>${item.nama}</b><br>
          <small>${item.kategori} • ${item.tanggal}</small>
        </div>

        <div style="text-align:right">
          <div style="color:${warna}">
            Rp ${item.nominal.toLocaleString("id-ID")}
          </div>
          <button onclick="event.stopPropagation(); openDelete('${item.firebaseKey}')">
            Hapus
          </button>
        </div>
      </div>
    `;
  });

  document.getElementById("saldo").innerText = "Rp " + saldo.toLocaleString("id-ID");
  document.getElementById("totalMasuk").innerText = "Rp " + masuk.toLocaleString("id-ID");
  document.getElementById("totalKeluar").innerText = "Rp " + keluar.toLocaleString("id-ID");

  document.getElementById("saldoCash").innerText = "Rp " + cash.toLocaleString("id-ID");
  document.getElementById("saldoBank").innerText = "Rp " + bank.toLocaleString("id-ID");
  document.getElementById("saldoEwallet").innerText = "Rp " + ewallet.toLocaleString("id-ID");

  renderLaporan(listData);
  let totalPages = Math.ceil(listData.length / itemsPerPage);

list.innerHTML += `
  <div style="display:flex;justify-content:center;gap:10px;margin-top:12px;">
    <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""}>Prev</button>
    <span>Page ${currentPage} / ${totalPages || 1}</span>
    <button onclick="nextPage(${listData.length})" ${currentPage === totalPages ? "disabled" : ""}>Next</button>
  </div>
`;
}

// ============================
// UI
// ============================
function openTypePopup() {
  let el = document.getElementById("popupType");

  el.style.display = "flex";
  el.classList.add("active");

  el.style.pointerEvents = "auto"; // 🔥 WAJIB
}

function closeTypePopup() {
  let el = document.getElementById("popupType");

  el.style.display = "none";
  el.classList.remove("active");

  // 🔥 TAMBAHAN WAJIB
  el.style.pointerEvents = "none";
}

function openForm(type) {
  closeTypePopup();
  openSheet();

  document.getElementById("isTransfer").value =
    type === "transfer" ? "yes" : "no";

  toggleTransfer();
}

function openSheet(isEdit = false) {
  closeTypePopup();

  let sheet = document.getElementById("sheet");

  sheet.classList.add("active");

  sheet.style.pointerEvents = "auto";
  sheet.style.transform = "translateY(0)"; // 🔥 INI KUNCI

  if (!isEdit) {
    editIndex = null;
    document.getElementById("formTitle").innerText = "Tambah Transaksi";
    resetForm(); // 🔥 BIAR SELALU FRESH
  }
}

function closeSheet() {
  let sheet = document.getElementById("sheet");

  sheet.classList.remove("active");
  sheet.style.transform = "translateY(100%)"; // 🔥 konsisten
  sheet.style.pointerEvents = "none";
}

function toggleMasuk() {
  let el = document.getElementById("laporanMasuk");
  let arrow = document.getElementById("arrowMasuk");

  let isOpen = el.style.display === "block";

  el.style.display = isOpen ? "none" : "block";
  arrow.innerText = isOpen ? "▼" : "▲";
}

function toggleKeluar() {
  let el = document.getElementById("laporanKeluar");
  let arrow = document.getElementById("arrowKeluar");

  let isOpen = el.style.display === "block";

  el.style.display = isOpen ? "none" : "block";
  arrow.innerText = isOpen ? "▼" : "▲";
}



function toggleTransfer() {
  let val = document.getElementById("isTransfer").value;

  let transferBox = document.getElementById("transferBox");
  let normalField = document.getElementById("normalField");

  if (val === "yes") {
    transferBox.style.display = "block";
    normalField.style.display = "none";
  } else {
    transferBox.style.display = "none";
    normalField.style.display = "block";
  }
}

// ============================
// FILTER & EXPORT (UNCHANGED)
// ============================
function toggleFilter() {
  let panel = document.getElementById("filterPanel");
  panel.style.display = panel.style.display === "block" ? "none" : "block";
}

function generateKategoriFilter() {
  let container = document.getElementById("filterKategori");
  container.innerHTML = "";

  let kategoriList = [...new Set(data.map(d => d.kategori))];

  kategoriList.forEach(k => {
    container.innerHTML += `
      <label class="kategori-item">
        <input 
          type="checkbox" 
          value="${k}" 
          onchange="updateKategori(this)"
        >
        <span>${k}</span>
      </label>
    `;
  });
}

function updateKategori(el) {
  if (el.checked) selectedKategori.push(el.value);
  else selectedKategori = selectedKategori.filter(k => k !== el.value);
}

function applyFilter() {
  let filtered = data.filter(item =>
    selectedKategori.length === 0 || selectedKategori.includes(item.kategori)
  );
  currentPage = 1; // 🔥 WAJIB
  render(filtered);
}

function resetFilter() {
  selectedKategori = [];
  currentPage = 1;
  render(data);
}

function exportExcel() {
  if (!currentFilteredData.length) return alert("Tidak ada data");

  let ws = XLSX.utils.json_to_sheet(currentFilteredData);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  XLSX.writeFile(wb, "keuangan.xlsx");
}

function selectAllKategori() {
  selectedKategori = [...new Set(data.map(d => d.kategori))];
  render(data);
}

function clearAllKategori() {
  selectedKategori = [];
  render(data);
}

// ============================
// DRAG
// ============================
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

function renderLaporan(listData) {
  let masuk = 0;
  let keluar = 0;

  let kategoriMasuk = {};
  let kategoriKeluar = {};

  listData.forEach(item => {
    if (item.tipe === "masuk") {
      masuk += item.nominal;

      if (!kategoriMasuk[item.kategori]) {
        kategoriMasuk[item.kategori] = 0;
      }
      kategoriMasuk[item.kategori] += item.nominal;

    } else {
      keluar += item.nominal;

      if (!kategoriKeluar[item.kategori]) {
        kategoriKeluar[item.kategori] = 0;
      }
      kategoriKeluar[item.kategori] += item.nominal;
    }
  });

  // 🔥 TOTAL
  document.getElementById("totalMasukReport").innerText =
    "Rp " + masuk.toLocaleString("id-ID");

  document.getElementById("totalKeluarReport").innerText =
    "Rp " + keluar.toLocaleString("id-ID");

  // 🔥 RENDER DETAIL
  let masukHTML = "";
  for (let k in kategoriMasuk) {
    masukHTML += `
      <div class="report-item">
        <span>${k}</span>
        <b>Rp ${kategoriMasuk[k].toLocaleString("id-ID")}</b>
      </div>
    `;
  }

  let keluarHTML = "";
  for (let k in kategoriKeluar) {
    keluarHTML += `
      <div class="report-item">
        <span>${k}</span>
        <b>Rp ${kategoriKeluar[k].toLocaleString("id-ID")}</b>
      </div>
    `;
  }

  document.getElementById("laporanMasuk").innerHTML = masukHTML;
  document.getElementById("laporanKeluar").innerHTML = keluarHTML;
}

function nextPage(total) {
  let totalPages = Math.ceil(total / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    render(currentFilteredData);
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    render(currentFilteredData);
  }
}

function resetForm() {
  document.getElementById("nama").value = "";
  document.getElementById("nominal").value = "";
  document.getElementById("kategori").value = "Bills";
  document.getElementById("tipe").value = "masuk";
  document.getElementById("wallet").value = "Cash";
  document.getElementById("isTransfer").value = "no";

  // tanggal = hari ini
  let tgl = document.getElementById("tanggal");
  if (tgl) tgl.valueAsDate = new Date();

  // reset transfer
  document.getElementById("fromWallet").value = "Cash";
  document.getElementById("toWallet").value = "Bank";

  toggleTransfer();
}
