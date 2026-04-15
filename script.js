let data = [];
let deleteIndex = null;
let selectedKategori = [];
let editIndex = null;
let currentFilteredData = [];
let kategoriList = [];
let editAsetId = null;

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
  loadAset();

  let tgl = document.getElementById("tanggal");
  if (tgl) tgl.valueAsDate = new Date();

  initSheetDrag();
  toggleTransfer();
  loadKategori();
};


// ============================
// TAMBAH / EDIT / TRANSFER
// ============================
function generateId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

function tambahData() {
  let tanggal = document.getElementById("tanggal").value;
  let namaInput = document.getElementById("nama").value;
  let nama = capitalizeWords(namaInput);
  let nominal = parseInt(document.getElementById("nominal").value);
  let kategori = document.getElementById("kategori").value;
  let tipe = document.getElementById("tipe").value;
  let wallet = document.getElementById("wallet").value;
  let modeTransfer = document.getElementById("isTransfer").value; // ← GANTI NAMA

  if (!nominal) return alert("Isi nominal!");

  // ================= EDIT =================
  if (editIndex) {
    db.ref("keuangan/" + editIndex).update({
      tanggal, nama, nominal, kategori, tipe, wallet
    });
    editIndex = null;
    closeSheet();
    resetForm();
    return;
  }

  // ================= TRANSFER =================
  if (modeTransfer === "yes") { // ← PAKAI modeTransfer
    let from = document.getElementById("fromWallet").value;
    let to = document.getElementById("toWallet").value;

    if (from === to) return alert("Wallet tidak boleh sama!");

    let id1 = generateId();
    let id2 = generateId();

    db.ref("keuangan/" + id1).set({
      id: id1, tanggal,
      nama: "Transfer ke " + to,
      nominal,
      type: "transfer",
      kategori: "Transfer",
      tipe: "keluar",
      wallet: from
    });

    db.ref("keuangan/" + id2).set({
      id: id2, tanggal,
      nama: "Transfer dari " + from,
      nominal,
      type: "transfer",
      kategori: "Transfer",
      tipe: "masuk",
      wallet: to
    });

  } else {
    let id = generateId();
    db.ref("keuangan/" + id).set({
      id, tanggal, nama, nominal, kategori, tipe, wallet
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
// ✅ FIX
function openDelete(key) {
  deleteIndex = key;
  let popup = document.getElementById("popup");
  popup.style.display = "flex";
  popup.classList.add("active");        // 🔥 INI YANG KURANG
  popup.style.pointerEvents = "auto";   // 🔥 double safety
}

function confirmDelete() {
  db.ref("keuangan/" + deleteIndex).remove();
  closePopup();
}

function renderKategoriDropdown() {
  let el = document.getElementById("kategori");
  el.innerHTML = "";

  kategoriList.forEach(k => {
    el.innerHTML += `<option value="${k.nama}">${k.nama}</option>`;
  });
}

function openKategoriManager() {
  let el = document.getElementById("popupKategori");

  el.classList.add("active");
  el.style.display = "flex";
  el.style.pointerEvents = "auto";
}

function closeKategori() {
  let el = document.getElementById("popupKategori");

  el.classList.remove("active");
  el.style.display = "none";
  el.style.pointerEvents = "none"; // 🔥 INI KUNCI
}

function capitalizeWords(text) {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}


function tambahKategori() {
  let nama = document.getElementById("newKategori").value;

  if (!nama) return alert("Isi nama kategori!");

  let id = generateId();

  db.ref("kategori/" + id).set(nama);
  setTimeout(() => {
  closeKategori();
}, 300);

  document.getElementById("newKategori").value = "";
  closeModalKategori(); // 🔥 auto close
}

function renderKategoriList() {
  let el = document.getElementById("listKategori");
  el.innerHTML = "";

  kategoriList.forEach(k => {
    el.innerHTML += `
      <div class="item">
        <span>${k.nama}</span>

        <div>
          <button onclick="editKategori('${k.id}', '${k.nama}')">Edit</button>
          <button onclick="hapusKategori('${k.id}')">Hapus</button>
        </div>
      </div>
    `;
  });
}

function hapusKategori(id) {
  const confirmHapus = confirm("Yakin mau hapus kategori ini?");

  if (!confirmHapus) return;

  db.ref("kategori/" + id).remove();

  closeModalKategori(); // 🔥 auto close
}

function closeModalKategori() {
  closeKategori(); // 🔥 pake ini aja
}

function editKategori(id, namaLama) {
  let baru = prompt("Edit kategori:", namaLama);
  if (!baru) return;

  db.ref("kategori/" + id).set(baru);
  closeModalKategori();
}

function closePopup() {
  let popup = document.getElementById("popup");
  popup.style.display = "none";
  popup.classList.remove("active");     // 🔥 bersihkan class
  popup.style.pointerEvents = "none";
}

// Load & Render
function loadAset() {
  db.ref("investasi").on("value", snapshot => {
    let val = snapshot.val() || {};
    let asetData = Object.keys(val).map(key => ({ ...val[key], firebaseKey: key }));
    renderAset(asetData);
  });
}

function renderAset(asetData) {
  let totalModal = 0, totalNilai = 0;
  let listEl = document.getElementById("listAset");
  listEl.innerHTML = "";

  // Icon per jenis
  const icon = {
    "Saham": "📈", "Reksa Dana": "💼", "Emas": "🥇",
    "Crypto": "🪙", "Properti": "🏠", "Deposito": "🏦", "Lainnya": "📦"
  };

  asetData.forEach(aset => {
    totalModal += aset.modal || 0;
    totalNilai += aset.nilai || 0;

    let pl = (aset.nilai || 0) - (aset.modal || 0);
    let plPersen = aset.modal ? ((pl / aset.modal) * 100).toFixed(1) : 0;
    let plClass = pl >= 0 ? "pl-positif" : "pl-negatif";
    let plSign = pl >= 0 ? "+" : "";

    listEl.innerHTML += `
      <div class="aset-card" onclick="editAset('${aset.firebaseKey}')">
        <div class="aset-card-top">
          <div class="aset-card-left">
            <strong>${icon[aset.jenis] || "📦"} ${aset.nama}</strong><br>
            <span class="aset-badge">${aset.jenis}</span>
          </div>
          <div class="${plClass}" style="text-align:right">
            <div style="font-size:13px">${plSign}Rp ${pl.toLocaleString("id-ID")}</div>
            <div style="font-size:11px;opacity:0.7">${plSign}${plPersen}%</div>
          </div>
        </div>

        <div class="aset-card-bottom">
          <div class="aset-row">
            <span>Modal</span>
            <b>Rp ${aset.modal.toLocaleString("id-ID")}</b>
          </div>
          <div class="aset-row" style="text-align:right">
            <span>Nilai Kini</span>
            <b>Rp ${aset.nilai.toLocaleString("id-ID")}</b>
          </div>
        </div>

        <div class="aset-actions">
          <button onclick="event.stopPropagation(); editAset('${aset.firebaseKey}')">✏️ Edit</button>
          <button class="btn-close" onclick="event.stopPropagation(); hapusAset('${aset.firebaseKey}')">🗑️ Hapus</button>
        </div>
      </div>
    `;
  });

  // Update summary
  let pl = totalNilai - totalModal;
  let plClass = pl >= 0 ? "pl-positif" : "pl-negatif";

  document.getElementById("totalModal").innerText = "Rp " + totalModal.toLocaleString("id-ID");
  document.getElementById("totalNilai").innerText = "Rp " + totalNilai.toLocaleString("id-ID");
  document.getElementById("totalPL").innerHTML =
    `<span class="${plClass}">${pl >= 0 ? "+" : ""}Rp ${pl.toLocaleString("id-ID")}</span>`;
}

// Form
function openAsetForm() {
  editAsetId = null;
  document.getElementById("asetFormTitle").innerText = "Tambah Aset";
  document.getElementById("asetNama").value = "";
  document.getElementById("asetModal").value = "";
  document.getElementById("asetNilai").value = "";
  document.getElementById("asetCatatan").value = "";
  document.getElementById("asetTanggal").valueAsDate = new Date();

  let popup = document.getElementById("popupAset");
  popup.style.display = "flex";
  popup.classList.add("active");
  popup.style.pointerEvents = "auto";
}

function closeAsetForm() {
  let popup = document.getElementById("popupAset");
  popup.style.display = "none";
  popup.classList.remove("active");
  popup.style.pointerEvents = "none";
}

function simpanAset() {
  let nama = document.getElementById("asetNama").value;
  let jenis = document.getElementById("asetJenis").value;
  let modal = parseInt(document.getElementById("asetModal").value);
  let nilai = parseInt(document.getElementById("asetNilai").value);
  let tanggal = document.getElementById("asetTanggal").value;
  let catatan = document.getElementById("asetCatatan").value;

  if (!nama || !modal || !nilai) return alert("Isi nama, modal, dan nilai!");

  let payload = { nama, jenis, modal, nilai, tanggal, catatan };

  if (editAsetId) {
    db.ref("investasi/" + editAsetId).update(payload);
  } else {
    let id = generateId();
    db.ref("investasi/" + id).set({ id, ...payload });
  }

  closeAsetForm();
}

function editAset(key) {
  db.ref("investasi/" + key).once("value", snap => {
    let a = snap.val();
    editAsetId = key;
    document.getElementById("asetFormTitle").innerText = "Edit Aset";
    document.getElementById("asetNama").value = a.nama;
    document.getElementById("asetJenis").value = a.jenis;
    document.getElementById("asetModal").value = a.modal;
    document.getElementById("asetNilai").value = a.nilai;
    document.getElementById("asetTanggal").value = a.tanggal;
    document.getElementById("asetCatatan").value = a.catatan || "";
    openAsetForm();
  });
}

function hapusAset(key) {
  if (confirm("Hapus aset ini?")) {
    db.ref("investasi/" + key).remove();
  }
}

// ============================
// RENDER
// ============================
function render(listData = data) {

  // 🚨 FILTER GLOBAL (INI KUNCI)
  currentFilteredData = listData;

  let list = document.getElementById("list");
  list.innerHTML = "";

  let saldo = 0, masuk = 0, keluar = 0;
  let cash = 0, bank = 0, ewallet = 0;

listData.forEach(item => {
  let isMasuk = item.tipe === "masuk";
  
  // Hanya hitung masuk/keluar kalau BUKAN transfer
  if (item.type !== "transfer" && item.kategori !== "Transfer") {
    masuk += isMasuk ? item.nominal : 0;
    keluar += !isMasuk ? item.nominal : 0;
  }

  // Saldo & wallet tetap dihitung semua (termasuk transfer)
  saldo += isMasuk ? item.nominal : -item.nominal;
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

let cleanData = listData.filter(item => !isTransfer(item));

// DEBUG — hapus setelah beres
console.log("RAW DATA:", listData.map(i => ({ 
  nama: i.nama, 
  kategori: i.kategori, 
  type: i.type 
})));
console.log("CLEAN DATA:", cleanData.map(i => ({ 
  nama: i.nama, 
  kategori: i.kategori 
})));

renderLaporan(cleanData);
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

  // 🔥 HITUNG JUMLAH PER KATEGORI
  let countMap = {};

  data.forEach(item => {
    // skip transfer
    if (isTransfer(item)) return;

    if (!countMap[item.kategori]) {
      countMap[item.kategori] = 0;
    }

    countMap[item.kategori]++;
  });

  // 🔥 RENDER DARI kategoriList (biar konsisten sama Firebase)
  kategoriList.forEach(k => {
    let jumlah = countMap[k.nama] || 0;

  if (jumlah === 0) return; // 🔥 optional

    container.innerHTML += `
      <label class="kategori-item">
        <input 
          type="checkbox" 
          value="${k.nama}" 
          onchange="updateKategori(this)"
        >
        <span>${k.nama} (${jumlah})</span>
      </label>
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

  let filtered = data.filter(item => {
    // ❌ skip transfer
    if (isTransfer(item)) return false;

    // ✅ FILTER KATEGORI
    if (selectedKategori.length > 0 && !selectedKategori.includes(item.kategori)) {
      return false;
    }

    // ✅ FILTER TANGGAL (BULAN)
    let itemMonth = item.tanggal?.slice(0, 7); // format YYYY-MM

    if (from && itemMonth < from) return false;
    if (to && itemMonth > to) return false;

    return true;
  });

  currentPage = 1;
  render(filtered);
  closeFilter(); // auto close 🔥
}

function resetFilter() {
  selectedKategori = [];
  currentPage = 1;
  render(data);

  closeFilter(); // 🔥 auto close
}

function closeFilter() {
  document.getElementById("filterPanel").style.display = "none";
}

function selectAllKategori() {
  selectedKategori = kategoriList.map(k => k.nama);

  document.querySelectorAll('#filterKategori input').forEach(el => {
    el.checked = true;
  });
}

function clearAllKategori() {
  selectedKategori = [];

  document.querySelectorAll('#filterKategori input').forEach(el => {
    el.checked = false;
  });
}

function exportExcel() {
  if (!currentFilteredData.length) return alert("Tidak ada data");

  let ws = XLSX.utils.json_to_sheet(currentFilteredData);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  XLSX.writeFile(wb, "keuangan.xlsx");
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
  if (item.type === "transfer" || 
      (item.kategori && item.kategori.toLowerCase() === "transfer")) return;

    if (item.tipe === "masuk") {
      masuk += item.nominal;
      if (!kategoriMasuk[item.kategori]) kategoriMasuk[item.kategori] = 0;
      kategoriMasuk[item.kategori] += item.nominal;
    } else {
      keluar += item.nominal;
      if (!kategoriKeluar[item.kategori]) kategoriKeluar[item.kategori] = 0;
      kategoriKeluar[item.kategori] += item.nominal;
    }
  });

  document.getElementById("totalMasukReport").innerText =
    "Rp " + masuk.toLocaleString("id-ID");

  document.getElementById("totalKeluarReport").innerText =
    "Rp " + keluar.toLocaleString("id-ID");

  let masukHTML = "";
  for (let k in kategoriMasuk) {

  if (k === "Transfer") continue; // 🔥 WAJIB
    masukHTML += `
      <div class="report-item">
        <span>🟢 ${k}</span>
        <b>Rp ${kategoriMasuk[k].toLocaleString("id-ID")}</b>
      </div>
    `;
  }

  let keluarHTML = "";
  for (let k in kategoriKeluar) {

  if (k === "Transfer") continue; // 🔥 WAJIB
    keluarHTML += `
      <div class="report-item">
        <span>🔴 ${k}</span>
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

function isTransfer(item) {
  return (
    item.type === "transfer" ||
    (item.kategori && item.kategori.toLowerCase() === "transfer")
  );
}

function loadKategori() {
  db.ref("kategori").on("value", snapshot => {
    let val = snapshot.val() || {};

    kategoriList = Object.entries(val).map(([key, value]) => ({
      id: key,
      nama: value
    }));

    renderKategoriDropdown();
    renderKategoriList(); // 🔥 INI YANG KURANG

if (kategoriList.length > 0) {
  document.getElementById("kategori").value = kategoriList[0].nama;
}
    generateKategoriFilter(); // 🔥 TAMBAH INI
  });
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
  if (kategoriList.length > 0) {
  document.getElementById("kategori").value = kategoriList[0].nama;
}
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

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("PWA siap diinstall 🔥");
});