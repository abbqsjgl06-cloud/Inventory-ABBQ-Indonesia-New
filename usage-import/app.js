"use strict";

let BOM_ROWS = [];
let MENUS = [];
let PARSED_ROWS = [];
let SALES_BY_MENU = {};
let SALES_BY_DATE_MENU = {};   // { "2026-07-16": { menuCode: qty } }
let USAGE_RESULT = {};   // material_code -> qty (total file, for preview + back-compat)
let USAGE_BY_DATE_MATERIAL = {}; // { "2026-07-16": { materialCode: qty } }
let UNMATCHED_MENUS = new Set();
let DATE_MIN = null, DATE_MAX = null;
let ALL_IMPORTS = [];
let HISTORY_FILTER_APPLIED = false;

document.addEventListener("DOMContentLoaded", async () => {
    await InvDB.ensureMasterSeed();
    BOM_ROWS = await InvDB.getAll("bom");
    MENUS = await InvDB.getAll("menus");
    ALL_IMPORTS = await InvDB.getAll("usageImports");

    document.getElementById("periodLabel").value = defaultPeriodLabel();

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    document.getElementById("histFilterStart").value = start.toISOString().slice(0,10);
    document.getElementById("histFilterEnd").value = end.toISOString().slice(0,10);

    document.getElementById("fileInput").addEventListener("change", handleFile);
    renderHistoryPrompt();

    MATERIALS_FOR_LOOKUP = await InvDB.getAll("materials");
    await refreshCoveredDatesCache();
    let dailyUsageDebounce = null;
    document.getElementById("dailyUsageSearch").addEventListener("input", (e) => {
        clearTimeout(dailyUsageDebounce);
        dailyUsageDebounce = setTimeout(() => lookupDailyUsage(e.target.value), 350);
    });
});

let MATERIALS_FOR_LOOKUP = [];
let ALL_DAILY_MATERIAL_DATES = new Set();

async function refreshCoveredDatesCache(){
    ALL_DAILY_MATERIAL_DATES = new Set((await InvDB.getAll("usageDailyMaterial")).map(r => r.date));
}

async function lookupDailyUsage(query){
    const key = query.trim().toLowerCase();
    const resultBox = document.getElementById("dailyUsageResult");
    const emptyBox = document.getElementById("dailyUsageEmpty");

    if(!key){
        resultBox.style.display = "none";
        emptyBox.style.display = "none";
        return;
    }

    const material = MATERIALS_FOR_LOOKUP.find(m =>
        String(m.code).toLowerCase() === key || (m.name||"").toLowerCase().includes(key)
    );
    if(!material){
        resultBox.style.display = "none";
        emptyBox.style.display = "block";
        emptyBox.textContent = "Item tidak ditemukan di Master Data.";
        return;
    }

    const all = await InvDB.getByIndex("usageDailyMaterial", "material_code", material.code);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29); // 30 hari termasuk hari ini
    const startStr = start.toISOString().slice(0,10);
    const endStr = end.toISOString().slice(0,10);

    const inRange = all.filter(r => r.date >= startStr && r.date <= endStr).sort((a,b)=> b.date.localeCompare(a.date));

    if(inRange.length === 0){
        resultBox.style.display = "none";
        emptyBox.style.display = "block";
        emptyBox.textContent = `Belum ada data usage harian untuk "${material.name}" dalam 30 hari terakhir. (Pastikan file yang diupload punya kolom tanggal per baris.)`;
        return;
    }

    const total = inRange.reduce((s,r)=> s + (Number(r.qty)||0), 0);

    // Sama seperti Forecasting Ordering: pembaginya adaptif. Kalau baru
    // ada 10 hari data usage yang ter-upload, dibagi 10 (rata-rata dari
    // yang ada) - bukan dipaksa dibagi 30 yang akan bikin angkanya
    // kekecilan selama 30 hari pertama pemakaian.
    let coveredDaysInWindow = 0;
    ALL_DAILY_MATERIAL_DATES.forEach(d => { if(d >= startStr && d <= endStr) coveredDaysInWindow++; });
    const denom = coveredDaysInWindow > 0 ? Math.min(30, coveredDaysInWindow) : 30;
    const avg = total / denom;

    document.getElementById("dailyUsageTotal").textContent = fmtNum(total) + " " + material.uom;
    document.getElementById("dailyUsageAvg").textContent = fmtNum(avg) + " " + material.uom;
    document.getElementById("dailyUsageDaysCount").textContent = `${inRange.length} hari ada penjualan item ini (rata-rata dihitung /${denom} hari cakupan data)`;
    document.getElementById("dailyUsageBody").innerHTML = inRange.map(r => `
        <tr><td>${r.date}</td><td class="num">${fmtNum(r.qty)}</td></tr>
    `).join("");

    resultBox.style.display = "block";
    emptyBox.style.display = "none";
}

function fmtNum(n){
    return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function applyHistoryFilter(){
    HISTORY_FILTER_APPLIED = true;
    renderImportHistory();
}

function renderHistoryPrompt(){
    document.getElementById("importHistoryBody").innerHTML =
        `<tr><td colspan="6" class="empty">Pilih rentang tanggal lalu klik "Tampilkan Riwayat"</td></tr>`;
}

function defaultPeriodLabel(){
    const d = new Date();
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function handleFile(e){
    const file = e.target.files[0];
    if(!file) return;
    document.getElementById("fileName").textContent = file.name;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array", cellDates: true });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            PARSED_ROWS = rows;
            processRows(rows, file.name);
        } catch(err){
            console.error(err);
            toast("Gagal membaca file. Pastikan format .xlsx/.xls/.csv","error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function findKey(row, candidates){
    const keys = Object.keys(row);
    for(const c of candidates){
        const found = keys.find(k => k.trim().toLowerCase() === c.toLowerCase());
        if(found) return found;
    }
    return null;
}

function parseFlexibleDate(value){
    if(value === null || value === undefined || value === "") return null;

    if(value instanceof Date && !isNaN(value)) return value;

    if(typeof value === "number"){
        // Excel serial date number
        try {
            const parsed = XLSX.SSF.parse_date_code(value);
            if(parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
        } catch(e){ /* fall through */ }
    }

    if(typeof value === "string"){
        const s = value.trim();

        // YYYY-MM-DD or YYYY/MM/DD
        let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if(m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));

        // DD-MM-YYYY or DD/MM/YYYY (Indonesian format)
        m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if(m) return new Date(Date.UTC(+m[3], +m[2]-1, +m[1]));

        // Fallback to native parsing
        const native = new Date(s);
        if(!isNaN(native)) return native;
    }

    return null;
}

function processRows(rows, filename){
    if(rows.length === 0){
        toast("File kosong","error");
        return;
    }

    const codeKey = findKey(rows[0], ["Code","Kode"]);
    const qtyKey = findKey(rows[0], ["Qty","Quantity"]);
    const dateKey = findKey(rows[0], ["Date","Tanggal"]);

    if(!codeKey || !qtyKey){
        toast("Kolom 'Code' dan 'Qty' tidak ditemukan di file","error");
        return;
    }

    SALES_BY_MENU = {};
    SALES_BY_DATE_MENU = {};
    DATE_MIN = null; DATE_MAX = null;
    let rowsWithoutDate = 0;

    rows.forEach(r => {
        const code = String(r[codeKey]).trim();
        const qty = Number(r[qtyKey]) || 0;
        if(!code) return;
        SALES_BY_MENU[code] = (SALES_BY_MENU[code] || 0) + qty;

        let dateStr = null;
        if(dateKey && r[dateKey] !== "" && r[dateKey] !== undefined && r[dateKey] !== null){
            const d = parseFlexibleDate(r[dateKey]);
            if(d){
                if(!DATE_MIN || d < DATE_MIN) DATE_MIN = d;
                if(!DATE_MAX || d > DATE_MAX) DATE_MAX = d;
                dateStr = d.toISOString().slice(0,10);
            }
        }

        // Setiap baris DIKELOMPOKKAN per tanggal (bukan cuma dijumlah
        // total 1 file) - ini penting supaya Forecasting Ordering &
        // Rekap Menu bisa lihat usage harian & rata-rata 30 hari, bukan
        // cuma 1 angka gabungan untuk seluruh periode file.
        if(!dateStr) { rowsWithoutDate++; return; }
        if(!SALES_BY_DATE_MENU[dateStr]) SALES_BY_DATE_MENU[dateStr] = {};
        SALES_BY_DATE_MENU[dateStr][code] = (SALES_BY_DATE_MENU[dateStr][code] || 0) + qty;
    });

    // translate ke bahan baku via BOM - baik totalnya (utk preview +
    // usageDetail lama) maupun PER TANGGAL (utk usageDailyMaterial baru)
    USAGE_RESULT = {};
    USAGE_BY_DATE_MATERIAL = {};
    UNMATCHED_MENUS = new Set();

    const bomByMenu = {};
    BOM_ROWS.forEach(b => {
        if(!bomByMenu[b.menu_code]) bomByMenu[b.menu_code] = [];
        bomByMenu[b.menu_code].push(b);
    });

    function translateMenuToMaterial(menuCode, qtySold, targetBucket){
        const bomLines = bomByMenu[menuCode];
        if(!bomLines){
            UNMATCHED_MENUS.add(menuCode);
            return;
        }
        bomLines.forEach(line => {
            const usage = qtySold * Number(line.qty_per_portion || 0);
            targetBucket[line.material_code] = (targetBucket[line.material_code] || 0) + usage;
        });
    }

    Object.keys(SALES_BY_MENU).forEach(menuCode => {
        translateMenuToMaterial(menuCode, SALES_BY_MENU[menuCode], USAGE_RESULT);
    });

    Object.keys(SALES_BY_DATE_MENU).forEach(dateStr => {
        USAGE_BY_DATE_MATERIAL[dateStr] = {};
        Object.keys(SALES_BY_DATE_MENU[dateStr]).forEach(menuCode => {
            translateMenuToMaterial(menuCode, SALES_BY_DATE_MENU[dateStr][menuCode], USAGE_BY_DATE_MATERIAL[dateStr]);
        });
    });

    document.getElementById("rowsRead").textContent = rows.length;
    document.getElementById("menuUnik").textContent = Object.keys(SALES_BY_MENU).length;
    document.getElementById("menuMatched").textContent = Object.keys(SALES_BY_MENU).length - UNMATCHED_MENUS.size;
    document.getElementById("menuUnmatched").textContent = UNMATCHED_MENUS.size;
    document.getElementById("previewBox").style.display = "block";

    const dateWarning = document.getElementById("dateWarning");
    if(dateWarning){
        if(!dateKey){
            dateWarning.style.display = "block";
            dateWarning.textContent = "⚠ Kolom tanggal tidak ditemukan di file. Data TIDAK BISA dipecah per hari (Forecasting Ordering & Rekap Menu butuh kolom tanggal per baris) - hanya total periode yang tersimpan.";
        } else if(!DATE_MIN || !DATE_MAX){
            dateWarning.style.display = "block";
            dateWarning.textContent = "⚠ Kolom tanggal ditemukan tapi formatnya tidak terbaca. Coba format tanggal YYYY-MM-DD atau DD/MM/YYYY di file Excel-nya.";
        } else if(rowsWithoutDate > 0){
            dateWarning.style.display = "block";
            dateWarning.textContent = `⚠ ${rowsWithoutDate} baris tidak punya tanggal terbaca dan tidak ikut dipecah per hari (tetap ikut di total periode).`;
        } else {
            dateWarning.style.display = "none";
        }
    }

    window._pendingFilename = filename;
}

async function confirmImport(){
    const periodLabel = document.getElementById("periodLabel").value.trim() || defaultPeriodLabel();
    const importId = "usg_" + Date.now();
    const outletTag = (typeof window !== "undefined" && window.CURRENT_OUTLET_ID) ? window.CURRENT_OUTLET_ID : "shared";

    const header = {
        id: importId,
        filename: window._pendingFilename || "upload.xlsx",
        periodLabel,
        dateImported: new Date().toISOString(),
        periodStart: DATE_MIN ? DATE_MIN.toISOString().slice(0,10) : null,
        periodEnd: DATE_MAX ? DATE_MAX.toISOString().slice(0,10) : null,
        rowCount: PARSED_ROWS.length,
        unmatchedCount: UNMATCHED_MENUS.size,
        unmatchedMenus: Array.from(UNMATCHED_MENUS)
    };

    await InvDB.put("usageImports", header);

    // usageDetail - total per bahan baku utk 1 file (dipakai Laporan
    // Variance, TIDAK diubah supaya laporan lama tetap jalan persis
    // seperti sebelumnya).
    const details = Object.entries(USAGE_RESULT).map(([material_code, qty]) => ({
        importId, material_code, qty
    }));
    await InvDB.bulkPut("usageDetail", details);

    // usageDailyMenu - usage MENU per tanggal (dipakai Rekap Menu).
    // ID deterministik (outlet_tanggal_kodemenu) supaya kalau tanggal
    // yang sama diupload ulang, datanya DIGANTI bukan dobel.
    const dailyMenuRows = [];
    Object.keys(SALES_BY_DATE_MENU).forEach(dateStr => {
        Object.keys(SALES_BY_DATE_MENU[dateStr]).forEach(menuCode => {
            dailyMenuRows.push({
                id: `${outletTag}_${dateStr}_${menuCode}`,
                date: dateStr,
                menu_code: menuCode,
                qty: SALES_BY_DATE_MENU[dateStr][menuCode],
                importId
            });
        });
    });
    await InvDB.bulkPut("usageDailyMenu", dailyMenuRows);

    // usageDailyMaterial - usage BAHAN BAKU per tanggal (dipakai
    // Forecasting Ordering utk rata-rata harian & pengurangan stock
    // opname yang presisi per hari, bukan prorata).
    const dailyMaterialRows = [];
    Object.keys(USAGE_BY_DATE_MATERIAL).forEach(dateStr => {
        Object.keys(USAGE_BY_DATE_MATERIAL[dateStr]).forEach(materialCode => {
            dailyMaterialRows.push({
                id: `${outletTag}_${dateStr}_${materialCode}`,
                date: dateStr,
                material_code: materialCode,
                qty: USAGE_BY_DATE_MATERIAL[dateStr][materialCode],
                importId
            });
        });
    });
    await InvDB.bulkPut("usageDailyMaterial", dailyMaterialRows);
    await refreshCoveredDatesCache();

    ALL_IMPORTS.push(header);
    document.getElementById("previewBox").style.display = "none";
    document.getElementById("fileInput").value = "";
    document.getElementById("fileName").textContent = "";

    renderImportHistory();
    const dayCount = Object.keys(SALES_BY_DATE_MENU).length;
    toast(`✓ Usage berhasil disimpan (${details.length} item bahan baku${dayCount > 0 ? `, ${dayCount} hari terpecah` : ""})`, "success");
}

async function deleteImport(id){
    if(!await uiConfirm("Hapus riwayat import ini? Usage terkait (termasuk breakdown harian) akan dihapus dari laporan variance, Forecasting Ordering, dan Rekap Menu.")) return;
    await InvDB.remove("usageImports", id);

    const details = await InvDB.getByIndex("usageDetail", "importId", id);
    for(const d of details){
        await InvDB.remove("usageDetail", d.id);
    }

    const dailyMenu = await InvDB.getByIndex("usageDailyMenu", "importId", id);
    for(const d of dailyMenu){
        await InvDB.remove("usageDailyMenu", d.id);
    }

    const dailyMaterial = await InvDB.getByIndex("usageDailyMaterial", "importId", id);
    for(const d of dailyMaterial){
        await InvDB.remove("usageDailyMaterial", d.id);
    }

    ALL_IMPORTS = ALL_IMPORTS.filter(i => i.id !== id);
    renderImportHistory();
    toast("✓ Dihapus","success");
}

function renderImportHistory(){
    if(!HISTORY_FILTER_APPLIED){ renderHistoryPrompt(); return; }

    const startEl = document.getElementById("histFilterStart");
    const endEl = document.getElementById("histFilterEnd");
    const start = startEl ? startEl.value : "";
    const end = endEl ? endEl.value : "";

    const filtered = ALL_IMPORTS.filter(h => {
        if(!start && !end) return true;
        // Prefer the detected data date range; fall back to upload date if not detected.
        const rangeStart = h.periodStart || (h.dateImported ? h.dateImported.slice(0,10) : null);
        const rangeEnd = h.periodEnd || (h.dateImported ? h.dateImported.slice(0,10) : null);
        if(!rangeStart || !rangeEnd) return true;
        if(start && rangeEnd < start) return false;
        if(end && rangeStart > end) return false;
        return true;
    });

    const sorted = [...filtered].sort((a,b)=>b.dateImported.localeCompare(a.dateImported));
    if(sorted.length === 0){
        document.getElementById("importHistoryBody").innerHTML =
            `<tr><td colspan="6" class="empty">${ALL_IMPORTS.length === 0 ? "Belum ada import" : "Tidak ada riwayat pada rentang tanggal ini"}</td></tr>`;
        return;
    }
    document.getElementById("importHistoryBody").innerHTML = sorted.map(h => `
        <tr>
            <td><b>${h.periodStart ? `${h.periodStart} s/d ${h.periodEnd}` : ""}</b>${!h.periodStart ? `<span style="color:#C23B2E;">Tidak terdeteksi</span>` : ""}</td>
            <td>${h.periodLabel}</td>
            <td>${new Date(h.dateImported).toLocaleString("id-ID")}</td>
            <td>${h.filename}</td>
            <td class="num">${h.rowCount}</td>
            <td class="num">${h.unmatchedCount || 0}</td>
            <td>
                <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;width:auto;"
                    onclick="deleteImport('${h.id}')">Hapus</button>
            </td>
        </tr>
    `).join("");
}

function toast(msg, type="success"){
    const el = document.getElementById("notif");
    el.className = "notif " + type;
    el.innerHTML = msg;
    el.style.display = "block";
    setTimeout(()=>{ el.style.display = "none"; }, 2500);
}

/* ================= ADMIN: TEMPLATE DOWNLOAD ================= */

document.addEventListener("authReady", (e) => {
    const box = document.getElementById("adminToolsBox");
    if(box) box.style.display = (e.detail.role === "admin") ? "block" : "none";
});

function downloadTemplate(){
    const header = ["Date","Code","Desc","Major","Family","Qty","Discount","Net Sales","RVC","Order Type"];
    const sampleMenu = MENUS[0] || { menu_code: "1111001", menu_name: "Contoh Menu" };
    const today = new Date().toISOString().slice(0,10);
    const sample1 = [today, sampleMenu.menu_code, sampleMenu.menu_name, "", "", 5, 0, 0, "", "Dine In"];
    const sample2 = [today, sampleMenu.menu_code, sampleMenu.menu_name, "", "", 3, 0, 0, "", "Take Away"];

    const ws = XLSX.utils.aoa_to_sheet([header, sample1, sample2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Usage");
    XLSX.writeFile(wb, "Template_Import_Usage.xlsx");
}

/* ================= ADMIN: MENU TANPA BOM ================= */

async function showMenusWithoutBom(){
    const bomMenuCodes = new Set(BOM_ROWS.map(b => b.menu_code));
    const missing = MENUS.filter(m => !bomMenuCodes.has(m.menu_code));

    const box = document.getElementById("noBomResult");
    box.style.display = "block";

    if(missing.length === 0){
        box.innerHTML = `<p style="font-size:13px;color:var(--good);">✓ Semua menu sudah punya BOM.</p>`;
        return;
    }

    box.innerHTML = `
        <p style="font-size:13px;color:var(--muted);margin-bottom:10px;">${missing.length} menu belum punya BOM:</p>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Kode Menu</th><th>Nama Menu</th></tr></thead>
                <tbody>
                    ${missing.map(m => `<tr><td>${m.menu_code}</td><td>${m.menu_name}</td></tr>`).join("")}
                </tbody>
            </table>
        </div>
    `;
}
