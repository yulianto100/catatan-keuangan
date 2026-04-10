let data = [];
let currentGroup = null;

// INIT
auth.onAuthStateChanged(user => {
  if (!user) return;
  loadGroups(user);
});

// 🔥 LOAD GROUP (FIX TOTAL)
async function loadGroups(user) {
  let snap = await db.ref("userGroups/" + user.uid).once("value");
  let groups = snap.val() || {};

  let select = document.getElementById("groupSelect");
  select.innerHTML = "";

  let ids = Object.keys(groups);

  if (ids.length === 0) {
    select.innerHTML = `<option disabled selected>Belum ada database</option>`;
    return;
  }

  for (let gid of ids) {
    let nameSnap = await db.ref("groups/" + gid + "/name").once("value");

    let opt = document.createElement("option");
    opt.value = gid;
    opt.textContent = nameSnap.val() || gid;
    select.appendChild(opt);
  }

  currentGroup = ids[0];
  select.value = currentGroup;

  select.onchange = () => {
    currentGroup = select.value;
    loadData();
  };

  loadData();
}

// 🔥 CREATE GROUP (FIX)
async function createGroup() {
  let name = prompt("Nama database?");
  if (!name) return;

  let gid = "group_" + Date.now();
  let user = auth.currentUser;

  await db.ref("groups/" + gid).set({
    name: name,
    data: []
  });

  await db.ref("userGroups/" + user.uid + "/" + gid).set(true);

  currentGroup = gid;

  loadGroups(user);
}

// 🔥 LOAD DATA
function loadData() {
  if (!currentGroup) return;

  db.ref("groups/" + currentGroup + "/data").on("value", snap => {
    data = snap.val() || [];
    render();
  });
}

// 🔥 SAVE
function saveData() {
  if (!currentGroup) return;
  db.ref("groups/" + currentGroup + "/data").set(data);
}

// TAMBAH DATA
function tambahData() {
  let nama = document.getElementById("nama").value;
  let nominal = parseInt(document.getElementById("nominal").value);
  let tipe = document.getElementById("tipe").value;

  if (!nama || !nominal) return alert("Isi dulu");

  data.unshift({ nama, nominal, tipe });
  saveData();
}

// RENDER
function render() {
  let list = document.getElementById("list");
  list.innerHTML = "";

  let saldo = 0;

  data.forEach(d => {
    saldo += d.tipe === "masuk" ? d.nominal : -d.nominal;

    list.innerHTML += `
      <div class="item">
        ${d.nama} - Rp ${d.nominal}
      </div>
    `;
  });

  document.getElementById("saldo").innerText = "Rp " + saldo;
}

// UI
function openSheet() {
  document.getElementById("sheet").classList.add("active");
}
