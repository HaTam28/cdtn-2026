import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./partners.css";
import { createCustomer } from "../../api/customerApi";
import TopbarRight from "../../components/TopbarRight";

const EMPTY_FORM = {
    customercode: "", customername: "", address: "",
    email: "", mobile: "", partnername: "", partnermobile: "",
    ownername: "", taxcode: "", itemcatg: "",
    bankaccount: "", bankname: "",
    iscustomer: false, issupplier: false,
};

function IconCheck() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DBE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
        </svg>
    );
}

function IconChevron({ open }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

export default function PartnersCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [openBasic, setOpenBasic] = useState(true);
    const [openDetail, setOpenDetail] = useState(true);
    const [prefilledFromClone, setPrefilledFromClone] = useState(false);

    useEffect(() => {
        const clone = location.state?.clone;
        if (!clone || prefilledFromClone) return;
        setForm({
            ...EMPTY_FORM,
            customercode: clone.customercode || "",
            customername: clone.customername || "",
            address: clone.address || "",
            email: clone.email || "",
            mobile: clone.mobile || "",
            partnername: clone.partnername || "",
            partnermobile: clone.partnermobile || "",
            ownername: clone.ownername || "",
            taxcode: clone.taxcode || "",
            itemcatg: clone.itemcatg || "",
            bankaccount: clone.bankaccount || "",
            bankname: clone.bankname || "",
            iscustomer: !!clone.iscustomer,
            issupplier: !!clone.issupplier,
        });
        setPrefilledFromClone(true);
    }, [location.state, prefilledFromClone]);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

    const validate = () => {
        const errs = {};
        if (!form.customercode.trim()) errs.customercode = "Bắt buộc";
        if (!form.customername.trim()) errs.customername = "Bắt buộc";
        if (!form.iscustomer && !form.issupplier) errs.role = "Ít nhất phải chọn 1: Là khách hàng hoặc Là nhà cung cấp";
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFieldErrors(errs); if (!form.iscustomer && !form.issupplier) setOpenBasic(true); return; }
        setSaving(true);
        setError(null);
        try {
            await createCustomer({
                customercode: form.customercode,
                customername: form.customername,
                address: form.address,
                email: form.email,
                mobile: form.mobile,
                partnername: form.partnername,
                partnermobile: form.partnermobile,
                ownername: form.ownername,
                taxcode: form.taxcode,
                itemcatg: form.itemcatg,
                bankaccount: form.bankaccount,
                bankname: form.bankname,
                iscustomer: form.iscustomer,
                issupplier: form.issupplier,
                modifiedBy: "user",
                isActive: true,
            });
            setShowToast(true);
            setTimeout(() => navigate("/partners"), 2000);
        } catch {
            setError("Thêm mới thất bại. Vui lòng thử lại.");
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
                        Danh mục &rsaquo;{" "}
                        <span className="sp-breadcrumb-link" onClick={() => navigate("/partners")}>
                            Danh mục đối tượng
                        </span>
                        {" "}&rsaquo;{" "}
                        <span className="sp-breadcrumb-active">Thêm mới đối tượng</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            {/* Toast */}
            {showToast && (
                <div className="sp-toast sp-toast-success">
                    Bạn đã thêm mới thành công đối tượng
                </div>
            )}

            {/* Content */}
            <div className="sp-content">
                <h1 className="sp-title">Thêm mới đối tượng</h1>

                <div className="sd-two-sections">
                    {/* ── Thông tin chung ── */}
                    <div className="sd-card">
                        <div className="sd-section-hd" style={{ cursor: "pointer" }} onClick={() => setOpenBasic((v) => !v)}>
                            <span className="sd-section-icon"><IconCheck /></span>
                            Thông tin chung
                            <span className="sd-section-hd-chevron"><IconChevron open={openBasic} /></span>
                        </div>
                        {openBasic && (
                            <div className="sd-form">
                                <div className="sd-field sd-field-row" style={{ alignItems: "flex-start" }}>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Mã đối tượng <span className="sd-required">*</span></label>
                                        <div className="sd-input-wrap">
                                            <input
                                                className={`sd-input${fieldErrors.customercode ? " sd-input-error" : ""}`}
                                                placeholder="Nhập mã đối tượng"
                                                value={form.customercode}
                                                onChange={(e) => set("customercode", e.target.value)}
                                            />
                                            {fieldErrors.customercode && <span className="sd-error-msg">{fieldErrors.customercode}</span>}
                                        </div>
                                    </div>
                                    <div className="sd-field-half" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                                        <div style={{ display: "flex", gap: 16 }}>
                                            <label className="sd-check-label">
                                                <input
                                                    type="checkbox"
                                                    checked={form.iscustomer}
                                                    onChange={(e) => { set("iscustomer", e.target.checked); if (fieldErrors.role) setFieldErrors((prev) => { const n = { ...prev }; delete n.role; return n; }); }}
                                                />
                                                Là khách hàng
                                            </label>
                                            <label className="sd-check-label">
                                                <input
                                                    type="checkbox"
                                                    checked={form.issupplier}
                                                    onChange={(e) => { set("issupplier", e.target.checked); if (fieldErrors.role) setFieldErrors((prev) => { const n = { ...prev }; delete n.role; return n; }); }}
                                                />
                                                Là nhà cung cấp
                                            </label>
                                        </div>
                                        {fieldErrors.role && <span className="sd-error-msg" style={{ paddingLeft: 0 }}>{fieldErrors.role}</span>}
                                    </div>
                                </div>

                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Tên doanh nghiệp <span className="sd-required">*</span></label>
                                        <div className="sd-input-wrap">
                                            <input
                                                className={`sd-input${fieldErrors.customername ? " sd-input-error" : ""}`}
                                                placeholder="Nhập tên doanh nghiệp"
                                                value={form.customername}
                                                onChange={(e) => set("customername", e.target.value)}
                                            />
                                            {fieldErrors.customername && <span className="sd-error-msg">{fieldErrors.customername}</span>}
                                        </div>
                                    </div>
                                    <div className="sd-field-half" />
                                </div>

                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Địa chỉ liên hệ</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập địa chỉ"
                                            value={form.address}
                                            onChange={(e) => set("address", e.target.value)}
                                        />
                                    </div>
                                    <div className="sd-field-half" />
                                </div>

                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Email</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập email"
                                            value={form.email}
                                            onChange={(e) => set("email", e.target.value)}
                                        />
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Số điện thoại</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập số điện thoại"
                                            value={form.mobile}
                                            onChange={(e) => set("mobile", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Đối tác liên hệ</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập đối tác"
                                            value={form.partnername}
                                            onChange={(e) => set("partnername", e.target.value)}
                                        />
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">SDT đối tác</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập SDT"
                                            value={form.partnermobile}
                                            onChange={(e) => set("partnermobile", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Đại diện pháp luật</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập đại diện pháp luật"
                                            value={form.ownername}
                                            onChange={(e) => set("ownername", e.target.value)}
                                        />
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Mã số thuế</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập mã số thuế"
                                            value={form.taxcode}
                                            onChange={(e) => set("taxcode", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Thông tin chi tiết ── */}
                    <div className="sd-card">
                        <div className="sd-section-hd" style={{ cursor: "pointer" }} onClick={() => setOpenDetail((v) => !v)}>
                            <span className="sd-section-icon"><IconCheck /></span>
                            Thông tin chi tiết
                            <span className="sd-section-hd-chevron"><IconChevron open={openDetail} /></span>
                        </div>
                        {openDetail && (
                            <div className="sd-form">
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Ngành hàng</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập ngành hàng"
                                            value={form.itemcatg}
                                            onChange={(e) => set("itemcatg", e.target.value)}
                                        />
                                    </div>
                                    <div className="sd-field-half" />
                                </div>

                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Tài khoản NH</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập tài khoản ngân hàng"
                                            value={form.bankaccount}
                                            onChange={(e) => set("bankaccount", e.target.value)}
                                        />
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Tên ngân hàng</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập tên ngân hàng"
                                            value={form.bankname}
                                            onChange={(e) => set("bankname", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {error && (
                        <div className="sp-status-row sp-status-error">{error}</div>
                    )}
                    <div className="sd-footer">
                        <button className="sd-btn-back" disabled={saving} onClick={() => navigate("/partners")}>
                            Hủy bỏ
                        </button>
                        <button className="sd-btn-edit" disabled={saving} onClick={handleSave}>
                            {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
