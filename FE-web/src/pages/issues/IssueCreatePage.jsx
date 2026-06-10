import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./issues.css";
import { createIssue, getAvailableLocations, getAllIssues } from "../../api/issueApi";
import { getAuditById } from "../../api/auditApi";
import { getAllCustomers } from "../../api/customerApi";
import { getAllItems } from "../../api/itemApi";
import { getAllBatches } from "../../api/batchApi";
import TopbarRight from "../../components/TopbarRight";
import { formatDateForDisplay, normalizeDateDisplayInput, parseDisplayDateToIso } from "../../utils/dateInput";
import { useDraft } from "../../utils/useDraft";
import DraftBanner from "../../components/DraftBanner";

const DRAFT_KEY = "draft_issue_create";

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _rowKey = 0;
const newRow = () => ({
    _id: ++_rowKey,
    itemId: "",
    itemcode: "",
    itemname: "",
    unitof: "",
    quantity: "",       // required total quantity for this item
    price: "",          // unit price
    inventoryAuditDetailId: "",
    batchEntries: [],   // [{_id, batchId, batchCode, locationId, locationcode, remainingStock, quantity, unitCost}]
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

function calcSalePrice(unitCost) {
    const cost = Number(unitCost);
    if (!cost) return "";
    return String(cost);
}

function formatMoney(n) {
    if (!n && n !== 0) return "";
    return Number(n).toLocaleString("vi-VN");
}
function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
function IconChevron() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

// ─── Batch Picker Modal ────────────────────────────────────────────────────────
function BatchModal({ open, onClose, onConfirm, loading, batches, alreadySelectedIds, requiredQty }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(new Set());
    const PAGE_SIZE = 10;

    useEffect(() => {
        if (open) { setSearch(""); setPage(1); setSelected(new Set()); }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (!requiredQty || requiredQty <= 0) return;
        const fifo = [...batches].sort((a, b) => (a.batchCode || "").localeCompare(b.batchCode || ""));
        const next = new Set();
        let remaining = Number(requiredQty) || 0;
        fifo.forEach((b) => {
            if (remaining <= 0) return;
            const available = Number(b.remainingStock || 0);
            if (available <= 0) return;
            next.add(String(b._pickKey));
            remaining -= available;
        });
        setSelected(next);
    }, [open, batches, requiredQty]);

    if (!open) return null;

    const available = batches.filter((b) => !alreadySelectedIds.has(String(b._pickKey)));
    const filtered = available.filter((b) => {
        const q = search.trim().toLowerCase();
        return !q
            || (b.batchCode || "").toLowerCase().includes(q)
            || (b.locationcode || "").toLowerCase().includes(q);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleToggle = (pickKey, disabled) => {
        if (disabled) return;
        setSelected((prev) => {
            const next = new Set(prev);
            const key = String(pickKey);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleConfirm = () => {
        const picked = pageItems.length === 0
            ? []
            : filtered.filter((b) => selected.has(String(b._pickKey)));
        if (picked.length > 0) onConfirm(picked);
    };

    return (
        <div className="rc-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rc-modal">
                <div className="rc-modal-header">
                    <span className="rc-modal-title">Chọn mã lô</span>
                    <button className="rc-modal-close" onClick={onClose}><IconClose /></button>
                </div>
                <div className="rc-modal-body">
                    <div className="rc-modal-search-row">
                        <input
                            className="rc-modal-search"
                            placeholder="Tìm kiếm mã lô, vị trí..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    {loading && (
                        <div style={{ textAlign: "center", color: "#8ba392", padding: "20px 0" }}>
                            Đang tải danh sách mã lô...
                        </div>
                    )}
                    {!loading && batches.length === 0 && (
                        <div style={{ textAlign: "center", color: "#e57373", padding: "16px 0" }}>
                            Không có mã lô nào có hàng trong kho.
                        </div>
                    )}
                    {!loading && batches.length > 0 && available.length === 0 && (
                        <div style={{ textAlign: "center", color: "#f9a825", padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <IconWarn /> Tất cả mã lô có hàng đã được chọn.
                        </div>
                    )}
                    {!loading && available.length > 0 && filtered.length === 0 && (
                        <div style={{ textAlign: "center", color: "#8ba392", padding: "16px 0" }}>
                            Không tìm thấy mã lô phù hợp.
                        </div>
                    )}

                    {!loading && pageItems.length > 0 && (
                        <>
                            <div className="rc-modal-section-hd">Mã lô có hàng trong kho</div>
                            <table className="rc-modal-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 36 }} />
                                        <th>Mã lô</th>
                                        <th>Vị trí</th>
                                        <th style={{ textAlign: "right" }}>Tồn khả dụng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.map((b) => {
                                        const isChecked = selected.has(String(b._pickKey));
                                        const selectedTotal = Array.from(selected).reduce((sum, id) => {
                                            const found = batches.find((x) => String(x._pickKey) === String(id));
                                            return sum + Number(found?.remainingStock || 0);
                                        }, 0);
                                        const reached = Number(requiredQty || 0) > 0 && selectedTotal >= Number(requiredQty || 0);
                                        const isDisabled = !isChecked && reached;
                                        return (
                                            <tr
                                                key={b._pickKey}
                                                onClick={() => handleToggle(b._pickKey, isDisabled)}
                                                style={{ cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.4 : 1 }}
                                                className={isChecked ? "rc-row-selected" : ""}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        disabled={isDisabled}
                                                        onChange={() => handleToggle(b._pickKey, isDisabled)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td style={{ fontWeight: 600, color: "#1E854A" }}>{b.batchCode}</td>
                                                <td>{b.locationcode}</td>
                                                <td style={{ textAlign: "right" }}>{b.remainingStock}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    )}

                    {totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 }}>
                            <button
                                style={{ background: "none", border: "1px solid #c6dfd0", borderRadius: 4, padding: "2px 10px", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontSize: "1rem" }}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >‹</button>
                            <span style={{ fontSize: "0.85rem", color: "#4c6152" }}>{page} / {totalPages}</span>
                            <button
                                style={{ background: "none", border: "1px solid #c6dfd0", borderRadius: 4, padding: "2px 10px", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontSize: "1rem" }}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >›</button>
                        </div>
                    )}
                </div>
                <div className="rc-modal-footer">
                    <span className="rc-modal-selected-info">
                        {selected.size > 0 ? `Đã chọn: ${selected.size} mã lô` : "Chưa chọn mã lô nào"}
                    </span>
                    <button className="sp-btn-outline" onClick={onClose}>Hủy bỏ</button>
                    <button className="sp-btn-primary" onClick={handleConfirm} disabled={selected.size === 0}>Xác nhận</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IssueCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const { hasDraft, draftSavedAt, saveDraft, loadDraft, clearDraft } = useDraft(DRAFT_KEY);
    const [showDraftBanner, setShowDraftBanner] = useState(false);

    const [form, setForm] = useState({ date: todayStr(), docno: "", customerId: "", address: "", description: "", docType: "NORMAL" });
    const [dateDisplay, setDateDisplay] = useState({ docDate: formatDateForDisplay(todayStr()) });
    const [rows, setRows] = useState([newRow()]);
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [batchModal, setBatchModal] = useState({ open: false, rowIdx: null, batches: [], loading: false });
    const [stockByItem, setStockByItem] = useState({});
    const [prefilledFromAudit, setPrefilledFromAudit] = useState(false);
    const [prefilledFromClone, setPrefilledFromClone] = useState(false);
    const [auditSource, setAuditSource] = useState(null);

    // Hiển thị banner nháp hoặc tự động khôi phục nháp nếu được yêu cầu từ trang danh sách
    useEffect(() => {
        const hasAuditParam = !!searchParams.get("auditId");
        const hasCloneState = !!location.state?.clone;
        if (hasDraft && !hasAuditParam && !hasCloneState) {
            if (location.state?.resumeDraft) {
                const draft = loadDraft();
                if (draft) {
                    if (draft.form) setForm(draft.form);
                    if (draft.dateDisplay) setDateDisplay(draft.dateDisplay);
                    if (draft.rows) {
                        setRows(draft.rows.map((r) => ({ ...r, _id: ++_rowKey })));
                    }
                }
            } else {
                setShowDraftBanner(true);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [cList, iList, bList, iDocList] = await Promise.all([
                getAllCustomers(),
                getAllItems(),
                getAllBatches(),
                getAllIssues(),
            ]);
            setCustomers(cList);
            setItems(iList);
            setBatches(bList);
            setForm((prev) => ({
                ...prev,
                docno: prev.docno || buildNextDocno("PX", iDocList),
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

    // ── Clone prefill ──
    useEffect(() => {
        const clone = location.state?.clone;
        if (!clone || prefilledFromClone) return;
        const toDateOnly = (val) => (val ? String(val).slice(0, 10) : "");

        // Group clone details by itemId so each item has one row with multiple batchEntries
        const grouped = {};
        (clone.details || []).forEach((d) => {
            const key = String(d.itemId ?? d.itemid ?? "");
            if (!key) return;
            if (!grouped[key]) {
                grouped[key] = {
                    ...newRow(),
                    itemId: d.itemId ?? d.itemid ?? "",
                    itemcode: d.itemcode || "",
                    itemname: d.itemname || "",
                    unitof: d.unitof || "",
                    quantity: 0,
                    price: d.price != null ? String(d.price) : d.unitprice != null ? String(d.unitprice) : "",
                    batchEntries: [],
                };
            }
            grouped[key].quantity = (Number(grouped[key].quantity) || 0) + (Number(d.quantity) || 0);
            if (d.batchId) {
                grouped[key].batchEntries.push({
                    _id: ++_rowKey,
                    _pickKey: `${d.batchId || ""}-${d.locationId || ""}`,
                    batchId: d.batchId,
                    batchCode: d.batchCode || d.nameBatch || String(d.batchId),
                    locationId: d.locationId || "",
                    locationcode: d.locationcode || "",
                    remainingStock: Number(d.quantity) || 0,
                    quantity: String(d.quantity || ""),
                });
            }
        });

        const rowsFromClone = Object.values(grouped).map((r) => ({
            ...r,
            quantity: String(r.quantity || ""),
        }));

        if (rowsFromClone.length > 0) setRows(rowsFromClone);
        const cloneDocDate = toDateOnly(clone.docDate);
        setForm((prev) => ({
            ...prev,
            date: cloneDocDate || prev.date,
            customerId: clone.customerId ? String(clone.customerId) : "",
            address: clone.address || "",
            description: clone.description || "",
            docType: clone.docType || clone.doctype || prev.docType || "NORMAL",
        }));
        setDateDisplay({ docDate: formatDateForDisplay(cloneDocDate || form.date) });
        setPrefilledFromClone(true);
        setPrefilledFromAudit(true);
    }, [location.state, prefilledFromClone]);

    useEffect(() => {
        if (form.customerId && customers.length > 0 && !form.address) {
            const found = customers.find((c) => String(c.id) === String(form.customerId));
            if (found?.address) {
                setForm((prev) => ({ ...prev, address: found.address }));
            }
        }
    }, [form.customerId, customers]);

    // ── Audit prefill ──
    useEffect(() => {
        const auditId = searchParams.get("auditId");
        const auditDetailId = searchParams.get("auditDetailId");
        if (!auditId || prefilledFromAudit) return;
        const fillFromAudit = async () => {
            try {
                const [data, batchList] = await Promise.all([getAuditById(auditId), getAllBatches()]);
                const batchById = {};
                (batchList || []).forEach((b) => {
                    batchById[String(b.id)] = b;
                });
                const rowsFromAudit = (data.details || [])
                    .filter((d) => Number(d.diffquantity) < 0)
                    .filter((d) => !auditDetailId || String(d.id) === String(auditDetailId))
                    .map((d) => {
                        const diff = Math.abs(Number(d.diffquantity || 0));
                        const batch = batchById[String(d.batchId)] || {};
                        const batchEntries = d.batchId ? [{
                            _id: ++_rowKey,
                            _pickKey: `${d.batchId || ""}-${d.locationId || ""}`,
                            batchId: d.batchId,
                            batchCode: d.batchCode || batch.batchCode || "",
                            locationId: d.locationId || "",
                            locationcode: d.locationcode || d.locationname || "",
                            remainingStock: Number(d.bookquantity ?? batch.quantityRemaining) || diff,
                            quantity: String(diff),
                            unitCost: batch.unitCost || "",
                        }] : [];
                        return {
                            ...newRow(),
                            itemId: d.itemId,
                            itemcode: d.itemcode,
                            itemname: d.itemname,
                            unitof: d.unitof,
                            quantity: String(diff),
                            price: calcSalePrice(batch?.unitCost),
                            inventoryAuditDetailId: d.id,
                            batchEntries,
                        };
                    });
                if (rowsFromAudit.length > 0) {
                    setRows(rowsFromAudit);
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

    const isAdjustment = form.docType === "ADJUSTMENT";

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    // ── Lưu nháp local ──────────────────────────────────────────────────────
    const handleSaveDraftLocal = () => {
        try {
            saveDraft({ form, rows, dateDisplay });
            showToast("success", "Đã lưu nháp thành công.");
            setTimeout(() => navigate("/issues"), 1000);
        } catch {
            showToast("error", "Không thể lưu nháp.");
        }
    };

    const handleRestoreDraft = () => {
        const draft = loadDraft();
        if (!draft) return;
        if (draft.form) setForm(draft.form);
        if (draft.dateDisplay) setDateDisplay(draft.dateDisplay);
        if (draft.rows) {
            setRows(draft.rows.map((r) => ({ ...r, _id: ++_rowKey })));
        }
        setShowDraftBanner(false);
        showToast("success", "Đã khôi phục nháp.");
    };

    const handleDeleteDraft = () => {
        clearDraft();
        setShowDraftBanner(false);
        showToast("success", "Đã xóa nháp.");
    };

    const handleDismissBanner = () => {
        setShowDraftBanner(false);
    };

    const handleFormChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
    const handleDocDateChange = (value) => {
        const display = normalizeDateDisplayInput(value);
        setDateDisplay({ docDate: display });
        setForm((prev) => ({ ...prev, date: parseDisplayDateToIso(display) }));
    };

    const handleCustomerChange = (customerId) => {
        const found = customers.find((c) => String(c.id) === String(customerId));
        setForm((prev) => ({
            ...prev,
            customerId,
            customerName: found?.customername || "",
            address: found?.address || ""
        }));
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
                next[idx].batchEntries = [];
                next[idx].price = "";
            }
            return next;
        });
        if (field === "itemId" && value) {
            fetchItemStock(value);
        }
    };

    const fetchItemStock = useCallback(async (itemId) => {
        if (!itemId) return;
        setStockByItem((prev) => {
            if (prev[itemId]?.loading || prev[itemId]?.total !== undefined) return prev;
            return { ...prev, [itemId]: { loading: true, total: undefined, error: null } };
        });
        try {
            const locs = await getAvailableLocations(itemId);
            const total = (locs || []).reduce((sum, loc) => {
                const qty = (loc.items || []).find((it) => String(it.itemId) === String(itemId))?.quantity || 0;
                return sum + Number(qty || 0);
            }, 0);
            setStockByItem((prev) => ({ ...prev, [itemId]: { loading: false, total, error: null } }));
        } catch {
            setStockByItem((prev) => ({ ...prev, [itemId]: { loading: false, total: undefined, error: true } }));
        }
    }, []);

    const handleAddRow = () => setRows((prev) => [...prev, newRow()]);
    const handleRemoveRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

    // ── Batch modal ──
    const openBatchModal = async (idx) => {
        const row = rows[idx];
        if (!row.itemId) { showToast("error", "Vui lòng chọn mặt hàng trước."); return; }
        if (!row.quantity || Number(row.quantity) <= 0) { showToast("error", "Vui lòng nhập số lượng yêu cầu trước."); return; }
        setBatchModal({ open: true, rowIdx: idx, batches: [], loading: true });
        try {
            const locations = await getAvailableLocations(row.itemId);
            const batchMap = {};
            (locations || []).forEach((loc) => {
                const item = (loc.items || []).find((it) => String(it.itemId) === String(row.itemId));
                const batchList = item?.batches || [];
                batchList.forEach((batch) => {
                    const remaining = Number(batch.quantityRemaining ?? batch.remainingStock ?? 0);
                    if (!batch.batchId || remaining <= 0) return;
                    const locationId = batch.locationId || loc.locationId;
                    const pickKey = `${batch.batchId}-${locationId || ""}`;
                    batchMap[pickKey] = {
                        _pickKey: pickKey,
                        batchId: batch.batchId,
                        batchCode: batch.batchCode || "",
                        locationId,
                        locationcode: batch.locationcode || loc.locationcode,
                        remainingStock: remaining,
                    };
                });
            });
            // Enrich batchCode from local batches list if missing
            const batchList = Object.values(batchMap).map((entry) => {
                if (!entry.batchCode) {
                    const found = batches.find((b) => String(b.id) === String(entry.batchId));
                    if (found) return { ...entry, batchCode: found.batchCode };
                }
                return entry;
            });
            batchList.sort((a, b) => (a.batchCode || "").localeCompare(b.batchCode || ""));
            setBatchModal((prev) => ({ ...prev, batches: batchList, loading: false }));
        } catch {
            setBatchModal((prev) => ({ ...prev, batches: [], loading: false }));
            showToast("error", "Không thể tải danh sách mã lô.");
        }
    };

    const handleBatchConfirm = (pickedBatches) => {
        const idx = batchModal.rowIdx;
        setRows((prev) => {
            const next = [...prev];
            const row = next[idx];
            const required = Number(row.quantity) || 0;
            let remaining = Math.max(0, required - (row.batchEntries || []).reduce((s, e) => s + (Number(e.quantity) || 0), 0));

            let price = row.price;
            if (!price && pickedBatches.length > 0) {
                const found = batches.find((b) => String(b.id) === String(pickedBatches[0].batchId));
                if (found?.unitCost) price = calcSalePrice(found.unitCost);
            }

            const newEntries = pickedBatches.map((batch) => {
                const batchInfo = batches.find((b) => String(b.id) === String(batch.batchId));
                const unitCost = Number(batchInfo?.unitCost || 0) || 0;
                const autoQty = remaining > 0
                    ? Math.min(batch.remainingStock, remaining)
                    : batch.remainingStock;
                remaining = Math.max(0, remaining - autoQty);
                return {
                    _id: ++_rowKey,
                    _pickKey: batch._pickKey,
                    batchId: batch.batchId,
                    batchCode: batch.batchCode,
                    locationId: batch.locationId,
                    locationcode: batch.locationcode,
                    remainingStock: batch.remainingStock,
                    quantity: autoQty > 0 ? String(autoQty) : "",
                    unitCost,
                };
            });

            next[idx] = {
                ...row,
                price,
                batchEntries: [
                    ...(row.batchEntries || []),
                    ...newEntries,
                ],
            };
            return next;
        });
        setBatchModal((prev) => ({ ...prev, open: false }));
    };

    const handleBatchEntryQtyChange = (rowIdx, entryIdx, value) => {
        setRows((prev) => {
            const next = [...prev];
            const entries = [...next[rowIdx].batchEntries];
            entries[entryIdx] = { ...entries[entryIdx], quantity: value };
            next[rowIdx] = { ...next[rowIdx], batchEntries: entries };
            return next;
        });
    };

    const removeBatchEntry = (rowIdx, entryIdx) => {
        setRows((prev) => {
            const next = [...prev];
            next[rowIdx] = {
                ...next[rowIdx],
                batchEntries: next[rowIdx].batchEntries.filter((_, i) => i !== entryIdx),
            };
            return next;
        });
    };

    const totalAmount = rows.reduce((sum, r) => {
        const rowTotal = (r.batchEntries || []).reduce((s, e) => s + (Number(e.quantity) || 0) * (Number(e.unitCost) || 0), 0);
        return sum + rowTotal;
    }, 0);

    const handleSave = async () => {
        if (!form.date) { showToast("error", "Vui lòng chọn ngày."); return; }
        if (!form.docno.trim()) { showToast("error", "Vui lòng nhập số chứng từ."); return; }
        if (!isAdjustment && !form.customerId) { showToast("error", "Vui lòng chọn đối tượng."); return; }
        if (rows.length === 0) { showToast("error", "Vui lòng thêm ít nhất một dòng vật tư."); return; }

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r.itemId) { showToast("error", `Dòng ${i + 1}: Vui lòng chọn mặt hàng.`); return; }
            if (!r.quantity || Number(r.quantity) <= 0) { showToast("error", `Dòng ${i + 1}: Số lượng yêu cầu không hợp lệ.`); return; }
            if (isAdjustment && !r.inventoryAuditDetailId) { showToast("error", `Dòng ${i + 1}: Thiếu liên kết chi tiết kiểm kê.`); return; }

            const requiredQty = Number(r.quantity);

            if (!r.batchEntries || r.batchEntries.length === 0) {
                showToast("error", `Dòng ${i + 1}: Vui lòng chọn ít nhất một mã lô.`);
                return;
            }

            const batchLocationKeys = r.batchEntries.map((e) => `${e.batchId || ""}-${e.locationId || ""}`);
            if (new Set(batchLocationKeys).size !== batchLocationKeys.length) {
                showToast("error", `Dòng ${i + 1}: Có mã lô và vị trí bị trùng lặp.`);
                return;
            }

            for (let j = 0; j < r.batchEntries.length; j++) {
                const e = r.batchEntries[j];
                if (!e.quantity || Number(e.quantity) <= 0) {
                    showToast("error", `Dòng ${i + 1}, lô ${e.batchCode}: Số lượng xuất không hợp lệ.`);
                    return;
                }
                if (Number(e.quantity) > e.remainingStock) {
                    const shortfall = Number(e.quantity) - Number(e.remainingStock || 0);
                    showToast("error", `Dòng ${i + 1}, lô ${e.batchCode} tại ${e.locationcode || "vị trí đã chọn"} chỉ còn ${e.remainingStock}, thiếu ${shortfall}.`);
                    return;
                }
            }

            const totalBatch = r.batchEntries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);
            if (totalBatch !== requiredQty) {
                showToast("error", `Dòng ${i + 1}: Tổng số lượng mã lô (${totalBatch}) phải bằng số lượng yêu cầu (${requiredQty}).`);
                return;
            }

            const totalStock = stockByItem[String(r.itemId)]?.total;
            if (totalStock !== undefined && totalBatch > totalStock) {
                const shortfall = totalBatch - totalStock;
                showToast("error", `Dòng ${i + 1}: Tồn hiện tại chỉ còn ${totalStock}, thiếu ${shortfall}.`);
                return;
            }
        }

        const details = rows.flatMap((r) =>
            r.batchEntries.map((e) => ({
                itemId: Number(r.itemId),
                batchId: e.batchId ? Number(e.batchId) : undefined,
                locationId: e.locationId ? Number(e.locationId) : null,
                quantity: Number(e.quantity),
                unitprice: Number(e.unitCost) || Number(r.price) || 0,
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
                ...(adjAuditId ? { inventoryAuditId: Number(adjAuditId) } : {}),
                details,
            };
            if (!isAdjustment) {
                payload.customerId = Number(form.customerId);
            }
            const result = await createIssue(payload);
            if (result?.success) {
                clearDraft(); // Xóa nháp local sau khi tạo phiếu thành công
                showToast("success", "Tạo phiếu xuất kho thành công!");
                const newId = result?.data?.id;
                if (adjAuditId && form.docType === "ADJUSTMENT" && newId) {
                    localStorage.setItem(`audit_adj_issue_id_${adjAuditId}`, String(newId));
                    if (adjAuditDetailId) {
                        localStorage.setItem(`audit_adj_issue_detail_${adjAuditId}_${adjAuditDetailId}`, "1");
                        localStorage.setItem(`audit_adj_issue_detail_doc_${adjAuditId}_${adjAuditDetailId}`, String(newId));
                    }
                }
                setTimeout(() => navigate(newId ? `/issues/${newId}` : "/issues"), 1200);
            } else {
                showToast("error", result?.message || "Tạo phiếu thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra khi tạo phiếu xuất kho.");
        } finally { setSaving(false); }
    };

    const currentBatchRow = batchModal.rowIdx !== null ? rows[batchModal.rowIdx] : null;
    const alreadySelectedBatchIds = new Set(
        (currentBatchRow?.batchEntries || []).map((e) => String(e._pickKey || `${e.batchId || ""}-${e.locationId || ""}`))
    );

    return (
        <>
            {toast && (
                <div className={`sp-toast ${toast.type === "success" ? "sp-toast-success" : "sp-toast-error"}`}>{toast.msg}</div>
            )}
            <BatchModal
                open={batchModal.open}
                onClose={() => setBatchModal((p) => ({ ...p, open: false }))}
                onConfirm={handleBatchConfirm}
                loading={batchModal.loading}
                batches={batchModal.batches}
                alreadySelectedIds={alreadySelectedBatchIds}
                requiredQty={currentBatchRow?.quantity || 0}
            />
            <div className="sp-main">
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Chứng từ &rsaquo;{" "}
                            <span className="sp-breadcrumb-link" onClick={() => navigate("/issues")}>Phiếu xuất kho</span>
                            {" "}&rsaquo;{" "}
                            <span className="sp-breadcrumb-active">Thêm mới phiếu xuất kho</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                <div className="sp-content">
                    <h1 className="sp-title">Phiếu xuất kho</h1>
                    {showDraftBanner && (
                        <DraftBanner
                            draftSavedAt={draftSavedAt}
                            onResume={handleRestoreDraft}
                            onDelete={handleDeleteDraft}
                            onDismiss={handleDismissBanner}
                        />
                    )}
                    <div className="rc-form-card">

                        {/* ── Header row ── */}
                        <div className="rc-header-row">
                            <label className="rc-form-label">Ngày</label>
                            <input
                                className="rc-form-input"
                                style={{ minWidth: 150 }}
                                placeholder="dd/mm/yyyy"
                                value={dateDisplay.docDate}
                                onChange={(e) => handleDocDateChange(e.target.value)}
                            />
                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Số</label>
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
                                <label className="rc-form-label">Đối tượng</label>
                                <select className="rc-form-select rc-form-full" value={form.customerId} onChange={(e) => handleCustomerChange(e.target.value)} disabled={loadingData}>
                                    <option value="">Chọn đối tượng</option>
                                    {customers.filter((c) => c.iscustomer).map((c) => (
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
                            <table className="rc-detail-table" style={{ tableLayout: "fixed", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th className="rc-td-stt" style={{ width: "4%" }}>STT</th>
                                        <th style={{ width: "9%" }}>Mã hàng</th>
                                        <th style={{ width: "40%" }}>Tên vật tư hàng hóa</th>
                                        <th style={{ width: "6%" }}>ĐVT</th>
                                        <th style={{ width: "8%", textAlign: "right" }}>SL yêu cầu</th>
                                        {!isAdjustment && <th style={{ width: "9%", textAlign: "right" }}>Tồn hiện tại</th>}
                                        <th style={{ width: "4%" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => {
                                        const requiredQty = Number(row.quantity) || 0;
                                        const totalBatchQty = (row.batchEntries || []).reduce((s, e) => s + (Number(e.quantity) || 0), 0);
                                        const batchShortfall = requiredQty > 0 ? requiredQty - totalBatchQty : 0;
                                        const batchOk = requiredQty > 0 && batchShortfall === 0 && totalBatchQty === requiredQty;

                                        return (
                                            <React.Fragment key={row._id}>
                                                <tr style={{ background: "#f5faf7" }}>
                                                    <td className="rc-td-stt">{idx + 1}</td>
                                                    <td>
                                                        <select
                                                            className="rc-td-select"
                                                            value={row.itemId}
                                                            onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}
                                                            disabled={loadingData}
                                                        >
                                                            <option value="">Chọn</option>
                                                            {items.map((it) => {
                                                                const isSelectedElsewhere = rows.some((r, rIdx) => rIdx !== idx && String(r.itemId) === String(it.id));
                                                                return (
                                                                    <option key={it.id} value={it.id} disabled={isSelectedElsewhere}>
                                                                        {it.itemcode} {isSelectedElsewhere ? "(Đã chọn)" : ""}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input className="rc-td-input" value={row.itemname} readOnly placeholder="Tên hàng" />
                                                    </td>
                                                    <td>
                                                        <input className="rc-td-input" value={row.unitof} readOnly />
                                                    </td>
                                                    <td>
                                                        <input
                                                            className="rc-td-input rc-td-num"
                                                            type="number"
                                                            min="1"
                                                            value={row.quantity}
                                                            onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                                                        />
                                                    </td>
                                                    {!isAdjustment && (
                                                        <td className="rc-td-num" style={{ color: Number(row.quantity) > (stockByItem[row.itemId]?.total ?? Number.POSITIVE_INFINITY) ? "#c62828" : "#4c6152" }}>
                                                            {!row.itemId
                                                                ? "—"
                                                                : stockByItem[row.itemId]?.loading
                                                                    ? "Đang tải..."
                                                                    : stockByItem[row.itemId]?.error
                                                                        ? "Lỗi"
                                                                        : (stockByItem[row.itemId]?.total ?? 0)}
                                                        </td>
                                                    )}
                                                    <td style={{ textAlign: "center", width: "4%" }}>
                                                        {rows.length > 1 && (
                                                            <button className="rc-del-btn" onClick={() => handleRemoveRow(idx)} type="button" title="Xóa dòng">
                                                                <IconTrash />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* ── Batch entries sub-row ── */}
                                                <tr>
                                                    <td colSpan={isAdjustment ? 6 : 7} style={{ padding: "0 0 10px 32px", background: "#fafcfb" }}>
                                                        <div style={{ borderLeft: "3px solid #c6dfd0", paddingLeft: 12, paddingTop: 6 }}>

                                                            {/* Batch entries table */}
                                                            {(row.batchEntries || []).length > 0 && (
                                                                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: "0.84rem" }}>
                                                                    <thead>
                                                                        <tr style={{ background: "#edf6f1" }}>
                                                                            <th style={{ padding: "5px 10px", textAlign: "left", fontWeight: 600, color: "#1E3A2F", width: "26%", borderBottom: "1px solid #c6dfd0" }}>Mã lô</th>
                                                                            <th style={{ padding: "5px 10px", textAlign: "left", fontWeight: 600, color: "#1E3A2F", width: "24%", borderBottom: "1px solid #c6dfd0" }}>Vị trí</th>
                                                                            <th style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: "#1E3A2F", width: "18%", borderBottom: "1px solid #c6dfd0" }}>SL xuất</th>
                                                                            <th style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: "#1E3A2F", width: "16%", borderBottom: "1px solid #c6dfd0" }}>Tồn khả dụng</th>
                                                                            <th style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: "#1E3A2F", width: "12%", borderBottom: "1px solid #c6dfd0" }}>Đơn giá</th>
                                                                            <th style={{ width: "4%", borderBottom: "1px solid #c6dfd0" }}></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {row.batchEntries.map((entry, eIdx) => {
                                                                            const entryQty = Number(entry.quantity) || 0;
                                                                            const exceedsStock = entryQty > entry.remainingStock;
                                                                            return (
                                                                                <tr key={entry._id} style={{ borderBottom: "1px solid #edf6f1" }}>
                                                                                    <td style={{ padding: "5px 10px", fontWeight: 600, color: "#1E854A" }}>{entry.batchCode}</td>
                                                                                    <td style={{ padding: "5px 10px", color: "#4c6152" }}>
                                                                                        {entry.locationcode || <span style={{ color: "#b0c4b8", fontStyle: "italic" }}>Chưa xác định</span>}
                                                                                    </td>
                                                                                    <td style={{ padding: "5px 10px", textAlign: "right" }}>
                                                                                        <input
                                                                                            type="number"
                                                                                            min="1"
                                                                                            max={entry.remainingStock}
                                                                                            value={entry.quantity}
                                                                                            onChange={(e) => handleBatchEntryQtyChange(idx, eIdx, e.target.value)}
                                                                                            style={{
                                                                                                width: "100%",
                                                                                                border: `1px solid ${exceedsStock ? "#e57373" : "#c6dfd0"}`,
                                                                                                borderRadius: 4,
                                                                                                padding: "3px 6px",
                                                                                                textAlign: "right",
                                                                                                fontSize: "0.84rem",
                                                                                                background: exceedsStock ? "#fff3f3" : "#fff",
                                                                                                color: exceedsStock ? "#c62828" : "#1E3A2F",
                                                                                                outline: "none",
                                                                                            }}
                                                                                        />
                                                                                        {exceedsStock && (
                                                                                            <div style={{ fontSize: "0.75rem", color: "#c62828", marginTop: 2 }}>
                                                                                                Thiếu {entryQty - entry.remainingStock}
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                    <td style={{ padding: "5px 10px", textAlign: "right", color: "#4c6152" }}>{entry.remainingStock}</td>
                                                                                    <td style={{ padding: "5px 10px", textAlign: "right", color: "#1E3A2F" }}>{formatMoney(Number(entry.unitCost) || 0)}</td>
                                                                                    <td style={{ padding: "5px 8px", textAlign: "center" }}>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="rc-del-btn"
                                                                                            onClick={() => removeBatchEntry(idx, eIdx)}
                                                                                            title="Xóa mã lô"
                                                                                        >
                                                                                            <IconTrash />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            )}

                                                            {/* Batch action row */}
                                                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                                                <button
                                                                    type="button"
                                                                    className={`rc-loc-btn${(row.batchEntries || []).length > 0 ? " rc-loc-btn-set" : ""}`}
                                                                    onClick={() => openBatchModal(idx)}
                                                                    disabled={!row.itemId || !row.quantity || Number(row.quantity) <= 0}
                                                                    style={{ opacity: !row.itemId || !row.quantity || Number(row.quantity) <= 0 ? 0.5 : 1 }}
                                                                >
                                                                    <IconPlus size={12} />
                                                                    &nbsp;Chọn mã lô <IconChevron />
                                                                </button>

                                                                {requiredQty > 0 && (
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: "0.82rem" }}>
                                                                        <span style={{ color: "#4c6152" }}>
                                                                            Tổng yêu cầu: <strong>{requiredQty}</strong>
                                                                        </span>
                                                                        <span style={{ color: "#4c6152" }}>
                                                                            Đã phân bổ: <strong style={{ color: batchOk ? "#1E854A" : "#f9a825" }}>{totalBatchQty}</strong>
                                                                        </span>
                                                                        <span style={{ color: batchShortfall > 0 ? "#e65100" : "#1E854A", display: "flex", alignItems: "center", gap: 3 }}>
                                                                            {batchShortfall > 0 ? <IconWarn /> : <IconCheck />} Còn thiếu {Math.max(0, batchShortfall)}
                                                                        </span>
                                                                        {totalBatchQty > requiredQty && (
                                                                            <span style={{ color: "#c62828", display: "flex", alignItems: "center", gap: 3 }}>
                                                                                <IconWarn /> Vượt {totalBatchQty - requiredQty}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                    <tr className="rc-add-row" onClick={handleAddRow}>
                                        <td colSpan={isAdjustment ? 6 : 7}>
                                            <button className="rc-add-row-btn" type="button">
                                                <IconPlus size={13} /> Thêm mới dữ liệu
                                            </button>
                                        </td>
                                    </tr>
                                    {totalAmount > 0 && (
                                        <tr className="rc-total-row">
                                            <td colSpan={isAdjustment ? 4 : 5} style={{ textAlign: "right", paddingRight: 12 }}>Tổng cộng</td>
                                            <td className="rc-td-num" style={{ textAlign: "right" }}>{formatMoney(totalAmount)}</td>
                                            <td />
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Actions ── */}
                        <div className="rc-form-actions">
                            <button className="sp-btn-outline" onClick={() => navigate("/issues")}>Hủy bỏ</button>
                            <button
                                id="issue-draft-save-btn"
                                type="button"
                                className="sp-btn-draft"
                                onClick={handleSaveDraftLocal}
                                disabled={saving}
                                title="Lưu tạm dữ liệu vào máy, không tạo phiếu chính thức"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                Lưu nháp
                            </button>
                            <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? "Đang lưu..." : "Lưu phiếu"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
