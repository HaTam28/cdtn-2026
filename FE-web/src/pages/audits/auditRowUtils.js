export const AUDIT_STATUS_LABELS = {
    DRAFT: "Nháp",
    REQUESTED: "Chờ kiểm kê",
    IN_PROGRESS: "Chờ kiểm kê",
    SUBMITTED: "Chờ duyệt",
    PENDING_PROCESS: "Đã duyệt",
    PROCESSED: "Đã duyệt",
    CONFIRMED: "Đã duyệt",
    APPROVED: "Đã duyệt",
    CANCELLED: "Đã hủy",
    REJECTED: "Bị từ chối",
    OVERDUE: "Quá hạn",
};

export const AUDIT_STATUS_BADGE = {
    DRAFT: "rc-badge au-badge-draft",
    REQUESTED: "rc-badge au-badge-requested",
    IN_PROGRESS: "rc-badge au-badge-in-progress",
    SUBMITTED: "rc-badge au-badge-submitted",
    PENDING_PROCESS: "rc-badge au-badge-submitted",
    PROCESSED: "rc-badge au-badge-processed",
    CONFIRMED: "rc-badge au-badge-processed",
    APPROVED: "rc-badge au-badge-confirmed",
    CANCELLED: "rc-badge au-badge-cancelled",
    REJECTED: "rc-badge au-badge-rejected",
    OVERDUE: "rc-badge au-badge-overdue",
};

export const AUDIT_STATUS_PILL = {
    DRAFT: "rc-status-pill au-status-pill-draft",
    REQUESTED: "rc-status-pill au-status-pill-requested",
    IN_PROGRESS: "rc-status-pill au-status-pill-in-progress",
    SUBMITTED: "rc-status-pill au-status-pill-submitted",
    PENDING_PROCESS: "rc-status-pill au-status-pill-submitted",
    PROCESSED: "rc-status-pill au-status-pill-processed",
    CONFIRMED: "rc-status-pill au-status-pill-processed",
    APPROVED: "rc-status-pill au-status-pill-confirmed",
    CANCELLED: "rc-status-pill au-status-pill-cancelled",
    REJECTED: "rc-status-pill au-status-pill-rejected",
    OVERDUE: "rc-status-pill au-status-pill-overdue",
};

const OVERDUE_ELIGIBLE_STATUSES = new Set(["REQUESTED", "IN_PROGRESS", "SUBMITTED", "PENDING_PROCESS"]);

export function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "0";
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString("vi-VN") : "0";
}

export function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

export function toInputDate(value) {
    if (!value) return "";
    const raw = String(value);
    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDisplayDate(value) {
    const input = toInputDate(value);
    if (!input) return "";
    const [year, month, day] = input.split("-");
    if (!year || !month || !day) return String(value);
    return `${day}/${month}/${year}`;
}

export function getAuditStartDate(audit) {
    return audit?.startDate || audit?.auditStartDate || audit?.fromDate || audit?.docDate || "";
}

export function getAuditEndDate(audit) {
    return audit?.endDate || audit?.auditEndDate || audit?.toDate || audit?.dueDate || "";
}

export function getDisplayStatus(audit) {
    return audit?.docstatus || audit?.status || "";
}

export function getAuditWorkflowStatus(audit, details = audit?.details || []) {
    const raw = getDisplayStatus(audit);
    return raw;
}

export function getAuditRowTone(status, pendingAdjustment = false) {
    if (pendingAdjustment) return "au-row-pending-adjustment";
    if (status === "DRAFT") return "au-row-draft";
    if (status === "REQUESTED" || status === "IN_PROGRESS") return "au-row-active";
    if (status === "SUBMITTED" || status === "PENDING_PROCESS") return "au-row-review";
    if (status === "PROCESSED" || status === "CONFIRMED" || status === "APPROVED") return status === "PROCESSED" ? "au-row-processed" : "";
    if (status === "OVERDUE" || status === "REJECTED") return "au-row-danger";
    return "";
}

export function getSuggestion(diff) {
    if (diff === null || diff === undefined || diff === "") return "—";
    const num = Number(diff);
    if (num > 0) return "Tạo phiếu nhập";
    if (num < 0) return "Tạo phiếu xuất";
    return "Khớp sổ sách";
}

export function getAuditDetailKey(row) {
    return row?.id
        ? String(row.id)
        : `${row?.itemId || "item"}-${row?.batchId || "batch"}-${row?.locationId || "loc"}`;
}

export function getAdjustmentFlagKey(auditId, row, type) {
    return `audit_adj_${type}_detail_${auditId}_${getAuditDetailKey(row)}`;
}

export function isAdjustmentProcessed(auditId, row) {
    if (!auditId || !row || typeof localStorage === "undefined") return false;
    if (row.adjustmentCreated || row.processed || row.isProcessed) return true;
    const diff = toNumber(row.diffquantity, 0);
    const type = diff > 0 ? "receipt" : diff < 0 ? "issue" : null;
    if (!type) return true;
    return localStorage.getItem(getAdjustmentFlagKey(auditId, row, type)) === "1";
}

export function hasPendingAdjustment(auditId, details = []) {
    return details.some((row) => toNumber(row.diffquantity, 0) !== 0 && !isAdjustmentProcessed(auditId, row));
}

export function normalizeBatchRow(batch, idx = 0) {
    const batchCode = batch.batchCode ?? batch.batchcode ?? batch.nameBatch ?? "";
    const locationId = batch.locationId ?? batch.locationid ?? batch.location?.id ?? batch.warehouseLocationId ?? null;
    const locationcode = batch.locationcode ?? batch.locationCode ?? batch.location?.locationcode ?? batch.locationname ?? batch.locationName ?? "";
    const bookquantity = toNumber(batch.bookquantity ?? batch.systemQty ?? batch.quantityRemaining ?? batch.remainingQuantity ?? batch.quantity ?? batch.qty ?? 0);

    return {
        _id: `${(batch.id ?? batch.batchId ?? batchCode) || "batch"}-${locationId ?? "loc"}-${idx}`,
        itemId: batch.itemId ?? batch.itemid ?? null,
        itemcode: batch.itemcode ?? batch.itemCode ?? batch.code ?? "",
        itemname: batch.itemname ?? batch.itemName ?? batch.name ?? "",
        unitof: batch.unitof ?? batch.unitOf ?? batch.unit ?? "",
        batchId: batch.batchId ?? batch.id ?? null,
        batchCode,
        nameBatch: batch.nameBatch ?? batch.batchName ?? "",
        locationId,
        locationcode,
        locationname: batch.locationname ?? batch.locationName ?? batch.location?.locationname ?? "",
        bookquantity,
        actualquantity: batch.actualquantity ?? "",
        diffquantity: batch.diffquantity ?? null,
    };
}

export function makeRowsFromBatches(batches) {
    return (batches || [])
        .map(normalizeBatchRow)
        .filter((row) => row.itemId && Number(row.bookquantity) > 0);
}

export function makeRowsFromStockRows(stockRows) {
    return (stockRows || [])
        .map(normalizeBatchRow)
        .filter((row) => row.itemId && row.batchId && row.locationId && Number(row.bookquantity) > 0);
}

function normalizeDetailRow(detail, idx = 0, entry = null, batchCode = null) {
    const actual = entry ? entry.actualQty : detail.actualquantity;
    const book = entry ? entry.systemQty : (detail.bookquantity ?? detail.systemQty ?? detail.quantity);
    const diff = detail.diffquantity ?? (
        actual === null || actual === undefined || actual === "" ? null : toNumber(actual) - toNumber(book)
    );

    return {
        _id: `${detail.id ?? detail.itemId ?? "detail"}-${entry?.locationId ?? detail.locationId ?? "loc"}-${batchCode ?? detail.batchCode ?? idx}`,
        id: detail.id,
        itemId: detail.itemId ?? detail.itemid ?? null,
        itemcode: detail.itemcode ?? detail.itemCode ?? "",
        itemname: detail.itemname ?? detail.itemName ?? "",
        unitof: detail.unitof ?? detail.unitOf ?? detail.unit ?? "",
        batchId: detail.batchId ?? detail.batch?.id ?? null,
        batchCode: batchCode ?? detail.batchCode ?? detail.batchcode ?? detail.nameBatch ?? "",
        locationId: entry?.locationId ?? detail.locationId ?? detail.locationid ?? null,
        locationcode: entry?.locationcode ?? detail.locationcode ?? detail.locationCode ?? "",
        locationname: entry?.locationname ?? detail.locationname ?? detail.locationName ?? "",
        bookquantity: toNumber(book),
        actualquantity: actual ?? "",
        diffquantity: diff,
        description: detail.description || null,
    };
}

export function normalizeAuditDetails(details) {
    return (details || []).flatMap((detail, idx) => {
        if (detail.batchCode || detail.batchcode || detail.locationId || detail.locationcode) {
            return [normalizeDetailRow(detail, idx)];
        }
        if (Array.isArray(detail.locationEntries) && detail.locationEntries.length > 0) {
            return detail.locationEntries.flatMap((entry, entryIdx) => {
                const codes = entry.batchCodes?.length ? entry.batchCodes : [detail.batchCode || ""];
                return codes.map((code, codeIdx) => normalizeDetailRow(detail, `${idx}-${entryIdx}-${codeIdx}`, entry, code));
            });
        }
        return [normalizeDetailRow(detail, idx)];
    });
}

export function auditDetailPayload(row, includeActual = false) {
    const actual = row.actualquantity === "" || row.actualquantity === null || row.actualquantity === undefined
        ? null
        : Number(row.actualquantity);
    return {
        ...(row.id ? { id: Number(row.id) } : {}),
        itemId: Number(row.itemId),
        batchId: row.batchId ? Number(row.batchId) : null,
        locationId: row.locationId ? Number(row.locationId) : null,
        ...(row.batchId ? {} : { bookquantity: toNumber(row.bookquantity) }),
        ...(includeActual ? { actualquantity: actual } : {}),
        description: row.description || null,
    };
}
