"use strict";

let ALL_MATERIALS = [];
let ALL_MENUS = [];
let ALL_BOM = [];
let EDITING_BOM_ID = null;      // id baris BOM yang sedang diedit (qty/uom)
let ADD_BOM_OPEN_MENU = null;   // menu_code yang form "tambah bahan"-nya lagi kebuka
let ADD_BOM_SELECTED = null;    // material terpilih di form tambah bahan yang sedang terbuka
let ALL_SUPPLIER_ITEMS = [];
let DETAIL_LOADED = false;

const SUPPLIER_LIST = ["CK Ingredients", "CK Frozen", "Frenindo", "Vita"];
let PENDING_SUPPLIER_IMPORT = null;

let IS_ADMIN = false;

document.addEventListener("authReady", (e) => {
    IS_ADMIN = e.detail.role === "admin";
    document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = IS_ADMIN ? "" : "none";
    });
    unlockApp();
});

function unlockApp(){
    document.getElementById("appContent").style.display = "block";

    document.getElementById("bomFileInput").addEventListener("change", handleBomFile);
    document.getElementById("supplierFileInput").addEventListener("change", handleSupplierFile);
    initTabs();
    init();
}

async function init(){
    try {
        await ensureSeed();
        await loadOutletName();
        await refreshAll();
    } catch(err){
        console.error("Gagal memuat master data:", err);
        toast("Gagal memuat data. Coba refresh halaman (Ctrl+Shift+R).", "error");
    }
}

function toggleDetail(){
    const section = document.getElementById("detailSection");
    const btn = document.getElementById("toggleDetailBtn");
    const showing = section.style.display !== "none";
    section.style.display = showing ? "none" : "block";
    btn.textContent = showing ? "Lihat Detail Item & BOM ▾" : "Sembunyikan Detail ▴";
    if(!showing) section.scrollIntoView({behavior:"smooth", block:"start"});
}

function initTabs(){
    document.querySelectorAll(".tab-btn").forEach(btn=>{
        btn.addEventListener("click", ()=>{
            document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
            document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
        });
    });
}

async function ensureSeed(){
    await InvDB.ensureMasterSeed();
}

async function resetSeed(){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh mereset data master","error"); return; }
    if(!await uiConfirm("Reset seluruh Item & BOM ke data awal? Perubahan manual pada master akan hilang.")) return;
    await InvDB.clear("materials");
    await InvDB.clear("bom");
    await InvDB.clear("menus");
    await ensureSeed();
    await refreshAll();
    toast("✓ Data master direset", "success");
}

async function loadOutletName(){
    const name = await InvDB.getSetting("outletName", "ABBQ Indonesia");
    document.getElementById("outletName").value = name;
}

async function saveOutletName(){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh mengubah ini","error"); return; }
    const val = document.getElementById("outletName").value.trim();
    if(!val){ toast("Nama outlet tidak boleh kosong","error"); return; }
    await InvDB.setSetting("outletName", val);
    toast("✓ Nama outlet disimpan","success");
}

async function refreshAll(){
    ALL_MATERIALS = (await InvDB.getAll("materials")).sort((a,b)=>a.name.localeCompare(b.name));
    ALL_MENUS = (await InvDB.getAll("menus")).sort((a,b)=>a.menu_name.localeCompare(b.menu_name));
    ALL_BOM = await InvDB.getAll("bom");
    ALL_SUPPLIER_ITEMS = await InvDB.getAll("supplierItems");
    renderMaterials();
    renderMenus();
    renderSupplierItems();
}

/* ================= MATERIALS ================= */

function renderMaterials(){
    const key = document.getElementById("searchMaterial").value.toLowerCase();
    const filtered = ALL_MATERIALS.filter(m =>
        m.code.toLowerCase().includes(key) || (m.name||"").toLowerCase().includes(key)
    );
    document.getElementById("materialCount").textContent = ALL_MATERIALS.length;

    if(filtered.length === 0){
        document.getElementById("materialsBody").innerHTML =
            `<tr><td colspan="5" class="empty">Tidak ada item ditemukan</td></tr>`;
        return;
    }

    document.getElementById("materialsBody").innerHTML = filtered.map(m => `
        <tr>
            <td>${m.code}</td>
            <td>${m.name || ""}</td>
            <td>${m.uom || ""}</td>
            <td class="num">${m.konv ?? ""}</td>
            <td>
                ${IS_ADMIN ? `
                <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;width:auto;"
                    onclick="editMaterial('${m.code}')">Edit</button>
                <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;width:auto;color:#C23B2E;"
                    onclick="deleteMaterial('${m.code}')">Hapus</button>
                ` : ""}
            </td>
        </tr>
    `).join("");
}

function editMaterial(code){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh mengedit","error"); return; }
    const m = ALL_MATERIALS.find(x=>x.code===code);
    if(!m) return;
    document.getElementById("matCode").value = m.code;
    document.getElementById("matName").value = m.name;
    document.getElementById("matUom").value = m.uom;
    document.getElementById("matKonv").value = m.konv;
    document.getElementById("matCode").scrollIntoView({behavior:"smooth", block:"center"});
}

async function deleteMaterial(code){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh menghapus","error"); return; }
    const m = ALL_MATERIALS.find(x=>x.code===code);
    if(!m) return;
    if(!await uiConfirm(`Hapus item "${m.name}" (kode ${code})? Item ini tidak akan muncul lagi di dropdown Waste Tracker, Barang Masuk, Transfer, dll. Data transaksi lama yang sudah memakai item ini tidak akan terhapus.`)) return;

    try {
        await InvDB.remove("materials", code);
        await refreshAll();
        toast("✓ Item dihapus","success");
    } catch(err){
        console.error("Gagal hapus item:", err);
        toast("Gagal hapus item. Cek koneksi internet.","error");
    }
}

function resetMaterialForm(){
    document.getElementById("matCode").value = "";
    document.getElementById("matName").value = "";
    document.getElementById("matUom").value = "";
    document.getElementById("matKonv").value = "";
}

async function saveMaterial(){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh menambah/mengedit item","error"); return; }
    const code = document.getElementById("matCode").value.trim();
    const name = document.getElementById("matName").value.trim();
    const uom = document.getElementById("matUom").value.trim();
    const konv = Number(document.getElementById("matKonv").value) || 1;

    if(!code || !name || !uom){
        toast("Lengkapi kode, nama, dan UOM","error");
        return;
    }

    await InvDB.put("materials", { code, name, uom, konv });
    resetMaterialForm();
    await refreshAll();
    toast("✓ Item tersimpan","success");
}

/* ================= BOM / MENU ================= */

function renderMenus(){
    const key = document.getElementById("searchMenu").value.toLowerCase();
    const filtered = ALL_MENUS.filter(m =>
        m.menu_code.toLowerCase().includes(key) || (m.menu_name||"").toLowerCase().includes(key)
    );
    document.getElementById("menuCount").textContent = ALL_MENUS.length;

    if(filtered.length === 0){
        document.getElementById("menuList").innerHTML = `<div class="empty">Tidak ada menu ditemukan</div>`;
        return;
    }

    document.getElementById("menuList").innerHTML = filtered.map(m => {
        const rows = ALL_BOM.filter(b => b.menu_code === m.menu_code);
        return `
        <div class="panel">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                <div>
                    <div style="font-weight:700;font-size:14px;">${m.menu_name}</div>
                    <div style="font-size:12px;color:var(--muted);">Kode ${m.menu_code} · ${m.category || "-"}</div>
                </div>
                <span class="chip">${rows.length} bahan</span>
            </div>
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Kode Bahan</th><th>Nama Bahan</th><th class="num">Qty/Porsi</th><th>UOM</th>${IS_ADMIN ? "<th></th>" : ""}</tr></thead>
                    <tbody>
                        ${rows.map(r => r.id === EDITING_BOM_ID ? `
                            <tr>
                                <td>${r.material_code}</td>
                                <td>${r.material_name}</td>
                                <td class="num"><input type="number" id="editBomQty_${r.id}" value="${r.qty_per_portion}" style="width:70px;padding:4px 6px;"></td>
                                <td><input type="text" id="editBomUom_${r.id}" value="${r.uom}" style="width:60px;padding:4px 6px;"></td>
                                <td style="white-space:nowrap;">
                                    <button class="btn btn-primary" style="padding:6px 10px;font-size:12px;width:auto;" onclick="saveBomEdit('${r.id}')">Simpan</button>
                                    <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;width:auto;" onclick="cancelBomEdit()">Batal</button>
                                </td>
                            </tr>
                        ` : `
                            <tr>
                                <td>${r.material_code}</td>
                                <td>${r.material_name}</td>
                                <td class="num">${r.qty_per_portion}</td>
                                <td>${r.uom}</td>
                                ${IS_ADMIN ? `
                                <td style="white-space:nowrap;">
                                    <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;width:auto;" onclick="editBomRow('${r.id}')">Edit</button>
                                    <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;width:auto;color:#C23B2E;" onclick="deleteBomRow('${r.id}')">Hapus</button>
                                </td>
                                ` : ""}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
            ${IS_ADMIN ? `
            <div style="margin-top:10px;">
                <button class="btn btn-secondary" style="padding:6px 10px;font-size:12px;width:auto;" onclick="toggleAddBomForm('${m.menu_code}')">
                    ➕ Tambah Bahan
                </button>
            </div>
            ${ADD_BOM_OPEN_MENU === m.menu_code ? `
            <div class="panel" style="margin-top:10px;padding:12px;background:var(--paper);">
                <div class="field" style="position:relative;">
                    <label>Cari Bahan Baku</label>
                    <input type="text" id="addBomSearch_${m.menu_code}" placeholder="Cari kode atau nama bahan..." autocomplete="off">
                    <div class="suggest-list" id="addBomSuggest_${m.menu_code}"></div>
                </div>
                <div class="field-row">
                    <div class="field">
                        <label>Qty/Porsi</label>
                        <input type="number" id="addBomQty_${m.menu_code}">
                    </div>
                    <div class="field">
                        <label>UOM</label>
                        <input type="text" id="addBomUom_${m.menu_code}">
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary" onclick="submitAddBomRow('${m.menu_code}')">💾 Simpan Bahan</button>
                    <button class="btn btn-ghost" onclick="toggleAddBomForm('${m.menu_code}')">Batal</button>
                </div>
            </div>
            ` : ""}
            ` : ""}
        </div>`;
    }).join("");
}

function editBomRow(id){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh mengedit","error"); return; }
    EDITING_BOM_ID = id;
    renderMenus();
}

function cancelBomEdit(){
    EDITING_BOM_ID = null;
    renderMenus();
}

async function saveBomEdit(id){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh mengedit","error"); return; }
    const row = ALL_BOM.find(b => b.id === id);
    if(!row) return;

    const qtyInput = document.getElementById(`editBomQty_${id}`);
    const uomInput = document.getElementById(`editBomUom_${id}`);
    const qty = Number(qtyInput ? qtyInput.value : NaN);
    const uom = uomInput ? uomInput.value.trim() : "";

    if(!isFinite(qty) || qty < 0){ toast("Qty tidak valid","error"); return; }
    if(!uom){ toast("UOM tidak boleh kosong","error"); return; }

    const updated = { ...row, qty_per_portion: qty, uom };
    try {
        await InvDB.put("bom", updated);
    } catch(err){
        console.error("Gagal simpan BOM:", err);
        toast("Gagal simpan. Cek koneksi internet.","error");
        return;
    }
    Object.assign(row, updated);
    EDITING_BOM_ID = null;
    renderMenus();
    toast("✓ Bahan tersimpan","success");
}

async function deleteBomRow(id){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh menghapus","error"); return; }
    const row = ALL_BOM.find(b => b.id === id);
    if(!row) return;
    if(!await uiConfirm(`Hapus bahan "${row.material_name}" dari resep ini? Berguna untuk membersihkan baris duplikat/salah.`)) return;

    try {
        await InvDB.remove("bom", id);
    } catch(err){
        console.error("Gagal hapus BOM:", err);
        toast("Gagal hapus. Cek koneksi internet.","error");
        return;
    }
    ALL_BOM = ALL_BOM.filter(b => b.id !== id);
    renderMenus();
    toast("✓ Bahan dihapus","success");
}

function toggleAddBomForm(menuCode){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh menambah bahan","error"); return; }
    ADD_BOM_OPEN_MENU = (ADD_BOM_OPEN_MENU === menuCode) ? null : menuCode;
    ADD_BOM_SELECTED = null;
    renderMenus();
    if(ADD_BOM_OPEN_MENU){
        initAddBomAutocomplete(menuCode);
        const input = document.getElementById(`addBomSearch_${menuCode}`);
        if(input) input.focus();
    }
}

function initAddBomAutocomplete(menuCode){
    const input = document.getElementById(`addBomSearch_${menuCode}`);
    const list = document.getElementById(`addBomSuggest_${menuCode}`);
    if(!input || !list) return;

    function render(){
        const key = input.value.trim().toLowerCase();
        const matches = (key
            ? ALL_MATERIALS.filter(m => m.code.toLowerCase().includes(key) || (m.name||"").toLowerCase().includes(key))
            : ALL_MATERIALS
        ).slice(0, 30);

        if(matches.length === 0){
            list.innerHTML = `<div class="suggest-item" style="cursor:default;color:var(--muted);">Bahan tidak ditemukan</div>`;
            list.style.display = "block";
            return;
        }

        list.innerHTML = matches.map(m => `
            <div class="suggest-item" data-code="${m.code}">
                ${m.name}
                <small>Kode ${m.code} · ${m.uom}</small>
            </div>
        `).join("");
        list.style.display = "block";

        list.querySelectorAll(".suggest-item[data-code]").forEach(el => {
            el.addEventListener("click", () => {
                const m = ALL_MATERIALS.find(x => x.code === el.dataset.code);
                ADD_BOM_SELECTED = m;
                input.value = `${m.code} - ${m.name}`;
                const uomEl = document.getElementById(`addBomUom_${menuCode}`);
                if(uomEl) uomEl.value = m.uom;
                list.style.display = "none";
            });
        });
    }

    input.addEventListener("focus", render);
    input.addEventListener("click", render);
    input.addEventListener("input", () => {
        ADD_BOM_SELECTED = null;
        render();
    });

    document.addEventListener("click", (e) => {
        if(!list.contains(e.target) && e.target !== input){
            list.style.display = "none";
        }
    });
}

async function submitAddBomRow(menuCode){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh menambah bahan","error"); return; }

    const qtyInput = document.getElementById(`addBomQty_${menuCode}`);
    const uomInput = document.getElementById(`addBomUom_${menuCode}`);
    const qty = Number(qtyInput ? qtyInput.value : NaN);
    const uom = uomInput ? uomInput.value.trim() : "";

    if(!ADD_BOM_SELECTED){ toast("Pilih bahan dari daftar suggestion","error"); return; }
    if(!isFinite(qty) || qty < 0){ toast("Qty tidak valid","error"); return; }
    if(!uom){ toast("UOM tidak boleh kosong","error"); return; }

    const menu = ALL_MENUS.find(m => m.menu_code === menuCode);
    const already = ALL_BOM.find(b => b.menu_code === menuCode && b.material_code === ADD_BOM_SELECTED.code);
    if(already && !await uiConfirm(`"${ADD_BOM_SELECTED.name}" sudah ada di resep ini. Tambah baris duplikat lagi?`)) return;

    const row = {
        menu_code: menuCode,
        menu_name: menu ? menu.menu_name : "",
        category: menu ? (menu.category || null) : null,
        material_code: ADD_BOM_SELECTED.code,
        material_name: ADD_BOM_SELECTED.name,
        qty_per_portion: qty,
        uom
    };

    try {
        await InvDB.put("bom", row);
    } catch(err){
        console.error("Gagal tambah bahan BOM:", err);
        toast("Gagal simpan. Cek koneksi internet.","error");
        return;
    }
    // InvDB.put men-generate id baru untuk baris ini di server, tapi
    // tidak menuliskannya balik ke variabel `row` lokal - jadi refresh
    // dari server supaya ALL_BOM punya id yang benar (perlu untuk
    // tombol Edit/Hapus baris ini berfungsi tanpa reload halaman).
    ADD_BOM_OPEN_MENU = null;
    ADD_BOM_SELECTED = null;
    await refreshAll();
    toast(`✓ ${row.material_name} ditambahkan ke resep`,"success");
}

/* ================= NOTIF ================= */

function toast(msg, type="success"){
    const el = document.getElementById("notif");
    el.className = "notif " + type;
    el.innerHTML = msg;
    el.style.display = "block";
    setTimeout(()=>{ el.style.display = "none"; }, 2500);
}

/* ================= BOM EXCEL IMPORT ================= */

let PENDING_BOM_IMPORT = null;

function handleBomFile(e){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh upload BOM","error"); return; }
    const file = e.target.files[0];
    if(!file) return;
    document.getElementById("bomFileName").textContent = file.name;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });
            processBomWorkbook(wb);
        } catch(err){
            console.error(err);
            toast("Gagal membaca file. Pastikan format .xlsx/.xls","error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function findSheetName(wb, candidates){
    const names = wb.SheetNames;
    for(const c of candidates){
        const found = names.find(n => n.trim().toLowerCase() === c.toLowerCase());
        if(found) return found;
    }
    return null;
}

async function processBomWorkbook(wb){
    const salesSheetName = findSheetName(wb, ["Sales", "Sales dan Waste", "Sales Dan Waste"]) || wb.SheetNames[0];
    const bomSheetName = findSheetName(wb, ["BOM"]) || wb.SheetNames[1] || wb.SheetNames[0];

    const salesSheet = wb.Sheets[salesSheetName];
    const bomSheet = wb.Sheets[bomSheetName];

    const salesRows = XLSX.utils.sheet_to_json(salesSheet, { defval: "", header: 1 });
    const bomRows = XLSX.utils.sheet_to_json(bomSheet, { defval: "", header: 1 });

    // Menus from "Sales dan Waste": col A = menu code, col B = menu name
    const menus = [];
    salesRows.slice(1).forEach(row => {
        const code = row[0];
        const name = row[1];
        if(code === "" || code === undefined || code === null) return;
        menus.push({ menu_code: String(code).trim(), menu_name: String(name || "").trim() });
    });

    // BOM sheet: col A menu code, B menu name, C material code, D material name, E qty, F uom
    // Header may span a couple of rows before data starts; find first row where col C is numeric/non-empty and col A too.
    const bomParsed = [];
    bomRows.forEach(row => {
        const menuCode = row[0], menuName = row[1], matCode = row[2], matName = row[3], qty = row[4], uom = row[5];
        if(menuCode === "" || menuCode === undefined || menuCode === null) return;
        if(matCode === "" || matCode === undefined || matCode === null) return;
        // skip header-like rows
        if(String(menuCode).toLowerCase().includes("nomor material")) return;
        bomParsed.push({
            menu_code: String(menuCode).trim(),
            menu_name: String(menuName || "").trim(),
            category: null,
            material_code: String(matCode).trim(),
            material_name: String(matName || "").trim(),
            qty_per_portion: Number(qty) || 0,
            uom: String(uom || "").trim()
        });
    });

    if(bomParsed.length === 0){
        toast("Tidak ada baris BOM valid ditemukan di file ini","error");
        return;
    }

    // Build updated materials list: merge with existing (preserve konv)
    const existingMaterials = await InvDB.getAll("materials");
    const existingMap = new Map(existingMaterials.map(m => [m.code, m]));

    const materialsFromBom = new Map();
    bomParsed.forEach(r => {
        if(!materialsFromBom.has(r.material_code)){
            materialsFromBom.set(r.material_code, { code: r.material_code, name: r.material_name, uom: r.uom });
        }
    });

    let newCount = 0, updatedCount = 0;
    const finalMaterials = new Map(existingMap);
    materialsFromBom.forEach((m, code) => {
        if(finalMaterials.has(code)){
            const old = finalMaterials.get(code);
            finalMaterials.set(code, { ...old, name: m.name || old.name, uom: m.uom || old.uom });
            updatedCount++;
        } else {
            finalMaterials.set(code, { code, name: m.name, uom: m.uom, konv: 1 });
            newCount++;
        }
    });

    PENDING_BOM_IMPORT = {
        menus,
        bom: bomParsed,
        materials: Array.from(finalMaterials.values())
    };

    document.getElementById("bomPrevMenus").textContent = menus.length;
    document.getElementById("bomPrevRows").textContent = bomParsed.length;
    document.getElementById("bomPrevNewItems").textContent = newCount;
    document.getElementById("bomPrevUpdatedItems").textContent = updatedCount;
    document.getElementById("bomPreview").style.display = "block";
}

async function confirmBomImport(){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh update BOM","error"); return; }
    if(!PENDING_BOM_IMPORT){ toast("Belum ada file yang diproses","error"); return; }
    if(!await uiConfirm("Update Master Data (Item & BOM) dengan file ini? Data BOM & daftar menu lama akan digantikan.")) return;

    await InvDB.clear("bom");
    await InvDB.clear("menus");
    await InvDB.bulkPut("bom", PENDING_BOM_IMPORT.bom);
    await InvDB.bulkPut("menus", PENDING_BOM_IMPORT.menus);
    await InvDB.bulkPut("materials", PENDING_BOM_IMPORT.materials);

    PENDING_BOM_IMPORT = null;
    document.getElementById("bomPreview").style.display = "none";
    document.getElementById("bomFileInput").value = "";
    document.getElementById("bomFileName").textContent = "";

    await refreshAll();
    toast("✓ Master Data berhasil diperbarui","success");
}

/* ================= SUPPLIER BARANG (In CK / In Supplier) ================= */

function renderSupplierItems(){
    const key = (document.getElementById("searchSupplierItem").value || "").toLowerCase();
    const supplierByCode = new Map(ALL_SUPPLIER_ITEMS.map(s => [s.code, s.supplier]));

    const filtered = ALL_MATERIALS.filter(m =>
        m.code.toLowerCase().includes(key) || (m.name||"").toLowerCase().includes(key)
    );

    document.getElementById("supplierItemsBody").innerHTML = filtered.map(m => {
        const current = supplierByCode.get(m.code) || "";
        return `
        <tr>
            <td>${m.code}</td>
            <td>${m.name || ""}</td>
            <td>
                ${IS_ADMIN ? `
                <select onchange="setSupplierForItem('${m.code}', this.value)" style="padding:6px;border-radius:8px;border:1px solid var(--line);">
                    <option value="">— belum ditentukan —</option>
                    ${SUPPLIER_LIST.map(s => `<option value="${s}" ${s===current?"selected":""}>${s}</option>`).join("")}
                </select>
                ` : (current || `<span style="color:var(--muted);">— belum ditentukan —</span>`)}
            </td>
            <td></td>
        </tr>
        `;
    }).join("") || `<tr><td colspan="4" class="empty">Tidak ada item ditemukan</td></tr>`;
}

async function setSupplierForItem(code, supplier){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh mengubah ini","error"); return; }
    const material = ALL_MATERIALS.find(m => m.code === code);
    try {
        if(!supplier){
            await InvDB.remove("supplierItems", code);
            ALL_SUPPLIER_ITEMS = ALL_SUPPLIER_ITEMS.filter(s => s.code !== code);
        } else {
            await InvDB.put("supplierItems", { code, name: material ? material.name : "", supplier });
            ALL_SUPPLIER_ITEMS = ALL_SUPPLIER_ITEMS.filter(s => s.code !== code);
            ALL_SUPPLIER_ITEMS.push({ code, name: material ? material.name : "", supplier });
        }
        toast("✓ Supplier item disimpan","success");
    } catch(err){
        console.error(err);
        toast("Gagal simpan. Cek koneksi internet.","error");
    }
}

function downloadSupplierTemplate(){
    const header = ["Kode Item", "Nama Item", "Supplier"];
    const supplierByCode = new Map(ALL_SUPPLIER_ITEMS.map(s => [s.code, s.supplier]));
    const rows = ALL_MATERIALS.map(m => [m.code, m.name, supplierByCode.get(m.code) || ""]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Item");

    // Sheet ke-2 cuma catatan daftar nama supplier yang valid (bukan
    // data-validation dropdown asli - Excel/HP kadang tidak baca
    // validation dari sheet lain dengan baik, jadi ini sekadar panduan
    // teks supaya pengisian kolom Supplier tetap konsisten).
    const noteWs = XLSX.utils.aoa_to_sheet([
        ["Daftar Nama Supplier yang Valid (ketik PERSIS salah satu ini di kolom Supplier)"],
        ...SUPPLIER_LIST.map(s => [s])
    ]);
    XLSX.utils.book_append_sheet(wb, noteWs, "Daftar Supplier Valid");

    XLSX.writeFile(wb, "Template_Supplier_Item.xlsx");
}

function handleSupplierFile(e){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh upload ini","error"); return; }
    const file = e.target.files[0];
    if(!file) return;
    document.getElementById("supplierFileName").textContent = file.name;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });
            processSupplierWorkbook(wb);
        } catch(err){
            console.error(err);
            toast("Gagal membaca file. Pastikan format .xlsx/.xls","error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function processSupplierWorkbook(wb){
    const sheetName = findSheetName(wb, ["Supplier Item"]) || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });

    const validSet = new Set(SUPPLIER_LIST.map(s => s.toLowerCase()));
    const parsed = [];
    const invalid = [];

    rows.slice(1).forEach(row => {
        const code = row[0], name = row[1], supplierRaw = row[2];
        if(code === "" || code === undefined || code === null) return;
        const codeStr = String(code).trim();
        const supplierStr = String(supplierRaw || "").trim();
        if(!supplierStr) return; // baris belum diisi supplier, lewati diam-diam

        const match = SUPPLIER_LIST.find(s => s.toLowerCase() === supplierStr.toLowerCase());
        if(!match){
            invalid.push(`${codeStr} (${name || ""}): "${supplierStr}"`);
            return;
        }
        parsed.push({ code: codeStr, name: String(name || "").trim(), supplier: match });
    });

    PENDING_SUPPLIER_IMPORT = parsed;

    document.getElementById("supPrevRows").textContent = rows.length - 1;
    document.getElementById("supPrevMapped").textContent = parsed.length;
    document.getElementById("supPrevInvalid").textContent = invalid.length;

    const invalidBox = document.getElementById("supPrevInvalidList");
    if(invalid.length > 0){
        invalidBox.style.display = "block";
        invalidBox.innerHTML = `⚠ ${invalid.length} baris punya nama supplier yang tidak dikenali (dilewati, tidak ikut disimpan):<br>` +
            invalid.slice(0,15).map(s => `• ${s}`).join("<br>") +
            (invalid.length > 15 ? `<br>...dan ${invalid.length - 15} lainnya` : "");
    } else {
        invalidBox.style.display = "none";
    }

    document.getElementById("supplierPreview").style.display = "block";
}

async function confirmSupplierImport(){
    if(!IS_ADMIN){ toast("Hanya Admin yang boleh update ini","error"); return; }
    if(!PENDING_SUPPLIER_IMPORT || PENDING_SUPPLIER_IMPORT.length === 0){ toast("Tidak ada baris valid untuk disimpan","error"); return; }
    if(!await uiConfirm(`Simpan pemetaan supplier untuk ${PENDING_SUPPLIER_IMPORT.length} item? Item yang sudah punya supplier sebelumnya akan digantikan sesuai file ini.`)) return;

    try {
        await InvDB.bulkPut("supplierItems", PENDING_SUPPLIER_IMPORT);
        PENDING_SUPPLIER_IMPORT = null;
        document.getElementById("supplierPreview").style.display = "none";
        document.getElementById("supplierFileInput").value = "";
        document.getElementById("supplierFileName").textContent = "";
        await refreshAll();
        toast("✓ Pemetaan supplier berhasil disimpan","success");
    } catch(err){
        console.error(err);
        toast("Gagal menyimpan. Cek koneksi internet.","error");
    }
}
