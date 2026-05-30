import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./supplies.css";
import { getItemById, updateItem } from "../../api/itemApi";
import { getAllBatches } from "../../api/batchApi";
import TopbarRight from "../../components/TopbarRight";
import notify from "../../utils/notify";

const EMPTY_FORM = {
    itemcode: "", itemname: "", invoicename: "",
    itemcatg: "", description: "", unitof: "", itemtype: "",
    minStockLevel: "", maxStockLevel: "",
};

export default function SuppliesDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [original, setOriginal] = useState({ ...EMPTY_FORM });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [currentStock, setCurrentStock] = useState(0);
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = currentUser?.role === "STAFF" || currentUser?.role === "NV";

    const fetchItem = async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, batches] = await Promise.all([getItemById(id), getAllBatches()]);
            // normalize backend field variants to the form's camelCase shape
            const normalized = {
                ...data,
                itemcode: data?.itemcode ?? data?.itemCode ?? data?.code ?? "",
                itemname: data?.itemname ?? data?.itemName ?? "",
                invoicename: data?.invoicename ?? data?.invoiceName ?? "",
                unitof: data?.unitof ?? data?.unitOf ?? "",
                itemcatg: data?.itemcatg ?? "",
                itemtype: data?.itemtype ?? "",
                // prefer explicit numeric/string values for inputs
                minStockLevel: data?.minStockLevel ?? data?.minstocklevel ?? "",
                maxStockLevel: data?.maxStockLevel ?? data?.maxstocklevel ?? "",
                description: data?.description ?? "",
            };

            setForm({ ...EMPTY_FORM, ...normalized });
            setOriginal({ ...EMPTY_FORM, ...normalized });

            const total = (batches || []).reduce((sum, batch) => {
                if (String(batch.itemId) !== String(id)) return sum;
                return sum + Number(batch.quantityRemaining ?? 0);
            }, 0);
            setCurrentStock(total);
        } catch (e) {
            setError("Không thể tải thông tin vật tư.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItem();
    }, [id]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

    const validate = () => {
        const errs = {};
        if (!form.itemcode.trim()) errs.itemcode = "Bắt buộc";
        if (!form.itemname.trim()) errs.itemname = "Bắt buộc";
        if (!form.unitof.trim()) errs.unitof = "Bắt buộc";
        if (!form.itemtype.trim()) errs.itemtype = "Bắt buộc";
        if (form.minStockLevel !== undefined && form.minStockLevel !== "" && (isNaN(Number(form.minStockLevel)) || Number(form.minStockLevel) < 0)) errs.minStockLevel = "Phải là số >= 0";
        if (form.maxStockLevel !== undefined && form.maxStockLevel !== "" && (isNaN(Number(form.maxStockLevel)) || Number(form.maxStockLevel) < 0)) errs.maxStockLevel = "Phải là số >= 0";
        // if both provided, ensure min <= max
        if (form.minStockLevel !== undefined && form.minStockLevel !== "" && form.maxStockLevel !== undefined && form.maxStockLevel !== "") {
            const minV = Number(form.minStockLevel);
            const maxV = Number(form.maxStockLevel);
            if (!isNaN(minV) && !isNaN(maxV) && minV > maxV) {
                errs.minStockLevel = "Tồn tối thiểu phải nhỏ hơn hoặc bằng Tồn tối đa";
                errs.maxStockLevel = "Tồn tối đa phải lớn hơn hoặc bằng Tồn tối thiểu";
            }
        }
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                itemcode: form.itemcode,
                itemname: form.itemname,
                invoicename: form.invoicename,
                itemcatg: form.itemcatg,
                description: form.description,
                unitof: form.unitof,
                itemtype: form.itemtype,
                modifiedBy: "user",
            };
            // Backend expects lowercase keys like `minstocklevel`/`maxstocklevel`.
            if (form.minStockLevel !== undefined) payload.minstocklevel = form.minStockLevel === "" ? undefined : Number(form.minStockLevel);
            if (form.maxStockLevel !== undefined) payload.maxstocklevel = form.maxStockLevel === "" ? undefined : Number(form.maxStockLevel);

            await updateItem(id, payload);
            // re-fetch fresh data from server to reflect any server-side normalization
            await fetchItem();
            setIsEditing(false);
        } catch {
            setError("Lưu thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sp-main">
            {/* Topbar */}
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Danh mục &rsaquo; <span
                            className="sp-breadcrumb-link"
                            onClick={() => navigate("/supplies")}
                        >Danh mục vật tư hàng hóa</span>
                        {" "}&rsaquo; <span className="sp-breadcrumb-active">Chi tiết vật tư hàng hóa</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            {/* Content */}
            <div className="sp-content">
                <h1 className="sp-title">Chi tiết vật tư hàng hóa</h1>

                {loading ? (
                    <div className="sp-status-row">Đang tải...</div>
                ) : error ? (
                    <div className="sp-status-row sp-status-error">{error}</div>
                ) : (
                    <div className="sd-card">
                        {/* Section header */}
                        <div className="sd-section-hd">
                            <span className="sd-section-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DBE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="9 12 11 14 15 10" />
                                </svg>
                            </span>
                            Thông tin vật tư hàng hóa
                        </div>

                        {/* Form */}
                        <div className="sd-form">
                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Mã vật tư <span className="sd-required">*</span></label>
                                    <div className="sd-input-wrap">
                                        <input
                                            className={`sd-input${fieldErrors.itemcode ? " sd-input-error" : ""}`}
                                            value={form.itemcode}
                                            disabled
                                            onChange={(e) => handleChange("itemcode", e.target.value)}
                                        />
                                        {fieldErrors.itemcode && <span className="sd-error-msg">{fieldErrors.itemcode}</span>}
                                    </div>
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Tên vật tư hàng hóa <span className="sd-required">*</span></label>
                                    <div className="sd-input-wrap">
                                        <input
                                            className={`sd-input${fieldErrors.itemname ? " sd-input-error" : ""}`}
                                            value={form.itemname}
                                            disabled={!isEditing}
                                            onChange={(e) => handleChange("itemname", e.target.value)}
                                        />
                                        {fieldErrors.itemname && <span className="sd-error-msg">{fieldErrors.itemname}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Tên trên hóa đơn</label>
                                    <input
                                        className="sd-input"
                                        value={form.invoicename}
                                        disabled={!isEditing}
                                        onChange={(e) => handleChange("invoicename", e.target.value)}
                                    />
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Ngành hàng</label>
                                    <input
                                        className="sd-input"
                                        value={form.itemcatg}
                                        disabled={!isEditing}
                                        onChange={(e) => handleChange("itemcatg", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Mô tả / Thông số kỹ thuật</label>
                                    <input
                                        className="sd-input"
                                        value={form.description}
                                        disabled={!isEditing}
                                        onChange={(e) => handleChange("description", e.target.value)}
                                    />
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Đơn vị tính</label>
                                    <input
                                        className={`sd-input${fieldErrors.unitof ? " sd-input-error" : ""}`}
                                        value={form.unitof}
                                        disabled={!isEditing}
                                        onChange={(e) => handleChange("unitof", e.target.value)}
                                    />
                                    {fieldErrors.unitof && <span className="sd-error-msg">{fieldErrors.unitof}</span>}
                                </div>
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Loại vật tư <span className="sd-required">*</span></label>
                                    <div className="sd-input-wrap">
                                        <input
                                            className={`sd-input${fieldErrors.itemtype ? " sd-input-error" : ""}`}
                                            value={form.itemtype}
                                            disabled={!isEditing}
                                            onChange={(e) => handleChange("itemtype", e.target.value)}
                                        />
                                        {fieldErrors.itemtype && <span className="sd-error-msg">{fieldErrors.itemtype}</span>}
                                    </div>
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Tồn tối thiểu</label>
                                    <div className="sd-input-wrap">
                                        <input
                                            type="number"
                                            min={0}
                                            className={`sd-input${fieldErrors.minStockLevel ? " sd-input-error" : ""}`}
                                            value={form.minStockLevel ?? ""}
                                            disabled={!isEditing}
                                            onChange={(e) => handleChange("minStockLevel", e.target.value)}
                                        />
                                        {fieldErrors.minStockLevel && <span className="sd-error-msg">{fieldErrors.minStockLevel}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Tồn hiện tại</label>
                                    <input className="sd-input" value={currentStock} disabled readOnly />
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Tồn tối đa</label>
                                    <div className="sd-input-wrap">
                                        <input
                                            type="number"
                                            min={0}
                                            className={`sd-input${fieldErrors.maxStockLevel ? " sd-input-error" : ""}`}
                                            value={form.maxStockLevel ?? ""}
                                            disabled={!isEditing}
                                            onChange={(e) => handleChange("maxStockLevel", e.target.value)}
                                        />
                                        {fieldErrors.maxStockLevel && <span className="sd-error-msg">{fieldErrors.maxStockLevel}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="sd-footer">
                            {isEditing ? (
                                <>
                                    <button className="sd-btn-back" disabled={saving} onClick={() => { setForm({ ...original }); setIsEditing(false); setFieldErrors({}); }}>
                                        Hủy
                                    </button>
                                    <button className="sd-btn-edit" disabled={saving} onClick={handleSave}>
                                        {saving ? "Đang lưu..." : "Lưu"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="sd-btn-back" onClick={() => navigate("/supplies")}>
                                        Quay lại
                                    </button>
                                    {!isStaff && (
                                        <button className="sd-btn-edit" onClick={() => setIsEditing(true)}>
                                            Sửa
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
