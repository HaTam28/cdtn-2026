import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./issues.css";
import { getAllIssues } from "../../api/issueApi";
import TopbarRight from "../../components/TopbarRight";
import { COPY_SELECT_ONE } from "../../utils/messages";
import notify from "../../utils/notify";
import { useDraft, formatDraftTime } from "../../utils/useDraft";

const ISSUE_DRAFT_KEY = "draft_issue_create";

const STATUS_LABELS = {
    DRAFT: "Nháp",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
    REJECTED: "Bị từ chối",
};
const STATUS_BADGE = {
    DRAFT: "rc-badge rc-badge-draft",
    CONFIRMED: "rc-badge rc-badge-confirmed",
    CANCELLED: "rc-badge rc-badge-cancelled",
    REJECTED: "rc-badge rc-badge-rejected",
};
const TABS = ["Tất cả", "Chờ duyệt", "Đã duyệt", "Đã từ chối", "Nháp"];
const TAB_STATUS = { "Chờ duyệt": "DRAFT", "Đã duyệt": "CONFIRMED", "Đã từ chối": "REJECTED" };
const ROWS_OPTIONS = [10, 15, 20, 50];

function formatDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function formatMoney(n) {
    if (!n && n !== 0) return "";
    return Number(n).toLocaleString("vi-VN");
}
function calcTotal(details) {
    if (!details || details.length === 0) return 0;
    return details.reduce((s, d) => s + (d.amount || (d.quantity || 0) * (d.unitprice || 0)), 0);
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
function IconPrint() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
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

export default function IssuesPage() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF" || user?.role === "NV";
    const userId = user?.id ?? user?.userId;
    const userCode = user?.usercode || user?.username || user?.userCode;
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("Tất cả");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [selected, setSelected] = useState(new Set());
    const navigate = useNavigate();

    const { hasDraft, draftSavedAt, loadDraft, clearDraft } = useDraft(ISSUE_DRAFT_KEY);

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllIssues();
            setIssues(data);
        } catch {
            setError("Không thể tải danh sách phiếu xuất kho.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchIssues(); }, [fetchIssues]);

    const filtered = useMemo(() => {
        let list = issues;
        if (isStaff) {
            list = list.filter((r) => {
                const createdById = r?.createdById ?? r?.createdByUserId ?? r?.userId ?? r?.staffId ?? r?.employeeId ?? r?.createdBy;
                const createdByObjId = r?.createdBy?.id ?? r?.createdBy?.userId ?? r?.createdBy?.employeeId;
                if (userId && (String(createdById) === String(userId) || String(createdByObjId) === String(userId))) return true;

                // match on username / usercode
                if (userCode) {
                    const createdByCode = r?.createdByUsername ?? r?.createdByUsercode ?? r?.createdByUserCode ?? r?.createdBy?.username ?? r?.createdBy?.usercode;
                    if (createdByCode && String(createdByCode) === String(userCode)) return true;
                }

                // match on fullname/name in case backend normalizes actor fields after confirmation
                const fullname = user?.fullname || user?.fullName || user?.name || user?.displayName;
                const createdByName = r?.createdByFullname ?? r?.createdByName ?? r?.createdBy?.fullname ?? r?.createdBy?.name;
                if (fullname && createdByName && String(createdByName) === String(fullname)) return true;

                return false;
            });
        }
        if (activeTab !== "Tất cả") {
            const st = TAB_STATUS[activeTab];
            list = list.filter((r) => r.docstatus === st);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (r) =>
                    (r.docno || "").toLowerCase().includes(q) ||
                    (r.customerName || "").toLowerCase().includes(q) ||
                    (r.description || "").toLowerCase().includes(q)
            );
        }
        return list;
    }, [issues, activeTab, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const safeP = Math.min(page, totalPages);
    const pageData = filtered.slice((safeP - 1) * rowsPerPage, safeP * rowsPerPage);

    const allChecked = pageData.length > 0 && pageData.every((r) => selected.has(r.id));
    const someChecked = pageData.some((r) => selected.has(r.id)) && !allChecked;
    const toggleAll = (checked) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) pageData.forEach((r) => next.add(r.id));
            else pageData.forEach((r) => next.delete(r.id));
            return next;
        });
    };
    const toggleOne = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleClone = () => {
        if (selected.size !== 1) {
            notify(COPY_SELECT_ONE, { type: 'warning' });
            return;
        }
        const id = Array.from(selected)[0];
        const item = issues.find((r) => r.id === id);
        if (!item) return;
        navigate("/issues/create", { state: { clone: item } });
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
                        Chứng từ &rsaquo; <span className="sp-breadcrumb-active">Phiếu xuất kho</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Phiếu xuất kho</h1>

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
                            placeholder="Search"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="sp-toolbar-spacer" />
                    <button className="sp-btn-primary" onClick={() => navigate("/issues/create")}>
                        <IconPlus /> Thêm mới
                    </button>
                    <button className="rc-btn-template" onClick={handleClone}><IconDoc /> Thêm bản sao mới</button>
                </div>

                {/* Tabs */}
                <div className="rc-tabs">
                    {TABS.map((tab) => (
                        <div
                            key={tab}
                            className={`rc-tab${activeTab === tab ? " rc-tab-active" : ""}${tab === "Nháp" ? " rc-tab-draft-local" : ""}`}
                            onClick={() => { setActiveTab(tab); setPage(1); }}
                        >
                            {tab === "Nháp" && hasDraft && (
                                <span className="rc-tab-draft-dot" />
                            )}
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
                                    <input type="checkbox" checked={allChecked}
                                        ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                        onChange={(e) => toggleAll(e.target.checked)} />
                                </th>
                                <th>Số phiếu <IconSort /></th>
                                <th>Ngày <IconSort /></th>
                                <th>Khách hàng <IconSort /></th>
                                <th style={{ width: 120, textAlign: "right" }}>Tổng tiền <IconSort /></th>
                                <th style={{ width: 160 }}>Người lập <IconSort /></th>
                                <th>Trạng thái <IconSort /></th>
                                <th className="sp-th-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* ── Tab Nháp (Khi không có nháp nào) ── */}
                            {activeTab === "Nháp" && !hasDraft && (
                                <tr><td colSpan={8} className="sp-status-row">
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0" }}>
                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c6dfd0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                        <span style={{ color: "#8ba392" }}>Chưa có nháp nào được lưu.</span>
                                        <button className="sp-btn-primary" style={{ marginTop: 4 }} onClick={() => navigate("/issues/create")}>
                                            Tạo phiếu xuất kho mới
                                        </button>
                                    </div>
                                </td></tr>
                            )}

                            {/* ── Hàng Nháp local hiển thị ở cả tab Nháp và tab Tất cả ── */}
                            {(activeTab === "Nháp" || activeTab === "Tất cả") && hasDraft && (() => {
                                const draft = loadDraft();
                                const draftForm = draft?.form || {};
                                const draftRows = draft?.rows || [];
                                const itemCount = draftRows.filter((r) => r.itemId).length;
                                return (
                                    <tr className="rc-draft-local-row">
                                        <td className="sp-td-cb" />
                                        <td className="sp-td-id" style={{ color: "#a16207" }}>
                                            <span style={{ fontStyle: "italic", opacity: 0.7 }}>(Chưa có số)</span>
                                        </td>
                                        <td>{draftForm.date ? draftForm.date.split("-").reverse().join("/") : "—"}</td>
                                        <td>{draftForm.customerId ? `ID: ${draftForm.customerId}` : "—"}</td>
                                        <td style={{ textAlign: "right" }}>—</td>
                                        <td style={{ color: "#8ba392", fontSize: "0.82rem" }}>
                                            {draftSavedAt ? formatDraftTime(draftSavedAt) : ""}
                                        </td>
                                        <td>
                                            <span className="rc-badge rc-badge-local-draft">⬥ Nháp</span>
                                            {itemCount > 0 && <div style={{ fontSize: "0.78rem", color: "#a16207", marginTop: 3 }}>{itemCount} mặt hàng</div>}
                                        </td>
                                        <td className="sp-td-action">
                                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                                <button className="sp-edit-btn" title="Tiếp tục nháp" style={{ color: "#a16207" }} onClick={() => navigate("/issues/create", { state: { resumeDraft: true } })}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="sp-edit-btn" title="Xóa nháp" style={{ color: "#b91c1c" }} onClick={() => { clearDraft(); notify("Đã xóa nháp.", { type: "success" }); }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })()}

                            {/* ── Danh sách phiếu thực ── */}
                            {activeTab !== "Nháp" && loading && (
                                <tr><td colSpan={8} className="sp-status-row">Đang tải dữ liệu...</td></tr>
                            )}
                            {activeTab !== "Nháp" && !loading && error && (
                                <tr><td colSpan={8} className="sp-status-row sp-status-error">{error}</td></tr>
                            )}
                            {activeTab !== "Nháp" && !loading && !error && pageData.length === 0 && (
                                <tr><td colSpan={8} className="sp-status-row">Không có phiếu xuất kho nào.</td></tr>
                            )}
                            {activeTab !== "Nháp" && !loading && !error && pageData.map((r) => (
                                <tr
                                    key={r.id}
                                    className={`sp-row-clickable${r.docstatus === "DRAFT" ? " rc-row-draft" : ""}${selected.has(r.id) ? " sp-row-selected" : ""}`}
                                    onClick={() => navigate(`/issues/${r.id}`)}
                                >
                                    <td className="sp-td-cb" onClick={(e) => { e.stopPropagation(); toggleOne(r.id); }}>
                                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} onClick={(e) => e.stopPropagation()} />
                                    </td>
                                    <td className="sp-td-id">{r.docno}</td>
                                    <td>{formatDate(r.docDate)}</td>
                                    <td>{r.customerName || "-"}</td>
                                    <td className="rc-td-num" style={{ width: 120, textAlign: "right" }}>
                                        {calcTotal(r.details) ? formatMoney(calcTotal(r.details)) : "-"}
                                    </td>
                                    <td style={{ width: 160 }}>{r.createdByFullname || r.createdByName || "-"}</td>
                                    <td>
                                        <span className={STATUS_BADGE[r.docstatus] || "rc-badge"}>
                                            {STATUS_LABELS[r.docstatus] || r.docstatus}
                                        </span>
                                        {r.docstatus === "REJECTED" && r.rejectReason && (
                                            <div style={{ fontSize: "0.78rem", color: "#bf360c", marginTop: 3, maxWidth: 200, whiteSpace: "normal" }}>
                                                Lý do: {r.rejectReason}
                                            </div>
                                        )}
                                    </td>
                                    <td className="sp-td-action" onClick={(e) => { e.stopPropagation(); navigate(`/issues/${r.id}`); }}>
                                        <button className="sp-edit-btn" title="Xem chi tiết"><IconEye /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

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
    );
}
