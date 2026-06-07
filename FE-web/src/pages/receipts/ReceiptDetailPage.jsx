import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../styles/shared.css";
import "./receipts.css";
import { getReceiptById, confirmReceipt, cancelReceipt, rejectReceipt } from "../../api/receiptApi";
import { getAllBatches } from "../../api/batchApi";
import TopbarRight from "../../components/TopbarRight";

const COMPANY_NAME = "CÔNG TY TNHH HOSHIMOTO VIỆT NAM";
const COMPANY_ADDRESS_LINE1 = "Căn số 49-TT5, Khu nhà ở Đài phát sóng phát thanh Mễ Trì,";
const COMPANY_ADDRESS_LINE2 = "Phường Đại Mỗ, TP Hà Nội";

const STATUS_LABELS = { DRAFT: "Nháp", CONFIRMED: "Đã xác nhận", CANCELLED: "Đã hủy", REJECTED: "Bị từ chối" };

const DOC_TYPE_LABELS = {
    NORMAL: "Thông thường",
    ADJUSTMENT: "Điều chỉnh",
    RETURN: "Hàng trả về",
};
const STATUS_CLASS = {
    DRAFT: "rc-status-pill rc-status-pill-draft",
    CONFIRMED: "rc-status-pill rc-status-pill-confirmed",
    CANCELLED: "rc-status-pill rc-status-pill-cancelled",
    REJECTED: "rc-status-pill rc-status-pill-rejected",
};

function formatDate(str) {
    if (!str) return "";
    const raw = String(str);
    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
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
function formatMoney(n) {
    if (!n && n !== 0) return "";
    return Number(n).toLocaleString("vi-VN");
}

/** Preview batch code theo logic BE: ITEMCODE-YYYYMMDD */
function previewBatchCode(itemcode, docDate) {
    if (!itemcode || !docDate) return "—";
    const yyyymmdd = String(docDate).slice(0, 10).replace(/-/g, "");
    return `${itemcode}-${yyyymmdd}`;
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function numberToWordsVi(n) {
    const units = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ", "tỷ tỷ"];

    const readTens = (num, full) => {
        const tens = Math.floor(num / 10);
        const unit = num % 10;
        let text = "";

        if (tens > 1) {
            text = `${units[tens]} mươi`;
            if (unit === 1) text += " mốt";
            else if (unit === 5) text += " lăm";
            else if (unit > 0) text += ` ${units[unit]}`;
        } else if (tens === 1) {
            text = "mười";
            if (unit === 1) text += " một";
            else if (unit === 5) text += " lăm";
            else if (unit > 0) text += ` ${units[unit]}`;
        } else if (full && unit > 0) {
            text = `lẻ ${units[unit]}`;
        } else if (unit > 0) {
            text = units[unit];
        }

        return text;
    };

    const readHundreds = (num, full) => {
        const hundred = Math.floor(num / 100);
        const rest = num % 100;
        let text = "";

        if (hundred > 0 || full) {
            text = `${units[hundred]} trăm`;
            if (rest > 0) text += ` ${readTens(rest, true)}`;
        } else if (rest > 0) {
            text = readTens(rest, false);
        }

        return text;
    };

    if (n === 0) return "không";

    let number = Math.floor(Math.abs(n));
    let scaleIndex = 0;
    let parts = [];

    while (number > 0 && scaleIndex < scales.length) {
        const chunk = number % 1000;
        if (chunk > 0) {
            const full = scaleIndex > 0 && chunk < 100;
            const chunkText = readHundreds(chunk, full).trim();
            parts.unshift(`${chunkText} ${scales[scaleIndex]}`.trim());
        }
        number = Math.floor(number / 1000);
        scaleIndex += 1;
    }

    return parts.join(" ").replace(/\s+/g, " ").trim();
}

export default function ReceiptDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canConfirmCancel = user?.role === "ADMIN" || user?.role === "MANAGER";

    const [receipt, setReceipt] = useState(null);
    const [batchCodeByDetailId, setBatchCodeByDetailId] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState(false);
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const fetchReceipt = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, batches] = await Promise.all([getReceiptById(id), getAllBatches()]);
            setReceipt(data);
            // Build map: receiptDetailId -> batchCode (exact match)
            const map = {};
            (batches || []).forEach((b) => {
                if (b.receiptDetailId) map[b.receiptDetailId] = b.batchCode || b.batchcode || "";
            });
            // Fallback map: itemId -> batchCode scoped to THIS receipt's details
            // Needed when 1 item is split across multiple locations (multiple detail rows share 1 batch)
            const detailIds = new Set((data.details || []).map((d) => d.id));
            const itemFallback = {};
            (batches || []).forEach((b) => {
                if (b.receiptDetailId && detailIds.has(b.receiptDetailId) && b.itemId) {
                    itemFallback[b.itemId] = b.batchCode || b.batchcode || "";
                }
            });
            // Merge: fill in missing detail entries using item fallback
            (data.details || []).forEach((d) => {
                if (!map[d.id] && itemFallback[d.itemId]) {
                    map[d.id] = itemFallback[d.itemId];
                }
            });
            setBatchCodeByDetailId(map);
        } catch {
            setError("Không thể tải chi tiết phiếu nhập kho.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchReceipt(); }, [fetchReceipt]);

    const handleConfirm = async () => {
        setConfirmModal(false);
        setActionLoading(true);
        try {
            const res = await confirmReceipt(id);
            if (res?.success) {
                showToast("success", "Xác nhận phiếu nhập kho thành công!");
                await fetchReceipt();
            } else {
                showToast("error", res?.message || "Xác nhận thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra.");
        } finally { setActionLoading(false); }
    };

    const handleCancel = async () => {
        setActionLoading(true);
        try {
            const res = await cancelReceipt(id);
            if (res?.success) {
                showToast("success", "Đã hủy phiếu nhập kho.");
                await fetchReceipt();
            } else {
                showToast("error", res?.message || "Hủy thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra.");
        } finally { setActionLoading(false); }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            showToast("error", "Vui lòng nhập lý do từ chối.");
            return;
        }
        setRejectModal(false);
        setActionLoading(true);
        try {
            const res = await rejectReceipt(id, rejectReason.trim());
            if (res?.success) {
                showToast("success", "Đã từ chối phiếu nhập kho.");
                setRejectReason("");
                await fetchReceipt();
            } else {
                showToast("error", res?.message || "Từ chối thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra.");
        } finally { setActionLoading(false); }
    };

    const totalAmount = receipt?.details
        ? receipt.details.reduce((s, d) => s + (d.amount || (d.quantity || 0) * (d.unitprice || 0)), 0)
        : 0;

    const handleExportPdf = () => {
        if (!receipt) return;

        const totalRound = Math.round(totalAmount || 0);
        const rawWords = numberToWordsVi(totalRound);
        const totalWords = `${rawWords.charAt(0).toUpperCase()}${rawWords.slice(1)} đồng chẵn`;
        const docDate = formatDate(receipt.docDate);
        const invoiceDate = formatDate(receipt.invoiceDate || receipt.docDate);
        const supplierName = receipt.supplierName || receipt.customerName || "";
        const createdBy = receipt.createdByFullname || receipt.createdByName || "";
        const deliverer = receipt.delivererName || receipt.deliveryName || supplierName;
        const storekeeper = receipt.storekeeperName || "";
        const address = receipt.address || "";
        const docNo = receipt.docno || "";
        const warehouseName = receipt.warehouseName || receipt.warehouseCode || "Kho hàng hóa";

        const rowsHtml = (receipt.details || []).map((d, idx) => {
            const qty = Number(d.quantity || 0);
            const actualQty = d.currentQty ?? d.onhandQty ?? d.onhand ?? d.availableQty ?? d.stockQty ?? d.quantity ?? 0;
            const unitPrice = Number(d.unitprice || 0);
            const amount = d.amount || qty * unitPrice;
            return `
                <tr>
                    <td class="center">${idx + 1}</td>
                    <td>${escapeHtml(d.itemname || "")}</td>
                    <td class="center">${escapeHtml(d.itemcode || "")}</td>
                    <td class="center">${escapeHtml(d.unitof || "")}</td>
                    <td class="right">${formatMoney(qty)}</td>
                    <td class="right">${formatMoney(actualQty)}</td>
                    <td class="right">${formatMoney(unitPrice)}</td>
                    <td class="right">${formatMoney(amount)}</td>
                </tr>
            `;
        }).join("");

        const html = `
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8" />
    <title>Phieu nhap kho</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: "Times New Roman", serif; color: #111; margin: 24px 28px; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; }
        .company { font-size: 14px; line-height: 1.4; }
        .company .name { font-weight: 700; text-transform: uppercase; }
        .form-meta { text-align: right; font-size: 12.5px; line-height: 1.25; }
        .form-meta .title { font-weight: 700; }
        .form-meta .note { font-style: italic; }
        .doc-title { text-align: center; margin: 18px 0 8px; }
        .doc-title h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .doc-title .date { font-style: italic; margin-top: 4px; font-size: 14px; }
        .doc-sub { text-align: center; font-size: 14px; margin-bottom: 10px; }
        .doc-sub span { margin: 0 18px; }
        .info { font-size: 14px; line-height: 1.6; margin: 10px 0; }
        .info .label { display: inline-block; min-width: 130px; }
        .info .line { border-bottom: 1px dotted #333; display: inline-block; min-width: 260px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #000; padding: 6px 6px; vertical-align: middle; }
        th { text-align: center; font-weight: 700; }
        .center { text-align: center; }
        .right { text-align: right; }
        .total-row td { font-weight: 700; }
        .signature { margin-top: 18px; font-size: 14px; }
        .sign-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center; }
        .sign-title { font-weight: 700; }
        .sign-sub { font-style: italic; font-size: 13px; }
        .sign-space { height: 70px; }
        @media print {
            body { margin: 0; }
            @page { size: A4 portrait; margin: 18mm 16mm; }
        }
    </style>
</head>
<body>
    <div class="row">
        <div class="company">
            <div class="name">${escapeHtml(COMPANY_NAME)}</div>
            <div>${escapeHtml(COMPANY_ADDRESS_LINE1)}<br/>${escapeHtml(COMPANY_ADDRESS_LINE2)}</div>
        </div>
        <div class="form-meta">
            <div class="title">Mẫu số: 01 - VT</div>
            <div class="note">(Ban hành theo Thông tư số 200/2014/TT-BTC</div>
            <div class="note">Ngày 22/12/2014 của Bộ Tài chính)</div>
        </div>
    </div>

    <div class="doc-title">
        <h1>PHIẾU NHẬP KHO</h1>
        <div class="date">Ngày ${escapeHtml(docDate)}</div>
    </div>
    <div class="doc-sub">
        <span>Số: ${escapeHtml(docNo)}</span>
        <span>Nợ: ____________</span>
        <span>Có: ____________</span>
    </div>

    <div class="info">- Họ và tên người giao: ${escapeHtml(deliverer || "____________________")}</div>
    <div class="info">- Theo hóa đơn số ${escapeHtml(receipt.invoiceNo || receipt.invoiceNumber || "________")} ngày ${escapeHtml(invoiceDate || "____/____/____")} của ${escapeHtml(supplierName || "____________________")}</div>
    <div class="info">- Nhập tại kho: ${escapeHtml(warehouseName)} &nbsp;&nbsp; Địa điểm: ${escapeHtml(address || "____________________")}</div>

    <table>
        <thead>
            <tr>
                <th rowspan="2">STT</th>
                <th rowspan="2">Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ sản phẩm, hàng hóa</th>
                <th rowspan="2">Mã số</th>
                <th rowspan="2">Đơn vị tính</th>
                <th colspan="2">Số lượng</th>
                <th rowspan="2">Đơn giá</th>
                <th rowspan="2">Thành tiền</th>
            </tr>
            <tr>
                <th>Theo chứng từ</th>
                <th>Thực nhập</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml || ""}
            <tr class="total-row">
                <td class="center" colspan="7">Cộng</td>
                <td class="right">${formatMoney(totalAmount)}</td>
            </tr>
        </tbody>
    </table>

    <div class="info">- Tổng số tiền (Viết bằng chữ): <strong>${escapeHtml(totalWords)}</strong></div>
    <div class="info">- Số chứng từ gốc kèm theo: ________________________________</div>

    <div class="signature">
        <div class="sign-row">
            <div>
                <div class="sign-title">Người lập phiếu</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
                <div>${escapeHtml(createdBy)}</div>
            </div>
            <div>
                <div class="sign-title">Người giao hàng</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
            </div>
            <div>
                <div class="sign-title">Thủ kho</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
                <div>${escapeHtml(storekeeper)}</div>
            </div>
            <div>
                <div class="sign-title">Kế toán trưởng</div>
                <div class="sign-sub">(Hoặc bộ phận có nhu cầu nhập)</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
            </div>
        </div>
    </div>
</body>
</html>
        `;

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

    return (
        <>
            {confirmModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: "32px 36px", minWidth: 340, boxShadow: "0 8px 32px rgba(30,133,74,0.15)", border: "1.5px solid #c6dfd0", textAlign: "center" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1E854A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="9 12 11 14 15 10" />
                            </svg>
                        </div>
                        <h3 style={{ margin: "0 0 8px", color: "#1E3A2F", fontSize: "1.1rem", fontWeight: 700 }}>Xác nhận phiếu nhập kho</h3>
                        <p style={{ margin: "0 0 24px", color: "#4c6152", fontSize: "0.92rem" }}>Tồn kho sẽ được cập nhật sau khi xác nhận. Bạn có chắc chắn muốn tiếp tục không?</p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button
                                className="sp-btn-outline"
                                onClick={() => setConfirmModal(false)}
                                disabled={actionLoading}
                                style={{ minWidth: 100 }}
                            >Hủy bỏ</button>
                            <button
                                className="sp-btn-primary"
                                onClick={handleConfirm}
                                disabled={actionLoading}
                                style={{ minWidth: 120 }}
                            >{actionLoading ? "Đang xử lý..." : "Xác nhận"}</button>
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
                            <span className="sp-breadcrumb-link" onClick={() => navigate("/receipts")}>Phiếu nhập kho</span>
                            {" "}&rsaquo;{" "}
                            <span className="sp-breadcrumb-active">Chi tiết phiếu nhập kho</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                <div className="sp-content">
                    <h1 className="sp-title">Phiếu nhập kho</h1>

                    {loading && <div style={{ textAlign: "center", color: "#4c6152", padding: "40px 0" }}>Đang tải...</div>}
                    {!loading && error && <div style={{ textAlign: "center", color: "#b71c1c", padding: "40px 0" }}>{error}</div>}

                    {!loading && !error && receipt && (
                        <div className="rc-form-card">
                            {/* ── Header ── */}
                            <div className="rc-header-row rc-header-row-wrap">
                                <label className="rc-form-label">Ngày</label>
                                <input className="rc-form-input rc-input-auto" value={formatDate(receipt.docDate)} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Số</label>
                                <input className="rc-form-input rc-input-auto" value={receipt.docno || ""} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Loại</label>
                                <input className="rc-form-input rc-input-auto" value={DOC_TYPE_LABELS[(String(receipt.docType || receipt.doctype || "NORMAL")).toUpperCase()] || (receipt.docType || receipt.doctype || "NORMAL")} readOnly />
                                {/* Status pill – static badge, no dropdown */}
                                <span className={`${STATUS_CLASS[receipt.docstatus] || "rc-status-pill"} rc-status-inline`} style={{ marginLeft: "auto", cursor: "default", pointerEvents: "none" }}>
                                    {STATUS_LABELS[receipt.docstatus] || receipt.docstatus}
                                </span>
                            </div>

                            {/* ── Approver / Canceller info row ── */}
                            {receipt.docstatus === "CANCELLED" ? (
                                <div className="rc-header-row" style={{ marginTop: -6 }}>
                                    <label className="rc-form-label">Người hủy</label>
                                    <input className="rc-form-input" style={{ minWidth: 200 }} value={receipt.actionByFullname || receipt.actionByUsername || ""} readOnly />
                                    {receipt.approvedAt && (
                                        <>
                                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày hủy</label>
                                            <input className="rc-form-input" style={{ minWidth: 170 }} value={formatDate(receipt.approvedAt)} readOnly />
                                        </>
                                    )}
                                </div>
                            ) : receipt.docstatus === "REJECTED" && (receipt.actionByFullname || receipt.actionByUsername) ? (
                                <div className="rc-header-row" style={{ marginTop: -6 }}>
                                    <label className="rc-form-label">Người từ chối</label>
                                    <input className="rc-form-input" style={{ minWidth: 200 }} value={receipt.actionByFullname || receipt.actionByUsername || ""} readOnly />
                                    {receipt.approvedAt && (
                                        <>
                                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày từ chối</label>
                                            <input className="rc-form-input" style={{ minWidth: 170 }} value={formatDate(receipt.approvedAt)} readOnly />
                                        </>
                                    )}
                                </div>
                            ) : receipt.actionByFullname || receipt.actionByUsername ? (
                                <div className="rc-header-row" style={{ marginTop: -6 }}>
                                    <label className="rc-form-label">Người duyệt</label>
                                    <input className="rc-form-input" style={{ minWidth: 200 }} value={receipt.actionByFullname || receipt.actionByUsername || ""} readOnly />
                                    {receipt.approvedAt && (
                                        <>
                                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày duyệt</label>
                                            <input className="rc-form-input" style={{ minWidth: 170 }} value={formatDate(receipt.approvedAt)} readOnly />
                                        </>
                                    )}
                                </div>
                            ) : null}

                            <div className="rc-form-row">
                                <label className="rc-form-label">Người lập</label>
                                <input className="rc-form-input rc-input-auto" value={receipt.createdByFullname || receipt.createdByName || ""} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Đối tượng</label>
                                <input className="rc-form-input" style={{ flex: 1, minWidth: 260 }} value={receipt.customerName || ""} readOnly />
                            </div>

                            {/* ── Diễn giải ── */}
                            <div className="rc-form-row">
                                <label className="rc-form-label">Diễn giải</label>
                                <input className="rc-form-input rc-form-full" value={receipt.description || ""} readOnly />
                            </div>

                            {/* ── Địa chỉ ── */}
                            {receipt.address && (
                                <div className="rc-form-row">
                                    <label className="rc-form-label">Địa chỉ</label>
                                    <input className="rc-form-input rc-form-full" value={receipt.address} readOnly />
                                </div>
                            )}

                            {receipt.docstatus === "REJECTED" && receipt.rejectReason && (
                                <div className="rc-form-row" style={{ marginTop: 6 }}>
                                    <label className="rc-form-label">Lý do</label>
                                    <input className="rc-form-input rc-form-full" value={receipt.rejectReason} readOnly />
                                </div>
                            )}
                            {rejectModal && (
                                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <div style={{ background: "#fff", borderRadius: 12, padding: "32px 36px", minWidth: 360, maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1.5px solid #ffccbc", textAlign: "center" }}>
                                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fbe9e7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#bf360c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                            </svg>
                                        </div>
                                        <h3 style={{ margin: "0 0 8px", color: "#bf360c", fontSize: "1.1rem", fontWeight: 700 }}>Từ chối phiếu nhập kho</h3>
                                        <p style={{ margin: "0 0 12px", color: "#4c6152", fontSize: "0.92rem" }}>Vui lòng nhập lý do từ chối để thông báo cho người lập phiếu.</p>
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

                            <div className="rc-detail-table-wrap">
                                <table className="rc-detail-table" style={{ tableLayout: "auto" }}>
                                    <thead>
                                        <tr>
                                            <th className="rc-td-stt" style={{ width: "5%" }}>STT</th>
                                            <th style={{ width: "11%" }}>Mã hàng</th>
                                            <th style={{ width: "22%" }}>Tên hàng hóa</th>
                                            <th style={{ width: "12%" }}>Mã lô</th>
                                            <th style={{ width: "8%" }}>Đơn vị</th>
                                            <th style={{ width: "9%", textAlign: "right" }}>Số lượng</th>
                                            <th style={{ width: "16%" }}>Vị trí</th>
                                            <th style={{ width: "13%", textAlign: "right" }}>Đơn giá</th>
                                            <th style={{ width: "14%", textAlign: "right" }}>Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(receipt.details || []).map((d, idx) => (
                                            <tr key={d.id || idx}>
                                                <td className="rc-td-stt">{idx + 1}</td>
                                                <td style={{ fontWeight: 600, color: "#1E854A" }}>{d.itemcode}</td>
                                                <td>{d.itemname}</td>
                                                <td>
                                                    {d.batchCode || d.batchcode || batchCodeByDetailId[d.id]
                                                        ? (d.batchCode || d.batchcode || batchCodeByDetailId[d.id])
                                                        : <span style={{ fontStyle: "italic", color: "#8ba392", fontSize: "0.88em" }} title="Mã lô dự kiến (chưa xác nhận)">{previewBatchCode(d.itemcode, receipt.docDate)}</span>
                                                    }
                                                </td>
                                                <td>{d.unitof}</td>
                                                <td className="rc-td-num">{d.quantity}</td>
                                                <td style={{ color: "#1E854A", fontWeight: 500 }}>{d.locationcode || d.locationId}</td>
                                                <td className="rc-td-num">{formatMoney(d.unitprice)}</td>
                                                <td className="rc-td-num" style={{ fontWeight: 500 }}>{formatMoney(d.amount || (d.quantity || 0) * (d.unitprice || 0))}</td>
                                            </tr>
                                        ))}
                                        {(!receipt.details || receipt.details.length === 0) && (
                                            <tr><td colSpan={9} style={{ textAlign: "center", color: "#8ba392", padding: 16 }}>Không có dữ liệu chi tiết.</td></tr>
                                        )}
                                        {totalAmount > 0 && (
                                            <tr className="rc-total-row">
                                                <td colSpan={8} style={{ textAlign: "right", paddingRight: 12 }}>Tổng cộng</td>
                                                <td className="rc-td-num" style={{ textAlign: "right" }}>{formatMoney(totalAmount)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* ── Invoice section (display only) ── */}
                            <div className="rc-section-hd">Chi tiết</div>
                            <div className="rc-section-sub">Thông tin hóa đơn</div>
                            <div className="rc-form-2col">
                                <div className="rc-form-field">
                                    <label className="rc-form-label">MST</label>
                                    <input className="rc-form-input" value={receipt.customerTaxcode || receipt.taxcode || ""} readOnly />
                                </div>
                                <div className="rc-form-field">
                                    <label className="rc-form-label">Ngày HD</label>
                                    <input className="rc-form-input" value={formatDate(receipt.invoiceDate || receipt.docDate || "")} readOnly />
                                </div>
                            </div>
                            <div className="rc-form-2col">
                                <div className="rc-form-field">
                                    <label className="rc-form-label">Số hóa đơn</label>
                                    <input className="rc-form-input" value={receipt.invoiceNo || receipt.invoiceNumber || receipt.invoiceNum || ""} readOnly />
                                </div>
                                <div className="rc-form-field">
                                    <label className="rc-form-label">Tên NCC/Khách hàng</label>
                                    <input className="rc-form-input" value={receipt.supplierName || receipt.customerName || ""} readOnly />
                                </div>
                            </div>

                            {/* ── Actions ── */}
                            <div className="rc-form-actions">
                                <button className="rc-btn-template" onClick={handleExportPdf}>Xuất PDF</button>
                                <button className="sp-btn-outline" onClick={() => navigate("/receipts")}>Quay lại</button>
                                {receipt.docstatus === "DRAFT" && (
                                    <button className="sp-btn-primary" onClick={() => navigate(`/receipts/create?id=${receipt.id}`)}>
                                        Cập nhật
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
