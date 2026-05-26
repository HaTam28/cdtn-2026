import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./batches.css";
import { getAllBatches } from "../../api/batchApi";
import TopbarRight from "../../components/TopbarRight";
import { getAllReceipts } from "../../api/receiptApi";

const ROWS_OPTIONS = [10, 15, 20, 50];

function SortIcon() {
    return (
        <svg width="11" height="11" viewBox="0 0 12 14" fill="none" style={{ marginLeft: 4, verticalAlign: "middle", opacity: 0.75 }}>
            <path d="M4 5.5L6 3L8 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 8.5L6 11L8 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDate(str) {
    if (!str) return "";
    return str.slice(0, 10);
}

function formatNumber(val) {
    if (val === null || val === undefined || val === "") return "";
    return Number(val).toLocaleString("vi-VN");
}

export default function BatchesPage() {
    const [batches, setBatches] = useState([]);
    const [receiptStatusByDetailId, setReceiptStatusByDetailId] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [selected, setSelected] = useState(new Set());
    const navigate = useNavigate();

    const fetchBatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [batchData, receiptData] = await Promise.all([getAllBatches(), getAllReceipts()]);
            const statusByDetailId = {};
            (receiptData || []).forEach((receipt) => {
                (receipt.details || []).forEach((detail) => {
                    if (detail?.id) {
                        statusByDetailId[detail.id] = receipt.docstatus;
                    }
                });
            });
            setReceiptStatusByDetailId(statusByDetailId);
            setBatches(batchData || []);
        } catch {
            setError("Không thể tải danh sách lô hàng. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBatches(); }, [fetchBatches]);

    useEffect(() => {
        const handleRefresh = () => fetchBatches();
        const handleFocus = () => {
            if (localStorage.getItem("batchesNeedsRefresh")) {
                localStorage.removeItem("batchesNeedsRefresh");
                fetchBatches();
            }
        };
        window.addEventListener("batches:refresh", handleRefresh);
        window.addEventListener("focus", handleFocus);
        handleFocus();
        return () => {
            window.removeEventListener("batches:refresh", handleRefresh);
            window.removeEventListener("focus", handleFocus);
        };
    }, [fetchBatches]);

    const filtered = useMemo(() => {
        const sorted = [...batches]
            .filter((batch) => receiptStatusByDetailId[batch.receiptDetailId] === "CONFIRMED")
            .sort((a, b) => (a.id || 0) - (b.id || 0));
        if (!search.trim()) return sorted;
        const q = search.toLowerCase();
        return sorted.filter((r) =>
            r.batchCode?.toLowerCase().includes(q) ||
            r.nameBatch?.toLowerCase().includes(q) ||
            r.itemcode?.toLowerCase().includes(q) ||
            r.itemname?.toLowerCase().includes(q)
        );
    }, [search, batches, receiptStatusByDetailId]);

    const totalRows = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const start = (page - 1) * rowsPerPage;
    const rows = filtered.slice(start, start + rowsPerPage);

    const allIds = rows.map((r) => r.id);
    const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));
    const someChecked = allIds.some((id) => selected.has(id)) && !allChecked;

    const handleExportPdf = () => {
        if (selected.size === 0) return;
        const now = new Date();
        const title = "DANH MỤC LÔ HÀNG";
        const exportRows = filtered.filter((r) => selected.has(r.id));
        const rowsHtml = exportRows.map((r, idx) => `
                        <tr>
                                <td class="center">${idx + 1}</td>
                        <td>${escapeHtml(r.batchCode || r.batchcode || "")}</td>
                        <td>${escapeHtml(r.nameBatch || "")}</td>
                        <td>${escapeHtml(r.itemcode || "")}</td>
                        <td>${escapeHtml(r.itemname || "")}</td>
                        <td class="right">${formatNumber(r.quantity)}</td>
                        <td class="right">${formatNumber(r.quantityRemaining)}</td>
                        <td class="right">${formatNumber(r.unitCost)}</td>
                        <td>${escapeHtml(formatDate(r.createdAt) || "")}</td>
                        </tr>
                `).join("");

        const html = `
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
        body { font-family: "Times New Roman", serif; margin: 24px 28px; color: #111; }
        h1 { text-align: center; margin: 0 0 6px; font-size: 20px; }
        .sub { text-align: center; margin-bottom: 12px; font-style: italic; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { text-align: center; font-weight: 700; }
        .center { text-align: center; }
        .right { text-align: right; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="sub">Ngày ${now.toLocaleDateString("vi-VN")}</div>
    <table>
        <thead>
            <tr>
                <th>STT</th>
                <th>Mã lô</th>
                <th>Tên lô</th>
                <th>Mã vật tư</th>
                <th>Tên vật tư</th>
                <th>Số lượng</th>
                <th>Số lượng còn</th>
                <th>Giá</th>
                <th>Ngày tạo</th>
            </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
    </table>
</body>
</html>`;

        const win = window.open("", "_blank", "width=900,height=1200");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        let printed = false;
        const triggerPrint = () => {
            if (printed || win.closed) return;
            printed = true;
            win.focus();
            win.print();
        };
        win.onload = triggerPrint;
        setTimeout(triggerPrint, 600);
    };

    const toggleRow = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const toggleAll = (checked) =>
        setSelected((prev) => {
            const next = new Set(prev);
            rows.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
            return next;
        });

    function getPages() {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        let arr = [1];
        if (page > 3) arr.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
        if (page < totalPages - 2) arr.push("…");
        arr.push(totalPages);
        return arr;
    }

    return (
        <div className="sp-main">
            {/* Topbar */}
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Danh mục &rsaquo; <span className="sp-breadcrumb-active">Danh mục lô vật tư hàng hóa</span>
                    </div>
                    {/* <div className="sp-breadcrumb-sub">Batches</div> */}
                </div>
                <TopbarRight />
            </div>

            {/* Content */}
            <div className="sp-content">
                <h1 className="sp-title">Lô vật tư hàng hóa</h1>

                {/* Toolbar */}
                <div className="sp-toolbar">
                    <div className="sp-search-wrap">
                        <svg className="sp-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            className="sp-search"
                            placeholder="Search (mã lô, mã vật tư, tên vật tư)"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button className="sp-btn-primary" onClick={() => navigate("/receipts/create")} title="Tạo lô hàng qua phiếu nhập kho">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Thêm qua phiếu nhập
                    </button>
                    <button
                        className="sp-btn-outline"
                        onClick={handleExportPdf}
                        disabled={selected.size === 0}
                        title={selected.size === 0 ? "Chọn ít nhất 1 lô hàng để export" : `Export ${selected.size} lô hàng`}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export {selected.size > 0 ? `(${selected.size})` : ""}
                    </button>
                </div>
                {/* Table */}
                <div className="sp-table-wrap sp-scrollable">
                    <table className="sp-table bt-table">
                        <thead>
                            <tr>
                                <th className="sp-th-cb">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                        onChange={(e) => toggleAll(e.target.checked)}
                                    />
                                </th>
                                <th className="sp-th-sticky">Mã lô <SortIcon /></th>
                                <th>Tên lô <SortIcon /></th>
                                <th>Mã VT <SortIcon /></th>
                                <th>Tên vật tư / hàng hóa <SortIcon /></th>
                                <th>SL ban đầu <SortIcon /></th>
                                <th>SL còn lại <SortIcon /></th>
                                <th>Đơn giá nhập <SortIcon /></th>
                                <th>Ngày tạo <SortIcon /></th>
                                <th className="sp-th-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} className="sp-status-row">Đang tải...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={10} className="sp-status-row sp-status-error">{error}</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={10} className="sp-status-row">Không có dữ liệu</td></tr>
                            ) : rows.map((r) => (
                                <tr
                                    key={r.id}
                                    className={`sp-row-clickable${selected.has(r.id) ? " sp-row-selected" : ""}`}
                                    onClick={() => navigate(`/batches/${r.id}`)}
                                >
                                    <td className="sp-td-cb" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(r.id)}
                                            onChange={() => toggleRow(r.id)}
                                        />
                                    </td>
                                    <td className="sp-td-id sp-td-sticky">{r.batchCode}</td>
                                    <td>{r.nameBatch}</td>
                                    <td className="bt-td-itemcode">{r.itemcode}</td>
                                    <td>{r.itemname}</td>
                                    <td className="bt-td-number" style={{ textAlign: "left" }}>{formatNumber(r.quantity)}</td>
                                    <td style={{ textAlign: "left" }}>
                                        <span className={`bt-qty-remaining${r.quantityRemaining === 0 ? " bt-qty-zero" : ""}`}>
                                            {formatNumber(r.quantityRemaining)}
                                        </span>
                                    </td>
                                    <td className="bt-td-number" style={{ textAlign: "left" }}>{formatNumber(r.unitCost)}</td>
                                    <td className="bt-td-date" style={{ textAlign: "left" }} >{formatDate(r.createdAt)}</td>
                                    <td className="sp-td-action" onClick={(e) => e.stopPropagation()}>
                                        <button className="sp-edit-btn" title="Xem chi tiết" onClick={() => navigate(`/batches/${r.id}`)}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="sp-pagination">
                        <span className="sp-rows-info">
                            Rows per page
                            <select
                                className="sp-rows-select"
                                value={rowsPerPage}
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                            >
                                {ROWS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <span className="sp-total-label">of {totalRows} rows</span>
                        </span>
                        <button className="sp-page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                        <button className="sp-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                        {getPages().map((p, idx) =>
                            p === "…"
                                ? <span key={`e${idx}`} className="sp-page-ellipsis">…</span>
                                : <button
                                    key={p}
                                    className={`sp-page-btn${p === page ? " sp-page-active" : ""}`}
                                    onClick={() => setPage(p)}
                                >{p}</button>
                        )}
                        <button className="sp-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
                        <button className="sp-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
