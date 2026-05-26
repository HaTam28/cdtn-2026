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

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _rowKey = 0;
const newRow = () => ({
    _id: ++_rowKey,
    itemId: "",
    itemcode: "",
    itemname: "",
    unitof: "",
    batchId: "",
    batchCode: "",
    unitCost: "",   // giá nhập từ lô
    quantity: "",
    price: "",      // giá xuất (tự tính, cho phép sửa)
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

/** Giá xuất bằng giá nhập */
function calcSalePrice(unitCost) {
    const cost = Number(unitCost);
    if (!cost) return "";
    return String(cost);
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

// ─── Location Picker Modal (Available Stock) ──────────────────────────────────
function LocationModal({ open, onClose, onConfirm, loading, locations, quantity, rowName, itemId }) {
    const [search, setSearch] = useState("");
    const [rackFilter, setRackFilter] = useState("Tất cả dãy");
    const [selected, setSelected] = useState(new Map()); // Map<locationId, allocQty>

    useEffect(() => {
        if (open) { setSearch(""); setRackFilter("Tất cả dãy"); setSelected(new Map()); }
    }, [open]);

    if (!open) return null;

    const qty = Number(quantity) || 0;
    const totalAllocated = Array.from(selected.values()).reduce((a, b) => a + b, 0);
    const remaining = Math.max(0, qty - totalAllocated);
    const pct = qty > 0 ? Math.min(100, Math.round((totalAllocated / qty) * 100)) : 0;

    const racks = ["Tất cả dãy", ...Array.from(new Set(
        locations.map((s) => (s.locationcode || "").split("-")[0]).filter(Boolean)
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
            // items[].quantity = tồn của mã hàng đang chọn tại vị trí đó
            const stockAtLoc = (loc.items || []).find((it) => String(it.itemId) === String(itemId))?.quantity || 0;
            const autoFill = Math.max(1, Math.min(Number(stockAtLoc), remaining));
            next.set(loc.locationId, autoFill);
        }
        setSelected(next);
    };

    const selectedEntries = Array.from(selected.entries());
    const canConfirm = remaining === 0 && selected.size > 0;

    const handleConfirm = () => {
        const locs = selectedEntries.map(([locationId, allocQty]) => {
            const found = locations.find((s) => s.locationId === locationId);
            return { locationId, locationcode: found?.locationcode || "", allocQty };
        });
        onConfirm(locs);
    };

    const visibleLocs = filterLoc(locations);

    return (
        <div className="rc-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rc-modal">
                <div className="rc-modal-header">
                    <span className="rc-modal-title">Chọn vị trí xuất hàng</span>
                    <button className="rc-modal-close" onClick={onClose}><IconClose /></button>
                </div>
                <div className="rc-modal-body">
                    {/* ── Allocation progress bar ── */}
                    <div style={{ background: "#f3faf6", border: "1px solid #c6dfd0", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem", color: "#4c6152", marginBottom: 6 }}>
                            <span>Tổng cần xuất: <strong style={{ color: "#1E3A2F" }}>{qty}</strong></span>
                            <span>Đã phân bổ: <strong style={{ color: "#1E854A" }}>{totalAllocated}</strong></span>
                            <span>Còn lại: <strong style={{ color: remaining > 0 ? "#e65100" : "#1E854A" }}>{remaining}</strong></span>
                        </div>
                        <div style={{ background: "#d4edda", borderRadius: 4, height: 8, overflow: "hidden" }}>
                            <div style={{ background: remaining === 0 ? "#2DBE60" : "#f9a825", width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 0.2s" }} />
                        </div>
                        {remaining > 0 && qty > 0 && locations.length > 0 && !locations.some((loc) => {
                            const stockAtLoc = (loc.items || []).find((it) => String(it.itemId) === String(itemId))?.quantity || 0;
                            return Number(stockAtLoc) >= qty;
                        }) && (
                                <div style={{ marginTop: 6, fontSize: "0.8rem", color: "#e65100", display: "flex", alignItems: "center", gap: 4 }}>
                                    <IconWarn /> Tồn kho tại 1 vị trí không đủ — vui lòng chọn nhiều vị trí để đủ số lượng xuất.
                                </div>
                            )}
                    </div>

                    <div className="rc-modal-search-row">
                        <input className="rc-modal-search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                        <select className="rc-modal-row-select" value={rackFilter} onChange={(e) => setRackFilter(e.target.value)}>
                            {racks.map((r) => <option key={r}>{r}</option>)}
                        </select>
                    </div>

                    {loading && <div style={{ textAlign: "center", color: "#8ba392", padding: "20px 0" }}>Đang tải vị trí có hàng...</div>}
                    {!loading && locations.length === 0 && (
                        <div style={{ textAlign: "center", color: "#e57373", padding: "16px 0" }}>Không có vị trí nào đủ tồn kho để xuất.</div>
                    )}

                    {!loading && visibleLocs.length > 0 && (
                        <>
                            <div className="rc-modal-section-hd">Vị trí có hàng</div>
                            <table className="rc-modal-table">
                                <thead><tr>
                                    <th style={{ width: 36 }} />
                                    <th>Mặt hàng</th>
                                    <th>Vị trí</th>
                                    <th>Tồn tại vị trí</th>
                                    <th>Sức chứa</th>
                                </tr></thead>
                                <tbody>
                                    {visibleLocs.map((loc) => {
                                        const isSel = selected.has(loc.locationId);
                                        const stockAtLoc = (loc.items || []).find((it) => String(it.itemId) === String(itemId))?.quantity || 0;
                                        const isDisabled = !isSel && (remaining === 0 || Number(stockAtLoc) === 0);
                                        return (
                                            <tr
                                                key={loc.locationId}
                                                className={isSel ? "rc-row-selected" : ""}
                                                onClick={isDisabled ? undefined : () => handleToggle(loc)}
                                                style={{ cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.32 : 1, transition: "opacity 0.15s" }}
                                            >
                                                <td><input type="checkbox" checked={isSel} disabled={isDisabled} onChange={() => { }} onClick={(e) => e.stopPropagation()} /></td>
                                                <td style={{ fontWeight: 600, color: "#1E854A" }}>{rowName}</td>
                                                <td>{loc.locationcode}</td>
                                                <td>{stockAtLoc}</td>
                                                <td>{loc.capacity ?? "∞"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    )}

                    {!loading && selected.size > 0 && (
                        <div className={`rc-modal-msg ${remaining === 0 ? "rc-modal-msg-ok" : "rc-modal-msg-warn"}`}>
                            {remaining === 0
                                ? <><IconCheck /> Đã đủ số lượng xuất. Nhấn Xác nhận để hoàn tất.</>
                                : <><IconWarn /> Còn thiếu {remaining} — chọn thêm vị trí hoặc tăng số lượng phân bổ.</>}
                        </div>
                    )}
                </div>
                <div className="rc-modal-footer">
                    <span className="rc-modal-selected-info">
                        {selected.size > 0
                            ? `Đã chọn: ${Array.from(selected.entries()).map(([id, q]) => { const loc = locations.find((s) => s.locationId === id); return `${loc?.locationcode || id}(${q} cái)`; }).join(", ")}`
                            : "Chưa chọn vị trí nào"}
                    </span>
                    <button className="sp-btn-outline" onClick={onClose}>Hủy bỏ</button>
                    <button className="sp-btn-primary" onClick={handleConfirm} disabled={!canConfirm}>Xác nhận</button>
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

    const [form, setForm] = useState({ date: todayStr(), docno: "", customerId: "", address: "", description: "", docType: "NORMAL" });
    const [rows, setRows] = useState([newRow()]);
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [locModal, setLocModal] = useState({ open: false, rowIdx: null, locations: [], loading: false });
    const [stockByItem, setStockByItem] = useState({});
    const [prefilledFromAudit, setPrefilledFromAudit] = useState(false);
    const [prefilledFromClone, setPrefilledFromClone] = useState(false);

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
            batchId: d.batchId ?? "",
            batchCode: d.batchCode || d.nameBatch || "",
            unitCost: d.unitCost != null ? String(d.unitCost) : d.unitprice != null ? String(d.unitprice) : "",
            quantity: d.quantity != null ? String(d.quantity) : d.qty != null ? String(d.qty) : "",
            price: d.price != null ? String(d.price) : "",
            selectedLocations: [],
        }));
        if (rowsFromClone.length > 0) setRows(rowsFromClone);
        setForm((prev) => ({
            ...prev,
            date: toDateOnly(clone.docDate) || prev.date,
            customerId: clone.customerId || "",
            address: clone.address || "",
            description: clone.description || "",
            docType: clone.docType || prev.docType || "NORMAL",
        }));
        setPrefilledFromClone(true);
        setPrefilledFromAudit(true);
    }, [location.state, prefilledFromClone]);

    useEffect(() => {
        const auditId = searchParams.get("auditId");
        if (!auditId || prefilledFromAudit) return;
        const fillFromAudit = async () => {
            try {
                const [data, batchList] = await Promise.all([getAuditById(auditId), getAllBatches()]);
                // Build map: itemId -> best batch with remaining stock
                const batchByItem = {};
                (batchList || []).forEach((b) => {
                    const key = String(b.itemId);
                    if (!batchByItem[key] && Number(b.quantityRemaining) > 0) batchByItem[key] = b;
                });
                const rowsFromAudit = (data.details || [])
                    .filter((d) => Number(d.diffquantity) < 0)
                    .map((d) => {
                        const diff = Math.abs(Number(d.diffquantity || 0));
                        const entries = d.locationEntries || [];
                        const selectedLocations = entries.length > 0 ? buildAllocations(entries, diff) : [];
                        const batch = batchByItem[String(d.itemId)];
                        return {
                            ...newRow(),
                            itemId: d.itemId,
                            itemcode: d.itemcode,
                            itemname: d.itemname,
                            unitof: d.unitof,
                            batchId: batch?.id ?? "",
                            batchCode: batch?.batchCode || "",
                            unitCost: batch?.unitCost ? String(batch.unitCost) : "",
                            quantity: String(diff),
                            price: calcSalePrice(batch?.unitCost),
                            selectedLocations,
                        };
                    });
                if (rowsFromAudit.length > 0) {
                    setRows(rowsFromAudit);
                }
                setForm((prev) => ({
                    ...prev,
                    docType: "ADJUSTMENT",
                    description: prev.description || `Điều chỉnh từ kiểm kê ${data.docno}`,
                }));
                setPrefilledFromAudit(true);
            } catch {
                setPrefilledFromAudit(true);
            }
        };
        fillFromAudit();
    }, [searchParams, prefilledFromAudit]);

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const handleFormChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleCustomerChange = (customerId) => {
        const found = customers.find((c) => String(c.id) === String(customerId));
        setForm((prev) => ({ ...prev, customerId, address: found?.address || "" }));
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
                next[idx].batchId = "";
                next[idx].batchCode = "";
                next[idx].unitCost = "";
                next[idx].price = "";
                next[idx].selectedLocations = [];
            }
            if (field === "batchId") {
                const found = batches.find((b) => String(b.id) === String(value));
                next[idx].batchCode = found?.batchCode || "";
                next[idx].unitCost = found?.unitCost ? String(found.unitCost) : "";
                next[idx].price = calcSalePrice(found?.unitCost);
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
            const locations = await getAvailableLocations(itemId);
            const total = (locations || []).reduce((sum, loc) => {
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

    const openLocationModal = async (idx) => {
        const row = rows[idx];
        if (!row.itemId) { showToast("error", "Vui lòng chọn mặt hàng trước."); return; }
        if (!row.quantity || Number(row.quantity) <= 0) { showToast("error", "Vui lòng nhập số lượng trước."); return; }
        setLocModal({ open: true, rowIdx: idx, locations: [], loading: true });
        try {
            const data = await getAvailableLocations(row.itemId);
            setLocModal((prev) => ({ ...prev, locations: data, loading: false }));
        } catch {
            setLocModal((prev) => ({ ...prev, locations: [], loading: false }));
            showToast("error", "Không thể tải danh sách vị trí có hàng.");
        }
    };

    const handleLocConfirm = (locs) => {
        const idx = locModal.rowIdx;
        setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], selectedLocations: locs }; return next; });
        setLocModal({ open: false, rowIdx: null, locations: [], loading: false });
    };

    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0);

    const handleSave = async () => {
        if (!form.date) { showToast("error", "Vui lòng chọn ngày."); return; }
        if (!form.docno.trim()) { showToast("error", "Vui lòng nhập số chứng từ."); return; }
        if (!form.customerId) { showToast("error", "Vui lòng chọn đối tượng."); return; }
        if (rows.length === 0) { showToast("error", "Vui lòng thêm ít nhất một dòng vật tư."); return; }
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r.itemId) { showToast("error", `Dòng ${i + 1}: Vui lòng chọn mặt hàng.`); return; }
            if (!r.quantity || Number(r.quantity) <= 0) { showToast("error", `Dòng ${i + 1}: Số lượng không hợp lệ.`); return; }
            if (r.selectedLocations.length === 0) { showToast("error", `Dòng ${i + 1}: Vui lòng chọn vị trí xuất hàng.`); return; }
        }
        const details = rows.flatMap((r) =>
            r.selectedLocations.map((loc) => ({
                itemId: Number(r.itemId),
                batchId: r.batchId ? Number(r.batchId) : undefined,
                locationId: Number(loc.locationId),
                quantity: Number(loc.allocQty),
                unitprice: Number(r.price) || 0,
            }))
        );
        setSaving(true);
        const adjAuditId = searchParams.get("auditId");
        try {
            const result = await createIssue({
                docno: form.docno.trim(),
                docDate: form.date,
                description: form.description.trim(),
                customerId: Number(form.customerId),
                docType: form.docType,
                ...(adjAuditId ? { inventoryAuditId: Number(adjAuditId) } : {}),
                details,
            });
            if (result?.success) {
                showToast("success", "Tạo phiếu xuất kho thành công!");
                // Lưu ID phiếu để AuditDetailPage kiểm tra status sau này
                const newId = result?.data?.id;
                if (adjAuditId && form.docType === "ADJUSTMENT" && newId) {
                    localStorage.setItem(`audit_adj_issue_id_${adjAuditId}`, String(newId));
                }
                setTimeout(() => navigate(newId ? `/issues/${newId}` : "/issues"), 1200);
            } else {
                showToast("error", result?.message || "Tạo phiếu thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra khi tạo phiếu xuất kho.");
        } finally { setSaving(false); }
    };

    const currentRow = locModal.rowIdx !== null ? rows[locModal.rowIdx] : null;

    return (
        <>
            {toast && (
                <div className={`sp-toast ${toast.type === "success" ? "sp-toast-success" : "sp-toast-error"}`}>{toast.msg}</div>
            )}
            <LocationModal
                open={locModal.open}
                onClose={() => setLocModal((p) => ({ ...p, open: false }))}
                onConfirm={handleLocConfirm}
                loading={locModal.loading}
                locations={locModal.locations}
                quantity={currentRow?.quantity || 0}
                rowName={currentRow?.itemcode || ""}
                itemId={currentRow?.itemId || ""}
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
                    <div className="rc-form-card">

                        {/* ── Header row ── */}
                        <div className="rc-header-row">
                            <label className="rc-form-label">Ngày</label>
                            <input type="date" className="rc-form-input" style={{ minWidth: 150 }} value={form.date} onChange={(e) => handleFormChange("date", e.target.value)} />
                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Số</label>
                            <input className="rc-form-input" style={{ minWidth: 200 }} placeholder="Nhập số chứng từ" value={form.docno} onChange={(e) => handleFormChange("docno", e.target.value)} />
                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Loại</label>
                            <select className="rc-form-select" value={form.docType} onChange={(e) => handleFormChange("docType", e.target.value)}>
                                <option value="NORMAL">Thông thường</option>
                                <option value="ADJUSTMENT">Điều chỉnh</option>
                            </select>
                        </div>

                        {/* ── Đối tượng ── */}
                        <div className="rc-form-row">
                            <label className="rc-form-label">Đối tượng</label>
                            <select className="rc-form-select rc-form-full" value={form.customerId} onChange={(e) => handleCustomerChange(e.target.value)} disabled={loadingData}>
                                <option value="">Chọn đối tượng</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.customercode ? `${c.customercode}: ` : ""}{c.customername}</option>
                                ))}
                            </select>
                        </div>

                        {/* ── Địa chỉ ── */}
                        <div className="rc-form-row">
                            <label className="rc-form-label">Địa chỉ</label>
                            <input className="rc-form-input rc-form-full" placeholder="Nhập địa chỉ" value={form.address} onChange={(e) => handleFormChange("address", e.target.value)} />
                        </div>

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
                                        <th style={{ width: "15%" }}>Tên vật tư hàng hóa</th>
                                        <th style={{ width: "14%" }}>Mã lô</th>
                                        <th style={{ width: "6%" }}>ĐVT</th>
                                        <th style={{ width: "6%" }}>SL</th>
                                        <th style={{ width: "9%" }}>Tồn hiện tại</th>
                                        <th style={{ width: "11%" }}>Vị trí xuất</th>
                                        <th style={{ width: "13%" }}>Đơn giá xuất</th>
                                        <th style={{ width: "9%" }}>Thành tiền</th>
                                        <th style={{ width: "4%" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr key={row._id}>
                                            <td className="rc-td-stt">{idx + 1}</td>
                                            <td>
                                                <select
                                                    className="rc-td-select"
                                                    value={row.itemId}
                                                    onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}
                                                    disabled={loadingData}
                                                >
                                                    <option value="">Chọn</option>
                                                    {items.map((it) => (
                                                        <option key={it.id} value={it.id}>{it.itemcode}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    className="rc-td-input"
                                                    value={row.itemname}
                                                    readOnly
                                                    placeholder="Tên hàng"
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    className="rc-td-select"
                                                    value={row.batchId}
                                                    onChange={(e) => handleRowChange(idx, "batchId", e.target.value)}
                                                    disabled={!row.itemId || loadingData}
                                                >
                                                    <option value="">-- Chọn lô --</option>
                                                    {batches
                                                        .filter((b) => String(b.itemId) === String(row.itemId) && (b.quantityRemaining ?? b.quantity) > 0)
                                                        .map((b) => (
                                                            <option key={b.id} value={b.id}>{b.batchCode} (còn: {b.quantityRemaining ?? b.quantity})</option>
                                                        ))}
                                                </select>
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
                                                    onChange={(e) => {
                                                        handleRowChange(idx, "quantity", e.target.value);
                                                        // Reset location selection when quantity changes
                                                        setRows((prev) => {
                                                            const next = [...prev];
                                                            next[idx] = { ...next[idx], selectedLocations: [] };
                                                            return next;
                                                        });
                                                    }}
                                                />
                                            </td>
                                            <td className="rc-td-num" style={{ color: Number(row.quantity) > (stockByItem[row.itemId]?.total ?? Number.POSITIVE_INFINITY) ? "#c62828" : "#4c6152" }}>
                                                {!row.itemId
                                                    ? "—"
                                                    : stockByItem[row.itemId]?.loading
                                                        ? "Đang tải..."
                                                        : stockByItem[row.itemId]?.error
                                                            ? "Lỗi"
                                                            : (stockByItem[row.itemId]?.total ?? 0)}
                                            </td>
                                            <td>
                                                <button
                                                    className={`rc-loc-btn${row.selectedLocations.length > 0 ? " rc-loc-btn-set" : ""}`}
                                                    onClick={() => openLocationModal(idx)}
                                                    type="button"
                                                >
                                                    {row.selectedLocations.length > 0
                                                        ? row.selectedLocations.map((l) => l.locationcode).join(" / ")
                                                        : "Chọn vị trí"} <IconChevron />
                                                </button>
                                            </td>
                                            <td>
                                                <input
                                                    className="rc-td-input rc-td-num"
                                                    style={{ background: row.price ? "#f0faf4" : undefined, fontWeight: row.price ? 600 : undefined, color: "#1E3A2F" }}
                                                    type="number"
                                                    min="0"
                                                    value={row.price}
                                                    onChange={(e) => handleRowChange(idx, "price", e.target.value)}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="rc-td-num">
                                                {formatMoney((Number(row.quantity) || 0) * (Number(row.price) || 0))}
                                            </td>
                                            <td>
                                                {rows.length > 1 && (
                                                    <button className="rc-del-btn" onClick={() => handleRemoveRow(idx)} type="button" title="Xóa dòng">
                                                        <IconTrash />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="rc-add-row" onClick={handleAddRow}>
                                        <td colSpan={12}>
                                            <button className="rc-add-row-btn" type="button">
                                                <IconPlus size={13} /> Thêm mới dữ liệu
                                            </button>
                                        </td>
                                    </tr>
                                    {totalAmount > 0 && (
                                        <tr className="rc-total-row">
                                            <td colSpan={9} style={{ textAlign: "right", paddingRight: 12 }}>Tổng cộng</td>
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
