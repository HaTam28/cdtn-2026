export const AUDIT_STATUS_LABELS = {
    DRAFT: "Nháp",
    REQUESTED: "Đã giao",
    IN_PROGRESS: "Đang kiểm kê",
    SUBMITTED: "Chờ duyệt",
    PENDING_PROCESS: "Có chênh lệch",
    PROCESSED: "Đã xử lý chênh lệch",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
    REJECTED: "Bị từ chối",
    OVERDUE: "Quá hạn",
};

export const AUDIT_STATUS_BADGE = {
    DRAFT: "rc-badge au-badge-draft",
    REQUESTED: "rc-badge au-badge-requested",
    IN_PROGRESS: "rc-badge au-badge-in-progress",
    SUBMITTED: "rc-badge au-badge-processed",
    PENDING_PROCESS: "rc-badge au-badge-processed",
    PROCESSED: "rc-badge au-badge-processed",
    CONFIRMED: "rc-badge au-badge-processed",
    CANCELLED: "rc-badge au-badge-cancelled",
    REJECTED: "rc-badge au-badge-rejected",
    OVERDUE: "rc-badge au-badge-overdue",
};

export const AUDIT_STATUS_PILL = {
    DRAFT: "rc-status-pill au-status-pill-draft",
    REQUESTED: "rc-status-pill au-status-pill-requested",
    IN_PROGRESS: "rc-status-pill au-status-pill-in-progress",
    SUBMITTED: "rc-status-pill au-status-pill-processed",
    PENDING_PROCESS: "rc-status-pill au-status-pill-processed",
    PROCESSED: "rc-status-pill au-status-pill-processed",
    CONFIRMED: "rc-status-pill au-status-pill-processed",
    CANCELLED: "rc-status-pill au-status-pill-cancelled",
    REJECTED: "rc-status-pill au-status-pill-rejected",
    OVERDUE: "rc-status-pill au-status-pill-overdue",
};

const DONE_STATUSES = new Set(["SUBMITTED", "PENDING_PROCESS", "PROCESSED", "CONFIRMED", "CANCELLED", "REJECTED"]);

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
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getAuditStartDate(audit) {
    return audit?.startDate || audit?.auditStartDate || audit?.fromDate || audit?.docDate || "";
}

export function getAuditEndDate(audit) {
    return audit?.endDate || audit?.auditEndDate || audit?.toDate || audit?.dueDate || "";
}

export function getDisplayStatus(audit) {
    const status = audit?.docstatus || audit?.status || "";
    const end = toInputDate(getAuditEndDate(audit));
    if (end && !DONE_STATUSES.has(status)) {
        const today = toInputDate(new Date());
        if (end < today) return "OVERDUE";
    }
    return status;
}

export function getSuggestion(diff) {
    if (diff === null || diff === undefined || diff === "") return "—";
    const num = Number(diff);
    if (num > 0) return "Tạo phiếu nhập";
    if (num < 0) return "Tạo phiếu xuất";
    return "Khớp sổ sách";
}

export function normalizeBatchRow(batch, idx = 0) {
    const batchCode = batch.batchCode ?? batch.batchcode ?? batch.nameBatch ?? "";
    const locationId = batch.locationId ?? batch.locationid ?? batch.location?.id ?? batch.warehouseLocationId ?? null;
    const locationcode = batch.locationcode ?? batch.locationCode ?? batch.location?.locationcode ?? batch.locationname ?? batch.locationName ?? "";
    const bookquantity = toNumber(batch.quantityRemaining ?? batch.remainingQuantity ?? batch.quantity ?? batch.qty ?? 0);

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
