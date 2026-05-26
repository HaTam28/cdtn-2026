import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import { createLocation } from "../../api/locationApi";
import TopbarRight from "../../components/TopbarRight";

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

export default function LocationsCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [toast, setToast] = useState(false);
    const [prefilledFromClone, setPrefilledFromClone] = useState(false);

    useEffect(() => {
        const clone = location.state?.clone;
        if (!clone || prefilledFromClone) return;
        setForm({
            ...EMPTY_FORM,
            locationcode: clone.locationcode || "",
            locationname: clone.locationname || "",
            rackno: clone.rackno || "",
            floorno: clone.floorno || "",
            columnno: clone.columnno || "",
            capacity: clone.capacity || "",
            description: clone.description || "",
            isActive: typeof clone.isActive === "boolean" ? clone.isActive : true,
        });
        setPrefilledFromClone(true);
    }, [location.state, prefilledFromClone]);

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
            await createLocation({
                locationcode: form.locationcode,
                locationname: form.locationname,
                rackno: form.rackno,
                floorno: form.floorno,
                columnno: form.columnno,
                capacity: form.capacity ? Number(form.capacity) : null,
                description: form.description,
                isActive: form.isActive,
                createdAt: now,
                modifiedAt: null,
                modifiedBy: user.username || "",
            });
            setToast(true);
            setTimeout(() => navigate("/locations"), 1500);
        } catch {
            setError("Tạo mới thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sp-main">
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Danh mục &rsaquo;{" "}
                        <span className="sp-breadcrumb-link" onClick={() => navigate("/locations")}>
                            Danh mục vị trí
                        </span>
                        {" "}&rsaquo;{" "}
                        <span className="sp-breadcrumb-active">Thêm mới vị trí</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Thêm mới vị trí</h1>

                <div className="sd-two-sections">
                    {error && <div className="sd-error-banner" style={{ marginBottom: 12 }}>{error}</div>}
                    {toast && (
                        <div style={{ background: "#f0fff4", color: "#27ae60", borderRadius: 7, padding: "8px 14px", marginBottom: 12 }}>
                            Tạo mới vị trí thành công!
                        </div>
                    )}

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
                                            placeholder="A - 01 - 01"
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
                                            placeholder="A - 01 - 01"
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
                                        placeholder="A"
                                        onChange={(e) => set("rackno", e.target.value)}
                                    />
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Kệ</label>
                                    <input
                                        className="sd-input"
                                        value={form.floorno}
                                        placeholder="01"
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
                                        placeholder="01"
                                        onChange={(e) => set("columnno", e.target.value)}
                                    />
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Sức chứa</label>
                                    <input
                                        className="sd-input"
                                        type="number"
                                        value={form.capacity}
                                        placeholder="50"
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
                                        placeholder="Linh kiện máy sấy"
                                        onChange={(e) => set("description", e.target.value)}
                                    />
                                </div>
                                <div className="sd-field-half" />
                            </div>
                        </div>
                    </div>

                    <div className="sd-footer-actions">
                        <button className="sp-btn-outline" onClick={() => navigate("/locations")} disabled={saving}>Hủy bỏ</button>
                        <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
