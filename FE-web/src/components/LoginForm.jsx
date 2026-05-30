import React, { useState, useEffect } from "react";
import { EyeIcon, EyeOffIcon } from "./ShowHideIcon";
import { PersonIcon, LockIcon } from "./AuthIcons";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import "./LoginForm.css";
import logo from "../assets/logo.png";

// Reuse EyeIcon / EyeOffIcon from ShowHideIcon

export default function LoginForm() {
    const [username, setUsername] = useState("");
    const [remember, setRemember] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const msg = localStorage.getItem('auth_success');
        if (msg) {
            setInfo(msg);
            localStorage.removeItem('auth_success');
        }
        // Prefill username if 'remember_username' exists
        const rem = localStorage.getItem('remember_username');
        if (rem) {
            setUsername(rem);
            setRemember(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await login({ username, password });
            if (res.success) {
                localStorage.setItem("user", JSON.stringify(res.data));
                // Persist username if remember checked
                if (remember) {
                    localStorage.setItem('remember_username', username);
                } else {
                    localStorage.removeItem('remember_username');
                }
                navigate("/overview");
            } else {
                setError(res.message || "Đăng nhập thất bại");
            }
        } catch (err) {
            // If server responded with 401 (unauthorized / account not found),
            // show the specific message requested by the user.
            if (err && err.response && err.response.status === 401) {
                setError("Tài khoản hoặc email không đúng");
            } else if (err && err.response && err.response.data && err.response.data.message) {
                // Prefer server-provided message when available
                setError(err.response.data.message);
            } else {
                setError("Lỗi kết nối hoặc sai tài khoản/mật khẩu");
            }
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
                            <PersonIcon />
                        </span>
                        <input type="text" placeholder="Tài khoản" value={username} onChange={e => setUsername(e.target.value)} required />
                    </label>
                    <label className="input-field" style={{ position: "relative" }}>
                        <span className="input-icon">
                            <LockIcon />
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
                            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                            <span>Ghi nhớ đăng nhập</span>
                        </label>
                        <Link to="/forgot-password">Quên mật khẩu?</Link>
                    </div>
                    {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
                    {info && <div style={{ color: 'green', marginBottom: 8 }}>{info}</div>}
                    <button className="login-button" type="submit" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
                </form>
            </div>
        </div>
    );
}
