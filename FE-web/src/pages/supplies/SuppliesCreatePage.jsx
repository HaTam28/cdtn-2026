import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./supplies.css";
import { createItem, getAllItems } from "../../api/itemApi";
import TopbarRight from "../../components/TopbarRight";

const EMPTY_FORM = {
    itemcode: "",
    itemname: "",
    invoicename: "",
    itemcatg: "Hàng hóa",
    description: "",
    unitof: "Cái",
    itemtype: "Vật tư hàng hóa",
};

export default function SuppliesCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [prefilledFromClone, setPrefilledFromClone] = useState(false);
    const [allItemCodes, setAllItemCodes] = useState(new Set());

    useEffect(() => {
        getAllItems().then((data) => {
            setAllItemCodes(new Set((data || []).map((it) => (it.itemcode || "").trim().toLowerCase())));
        }).catch(() => { });
    }, []);

    useEffect(() => {
        const clone = location.state?.clone;
        if (!clone || prefilledFromClone) return;
        setForm({
            ...EMPTY_FORM,
            itemcode: clone.itemcode || "",
            itemname: clone.itemname || "",
            invoicename: clone.invoicename || "",
            itemcatg: clone.itemcatg || "Hàng hóa",
            description: clone.description || "",
            unitof: clone.unitof || "Cái",
            itemtype: clone.itemtype || "Vật tư hàng hóa",
        });
        setPrefilledFromClone(true);
    }, [location.state, prefilledFromClone]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === "itemcode") {
            if (value.trim() && allItemCodes.has(value.trim().toLowerCase())) {
                setFieldErrors((prev) => ({ ...prev, itemcode: "Mã vật tư đã tồn tại" }));
            } else {
                setFieldErrors((prev) => { const n = { ...prev }; delete n.itemcode; return n; });
            }
        } else if (fieldErrors[field]) {
            setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
        }
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
        if (fieldErrors.itemcode) return;
        setSaving(true);
        setError(null);
        try {
            await createItem({
                itemcode: form.itemcode,
                itemname: form.itemname,
                invoicename: form.invoicename,
                itemcatg: form.itemcatg,
                description: form.description,
                unitof: form.unitof,
                itemtype: form.itemtype,
                modifiedBy: "user",
            });
            setSuccess(true);
            setTimeout(() => navigate("/supplies"), 2000);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 409 || status === 400) {
                setFieldErrors((prev) => ({ ...prev, itemcode: "Mã vật tư đã tồn tại" }));
            } else {
                setError("Đã xảy ra lỗi. Vui lòng thử lại.");
            }
            setSaving(false);
        }
    };

    return (
        <>
            {success && (
                <div className="sp-toast sp-toast-success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="9 12 11 14 15 10" />
                    </svg>
                    Bạn đã thêm mới thành công vật tư hàng hóa
                </div>
            )}
            <div className="sp-main">
                {/* Topbar */}
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Danh mục &rsaquo;{" "}
                            <span
                                className="sp-breadcrumb-link"
                                onClick={() => navigate("/supplies")}
                            >
                                Danh mục vật tư hàng hóa
                            </span>{" "}
                            &rsaquo;{" "}
                            <span className="sp-breadcrumb-active">Thêm mới vật tư hàng hóa</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                {/* Content */}
                <div className="sp-content">
                    <h1 className="sp-title">Thêm mới vật tư hàng hóa</h1>

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
                                            placeholder="Nhập mã vật tư"
                                            value={form.itemcode}
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
                                            placeholder="Nhập tên vật tư hàng hóa"
                                            value={form.itemname}
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
                                        placeholder="Nhập tên trên hóa đơn"
                                        value={form.invoicename}
                                        onChange={(e) => handleChange("invoicename", e.target.value)}
                                    />
                                </div>
                                <div className="sd-field-half">
                                    <label className="sd-label">Ngành hàng</label>
                                    <input
                                        className="sd-input"
                                        placeholder="Nhập ngành hàng"
                                        value={form.itemcatg}
                                        onChange={(e) => handleChange("itemcatg", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="sd-field sd-field-row">
                                <div className="sd-field-half">
                                    <label className="sd-label">Mô tả / Thông số kỹ thuật</label>
                                    <input
                                        className="sd-input"
                                        placeholder="Nhập mô tả / thông số kỹ thuật"
                                        value={form.description}
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
                                            placeholder="Nhập đơn vị tính"
                                            value={form.unitof}
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
                                            placeholder="Nhập loại vật tư"
                                            value={form.itemtype}
                                            onChange={(e) => handleChange("itemtype", e.target.value)}
                                        />
                                        {fieldErrors.itemtype && <span className="sd-error-msg">{fieldErrors.itemtype}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && <div className="sp-status-error" style={{ padding: "0 24px 12px" }}>{error}</div>}

                        {/* Footer */}
                        <div className="sd-footer">
                            <button className="sd-btn-back" disabled={saving} onClick={() => navigate("/supplies")}>
                                Hủy bỏ
                            </button>
                            <button className="sd-btn-edit" disabled={saving} onClick={handleSave}>
                                {saving ? "Đang lưu..." : "Lưu"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
