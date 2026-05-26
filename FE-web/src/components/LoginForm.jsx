import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import "./LoginForm.css";
import logo from "../assets/logo.png";

const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

export default function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await login({ username, password });
            if (res.success) {
                localStorage.setItem("user", JSON.stringify(res.data));
                navigate("/overview");
            } else {
                setError(res.message || "Đăng nhập thất bại");
            }
        } catch (err) {
            setError("Lỗi kết nối hoặc sai tài khoản/mật khẩu");
        }
        setLoading(false);
    };

    return (
        <div className="center-page">
            <div className="login-panel">
                <img className="login-logo" src={logo} alt="Logo" />
                <div className="login-copy">
                    <h1>Đăng nhập hệ thống</h1>
                    <p className="supporting-text">
                        Quản lý kho, theo dõi xuất nhập và kiểm soát tồn kho trong một giao diện tập trung.
                    </p>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z" /></svg>
                        </span>
                        <input type="text" placeholder="Tài khoản" value={username} onChange={e => setUsername(e.target.value)} required />
                    </label>
                    <label className="input-field" style={{ position: "relative" }}>
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 7.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z" /></svg>
                        </span>
                        <input type={showPassword ? "text" : "password"} placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 40 }} />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: "#6b8f7e", display: "flex", alignItems: "center", padding: 0 }}
                        >
                            {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                        </button>
                    </label>
                    <div className="form-meta">
                        <label className="remember-me">
                            <input type="checkbox" />
                            <span>Ghi nhớ đăng nhập</span>
                        </label>
                        <Link to="/forgot-password">Quên mật khẩu?</Link>
                    </div>
                    {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
                    <button className="login-button" type="submit" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
                </form>
            </div>
        </div>
    );
}
