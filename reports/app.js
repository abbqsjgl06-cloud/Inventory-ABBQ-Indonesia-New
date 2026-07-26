"use strict";

/* ==========================================
   REPORTS — Rekap Menu Lintas Outlet
   Sama seperti Rekap Menu per-outlet, tapi dipivot per OUTLET (bukan
   per tanggal) untuk satu rentang tanggal yang dipilih, dengan kolom
   Total paling kanan menjumlahkan semua outlet. Khusus Admin & Viewer,
   karena butuh baca data lintas outlet.

   Daftar menu terkurasi (kode, nama, kategori) sama persis dengan
   yang dipakai Rekap Menu per-outlet, supaya konsisten.
========================================== */

const CURATED_MENU_LIST = [
    { category: 'Voucher', code: "5222008", name: 'Buy 1 Get 1 Perkedel' },
    { category: 'Voucher', code: "5223003", name: 'Free Sambal Jeruk' },
    { category: 'Menu Paket', code: "5121009", name: 'ABBQ SPESIAL' },
    { category: 'Menu Paket', code: "5121010", name: 'ABBQ KOMPLIT' },
    { category: 'Menu (in Paket)', code: "1111013", name: 'ABBQ TALIWANG DADA P' },
    { category: 'Menu (in Paket)', code: "1111014", name: 'ABBQ KECOMBRANG DADA P' },
    { category: 'Menu (in Paket)', code: "1111015", name: 'ABBQ SOLO DADA P' },
    { category: 'Menu (in Paket)', code: "1111016", name: 'ABBQ TALIWANG PAHA P' },
    { category: 'Menu (in Paket)', code: "1111017", name: 'ABBQ KECOMBRANG PAHA P' },
    { category: 'Menu (in Paket)', code: "1111018", name: 'ABBQ SOLO PAHA P' },
    { category: 'Pendamping Paket (P)', code: "1121004", name: 'Rice P' },
    { category: 'Pendamping Paket (P)', code: "4111006", name: 'Nasi Uduk P' },
    { category: 'Pendamping Paket (P)', code: "4221005", name: 'Tahu Goreng P' },
    { category: 'Pendamping Paket (P)', code: "4221006", name: 'Tempe Goreng P' },
    { category: 'Pendamping Paket (P)', code: "4221007", name: 'Sayur Asam P' },
    { category: 'Pendamping Paket (P)', code: "4211005", name: 'Sambal Kecombrang P' },
    { category: 'Pendamping Paket (P)', code: "4211006", name: 'Sambal Matah P' },
    { category: 'Pendamping Paket (P)', code: "4211007", name: 'Sambal Bawang P' },
    { category: 'Pendamping Paket (P)', code: "4221008", name: 'Perkedel P' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "1121003", name: 'NASI UDUK' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "1121001", name: 'NASI' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "1111011", name: 'AYAM PAHA KECOMBRANG' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "1111010", name: 'AYAM PAHA TALIWANG' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "1111012", name: 'AYAM PAHA SOLO' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "1111008", name: 'AYAM DADA KECOMBRANG' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "1111007", name: 'AYAM DADA TALIWANG' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "1111009", name: 'AYAM DADA SOLO' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "4221001", name: 'TAHU' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "4221002", name: 'TEMPE' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "4221003", name: 'SAYUR ASEM' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "4221004", name: 'PERKEDEL' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "4211001", name: 'SAMBAL KECOMBRANG' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "4211002", name: 'SAMBAL MATAH' },
    { category: 'Menu Tambahan (Only Alacarte)', code: "4211004", name: 'SAMBAL BAWANG' },
    { category: 'Minuman', code: "2131004", name: 'GREEN TEA - HOT TEA' },
    { category: 'Minuman', code: "2131001", name: 'EARL GREY - Hot Tea' },
    { category: 'Minuman', code: "2131002", name: 'ENGLISH BREAKFAST - Hot Tea' },
    { category: 'Minuman', code: "2131003", name: 'CHAMOMILE - Hot tea' },
    { category: 'Minuman', code: "2111006", name: 'HOT Long black' },
    { category: 'Minuman', code: "2111007", name: 'HOT long black with milk' },
    { category: 'Minuman', code: "2212005", name: 'ICED LONG BLACK' },
    { category: 'Minuman', code: "2212006", name: 'ICED LONG BLACK WITH MILK' },
    { category: 'Minuman', code: "2212007", name: 'ICED COFFEE LOCAL' },
    { category: 'Minuman', code: "2232001", name: 'ICED LEMON TEA' },
    { category: 'Minuman', code: "2232003", name: 'ICED JAVA L' },
    { category: 'Minuman', code: "2232005", name: 'ICED JAVA TEA SPECIAL' },
    { category: 'Minuman', code: "2232006", name: 'ICED HONEY PEACH TEA' },
    { category: 'Minuman', code: "2251001", name: 'ES KELAPA' },
    { category: 'Minuman', code: "2251002", name: 'ES KELAPA JERUK' },
    { category: 'Minuman', code: "2411001", name: 'JCO Water' },
    { category: 'Minuman', code: "2411006", name: 'Ocha Green Tea' },
    { category: 'Minuman', code: "2411005", name: 'Ocha Jasmine' },
    { category: 'Dessert', code: "3111003", name: 'ES BUAH' },
    { category: 'Dessert', code: "3111004", name: 'ES CAMPUR' },
    { category: 'Dessert', code: "3111002", name: 'ES CENDOL' },
    { category: 'Dessert', code: "3121003", name: 'CHCOCOLATE PUDDING' },
    { category: 'Dessert', code: "3121002", name: 'CARAMEL PUDDING' },
    { category: 'Dessert', code: "3121001", name: 'PANDAN PUDDING' },
    { category: 'Makanan Ringan', code: "4231004", name: 'PISANG GORENG' },
    { category: 'Makanan Ringan', code: "4231005", name: 'SINGKONG GORENG' },
    { category: 'Makanan Ringan', code: "4231006", name: 'SMOKED BEEF RISSOLES' },
    { category: 'Makanan Ringan', code: "4231007", name: 'CORN RIBS' },
    { category: 'Makanan Ringan', code: "4231008", name: 'BEEF SPRING ROLL' },
    { category: 'Kerupuk', code: "4231001", name: 'KERUPUK UDANG' },
    { category: 'Kerupuk', code: "4231002", name: 'KERUPUK IKAN' },
    { category: 'Kerupuk', code: "4231003", name: 'EMPING' }
];

let OUTLETS = [];                     // [{id, name}, ...] terurut sesuai nama
let USAGE_DAILY_MENU = [];            // semua outlet, mentah
let DAILY_BY_MENU_CODE = new Map();   // menu_code -> Map(outletId -> qty) untuk rentang aktif
let LAST_RESULT = null;               // { outlets:[...], rows:[{category,code,name, byOutlet:{}, total}] }

document.addEventListener("authReady", async (e) => {
    const role = e.detail.role;
    if (role !== "admin" && role !== "viewer") {
        document.getElementById("accessDenied").style.display = "block";
        return;
    }
    document.getElementById("reportContent").style.display = "block";

    OUTLETS = (await InvDB.getAll("outlets")).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    // Ambil usageDailyMenu LINTAS SEMUA OUTLET - bukan cuma outlet yang
    // lagi aktif di pemilih outlet. InvDB.getAll() otomatis menyaring
    // by outletId KALAU window.CURRENT_OUTLET_ID lagi terisi outlet
    // tertentu, jadi di sini kita kosongkan sementara supaya hasilnya
    // benar-benar semua outlet, lalu langsung dikembalikan seperti
    // semula (supaya badge/pemilih outlet di halaman lain tidak ikut
    // berubah).
    const prevOutletId = window.CURRENT_OUTLET_ID;
    window.CURRENT_OUTLET_ID = null;
    try {
        USAGE_DAILY_MENU = await InvDB.getAll("usageDailyMenu");
    } finally {
        window.CURRENT_OUTLET_ID = prevOutletId;
    }

    const end = new Date();
    document.getElementById("dateFrom").value = toLocalDateStr(end);
    document.getElementById("dateTo").value = toLocalDateStr(end);

    generateReport();
});

function toLocalDateStr(d){
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateRangeArray(from, to){
    const dates = [];
    let cur = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    while(cur <= end){
        dates.push(toLocalDateStr(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

function buildIndex(dates){
    const dateSet = new Set(dates);
    DAILY_BY_MENU_CODE = new Map();
    USAGE_DAILY_MENU.forEach(d => {
        if(!dateSet.has(d.date)) return;
        if(!d.outletId) return; // data lama tanpa outletId (kalau ada) tidak bisa dipetakan, dilewati
        if(!DAILY_BY_MENU_CODE.has(d.menu_code)) DAILY_BY_MENU_CODE.set(d.menu_code, new Map());
        const m = DAILY_BY_MENU_CODE.get(d.menu_code);
        m.set(d.outletId, (m.get(d.outletId) || 0) + (Number(d.qty) || 0));
    });
}

function generateReport(){
    const from = document.getElementById("dateFrom").value;
    const to = document.getElementById("dateTo").value;

    if(!from || !to){ toast("Lengkapi rentang tanggal dulu","error"); return; }
    if(to < from){ toast("Tanggal 'Sampai' tidak boleh sebelum 'Dari'","error"); return; }

    const dates = dateRangeArray(from, to);
    if(dates.length > 31){
        toast("Rentang maksimal 31 hari untuk Reports (data lintas outlet lebih berat) - persempit rentang tanggalnya","error");
        return;
    }

    buildIndex(dates);

    const rows = CURATED_MENU_LIST.map(item => {
        const outletMap = DAILY_BY_MENU_CODE.get(item.code);
        const byOutlet = {};
        let total = 0;
        OUTLETS.forEach(o => {
            const qty = outletMap ? (outletMap.get(o.id) || 0) : 0;
            byOutlet[o.id] = qty;
            total += qty;
        });
        return { category: item.category, code: item.code, name: item.name, byOutlet, total };
    });

    LAST_RESULT = { outlets: OUTLETS, rows, from, to };
    renderReport();
}

function renderReport(){
    if(!LAST_RESULT) return;
    const { outlets, rows } = LAST_RESULT;

    const onlyWithSales = document.getElementById("onlyWithSales").checked;
    const visibleRows = onlyWithSales ? rows.filter(r => r.total > 0) : rows;
    const colCount = 1 + outlets.length + 1; // Nama Menu + outlet + Total

    const outletHeaderHtml = outlets.map(o => `<th class="num">${o.name}</th>`).join("");
    document.getElementById("reportHead").innerHTML =
        `<th>Menu</th>${outletHeaderHtml}<th class="num">Total</th>`;

    const CATEGORIES_WITH_SUBTOTAL = new Set(["Menu Paket", "Menu (in Paket)"]);

    let html = "";
    let currentCat = null;
    let catByOutlet = {};
    let catTotal = 0;
    let grandTotal = 0;

    function flushCategorySubtotal(){
        if(currentCat && CATEGORIES_WITH_SUBTOTAL.has(currentCat)){
            html += `<tr style="font-weight:700;background:var(--paper);"><td>Total ${currentCat}</td>` +
                outlets.map(o => `<td class="num">${catByOutlet[o.id] || ""}</td>`).join("") +
                `<td class="num">${catTotal}</td></tr>`;
        }
    }

    if(outlets.length === 0){
        html = `<tr><td colspan="${colCount}" class="empty">Belum ada outlet terdaftar di Master Data.</td></tr>`;
    } else {
        visibleRows.forEach(r => {
            if(r.category !== currentCat){
                flushCategorySubtotal();
                currentCat = r.category;
                catByOutlet = {}; outlets.forEach(o => catByOutlet[o.id] = 0); catTotal = 0;
                html += `<tr class="cat-header-row"><td colspan="${colCount}" style="font-weight:800;background:var(--accent-tint);">${currentCat}</td></tr>`;
            }
            html += `<tr><td>${r.name}<br><small style="color:var(--muted);font-weight:400;">${r.code}</small></td>` +
                outlets.map(o => `<td class="num">${r.byOutlet[o.id] || ""}</td>`).join("") +
                `<td class="num" style="font-weight:700;">${r.total}</td></tr>`;

            outlets.forEach(o => { catByOutlet[o.id] += (r.byOutlet[o.id] || 0); });
            catTotal += r.total;
            grandTotal += r.total;
        });
        flushCategorySubtotal();

        if(visibleRows.length === 0){
            html = `<tr><td colspan="${colCount}" class="empty">Tidak ada data pada rentang tanggal ini</td></tr>`;
        }
    }

    document.getElementById("reportBody").innerHTML = html;
    document.getElementById("summaryOutlets").textContent = outlets.length;
    document.getElementById("summaryItems").textContent = visibleRows.length;
    document.getElementById("summaryTotal").textContent = grandTotal.toLocaleString("id-ID");
}

function exportExcel(){
    if(!LAST_RESULT){ toast("Belum ada data untuk diexport","error"); return; }
    const { outlets, rows, from, to } = LAST_RESULT;
    const onlyWithSales = document.getElementById("onlyWithSales").checked;
    const visibleRows = onlyWithSales ? rows.filter(r => r.total > 0) : rows;

    const header = ["Kategori", "Kode", "Nama Menu", ...outlets.map(o => o.name), "Total"];
    const data = visibleRows.map(r => [
        r.category, r.code, r.name, ...outlets.map(o => r.byOutlet[o.id] || 0), r.total
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, `Reports_Semua_Outlet_${from}_sd_${to}.xlsx`);
    toast("✓ File diunduh","success");
}

function toast(msg, type="success"){
    const el = document.getElementById("notif");
    el.className = "notif " + type;
    el.innerHTML = msg;
    el.style.display = "block";
    setTimeout(()=>{ el.style.display = "none"; }, 2500);
}
