import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { getAuditById, confirmAudit, cancelAudit, rejectAudit, requestAudit } from "../../api/auditApi";
import TopbarRight from "../../components/TopbarRight";
import notify from "../../utils/notify";
import {
    AUDIT_STATUS_LABELS,
    AUDIT_STATUS_PILL,
    formatDisplayDate,
    formatNumber,
    getAuditEndDate,
    getAuditStartDate,
    getAuditWorkflowStatus,
    getSuggestion,
    normalizeAuditDetails,
    toNumber,
    isAdjustmentProcessed,
} from "./auditRowUtils";

function DiffCell({ diff }) {
    if (diff === null || diff === undefined) return <td className="rc-td-num">—</td>;
    if (diff > 0) return <td className="rc-td-num au-td-plus"><span className="au-diff-plus">+{formatNumber(diff)}</span></td>;
    if (diff < 0) return <td className="rc-td-num au-td-minus"><span className="au-diff-minus">{formatNumber(diff)}</span></td>;
    return <td className="rc-td-num"><span className="au-diff-zero">0</span></td>;
}

function SuggestionBadge({ diff }) {
    const suggestion = getSuggestion(diff);
    const cls = diff > 0 ? "au-suggestion-plus" : diff < 0 ? "au-suggestion-minus" : "au-suggestion-zero";
    return <span className={`au-suggestion ${cls}`}>{suggestion}</span>;
}

const APPROVED_STATUSES = new Set(["CONFIRMED", "PROCESSED"]);

function getAuditApproverName(audit) {
    if (!audit) return "—";
    const status = audit.docstatus;
    const actor = audit.approverFullname || audit.approverUsername || audit.actionByFullname || audit.actionByUsername;
    if (["APPROVED", "CONFIRMED", "PROCESSED"].includes(status)) return actor || "—";
    if (status === "REJECTED") return actor || audit.modifiedBy || "—";
    return "—";
}

export default function AuditDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF" || user?.role === "NV";

    const [audit, setAudit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const fetchAudit = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAuditById(id);
            setAudit({ ...data, details: normalizeAuditDetails(data.details) });
        } catch {
            setError("Không thể tải chi tiết phiếu kiểm kê.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchAudit(); }, [fetchAudit]);

    const totals = useMemo(() => {
        return (audit?.details || []).reduce((acc, row) => {
            const book = toNumber(row.bookquantity);
            const actual = row.actualquantity === "" || row.actualquantity === null || row.actualquantity === undefined
                ? null
                : toNumber(row.actualquantity);
            const diff = row.diffquantity ?? (actual === null ? null : actual - book);
            acc.book += book;
            if (actual !== null) acc.actual += actual;
            acc.diff += diff === null ? 0 : toNumber(diff);
            return acc;
        }, { book: 0, actual: 0, diff: 0 });
    }, [audit]);

    const detailRows = useMemo(() => (audit?.details || []).map((row) => {
        const actual = row.actualquantity === "" || row.actualquantity === null || row.actualquantity === undefined
            ? null
            : toNumber(row.actualquantity);
        const diff = row.diffquantity ?? (actual === null ? null : actual - toNumber(row.bookquantity));
        return { ...row, _actualForDisplay: actual, _diffForDisplay: diff };
    }), [audit]);

    const canCreateAdjustment = !isStaff && APPROVED_STATUSES.has(audit?.docstatus);
    const diffRows = useMemo(() => detailRows.filter((row) => toNumber(row._diffForDisplay, 0) !== 0), [detailRows]);
    const processedCount = useMemo(() => diffRows.filter((row) => isAdjustmentProcessed(id, { ...row, diffquantity: row._diffForDisplay })).length, [diffRows, id]);
    const adjustmentSummary = useMemo(() => {
        if (diffRows.length === 0) return { label: "Không có chênh lệch", tone: "plus" };
        if (processedCount === 0) return { label: "Chưa xử lý", tone: "minus" };
        if (processedCount === diffRows.length) return { label: "Đã xử lý chênh lệch", tone: "plus" };
        return { label: "Còn tồn đọng", tone: "minus" };
    }, [diffRows, processedCount]);
    const showSuggestionColumn = diffRows.some((row) => !isAdjustmentProcessed(id, { ...row, diffquantity: row._diffForDisplay }));

    const canRequest = !isStaff && audit?.docstatus === "DRAFT";
    const canConfirm = !isStaff && ["SUBMITTED", "PENDING_PROCESS"].includes(audit?.docstatus);
    const canReject = !isStaff && ["SUBMITTED", "PENDING_PROCESS"].includes(audit?.docstatus);
    const canCancel = !isStaff && audit?.docstatus === "DRAFT";

    const handleConfirm = async () => {
        setActionLoading(true);
        try {
            const res = await confirmAudit(id);
            if (res?.success) {
                notify("Xác nhận kiểm kê thành công.", { type: "success" });
                await fetchAudit();
            } else {
                notify(res?.message || "Xác nhận thất bại.", { type: "error" });
            }
        } catch (err) {
            notify(err?.response?.data?.message || "Có lỗi xảy ra.", { type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendRequest = async () => {
        setActionLoading(true);
        try {
            const res = await requestAudit(id);
            if (res?.success) {
                notify("Đã gửi yêu cầu kiểm kê cho nhân viên.", { type: "success" });
                await fetchAudit();
            } else {
                notify(res?.message || "Gửi yêu cầu thất bại.", { type: "error" });
            }
        } catch (err) {
            notify(err?.response?.data?.message || "Có lỗi xảy ra khi gửi yêu cầu.", { type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        setActionLoading(true);
        try {
            const res = await cancelAudit(id);
            if (res?.success) {
                notify("Đã hủy phiếu kiểm kê.", { type: "success" });
                await fetchAudit();
            } else {
                notify(res?.message || "Hủy thất bại.", { type: "error" });
            }
        } catch (err) {
            notify(err?.response?.data?.message || "Có lỗi xảy ra.", { type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            notify("Vui lòng nhập lý do từ chối.", { type: "error" });
            return;
        }
        setActionLoading(true);
        try {
            const res = await rejectAudit(id, rejectReason.trim());
            if (res?.success) {
                notify("Đã từ chối phiếu kiểm kê.", { type: "success" });
                setRejectReason("");
                setRejectModal(false);
                await fetchAudit();
            } else {
                notify(res?.message || "Từ chối thất bại.", { type: "error" });
            }
        } catch (err) {
            notify(err?.response?.data?.message || "Có lỗi xảy ra.", { type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const displayStatus = getAuditWorkflowStatus(audit, detailRows.map((row) => ({ ...row, diffquantity: row._diffForDisplay })));

    const openAdjustment = (row) => {
        const diff = toNumber(row._diffForDisplay, 0);
        if (!diff) return;
        if (isAdjustmentProcessed(id, { ...row, diffquantity: diff })) return;
        const type = diff > 0 ? "receipts" : "issues";
        const queryType = diff > 0 ? "receipt" : "issue";
        navigate(`/${type}/create?docType=ADJUSTMENT&auditId=${audit.id}&auditDetailId=${encodeURIComponent(row.id || "")}&adjustmentType=${queryType}`);
    };

    return (
        <>
            {rejectModal && (
                <div className="rc-modal-overlay" onClick={(e) => e.target === e.currentTarget && setRejectModal(false)}>
                    <div className="rc-modal" style={{ maxWidth: 460 }}>
                        <div className="rc-modal-header">
                            <span className="rc-modal-title">Từ chối phiếu kiểm kê</span>
                            <button className="rc-modal-close" onClick={() => setRejectModal(false)}>&times;</button>
                        </div>
                        <div className="rc-modal-body">
                            <textarea
                                className="rc-form-input"
                                style={{ width: "100%", minHeight: 90, resize: "vertical" }}
                                placeholder="Nhập lý do từ chối..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>
                        <div className="rc-modal-footer">
                            <button className="sp-btn-outline" onClick={() => setRejectModal(false)} disabled={actionLoading}>Hủy bỏ</button>
                            <button className="sp-btn-danger-outline" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                                {actionLoading ? "Đang xử lý..." : "Từ chối"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="sp-main">
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Chứng từ &rsaquo;{" "}
                            <span className="sp-breadcrumb-link" onClick={() => navigate("/audits")}>Kiểm kê hàng tồn kho</span>
                            {" "}&rsaquo;{" "}
                            <span className="sp-breadcrumb-active">Chi tiết phiếu kiểm kê</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                <div className="sp-content">
                    <h1 className="sp-title">Kiểm kê hàng tồn kho</h1>

                    {loading && <div className="sp-status-row">Đang tải...</div>}
                    {!loading && error && <div className="sp-status-row sp-status-error">{error}</div>}

                    {!loading && !error && audit && (
                        <div className="rc-form-card">
                            <div className="rc-header-row au-header-wrap">
                                <label className="rc-form-label">Ngày bắt đầu</label>
                                <input className="rc-form-input" style={{ minWidth: 150 }} value={formatDisplayDate(getAuditStartDate(audit))} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày kết thúc</label>
                                <input className="rc-form-input" style={{ minWidth: 150 }} value={formatDisplayDate(getAuditEndDate(audit))} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Số</label>
                                <input className="rc-form-input" style={{ minWidth: 180 }} value={audit.docno || ""} readOnly />
                                <span style={{ marginLeft: "auto" }}>
                                    <span className={AUDIT_STATUS_PILL[displayStatus] || "rc-status-pill"}>
                                        {AUDIT_STATUS_LABELS[displayStatus] || displayStatus}
                                    </span>
                                </span>
                            </div>

                            <div className="rc-form-row">
                                <label className="rc-form-label">Người lập</label>
                                <input className="rc-form-input" style={{ minWidth: 190 }} value={audit.createdByFullname || audit.createdByUsername || ""} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Nhân viên kiểm kê</label>
                                <input className="rc-form-input" style={{ minWidth: 190 }} value={audit.assignedToFullname || audit.assignedToUsername || audit.assignedUserFullname || audit.assignedUsername || ""} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Người duyệt</label>
                                <input className="rc-form-input" style={{ minWidth: 190 }} value={getAuditApproverName(audit)} readOnly />
                            </div>

                            {audit.description && (
                                <div className="rc-form-row">
                                    <label className="rc-form-label">Diễn giải</label>
                                    <input className="rc-form-input rc-form-full" value={audit.description} readOnly />
                                </div>
                            )}

                            {audit.docstatus === "REJECTED" && audit.rejectReason && (
                                <div className="rc-form-row">
                                    <label className="rc-form-label">Lý do từ chối</label>
                                    <input className="rc-form-input rc-form-full" value={audit.rejectReason} readOnly style={{ color: "#bf360c", borderColor: "#ffb74d", background: "#fff8f5" }} />
                                </div>
                            )}

                            <div className="au-summary-bar">
                                <div className="au-summary-item">
                                    <span className="au-summary-label">Tổng SL hệ thống</span>
                                    <span className="au-summary-value">{formatNumber(totals.book)}</span>
                                </div>
                                <div className="au-summary-item">
                                    <span className="au-summary-label">Tổng SL thực tế</span>
                                    <span className="au-summary-value">{formatNumber(totals.actual)}</span>
                                </div>
                                <div className="au-summary-item">
                                    <span className="au-summary-label">Tổng SL chênh lệch</span>
                                    <span className={`au-summary-value ${totals.diff > 0 ? "au-val-plus" : totals.diff < 0 ? "au-val-minus" : ""}`}>
                                        {totals.diff > 0 ? `+${formatNumber(totals.diff)}` : formatNumber(totals.diff)}
                                    </span>
                                </div>
                                {canCreateAdjustment && (
                                    <div className="au-summary-item">
                                        <span className="au-summary-label">Xử lý chênh lệch</span>
                                        <span className={`au-summary-value au-val-${adjustmentSummary.tone}`}>
                                            {adjustmentSummary.label}
                                        </span>
                                    </div>
                                )}
                            </div>

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
                                            <th style={{ width: "9%", textAlign: "right" }}>SL hệ thống</th>
                                            <th style={{ width: "9%", textAlign: "right" }}>SL thực tế</th>
                                            <th style={{ width: "9%", textAlign: "right" }}>Chênh lệch</th>
                                            {showSuggestionColumn && <th style={{ width: "13%" }}>Đề xuất xử lý</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailRows.map((row, idx) => {
                                            const actual = row._actualForDisplay;
                                            const diff = row._diffForDisplay;
                                            return (
                                                <tr key={row._id || idx}>
                                                    <td className="rc-td-stt">{idx + 1}</td>
                                                    <td style={{ fontWeight: 600, color: "#1E854A" }}>{row.itemcode}</td>
                                                    <td>{row.itemname}</td>
                                                    <td>{row.unitof || "—"}</td>
                                                    <td>{row.locationcode || row.locationname || "—"}</td>
                                                    <td>{row.batchCode || "—"}</td>
                                                    <td className="rc-td-num au-book-qty">{formatNumber(row.bookquantity)}</td>
                                                    <td className="rc-td-num">{actual === null ? "—" : formatNumber(actual)}</td>
                                                    <DiffCell diff={diff} />
                                                    {showSuggestionColumn && (
                                                        <td>
                                                            {toNumber(diff, 0) === 0 ? (
                                                                <SuggestionBadge diff={diff} />
                                                            ) : isAdjustmentProcessed(id, { ...row, diffquantity: diff }) ? (
                                                                <span className="au-suggestion au-suggestion-zero">Đã xử lý</span>
                                                            ) : canCreateAdjustment ? (
                                                                <button
                                                                    type="button"
                                                                    className={diff > 0 ? "sp-btn-outline au-adjust-action au-adjust-in" : "sp-btn-outline au-adjust-action au-adjust-out"}
                                                                    onClick={() => openAdjustment(row)}
                                                                >
                                                                    {diff > 0 ? "Tạo phiếu nhập" : "Tạo phiếu xuất"}
                                                                </button>
                                                            ) : (
                                                                <SuggestionBadge diff={diff} />
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                        {audit.details.length === 0 && (
                                            <tr><td colSpan={showSuggestionColumn ? 10 : 9} className="sp-status-row">Không có dữ liệu chi tiết.</td></tr>
                                        )}
                                        {audit.details.length > 0 && (
                                            <tr className="au-total-row">
                                                <td colSpan={6}>Tổng cộng</td>
                                                <td className="rc-td-num">{formatNumber(totals.book)}</td>
                                                <td className="rc-td-num">{formatNumber(totals.actual)}</td>
                                                <td className="rc-td-num">{totals.diff > 0 ? `+${formatNumber(totals.diff)}` : formatNumber(totals.diff)}</td>
                                                {showSuggestionColumn && <td></td>}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="rc-form-actions">
                                <button className="sp-btn-outline" onClick={() => navigate("/audits")}>Quay lại</button>
                                {audit.docstatus === "DRAFT" && !isStaff && (
                                    <button className="sp-btn-primary" onClick={() => navigate(`/audits/create?id=${audit.id}`)}>
                                        Cập nhật
                                    </button>
                                )}
                                {canReject && (
                                    <button className="sp-btn-danger-outline" onClick={() => setRejectModal(true)} disabled={actionLoading}>Từ chối</button>
                                )}
                                {canCancel && (
                                    <button className="sp-btn-danger-outline" onClick={handleCancel} disabled={actionLoading}>
                                        {actionLoading ? "Đang xử lý..." : "Hủy phiếu"}
                                    </button>
                                )}
                                {canRequest && (
                                    <button className="sp-btn-primary" onClick={handleSendRequest} disabled={actionLoading}>
                                        {actionLoading ? "Đang xử lý..." : "Gửi yêu cầu"}
                                    </button>
                                )}
                                {canConfirm && (
                                    <button className="sp-btn-primary" onClick={handleConfirm} disabled={actionLoading}>
                                        {actionLoading ? "Đang xử lý..." : "Xác nhận"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
