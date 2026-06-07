import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { getAuditById, confirmAudit, cancelAudit, rejectAudit, requestAudit } from "../../api/auditApi";
import { getAllReceipts } from "../../api/receiptApi";
import { getAllIssues } from "../../api/issueApi";
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
const ADJUSTMENT_APPROVED_STATUS = "CONFIRMED";
const ADJUSTMENT_FINAL_OPEN_STATUSES = new Set(["DRAFT", "REQUESTED", "IN_PROGRESS", "SUBMITTED", "PENDING_PROCESS"]);
const ADJUSTMENT_FAILED_STATUSES = new Set(["CANCELLED", "REJECTED"]);

function getDocType(doc) {
    return String(doc?.docType || doc?.doctype || "").toUpperCase();
}

function getDocAuditId(doc) {
    return doc?.inventoryAuditId ?? doc?.inventoryauditid ?? doc?.auditId ?? doc?.inventoryAudit?.id ?? null;
}

function isSameId(a, b) {
    if (a === null || a === undefined || b === null || b === undefined || a === "" || b === "") return false;
    return String(a) === String(b);
}

function sameNumber(a, b) {
    return Math.abs(toNumber(a) - toNumber(b)) < 0.0001;
}

function docMatchesAudit(doc, auditId) {
    return getDocType(doc) === "ADJUSTMENT" && isSameId(getDocAuditId(doc), auditId);
}

function docDetailsMatchRow(doc, row, diff) {
    const details = doc?.details || [];
    if (details.length === 0) return false;
    if (row.id && details.some((detail) => isSameId(detail.inventoryAuditDetailId ?? detail.inventoryauditdetailid, row.id))) {
        return true;
    }
    const targetQty = Math.abs(toNumber(diff));
    const totalQty = details.reduce((sum, detail) => sum + toNumber(detail.quantity ?? detail.qty), 0);
    const hasSameItem = details.some((detail) => isSameId(detail.itemId ?? detail.itemid, row.itemId));
    const hasSameLocation = details.some((detail) => isSameId(detail.locationId ?? detail.locationid, row.locationId));
    const hasSameBatch = !row.batchId || details.some((detail) => (
        isSameId(detail.batchId ?? detail.batchid, row.batchId)
        || String(detail.batchCode || detail.batchcode || "") === String(row.batchCode || "")
    ));

    return hasSameItem && hasSameLocation && hasSameBatch && sameNumber(totalQty, targetQty);
}

function getStoredAdjustmentDocId(auditId, row, type) {
    if (typeof localStorage === "undefined" || !auditId || !row?.id) return null;
    return localStorage.getItem(`audit_adj_${type}_detail_doc_${auditId}_${row.id}`);
}

function findAdjustmentDocForRow({ auditId, row, diff, adjustmentDocs }) {
    const type = diff > 0 ? "receipt" : "issue";
    const docs = diff > 0 ? adjustmentDocs.receipts : adjustmentDocs.issues;
    const storedDocId = getStoredAdjustmentDocId(auditId, row, type);

    if (storedDocId) {
        const byStoredId = docs.find((doc) => isSameId(doc.id, storedDocId));
        if (byStoredId) return byStoredId;
    }

    return docs.find((doc) => (
        docMatchesAudit(doc, auditId) && docDetailsMatchRow(doc, row, diff)
    )) || null;
}

function getAdjustmentState({ auditId, row, diff, adjustmentDocs }) {
    if (toNumber(diff, 0) === 0) return { state: "NO_DIFF", doc: null };

    const doc = findAdjustmentDocForRow({ auditId, row, diff, adjustmentDocs });
    if (!doc) {
        const type = diff > 0 ? "receipt" : "issue";
        const storedDocId = getStoredAdjustmentDocId(auditId, row, type);
        return storedDocId
            ? { state: "PENDING", doc: { id: storedDocId, docstatus: "DRAFT" } }
            : { state: "NOT_CREATED", doc: null };
    }

    if (doc.docstatus === ADJUSTMENT_APPROVED_STATUS) return { state: "APPROVED", doc };
    if (ADJUSTMENT_FAILED_STATUSES.has(doc.docstatus)) return { state: "FAILED", doc };
    if (ADJUSTMENT_FINAL_OPEN_STATUSES.has(doc.docstatus)) return { state: "PENDING", doc };
    return { state: "PENDING", doc };
}

function getAdjustmentSummary(states) {
    if (states.length === 0) return { label: "Không có chênh lệch", tone: "plus" };
    const created = states.filter((item) => item.state !== "NOT_CREATED");
    const approvedCount = states.filter((item) => item.state === "APPROVED").length;
    const hasOpen = states.some((item) => item.state === "PENDING");
    const hasMissingOrFailed = states.some((item) => item.state === "NOT_CREATED" || item.state === "FAILED");

    if (created.length === 0) return { label: "Chưa xử lý", tone: "minus" };
    if (approvedCount === states.length) return { label: "Đã xử lý chênh lệch", tone: "plus" };
    if (hasOpen && !hasMissingOrFailed) return { label: "Đang xử lý", tone: "warning" };
    return { label: "Còn tồn đọng", tone: "minus" };
}

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
    const [adjustmentDocs, setAdjustmentDocs] = useState({ receipts: [], issues: [] });

    const fetchAudit = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, receipts, issues] = await Promise.all([
                getAuditById(id),
                getAllReceipts().catch(() => []),
                getAllIssues().catch(() => []),
            ]);
            setAudit({ ...data, details: normalizeAuditDetails(data.details) });
            setAdjustmentDocs({
                receipts: (receipts || []).filter((doc) => getDocType(doc) === "ADJUSTMENT"),
                issues: (issues || []).filter((doc) => getDocType(doc) === "ADJUSTMENT"),
            });
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
    const adjustmentStates = useMemo(() => (
        detailRows
            .filter((row) => toNumber(row._diffForDisplay, 0) !== 0)
            .map((row) => ({
                rowId: row.id || row._id,
                ...getAdjustmentState({
                    auditId: id,
                    row,
                    diff: row._diffForDisplay,
                    adjustmentDocs,
                }),
            }))
    ), [adjustmentDocs, detailRows, id]);
    const adjustmentStateByRow = useMemo(() => {
        const map = new Map();
        adjustmentStates.forEach((item) => map.set(String(item.rowId), item));
        return map;
    }, [adjustmentStates]);
    const adjustmentSummary = useMemo(() => getAdjustmentSummary(adjustmentStates), [adjustmentStates]);
    const showSuggestionColumn = adjustmentStates.some((item) => item.state !== "APPROVED");

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
        const adjustmentState = adjustmentStateByRow.get(String(row.id || row._id));
        if (adjustmentState && !["NOT_CREATED", "FAILED"].includes(adjustmentState.state)) return;
        const type = diff > 0 ? "receipts" : "issues";
        const queryType = diff > 0 ? "receipt" : "issue";
        navigate(`/${type}/create?docType=ADJUSTMENT&auditId=${audit.id}&auditDetailId=${encodeURIComponent(row.id || "")}&adjustmentType=${queryType}`);
    };

    const openAdjustmentDoc = (row, adjustmentState) => {
        const diff = toNumber(row._diffForDisplay, 0);
        const docId = adjustmentState?.doc?.id;
        if (!docId || !diff) return;
        navigate(`/${diff > 0 ? "receipts" : "issues"}/${docId}`);
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
                                            const adjustmentState = adjustmentStateByRow.get(String(row.id || row._id));
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
                                                            ) : adjustmentState?.state === "APPROVED" ? (
                                                                <span className="au-suggestion au-suggestion-zero">Đã xử lý</span>
                                                            ) : adjustmentState?.state === "PENDING" ? (
                                                                <button
                                                                    type="button"
                                                                    className="au-suggestion au-suggestion-pending au-suggestion-link"
                                                                    onClick={() => openAdjustmentDoc(row, adjustmentState)}
                                                                    title="Mở phiếu điều chỉnh đang chờ duyệt"
                                                                >
                                                                    Đang chờ duyệt phiếu điều chỉnh
                                                                </button>
                                                            ) : adjustmentState?.state === "FAILED" ? (
                                                                <button
                                                                    type="button"
                                                                    className={diff > 0 ? "sp-btn-outline au-adjust-action au-adjust-in" : "sp-btn-outline au-adjust-action au-adjust-out"}
                                                                    onClick={() => openAdjustment(row)}
                                                                    title="Phiếu điều chỉnh trước đó bị từ chối/hủy. Có thể tạo lại phiếu mới."
                                                                >
                                                                    {diff > 0 ? "Tạo lại phiếu nhập" : "Tạo lại phiếu xuất"}
                                                                </button>
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
