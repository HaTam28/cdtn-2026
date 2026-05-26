import React, { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./reports.css";
import { getAllReceipts } from "../../api/receiptApi";
import { getAllIssues } from "../../api/issueApi";
import { getAllItems } from "../../api/itemApi";
import TopbarRight from "../../components/TopbarRight";

const COMPANY_NAME = "CÔNG TY TNHH HOSHIMOTO VIỆT NAM";
const COMPANY_ADDRESS = "Địa chỉ: Phường Đại Mỗ, Thành phố Hà Nội, Việt Nam";

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

function FilterDrawer({ open, filters, setFilters, items, onApply, onClose }) {
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
                </div>
                <div className="rpt-drawer-footer">
                    <button className="sp-btn-primary" onClick={handleApply} style={{ minWidth: 80 }}>Nhận</button>
                    <button className="sp-btn-outline" onClick={handleCancel} style={{ minWidth: 80 }}>Hủy</button>
                </div>
            </div>
        </div>
    );
}

const EMPTY_FILTERS = { fromDate: "", toDate: "", itemId: "" };

export default function ItemDetailReportPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [items, setItems] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [issues, setIssues] = useState([]);
    const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
    const [applied, setApplied] = useState({ ...EMPTY_FILTERS });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([getAllItems(), getAllReceipts(), getAllIssues()])
            .then(([its, rcs, iss]) => {
                setItems(its || []);
                setReceipts((rcs || []).filter((r) => r.docstatus === "CONFIRMED"));
                setIssues((iss || []).filter((r) => r.docstatus === "CONFIRMED"));
            })
            .catch(() => setError("Không thể tải dữ liệu báo cáo."))
            .finally(() => setLoading(false));
    }, []);

    const groups = useMemo(() => {
        const fromD = applied.fromDate ? parseLocalDate(applied.fromDate) : null;
        const toD = applied.toDate ? parseLocalDate(applied.toDate) : null;
        const map = new Map();

        const ensure = (itemId) => {
            if (!map.has(itemId)) {
                const item = items.find((it) => String(it.id) === itemId) || {};
                map.set(itemId, {
                    itemId,
                    itemcode: item.itemcode || "",
                    itemname: item.itemname || "",
                    unitof: item.unitof || "",
                    opening: { qty: 0, val: 0 },
                    rows: [],
                    totals: { inQty: 0, inVal: 0, outQty: 0, outVal: 0 },
                    closing: { qty: 0, val: 0 },
                });
            }
            return map.get(itemId);
        };

        const pushTx = (docDate, docno, detail, isIn) => {
            const itemId = String(detail?.itemId || "");
            if (!itemId) return;
            if (applied.itemId && applied.itemId !== itemId) return;
            const d = toDateObj(docDate);
            if (!d) return;
            const docD = stripTime(d);
            const qty = Number(detail?.quantity || 0);
            const val = Number(detail?.amount ?? (qty * Number(detail?.unitprice || 0)));
            const group = ensure(itemId);

            if (fromD && docD < fromD) {
                group.opening.qty += isIn ? qty : -qty;
                group.opening.val += isIn ? val : -val;
                return;
            }
            if (toD && docD > toD) return;

            group.rows.push({
                date: docDate,
                docno: docno || "",
                isIn,
                qty,
                val,
            });
        };

        receipts.forEach((r) => {
            (r.details || []).forEach((d) => pushTx(r.docDate, r.docno, d, true));
        });

        issues.forEach((r) => {
            (r.details || []).forEach((d) => pushTx(r.docDate, r.docno, d, false));
        });

        map.forEach((g) => {
            g.rows.sort((a, b) => new Date(a.date) - new Date(b.date));
            let runningQty = g.opening.qty;
            let runningVal = g.opening.val;
            g.rows = g.rows.map((row) => {
                if (row.isIn) {
                    runningQty += row.qty;
                    runningVal += row.val;
                    g.totals.inQty += row.qty;
                    g.totals.inVal += row.val;
                } else {
                    runningQty -= row.qty;
                    runningVal -= row.val;
                    g.totals.outQty += row.qty;
                    g.totals.outVal += row.val;
                }
                return { ...row, closeQty: runningQty, closeVal: runningVal };
            });
            g.closing.qty = runningQty;
            g.closing.val = runningVal;
        });

        const rows = Array.from(map.values()).sort((a, b) => (a.itemcode || "").localeCompare(b.itemcode || ""));
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((g) =>
            (g.itemcode || "").toLowerCase().includes(q) ||
            (g.itemname || "").toLowerCase().includes(q) ||
            g.rows.some((row) => (row.docno || "").toLowerCase().includes(q))
        );
    }, [applied, items, receipts, issues, search]);

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
        const ws = wb.addWorksheet("So chi tiet vat tu");

        ws.columns = [
            { width: 6 },
            { width: 12 },
            { width: 14 },
            { width: 14 },
            { width: 28 },
            { width: 8 },
            { width: 12 },
            { width: 14 },
            { width: 12 },
            { width: 14 },
            { width: 12 },
            { width: 14 },
            { width: 12 },
            { width: 14 },
        ];

        const GRN = "FF1E854A";
        const WHITE = "FFFFFFFF";
        const GRAY_BORDER = { style: "thin", color: { argb: "FFD0E4D8" } };
        const borderAll = { top: GRAY_BORDER, bottom: GRAY_BORDER, left: GRAY_BORDER, right: GRAY_BORDER };

        const styleCell = (cell, opts = {}) => {
            if (opts.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
            if (opts.font) cell.font = opts.font;
            if (opts.align) cell.alignment = opts.align;
            if (opts.border !== false) cell.border = opts.border || borderAll;
            if (opts.numFmt) cell.numFmt = opts.numFmt;
        };

        const styleRow = (row, fill, font, align, border) => {
            for (let c = 1; c <= 14; c++) {
                styleCell(row.getCell(c), { fill, font, align, border });
            }
        };

        const r1 = ws.addRow([COMPANY_NAME]);
        ws.mergeCells("A1:N1");
        r1.getCell(1).font = { bold: true, size: 12 };
        r1.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

        const r2 = ws.addRow([COMPANY_ADDRESS]);
        ws.mergeCells("A2:N2");
        r2.getCell(1).font = { size: 10, color: { argb: "FF333333" } };
        r2.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

        ws.addRow([]);

        const r4 = ws.addRow(["SỔ CHI TIẾT VẬT TƯ"]);
        ws.mergeCells("A4:N4");
        r4.getCell(1).font = { bold: true, size: 14 };
        r4.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

        const r5 = ws.addRow([subtitle]);
        ws.mergeCells("A5:N5");
        r5.getCell(1).font = { italic: true, size: 11, color: { argb: "FF555555" } };
        r5.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

        ws.addRow([]);

        const hdrFont = { bold: true, color: { argb: WHITE }, size: 10 };
        const hdrAlign = { horizontal: "center", vertical: "middle", wrapText: true };

        groups.forEach((g, idx) => {
            const groupRow = ws.addRow([`${idx + 1}. ${g.itemcode || ""} - ${g.itemname || ""}`]);
            ws.mergeCells(`A${groupRow.number}:N${groupRow.number}`);
            styleRow(groupRow, "FFFEF6E4", { bold: true, size: 10 }, { horizontal: "left", vertical: "middle" }, borderAll);

            const rHdr1 = ws.addRow(["STT", "Chứng từ", "", "Mã vật tư", "Tên vật tư", "Đvt", "Tồn đầu", "", "Nhập", "", "Xuất", "", "Tồn cuối", ""]);
            const rHdr2 = ws.addRow(["", "Ngày", "Số", "", "", "", "Số lượng", "Giá trị", "Số lượng", "Giá trị", "Số lượng", "Giá trị", "Số lượng", "Giá trị"]);

            ws.mergeCells(`A${rHdr1.number}:A${rHdr2.number}`);
            ws.mergeCells(`B${rHdr1.number}:C${rHdr1.number}`);
            ws.mergeCells(`D${rHdr1.number}:D${rHdr2.number}`);
            ws.mergeCells(`E${rHdr1.number}:E${rHdr2.number}`);
            ws.mergeCells(`F${rHdr1.number}:F${rHdr2.number}`);
            ws.mergeCells(`G${rHdr1.number}:H${rHdr1.number}`);
            ws.mergeCells(`I${rHdr1.number}:J${rHdr1.number}`);
            ws.mergeCells(`K${rHdr1.number}:L${rHdr1.number}`);
            ws.mergeCells(`M${rHdr1.number}:N${rHdr1.number}`);

            styleRow(rHdr1, GRN, hdrFont, hdrAlign, borderAll);
            styleRow(rHdr2, GRN, hdrFont, hdrAlign, borderAll);

            const openRow = ws.addRow([
                "",
                "",
                "Tồn đầu kỳ",
                g.itemcode,
                g.itemname,
                g.unitof,
                g.opening.qty,
                g.opening.val,
                0,
                0,
                0,
                0,
                g.opening.qty,
                g.opening.val,
            ]);
            styleRow(openRow, "FFFFFAF2", { bold: true, size: 10 }, null, borderAll);
            openRow.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
            for (let c = 7; c <= 14; c++) {
                openRow.getCell(c).alignment = { horizontal: "right", vertical: "middle" };
                openRow.getCell(c).numFmt = "#,##0.0000";
            }

            g.rows.forEach((row, rIdx) => {
                const dataRow = ws.addRow([
                    rIdx + 1,
                    formatDate(row.date),
                    row.docno,
                    g.itemcode,
                    g.itemname,
                    g.unitof,
                    "",
                    "",
                    row.isIn ? row.qty : "",
                    row.isIn ? row.val : "",
                    row.isIn ? "" : row.qty,
                    row.isIn ? "" : row.val,
                    row.closeQty,
                    row.closeVal,
                ]);
                styleRow(dataRow, null, { size: 10 }, null, borderAll);
                dataRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                dataRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
                dataRow.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
                dataRow.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
                for (let c = 9; c <= 14; c++) {
                    dataRow.getCell(c).alignment = { horizontal: "right", vertical: "middle" };
                    dataRow.getCell(c).numFmt = "#,##0.0000";
                }
            });

            const totalRow = ws.addRow([
                "",
                "",
                "Tổng nhập/xuất",
                "",
                "",
                "",
                "",
                "",
                g.totals.inQty,
                g.totals.inVal,
                g.totals.outQty,
                g.totals.outVal,
                "",
                "",
            ]);
            ws.mergeCells(`A${totalRow.number}:H${totalRow.number}`);
            styleRow(totalRow, "FFF7FBF8", { bold: true, size: 10 }, null, borderAll);
            totalRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
            for (let c = 9; c <= 12; c++) {
                totalRow.getCell(c).alignment = { horizontal: "right", vertical: "middle" };
                totalRow.getCell(c).numFmt = "#,##0.0000";
            }

            const closeRow = ws.addRow([
                "",
                "",
                "Tồn cuối kỳ",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                g.closing.qty,
                g.closing.val,
            ]);
            ws.mergeCells(`A${closeRow.number}:L${closeRow.number}`);
            styleRow(closeRow, "FFF9F4E8", { bold: true, size: 10 }, null, borderAll);
            closeRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
            closeRow.getCell(13).alignment = { horizontal: "right", vertical: "middle" };
            closeRow.getCell(14).alignment = { horizontal: "right", vertical: "middle" };
            closeRow.getCell(13).numFmt = "#,##0.0000";
            closeRow.getCell(14).numFmt = "#,##0.0000";

            ws.addRow([]);
        });

        ws.addRow([]);
        ws.addRow([]);

        const sigDateRow = ws.addRow([]);
        ws.mergeCells(`I${sigDateRow.number}:N${sigDateRow.number}`);
        sigDateRow.getCell(9).value = `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
        sigDateRow.getCell(9).font = { italic: true, size: 10 };
        sigDateRow.getCell(9).alignment = { horizontal: "center" };

        const sigLabelRow = ws.addRow([]);
        ws.mergeCells(`A${sigLabelRow.number}:D${sigLabelRow.number}`);
        ws.mergeCells(`I${sigLabelRow.number}:N${sigLabelRow.number}`);
        sigLabelRow.getCell(1).value = "Kế toán trưởng";
        sigLabelRow.getCell(1).font = { bold: true, size: 10 };
        sigLabelRow.getCell(1).alignment = { horizontal: "center" };
        sigLabelRow.getCell(9).value = "Người lập";
        sigLabelRow.getCell(9).font = { bold: true, size: 10 };
        sigLabelRow.getCell(9).alignment = { horizontal: "center" };

        const sigSubRow = ws.addRow([]);
        ws.mergeCells(`A${sigSubRow.number}:D${sigSubRow.number}`);
        ws.mergeCells(`I${sigSubRow.number}:N${sigSubRow.number}`);
        sigSubRow.getCell(1).value = "(Ký, họ tên)";
        sigSubRow.getCell(1).font = { italic: true, size: 10 };
        sigSubRow.getCell(1).alignment = { horizontal: "center" };
        sigSubRow.getCell(9).value = "(Ký, họ tên)";
        sigSubRow.getCell(9).font = { italic: true, size: 10 };
        sigSubRow.getCell(9).alignment = { horizontal: "center" };

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SoChiTietVatTu_${stamp}.xlsx`;
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
                onApply={(local) => setApplied({ ...local })}
                onClose={() => setDrawerOpen(false)}
            />
            <div className="sp-main">
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Báo cáo &rsaquo; <span className="sp-breadcrumb-active">Sổ chi tiết vật tư</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>
                <div className="sp-content">
                    <h1 className="sp-title">Sổ chi tiết vật tư</h1>
                    <div className="sp-toolbar">
                        <div className="sp-search-wrap">
                            <span className="sp-search-icon">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
                        <button className="rc-btn-template rpt-export-btn" onClick={() => handleExport().catch(console.error)} disabled={groups.length === 0}>
                            <IconExport /> Export
                        </button>
                    </div>

                    <div className="rpt-content rpt-printable">
                        <div className="rpt-report-title">SỔ CHI TIẾT VẬT TƯ</div>
                        {dateLabel && <div className="rpt-report-subtitle">{dateLabel}</div>}

                        {activeFilterCount > 0 && (
                            <div className="rpt-chips">
                                {applied.fromDate && <span className="rpt-chip">Từ: {formatDate(applied.fromDate)}</span>}
                                {applied.toDate && <span className="rpt-chip">Đến: {formatDate(applied.toDate)}</span>}
                                {applied.itemId && <span className="rpt-chip">Vật tư: {items.find((it) => String(it.id) === applied.itemId)?.itemname || applied.itemId}</span>}
                                <button className="rpt-chip rpt-chip-clear" onClick={() => { setFilters({ ...EMPTY_FILTERS }); setApplied({ ...EMPTY_FILTERS }); }}>✕ Xóa lọc</button>
                            </div>
                        )}

                        {loading && <div style={{ textAlign: "center", color: "#4c6152", padding: "40px 0" }}>Đang tải dữ liệu...</div>}
                        {!loading && error && <div style={{ textAlign: "center", color: "#b71c1c", padding: "40px 0" }}>{error}</div>}

                        {!loading && !error && (
                            <div className="rpt-table-wrap">
                                {groups.length === 0 && (
                                    <div style={{ textAlign: "center", color: "#8ba392", padding: "24px 0" }}>Không có dữ liệu.</div>
                                )}

                                {groups.map((g, gi) => (
                                    <div key={g.itemId || gi} style={{ marginBottom: 18 }}>
                                        <table className="rc-detail-table rpt-table rpt-item-detail-table" style={{ tableLayout: "fixed" }}>
                                            <colgroup>
                                                <col style={{ width: "50px" }} />
                                                <col style={{ width: "90px" }} />
                                                <col style={{ width: "130px" }} />
                                                <col style={{ width: "90px" }} />
                                                <col style={{ width: "180px" }} />
                                                <col style={{ width: "70px" }} />
                                                <col style={{ width: "90px" }} />
                                                <col style={{ width: "110px" }} />
                                                <col style={{ width: "90px" }} />
                                                <col style={{ width: "110px" }} />
                                                <col style={{ width: "90px" }} />
                                                <col style={{ width: "110px" }} />
                                                <col style={{ width: "90px" }} />
                                                <col style={{ width: "110px" }} />
                                            </colgroup>
                                            <thead>
                                                <tr className="rpt-item-group-row">
                                                    <td colSpan={14}>{`${gi + 1}. ${g.itemcode || "—"} - ${g.itemname || "—"}`}</td>
                                                </tr>
                                                <tr>
                                                    <th rowSpan={2} style={{ textAlign: "center" }}>STT</th>
                                                    <th colSpan={2} style={{ textAlign: "center" }}>Chứng từ</th>
                                                    <th rowSpan={2}>Mã vật tư</th>
                                                    <th rowSpan={2}>Tên vật tư</th>
                                                    <th rowSpan={2} style={{ textAlign: "center" }}>Đvt</th>
                                                    <th colSpan={2}>Tồn đầu</th>
                                                    <th colSpan={2}>Nhập</th>
                                                    <th colSpan={2}>Xuất</th>
                                                    <th colSpan={2}>Tồn cuối</th>
                                                </tr>
                                                <tr>
                                                    <th>Ngày</th>
                                                    <th>Số</th>
                                                    <th className="rpt-num">Số lượng</th>
                                                    <th className="rpt-num">Giá trị</th>
                                                    <th className="rpt-num">Số lượng</th>
                                                    <th className="rpt-num">Giá trị</th>
                                                    <th className="rpt-num">Số lượng</th>
                                                    <th className="rpt-num">Giá trị</th>
                                                    <th className="rpt-num">Số lượng</th>
                                                    <th className="rpt-num">Giá trị</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="rpt-opening-row">
                                                    <td style={{ textAlign: "center" }}> </td>
                                                    <td style={{ textAlign: "center" }}> </td>
                                                    <td style={{ fontWeight: 700 }}>Tồn đầu kỳ</td>
                                                    <td style={{ fontWeight: 600 }}>{g.itemcode || "—"}</td>
                                                    <td>{g.itemname || "—"}</td>
                                                    <td style={{ textAlign: "center" }}>{g.unitof || "—"}</td>
                                                    <td className="rpt-num">{g.opening.qty.toLocaleString("vi-VN")}</td>
                                                    <td className="rpt-num">{formatMoney(g.opening.val)}</td>
                                                    <td className="rpt-num">0</td>
                                                    <td className="rpt-num">0</td>
                                                    <td className="rpt-num">0</td>
                                                    <td className="rpt-num">0</td>
                                                    <td className="rpt-num">{g.opening.qty.toLocaleString("vi-VN")}</td>
                                                    <td className="rpt-num">{formatMoney(g.opening.val)}</td>
                                                </tr>

                                                {g.rows.map((row, idx) => (
                                                    <tr key={`${g.itemId}-${idx}`}>
                                                        <td style={{ textAlign: "center", color: "#8ba392" }}>{idx + 1}</td>
                                                        <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.date)}</td>
                                                        <td style={{ fontWeight: 600, color: "#1E854A" }}>{row.docno || "—"}</td>
                                                        <td style={{ fontWeight: 600, color: "#1E3A2F" }}>{g.itemcode || "—"}</td>
                                                        <td>{g.itemname || "—"}</td>
                                                        <td style={{ textAlign: "center" }}>{g.unitof || "—"}</td>
                                                        <td />
                                                        <td />
                                                        <td className="rpt-num">{row.isIn ? row.qty.toLocaleString("vi-VN") : ""}</td>
                                                        <td className="rpt-num">{row.isIn ? formatMoney(row.val) : ""}</td>
                                                        <td className="rpt-num">{row.isIn ? "" : row.qty.toLocaleString("vi-VN")}</td>
                                                        <td className="rpt-num">{row.isIn ? "" : formatMoney(row.val)}</td>
                                                        <td className="rpt-num">{row.closeQty.toLocaleString("vi-VN")}</td>
                                                        <td className="rpt-num">{formatMoney(row.closeVal)}</td>
                                                    </tr>
                                                ))}

                                                <tr className="rpt-summary-row">
                                                    <td colSpan={8} style={{ textAlign: "right", paddingRight: 12 }}>Tổng nhập/xuất</td>
                                                    <td className="rpt-num">{g.totals.inQty.toLocaleString("vi-VN")}</td>
                                                    <td className="rpt-num">{formatMoney(g.totals.inVal)}</td>
                                                    <td className="rpt-num">{g.totals.outQty.toLocaleString("vi-VN")}</td>
                                                    <td className="rpt-num">{formatMoney(g.totals.outVal)}</td>
                                                    <td className="rpt-num" />
                                                    <td className="rpt-num" />
                                                </tr>
                                                <tr className="rpt-summary-row rpt-summary-strong">
                                                    <td colSpan={12} style={{ textAlign: "right", paddingRight: 12 }}>Tồn cuối kỳ</td>
                                                    <td className="rpt-num">{g.closing.qty.toLocaleString("vi-VN")}</td>
                                                    <td className="rpt-num">{formatMoney(g.closing.val)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
