import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { getAuditById, confirmAudit, cancelAudit, rejectAudit } from "../../api/auditApi";
import { getAvailableLocations, getAllIssues, getIssueById } from "../../api/issueApi";
import { getAllReceipts, getReceiptById } from "../../api/receiptApi";
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
const STATUS_CLASS = {
    DRAFT: "rc-status-pill au-status-pill-draft",
    REQUESTED: "rc-status-pill au-status-pill-requested",
    IN_PROGRESS: "rc-status-pill au-status-pill-in-progress",
    SUBMITTED: "rc-status-pill au-status-pill-submitted",
    PENDING_PROCESS: "rc-status-pill au-status-pill-pending-process",
    PROCESSED: "rc-status-pill au-status-pill-processed",
    CONFIRMED: "rc-status-pill au-status-pill-confirmed",
    CANCELLED: "rc-status-pill au-status-pill-cancelled",
    REJECTED: "rc-status-pill au-status-pill-rejected",
};

function formatDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function formatDateInput(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function IconChevron() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function DiffCell({ diff }) {
    if (diff === null || diff === undefined) return <td className="rc-td-num">—</td>;
    if (diff > 0) return (
        <td className={`rc-td-num au-td-plus`}>
            <span className="au-diff-plus">+{diff}</span>
        </td>
    );
    if (diff < 0) return (
        <td className={`rc-td-num au-td-minus`}>
            <span className="au-diff-minus">{diff}</span>
        </td>
    );
    return <td className="rc-td-num"><span className="au-diff-zero">0</span></td>;
}

export default function AuditDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [audit, setAudit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState(false);
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [locationsByItem, setLocationsByItem] = useState({});
    // Chỉ ẩn nút khi TẤT CẢ mặt hàng có chênh lệch đã được điều chỉnh và xác nhận
    const [adjIssueDone, setAdjIssueDone] = useState(false);
    const [adjReceiptDone, setAdjReceiptDone] = useState(false);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF";
    // Theo API docs 9.4: Manager confirm từ DRAFT, SUBMITTED hoặc PENDING_PROCESS
    const canConfirm = !isStaff && ["DRAFT", "SUBMITTED", "PENDING_PROCESS"].includes(audit?.docstatus);
    const canReject = !isStaff && ["SUBMITTED", "PENDING_PROCESS"].includes(audit?.docstatus);
    const canCancel = !isStaff && audit?.docstatus === "DRAFT";
    const canOpenMenu = canConfirm || canReject || canCancel;
    // Sau khi PROCESSED: hiện nút tạo phiếu điều chỉnh vị trí (ItemLocation) — tuỳ chọn
    const canCreateAdjustment = !isStaff && audit?.docstatus === "PROCESSED";

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const fetchAudit = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAuditById(id);
            setAudit(data);
        } catch {
            setError("Không thể tải chi tiết phiếu kiểm kê.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchAudit(); }, [fetchAudit]);

    // Kiểm tra từng mã hàng: chỉ ẩn nút khi TẤT CẢ mặt hàng có chênh lệch đã được điều chỉnh và xác nhận
    useEffect(() => {
        if (!audit?.docno || !audit?.details || audit?.docstatus !== "PROCESSED") return;

        const negDiffItemIds = audit.details
            .filter((d) => (d.diffquantity || 0) < 0)
            .map((d) => d.itemId)
            .filter(Boolean);
        const posDiffItemIds = audit.details
            .filter((d) => (d.diffquantity || 0) > 0)
            .map((d) => d.itemId)
            .filter(Boolean);

        // Tìm voucherId từ localStorage hoặc fallback tìm theo description/inventoryAuditId
        const resolveVoucherId = async (fetchAll) => {
            const found = (await fetchAll()).find((v) =>
                v.docType === "ADJUSTMENT" &&
                (v.inventoryAuditId === Number(id) || (v.description || "").includes(audit.docno))
            );
            return found ? String(found.id) : null;
        };

        // Kiểm tra phiếu xuất: confirmed VÀ bao phủ tất cả mặt hàng âm
        const checkIssueDone = async () => {
            if (negDiffItemIds.length === 0) { setAdjIssueDone(false); return; }
            let issueId = localStorage.getItem(`audit_adj_issue_id_${id}`);
            if (!issueId) {
                try { issueId = await resolveVoucherId(getAllIssues); }
                catch { /* bỏ qua */ }
            }
            if (!issueId) { setAdjIssueDone(false); return; }
            try {
                const issue = await getIssueById(Number(issueId));
                localStorage.setItem(`audit_adj_issue_id_${id}`, String(issueId));
                if (issue?.docstatus !== "CONFIRMED") { setAdjIssueDone(false); return; }
                const issueItemIds = new Set((issue.details || []).map((d) => d.itemId).filter(Boolean));
                setAdjIssueDone(negDiffItemIds.every((itemId) => issueItemIds.has(itemId)));
            } catch { setAdjIssueDone(false); }
        };

        // Kiểm tra phiếu nhập: confirmed VÀ bao phủ tất cả mặt hàng dương
        const checkReceiptDone = async () => {
            if (posDiffItemIds.length === 0) { setAdjReceiptDone(false); return; }
            let receiptId = localStorage.getItem(`audit_adj_receipt_id_${id}`);
            if (!receiptId) {
                try { receiptId = await resolveVoucherId(getAllReceipts); }
                catch { /* bỏ qua */ }
            }
            if (!receiptId) { setAdjReceiptDone(false); return; }
            try {
                const receipt = await getReceiptById(Number(receiptId));
                localStorage.setItem(`audit_adj_receipt_id_${id}`, String(receiptId));
                if (receipt?.docstatus !== "CONFIRMED") { setAdjReceiptDone(false); return; }
                const receiptItemIds = new Set((receipt.details || []).map((d) => d.itemId).filter(Boolean));
                setAdjReceiptDone(posDiffItemIds.every((itemId) => receiptItemIds.has(itemId)));
            } catch { setAdjReceiptDone(false); }
        };

        checkIssueDone();
        checkReceiptDone();
    }, [audit?.docno, audit?.docstatus, audit?.details, id]);

    useEffect(() => {
        const loadLocations = async () => {
            if (!audit?.details || audit.details.length === 0) {
                setLocationsByItem({});
                return;
            }
            try {
                const itemIds = Array.from(new Set(audit.details.map((d) => d.itemId).filter(Boolean)));
                const results = await Promise.all(itemIds.map((itemId) => getAvailableLocations(itemId)));
                const map = {};
                itemIds.forEach((itemId, idx) => {
                    const locs = results[idx] || [];
                    const codes = locs.map((loc) => loc.locationcode || loc.locationname).filter(Boolean);
                    map[String(itemId)] = Array.from(new Set(codes));
                });
                setLocationsByItem(map);
            } catch {
                setLocationsByItem({});
            }
        };

        loadLocations();
    }, [audit]);

    const handleConfirm = async () => {
        setConfirmModal(false);
        setActionLoading(true);
        try {
            const res = await confirmAudit(id);
            if (res?.success) {
                showToast("success", "Xác nhận kiểm kê thành công! Tồn kho đã được điều chỉnh.");
                await fetchAudit();
            } else {
                showToast("error", res?.message || "Xác nhận thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra.");
        } finally {
            setActionLoading(false);
            setStatusMenuOpen(false);
        }
    };

    const handleCancel = async () => {
        setActionLoading(true);
        try {
            const res = await cancelAudit(id);
            if (res?.success) {
                showToast("success", "Đã hủy phiếu kiểm kê.");
                await fetchAudit();
            } else {
                showToast("error", res?.message || "Hủy thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra.");
        } finally {
            setActionLoading(false);
            setStatusMenuOpen(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            showToast("error", "Vui lòng nhập lý do từ chối.");
            return;
        }
        setRejectModal(false);
        setActionLoading(true);
        try {
            const res = await rejectAudit(id, rejectReason.trim());
            if (res?.success) {
                showToast("success", "Đã từ chối phiếu kiểm kê.");
                setRejectReason("");
                await fetchAudit();
            } else {
                showToast("error", res?.message || "Từ chối thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra.");
        } finally {
            setActionLoading(false);
            setStatusMenuOpen(false);
        }
    };

    const summary = audit?.details ? audit.details.reduce(
        (acc, d) => {
            const diff = d.diffquantity ?? 0;
            if (diff > 0) acc.plus += diff;
            else if (diff < 0) acc.minus += diff;
            return acc;
        },
        { plus: 0, minus: 0 }
    ) : null;
    const hasPosDiff = (summary?.plus ?? 0) > 0;
    const hasNegDiff = (summary?.minus ?? 0) < 0;

    return (
        <>
            {/* Confirm modal */}
            {/* Reject modal */}
            {rejectModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: "32px 36px", minWidth: 360, maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1.5px solid #ffccbc", textAlign: "center" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fbe9e7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#bf360c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <h3 style={{ margin: "0 0 8px", color: "#bf360c", fontSize: "1.1rem", fontWeight: 700 }}>Từ chối phiếu kiểm kê</h3>
                        <p style={{ margin: "0 0 12px", color: "#4c6152", fontSize: "0.92rem" }}>Vui lòng nhập lý do từ chối để thông báo cho nhân viên kiểm kê.</p>
                        <textarea
                            style={{ width: "100%", minHeight: 80, padding: 8, borderRadius: 6, border: "1.5px solid #ffb74d", fontSize: "0.9rem", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                            placeholder="Nhập lý do từ chối..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
                            <button className="sp-btn-outline" onClick={() => { setRejectModal(false); setRejectReason(""); }} disabled={actionLoading} style={{ minWidth: 100 }}>Hủy bỏ</button>
                            <button
                                style={{ minWidth: 120, background: "#bf360c", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                                onClick={handleReject}
                                disabled={actionLoading || !rejectReason.trim()}
                            >
                                {actionLoading ? "Đang xử lý..." : "Từ chối"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: "32px 36px", minWidth: 360, maxWidth: 440, boxShadow: "0 8px 32px rgba(30,133,74,0.15)", border: "1.5px solid #c6dfd0", textAlign: "center" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1E854A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="9 12 11 14 15 10" />
                            </svg>
                        </div>
                        <h3 style={{ margin: "0 0 8px", color: "#1E3A2F", fontSize: "1.1rem", fontWeight: 700 }}>Xác nhận phiếu kiểm kê</h3>
                        <p style={{ margin: "0 0 8px", color: "#4c6152", fontSize: "0.92rem" }}>
                            {audit?.docstatus === "PENDING_PROCESS"
                                ? "Tồn kho tổng sẽ được điều chỉnh theo chênh lệch thực tế. Hành động này không thể hoàn tác."
                                : "Số liệu khớp sổ sách. Xác nhận để hoàn tất phiếu kiểm kê."}
                        </p>
                        {audit?.docstatus === "PENDING_PROCESS" && summary && (summary.plus !== 0 || summary.minus !== 0) && (
                            <div style={{ margin: "8px 0 16px", display: "flex", justifyContent: "center", gap: 24, fontSize: "0.9rem" }}>
                                {summary.plus > 0 && <span style={{ color: "#1b5e20", fontWeight: 700 }}>+{summary.plus} thừa</span>}
                                {summary.minus < 0 && <span style={{ color: "#b71c1c", fontWeight: 700 }}>{summary.minus} thiếu</span>}
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
                            <button className="sp-btn-outline" onClick={() => setConfirmModal(false)} disabled={actionLoading} style={{ minWidth: 100 }}>Hủy bỏ</button>
                            <button className="sp-btn-primary" onClick={handleConfirm} disabled={actionLoading} style={{ minWidth: 120 }}>
                                {actionLoading ? "Đang xử lý..." : "Xác nhận"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`sp-toast ${toast.type === "success" ? "sp-toast-success" : "sp-toast-error"}`}>{toast.msg}</div>
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

                    {loading && <div style={{ textAlign: "center", color: "#4c6152", padding: "40px 0" }}>Đang tải...</div>}
                    {!loading && error && <div style={{ textAlign: "center", color: "#b71c1c", padding: "40px 0" }}>{error}</div>}

                    {!loading && !error && audit && (
                        <div className="rc-form-card">
                            {/* ── Header ── */}
                            <div className="rc-header-row">
                                <label className="rc-form-label">Ngày</label>
                                <input type="date" className="rc-form-input" style={{ minWidth: 150 }} value={formatDateInput(audit.docDate)} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Số</label>
                                <input className="rc-form-input" style={{ minWidth: 200 }} value={audit.docno || ""} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Người lập</label>
                                <input className="rc-form-input" style={{ minWidth: 180 }} value={audit.createdByFullname || audit.createdByUsername || ""} readOnly />

                                {/* Status pill with dropdown – Manager only */}
                                <div style={{ position: "relative", marginLeft: "auto" }}>
                                    <button
                                        className={STATUS_CLASS[audit.docstatus] || "rc-status-pill"}
                                        onClick={() => canOpenMenu && setStatusMenuOpen((v) => !v)}
                                        style={{ cursor: canOpenMenu ? "pointer" : "default" }}
                                        disabled={actionLoading}
                                    >
                                        {STATUS_LABELS[audit.docstatus] || audit.docstatus}
                                        {canOpenMenu && <IconChevron />}
                                    </button>
                                    {statusMenuOpen && canOpenMenu && (
                                        <div style={{ position: "absolute", right: 0, top: "110%", background: "#fff", border: "1.5px solid #c6dfd0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 100, minWidth: 170, padding: "4px 0" }}>
                                            {canConfirm && (
                                                <div
                                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.88rem", color: "#1a7f4b", fontWeight: 600 }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "#f3faf6"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = ""}
                                                    onClick={() => { setStatusMenuOpen(false); setConfirmModal(true); }}
                                                >
                                                    ✓ {audit?.docstatus === "PENDING_PROCESS" ? "Xác nhận chênh lệch" : "Xác nhận kiểm kê"}
                                                </div>
                                            )}
                                            {canReject && (
                                                <div
                                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.88rem", color: "#bf360c" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "#fbe9e7"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = ""}
                                                    onClick={() => { setStatusMenuOpen(false); setRejectModal(true); }}
                                                >
                                                    ✕ Từ chối duyệt
                                                </div>
                                            )}
                                            {canCancel && (
                                                <div
                                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.88rem", color: "#b71c1c" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "#fce4ec"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = ""}
                                                    onClick={handleCancel}
                                                >
                                                    ✕ Hủy phiếu
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Nhân viên được giao ── */}
                            {(audit.assignedToFullname || audit.assignedToUsername || audit.assignedUserFullname || audit.assignedUsername || audit.approverFullname || audit.approverUsername) && (
                                <div className="rc-form-row">
                                    <label className="rc-form-label">Nhân viên kiểm kê</label>
                                    <input
                                        className="rc-form-input"
                                        style={{ minWidth: 200 }}
                                        value={audit.assignedToFullname || audit.assignedToUsername || audit.assignedUserFullname || audit.assignedUsername || ""}
                                        readOnly
                                    />
                                    <label className="rc-form-label" style={{ marginLeft: 16 }}>Người duyệt</label>
                                    <input
                                        className="rc-form-input"
                                        style={{ minWidth: 200 }}
                                        value={audit.approverFullname || audit.approverUsername || ""}
                                        readOnly
                                    />
                                    <span style={{ marginLeft: 10, fontSize: "0.82rem", color: "#f57f17", fontWeight: 600 }}>
                                        {audit.docstatus === "REQUESTED" ? "Đang chờ nhân viên bắt đầu kiểm kê"
                                            : audit.docstatus === "IN_PROGRESS" ? "Nhân viên đang thực hiện kiểm kê"
                                                : audit.docstatus === "SUBMITTED" ? "Nhân viên đã gửi kết quả"
                                                    : audit.docstatus === "PENDING_PROCESS" ? "Có chênh lệch, cần xử lý"
                                                        : ""}
                                    </span>
                                </div>
                            )}

                            {/* ── Diễn giải ── */}
                            {audit.description && (
                                <div className="rc-form-row">
                                    <label className="rc-form-label">Diễn giải</label>
                                    <input className="rc-form-input rc-form-full" value={audit.description} readOnly />
                                </div>
                            )}

                            {(audit.locationcode || audit.locationname) && (
                                <div className="rc-form-row">
                                    <label className="rc-form-label">Vị trí</label>
                                    <input
                                        className="rc-form-input rc-form-full"
                                        value={audit.locationcode ? `${audit.locationcode} - ${audit.locationname || ""}` : (audit.locationname || "")}
                                        readOnly
                                    />
                                </div>
                            )}

                            {/* ── Summary bar (chỉ show khi có dữ liệu diff) ──
                            {audit.docstatus !== "DRAFT" && summary && (
                                <div className="au-summary-bar">
                                    <div className="au-summary-item">
                                        <span className="au-summary-label">Số mặt hàng kiểm kê</span>
                                        <span className="au-summary-value">{audit.details?.length ?? 0}</span>
                                    </div>
                                    <div className="au-summary-item">
                                        <span className="au-summary-label">Thừa hàng (tổng cộng)</span>
                                        <span className={`au-summary-value ${summary.plus > 0 ? "au-val-plus" : ""}`}>
                                            {summary.plus > 0 ? `+${summary.plus}` : "0"}
                                        </span>
                                    </div>
                                    <div className="au-summary-item">
                                        <span className="au-summary-label">Thiếu hàng (tổng cộng)</span>
                                        <span className={`au-summary-value ${summary.minus < 0 ? "au-val-minus" : ""}`}>
                                            {summary.minus < 0 ? summary.minus : "0"}
                                        </span>
                                    </div>
                                    <div className="au-summary-item">
                                        <span className="au-summary-label">Không chênh lệch</span>
                                        <span className="au-summary-value">
                                            {audit.details?.filter((d) => (d.diffquantity ?? 0) === 0).length ?? 0}
                                        </span>
                                    </div>
                                </div>
                            )} */}

                            {/* ── DRAFT hint ── */}
                            {audit.docstatus === "DRAFT" && audit.details && audit.details.length > 0 && (
                                <div style={{ background: "#eceff1", border: "1px solid #b0bec5", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#37474f" }}>
                                    Phiếu đang ở trạng thái <strong>Nháp</strong>. Có thể giao cho nhân viên hoặc xác nhận trực tiếp.
                                </div>
                            )}
                            {audit.docstatus === "REQUESTED" && (
                                <div style={{ background: "#fff9c4", border: "1px solid #ffd54f", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#5d4037" }}>
                                    Phiếu đã <strong>giao cho nhân viên</strong>. Đang chờ nhân viên bắt đầu kiểm kê.
                                </div>
                            )}
                            {audit.docstatus === "IN_PROGRESS" && (
                                <div style={{ background: "#e3f2fd", border: "1px solid #90caf9", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#1565c0" }}>
                                    Nhân viên đang <strong>thực hiện kiểm kê</strong>. Vui lòng chờ kết quả.
                                </div>
                            )}
                            {audit.docstatus === "SUBMITTED" && !isStaff && (
                                <div style={{ background: "#e8f5e9", border: "1px solid #81c784", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#1b5e20" }}>
                                    Nhân viên đã <strong>gửi kết quả kiểm kê</strong>. Số liệu <strong>khớp sổ sách</strong>, không có chênh lệch. Vui lòng xác nhận.
                                </div>
                            )}
                            {audit.docstatus === "PENDING_PROCESS" && !isStaff && (
                                <div style={{ background: "#ffe0b2", border: "1px solid #ff8a65", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#bf360c" }}>
                                    Nhân viên đã gửi kết quả. <strong>Có chênh lệch tồn kho</strong> — xác nhận để hệ thống tự điều chỉnh tồn kho tổng theo số thực tế.
                                </div>
                            )}
                            {audit.docstatus === "PROCESSED" && !isStaff && (
                                <div style={{ background: "#f3e5f5", border: "1px solid #ce93d8", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#4a148c" }}>
                                    Tồn kho tổng đã được <strong>điều chỉnh tự động</strong>. Nếu cần đồng bộ tồn theo vị trí, tạo phiếu nhập/xuất điều chỉnh bên dưới.
                                </div>
                            )}
                            {audit.docstatus === "REJECTED" && (
                                <div style={{ background: "#fbe9e7", border: "1px solid #ff8a65", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#bf360c" }}>
                                    Phiếu kiểm kê đã bị <strong>từ chối</strong>.
                                    {audit.rejectReason && (
                                        <span> Lý do: <strong>{audit.rejectReason}</strong></span>
                                    )}
                                </div>
                            )}

                            {/* ── Detail table ── */}
                            <div className="rc-detail-table-wrap">
                                <table className="rc-detail-table" style={{ width: "100%" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: "4%" }}>STT</th>
                                            <th style={{ width: "9%" }}>Mã hàng</th>
                                            <th style={{ width: "18%" }}>Tên vật tư hàng hóa</th>
                                            <th style={{ width: "22%" }}>Vị trí kiểm kê</th>
                                            <th style={{ width: "5%" }}>Đơn vị</th>
                                            <th style={{ width: "9%", textAlign: "right" }}>SL hệ thống</th>
                                            <th style={{ width: "9%", textAlign: "right" }}>SL thực tế</th>
                                            <th style={{ width: "8%", textAlign: "right" }}>Chênh lệch</th>
                                            <th style={{ width: "16%" }}>Đề xuất xử lý</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {audit.details && audit.details.map((d, idx) => {
                                            const diff = d.diffquantity ?? null;
                                            let suggestion = null;
                                            if (diff !== null && diff > 0) {
                                                suggestion = (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e8f5e9", color: "#1a7f4b", borderRadius: 6, padding: "3px 10px", fontSize: "0.82rem", fontWeight: 600 }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                                                        Tạo phiếu nhập
                                                    </span>
                                                );
                                            } else if (diff !== null && diff < 0) {
                                                suggestion = (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fce4ec", color: "#c62828", borderRadius: 6, padding: "3px 10px", fontSize: "0.82rem", fontWeight: 600 }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                                                        Tạo phiếu xuất
                                                    </span>
                                                );
                                            }
                                            return (
                                                <tr key={d.id || idx}>
                                                    <td className="rc-td-stt">{idx + 1}</td>
                                                    <td style={{ fontWeight: 600, color: "#1E854A" }}>{d.itemcode}</td>
                                                    <td>{d.itemname}</td>
                                                    <td>
                                                        {d.locationEntries && d.locationEntries.length > 0 ? (
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem" }}>
                                                                {d.locationEntries.map((e) => (
                                                                    <span key={`${d.itemId}-${e.locationId}`} style={{ color: "#4c6152" }}>
                                                                        {e.locationcode}: <strong>{e.actualQty}</strong> / {e.systemQty}
                                                                        {(e.batchCodes || []).length > 0 && (
                                                                            <span style={{ color: "#8ba392", marginLeft: 4 }}>
                                                                                (Lô: {e.batchCodes.join(", ")})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            (locationsByItem[String(d.itemId)] || []).length > 0
                                                                ? locationsByItem[String(d.itemId)].join(", ")
                                                                : "—"
                                                        )}
                                                    </td>
                                                    <td>{d.unitof}</td>
                                                    <td className="rc-td-num au-book-qty">{d.bookquantity ?? "—"}</td>
                                                    <td className="rc-td-num" style={{ fontWeight: 600, color: "#1E3A2F" }}>{d.actualquantity}</td>
                                                    <DiffCell diff={diff} />
                                                    <td style={{ whiteSpace: "nowrap" }}>{suggestion ?? <span style={{ color: "#8ba392", fontSize: "0.83rem" }}>Khớp sổ sách</span>}</td>
                                                </tr>
                                            );
                                        })}
                                        {(!audit.details || audit.details.length === 0) && (
                                            <tr><td colSpan={9} style={{ textAlign: "center", color: "#8ba392", padding: 16 }}>Không có dữ liệu chi tiết.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Actions ── */}
                            <div className="rc-form-actions">
                                <button className="sp-btn-outline" onClick={() => navigate("/audits")}>Quay lại</button>

                                {/* PROCESSED: đồng bộ tồn vị trí (tuỳ chọn) */}
                                {canCreateAdjustment && (
                                    <>
                                        {hasPosDiff && !adjReceiptDone && (
                                            <button
                                                className="sp-btn-outline"
                                                style={{ borderColor: "#1a7f4b", color: "#1a7f4b" }}
                                                onClick={() => navigate(`/receipts/create?docType=ADJUSTMENT&auditId=${audit.id}`)}
                                            >
                                                + Tạo phiếu nhập điều chỉnh vị trí
                                            </button>
                                        )}
                                        {hasNegDiff && !adjIssueDone && (
                                            <button
                                                className="sp-btn-outline"
                                                style={{ borderColor: "#c62828", color: "#c62828" }}
                                                onClick={() => navigate(`/issues/create?docType=ADJUSTMENT&auditId=${audit.id}`)}
                                            >
                                                − Tạo phiếu xuất điều chỉnh vị trí
                                            </button>
                                        )}
                                    </>
                                )}

                                {canConfirm && (
                                    <button className="sp-btn-primary" onClick={() => setConfirmModal(true)} disabled={actionLoading}>
                                        {actionLoading ? "Đang xử lý..." : audit?.docstatus === "PENDING_PROCESS" ? "Xác nhận chênh lệch" : "Xác nhận kiểm kê"}
                                    </button>
                                )}

                                {canCancel && (
                                    <button className="sp-btn-danger-outline" onClick={handleCancel} disabled={actionLoading}>
                                        {actionLoading ? "Đang xử lý..." : "Hủy phiếu"}
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
