import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import { getAllLocations, getItemsAtLocation, getLocationById } from "../../api/locationApi";
import { getBatchesByLocation } from "../../api/batchApi";
import TopbarRight from "../../components/TopbarRight";
import { COPY_SELECT_ONE } from "../../utils/messages";
import notify from "../../utils/notify";

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

function getLocationId(location) {
    return location?.id ?? location?.locationId;
}

function extractItemCode(item) {
    return (item?.itemcode ?? item?.itemCode ?? item?.code ?? "").toString?.().trim() ?? "";
}

async function fetchLocationItemSummary(id) {
    try {
        const batches = await getBatchesByLocation(id);
        if (Array.isArray(batches) && batches.length > 0) {
            const codes = Array.from(new Set(batches.map(extractItemCode))).filter(Boolean);
            const codesStr = codes.join(", ") || "—";
            const total = batches.reduce((s, b) => s + Number(b.quantityRemaining ?? b.quantity ?? 0), 0);
            return { codes: codesStr, searchText: codes.join(" ").toLowerCase(), total };
        }

        const data = await getItemsAtLocation(id);
        const storedItems = Array.isArray(data) ? data : (data?.items || []);
        const codes = Array.from(new Set(storedItems.map(extractItemCode))).filter(Boolean);
        const codesStr = codes.join(", ") || "—";
        const total = (storedItems || []).reduce((s, it) => s + Number(it.quantity ?? 0), 0);
        return { codes: codesStr, searchText: codes.join(" ").toLowerCase(), total };
    } catch {
        return { codes: "—", searchText: "", total: "—" };
    }
}

function extractTotalFromLocationData(loc) {
    if (!loc) return null;
    const keys = ["usedCapacity", "usedcapacity", "used", "totalQuantity", "totalquantity", "total", "stock", "currentStock", "currentQuantity", "quantity"];
    for (const k of keys) {
        if (loc.hasOwnProperty(k) && loc[k] !== null && loc[k] !== undefined) {
            const n = Number(loc[k]);
            if (!Number.isNaN(n)) return n;
        }
    }
    // some APIs return items[] with quantities — sum them
    const items = loc.items || loc.Items || loc.itemsList || null;
    if (Array.isArray(items)) return items.reduce((s, it) => s + Number(it.quantity ?? it.qty ?? 0), 0);
    return null;
}

export default function LocationsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [selected, setSelected] = useState(new Set());
    const [locationItemsMap, setLocationItemsMap] = useState({});
    const [locationItemSearchMap, setLocationItemSearchMap] = useState({});
    const [locationTotalsMap, setLocationTotalsMap] = useState({});
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF" || user?.role === "NV";
    const isManager = user?.role && user.role !== "STAFF" && user.role !== "NV";

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllLocations();
            setItems(data || []);
        } catch {
            setError("Không thể tải danh sách vị trí. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);


    useEffect(() => {
        let cancelled = false;
        const ids = items.map(getLocationId).filter((id) => id !== undefined && id !== null);
        const missingIds = ids.filter((id) => locationItemsMap[id] === undefined || locationItemSearchMap[id] === undefined);
        if (missingIds.length === 0) return;

        const fetchAllSummaries = async () => {
            const entries = await Promise.all(missingIds.map(async (id) => {
                const [meta, loc] = await Promise.all([fetchLocationItemSummary(id), getLocationById(id).catch(() => null)]);
                return [id, meta, loc];
            }));
            if (cancelled) return;
            setLocationItemsMap((prev) => {
                const next = { ...prev };
                entries.forEach(([id, meta]) => { next[id] = meta.codes ?? meta.summary ?? "—"; });
                return next;
            });
            setLocationItemSearchMap((prev) => {
                const next = { ...prev };
                entries.forEach(([id, meta]) => { next[id] = meta.searchText ?? ""; });
                return next;
            });
            setLocationTotalsMap((prev) => {
                const next = { ...prev };
                entries.forEach(([id, meta, loc]) => {
                    const locTotal = extractTotalFromLocationData(loc);
                    next[id] = locTotal !== null ? locTotal : (meta.total ?? "—");
                });
                return next;
            });
        };

        fetchAllSummaries();
        return () => { cancelled = true; };
    }, [items, locationItemsMap, locationItemSearchMap]);

    const filtered = useMemo(() => {
        const sorted = [...items].sort((a, b) => (getLocationId(a) || 0) - (getLocationId(b) || 0));
        if (!search.trim()) return sorted;
        const q = search.trim().toLowerCase();
        return sorted
            .map((r) => {
                const id = getLocationId(r);
                const matchesItemCode = (locationItemSearchMap[id] || "").includes(q);
                const matchesLocation =
                    r.locationcode?.toLowerCase().includes(q) ||
                    r.locationname?.toLowerCase().includes(q) ||
                    r.description?.toLowerCase().includes(q);
                return { row: r, matchesItemCode, matches: matchesItemCode || matchesLocation };
            })
            .filter((entry) => entry.matches)
            .sort((a, b) => Number(b.matchesItemCode) - Number(a.matchesItemCode))
            .map((entry) => entry.row);
    }, [search, items, locationItemSearchMap]);

    const totalRows = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const start = (page - 1) * rowsPerPage;
    const rows = filtered.slice(start, start + rowsPerPage);

    // Fetch items summary for visible rows (depend on stable rowIds string to avoid running on each render)
    const rowIds = rows.map((r) => getLocationId(r)).join(",");
    useEffect(() => {
        let cancelled = false;
        const ids = rowIds.split(",").filter(Boolean);
        if (ids.length === 0) return;
        const fetchFor = async () => {
            const codesMap = {};
            const totalsMap = {};
            await Promise.all(ids.map(async (id) => {
                try {
                    // prefer location detail for totals
                    const [batches, loc] = await Promise.all([getBatchesByLocation(id).catch(() => null), getLocationById(id).catch(() => null)]);
                    if (Array.isArray(batches) && batches.length > 0) {
                        const codes = Array.from(new Set(batches.map(b => (b.itemcode ?? b.itemCode ?? b.code ?? '').toString?.().trim() ?? ''))).filter(Boolean);
                        codesMap[id] = codes.join(", ") || "—";
                        const batchesTotal = batches.reduce((s, b) => s + Number(b.quantityRemaining ?? b.quantity ?? 0), 0);
                        const locTotal = extractTotalFromLocationData(loc);
                        totalsMap[id] = locTotal !== null ? locTotal : batchesTotal;
                        return;
                    }

                    const data = await getItemsAtLocation(id);
                    const items = Array.isArray(data) ? data : (data?.items || []);
                    if (!items || items.length === 0) {
                        codesMap[id] = "—";
                        totalsMap[id] = extractTotalFromLocationData(loc) ?? "—";
                        return;
                    }
                    const codes = Array.from(new Set(items.map((it) => (it.itemcode ?? it.itemCode ?? it.code ?? '')))).filter(Boolean);
                    codesMap[id] = codes.join(", ") || "—";
                    const itemsTotal = (items || []).reduce((s, it) => s + Number(it.quantity ?? 0), 0);
                    totalsMap[id] = extractTotalFromLocationData(loc) ?? itemsTotal;
                } catch {
                    codesMap[id] = "—";
                    totalsMap[id] = "—";
                }
            }));
            if (!cancelled) {
                setLocationItemsMap((prev) => ({ ...prev, ...codesMap }));
                setLocationTotalsMap((prev) => ({ ...prev, ...totalsMap }));
            }
        };
        fetchFor();
        return () => { cancelled = true; };
    }, [rowIds]);



    const allIds = rows.map((r) => getLocationId(r));
    const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));
    const someChecked = allIds.some((id) => selected.has(id)) && !allChecked;

    const toggleRow = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const toggleAll = (checked) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) allIds.forEach((id) => next.add(id));
            else allIds.forEach((id) => next.delete(id));
            return next;
        });

    const handleClone = () => {
        if (selected.size !== 1) {
            notify(COPY_SELECT_ONE, { type: 'warning' });
            return;
        }
        const id = Array.from(selected)[0];
        const item = items.find((r) => getLocationId(r) === id);
        if (!item) return;
        navigate("/locations/create", { state: { clone: item } });
    };

    const handleExportPdf = () => {
        if (selected.size === 0) return;
        const now = new Date();
        const title = "DANH MỤC VỊ TRÍ";
        const exportRows = filtered.filter((r) => selected.has(getLocationId(r)));
        const getTotalQty = (locId) => {
            const v = locationTotalsMap[locId];
            if (v === undefined || v === null || v === "—") return "—";
            return Number.isFinite(Number(v)) ? Number(v).toLocaleString("vi-VN") : v;
        };

        const rowsHtml = exportRows.map((r, idx) => `
            <tr>
                <td class="center">${idx + 1}</td>
                <td>${escapeHtml(r.locationcode || "")}</td>
                <td>${escapeHtml(r.locationname || "")}</td>
                <td>${escapeHtml(locationItemsMap[getLocationId(r)] ?? "")}</td>
                <td class="right">${getTotalQty(getLocationId(r))}</td>
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
                <th>Mã vị trí</th>
                <th>Tên</th>
                <th>Mã vật tư</th>
                <th>Số lượng</th>
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
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Danh mục &rsaquo; <span className="sp-breadcrumb-active">Danh mục vị trí</span>
                    </div>
                    {/* <div className="sp-breadcrumb-sub">Vị trí</div> */}
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Vị Trí</h1>
                <div className="sp-toolbar">
                    <div className="sp-search-wrap">
                        <svg className="sp-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            className="sp-search"
                            type="text"
                            placeholder="Search"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="sp-toolbar-spacer" />
                    {!isStaff && !isManager && (
                        <>
                            <button className="sp-btn-primary" onClick={() => navigate("/locations/create")}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Thêm mới
                            </button>
                            <button className="sp-btn-outline" onClick={handleClone}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Thêm bản sao mới
                            </button>
                        </>
                    )}
                    <button
                        className="sp-btn-outline"
                        onClick={handleExportPdf}
                        disabled={selected.size === 0}
                        title={selected.size === 0 ? "Chọn ít nhất 1 vị trí để export" : `Export ${selected.size} vị trí`}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Export {selected.size > 0 ? `(${selected.size})` : ""}
                    </button>
                </div>

                <div className="sp-table-wrap sp-scrollable">
                    <table className="sp-table">
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
                                <th className="sp-th-sticky">Mã vị trí <SortIcon /></th>
                                <th>Tên <SortIcon /></th>
                                <th>Mã vật tư</th>
                                <th style={{ textAlign: "center" }}>Số lượng <SortIcon /></th>
                                <th className="sp-th-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="sp-status-row">Đang tải...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={6} className="sp-status-row sp-status-error">{error}</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6} className="sp-status-row">Không có dữ liệu</td></tr>
                            ) : rows.map((r) => (
                                <tr
                                    key={getLocationId(r)}
                                    className={`sp-row-clickable${selected.has(getLocationId(r)) ? " sp-row-selected" : ""}`}
                                    onClick={() => navigate(`/locations/${getLocationId(r)}`)}
                                >
                                    <td className="sp-td-cb" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(getLocationId(r))}
                                            onChange={() => toggleRow(getLocationId(r))}
                                        />
                                    </td>
                                    <td className="sp-td-id sp-td-sticky">{r.locationcode}</td>
                                    <td>{r.locationname}</td>
                                    <td style={{ fontSize: "0.9rem", color: "#234" }}>{locationItemsMap[getLocationId(r)] ?? "..."}</td>
                                    <td style={{ textAlign: "center", fontWeight: 600 }}>{
                                        (() => {
                                            const v = locationTotalsMap[getLocationId(r)];
                                            if (v === undefined || v === null || v === "—") return "—";
                                            return Number.isFinite(Number(v)) ? Number(v).toLocaleString("vi-VN") : v;
                                        })()
                                    }</td>
                                    {/* <td style={{ textAlign: "right", fontWeight: 600 }}>{
                                        // compute total quantity for this location if available
                                        (() => {
                                            const summary = locationItemsMap[getLocationId(r)];
                                            if (!summary || summary === "—" || summary === "...") return "—";
                                            // summary like 'CODE(qty), ...' -> sum the numbers
                                            try {
                                                return summary.split(",").reduce((s, part) => {
                                                    const m = part.match(/\(([-0-9]+)\)/);
                                                    return s + (m ? Number(m[1]) : 0);
                                                }, 0);
                                            } catch { return "—"; }
                                        })()
                                    }</td> */}
                                    <td className="sp-td-action" onClick={(e) => e.stopPropagation()}>
                                        <button className="sp-edit-btn" title="Chỉnh sửa" onClick={() => navigate(`/locations/${getLocationId(r)}`)}>
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
                </div>

                {/* ── PAGINATION ── */}
                <div className="sp-pagination">
                    <span className="sp-rows-label">Rows per page</span>
                    <select
                        className="sp-rows-select"
                        value={rowsPerPage}
                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                    >
                        {ROWS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span className="sp-rows-info">of {totalRows} rows</span>
                    <div className="sp-page-btns">
                        <button className="sp-page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                        <button className="sp-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                        {getPages().map((p, i) =>
                            p === "…" ? (
                                <span key={`ellipsis-${i}`} className="sp-page-ellipsis">…</span>
                            ) : (
                                <button
                                    key={p}
                                    className={`sp-page-btn${p === page ? " sp-page-active" : ""}`}
                                    onClick={() => setPage(p)}
                                >{p}</button>
                            )
                        )}
                        <button className="sp-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                        <button className="sp-page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
