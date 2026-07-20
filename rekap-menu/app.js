"use strict";

/* ==========================================
   REKAP MENU
   Menampilkan usage (qty terjual) per tanggal untuk daftar menu
   TERKURASI (sesuai struktur "REKAP MENU" yang dipakai outlet ini),
   dikelompokkan per kategori, untuk rentang tanggal yang dipilih.

   Sumber data: usageDailyMenu (hasil pecahan per tanggal dari
   Import Usage) - BUKAN dari file Excel manapun; daftar item di bawah
   ini cuma menentukan KODE MENU mana saja yang ditampilkan & urutan
   kategorinya, meniru struktur kolom C (kode) & D (deskripsi) pada
   rekap menu Excel milik outlet ini.
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
    { category: 'Dessert', code: "3121003", name: 'PANDAN PUDDING' },
    { category: 'Makanan Ringan', code: "4231004", name: 'PISANG GORENG' },
    { category: 'Makanan Ringan', code: "4231005", name: 'SINGKONG GORENG' },
    { category: 'Makanan Ringan', code: "4231006", name: 'SMOKED BEEF RISSOLES' },
    { category: 'Makanan Ringan', code: "4231007", name: 'CORN RIBS' },
    { category: 'Makanan Ringan', code: "4231008", name: 'BEEF SPRING ROLL' },
    { category: 'Kerupuk', code: "4231001", name: 'KERUPUK UDANG' },
    { category: 'Kerupuk', code: "4231002", name: 'KERUPUK IKAN' },
    { category: 'Kerupuk', code: "4231003", name: 'EMPING' }
];

let USAGE_DAILY_MENU = [];
let DAILY_BY_MENU_CODE = new Map();   // menu_code -> Map(date -> qty)
let LAST_RESULT = null;               // { dates:[...], rows:[{category,code,name, byDate:{}, total}] }

document.addEventListener("DOMContentLoaded", async () => {
    USAGE_DAILY_MENU = await InvDB.getAll("usageDailyMenu");
    buildIndex();

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6); // default: 7 hari terakhir
    document.getElementById("dateFrom").value = start.toISOString().slice(0,10);
    document.getElementById("dateTo").value = end.toISOString().slice(0,10);

    generateReport();
});

function buildIndex(){
    DAILY_BY_MENU_CODE = new Map();
    USAGE_DAILY_MENU.forEach(d => {
        if(!DAILY_BY_MENU_CODE.has(d.menu_code)) DAILY_BY_MENU_CODE.set(d.menu_code, new Map());
        const m = DAILY_BY_MENU_CODE.get(d.menu_code);
        m.set(d.date, (m.get(d.date) || 0) + (Number(d.qty) || 0));
    });
}

function dateRangeArray(from, to){
    const dates = [];
    let cur = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    while(cur <= end){
        dates.push(cur.toISOString().slice(0,10));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

function generateReport(){
    const from = document.getElementById("dateFrom").value;
    const to = document.getElementById("dateTo").value;

    if(!from || !to){ toast("Lengkapi rentang tanggal dulu","error"); return; }
    if(to < from){ toast("Tanggal 'Sampai' tidak boleh sebelum 'Dari'","error"); return; }

    const dates = dateRangeArray(from, to);
    if(dates.length > 92){
        toast("Rentang maksimal 92 hari (kira-kira 3 bulan) supaya tabel tidak terlalu lebar","error");
        return;
    }

    const rows = CURATED_MENU_LIST.map(item => {
        const dateMap = DAILY_BY_MENU_CODE.get(item.code);
        const byDate = {};
        let total = 0;
        dates.forEach(d => {
            const qty = dateMap ? (dateMap.get(d) || 0) : 0;
            byDate[d] = qty;
            total += qty;
        });
        return { category: item.category, code: item.code, name: item.name, byDate, total };
    });

    LAST_RESULT = { dates, rows };
    renderReport();
}

function renderReport(){
    if(!LAST_RESULT) return;
    const { dates, rows } = LAST_RESULT;

    const onlyWithSales = document.getElementById("onlyWithSales").checked;
    const visibleRows = onlyWithSales ? rows.filter(r => r.total > 0) : rows;

    // Header tanggal
    const dateHeaderHtml = dates.map(d => `<th class="num">${d.slice(5)}</th>`).join("");
    document.getElementById("reportHead").innerHTML =
        `<th>Kategori</th><th>Kode</th><th>Nama Menu</th>${dateHeaderHtml}<th class="num">Total</th>`;

    // Body dikelompokkan per kategori dengan baris judul kategori
    let html = "";
    let currentCat = null;
    let grandTotalByDate = {};
    dates.forEach(d => grandTotalByDate[d] = 0);
    let grandTotal = 0;

    visibleRows.forEach(r => {
        if(r.category !== currentCat){
            currentCat = r.category;
            html += `<tr style="background:var(--accent-tint);"><td colspan="${3 + dates.length + 1}" style="font-weight:800;">${currentCat}</td></tr>`;
        }
        html += `<tr><td></td><td>${r.code}</td><td>${r.name}</td>` +
            dates.map(d => `<td class="num">${r.byDate[d] || ""}</td>`).join("") +
            `<td class="num" style="font-weight:700;">${r.total}</td></tr>`;

        dates.forEach(d => { grandTotalByDate[d] += r.byDate[d]; });
        grandTotal += r.total;
    });

    if(visibleRows.length === 0){
        html = `<tr><td colspan="${3 + dates.length + 1}" class="empty">Tidak ada data pada rentang tanggal ini</td></tr>`;
    } else {
        html += `<tr style="font-weight:800;border-top:2px solid var(--ink);"><td colspan="3">TOTAL</td>` +
            dates.map(d => `<td class="num">${grandTotalByDate[d] || ""}</td>`).join("") +
            `<td class="num">${grandTotal}</td></tr>`;
    }

    document.getElementById("reportBody").innerHTML = html;
    document.getElementById("summaryDays").textContent = dates.length;
    document.getElementById("summaryItems").textContent = visibleRows.length;
    document.getElementById("summaryTotal").textContent = grandTotal.toLocaleString("id-ID");
}

function exportExcel(){
    if(!LAST_RESULT){ toast("Belum ada data untuk diexport","error"); return; }
    const { dates, rows } = LAST_RESULT;
    const onlyWithSales = document.getElementById("onlyWithSales").checked;
    const visibleRows = onlyWithSales ? rows.filter(r => r.total > 0) : rows;

    const header = ["Kategori", "Kode", "Nama Menu", ...dates, "Total"];
    const data = visibleRows.map(r => [r.category, r.code, r.name, ...dates.map(d => r.byDate[d] || 0), r.total]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Menu");
    XLSX.writeFile(wb, `Rekap_Menu_${dates[0]}_sd_${dates[dates.length-1]}.xlsx`);
    toast("✓ File diunduh","success");
}

function toast(msg, type="success"){
    const el = document.getElementById("notif");
    el.className = "notif " + type;
    el.innerHTML = msg;
    el.style.display = "block";
    setTimeout(()=>{ el.style.display = "none"; }, 2500);
}
