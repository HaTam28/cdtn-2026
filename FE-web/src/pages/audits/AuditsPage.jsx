import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { getAllAudits, getAssignedAuditsPending, getAssignedAuditsDone } from "../../api/auditApi";
import TopbarRight from "../../components/TopbarRight";

const STATUS_LABELS = {
    DRAFT: "Nháp",
    REQUESTED: "Chờ kiểm kê",
    IN_PROGRESS: "Đang kiểm kê",
    SUBMITTED: "Chờ duyệt",
    PENDING_PROCESS: "Chờ xử lý",
    PROCESSED: "Đã xử lý",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
    REJECTED: "Đã từ chối",
};
const STATUS_BADGE = {
    DRAFT: "rc-badge au-badge-draft",
    REQUESTED: "rc-badge au-badge-requested",
    IN_PROGRESS: "rc-badge au-badge-in-progress",
    SUBMITTED: "rc-badge au-badge-submitted",
    PENDING_PROCESS: "rc-badge au-badge-pending-process",
    PROCESSED: "rc-badge au-badge-processed",
    CONFIRMED: "rc-badge au-badge-confirmed",
    CANCELLED: "rc-badge au-badge-cancelled",
    REJECTED: "rc-badge au-badge-rejected",
};
const TABS = ["Tất cả", "Nháp", "Chờ kiểm kê", "Đang kiểm kê", "Chờ duyệt", "Chờ xử lý", "Đã xử lý", "Đã xác nhận", "Đã hủy", "Đã từ chối"];
const STAFF_TABS = ["Tất cả", "Chờ kiểm kê", "Đang kiểm kê", "Chờ duyệt", "Chờ xử lý", "Đã xử lý", "Đã xác nhận", "Đã hủy", "Đã từ chối"];
const TAB_STATUS = { "Nháp": "DRAFT", "Chờ kiểm kê": "REQUESTED", "Đang kiểm kê": "IN_PROGRESS", "Chờ duyệt": "SUBMITTED", "Chờ xử lý": "PENDING_PROCESS", "Đã xử lý": "PROCESSED", "Đã xác nhận": "CONFIRMED", "Đã hủy": "CANCELLED", "Đã từ chối": "REJECTED" };
const ROWS_OPTIONS = [10, 15, 20, 50];

function formatDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function IconPlus() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
function IconEye() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}
function IconSort() {
    return (
        <svg width="11" height="11" viewBox="0 0 12 14" fill="none" style={{ marginLeft: 4, verticalAlign: "middle", opacity: 0.65 }}>
            <path d="M4 5.5L6 3L8 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 8.5L6 11L8 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function IconDoc() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
    );
}

export default function AuditsPage() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF";
    const isManager = user?.role && user.role !== "STAFF";
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("Tất cả");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [selected, setSelected] = useState(new Set());
    const navigate = useNavigate();

    const fetchAudits = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isStaff) {
                const [pending, done] = await Promise.all([
                    getAssignedAuditsPending(),
                    getAssignedAuditsDone(),
                ]);
                const map = new Map();
                [...(pending || []), ...(done || [])].forEach((item) => {
                    if (item?.id != null) map.set(item.id, item);
                });
                setAudits(Array.from(map.values()));
            } else {
                const data = await getAllAudits();
                setAudits(data);
            }
        } catch {
            setError(isStaff ? "Không thể tải danh sách yêu cầu kiểm kê." : "Không thể tải danh sách phiếu kiểm kê.");
        } finally {
            setLoading(false);
        }
    }, [isStaff]);

    useEffect(() => { fetchAudits(); }, [fetchAudits]);

    const filtered = useMemo(() => {
        let list = audits;
        if (activeTab !== "Tất cả") {
            const st = TAB_STATUS[activeTab];
            list = list.filter((r) => r.docstatus === st);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (r) =>
                    (r.docno || "").toLowerCase().includes(q) ||
                    (r.description || "").toLowerCase().includes(q)
            );
        }
        return list;
    }, [audits, activeTab, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const safeP = Math.min(page, totalPages);
    const pageData = filtered.slice((safeP - 1) * rowsPerPage, safeP * rowsPerPage);

    const allChecked = pageData.length > 0 && pageData.every((r) => selected.has(r.id));
    const toggleAll = () => {
        const next = new Set(selected);
        if (allChecked) pageData.forEach((r) => next.delete(r.id));
        else pageData.forEach((r) => next.add(r.id));
        setSelected(next);
    };
    const toggleOne = (id) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelected(next);
    };

    const pages = useMemo(() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (safeP <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
        if (safeP >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, "...", safeP - 1, safeP, safeP + 1, "...", totalPages];
    }, [totalPages, safeP]);

    return (
        <div className="sp-main">
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Chứng từ &rsaquo; <span className="sp-breadcrumb-active">Kiểm kê hàng tồn kho</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Kiểm kê hàng tồn kho</h1>

                {/* Toolbar */}
                <div className="sp-toolbar">
                    <div className="sp-search-wrap">
                        <span className="sp-search-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            className="sp-search"
                            placeholder={isStaff ? "Tìm số phiếu, diễn giải..." : "Tìm số phiếu, vị trí, diễn giải..."}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="sp-toolbar-spacer" />
                    {isManager && (
                        <button className="sp-btn-primary" onClick={() => navigate("/audits/create")}>
                            <IconPlus /> Thêm mới
                        </button>
                    )}
                    <button className="rc-btn-template"><IconDoc /> Thêm bản sao mới</button>
                </div>

                {/* Tabs */}
                <div className="rc-tabs">
                    {(isStaff ? STAFF_TABS : TABS).map((tab) => (
                        <div
                            key={tab}
                            className={`rc-tab${activeTab === tab ? " rc-tab-active" : ""}`}
                            onClick={() => { setActiveTab(tab); setPage(1); }}
                        >
                            {tab}
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="sp-table-wrap sp-scrollable">
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th className="sp-th-cb">
                                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                                </th>
                                <th >Số phiếu <IconSort /></th>
                                <th>Ngày kiểm kê <IconSort /></th>
                                {/* <th style={{ textAlign: "center" }}>Số mặt hàng</th>
                                <th>Diễn giải</th> */}
                                <th style={{ width: "15%" }}>Người lập <IconSort /></th>
                                <th style={{ width: "15%" }}>Người duyệt <IconSort /></th>
                                <th style={{ width: "15%" }}>Trạng thái <IconSort /></th>
                                <th className="sp-th-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={7} className="sp-status-row">Đang tải dữ liệu...</td></tr>
                            )}
                            {!loading && error && (
                                <tr><td colSpan={7} className="sp-status-row sp-status-error">{error}</td></tr>
                            )}
                            {!loading && !error && pageData.length === 0 && (
                                <tr><td colSpan={7} className="sp-status-row">{isStaff ? "Không có yêu cầu kiểm kê nào." : "Không có phiếu kiểm kê nào."}</td></tr>
                            )}
                            {!loading && !error && pageData.map((r) => (
                                <tr
                                    key={r.id}
                                    className={`sp-row-clickable${selected.has(r.id) ? " sp-row-selected" : ""}`}
                                    onClick={() => navigate(isStaff ? `/audits/requests?id=${r.id}` : `/audits/${r.id}`)}
                                >
                                    <td className="sp-td-cb" onClick={(e) => { e.stopPropagation(); toggleOne(r.id); }}>
                                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => { }} />
                                    </td>
                                    <td className="sp-td-id">{r.docno}</td>
                                    <td>{formatDate(r.docDate)}</td>
                                    {/* <td style={{ textAlign: "center", fontWeight: 600, color: "#1E3A2F" }}>
                                        {r.details ? r.details.length : "—"}
                                    </td> */}
                                    {/* <td style={{ color: "#4c6152", fontSize: "0.88rem" }}>{r.description || "—"}</td> */}
                                    <td style={{ width: 160 }}>{r.createdByFullname || r.createdByName || "—"}</td>
                                    <td style={{ width: 160 }}>{r.approverFullname || r.approverUsername || "—"}</td>
                                    <td>
                                        <span className={STATUS_BADGE[r.docstatus] || "rc-badge"}>
                                            {STATUS_LABELS[r.docstatus] || r.docstatus}
                                        </span>
                                    </td>
                                    <td className="sp-td-action" onClick={(e) => { e.stopPropagation(); navigate(isStaff ? `/audits/requests?id=${r.id}` : `/audits/${r.id}`); }}>
                                        <button className="sp-edit-btn" title="Xem chi tiết"><IconEye /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="sp-pagination">
                        <div className="sp-rows-info">
                            <span>Rows per page</span>
                            <select
                                className="sp-rows-select"
                                value={rowsPerPage}
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                            >
                                {ROWS_OPTIONS.map((n) => <option key={n}>{n}</option>)}
                            </select>
                            <span className="sp-total-label">of {filtered.length} rows</span>
                        </div>
                        <button className="sp-page-btn" onClick={() => setPage(1)} disabled={safeP === 1}>«</button>
                        <button className="sp-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safeP === 1}>‹</button>
                        {pages.map((p, i) =>
                            p === "..." ? (
                                <span key={i} className="sp-page-ellipsis">...</span>
                            ) : (
                                <button
                                    key={p}
                                    className={`sp-page-btn${safeP === p ? " sp-page-active" : ""}`}
                                    onClick={() => setPage(p)}
                                >{p}</button>
                            )
                        )}
                        <button className="sp-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safeP === totalPages}>›</button>
                        <button className="sp-page-btn" onClick={() => setPage(totalPages)} disabled={safeP === totalPages}>»</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
