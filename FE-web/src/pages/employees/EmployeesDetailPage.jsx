import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import DatePicker from "../../components/DatePicker";
import { getEmployeeById, updateEmployee, deleteEmployee } from "../../api/employeeApi";
import TopbarRight from "../../components/TopbarRight";

const EMPTY_FORM = {
    usercode: "", fullname: "", username: "", email: "",
    department: "", phoneNumber: "", address: "",
    birthdate: "", gender: "", firstworkingdate: "",
    bankaccount: "", bankname: "", isActive: true, role: "STAFF",
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

export default function EmployeesDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF";
    const isAdmin = user?.role === "ADMIN";
    const isManager = user?.role === "MANAGER";

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [original, setOriginal] = useState({ ...EMPTY_FORM });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [toast, setToast] = useState(null);
    const [openSection, setOpenSection] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ open: false, title: "", message: "", type: "danger", onConfirm: null });

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    useEffect(() => {
        if (isStaff) { navigate("/"); return; }
        setLoading(true);
        setError(null);
        getEmployeeById(id)
            .then((data) => {
                const f = { ...EMPTY_FORM, ...data };
                setForm(f);
                setOriginal(f);
            })
            .catch(() => setError("Không thể tải thông tin nhân viên."))
            .finally(() => setLoading(false));
    }, [id]);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        
        const validateField = (name, val) => {
            if (name === "phoneNumber") {
                if (val && !/^[0-9]*$/.test(val)) return "Số điện thoại chỉ được nhập số";
                if (val && val.length !== 10) return "Số điện thoại phải nhập đúng 10 số";
            }
            if (name === "fullname") {
                if (!val?.trim()) return "Bắt buộc";
            }
            return "";
        };
        const err = validateField(field, value);
        setFieldErrors((prev) => {
            const n = { ...prev };
            if (err) n[field] = err; else delete n[field];
            return n;
        });
    };

    const validate = () => {
        const errs = {};
        if (!form.usercode?.trim()) errs.usercode = "Bắt buộc";
        if (!form.fullname?.trim()) errs.fullname = "Bắt buộc";
        if (form.phoneNumber) {
            if (!/^[0-9]*$/.test(form.phoneNumber)) {
                errs.phoneNumber = "Số điện thoại chỉ được nhập số";
            } else if (form.phoneNumber.length !== 10) {
                errs.phoneNumber = "Số điện thoại phải nhập đúng 10 số";
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
            const updated = await updateEmployee(id, {
                usercode: form.usercode,
                fullname: form.fullname,
                username: form.username,
                email: form.email,
                department: form.department,
                phoneNumber: form.phoneNumber,
                address: form.address,
                birthdate: form.birthdate || null,
                gender: form.gender,
                firstworkingdate: form.firstworkingdate || null,
                bankaccount: form.bankaccount,
                bankname: form.bankname,
                isActive: form.isActive,
                role: form.role,
            });
            const f = { ...EMPTY_FORM, ...updated };
            setOriginal(f);
            setForm(f);
            setIsEditing(false);
        } catch (err) {
            setError(err?.response?.data?.message || "Lưu thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({ ...original });
        setFieldErrors({});
        setIsEditing(false);
    };

    // canEditTarget: ADMIN can edit any; MANAGER can only edit STAFF accounts. Restricted to active accounts.
    const canEditTarget = (isAdmin || (isManager && original.role === "STAFF")) && original.isActive;
    // canDeactivate: ADMIN can deactivate any; MANAGER can only deactivate STAFF
    const canDeactivate = (isAdmin || (isManager && original.role === "STAFF")) && form.isActive;
    // canReactivate: ADMIN can reactivate any; MANAGER can only reactivate STAFF
    const canReactivate = (isAdmin || (isManager && original.role === "STAFF")) && !form.isActive;

    const handleDeactivate = async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        setDeactivating(true);
        setError(null);
        try {
            const res = await deleteEmployee(id);
            if (res?.success) {
                showToast("success", "Vô hiệu hóa tài khoản thành công.");
                setForm((prev) => ({ ...prev, isActive: false }));
                setOriginal((prev) => ({ ...prev, isActive: false }));
            } else {
                setError(res?.message || "Vô hiệu hóa thất bại.");
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Vô hiệu hóa thất bại. Vui lòng thử lại.");
        } finally {
            setDeactivating(false);
        }
    };

    const handleReactivate = async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        setSaving(true);
        setError(null);
        try {
            const updated = await updateEmployee(id, {
                usercode: form.usercode,
                fullname: form.fullname,
                username: form.username,
                email: form.email,
                department: form.department,
                phoneNumber: form.phoneNumber,
                address: form.address,
                birthdate: form.birthdate || null,
                gender: form.gender,
                firstworkingdate: form.firstworkingdate || null,
                bankaccount: form.bankaccount,
                bankname: form.bankname,
                isActive: true,
                role: form.role,
            });
            const f = { ...EMPTY_FORM, ...updated };
            setOriginal(f);
            setForm(f);
            showToast("success", "Kích hoạt lại tài khoản thành công.");
        } catch (err) {
            setError(err?.response?.data?.message || "Kích hoạt lại thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sp-main">
            {toast && (
                <div className={`sp-toast ${toast.type === "success" ? "sp-toast-success" : "sp-toast-error"}`}>{toast.msg}</div>
            )}
            {confirmModal.open && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: "32px 36px", minWidth: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: confirmModal.type === "danger" ? "1.5px solid #ffccbc" : "1.5px solid #c6dfd0", textAlign: "center" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: confirmModal.type === "danger" ? "#fbe9e7" : "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            {confirmModal.type === "danger" ? (
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            ) : (
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2dbe60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="9 12 11 14 15 10" />
                                </svg>
                            )}
                        </div>
                        <h3 style={{ margin: "0 0 8px", color: confirmModal.type === "danger" ? "#c0392b" : "#1e3a2f", fontSize: "1.1rem", fontWeight: 700 }}>{confirmModal.title}</h3>
                        <p style={{ margin: "0 0 24px", color: "#4c6152", fontSize: "0.92rem", lineHeight: "1.4" }}>{confirmModal.message}</p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button
                                className="sp-btn-outline"
                                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                                style={{ minWidth: 100 }}
                            >Hủy bỏ</button>
                            <button
                                className="sp-btn-primary"
                                onClick={confirmModal.onConfirm}
                                style={{ minWidth: 120, background: confirmModal.type === "danger" ? "#c0392b" : "#2dbe60", borderColor: confirmModal.type === "danger" ? "#c0392b" : "#2dbe60" }}
                            >Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Danh mục &rsaquo;{" "}
                        <span className="sp-breadcrumb-link" onClick={() => navigate("/employees")}>
                            Danh mục nhân viên
                        </span>
                        {" "}&rsaquo;{" "}
                        <span className="sp-breadcrumb-active">Chi tiết nhân viên</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Chi tiết nhân viên</h1>

                {loading ? (
                    <div className="sp-status-row">Đang tải...</div>
                ) : error && !saving ? (
                    <div className="sp-status-row sp-status-error">{error}</div>
                ) : (
                    <div className="sd-two-sections">
                        <div className="sd-card">
                            <div className="sd-section-hd" style={{ cursor: "pointer" }} onClick={() => setOpenSection((v) => !v)}>
                                <span className="sd-section-icon"><IconCheck /></span>
                                Thông tin nhân viên
                                <span className="sd-section-hd-chevron"><IconChevron open={openSection} /></span>
                            </div>

                            {openSection && (
                                <div className="sd-form">
                                    {/* Row 1: Mã | Tên đăng nhập */}
                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Mã <span className="sd-required">*</span></label>
                                            <div className="sd-input-wrap">
                                                <input
                                                    className={`sd-input${fieldErrors.usercode ? " sd-input-error" : ""}`}
                                                    value={form.usercode}
                                                    disabled
                                                    onChange={(e) => set("usercode", e.target.value)}
                                                />
                                                {fieldErrors.usercode && <span className="sd-error-msg">{fieldErrors.usercode}</span>}
                                            </div>
                                        </div>
                                        <div className="sd-field-half">
                                            <label className="sd-label">Tên đăng nhập</label>
                                            <input
                                                className="sd-input"
                                                value={form.username}
                                                disabled={!isEditing}
                                                onChange={(e) => set("username", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Họ và Tên | Email */}
                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Họ và Tên <span className="sd-required">*</span></label>
                                            <div className="sd-input-wrap">
                                                <input
                                                    className={`sd-input${fieldErrors.fullname ? " sd-input-error" : ""}`}
                                                    value={form.fullname}
                                                    disabled={!isEditing}
                                                    onChange={(e) => set("fullname", e.target.value.replace(/[^a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂĐỔỞỚỜỞỠỨỪỬỮỰỳýỵỷỹđĐ ]/g, ""))}
                                                />
                                                {fieldErrors.fullname && <span className="sd-error-msg">{fieldErrors.fullname}</span>}
                                            </div>
                                        </div>
                                        <div className="sd-field-half">
                                            <label className="sd-label">Email</label>
                                            <input
                                                className="sd-input"
                                                value={form.email}
                                                disabled={!isEditing}
                                                onChange={(e) => set("email", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Bộ phận | Số điện thoại */}
                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Bộ phận</label>
                                            <input
                                                className="sd-input"
                                                value={form.department}
                                                disabled
                                                onChange={(e) => set("department", e.target.value)}
                                            />
                                        </div>
                                        <div className="sd-field-half">
                                            <label className="sd-label">Số điện thoại</label>
                                            <div className="sd-input-wrap">
                                                <input
                                                    className={`sd-input${fieldErrors.phoneNumber ? " sd-input-error" : ""}`}
                                                    value={form.phoneNumber}
                                                    disabled={!isEditing}
                                                    onChange={(e) => set("phoneNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                                />
                                                {fieldErrors.phoneNumber && <span className="sd-error-msg">{fieldErrors.phoneNumber}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 4: Địa chỉ */}
                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Địa chỉ</label>
                                            <input
                                                className="sd-input"
                                                value={form.address}
                                                disabled={!isEditing}
                                                onChange={(e) => set("address", e.target.value)}
                                            />
                                        </div>
                                        <div className="sd-field-half" />
                                    </div>

                                    {/* Row 5: Ngày sinh | Giới tính */}
                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Ngày sinh</label>
                                            <DatePicker
                                                value={form.birthdate}
                                                onChange={(v) => set("birthdate", v)}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                        <div className="sd-field-half">
                                            <label className="sd-label">Giới tính</label>
                                            <select
                                                className="sd-input sd-select"
                                                value={form.gender}
                                                disabled={!isEditing}
                                                onChange={(e) => set("gender", e.target.value)}
                                            >
                                                <option value="">Chọn giới tính</option>
                                                <option value="Nam">Nam</option>
                                                <option value="Nữ">Nữ</option>
                                                <option value="Khác">Khác</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 6: Ngày vào làm | Tài khoản NH */}
                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Ngày vào làm</label>
                                            <DatePicker
                                                value={form.firstworkingdate}
                                                onChange={(v) => set("firstworkingdate", v)}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                        <div className="sd-field-half">
                                            <label className="sd-label">Tài khoản NH</label>
                                            <input
                                                className="sd-input"
                                                value={form.bankaccount}
                                                disabled={!isEditing}
                                                onChange={(e) => set("bankaccount", e.target.value.replace(/\D/g, ""))}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 7: Tên ngân hàng */}
                                    <div className="sd-field sd-field-row">
                                        <div className="sd-field-half">
                                            <label className="sd-label">Tên ngân hàng</label>
                                            <input
                                                className="sd-input"
                                                value={form.bankname}
                                                disabled={!isEditing}
                                                onChange={(e) => set("bankname", e.target.value)}
                                            />
                                        </div>
                                        <div className="sd-field-half" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Thông tin tài khoản ── */}
                        <div className="sd-card" style={{ marginTop: 16 }}>
                            <div className="sd-section-hd">
                                <span className="sd-section-icon"><IconCheck /></span>
                                Thông tin tài khoản
                            </div>
                            <div className="sd-form">
                                {/* Tên đăng nhập | Phân quyền */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Tên đăng nhập</label>
                                        <input
                                            className="sd-input"
                                            value={form.username}
                                            disabled={!isEditing}
                                            onChange={(e) => set("username", e.target.value)}
                                        />
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Phân quyền</label>
                                        <select
                                            className="sd-input sd-select"
                                            value={form.role}
                                            disabled={!isEditing}
                                            onChange={(e) => set("role", e.target.value)}
                                        >
                                            <option value="STAFF">STAFF</option>
                                            {isAdmin && <option value="MANAGER">MANAGER</option>}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Footer actions ── */}
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
                                    <button className="sp-btn-outline" onClick={() => navigate("/employees")}>Quay lại</button>
                                    {canDeactivate && (
                                        <button
                                            className="sp-btn-outline"
                                            style={{ color: "#c0392b", borderColor: "#c0392b" }}
                                            onClick={() => setConfirmModal({
                                                open: true,
                                                title: "Vô hiệu hóa tài khoản",
                                                message: `Bạn có chắc muốn vô hiệu hóa tài khoản "${form.fullname}" không?`,
                                                type: "danger",
                                                onConfirm: handleDeactivate
                                            })}
                                            disabled={deactivating}
                                        >
                                            {deactivating ? "Đang xử lý..." : "Vô hiệu hóa"}
                                        </button>
                                    )}
                                    {canReactivate && (
                                        <button
                                            className="sp-btn-outline"
                                            style={{ color: "#2dbe60", borderColor: "#2dbe60" }}
                                            onClick={() => setConfirmModal({
                                                open: true,
                                                title: "Kích hoạt lại tài khoản",
                                                message: `Bạn có chắc muốn gỡ bỏ vô hiệu hóa (kích hoạt lại) tài khoản "${form.fullname}" không?`,
                                                type: "success",
                                                onConfirm: handleReactivate
                                            })}
                                            disabled={saving}
                                        >
                                            {saving ? "Đang xử lý..." : "Kích hoạt lại"}
                                        </button>
                                    )}
                                    {canEditTarget && (
                                        <button className="sp-btn-primary" onClick={() => setIsEditing(true)}>Sửa</button>
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
