import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./batches.css";
import { createBatch } from "../../api/batchApi";
import { getAvailableLocations } from "../../api/receiptApi";
import { getAllItems } from "../../api/itemApi";
import TopbarRight from "../../components/TopbarRight";

const EMPTY_FORM = {
    itemId: "",
    receiptDetailId: "",
    manufactureDate: "",
    expiryDate: "",
    unitCost: "",
    quantity: "",
};

export default function BatchCreatePage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [locModal, setLocModal] = useState({ open: false, suggestions: [], loading: false });
    const [selectedLocations, setSelectedLocations] = useState([]); // [{locationId, locationcode, allocQty}]

    useEffect(() => {
        getAllItems().then(setItems).catch(() => { });
    }, []);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

    const validate = () => {
        const errs = {};
        if (!form.itemId) errs.itemId = "Bắt buộc";
        if (!form.receiptDetailId) errs.receiptDetailId = "Bắt buộc";
        if (!form.unitCost || Number(form.unitCost) <= 0) errs.unitCost = "Phải lớn hơn 0";
        if (!form.quantity || Number(form.quantity) <= 0) errs.quantity = "Phải lớn hơn 0";
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
        setSaving(true);
        setError(null);
        try {
            const totalQty = selectedLocations.length > 0
                ? selectedLocations.reduce((s, l) => s + Number(l.allocQty || 0), 0)
                : Number(form.quantity);
            await createBatch({
                itemId: Number(form.itemId),
                receiptDetailId: Number(form.receiptDetailId),
                manufactureDate: form.manufactureDate || undefined,
                expiryDate: form.expiryDate || undefined,
                unitCost: Number(form.unitCost),
                quantity: Number(totalQty),
            });
            setSuccess(true);
            setTimeout(() => navigate("/batches"), 2000);
        } catch {
            setError("Tạo mới thất bại. Vui lòng thử lại.");
            setSaving(false);
        }
    };

    const openLocationModal = async () => {
        if (!form.itemId) { setError("Vui lòng chọn vật tư trước."); return; }
        if (!form.quantity || Number(form.quantity) <= 0) { setError("Vui lòng nhập số lượng trước."); return; }
        setLocModal({ open: true, suggestions: [], loading: true });
        try {
            const data = await getAvailableLocations(form.itemId);
            setLocModal({ open: true, suggestions: data, loading: false });
        } catch {
            setLocModal({ open: false, suggestions: [], loading: false });
            setError("Không thể tải gợi ý vị trí.");
        }
    };

    const handleLocConfirm = (locs) => {
        setSelectedLocations(locs);
        // update quantity to sum of allocations for clarity
        const total = (locs || []).reduce((s, l) => s + Number(l.allocQty || 0), 0);
        setForm((prev) => ({ ...prev, quantity: String(total) }));
        setLocModal({ open: false, suggestions: [], loading: false });
    };

    // Icons reused for modal
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

    // Location modal (simplified copy from ReceiptCreatePage)
    function LocationModal({ open, onClose, onConfirm, loading, suggestions, quantity, rowName }) {
        const [search, setSearch] = useState("");
        const [rackFilter, setRackFilter] = useState("Tất cả dãy");
        const [selected, setSelected] = useState(new Map()); // Map<locationId, allocQty>

        useEffect(() => {
            if (open) { setSearch(""); setRackFilter("Tất cả dãy"); setSelected(new Map()); }
        }, [open]);

        if (!open) return null;

        const qty = Number(quantity) || 0;
        const existingLocs = suggestions.filter((s) => s.type === "EXISTING");
        const emptyLocs = suggestions.filter((s) => s.type === "EMPTY");
        const partialLocs = suggestions.filter((s) => s.type === "PARTIAL");
        const totalAllocated = Array.from(selected.values()).reduce((a, b) => a + b, 0);
        const remaining = Math.max(0, qty - totalAllocated);
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
                const cap = loc.remainingCapacity == null ? Infinity : Number(loc.remainingCapacity || 0);
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
            const cap = loc.remainingCapacity == null ? Infinity : Number(loc.remainingCapacity || 0);
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
                    <td>{cap === Infinity ? "∞" : cap}</td>
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
                        <div style={{ background: "#f3faf6", border: "1px solid #c6dfd0", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem", color: "#4c6152", marginBottom: 6 }}>
                                <span>Tổng cần nhập: <strong style={{ color: "#1E3A2F" }}>{qty}</strong></span>
                                <span>Đã phân bổ: <strong style={{ color: "#1E854A" }}>{totalAllocated}</strong></span>
                                <span>Còn lại: <strong style={{ color: remaining > 0 ? "#e65100" : "#1E854A" }}>{remaining}</strong></span>
                            </div>
                            <div style={{ background: "#d4edda", borderRadius: 4, height: 8, overflow: "hidden" }}>
                                <div style={{ background: remaining === 0 ? "#2DBE60" : "#f9a825", width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 0.2s" }} />
                            </div>
                            {remaining > 0 && qty > 0 && suggestions.length > 0 && !suggestions.some((s) => (s.remainingCapacity == null ? Infinity : Number(s.remainingCapacity || 0)) >= qty) && (
                                <div style={{ marginTop: 6, fontSize: "0.8rem", color: "#e65100", display: "flex", alignItems: "center", gap: 4 }}>
                                    <IconWarn /> Số lượng vượt sức chứa 1 vị trí — vui lòng chọn nhiều vị trí để phân bổ đủ.
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

    return (
        <>
            {success && (
                <div className="sp-toast sp-toast-success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="9 12 11 14 15 10" />
                    </svg>
                    Bạn đã thêm mới lô hàng thành công
                </div>
            )}
            <div className="sp-main">
                {/* Topbar */}
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Danh mục &rsaquo;{" "}
                            <span className="sp-breadcrumb-link" onClick={() => navigate("/batches")}>
                                Danh mục lô vật tư hàng hóa
                            </span>{" "}
                            &rsaquo;{" "}
                            <span className="sp-breadcrumb-active">Thêm mới lô hàng</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                {/* Content */}
                <div className="sp-content">
                    <h1 className="sp-title">Thêm mới lô hàng</h1>

                    <div className="sd-card">
                        {/* Section header */}
                        <div className="sd-section-hd">
                            <span className="sd-section-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DBE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="9 12 11 14 15 10" />
                                </svg>
                            </span>
                            Thông tin lô hàng
                        </div>

                        {/* Form */}
                        <div className="sd-form">
                            {error && <div className="sd-error-banner">{error}</div>}

                            <div className="sd-field">
                                <label className="sd-label">Vật tư hàng hóa <span className="sd-required">*</span></label>
                                <div className="sd-input-wrap">
                                    <select
                                        className={`sd-select${fieldErrors.itemId ? " sd-input-error" : ""}`}
                                        value={form.itemId}
                                        onChange={(e) => handleChange("itemId", e.target.value)}
                                    >
                                        <option value="">-- Chọn vật tư --</option>
                                        {items.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.itemcode} – {item.itemname}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.itemId && <span className="sd-error-msg">{fieldErrors.itemId}</span>}
                                </div>
                            </div>

                            <div className="sd-field">
                                <label className="sd-label">ID dòng phiếu nhập <span className="sd-required">*</span></label>
                                <div className="sd-input-wrap">
                                    <input
                                        className={`sd-input${fieldErrors.receiptDetailId ? " sd-input-error" : ""}`}
                                        type="number"
                                        min="1"
                                        placeholder="Nhập ID dòng phiếu nhập"
                                        value={form.receiptDetailId}
                                        onChange={(e) => handleChange("receiptDetailId", e.target.value)}
                                    />
                                    {fieldErrors.receiptDetailId && <span className="sd-error-msg">{fieldErrors.receiptDetailId}</span>}
                                </div>
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Số lượng <span className="sd-required">*</span></label>
                                    <div className="sd-input-wrap">
                                        <input
                                            className={`sd-input${fieldErrors.quantity ? " sd-input-error" : ""}`}
                                            type="number"
                                            min="0.00001"
                                            step="any"
                                            placeholder="Nhập số lượng"
                                            value={form.quantity}
                                            onChange={(e) => handleChange("quantity", e.target.value)}
                                        />
                                        {fieldErrors.quantity && <span className="sd-error-msg">{fieldErrors.quantity}</span>}
                                    </div>
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Đơn giá nhập <span className="sd-required">*</span></label>
                                    <div className="sd-input-wrap">
                                        <input
                                            className={`sd-input${fieldErrors.unitCost ? " sd-input-error" : ""}`}
                                            type="number"
                                            min="0.00001"
                                            step="any"
                                            placeholder="Nhập đơn giá nhập"
                                            value={form.unitCost}
                                            onChange={(e) => handleChange("unitCost", e.target.value)}
                                        />
                                        {fieldErrors.unitCost && <span className="sd-error-msg">{fieldErrors.unitCost}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="sd-field">
                                <label className="sd-label">Vị trí lưu trữ</label>
                                <div className="sd-input-wrap">
                                    <button type="button" className={`sd-btn-outline${selectedLocations.length > 0 ? " sd-btn-set" : ""}`} onClick={openLocationModal}>
                                        {selectedLocations.length > 0 ? selectedLocations.map((l) => `${l.locationcode}(${l.allocQty})`).join(" / ") : "Chọn vị trí"}
                                    </button>
                                </div>
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Ngày sản xuất</label>
                                    <input
                                        className="sd-input"
                                        type="date"
                                        value={form.manufactureDate}
                                        onChange={(e) => handleChange("manufactureDate", e.target.value)}
                                    />
                                </div>
                                <div className="sd-field-half" />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sd-footer">
                            <button className="sd-btn-back" onClick={() => navigate("/batches")}>Hủy</button>
                            <button className="sd-btn-edit" onClick={handleSave} disabled={saving}>
                                {saving ? "Đang lưu..." : "Lưu"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <LocationModal
                open={locModal.open}
                onClose={() => setLocModal({ open: false, suggestions: [], loading: false })}
                onConfirm={handleLocConfirm}
                loading={locModal.loading}
                suggestions={locModal.suggestions}
                quantity={form.quantity}
                rowName={items.find((it) => String(it.id) === String(form.itemId))?.itemcode || ""}
            />
        </>
    );
}
