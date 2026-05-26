import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/authApi";
import "./LoginForm.css";
import logo from "../assets/logo.png";

export default function RegisterForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ usercode: "", fullname: "", username: "", email: "", password: "", department: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [usernameError, setUsernameError] = useState("");

    const set = (field, value) => {
        if (field === "username") setUsernameError("");
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setUsernameError("");
        if (!form.usercode || !form.fullname || !form.username || !form.email || !form.password || !form.department) {
            setError("Vui lòng điền đầy đủ các trường bắt buộc");
            return;
        }
        setLoading(true);
        try {
            const res = await register(form);
            if (res.success) {
                navigate("/login");
            } else {
                setError(res.message || "Đăng ký thất bại");
            }
        } catch (err) {
            const msg = err?.response?.data?.message || "";
            const status = err?.response?.status;
            if (status === 409 || /username|t.n .*ng nh.p|\buser\b/i.test(msg)) {
                setUsernameError(msg || "Tên đăng nhập đã tồn tại.");
            } else {
                setError(msg || "Lỗi kết nối. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="center-page">
            <div className="login-panel">
                <img className="login-logo" src={logo} alt="Logo" />
                <div className="login-copy">
                    <h1>Đăng ký tài khoản</h1>
                    <p className="supporting-text">
                        Tạo tài khoản mới để sử dụng hệ thống quản lý kho.
                    </p>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z" /></svg>
                        </span>
                        <input type="text" placeholder="Mã nhân viên *" value={form.usercode} onChange={(e) => set("usercode", e.target.value)} required />
                    </label>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z" /></svg>
                        </span>
                        <input type="text" placeholder="Họ và tên *" value={form.fullname} onChange={(e) => set("fullname", e.target.value)} required />
                    </label>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z" /></svg>
                        </span>
                        <input type="text" placeholder="Tên đăng nhập *" value={form.username} onChange={(e) => set("username", e.target.value)} required />
                    </label>
                    {usernameError && (
                        <div style={{ color: "#d32f2f", fontSize: "0.82rem", marginTop: -8, marginBottom: 4, paddingLeft: 2 }}>{usernameError}</div>
                    )}
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M21 8V7a5 5 0 0 0-10 0v1a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-5-3a3 3 0 0 1 3 3v1h-6V8a3 3 0 0 1 3-3Zm4 12a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1Z" /></svg>
                        </span>
                        <input type="email" placeholder="Email *" value={form.email} onChange={(e) => set("email", e.target.value)} required />
                    </label>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 7.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z" /></svg>
                        </span>
                        <input type="password" placeholder="Mật khẩu *" value={form.password} onChange={(e) => set("password", e.target.value)} required />
                    </label>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z" /></svg>
                        </span>
                        <input type="text" placeholder="Bộ phận *" value={form.department} onChange={(e) => set("department", e.target.value)} required />
                    </label>
                    {error && <div style={{ color: "red", marginBottom: 8, fontSize: "0.9rem" }}>{error}</div>}
                    <button className="login-button" type="submit" disabled={loading}>{loading ? "Đang đăng ký..." : "Đăng ký"}</button>
                    <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.9rem" }}>
                        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}