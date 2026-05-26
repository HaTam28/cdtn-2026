import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import DatePicker from "../../components/DatePicker";
import { getEmployeeById, updateEmployee } from "../../api/employeeApi";
import TopbarRight from "../../components/TopbarRight";

const EMPTY_FORM = {
    usercode: "", fullname: "", username: "", email: "",
    department: "", phoneNumber: "", address: "",
    birthdate: "", gender: "",
    bankaccount: "", bankname: "", isActive: true, role: "STAFF",
    firstworkingdate: "",
};

function IconCheck() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DBE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
        </svg>
    );
}

export default function AccountPage() {
    const navigate = useNavigate();

    const [userId, setUserId] = useState(null);
    const [userInitial, setUserInitial] = useState("U");
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (!stored) { navigate("/login"); return; }
        let parsed;
        try { parsed = JSON.parse(stored); } catch { navigate("/login"); return; }
        const id = parsed.id ?? parsed.userId ?? parsed.employeeId ?? parsed.user?.id ?? parsed.user?.userId;
        if (!id) { navigate("/login"); return; }
        setUserId(id);
        if (parsed.fullname) setUserInitial(parsed.fullname.charAt(0).toUpperCase());

        const role = parsed.role ?? parsed.user?.role;
        if (role === "STAFF") {
            setForm({ ...EMPTY_FORM, ...parsed, role: role || "STAFF" });
            setLoading(false);
            return;
        }

        setLoading(true);
        getEmployeeById(id)
            .then((data) => {
                setForm({ ...EMPTY_FORM, ...data });
            })
            .catch((err) => {
                if (err?.response?.status === 403) {
                    setForm({ ...EMPTY_FORM, ...parsed, role: role || "STAFF" });
                    return;
                }
                setError("Không thể tải thông tin tài khoản.");
            })
            .finally(() => setLoading(false));
    }, []);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    };

    const validate = () => {
        const errs = {};
        if (!form.fullname?.trim()) errs.fullname = "Bắt buộc";
        if (!form.email?.trim()) errs.email = "Bắt buộc";
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const updated = await updateEmployee(userId, {
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
            const newForm = { ...EMPTY_FORM, ...updated };
            setForm(newForm);
            const stored = localStorage.getItem("user");
            if (stored) {
                try {
                    const old = JSON.parse(stored);
                    localStorage.setItem("user", JSON.stringify({ ...old, ...updated }));
                } catch { /* ignore */ }
            }
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch {
            setError("Cập nhật thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sp-main">
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Tài khoản &rsaquo;{" "}
                        <span className="sp-breadcrumb-active">Chi tiết Tài khoản cá nhân</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Chi tiết Tài khoản cá nhân</h1>

                {loading ? (
                    <div className="sp-status-row">Đang tải...</div>
                ) : (
                    <div className="sd-two-sections">
                        {error && <div className="sd-error-banner" style={{ marginBottom: 12 }}>{error}</div>}
                        {success && (
                            <div style={{ background: "#f0fff4", color: "#27ae60", borderRadius: 7, padding: "8px 14px", marginBottom: 12 }}>
                                Cập nhật tài khoản thành công!
                            </div>
                        )}

                        {/* Thông tin chung */}
                        <div className="sd-card">
                            <div className="sd-section-hd">
                                <span className="sd-section-icon"><IconCheck /></span>
                                Thông tin chung
                            </div>

                            <div className="sd-form">
                                {/* Row 1: Mã nhân viên (full width, readonly) */}
                                <div className="sd-field">
                                    <label className="sd-label">Mã nhân viên <span className="sd-required">*</span></label>
                                    <input
                                        className="sd-input"
                                        value={form.usercode}
                                        disabled
                                    />
                                </div>

                                {/* Row 2: Họ và tên (full width) */}
                                <div className="sd-field">
                                    <label className="sd-label">Họ và tên <span className="sd-required">*</span></label>
                                    <div className="sd-input-wrap">
                                        <input
                                            className={`sd-input${fieldErrors.fullname ? " sd-input-error" : ""}`}
                                            value={form.fullname}
                                            onChange={(e) => set("fullname", e.target.value)}
                                        />
                                        {fieldErrors.fullname && <span className="sd-error-msg">{fieldErrors.fullname}</span>}
                                    </div>
                                </div>

                                {/* Row 3: Tên đăng nhập | Email */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Tên đăng nhập <span className="sd-required">*</span></label>
                                        <input
                                            className="sd-input"
                                            value={form.username}
                                            disabled
                                        />
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Email <span className="sd-required">*</span></label>
                                        <div className="sd-input-wrap">
                                            <input
                                                className={`sd-input${fieldErrors.email ? " sd-input-error" : ""}`}
                                                value={form.email}
                                                onChange={(e) => set("email", e.target.value)}
                                            />
                                            {fieldErrors.email && <span className="sd-error-msg">{fieldErrors.email}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 4: Địa chỉ | Bộ phận */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Địa chỉ</label>
                                        <input
                                            className="sd-input"
                                            value={form.address}
                                            onChange={(e) => set("address", e.target.value)}
                                        />
                                    </div>
                                    <div className="sd-field-half">
                                        <label className="sd-label">Bộ phận <span className="sd-required">*</span></label>
                                        <input
                                            className="sd-input"
                                            value={form.department}
                                            onChange={(e) => set("department", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Thông tin chi tiết */}
                        <div className="sd-card">
                            <div className="sd-section-hd">
                                <span className="sd-section-icon"><IconCheck /></span>
                                Thông tin chi tiết
                            </div>

                            <div className="sd-form">
                                {/* Row 1: Ngày sinh (left half) */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Ngày sinh</label>
                                        <DatePicker
                                            value={form.birthdate}
                                            onChange={(v) => set("birthdate", v)}
                                            placeholder="dd/mm/yyyy"
                                        />
                                    </div>
                                    <div className="sd-field-half" />
                                </div>

                                {/* Row 2: Giới tính (left half) */}
                                <div className="sd-field sd-field-row">
                                    <div className="sd-field-half">
                                        <label className="sd-label">Giới tính</label>
                                        <select
                                            className="sd-input sd-select"
                                            value={form.gender}
                                            onChange={(e) => set("gender", e.target.value)}
                                        >
                                            <option value="">-- Chọn --</option>
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>
                                    <div className="sd-field-half" />
                                </div>

                                {/* Row 3: Tài khoản NH (full width) */}
                                <div className="sd-field">
                                    <label className="sd-label">Tài khoản NH</label>
                                    <input
                                        className="sd-input"
                                        value={form.bankaccount}
                                        onChange={(e) => set("bankaccount", e.target.value)}
                                    />
                                </div>

                                {/* Row 4: Tên ngân hàng (full width) */}
                                <div className="sd-field">
                                    <label className="sd-label">Tên ngân hàng</label>
                                    <input
                                        className="sd-input"
                                        value={form.bankname}
                                        onChange={(e) => set("bankname", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="sd-footer-actions">
                            <button className="sp-btn-outline" onClick={() => navigate(-1)}>Quay lại</button>
                            <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? "Đang lưu..." : "Cập nhật"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
