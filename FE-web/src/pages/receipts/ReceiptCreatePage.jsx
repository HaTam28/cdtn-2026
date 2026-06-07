import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "../../styles/shared.css";
import "./receipts.css";
import { createReceipt, getAvailableLocations, getAllReceipts } from "../../api/receiptApi";
import { getAuditById } from "../../api/auditApi";
import { getAllCustomers } from "../../api/customerApi";
import { getAllItems } from "../../api/itemApi";
import { getAllBatches } from "../../api/batchApi";
import TopbarRight from "../../components/TopbarRight";
import { formatDateForDisplay, normalizeDateDisplayInput, parseDisplayDateToIso } from "../../utils/dateInput";

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _rowKey = 0;
const newRow = () => ({
    _id: ++_rowKey,
    itemId: "",
    itemcode: "",
    itemname: "",
    unitof: "",
    quantity: "",
    price: "",
    nameBatch: "",
    batchId: "",
    sourceBatchCode: "",
    inventoryAuditDetailId: "",
    selectedLocations: [], // [{locationId, locationcode, allocQty}]
});

function buildNextDocno(prefix, list) {
    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    const maxNum = (list || []).reduce((max, r) => {
        const m = String(r.docno || "").match(regex);
        if (!m) return max;
        const n = Number(m[1]);
        return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    const next = String(maxNum + 1).padStart(2, "0");
    return `${prefix}-${next}`;
}

function buildAllocations(entries, totalDiff) {
    const totalWeight = entries.reduce((sum, e) => sum + Number(e.actualQty || 0), 0);
    if (!totalWeight) return [];
    let remaining = totalDiff;
    return entries.map((e, idx) => {
        const weight = Number(e.actualQty || 0);
        const alloc = idx === entries.length - 1
            ? remaining
            : Math.max(0, Math.round((totalDiff * weight) / totalWeight));
        remaining -= alloc;
        return {
            locationId: e.locationId,
            locationcode: e.locationcode,
            allocQty: alloc,
        };
    }).filter((e) => e.allocQty > 0);
}

function formatMoney(n) {
    if (!n && n !== 0) return "";
    return Number(n).toLocaleString("vi-VN");
}
function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Batch name/code generator ───────────────────────────────────────────────
function toBatchSegment(str) {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\u0111]/g, "d").replace(/[\u0110]/g, "D")
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toUpperCase();
}

function buildNameBatch(itemcode) {
    // default kept for compatibility but ReceiptCreate will set 'L' as default
    if (!itemcode) return "";
    return `LO-HANG-${itemcode}`;
}

function buildBatchCode(nameBatch, dateStr, itemcode) {
    if (!dateStr || !itemcode) return "";
    const yyyymmdd = dateStr.replace(/-/g, "");
    // If nameBatch is the short default 'L' or empty, follow BE format: itemcode + date
    if (!nameBatch || String(nameBatch).trim().toUpperCase() === "L") {
        return `${toBatchSegment(itemcode)}${yyyymmdd}`;
    }
    return `${toBatchSegment(nameBatch)}-${yyyymmdd}-${toBatchSegment(itemcode)}`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconPlus({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
function IconTrash() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    );
}
function IconClose() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}
function IconChevron() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}
function IconCheck() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
function IconWarn() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

// ─── Location Picker Modal ────────────────────────────────────────────────────
function LocationModal({ open, onClose, onConfirm, loading, suggestions, quantity, rowName, currentLocations = [] }) {
    const [search, setSearch] = useState("");
    const [rackFilter, setRackFilter] = useState("Tất cả dãy");
    const [selected, setSelected] = useState(new Map()); // Map<locationId, allocQty>

    useEffect(() => {
        if (open) { setSearch(""); setRackFilter("Tất cả dãy"); setSelected(new Map()); }
    }, [open]);

    useEffect(() => {
        if (!open || loading || suggestions.length === 0 || currentLocations.length === 0) return;
        const next = new Map();
        let remainingQty = Number(quantity) || 0;
        currentLocations.forEach((loc) => {
            if (remainingQty <= 0) return;
            const found = suggestions.find((s) => String(s.locationId) === String(loc.locationId));
            if (!found) return;
            const cap = Number(found.remainingCapacity) || 0;
            const alloc = Math.min(Number(loc.allocQty) || 0, cap, remainingQty);
            if (alloc > 0) {
                next.set(found.locationId, alloc);
                remainingQty -= alloc;
            }
        });
        setSelected(next);
    }, [open, loading, suggestions, currentLocations, quantity]);

    if (!open) return null;

    const qty = Number(quantity) || 0;
    // New API: field names are remainingCapacity / usedCapacity
    const existingLocs = suggestions.filter((s) => s.type === "EXISTING");
    const emptyLocs = suggestions.filter((s) => s.type === "EMPTY");
    const partialLocs = suggestions.filter((s) => s.type === "PARTIAL");
    const totalAllocated = Array.from(selected.values()).reduce((a, b) => a + b, 0);
    const remaining = Math.max(0, qty - totalAllocated);
    const totalAvailable = suggestions.reduce((sum, s) => sum + (Number(s.remainingCapacity) || 0), 0);
    const totalShortfall = Math.max(0, qty - totalAvailable);
    const currentShortfalls = currentLocations
        .map((loc) => {
            const found = suggestions.find((s) => String(s.locationId) === String(loc.locationId));
            if (!found) return null;
            const requested = Number(loc.allocQty) || 0;
            const available = Number(found.remainingCapacity) || 0;
            const shortfall = Math.max(0, requested - available);
            if (shortfall <= 0) return null;
            return {
                code: found.locationcode || loc.locationcode || loc.locationId,
                requested,
                available,
                shortfall,
            };
        })
        .filter(Boolean);
    const pct = qty > 0 ? Math.min(100, Math.round((totalAllocated / qty) * 100)) : 0;

    const racks = ["Tất cả dãy", ...Array.from(new Set(
        suggestions.map((s) => (s.locationcode || "").split("-")[0]).filter(Boolean)
    ))];

    const filterLoc = (list) => list.filter((loc) => {
        const q = search.trim().toLowerCase();
        const matchSearch = !q || (loc.locationcode || "").toLowerCase().includes(q) || (loc.locationname || "").toLowerCase().includes(q);
        const matchRack = rackFilter === "Tất cả dãy" || (loc.locationcode || "").startsWith(rackFilter);
        return matchSearch && matchRack;
    });

    const handleToggle = (loc) => {
        const next = new Map(selected);
        if (next.has(loc.locationId)) {
            next.delete(loc.locationId);
        } else {
            const cap = Number(loc.remainingCapacity) || 0;
            const autoFill = Math.max(1, Math.min(cap, remaining));
            next.set(loc.locationId, autoFill);
        }
        setSelected(next);
    };

    const selectedEntries = Array.from(selected.entries());
    const canConfirm = remaining === 0 && selected.size > 0;

    const handleConfirm = () => {
        const locs = selectedEntries.map(([locationId, allocQty]) => {
            const found = suggestions.find((s) => s.locationId === locationId);
            return { locationId, locationcode: found?.locationcode || "", allocQty };
        });
        onConfirm(locs);
    };

    const renderRow = (loc, extraCol) => {
        const isSel = selected.has(loc.locationId);
        const cap = Number(loc.remainingCapacity) || 0;
        const isDisabled = !isSel && (remaining === 0 || cap === 0);
        return (
            <tr
                key={loc.locationId}
                className={isSel ? "rc-row-selected" : ""}
                onClick={isDisabled ? undefined : () => handleToggle(loc)}
                style={{ cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.32 : 1, transition: "opacity 0.15s" }}
            >
                <td><input type="checkbox" checked={isSel} disabled={isDisabled} onChange={() => { }} onClick={(e) => { e.stopPropagation(); if (!isDisabled) handleToggle(loc); }} /></td>
                {extraCol}
                <td>{loc.locationcode}</td>
                <td>{loc.capacity ?? "∞"}</td>
                <td>{cap}</td>
            </tr>
        );
    };

    return (
        <div className="rc-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rc-modal">
                <div className="rc-modal-header">
                    <span className="rc-modal-title">Chọn vị trí lưu trữ</span>
                    <button className="rc-modal-close" onClick={onClose}><IconClose /></button>
                </div>
                <div className="rc-modal-body">
                    {/* ── Allocation progress bar ── */}
                    <div style={{ background: "#f3faf6", border: "1px solid #c6dfd0", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem", color: "#4c6152", marginBottom: 6 }}>
                            <span>Tổng cần nhập: <strong style={{ color: "#1E3A2F" }}>{qty}</strong></span>
                            <span>Đã phân bổ: <strong style={{ color: "#1E854A" }}>{totalAllocated}</strong></span>
                            <span>Còn lại: <strong style={{ color: remaining > 0 ? "#e65100" : "#1E854A" }}>{remaining}</strong></span>
                        </div>
                        <div style={{ background: "#d4edda", borderRadius: 4, height: 8, overflow: "hidden" }}>
                            <div style={{ background: remaining === 0 ? "#2DBE60" : "#f9a825", width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 0.2s" }} />
                        </div>
                        {totalShortfall > 0 && qty > 0 && suggestions.length > 0 && (
                            <div style={{ marginTop: 6, fontSize: "0.8rem", color: "#e65100", display: "flex", alignItems: "center", gap: 4 }}>
                                <IconWarn /> Tổng sức chứa còn trống chỉ {formatMoney(totalAvailable)} — còn thiếu {formatMoney(totalShortfall)}.
                            </div>
                        )}
                        {totalShortfall === 0 && currentShortfalls.map((item) => (
                            <div key={item.code} style={{ marginTop: 6, fontSize: "0.8rem", color: "#e65100", display: "flex", alignItems: "center", gap: 4 }}>
                                <IconWarn /> Vị trí {item.code} chỉ còn trống {formatMoney(item.available)}, thiếu {formatMoney(item.shortfall)} so với số lượng cần nhập {formatMoney(item.requested)}. Có thể chọn thêm vị trí khác, mã lô điều chỉnh vẫn giữ nguyên.
                            </div>
                        ))}
                        {totalShortfall === 0 && remaining > 0 && qty > 0 && suggestions.length > 0 && !suggestions.some((s) => (Number(s.remainingCapacity) || 0) >= qty) && (
                            <div style={{ marginTop: 6, fontSize: "0.8rem", color: "#e65100", display: "flex", alignItems: "center", gap: 4 }}>
                                <IconWarn /> Không có một vị trí đủ chứa toàn bộ — vui lòng chọn nhiều vị trí để phân bổ đủ.
                            </div>
                        )}
                    </div>

                    <div className="rc-modal-search-row">
                        <input className="rc-modal-search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                        <select className="rc-modal-row-select" value={rackFilter} onChange={(e) => setRackFilter(e.target.value)}>
                            {racks.map((r) => <option key={r}>{r}</option>)}
                        </select>
                    </div>

                    {loading && <div style={{ textAlign: "center", color: "#8ba392", padding: "20px 0" }}>Đang tải gợi ý vị trí...</div>}
                    {!loading && suggestions.length === 0 && (
                        <div style={{ textAlign: "center", color: "#e57373", padding: "16px 0" }}>Không có vị trí phù hợp.</div>
                    )}

                    {/* EXISTING locations */}
                    {!loading && filterLoc(existingLocs).length > 0 && (
                        <>
                            <div className="rc-modal-section-hd">Vị trí hiện tại của vật tư</div>
                            <table className="rc-modal-table">
                                <thead><tr>
                                    <th style={{ width: 36 }} />
                                    <th>Mã vật tư</th><th>Vị trí</th><th>Sức chứa</th><th>Còn trống</th>
                                </tr></thead>
                                <tbody>
                                    {filterLoc(existingLocs).map((loc) =>
                                        renderRow(loc, <td style={{ fontWeight: 600, color: "#1E854A" }}>{rowName}</td>)
                                    )}
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* EMPTY locations */}
                    {!loading && filterLoc(emptyLocs).length > 0 && (
                        <>
                            <div className="rc-modal-section-hd">Các vị trí trống khác</div>
                            <table className="rc-modal-table">
                                <thead><tr>
                                    <th style={{ width: 36 }} />
                                    <th>Vị trí</th><th>Sức chứa</th><th>Còn trống</th>
                                </tr></thead>
                                <tbody>
                                    {filterLoc(emptyLocs).map((loc) => renderRow(loc, null))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* PARTIAL locations */}
                    {!loading && filterLoc(partialLocs).length > 0 && (
                        <>
                            <div className="rc-modal-section-hd" style={{ color: "#8b7020" }}>Vị trí có hàng khác (còn chỗ)</div>
                            <table className="rc-modal-table">
                                <thead><tr>
                                    <th style={{ width: 36 }} />
                                    <th>Vị trí</th><th>Sức chứa</th><th>Còn trống</th>
                                </tr></thead>
                                <tbody>
                                    {filterLoc(partialLocs).map((loc) => renderRow(loc, null))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {!loading && selected.size > 0 && (
                        <div className={`rc-modal-msg ${remaining === 0 ? "rc-modal-msg-ok" : "rc-modal-msg-warn"}`}>
                            {remaining === 0
                                ? <><IconCheck /> Đã đủ số lượng nhập. Nhấn Xác nhận để hoàn tất.</>
                                : <><IconWarn /> Còn thiếu {remaining} — chọn thêm vị trí hoặc tăng số lượng phân bổ.</>}
                        </div>
                    )}
                </div>
                <div className="rc-modal-footer">
                    <span className="rc-modal-selected-info">
                        {selected.size > 0
                            ? `Đã chọn: ${Array.from(selected.entries()).map(([id, q]) => { const loc = suggestions.find((s) => s.locationId === id); return `${loc?.locationcode || id}(${q} cái)`; }).join(", ")}`
                            : "Chưa chọn vị trí nào"}
                    </span>
                    <button className="sp-btn-outline" onClick={onClose}>Hủy bỏ</button>
                    <button className="sp-btn-primary" onClick={handleConfirm} disabled={!canConfirm}>Xác nhận</button>
                </div>
            </div>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export default function ReceiptCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [form, setForm] = useState({ date: todayStr(), docno: "", customerId: "", address: "", description: "", docType: "NORMAL" });
    const [rows, setRows] = useState([newRow()]);
    const [invoice, setInvoice] = useState({ date: "", taxcode: "", number: "", supplierId: "" });
    const [dateDisplay, setDateDisplay] = useState({
        docDate: formatDateForDisplay(todayStr()),
        invoiceDate: "",
    });
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [locModal, setLocModal] = useState({ open: false, rowIdx: null, suggestions: [], loading: false });
    const [prefilledFromAudit, setPrefilledFromAudit] = useState(false);
    const [prefilledFromClone, setPrefilledFromClone] = useState(false);
    const [prefilledFromOverview, setPrefilledFromOverview] = useState(false);
    const [auditSource, setAuditSource] = useState(null);
    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [cList, iList, rList] = await Promise.all([getAllCustomers(), getAllItems(), getAllReceipts()]);
            setCustomers(cList);
            setItems(iList);
            setForm((prev) => ({
                ...prev,
                docno: prev.docno || buildNextDocno("PN", rList),
            }));
        } catch { /* non-blocking */ } finally { setLoadingData(false); }
    }, []);
    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const paramType = searchParams.get("docType");
        if (paramType === "NORMAL" || paramType === "ADJUSTMENT") {
            setForm((prev) => ({ ...prev, docType: paramType }));
        }
    }, [searchParams]);

    useEffect(() => {
        const prefillItems = location.state?.prefillItems;
        if (!prefillItems || prefilledFromOverview || prefilledFromClone || prefilledFromAudit) return;
        const rowsFromOverview = (prefillItems || []).map((item) => ({
            ...newRow(),
            itemId: item.itemId || "",
            itemcode: item.itemcode || "",
            itemname: item.itemname || "",
            unitof: item.unitof || "",
            quantity: item.quantity != null ? String(item.quantity) : "",
            price: "",
            nameBatch: "L",
            selectedLocations: [],
        }));
        if (rowsFromOverview.length > 0) setRows(rowsFromOverview);
        setForm((prev) => ({
            ...prev,
            description: prev.description || "Nhập hàng bổ sung từ tổng quan",
            docType: prev.docType || "NORMAL",
        }));
        setPrefilledFromOverview(true);
    }, [location.state, prefilledFromOverview, prefilledFromClone, prefilledFromAudit]);

    useEffect(() => {
        const clone = location.state?.clone;
        if (!clone || prefilledFromClone) return;
        const toDateOnly = (val) => (val ? String(val).slice(0, 10) : "");
        const rowsFromClone = (clone.details || []).map((d) => ({
            ...newRow(),
            itemId: d.itemId ?? d.itemid ?? "",
            itemcode: d.itemcode || "",
            itemname: d.itemname || "",
            unitof: d.unitof || "",
            quantity: d.quantity != null ? String(d.quantity) : d.qty != null ? String(d.qty) : "",
            price: d.unitprice != null ? String(d.unitprice) : d.price != null ? String(d.price) : "",
            nameBatch: d.nameBatch || d.batchCode || "L",
            selectedLocations: [],
        }));
        if (rowsFromClone.length > 0) setRows(rowsFromClone);
        const cloneDocDate = toDateOnly(clone.docDate);
        const cloneInvoiceDate = toDateOnly(clone.invoiceDate);
        setForm((prev) => ({
            ...prev,
            date: cloneDocDate || prev.date,
            customerId: clone.customerId || "",
            address: clone.address || "",
            description: clone.description || "",
            docType: clone.docType || prev.docType || "NORMAL",
        }));
        setInvoice((prev) => ({
            ...prev,
            date: cloneInvoiceDate,
            taxcode: clone.taxcode || clone.customerTaxcode || prev.taxcode,
            number: clone.invoiceNo || clone.invoiceNumber || "",
            supplierId: clone.customerId || prev.supplierId,
        }));
        setDateDisplay((prev) => ({
            ...prev,
            docDate: formatDateForDisplay(cloneDocDate || form.date),
            invoiceDate: formatDateForDisplay(cloneInvoiceDate),
        }));
        setPrefilledFromClone(true);
        setPrefilledFromAudit(true);
    }, [location.state, prefilledFromClone]);

    useEffect(() => {
        const auditId = searchParams.get("auditId");
        const auditDetailId = searchParams.get("auditDetailId");
        if (!auditId || prefilledFromAudit) return;
        const fillFromAudit = async () => {
            try {
                const [data, batchList] = await Promise.all([getAuditById(auditId), getAllBatches()]);
                // Build map: itemId -> unitCost from existing batches
                const unitCostByItem = {};
                (batchList || []).forEach((b) => {
                    const key = String(b.itemId);
                    if (!unitCostByItem[key] && b.unitCost) unitCostByItem[key] = String(b.unitCost);
                });
                const rowsFromAudit = (data.details || [])
                    .filter((d) => Number(d.diffquantity) > 0)
                    .filter((d) => !auditDetailId || String(d.id) === String(auditDetailId))
                    .map((d) => {
                        const diff = Number(d.diffquantity || 0);
                        const entries = d.locationEntries || [];
                        const selectedLocations = d.locationId
                            ? [{ locationId: d.locationId, locationcode: d.locationcode || d.locationname || "", allocQty: diff }]
                            : entries.length > 0 ? buildAllocations(entries, diff) : [];
                        return {
                            ...newRow(),
                            itemId: d.itemId,
                            itemcode: d.itemcode,
                            itemname: d.itemname,
                            unitof: d.unitof,
                            quantity: String(diff),
                            price: unitCostByItem[String(d.itemId)] || "",
                            nameBatch: d.batchCode || "L",
                            batchId: d.batchId || "",
                            sourceBatchCode: d.batchCode || "",
                            inventoryAuditDetailId: d.id,
                            selectedLocations,
                        };
                    });
                if (rowsFromAudit.length > 0) {
                    setRows(rowsFromAudit);
                    validateAdjustmentCapacity(rowsFromAudit);
                }
                setForm((prev) => ({
                    ...prev,
                    docType: "ADJUSTMENT",
                    description: prev.description || `Nguồn tạo từ phiếu kiểm kê ${data.docno}`,
                }));
                setAuditSource({ id: data.id, docno: data.docno });
                setPrefilledFromAudit(true);
            } catch {
                setPrefilledFromAudit(true);
            }
        };
        fillFromAudit();
    }, [searchParams, prefilledFromAudit]);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isManager = user?.role && user.role !== "STAFF";
    const isAdjustment = form.docType === "ADJUSTMENT";

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const handleFormChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
    const handleDocDateChange = (value) => {
        const display = normalizeDateDisplayInput(value);
        setDateDisplay((prev) => ({ ...prev, docDate: display }));
        setForm((prev) => ({ ...prev, date: parseDisplayDateToIso(display) }));
    };

    const handleCustomerChange = (customerId) => {
        const found = customers.find((c) => String(c.id) === String(customerId));
        setForm((prev) => ({ ...prev, customerId, address: found?.address || "" }));
        if (found) setInvoice((prev) => ({ ...prev, taxcode: found.taxcode || "", supplierId: customerId }));
    };

    const handleInvoiceChange = (field, value) => setInvoice((prev) => ({ ...prev, [field]: value }));
    const handleInvoiceDateChange = (value) => {
        const display = normalizeDateDisplayInput(value);
        setDateDisplay((prev) => ({ ...prev, invoiceDate: display }));
        setInvoice((prev) => ({ ...prev, date: parseDisplayDateToIso(display) }));
    };

    const handleRowChange = (idx, field, value) => {
        setRows((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            if (field === "itemId") {
                const found = items.find((it) => String(it.id) === String(value));
                next[idx].itemcode = found?.itemcode || "";
                next[idx].itemname = found?.itemname || "";
                next[idx].unitof = found?.unitof || "";
                // Default batch name per requirement: 'L'
                next[idx].nameBatch = "L";
                next[idx].batchId = "";
                next[idx].sourceBatchCode = "";
                next[idx].selectedLocations = [];
            }
            return next;
        });
    };

    const handleAddRow = () => setRows((prev) => [...prev, newRow()]);
    const handleRemoveRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

    const openLocationModal = async (idx) => {
        const row = rows[idx];
        if (!row.itemId) { showToast("error", "Vui lòng chọn mặt hàng trước."); return; }
        if (!row.quantity || Number(row.quantity) <= 0) { showToast("error", "Vui lòng nhập số lượng trước."); return; }
        setLocModal({ open: true, rowIdx: idx, suggestions: [], loading: true });
        try {
            const data = await getAvailableLocations(row.itemId);
            // Subtract allocations already selected in other rows so remainingCapacity reflects current form state
            const adjusted = (data || []).map((loc) => {
                const alreadyAllocated = rows.reduce((sum, r, i) => {
                    if (i === idx) return sum; // ignore current row
                    const alloc = (r.selectedLocations || []).reduce((s, l) => s + (Number(l.allocQty) || 0) * (String(l.locationId) === String(loc.locationId) ? 1 : 0), 0);
                    return sum + alloc;
                }, 0);
                return {
                    ...loc,
                    remainingCapacity: Math.max(0, (Number(loc.remainingCapacity) || 0) - alreadyAllocated),
                };
            });
            setLocModal((prev) => ({ ...prev, suggestions: adjusted, loading: false }));
        } catch {
            setLocModal((prev) => ({ ...prev, suggestions: [], loading: false }));
            showToast("error", "Không thể tải gợi ý vị trí.");
        }
    };

    const handleLocConfirm = (locs) => {
        const idx = locModal.rowIdx;
        setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], selectedLocations: locs }; return next; });
        setLocModal({ open: false, rowIdx: null, suggestions: [], loading: false });
    };

    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0);

    const validateAdjustmentCapacity = async (targetRows = rows) => {
        const allocationsByItem = new Map();
        targetRows.forEach((row) => {
            (row.selectedLocations || []).forEach((loc) => {
                const key = String(row.itemId);
                const list = allocationsByItem.get(key) || [];
                list.push({
                    locationId: loc.locationId,
                    locationcode: loc.locationcode,
                    quantity: Number(loc.allocQty) || 0,
                });
                allocationsByItem.set(key, list);
            });
        });

        for (const [itemId, allocations] of allocationsByItem.entries()) {
            const locations = await getAvailableLocations(itemId);
            const availableByLocation = new Map((locations || []).map((loc) => [String(loc.locationId), loc]));
            const totalsByLocation = new Map();
            allocations.forEach((loc) => {
                const key = String(loc.locationId);
                const current = totalsByLocation.get(key) || { ...loc, quantity: 0 };
                current.quantity += loc.quantity;
                totalsByLocation.set(key, current);
            });

            for (const loc of totalsByLocation.values()) {
                const available = availableByLocation.get(String(loc.locationId));
                const remaining = available?.remainingCapacity;
                if (remaining !== null && remaining !== undefined && Number(remaining) < loc.quantity) {
                    const code = loc.locationcode || available?.locationcode || loc.locationId;
                    const shortfall = Math.max(0, loc.quantity - Number(remaining || 0));
                    showToast("error", `Vị trí ${code} chỉ còn trống ${formatMoney(remaining || 0)}, thiếu ${formatMoney(shortfall)} sản phẩm.`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!form.date) { showToast("error", "Vui lòng chọn ngày."); return; }
        if (!form.docno.trim()) { showToast("error", "Vui lòng nhập số chứng từ."); return; }
        if (!isAdjustment && !form.customerId) { showToast("error", "Vui lòng chọn đối tượng."); return; }
        if (!isAdjustment && !invoice.date) { showToast("error", "Vui lòng chọn ngày hóa đơn."); return; }
        if (!isAdjustment && (!invoice.number || !String(invoice.number).trim())) { showToast("error", "Vui lòng nhập số hóa đơn."); return; }
        if (rows.length === 0) { showToast("error", "Vui lòng thêm ít nhất một dòng vật tư."); return; }
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r.itemId) { showToast("error", `Dòng ${i + 1}: Vui lòng chọn mặt hàng.`); return; }
            if (!r.quantity || Number(r.quantity) <= 0) { showToast("error", `Dòng ${i + 1}: Số lượng không hợp lệ.`); return; }
            if (!r.price || Number(r.price) <= 0) { showToast("error", `Dòng ${i + 1}: Đơn giá phải lớn hơn 0.`); return; }
            if (r.selectedLocations.length === 0) { showToast("error", `Dòng ${i + 1}: Vui lòng chọn vị trí lưu trữ.`); return; }
            if (isAdjustment && !r.batchId) { showToast("error", `Dòng ${i + 1}: Thiếu mã lô điều chỉnh từ kiểm kê.`); return; }
            if (isAdjustment && !r.inventoryAuditDetailId) { showToast("error", `Dòng ${i + 1}: Thiếu liên kết chi tiết kiểm kê.`); return; }
        }
        if (isAdjustment && !(await validateAdjustmentCapacity())) return;
        const details = rows.flatMap((r) =>
            r.selectedLocations.map((loc) => ({
                itemId: Number(r.itemId),
                locationId: Number(loc.locationId),
                quantity: Number(loc.allocQty),
                unitprice: Number(r.price),
                ...(isAdjustment && r.batchId ? { batchId: Number(r.batchId) } : {}),
                ...(isAdjustment && r.inventoryAuditDetailId ? { inventoryAuditDetailId: Number(r.inventoryAuditDetailId) } : {}),
            }))
        );
        setSaving(true);
        const adjAuditId = searchParams.get("auditId");
        const adjAuditDetailId = searchParams.get("auditDetailId");
        try {
            const payload = {
                docno: form.docno.trim(),
                docDate: form.date,
                description: form.description.trim(),
                doctype: form.docType,
                docstatus: isManager ? "CONFIRMED" : "DRAFT",
                ...(adjAuditId ? { inventoryAuditId: Number(adjAuditId) } : {}),
                details,
            };
            if (!isAdjustment) {
                payload.customerId = Number(form.customerId);
                payload.invoiceDate = invoice.date || undefined;
                payload.taxcode = invoice.taxcode || undefined;
                payload.invoiceNumber = invoice.number || undefined;
                payload.supplierId = invoice.supplierId ? Number(invoice.supplierId) : undefined;
            }
            const result = await createReceipt(payload);
            if (result?.success) {
                showToast("success", "Tạo phiếu nhập kho thành công!");
                // Lưu ID phiếu để AuditDetailPage kiểm tra status sau này
                if (adjAuditId && form.docType === "ADJUSTMENT" && result?.data?.id) {
                    localStorage.setItem(`audit_adj_receipt_id_${adjAuditId}`, String(result.data.id));
                    if (adjAuditDetailId) {
                        localStorage.setItem(`audit_adj_receipt_detail_${adjAuditId}_${adjAuditDetailId}`, "1");
                        localStorage.setItem(`audit_adj_receipt_detail_doc_${adjAuditId}_${adjAuditDetailId}`, String(result.data.id));
                    }
                }
                setTimeout(() => navigate("/receipts"), 1200);
            } else {
                showToast("error", result?.message || "Tạo phiếu thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra khi tạo phiếu nhập kho.");
        } finally { setSaving(false); }
    };

    return (
        <>
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
                            <span className="sp-breadcrumb-active">Thêm mới phiếu nhập kho</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                <div className="sp-content">
                    <h1 className="sp-title">Phiếu nhập kho</h1>
                    <div className="rc-form-card">

                        {/* ── Header row ── */}
                        <div className="rc-header-row">
                            <label className="rc-form-label">Ngày<span className="rc-required">*</span></label>
                            <input
                                className="rc-form-input"
                                style={{ minWidth: 150 }}
                                placeholder="dd/mm/yyyy"
                                value={dateDisplay.docDate}
                                onChange={(e) => handleDocDateChange(e.target.value)}
                            />
                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Số<span className="rc-required">*</span></label>
                            <input className="rc-form-input" style={{ minWidth: 200 }} placeholder="Nhập số chứng từ" value={form.docno} onChange={(e) => handleFormChange("docno", e.target.value)} />
                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Loại</label>
                            <select className="rc-form-select" value={form.docType} onChange={(e) => handleFormChange("docType", e.target.value)}>
                                <option value="NORMAL">Thông thường</option>
                                <option value="ADJUSTMENT">Điều chỉnh</option>
                            </select>
                            {isAdjustment && auditSource?.docno && (
                                <>
                                    <label className="rc-form-label" style={{ marginLeft: 16 }}>Phiếu kiểm kê</label>
                                    <input className="rc-form-input" style={{ minWidth: 160 }} value={auditSource.docno} readOnly />
                                </>
                            )}
                        </div>

                        {/* ── Đối tượng ── */}
                        {!isAdjustment && (
                            <div className="rc-form-row">
                                <label className="rc-form-label">Đối tượng<span className="rc-required">*</span></label>
                                <select className="rc-form-select rc-form-full" value={form.customerId} onChange={(e) => handleCustomerChange(e.target.value)} disabled={loadingData}>
                                    <option value="">Chọn đối tượng</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.customercode ? `${c.customercode}: ` : ""}{c.customername}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* ── Địa chỉ ── */}
                        {!isAdjustment && (
                            <div className="rc-form-row">
                                <label className="rc-form-label">Địa chỉ</label>
                                <input className="rc-form-input rc-form-full" placeholder="Nhập địa chỉ" value={form.address} onChange={(e) => handleFormChange("address", e.target.value)} />
                            </div>
                        )}

                        {/* ── Diễn giải ── */}
                        <div className="rc-form-row">
                            <label className="rc-form-label">Diễn giải</label>
                            <input className="rc-form-input rc-form-full" placeholder="Nhập diễn giải" value={form.description} onChange={(e) => handleFormChange("description", e.target.value)} />
                        </div>

                        {/* ── Detail table ── */}
                        <div className="rc-detail-table-wrap">
                            <table className="rc-detail-table">
                                <thead>
                                    <tr>
                                        <th className="rc-td-stt" style={{ width: 36 }}>STT</th>
                                        <th style={{ width: "9%" }}>Mã hàng<span className="rc-required">*</span></th>
                                        <th style={{ width: "16%" }}>Tên vật tư hàng hóa</th>
                                        <th style={{ width: "15%" }}>Mã lô</th>
                                        <th style={{ width: "7%" }}>ĐVT</th>
                                        <th style={{ width: "7%" }}>SL<span className="rc-required">*</span></th>
                                        <th style={{ width: "12%" }}>Vị trí<span className="rc-required">*</span></th>
                                        <th style={{ width: "9%" }}>Đơn giá<span className="rc-required">*</span></th>
                                        <th style={{ width: "10%" }}>Thành tiền</th>
                                        <th style={{ width: 32 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => {
                                        const amount = (Number(row.quantity) || 0) * (Number(row.price) || 0);
                                        const locLabel = row.selectedLocations.map((l) => l.locationcode).join(" / ");
                                        return (
                                            <tr key={row._id}>
                                                <td className="rc-td-stt">{idx + 1}</td>
                                                <td>
                                                    <select className="rc-td-select" value={row.itemId} onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}>
                                                        <option value="">--</option>
                                                        {items.map((it) => <option key={it.id} value={it.id}>{it.itemcode}</option>)}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input className="rc-td-input" value={row.itemname} readOnly style={{ background: "#f6fbf8", color: "#4c6152" }} placeholder="Tên vật tư" />
                                                </td>
                                                <td>
                                                    <input
                                                        className="rc-td-input rc-batch-code-preview"
                                                        readOnly
                                                        value={isAdjustment ? (row.sourceBatchCode || row.nameBatch || "—") : buildBatchCode(row.nameBatch, form.date, row.itemcode)}
                                                        placeholder="Auto"
                                                    />
                                                </td>
                                                <td>
                                                    <input className="rc-td-input" value={row.unitof} readOnly style={{ background: "#f6fbf8", color: "#4c6152" }} />
                                                </td>
                                                <td>
                                                    <input type="number" className="rc-td-input" min="1" value={row.quantity}
                                                        onChange={(e) => {
                                                            setRows((prev) => {
                                                                const next = [...prev];
                                                                next[idx] = { ...next[idx], quantity: e.target.value, selectedLocations: [] };
                                                                return next;
                                                            });
                                                        }} placeholder="0" />
                                                </td>
                                                <td>
                                                    <button type="button" className={`rc-loc-btn${row.selectedLocations.length > 0 ? " rc-loc-btn-set" : ""}`} onClick={() => openLocationModal(idx)}>
                                                        {row.selectedLocations.length > 0 ? locLabel : "Chọn vị trí"} <IconChevron />
                                                    </button>
                                                </td>
                                                <td>
                                                    <input type="number" className="rc-td-input" min="0.01" step="0.01" value={row.price} onChange={(e) => handleRowChange(idx, "price", e.target.value)} placeholder="0" />
                                                </td>
                                                <td className="rc-td-num" style={{ textAlign: "right", fontWeight: 500 }}>
                                                    {amount > 0 ? formatMoney(amount) : ""}
                                                </td>
                                                <td>
                                                    {rows.length > 1 && (
                                                        <button className="rc-del-btn" onClick={() => handleRemoveRow(idx)} title="Xóa dòng"><IconTrash /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="rc-add-row" onClick={handleAddRow}>
                                        <td colSpan={10}>
                                            <button className="rc-add-row-btn" type="button">
                                                <IconPlus size={13} /> Thêm mới dữ liệu
                                            </button>
                                        </td>
                                    </tr>
                                    {totalAmount > 0 && (
                                        <tr className="rc-total-row">
                                            <td colSpan={8} style={{ textAlign: "right", paddingRight: 12 }}>Tổng cộng</td>
                                            <td className="rc-td-num" style={{ textAlign: "right" }}>{formatMoney(totalAmount)}</td>
                                            <td />
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!isAdjustment && (
                            <>
                                {/* ── Invoice section ── */}
                                <div className="rc-section-hd">Chi tiết</div>
                                <div className="rc-section-sub">Thông tin hóa đơn</div>
                                <div className="rc-form-2col">
                                    <div className="rc-form-field">
                                        <label className="rc-form-label">Ngày HD<span className="rc-required">*</span></label>
                                        <input
                                            className="rc-form-input"
                                            placeholder="dd/mm/yyyy"
                                            value={dateDisplay.invoiceDate}
                                            onChange={(e) => handleInvoiceDateChange(e.target.value)}
                                        />
                                    </div>
                                    <div className="rc-form-field">
                                        <label className="rc-form-label">MST</label>
                                        <input className="rc-form-input" placeholder="Nhập mã số thuế" value={invoice.taxcode} onChange={(e) => handleInvoiceChange("taxcode", e.target.value)} />
                                    </div>
                                </div>
                                <div className="rc-form-2col">
                                    <div className="rc-form-field">
                                        <label className="rc-form-label">Số hóa đơn<span className="rc-required">*</span></label>
                                        <input className="rc-form-input" placeholder="Nhập số hóa đơn" value={invoice.number} onChange={(e) => handleInvoiceChange("number", e.target.value)} />
                                    </div>
                                    <div className="rc-form-field">
                                        <label className="rc-form-label">Tên NCC</label>
                                        <select className="rc-form-select" value={invoice.supplierId} onChange={(e) => handleInvoiceChange("supplierId", e.target.value)}>
                                            <option value="">Chọn tên nhà cung cấp</option>
                                            {customers.filter((c) => c.issupplier).map((c) => (
                                                <option key={c.id} value={c.id}>{c.customername}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Actions ── */}
                        <div className="rc-form-actions">
                            <button className="sp-btn-outline" onClick={() => navigate("/receipts")} disabled={saving}>Hủy bỏ</button>
                            <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? "Đang lưu..." : "Lưu"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <LocationModal
                open={locModal.open}
                onClose={() => setLocModal({ open: false, rowIdx: null, suggestions: [], loading: false })}
                onConfirm={handleLocConfirm}
                loading={locModal.loading}
                suggestions={locModal.suggestions}
                quantity={locModal.rowIdx !== null ? rows[locModal.rowIdx]?.quantity || 0 : 0}
                rowName={locModal.rowIdx !== null ? rows[locModal.rowIdx]?.itemcode || "" : ""}
                currentLocations={locModal.rowIdx !== null ? rows[locModal.rowIdx]?.selectedLocations || [] : []}
            />
        </>
    );
}
