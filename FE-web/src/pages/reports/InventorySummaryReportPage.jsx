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

export default function InventorySummaryReportPage() {
    const [items, setItems] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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

    const summaryRows = useMemo(() => {
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
                    openQty: 0,
                    openVal: 0,
                    inQty: 0,
                    inVal: 0,
                    outQty: 0,
                    outVal: 0,
                });
            }
            return map.get(itemId);
        };

        const handleTx = (docDate, detail, isIn) => {
            const itemId = String(detail?.itemId || "");
            if (!itemId) return;
            if (applied.itemId && applied.itemId !== itemId) return;
            const d = toDateObj(docDate);
            if (!d) return;
            const docD = stripTime(d);
            const qty = Number(detail?.quantity || 0);
            const val = Number(detail?.amount ?? (qty * Number(detail?.unitprice || 0)));
            const row = ensure(itemId);

            if (fromD && docD < fromD) {
                row.openQty += isIn ? qty : -qty;
                row.openVal += isIn ? val : -val;
                return;
            }
            if (toD && docD > toD) return;

            if (isIn) {
                row.inQty += qty;
                row.inVal += val;
            } else {
                row.outQty += qty;
                row.outVal += val;
            }
        };

        receipts.forEach((r) => {
            (r.details || []).forEach((d) => handleTx(r.docDate, d, true));
        });

        issues.forEach((r) => {
            (r.details || []).forEach((d) => handleTx(r.docDate, d, false));
        });

        const rows = Array.from(map.values()).map((row) => ({
            ...row,
            closeQty: row.openQty + row.inQty - row.outQty,
            closeVal: row.openVal + row.inVal - row.outVal,
        }));

        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) =>
            (row.itemcode || "").toLowerCase().includes(q) ||
            (row.itemname || "").toLowerCase().includes(q) ||
            (row.unitof || "").toLowerCase().includes(q)
        );
    }, [applied, items, receipts, issues, search]);

    const totals = useMemo(() => summaryRows.reduce((acc, r) => {
        acc.openQty += r.openQty;
        acc.openVal += r.openVal;
        acc.inQty += r.inQty;
        acc.inVal += r.inVal;
        acc.outQty += r.outQty;
        acc.outVal += r.outVal;
        acc.closeQty += r.closeQty;
        acc.closeVal += r.closeVal;
        return acc;
    }, { openQty: 0, openVal: 0, inQty: 0, inVal: 0, outQty: 0, outVal: 0, closeQty: 0, closeVal: 0 }), [summaryRows]);

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
        const ws = wb.addWorksheet("Tong hop nhap xuat ton");

        ws.columns = [
            { width: 6 },
            { width: 14 },
            { width: 26 },
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
            for (let c = 1; c <= 12; c++) {
                styleCell(row.getCell(c), { fill, font, align, border });
            }
        };

        const r1 = ws.addRow([COMPANY_NAME]);
        ws.mergeCells("A1:L1");
        r1.getCell(1).font = { bold: true, size: 12 };
        r1.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

        const r2 = ws.addRow([COMPANY_ADDRESS]);
        ws.mergeCells("A2:L2");
        r2.getCell(1).font = { size: 10, color: { argb: "FF333333" } };
        r2.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

        ws.addRow([]);

        const r4 = ws.addRow(["TỔNG HỢP NHẬP - XUẤT - TỒN"]);
        ws.mergeCells("A4:L4");
        r4.getCell(1).font = { bold: true, size: 14 };
        r4.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

        const r5 = ws.addRow([subtitle]);
        ws.mergeCells("A5:L5");
        r5.getCell(1).font = { italic: true, size: 11, color: { argb: "FF555555" } };
        r5.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

        ws.addRow([]);

        const hdrFont = { bold: true, color: { argb: WHITE }, size: 10 };
        const hdrAlign = { horizontal: "center", vertical: "middle", wrapText: true };

        const r7 = ws.addRow(["STT", "Mã vật tư", "Tên vật tư", "Đvt", "Tồn đầu", "", "Nhập", "", "Xuất", "", "Tồn cuối", ""]);
        const r8 = ws.addRow(["", "", "", "", "Số lượng", "Giá trị", "Số lượng", "Giá trị", "Số lượng", "Giá trị", "Số lượng", "Giá trị"]);

        ws.mergeCells("A7:A8");
        ws.mergeCells("B7:B8");
        ws.mergeCells("C7:C8");
        ws.mergeCells("D7:D8");
        ws.mergeCells("E7:F7");
        ws.mergeCells("G7:H7");
        ws.mergeCells("I7:J7");
        ws.mergeCells("K7:L7");

        styleRow(r7, GRN, hdrFont, hdrAlign, borderAll);
        styleRow(r8, GRN, hdrFont, hdrAlign, borderAll);

        summaryRows.forEach((r, idx) => {
            const row = ws.addRow([
                idx + 1,
                r.itemcode,
                r.itemname,
                r.unitof,
                r.openQty,
                r.openVal,
                r.inQty,
                r.inVal,
                r.outQty,
                r.outVal,
                r.closeQty,
                r.closeVal,
            ]);
            styleCell(row.getCell(1), { align: { horizontal: "center", vertical: "middle" }, border: borderAll });
            styleCell(row.getCell(2), { font: { bold: true, color: { argb: "FF1E3A2F" }, size: 10 }, border: borderAll });
            styleCell(row.getCell(3), { border: borderAll });
            styleCell(row.getCell(4), { align: { horizontal: "center", vertical: "middle" }, border: borderAll });
            for (let c = 5; c <= 12; c++) {
                styleCell(row.getCell(c), { align: { horizontal: "right", vertical: "middle" }, border: borderAll, numFmt: "#,##0.0000" });
            }
        });

        if (summaryRows.length > 0) {
            const totalRow = ws.addRow(["", "", "Tổng cộng", "", totals.openQty, totals.openVal, totals.inQty, totals.inVal, totals.outQty, totals.outVal, totals.closeQty, totals.closeVal]);
            styleRow(totalRow, "FFF2FBF6", { bold: true, color: { argb: "FF1A3A25" }, size: 10 }, null, borderAll);
            totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
            for (let c = 5; c <= 12; c++) {
                totalRow.getCell(c).alignment = { horizontal: "right", vertical: "middle" };
                totalRow.getCell(c).numFmt = "#,##0.0000";
            }
        }

        ws.addRow([]);
        ws.addRow([]);

        const sigDateRow = ws.addRow([]);
        ws.mergeCells(`I${sigDateRow.number}:L${sigDateRow.number}`);
        sigDateRow.getCell(9).value = `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
        sigDateRow.getCell(9).font = { italic: true, size: 10 };
        sigDateRow.getCell(9).alignment = { horizontal: "center" };

        const sigLabelRow = ws.addRow([]);
        ws.mergeCells(`A${sigLabelRow.number}:D${sigLabelRow.number}`);
        ws.mergeCells(`I${sigLabelRow.number}:L${sigLabelRow.number}`);
        sigLabelRow.getCell(1).value = "Kế toán trưởng";
        sigLabelRow.getCell(1).font = { bold: true, size: 10 };
        sigLabelRow.getCell(1).alignment = { horizontal: "center" };
        sigLabelRow.getCell(9).value = "Người lập";
        sigLabelRow.getCell(9).font = { bold: true, size: 10 };
        sigLabelRow.getCell(9).alignment = { horizontal: "center" };

        const sigSubRow = ws.addRow([]);
        ws.mergeCells(`A${sigSubRow.number}:D${sigSubRow.number}`);
        ws.mergeCells(`I${sigSubRow.number}:L${sigSubRow.number}`);
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
        a.download = `TongHopNhapXuatTon_${stamp}.xlsx`;
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
                            Báo cáo &rsaquo; <span className="sp-breadcrumb-active">Tổng hợp nhập - xuất - tồn</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>
                <div className="sp-content">
                    <h1 className="sp-title">Tổng hợp nhập - xuất - tồn</h1>
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
                        <button className="rc-btn-template rpt-export-btn" onClick={() => handleExport().catch(console.error)} disabled={summaryRows.length === 0}>
                            <IconExport /> Export
                        </button>
                    </div>

                    <div className="rpt-content rpt-printable">
                        <div className="rpt-report-title">TỔNG HỢP NHẬP - XUẤT - TỒN</div>
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
                            <div className="rc-detail-table-wrap rpt-table-wrap">
                                <table className="rc-detail-table rpt-table rpt-summary-table" style={{ tableLayout: "fixed" }}>
                                    <colgroup>
                                        <col style={{ width: "50px" }} />
                                        <col style={{ width: "110px" }} />
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
                                        <tr>
                                            <th rowSpan={2} style={{ textAlign: "center" }}>STT</th>
                                            <th rowSpan={2}>Mã vật tư</th>
                                            <th rowSpan={2}>Tên vật tư</th>
                                            <th rowSpan={2} style={{ textAlign: "center" }}>Đvt</th>
                                            <th colSpan={2}>Tồn đầu</th>
                                            <th colSpan={2}>Nhập</th>
                                            <th colSpan={2}>Xuất</th>
                                            <th colSpan={2}>Tồn cuối</th>
                                        </tr>
                                        <tr>
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
                                        {summaryRows.length === 0 && (
                                            <tr>
                                                <td colSpan={12} style={{ textAlign: "center", color: "#8ba392", padding: "24px 0" }}>
                                                    Không có dữ liệu.
                                                </td>
                                            </tr>
                                        )}
                                        {summaryRows.map((r, idx) => (
                                            <tr key={r.itemId || idx}>
                                                <td style={{ textAlign: "center", color: "#8ba392" }}>{idx + 1}</td>
                                                <td style={{ fontWeight: 600, color: "#1E3A2F" }}>{r.itemcode || "—"}</td>
                                                <td>{r.itemname || "—"}</td>
                                                <td style={{ textAlign: "center" }}>{r.unitof || "—"}</td>
                                                <td className="rpt-num">{r.openQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(r.openVal)}</td>
                                                <td className="rpt-num">{r.inQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(r.inVal)}</td>
                                                <td className="rpt-num">{r.outQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(r.outVal)}</td>
                                                <td className="rpt-num">{r.closeQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(r.closeVal)}</td>
                                            </tr>
                                        ))}
                                        {summaryRows.length > 0 && (
                                            <tr className="rpt-total-row">
                                                <td colSpan={4} style={{ textAlign: "right", paddingRight: 12 }}>Tổng cộng</td>
                                                <td className="rpt-num">{totals.openQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(totals.openVal)}</td>
                                                <td className="rpt-num">{totals.inQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(totals.inVal)}</td>
                                                <td className="rpt-num">{totals.outQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(totals.outVal)}</td>
                                                <td className="rpt-num">{totals.closeQty.toLocaleString("vi-VN")}</td>
                                                <td className="rpt-num">{formatMoney(totals.closeVal)}</td>
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
