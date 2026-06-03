import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import { getLocationById, updateLocation, getItemsAtLocation } from "../../api/locationApi";
import { getBatchesByLocation } from "../../api/batchApi";
import TopbarRight from "../../components/TopbarRight";

function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "0";
    const num = Number(value);
    if (Number.isNaN(num)) return "0";
    return num.toLocaleString("vi-VN");
}

const EMPTY_FORM = {
    locationcode: "", locationname: "", rackno: "", floorno: "",
    columnno: "", capacity: "", description: "", isActive: true,
};

function IconCheck() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DBE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
        </svg>
    );
}

export default function LocationsDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [original, setOriginal] = useState({ ...EMPTY_FORM });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const [storedItems, setStoredItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        getLocationById(id)
            .then((data) => {
                const f = { ...EMPTY_FORM, ...data };
                setForm(f);
                setOriginal(f);
            })
            .catch(() => setError("Không thể tải thông tin vị trí."))
            .finally(() => setLoading(false));
        setItemsLoading(true);
        setItemsError(null);
        // Prefer batches-by-location endpoint when available (returns batch entries for this location)
        getBatchesByLocation(id)
            .then((list) => {
                if (Array.isArray(list) && list.length > 0) {
                    // Normalize each batch entry into a per-batch row
                    const rows = list.map((b, idx) => ({
                        rowId: `${b.id ?? b.batchId ?? b.batchCode ?? idx}`,
                        itemId: b.itemId ?? b.itemid ?? "",
                        itemcode: b.itemcode ?? b.itemCode ?? b.code ?? "",
                        itemname: b.itemname ?? b.name ?? "",
                        unitof: b.unitOf ?? b.unitof ?? b.unit ?? "",
                        quantity: Number(b.quantityRemaining ?? b.quantity ?? b.qty ?? 0),
                        batchCode: b.batchCode ?? (Array.isArray(b.batchCodes) && b.batchCodes[0]) ?? null,
                    }));
                    const filtered = rows.filter((r) => Number(r.quantity) > 0);
                    setStoredItems(filtered);
                    return;
                }
                // fallback to existing location items endpoint
                return getItemsAtLocation(id).then((data) => {
                    const raw = Array.isArray(data) ? data : (data?.items || []);
                    const rows = raw.flatMap((it, idx) => {
                        const codes = it.batchCodes ?? (it.batchCode ? [it.batchCode] : []);
                        const quantities = it.batchQuantities ?? it.batchQuantitiesList ?? null;
                        if (Array.isArray(codes) && codes.length > 0) {
                            // if per-batch quantities provided, map them; else if single code, use item.quantity; otherwise create single aggregated row
                            if (Array.isArray(quantities) && quantities.length === codes.length) {
                                return codes.map((code, i) => ({
                                    rowId: `${it.itemId ?? it.itemcode ?? idx}-${code}`,
                                    itemId: it.itemId ?? it.itemid ?? it.id ?? "",
                                    itemcode: it.itemcode ?? it.itemCode ?? it.code ?? "",
                                    itemname: it.itemname ?? it.name ?? "",
                                    unitof: it.unitOf ?? it.unitof ?? it.unit ?? "",
                                    quantity: Number(quantities[i] ?? 0),
                                    batchCode: code,
                                }));
                            }
                            if (codes.length === 1) {
                                return [{
                                    rowId: `${it.itemId ?? it.itemcode ?? idx}-${codes[0]}`,
                                    itemId: it.itemId ?? it.itemid ?? it.id ?? "",
                                    itemcode: it.itemcode ?? it.itemCode ?? it.code ?? "",
                                    itemname: it.itemname ?? it.name ?? "",
                                    unitof: it.unitOf ?? it.unitof ?? it.unit ?? "",
                                    quantity: Number(it.quantity ?? it.qty ?? 0),
                                    batchCode: codes[0],
                                }];
                            }
                            // multiple codes but no per-batch quantities: fall back to single aggregated row
                        }
                        return [{
                            rowId: `${it.itemId ?? it.itemcode ?? idx}`,
                            itemId: it.itemId ?? it.itemid ?? it.id ?? "",
                            itemcode: it.itemcode ?? it.itemCode ?? it.code ?? "",
                            itemname: it.itemname ?? it.name ?? "",
                            unitof: it.unitOf ?? it.unitof ?? it.unit ?? "",
                            quantity: Number(it.quantity ?? it.qty ?? 0),
                            batchCode: null,
                        }];
                    });
                    const filtered = rows.filter((r) => Number(r.quantity) > 0);
                    setStoredItems(filtered);
                });
            })
            .catch(() => {
                setItemsError("Không thể tải danh sách vật tư.");
                setStoredItems([]);
            })
            .finally(() => setItemsLoading(false));
    }, [id]);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

    const validate = () => {
        const errs = {};
        if (!form.locationcode?.trim()) errs.locationcode = "Bắt buộc";
        if (!form.locationname?.trim()) errs.locationname = "Bắt buộc";
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
        setSaving(true);
        setError(null);
        try {
            const now = new Date().toISOString();
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const updated = await updateLocation(id, {
                locationcode: form.locationcode,
                locationname: form.locationname,
                rackno: form.rackno,
                floorno: form.floorno,
                columnno: form.columnno,
                capacity: form.capacity ? Number(form.capacity) : null,
                description: form.description,
                isActive: form.isActive,
                modifiedAt: now,
                modifiedBy: user.username || "",
            });
            const f = { ...EMPTY_FORM, ...updated };
            setOriginal(f);
            setForm(f);
            setIsEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch {
            setError("Lưu thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({ ...original });
        setFieldErrors({});
        setIsEditing(false);
    };

    const itemRows = useMemo(() => (
        storedItems.map((item, idx) => ({
            rowId: item.rowId ?? `${item.itemId || item.itemcode || "item"}-${idx}`,
            itemcode: item.itemcode,
            itemname: item.itemname,
            unitof: item.unitof,
            quantity: item.quantity,
            batchCode: item.batchCode ?? null,
        }))
    ), [storedItems]);

    return (
        <>
            {success && (
                <div className="sp-toast sp-toast-success">
                    <IconCheck />
                    Bạn đã cập nhật thành công vị trí
                </div>
            )}
            <div className="sp-main">
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Danh mục &rsaquo;{" "}
                            <span className="sp-breadcrumb-link" onClick={() => navigate("/locations")}>
                                Danh mục vị trí
                            </span>
                            {" "}&rsaquo;{" "}
                            <span className="sp-breadcrumb-active">Chi tiết vị trí</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                <div className="sp-content">
                    <h1 className="sp-title">Chi tiết vị trí</h1>

                    {loading ? (
                        <div className="sp-status-row">Đang tải...</div>
                    ) : (
                        <div className="sd-two-sections">
                            {error && <div className="sd-error-banner" style={{ marginBottom: 12 }}>{error}</div>}

                            <div className="sd-card">
                                <div className="sd-section-hd">
                                    <span className="sd-section-icon"><IconCheck /></span>
                                    Thông tin chung
                                </div>

                                <div className="sd-form">
                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Mã vị trí <span className="sd-required">*</span></label>
                                            <div className="sd-input-wrap">
                                                <input
                                                    className={`sd-input${fieldErrors.locationcode ? " sd-input-error" : ""}`}
                                                    value={form.locationcode}
                                                    disabled
                                                    onChange={(e) => set("locationcode", e.target.value)}
                                                />
                                                {fieldErrors.locationcode && <span className="sd-error-msg">{fieldErrors.locationcode}</span>}
                                            </div>
                                        </div>
                                        <div className="sd-field-half">
                                            <label className="sd-label">Tên vị trí <span className="sd-required">*</span></label>
                                            <div className="sd-input-wrap">
                                                <input
                                                    className={`sd-input${fieldErrors.locationname ? " sd-input-error" : ""}`}
                                                    value={form.locationname}
                                                    disabled
                                                    onChange={(e) => set("locationname", e.target.value)}
                                                />
                                                {fieldErrors.locationname && <span className="sd-error-msg">{fieldErrors.locationname}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Dãy</label>
                                            <input
                                                className="sd-input"
                                                value={form.rackno}
                                                disabled={!isEditing}
                                                onChange={(e) => set("rackno", e.target.value)}
                                            />
                                        </div>
                                        <div className="sd-field-half">
                                            <label className="sd-label">Kệ</label>
                                            <input
                                                className="sd-input"
                                                value={form.floorno}
                                                disabled={!isEditing}
                                                onChange={(e) => set("floorno", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Tầng</label>
                                            <input
                                                className="sd-input"
                                                value={form.columnno}
                                                disabled={!isEditing}
                                                onChange={(e) => set("columnno", e.target.value)}
                                            />
                                        </div>
                                        <div className="sd-field-half">
                                            <label className="sd-label">Sức chứa</label>
                                            <input
                                                className="sd-input"
                                                type="number"
                                                value={form.capacity}
                                                disabled={!isEditing}
                                                onChange={(e) => set("capacity", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Diễn giải</label>
                                            <input
                                                className="sd-input"
                                                value={form.description}
                                                disabled={!isEditing}
                                                onChange={(e) => set("description", e.target.value)}
                                            />
                                        </div>
                                        <div className="sd-field-half" />
                                    </div>
                                </div>
                            </div>

                            <div className="sd-card" style={{ marginTop: 16 }}>
                                <div className="sd-section-hd">
                                    <span className="sd-section-icon"><IconCheck /></span>
                                    Danh sách vật tư tại vị trí
                                </div>
                                <div className="sp-table-wrap sp-scrollable">
                                    <table className="sp-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 60 }}>STT</th>
                                                <th>Mã vật tư</th>
                                                <th>Tên vật tư</th>
                                                <th style={{ width: 140 }}>Mã lô</th>
                                                <th style={{ width: 120 }}>Đơn vị</th>
                                                <th style={{ width: 140, textAlign: "right" }}>Số lượng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemsLoading ? (
                                                <tr><td colSpan={6} className="sp-status-row">Đang tải...</td></tr>
                                            ) : itemsError ? (
                                                <tr><td colSpan={6} className="sp-status-row sp-status-error">{itemsError}</td></tr>
                                            ) : itemRows.length === 0 ? (
                                                <tr><td colSpan={6} className="sp-status-row">Không có dữ liệu</td></tr>
                                            ) : itemRows.map((row, idx) => (
                                                <tr key={row.rowId}>
                                                    <td>{idx + 1}</td>
                                                    <td>{row.itemcode}</td>
                                                    <td>{row.itemname}</td>
                                                    <td>{row.batchCode || "—"}</td>
                                                    <td>{row.unitof}</td>
                                                    <td style={{ textAlign: "right" }}>{formatNumber(row.quantity)}</td>
                                                </tr>
                                            ))}
                                            {/* total row */}
                                            {(!itemsLoading && !itemsError && itemRows.length > 0) && (
                                                <tr style={{ fontWeight: 700, borderTop: "2px solid #eee" }}>
                                                    <td colSpan={5} style={{ textAlign: "right" }}>Tổng số lượng</td>
                                                    <td style={{ textAlign: "right" }}>
                                                        {formatNumber(itemRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0))}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="sd-footer-actions">
                                {isEditing ? (
                                    <>
                                        <button className="sp-btn-outline" onClick={handleCancel} disabled={saving}>Hủy bỏ</button>
                                        <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
                                            {saving ? "Đang lưu..." : "Lưu"}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="sp-btn-outline" onClick={() => navigate("/locations")}>Quay lại</button>
                                        <button className="sp-btn-primary" onClick={() => setIsEditing(true)}>Sửa</button>
                                    </>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
