import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import DatePicker from "../../components/DatePicker";
import { createEmployee, getAllEmployees } from "../../api/employeeApi";
import TopbarRight from "../../components/TopbarRight";

const EMPTY_FORM = {
    usercode: "", fullname: "", username: "", email: "",
    department: "", phoneNumber: "", address: "",
    birthdate: "", gender: "", firstworkingdate: "",
    bankaccount: "", bankname: "", isActive: true, role: "STAFF",
    password: "", confirmPassword: "",
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

export default function EmployeesCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = currentUser?.role === "ADMIN";

    useEffect(() => {
        if (currentUser?.role === "STAFF") navigate("/");
    }, []);

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [openSection, setOpenSection] = useState(true);
    const [openAccountSection, setOpenAccountSection] = useState(true);
    const [prefilledFromClone, setPrefilledFromClone] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        getAllEmployees()
            .then((data) => {
                const maxId = data.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0);
                setForm((prev) => ({ ...prev, usercode: `NV${maxId + 1}` }));
            })
            .catch(() => {
                setForm((prev) => ({ ...prev, usercode: "NV1" }));
            });
    }, []);

    useEffect(() => {
        const clone = location.state?.clone;
        if (!clone || prefilledFromClone) return;
        setForm({
            ...EMPTY_FORM,
            usercode: clone.usercode || "",
            fullname: clone.fullname || "",
            username: clone.username || "",
            email: clone.email || "",
            department: clone.department || "",
            phoneNumber: clone.phoneNumber || "",
            address: clone.address || "",
            birthdate: clone.birthdate || "",
            gender: clone.gender || "",
            firstworkingdate: clone.firstworkingdate || "",
            bankaccount: clone.bankaccount || "",
            bankname: clone.bankname || "",
            isActive: typeof clone.isActive === "boolean" ? clone.isActive : true,
            role: clone.role || "STAFF",
            password: "",
            confirmPassword: "",
        });
        setPrefilledFromClone(true);
    }, [location.state, prefilledFromClone]);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

    const isBirthdateValid = (dateStr) => {
        if (!dateStr) return true;
        const birth = new Date(dateStr);
        const threshold = new Date(birth.getFullYear() + 18, birth.getMonth(), birth.getDate());
        return new Date() >= threshold;
    };

    const validatePassword = (value) => {
        if (!value) return "Bắt buộc";
        if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự.";
        if (/\s/.test(value)) return "Mật khẩu không được chứa khoảng trắng.";
        if (!/[A-Z]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ cái viết hoa.";
        if (!/[a-z]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ cái viết thường.";
        if (!/[0-9]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ số (0-9).";
        if (!/[^A-Za-z0-9]/.test(value)) return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.";
        return "";
    };

    const validate = () => {
        const errs = {};
        if (!form.usercode?.trim()) errs.usercode = "Bắt buộc";
        if (!form.fullname?.trim()) errs.fullname = "Bắt buộc";
        if (!form.username?.trim()) errs.username = "Bắt buộc";
        if (form.birthdate && !isBirthdateValid(form.birthdate)) errs.birthdate = "Nhân viên phải đủ 18 tuổi.";
        const pwdErr = validatePassword(form.password);
        if (pwdErr) errs.password = pwdErr;
        if (form.password !== form.confirmPassword) errs.confirmPassword = "Mật khẩu không khớp";
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
        setSaving(true);
        setError(null);
        try {
            await createEmployee({
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
                role: form.role || "STAFF",
                password: form.password,
            });
            setShowToast(true);
            setTimeout(() => navigate("/employees"), 2000);
        } catch (err) {
            const msg = err?.response?.data?.message || "";
            const status = err?.response?.status;
            if (status === 409 || status === 400) {
                const lmsg = msg.toLowerCase();
                if (/usercode|m[aã] nh[aâ]n vi[eê]n/i.test(lmsg)) {
                    setFieldErrors((prev) => ({ ...prev, usercode: msg || "Mã nhân viên đã tồn tại." }));
                } else if (/username|t[eê]n đ[aă]ng nh[aậ]p/i.test(lmsg)) {
                    setFieldErrors((prev) => ({ ...prev, username: msg || "Tên đăng nhập đã tồn tại." }));
                } else if (/email/i.test(lmsg)) {
                    setFieldErrors((prev) => ({ ...prev, email: msg || "Email đã tồn tại." }));
                } else {
                    setError(msg || "Thêm mới thất bại. Vui lòng thử lại.");
                }
            } else {
                setError(msg || "Thêm mới thất bại. Vui lòng thử lại.");
            }
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
                        <span className="sp-breadcrumb-link" onClick={() => navigate("/employees")}>
                            Danh mục nhân viên
                        </span>
                        {" "}&rsaquo;{" "}
                        <span className="sp-breadcrumb-active">Thêm mới nhân viên</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            {showToast && (
                <div className="sp-toast sp-toast-success">
                    Bạn đã thêm mới nhân viên thành công
                </div>
            )}

            <div className="sp-content">
                <h1 className="sp-title">Thêm mới nhân viên</h1>

                <div className="sd-two-sections">
                    <div className="sd-card">
                        <div className="sd-section-hd" style={{ cursor: "pointer" }} onClick={() => setOpenSection((v) => !v)}>
                            <span className="sd-section-icon"><IconCheck /></span>
                            Thông tin nhân viên
                            <span className="sd-section-hd-chevron"><IconChevron open={openSection} /></span>
                        </div>

                        {openSection && (
                            <div className="sd-form">
                                {error && <div className="sd-error-banner">{error}</div>}

                                {/* Row 1: Mã | Họ và Tên */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Mã nhân viên</label>
                                        <div className="sd-input-wrap">
                                            <input
                                                className="sd-input"
                                                value={form.usercode}
                                                readOnly
                                                disabled
                                                placeholder="Đang tạo..."
                                            />
                                        </div>
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Họ và Tên <span className="sd-required">*</span></label>
                                        <div className="sd-input-wrap">
                                            <input
                                                className={`sd-input${fieldErrors.fullname ? " sd-input-error" : ""}`}
                                                placeholder="Nhập họ và tên"
                                                value={form.fullname}
                                                onChange={(e) => set("fullname", e.target.value)}
                                            />
                                            {fieldErrors.fullname && <span className="sd-error-msg">{fieldErrors.fullname}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Email | Số điện thoại */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Email</label>
                                        <div className="sd-input-wrap">
                                            <input
                                                className={`sd-input${fieldErrors.email ? " sd-input-error" : ""}`}
                                                placeholder="Nhập email"
                                                value={form.email}
                                                onChange={(e) => set("email", e.target.value)}
                                            />
                                            {fieldErrors.email && <span className="sd-error-msg">{fieldErrors.email}</span>}
                                        </div>
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Số điện thoại</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập SDT"
                                            value={form.phoneNumber}
                                            onChange={(e) => set("phoneNumber", e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Bộ phận | Địa chỉ */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Bộ phận</label>
                                        <select
                                            className="sd-input"
                                            value={form.department}
                                            onChange={(e) => set("department", e.target.value)}
                                        >
                                            <option value="">-- Chọn bộ phận --</option>
                                            <option value="Kho">Kho</option>
                                            <option value="Kế Toán">Kế Toán</option>
                                        </select>
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Địa chỉ</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập địa chỉ"
                                            value={form.address}
                                            onChange={(e) => set("address", e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Row 5: Ngày sinh | Giới tính */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Ngày sinh</label>
                                        <DatePicker
                                            value={form.birthdate}
                                            onChange={(v) => set("birthdate", v)}
                                        />
                                        {fieldErrors.birthdate && <span className="sd-error-msg">{fieldErrors.birthdate}</span>}
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Giới tính</label>
                                        <select
                                            className="sd-input sd-select"
                                            value={form.gender}
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
                                        />
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Tài khoản NH</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập số tài khoản ngân hàng"
                                            value={form.bankaccount}
                                            onChange={(e) => set("bankaccount", e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Row 7: Tên ngân hàng */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Tên ngân hàng</label>
                                        <input
                                            className="sd-input"
                                            placeholder="Nhập tên ngân hàng"
                                            value={form.bankname}
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
                        <div className="sd-section-hd" style={{ cursor: "pointer" }} onClick={() => setOpenAccountSection((v) => !v)}>
                            <span className="sd-section-icon"><IconCheck /></span>
                            Thông tin tài khoản
                            <span className="sd-section-hd-chevron"><IconChevron open={openAccountSection} /></span>
                        </div>
                        {openAccountSection && (
                            <div className="sd-form">
                                {/* Tên đăng nhập | Phân quyền */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Tên đăng nhập <span className="sd-required">*</span></label>
                                        <div className="sd-input-wrap">
                                            <input
                                                className={`sd-input${fieldErrors.username ? " sd-input-error" : ""}`}
                                                placeholder="Nhập tên đăng nhập"
                                                value={form.username}
                                                onChange={(e) => set("username", e.target.value)}
                                            />
                                            {fieldErrors.username && <span className="sd-error-msg">{fieldErrors.username}</span>}
                                        </div>
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Phân quyền</label>
                                        <select
                                            className="sd-input sd-select"
                                            value={form.role}
                                            onChange={(e) => set("role", e.target.value)}
                                        >
                                            <option value="STAFF">STAFF</option>
                                            {isAdmin && <option value="MANAGER">MANAGER</option>}
                                        </select>
                                    </div>
                                </div>

                                {/* Mật khẩu | Xác nhận mật khẩu */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Mật khẩu <span className="sd-required">*</span></label>
                                        <div className="sd-input-wrap">
                                            <div className="sd-pw-wrap">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className={`sd-input${fieldErrors.password ? " sd-input-error" : ""}`}
                                                    placeholder="Tối thiểu 6 ký tự"
                                                    value={form.password}
                                                    onChange={(e) => set("password", e.target.value)}
                                                />
                                                <button type="button" className="sd-pw-toggle" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} style={{ visibility: form.password ? "visible" : "hidden" }}>
                                                    {showPassword
                                                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                    }
                                                </button>
                                            </div>
                                            {fieldErrors.password && <span className="sd-error-msg">{fieldErrors.password}</span>}
                                        </div>
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Xác nhận mật khẩu <span className="sd-required">*</span></label>
                                        <div className="sd-input-wrap">
                                            <div className="sd-pw-wrap">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    className={`sd-input${fieldErrors.confirmPassword ? " sd-input-error" : ""}`}
                                                    placeholder="Nhập lại mật khẩu"
                                                    value={form.confirmPassword}
                                                    onChange={(e) => set("confirmPassword", e.target.value)}
                                                />
                                                <button type="button" className="sd-pw-toggle" tabIndex={-1} onClick={() => setShowConfirmPassword((v) => !v)} style={{ visibility: form.confirmPassword ? "visible" : "hidden" }}>
                                                    {showConfirmPassword
                                                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                    }
                                                </button>
                                            </div>
                                            {fieldErrors.confirmPassword && <span className="sd-error-msg">{fieldErrors.confirmPassword}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Footer actions ── */}
                    <div className="sd-footer-actions">
                        <button className="sp-btn-outline" onClick={() => navigate("/employees")} disabled={saving}>Hủy bỏ</button>
                        <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? "Đang lưu..." : "Tạo tài khoản"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
