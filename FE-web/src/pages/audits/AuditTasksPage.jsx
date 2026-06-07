import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { getAssignedAudits, getAuditById, updateAssignedAudit, submitAudit } from "../../api/auditApi";
import TopbarRight from "../../components/TopbarRight";
import notify from "../../utils/notify";
import {
    AUDIT_STATUS_BADGE,
    AUDIT_STATUS_LABELS,
    auditDetailPayload,
    formatDisplayDate,
    formatNumber,
    getAuditEndDate,
    getAuditStartDate,
    getAuditWorkflowStatus,
    normalizeAuditDetails,
    toNumber,
} from "./auditRowUtils";

const STATUS_FILTERS = ["ALL", "REQUESTED", "IN_PROGRESS", "SUBMITTED", "PENDING_PROCESS", "CONFIRMED", "PROCESSED", "OVERDUE", "REJECTED"];

function DiffCell({ diff }) {
    if (diff === null || diff === undefined) return <td className="rc-td-num">—</td>;
    if (diff > 0) return <td className="rc-td-num au-td-plus"><span className="au-diff-plus">+{formatNumber(diff)}</span></td>;
    if (diff < 0) return <td className="rc-td-num au-td-minus"><span className="au-diff-minus">{formatNumber(diff)}</span></td>;
    return <td className="rc-td-num"><span className="au-diff-zero">0</span></td>;
}

export default function AuditTasksPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF" || user?.role === "NV";
    const queryId = new URLSearchParams(location.search).get("id");

    const [audits, setAudits] = useState([]);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [active, setActive] = useState(null);
    const [activeLoading, setActiveLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isStaff) navigate("/audits");
    }, [isStaff, navigate]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setAudits(await getAssignedAudits());
        } catch {
            setError("Không thể tải danh sách yêu cầu kiểm kê.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);

    const handleOpen = useCallback(async (auditId) => {
        setActiveLoading(true);
        try {
            const data = await getAuditById(auditId);
            setActive({ ...data, details: normalizeAuditDetails(data.details) });
        } catch {
            notify("Không thể tải chi tiết phiếu kiểm kê.", { type: "error" });
        } finally {
            setActiveLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!queryId) {
            setActive(null);
            return;
        }
        handleOpen(Number(queryId));
    }, [queryId, handleOpen]);

    const statusCounts = useMemo(() => {
        const counts = { ALL: audits.length };
        STATUS_FILTERS.forEach((s) => { if (s !== "ALL") counts[s] = 0; });
        audits.forEach((a) => {
            const st = getAuditWorkflowStatus(a);
            if (st) counts[st] = (counts[st] || 0) + 1;
        });
        return counts;
    }, [audits]);

    const visibleStatusFilters = useMemo(() => STATUS_FILTERS, []);

    useEffect(() => {
        if (!visibleStatusFilters.includes(statusFilter)) {
            setStatusFilter("ALL");
        }
    }, [statusFilter, visibleStatusFilters]);

    const filteredAudits = useMemo(() => {
        if (statusFilter === "ALL") return audits;
        return audits.filter((a) => getAuditWorkflowStatus(a) === statusFilter);
    }, [audits, statusFilter]);

    const totals = useMemo(() => {
        return (active?.details || []).reduce((acc, row) => {
            const book = toNumber(row.bookquantity);
            const actual = row.actualquantity === "" || row.actualquantity === null || row.actualquantity === undefined
                ? null
                : toNumber(row.actualquantity);
            acc.book += book;
            if (actual !== null) acc.actual += actual;
            acc.diff += actual === null ? 0 : actual - book;
            return acc;
        }, { book: 0, actual: 0, diff: 0 });
    }, [active]);

    const canEdit = active && ["REQUESTED", "IN_PROGRESS"].includes(active.docstatus);

    const updateActual = (idx, value) => {
        if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
            notify("SL thực tế phải là số hợp lệ và không được âm.", { type: "warning" });
            return;
        }
        setActive((prev) => {
            if (!prev) return prev;
            const details = [...prev.details];
            details[idx] = { ...details[idx], actualquantity: value };
            return { ...prev, details };
        });
    };

    const buildSaveBody = (includeActual) => ({
        details: active.details.map((row) => auditDetailPayload(row, includeActual)),
    });

    const validateActuals = () => {
        for (let i = 0; i < active.details.length; i += 1) {
            const value = active.details[i].actualquantity;
            if (value === "" || value === null || value === undefined) {
                notify(`Dòng ${i + 1}: Vui lòng nhập SL thực tế.`, { type: "error" });
                return false;
            }
            if (!Number.isFinite(Number(value)) || Number(value) < 0) {
                notify(`Dòng ${i + 1}: SL thực tế phải là số hợp lệ và không được âm.`, { type: "error" });
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!active) return;
        setSaving(true);
        try {
            const res = await updateAssignedAudit(active.id, buildSaveBody(true));
            if (res?.success) {
                notify("Đã lưu số liệu kiểm kê.", { type: "success" });
                await handleOpen(active.id);
            } else {
                notify(res?.message || "Lưu thất bại.", { type: "error" });
            }
        } catch (err) {
            notify(err?.response?.data?.message || "Có lỗi xảy ra khi lưu.", { type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!active || !validateActuals()) return;
        setSubmitting(true);
        try {
            await updateAssignedAudit(active.id, buildSaveBody(true));
            const res = await submitAudit(active.id);
            if (res?.success) {
                notify("Đã gửi kết quả kiểm kê cho quản lý.", { type: "success" });
                await fetchList();
                setActive(null);
                navigate("/audits");
            } else {
                notify(res?.message || "Gửi thất bại.", { type: "error" });
            }
        } catch (err) {
            notify(err?.response?.data?.message || "Có lỗi xảy ra khi gửi.", { type: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="sp-main">
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Chứng từ &rsaquo;{" "}
                        <span className="sp-breadcrumb-link" onClick={() => navigate("/audits")}>Kiểm kê hàng tồn kho</span>
                        {" "}&rsaquo;{" "}
                        <span className="sp-breadcrumb-active">Yêu cầu kiểm kê</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Yêu cầu kiểm kê</h1>

                {!queryId && (
                    <div className="rc-form-card">
                        <div className="au-status-bar">
                            {visibleStatusFilters.map((status) => (
                                <button
                                    key={status}
                                    className={`au-status-chip${statusFilter === status ? " au-status-chip-active" : ""}`}
                                    onClick={() => setStatusFilter(status)}
                                    type="button"
                                >
                                    {status === "ALL" ? "Tất cả" : AUDIT_STATUS_LABELS[status] || status}
                                    <span className="au-status-count">{statusCounts[status] || 0}</span>
                                </button>
                            ))}
                        </div>
                        {loading && <div className="sp-status-row">Đang tải...</div>}
                        {!loading && error && <div className="sp-status-row sp-status-error">{error}</div>}
                        {!loading && !error && filteredAudits.map((audit) => {
                            const displayStatus = getAuditWorkflowStatus(audit);
                            return (
                                <div
                                    key={audit.id}
                                    className="au-request-row"
                                    onClick={() => navigate(`/audits/requests?id=${audit.id}`)}
                                >
                                    <strong>{audit.docno}</strong>
                                    <span>{formatDisplayDate(getAuditStartDate(audit))} - {formatDisplayDate(getAuditEndDate(audit))}</span>
                                    <span className={AUDIT_STATUS_BADGE[displayStatus] || "rc-badge"}>
                                        {AUDIT_STATUS_LABELS[displayStatus] || displayStatus}
                                    </span>
                                </div>
                            );
                        })}
                        {!loading && !error && filteredAudits.length === 0 && (
                            <div className="sp-status-row">Không có yêu cầu kiểm kê nào.</div>
                        )}
                    </div>
                )}

                {activeLoading && <div style={{ textAlign: "center", color: "#4c6152", padding: "24px 0" }}>Đang tải chi tiết phiếu...</div>}

                {!activeLoading && active && (
                    <div className="rc-form-card" style={{ marginTop: 16 }}>
                        <div className="rc-header-row au-header-wrap">
                            <label className="rc-form-label">Số phiếu</label>
                            <input className="rc-form-input" style={{ minWidth: 170 }} value={active.docno || ""} readOnly />
                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày bắt đầu</label>
                            <input className="rc-form-input" style={{ minWidth: 150 }} value={formatDisplayDate(getAuditStartDate(active))} readOnly />
                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày kết thúc</label>
                            <input className="rc-form-input" style={{ minWidth: 150 }} value={formatDisplayDate(getAuditEndDate(active))} readOnly />
                            <span style={{ marginLeft: "auto" }}>
                                {(() => {
                                    const displayStatus = getAuditWorkflowStatus(active);
                                    return (
                                        <span className={AUDIT_STATUS_BADGE[displayStatus] || "rc-badge"}>
                                            {AUDIT_STATUS_LABELS[displayStatus] || displayStatus}
                                        </span>
                                    );
                                })()}
                            </span>
                        </div>

                        {active.description && (
                            <div className="rc-form-row">
                                <label className="rc-form-label">Diễn giải</label>
                                <input className="rc-form-input rc-form-full" value={active.description} readOnly />
                            </div>
                        )}

                        <div className="rc-detail-table-wrap">
                            <table className="rc-detail-table" style={{ width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: "4%" }}>STT</th>
                                        <th style={{ width: "9%" }}>Mã vật tư</th>
                                        <th style={{ width: "18%" }}>Tên vật tư</th>
                                        <th style={{ width: "6%" }}>ĐVT</th>
                                        <th style={{ width: "12%" }}>Vị trí</th>
                                        <th style={{ width: "11%" }}>Mã lô</th>
                                        <th style={{ width: "10%", textAlign: "right" }}>SL hệ thống</th>
                                        <th style={{ width: "10%", textAlign: "right" }}>SL thực tế</th>
                                        <th style={{ width: "10%", textAlign: "right" }}>Chênh lệch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {active.details.map((row, idx) => {
                                        const actual = row.actualquantity === "" || row.actualquantity === null || row.actualquantity === undefined
                                            ? null
                                            : toNumber(row.actualquantity);
                                        const diff = actual === null ? null : actual - toNumber(row.bookquantity);
                                        return (
                                            <tr key={row._id || idx}>
                                                <td className="rc-td-stt">{idx + 1}</td>
                                                <td style={{ fontWeight: 600, color: "#1E854A" }}>{row.itemcode}</td>
                                                <td>{row.itemname}</td>
                                                <td>{row.unitof || "—"}</td>
                                                <td>{row.locationcode || row.locationname || "—"}</td>
                                                <td>{row.batchCode || "—"}</td>
                                                <td className="rc-td-num au-book-qty">{formatNumber(row.bookquantity)}</td>
                                                <td>
                                                    <input
                                                        className="rc-td-input rc-td-num"
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={row.actualquantity ?? ""}
                                                        onChange={(e) => updateActual(idx, e.target.value)}
                                                        disabled={!canEdit}
                                                        style={{ width: "90%" }}
                                                    />
                                                </td>
                                                <DiffCell diff={diff} />
                                            </tr>
                                        );
                                    })}
                                    {active.details.length === 0 && (
                                        <tr><td colSpan={9} className="sp-status-row">Không có dữ liệu.</td></tr>
                                    )}
                                    {active.details.length > 0 && (
                                        <tr className="au-total-row">
                                            <td colSpan={6}>Tổng cộng</td>
                                            <td className="rc-td-num">{formatNumber(totals.book)}</td>
                                            <td className="rc-td-num">{formatNumber(totals.actual)}</td>
                                            <td className="rc-td-num">{totals.diff > 0 ? `+${formatNumber(totals.diff)}` : formatNumber(totals.diff)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="rc-form-actions">
                            <button className="sp-btn-outline" onClick={() => navigate("/audits")}>Đóng</button>
                            {canEdit && (
                                <>
                                    <button className="sp-btn-outline" onClick={handleSave} disabled={saving || submitting}>
                                        {saving ? "Đang lưu..." : "Lưu nháp"}
                                    </button>
                                    <button className="sp-btn-primary" onClick={handleSubmit} disabled={saving || submitting}>
                                        {submitting ? "Đang gửi..." : "Gửi kết quả"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
