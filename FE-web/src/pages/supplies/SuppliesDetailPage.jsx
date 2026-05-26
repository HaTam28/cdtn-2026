import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./supplies.css";
import { getItemById, updateItem } from "../../api/itemApi";
import { getAllBatches } from "../../api/batchApi";
import TopbarRight from "../../components/TopbarRight";

const EMPTY_FORM = {
    itemcode: "", itemname: "", invoicename: "",
    itemcatg: "", description: "", unitof: "", itemtype: "",
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

    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([getItemById(id), getAllBatches()])
            .then(([data, batches]) => {
                setForm({ ...EMPTY_FORM, ...data });
                setOriginal({ ...EMPTY_FORM, ...data });
                const total = (batches || []).reduce((sum, batch) => {
                    if (String(batch.itemId) !== String(id)) return sum;
                    return sum + Number(batch.quantityRemaining ?? 0);
                }, 0);
                setCurrentStock(total);
            })
            .catch(() => setError("Không thể tải thông tin vật tư."))
            .finally(() => setLoading(false));
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
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
        setSaving(true);
        setError(null);
        try {
            const updated = await updateItem(id, {
                itemcode: form.itemcode,
                itemname: form.itemname,
                invoicename: form.invoicename,
                itemcatg: form.itemcatg,
                description: form.description,
                unitof: form.unitof,
                itemtype: form.itemtype,
                modifiedBy: "user",
            });
            setOriginal({ ...EMPTY_FORM, ...updated });
            setForm({ ...EMPTY_FORM, ...updated });
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
                                <div className="sd-field-half" />
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Đơn vị tính <span className="sd-required">*</span></label>
                                    <div className="sd-input-wrap">
                                        <input
                                            className={`sd-input${fieldErrors.unitof ? " sd-input-error" : ""}`}
                                            value={form.unitof}
                                            disabled={!isEditing}
                                            onChange={(e) => handleChange("unitof", e.target.value)}
                                        />
                                        {fieldErrors.unitof && <span className="sd-error-msg">{fieldErrors.unitof}</span>}
                                    </div>
                                </div>
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
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Tồn hiện tại</label>
                                    <input className="sd-input" value={currentStock} disabled readOnly />
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Tồn tối thiểu</label>
                                    <input className="sd-input" value={50} readOnly />
                                </div>
                            </div>
                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Tồn tối đa</label>
                                    <input className="sd-input" value={500} readOnly />
                                </div>
                                <div className="sd-field-half" />
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
                                    <button className="sd-btn-edit" onClick={() => setIsEditing(true)}>
                                        Sửa
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
