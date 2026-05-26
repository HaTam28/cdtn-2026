import React, { useState, useEffect, useMemo } from "react";
import ExcelJS from "exceljs";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./reports.css";
import { getAllIssues } from "../../api/issueApi";
import { getAllItems } from "../../api/itemApi";
import { getAllEmployees } from "../../api/employeeApi";
import { getAllCustomers } from "../../api/customerApi";
import TopbarRight from "../../components/TopbarRight";

const COMPANY_NAME = "CÔNG TY TNHH HOSHIMOTO VIỆT NAM";
const COMPANY_ADDRESS = "Địa chỉ: Phường Đại Mỗ, Thành phố Hà Nội, Việt Nam";

const DOC_TYPE_LABELS = {
    NORMAL: "Thông thường",
    ADJUSTMENT: "Điều chỉnh",
    RETURN: "Hàng trả về",
};

function formatDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function formatMoney(n) {
    if (n === null || n === undefined || n === "") return "";
    return Number(n).toLocaleString("vi-VN");
}
function toDateObj(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d) ? null : d;
}
function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dateKey(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseLocalDate(str) {
    if (!str) return null;
    const parts = str.split("-");
    if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const d = new Date(str);
    return isNaN(d) ? null : d;
}

function IconFilter() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    );
}
function IconExport() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}
function IconPrint() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
        </svg>
    );
}

function FilterDrawer({ open, filters, setFilters, items, employees, customers, onApply, onClose }) {
    const [local, setLocal] = useState({ ...filters });
    useEffect(() => { setLocal({ ...filters }); }, [filters, open]);
    const set = (k, v) => setLocal((p) => ({ ...p, [k]: v }));
    const handleApply = () => { setFilters(local); onApply(local); onClose(); };
    const handleCancel = () => { setLocal({ ...filters }); onClose(); };
    if (!open) return null;
    return (
        <div className="rpt-drawer-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
            <div className="rpt-drawer">
                <div className="rpt-drawer-header">
                    <span className="rpt-drawer-title">Điều kiện lọc</span>
                    <button className="rc-modal-close" onClick={handleCancel}>&times;</button>
                </div>
                <div className="rpt-drawer-body">
                    <div className="rpt-filter-field">
                        <label className="rpt-filter-label">Từ ngày</label>
                        <input type="date" className="rc-form-input" value={local.fromDate} onChange={(e) => set("fromDate", e.target.value)} />
                    </div>
                    <div className="rpt-filter-field">
                        <label className="rpt-filter-label">Đến ngày</label>
                        <input type="date" className="rc-form-input" value={local.toDate} onChange={(e) => set("toDate", e.target.value)} />
                    </div>
                    <div className="rpt-filter-field">
                        <label className="rpt-filter-label">Vật tư</label>
                        <select className="rc-form-select" value={local.itemId} onChange={(e) => set("itemId", e.target.value)}>
                            <option value="">-- Tất cả vật tư --</option>
                            {items.map((it) => (
                                <option key={it.id} value={String(it.id)}>
                                    {it.itemcode ? `${it.itemcode} - ${it.itemname}` : it.itemname}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="rpt-filter-field">
                        <label className="rpt-filter-label">Người lập</label>
                        <select className="rc-form-select" value={local.createdBy} onChange={(e) => set("createdBy", e.target.value)}>
                            <option value="">-- Tất cả --</option>
                            {employees.map((e) => (
                                <option key={e.id} value={e.fullname || e.username}>{e.fullname || e.username}</option>
                            ))}
                        </select>
                    </div>
                    <div className="rpt-filter-field">
                        <label className="rpt-filter-label">Đối tượng</label>
                        <select className="rc-form-select" value={local.customerId} onChange={(e) => set("customerId", e.target.value)}>
                            <option value="">-- Tất cả --</option>
                            {customers.map((c) => (
                                <option key={c.id} value={String(c.id)}>{c.customername}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="rpt-drawer-footer">
                    <button className="sp-btn-primary" onClick={handleApply} style={{ minWidth: 80 }}>Nhận</button>
                    <button className="sp-btn-outline" onClick={handleCancel} style={{ minWidth: 80 }}>Hủy</button>
                </div>
            </div>
        </div>
    );
}

const EMPTY_FILTERS = { fromDate: "", toDate: "", itemId: "", createdBy: "", customerId: "", docType: "" };

export default function IssueReportPage() {
    const [issues, setIssues] = useState([]);
    const [items, setItems] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
    const [applied, setApplied] = useState({ ...EMPTY_FILTERS });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        Promise.all([getAllItems(), getAllEmployees(), getAllCustomers()])
            .then(([its, emps, custs]) => { setItems(its); setEmployees(emps); setCustomers(custs); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);
        getAllIssues()
            .then((data) => setIssues((data || []).filter((r) => r.docstatus === "CONFIRMED")))
            .catch(() => setError("Không thể tải dữ liệu phiếu xuất."))
            .finally(() => setLoading(false));
    }, []);

    const rows = useMemo(() => {
        const result = [];
        (issues || []).forEach((r) => {
            const details = r.details || [];
            if (details.length === 0) {
                result.push({ issue: r, detail: null });
            } else {
                details.forEach((d) => result.push({ issue: r, detail: d }));
            }
        });
        return result;
    }, [issues]);

    const filteredRows = useMemo(() => {
        const f = applied;
        return rows.filter(({ issue: r, detail: d }) => {
            if (f.fromDate) {
                const docD = toDateObj(r.docDate);
                if (!docD || stripTime(docD) < parseLocalDate(f.fromDate)) return false;
            }
            if (f.toDate) {
                const docD = toDateObj(r.docDate);
                if (!docD || stripTime(docD) > parseLocalDate(f.toDate)) return false;
            }
            if (f.itemId && d) { if (String(d.itemId) !== f.itemId) return false; }
            if (f.createdBy) {
                const rName = r.createdByFullname || r.createdByName || "";
                if (rName !== f.createdBy) return false;
            }
            if (f.customerId) { if (String(r.customerId || "") !== f.customerId) return false; }
            if (f.docType) {
                const rt = (r.docType || r.doctype || "NORMAL").toUpperCase();
                if (rt !== f.docType) return false;
            }
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                const hit =
                    (r.docno || "").toLowerCase().includes(q) ||
                    (d?.itemcode || "").toLowerCase().includes(q) ||
                    (d?.itemname || "").toLowerCase().includes(q) ||
                    (r.createdByFullname || "").toLowerCase().includes(q) ||
                    (r.customerName || "").toLowerCase().includes(q);
                if (!hit) return false;
            }
            return true;
        });
    }, [rows, applied, search]);

    const totalQty = useMemo(() => filteredRows.reduce((s, { detail: d }) => s + Number(d?.quantity || 0), 0), [filteredRows]);
    const totalAmount = useMemo(() => filteredRows.reduce((s, { detail: d }) => s + Number(d?.amount ?? (Number(d?.quantity || 0) * Number(d?.unitprice || 0))), 0), [filteredRows]);

    const dateLabel = useMemo(() => {
        const f = applied.fromDate ? formatDate(applied.fromDate) : null;
        const t = applied.toDate ? formatDate(applied.toDate) : null;
        if (f && t) return `Từ ngày ${f} đến ngày ${t}`;
        if (f) return `Từ ngày ${f}`;
        if (t) return `Đến ngày ${t}`;
        return null;
    }, [applied]);

    const activeFilterCount = Object.values(applied).filter(Boolean).length;

    const handleExport = async () => {
        const now = new Date();
        const subtitle = dateLabel || `Đến ngày ${formatDate(now.toISOString())}`;
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Bảng kê phiếu xuất");

        ws.columns = [
            { width: 6 },
            { width: 14 },
            { width: 18 },
            { width: 13 },
            { width: 28 },
            { width: 8 },
            { width: 18 },
            { width: 25 },
            { width: 16 },
            { width: 12 },
            { width: 16 },
        ];

        // ── Helpers ────────────────────────────────────────────
        const GRN = "FF1E854A";
        const WHITE = "FFFFFFFF";
        const GRAY_BORDER = { style: "thin", color: { argb: "FFD0E4D8" } };

        const styleCell = (cell, opts = {}) => {
            if (opts.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
            if (opts.font) cell.font = opts.font;
            if (opts.align) cell.alignment = opts.align;
            if (opts.border !== false) {
                const b = opts.border || { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER };
                cell.border = b;
            }
            if (opts.numFmt) cell.numFmt = opts.numFmt;
        };

        const styleRow = (row, fill, font, align, border) => {
            for (let c = 1; c <= 11; c++) {
                styleCell(row.getCell(c), { fill, font, align, border });
            }
        };

        // ── Row 1: Company name ────────────────────────────────
        const r1 = ws.addRow([COMPANY_NAME]);
        ws.mergeCells("A1:K1");
        r1.getCell(1).font = { bold: true, size: 12 };
        r1.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
        r1.height = 18;

        // ── Row 2: Address ─────────────────────────────────────
        const r2 = ws.addRow([COMPANY_ADDRESS]);
        ws.mergeCells("A2:K2");
        r2.getCell(1).font = { size: 10, color: { argb: "FF333333" } };
        r2.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

        // ── Row 3: empty ───────────────────────────────────────
        ws.addRow([]);

        // ── Row 4: Title ───────────────────────────────────────
        const r4 = ws.addRow(["BẢNG KÊ CHỨNG TỪ PHIẾU XUẤT"]);
        ws.mergeCells("A4:K4");
        r4.getCell(1).font = { bold: true, size: 14 };
        r4.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        r4.height = 24;

        // ── Row 5: Subtitle ────────────────────────────────────
        const r5 = ws.addRow([subtitle]);
        ws.mergeCells("A5:K5");
        r5.getCell(1).font = { italic: true, size: 11, color: { argb: "FF555555" } };
        r5.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        r5.height = 18;

        // ── Row 6: empty ───────────────────────────────────────
        ws.addRow([]);

        // ── Rows 7–8: Double header ────────────────────────────
        const hdrFill = GRN;
        const hdrFont = { bold: true, color: { argb: WHITE }, size: 10 };
        const hdrAlign = { horizontal: "center", vertical: "middle", wrapText: true };
        const hdrBorder = { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER };

        const r7 = ws.addRow(["STT", "Chứng từ", "", "Mã vật tư", "Tên vật tư", "Đvt", "Người lập", "Đối tượng", "Loại phiếu xuất", "Số lượng", "Thành tiền"]);
        const r8 = ws.addRow(["", "Ngày", "Số", "", "", "", "", "", "", "", ""]);
        r7.height = 22;
        r8.height = 18;

        ws.mergeCells("A7:A8");
        ws.mergeCells("B7:C7");
        ws.mergeCells("D7:D8");
        ws.mergeCells("E7:E8");
        ws.mergeCells("F7:F8");
        ws.mergeCells("G7:G8");
        ws.mergeCells("H7:H8");
        ws.mergeCells("I7:I8");
        ws.mergeCells("J7:J8");
        ws.mergeCells("K7:K8");

        styleRow(r7, hdrFill, hdrFont, hdrAlign, hdrBorder);
        styleRow(r8, hdrFill, hdrFont, hdrAlign, hdrBorder);

        // ── Group rows by date ─────────────────────────────────
        const dateMap = new Map();
        const grouped = [];
        filteredRows.forEach(({ issue: r, detail: d }) => {
            const key = dateKey(r.docDate);
            if (!dateMap.has(key)) {
                dateMap.set(key, { label: formatDate(r.docDate), rows: [] });
                grouped.push(dateMap.get(key));
            }
            dateMap.get(key).rows.push({ issue: r, detail: d });
        });

        let currentRowNum = 9;
        let stt = 1;

        const grpFill = "FFFEF6E4";
        const grpBorder = { top: { style: "thin", color: { argb: "FFD4C49A" } }, bottom: { style: "thin", color: { argb: "FFD4C49A" } }, left: GRAY_BORDER, right: GRAY_BORDER };
        const dataBorder = { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER };

        grouped.forEach(({ label, rows: gRows }) => {
            const groupQty = gRows.reduce((s, { detail: d }) => s + Number(d?.quantity || 0), 0);

            // Date group row
            const grpRow = ws.addRow([label]);
            ws.mergeCells(`A${currentRowNum}:I${currentRowNum}`);
            styleRow(grpRow, grpFill, { bold: true, size: 10 }, null, grpBorder);
            grpRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
            grpRow.getCell(10).value = groupQty;
            styleCell(grpRow.getCell(10), { fill: grpFill, font: { bold: true, size: 10 }, align: { horizontal: "right", vertical: "middle" }, border: grpBorder, numFmt: "#,##0.0000" });
            styleCell(grpRow.getCell(11), { fill: grpFill, font: { bold: true, size: 10 }, border: grpBorder });
            grpRow.height = 16;
            currentRowNum++;

            // Data rows
            gRows.forEach(({ issue: r, detail: d }) => {
                const amt = d?.amount ?? (Number(d?.quantity || 0) * Number(d?.unitprice || 0));
                const docType = (r.docType || r.doctype || "NORMAL").toUpperCase();

                const dataRow = ws.addRow([
                    stt++,
                    formatDate(r.docDate),
                    r.docno || "",
                    d?.itemcode || "",
                    d?.itemname || "",
                    d?.unitof || "",
                    r.createdByFullname || r.createdByName || "",
                    r.customerName || "",
                    DOC_TYPE_LABELS[docType] || docType,
                    Number(d?.quantity || 0),
                    Number(amt || 0),
                ]);

                styleCell(dataRow.getCell(1), { font: { color: { argb: "FF8BA392" }, size: 10 }, align: { horizontal: "center", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(2), { font: { size: 10 }, align: { horizontal: "center", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(3), { font: { bold: true, color: { argb: "FF1E854A" }, size: 10 }, align: { horizontal: "left", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(4), { font: { bold: true, color: { argb: "FF1E3A2F" }, size: 10 }, align: { horizontal: "left", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(5), { font: { size: 10 }, align: { horizontal: "left", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(6), { font: { size: 10 }, align: { horizontal: "center", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(7), { font: { size: 10 }, align: { horizontal: "left", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(8), { font: { size: 10 }, align: { horizontal: "left", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(9), { font: { size: 10 }, align: { horizontal: "left", vertical: "middle" }, border: dataBorder });
                styleCell(dataRow.getCell(10), { font: { size: 10 }, align: { horizontal: "right", vertical: "middle" }, border: dataBorder, numFmt: "#,##0.0000" });
                styleCell(dataRow.getCell(11), { font: { size: 10 }, align: { horizontal: "right", vertical: "middle" }, border: dataBorder, numFmt: "#,##0" });
                dataRow.height = 15;
                currentRowNum++;
            });
        });

        // ── Total row ──────────────────────────────────────────
        const totalRow = ws.addRow([]);
        ws.mergeCells(`A${currentRowNum}:I${currentRowNum}`);
        styleRow(totalRow, "FFF2FBF6", { bold: true, color: { argb: "FF1A3A25" }, size: 10 }, null, { top: { style: "medium", color: { argb: "FFB8D8C5" } }, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER });
        totalRow.getCell(9).value = "Tổng cộng";
        totalRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(10).value = totalQty;
        totalRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(10).numFmt = "#,##0.0000";
        totalRow.getCell(11).value = totalAmount;
        totalRow.getCell(11).alignment = { horizontal: "right", vertical: "middle" };
        totalRow.getCell(11).numFmt = "#,##0";
        totalRow.height = 18;
        currentRowNum++;

        // ── Signature block ────────────────────────────────────
        ws.addRow([]);
        ws.addRow([]);
        currentRowNum += 2;

        const sigDateRow = ws.addRow([]);
        ws.mergeCells(`I${currentRowNum}:K${currentRowNum}`);
        sigDateRow.getCell(9).value = `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
        sigDateRow.getCell(9).font = { italic: true, size: 10 };
        sigDateRow.getCell(9).alignment = { horizontal: "center" };
        currentRowNum++;

        const sigLabelRow = ws.addRow([]);
        ws.mergeCells(`A${currentRowNum}:B${currentRowNum}`);
        ws.mergeCells(`I${currentRowNum}:K${currentRowNum}`);
        sigLabelRow.getCell(1).value = "Người lập";
        sigLabelRow.getCell(1).font = { bold: true, size: 10 };
        sigLabelRow.getCell(1).alignment = { horizontal: "center" };
        sigLabelRow.getCell(9).value = "Kế toán trưởng";
        sigLabelRow.getCell(9).font = { bold: true, size: 10 };
        sigLabelRow.getCell(9).alignment = { horizontal: "center" };
        currentRowNum++;

        const sigSubRow = ws.addRow([]);
        ws.mergeCells(`A${currentRowNum}:B${currentRowNum}`);
        ws.mergeCells(`I${currentRowNum}:K${currentRowNum}`);
        sigSubRow.getCell(1).value = "(Ký, họ tên)";
        sigSubRow.getCell(1).font = { italic: true, size: 10 };
        sigSubRow.getCell(1).alignment = { horizontal: "center" };
        sigSubRow.getCell(9).value = "(Ký, họ tên)";
        sigSubRow.getCell(9).font = { italic: true, size: 10 };
        sigSubRow.getCell(9).alignment = { horizontal: "center" };

        // ── Export ─────────────────────────────────────────────
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BangKe_PhieuXuat_${stamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <FilterDrawer
                open={drawerOpen}
                filters={filters}
                setFilters={setFilters}
                items={items}
                employees={employees}
                customers={customers}
                onApply={(local) => setApplied({ ...local })}
                onClose={() => setDrawerOpen(false)}
            />
            <div className="sp-main">
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Báo cáo &rsaquo; <span className="sp-breadcrumb-active">Bảng kê chứng từ phiếu xuất</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>
                <div className="sp-content">
                    <h1 className="sp-title">Bảng kê chứng từ phiếu xuất</h1>
                    <div className="sp-toolbar">
                        <div className="sp-search-wrap">
                            <span className="sp-search-icon">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </span>
                            <input className="sp-search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="sp-toolbar-spacer" />
                        <button className={`rpt-filter-btn${activeFilterCount > 0 ? " rpt-filter-btn-active" : ""}`} onClick={() => setDrawerOpen(true)}>
                            <IconFilter />
                            Lọc
                            {activeFilterCount > 0 && <span className="rpt-filter-badge">{activeFilterCount}</span>}
                        </button>
                        <button className="rc-btn-template" onClick={() => window.print()}>
                            <IconPrint /> In
                        </button>
                        <button className="rc-btn-template rpt-export-btn" onClick={() => handleExport().catch(console.error)} disabled={filteredRows.length === 0}>
                            <IconExport /> Export
                        </button>
                    </div>

                    <div className="rpt-content rpt-printable">
                        <div className="rpt-report-title">BẢNG KÊ CHỨNG TỪ PHIẾU XUẤT</div>
                        {dateLabel && <div className="rpt-report-subtitle">{dateLabel}</div>}

                        {activeFilterCount > 0 && (
                            <div className="rpt-chips">
                                {applied.fromDate && <span className="rpt-chip">Từ: {formatDate(applied.fromDate)}</span>}
                                {applied.toDate && <span className="rpt-chip">Đến: {formatDate(applied.toDate)}</span>}
                                {applied.itemId && <span className="rpt-chip">Vật tư: {items.find((it) => String(it.id) === applied.itemId)?.itemname || applied.itemId}</span>}
                                {applied.createdBy && <span className="rpt-chip">Người lập: {employees.find((e) => String(e.id) === applied.createdBy)?.fullname || applied.createdBy}</span>}
                                {applied.customerId && <span className="rpt-chip">Đối tượng: {customers.find((c) => String(c.id) === applied.customerId)?.customername || applied.customerId}</span>}
                                {applied.docType && <span className="rpt-chip">Loại: {DOC_TYPE_LABELS[applied.docType] || applied.docType}</span>}
                                <button className="rpt-chip rpt-chip-clear" onClick={() => { setFilters({ ...EMPTY_FILTERS }); setApplied({ ...EMPTY_FILTERS }); }}>✕ Xóa lọc</button>
                            </div>
                        )}

                        {loading && <div style={{ textAlign: "center", color: "#4c6152", padding: "40px 0" }}>Đang tải dữ liệu...</div>}
                        {!loading && error && <div style={{ textAlign: "center", color: "#b71c1c", padding: "40px 0" }}>{error}</div>}

                        {!loading && !error && (
                            <div className="rc-detail-table-wrap rpt-table-wrap">
                                <table className="rc-detail-table rpt-table rpt-issue-table" style={{ tableLayout: "fixed" }}>
                                    <colgroup>
                                        <col style={{ width: "50px" }} />
                                        <col style={{ width: "90px" }} />
                                        <col style={{ width: "140px" }} />
                                        <col style={{ width: "90px" }} />
                                        <col style={{ width: "180px" }} />
                                        <col style={{ width: "70px" }} />
                                        <col style={{ width: "140px" }} />
                                        <col style={{ width: "160px" }} />
                                        <col style={{ width: "120px" }} />
                                        <col style={{ width: "90px" }} />
                                        <col style={{ width: "120px" }} />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: "center" }}>STT</th>
                                            <th>Ngày</th>
                                            <th>Số chứng từ</th>
                                            <th>Mã vật tư</th>
                                            <th>Tên vật tư</th>
                                            <th style={{ textAlign: "center" }}>ĐVT</th>
                                            <th>Người lập</th>
                                            <th>Đối tượng</th>
                                            <th>Loại phiếu xuất</th>
                                            <th className="rpt-num">Số lượng</th>
                                            <th className="rpt-num">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.length === 0 && (
                                            <tr>
                                                <td colSpan={11} style={{ textAlign: "center", color: "#8ba392", padding: "24px 0" }}>
                                                    {search || activeFilterCount > 0 ? "Không có kết quả phù hợp." : "Không có dữ liệu."}
                                                </td>
                                            </tr>
                                        )}
                                        {(() => {
                                            // Group by date for display
                                            const dateMap = new Map();
                                            const grouped = [];
                                            filteredRows.forEach(({ issue: r, detail: d }) => {
                                                const key = dateKey(r.docDate);
                                                if (!dateMap.has(key)) {
                                                    dateMap.set(key, { label: formatDate(r.docDate), rows: [] });
                                                    grouped.push(dateMap.get(key));
                                                }
                                                dateMap.get(key).rows.push({ issue: r, detail: d });
                                            });
                                            const rendered = [];
                                            let stt = 1;
                                            grouped.forEach(({ label, rows: gRows }, gi) => {
                                                const groupQty = gRows.reduce((s, { detail: d }) => s + Number(d?.quantity || 0), 0);
                                                rendered.push(
                                                    <tr key={`grp-${gi}`} className="rpt-date-group-row">
                                                        <td colSpan={9}>{label}</td>
                                                        <td className="rpt-group-qty rpt-num">{groupQty.toLocaleString("vi-VN")}</td>
                                                        <td />
                                                    </tr>
                                                );
                                                gRows.forEach(({ issue: r, detail: d }, ri) => {
                                                    const amt = d?.amount ?? (Number(d?.quantity || 0) * Number(d?.unitprice || 0));
                                                    const docType = (r.docType || r.doctype || "NORMAL").toUpperCase();
                                                    rendered.push(
                                                        <tr key={`${r.id}-${d?.id || ri}-${gi}`}>
                                                            <td style={{ textAlign: "center", color: "#8ba392" }}>{stt++}</td>
                                                            <td className="rpt-nowrap">{formatDate(r.docDate)}</td>
                                                            <td className="rpt-nowrap" style={{ fontWeight: 600, color: "#1E854A" }}>{r.docno}</td>
                                                            <td style={{ fontWeight: 600, color: "#1E3A2F" }}>{d?.itemcode || "—"}</td>
                                                            <td>{d?.itemname || "—"}</td>
                                                            <td style={{ textAlign: "center" }}>{d?.unitof || "—"}</td>
                                                            <td>{r.createdByFullname || r.createdByName || "—"}</td>
                                                            <td>{r.customerName || "—"}</td>
                                                            <td className="rpt-type-text">{DOC_TYPE_LABELS[docType] || docType}</td>
                                                            <td className="rpt-num">{d?.quantity ?? "—"}</td>
                                                            <td className="rpt-num">{formatMoney(amt)}</td>
                                                        </tr>
                                                    );
                                                });
                                            });
                                            return rendered;
                                        })()}
                                        {filteredRows.length > 0 && (
                                            <tr className="rpt-total-row">
                                                <td colSpan={9} style={{ textAlign: "right", paddingRight: 12 }}>Tổng cộng</td>
                                                <td className="rpt-num">{totalQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(totalAmount)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
