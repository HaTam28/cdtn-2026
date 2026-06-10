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
    const [failCount, setFailCount] = useState(() => Number(localStorage.getItem("login_fail_count") || 0));
    const [lockUntil, setLockUntil] = useState(() => Number(localStorage.getItem("login_lock_until") || 0));
    const [countdown, setCountdown] = useState(0);
    const navigate = useNavigate();

    const MAX_FAILS = 5;
    const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 phút

    // Countdown timer khi đang bị khóa
    useEffect(() => {
        if (lockUntil <= Date.now()) return;
        const tick = () => {
            const remaining = lockUntil - Date.now();
            if (remaining <= 0) {
                setCountdown(0);
                setLockUntil(0);
                setFailCount(0);
                localStorage.removeItem("login_lock_until");
                localStorage.removeItem("login_fail_count");
            } else {
                setCountdown(Math.ceil(remaining / 1000));
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [lockUntil]);

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
        // Chặn submit khi đang bị khóa
        if (lockUntil > Date.now()) return;
        setError("");
        setLoading(true);
        try {
            const res = await login({ username, password });
            if (res.success) {
                localStorage.setItem("user", JSON.stringify(res.data));
                localStorage.removeItem("login_fail_count");
                localStorage.removeItem("login_lock_until");
                setFailCount(0);
                setLockUntil(0);
                if (remember) {
                    localStorage.setItem('remember_username', username);
                } else {
                    localStorage.removeItem('remember_username');
                }
                navigate("/overview");
            } else {
                const next = failCount + 1;
                setFailCount(next);
                localStorage.setItem("login_fail_count", next);
                if (next >= MAX_FAILS) {
                    const until = Date.now() + LOCK_DURATION_MS;
                    setLockUntil(until);
                    localStorage.setItem("login_lock_until", until);
                }
            }
        } catch (err) {
            const msg = err?.response?.data?.message || "Sai tài khoản hoặc mật khẩu";
            if (msg !== "Tài khoản đã bị vô hiệu hóa") {
                const next = failCount + 1;
                setFailCount(next);
                localStorage.setItem("login_fail_count", next);
                if (next >= MAX_FAILS) {
                    const until = Date.now() + LOCK_DURATION_MS;
                    setLockUntil(until);
                    localStorage.setItem("login_lock_until", until);
                }
            }
            setError(msg);
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
                    {failCount > 0 && failCount < MAX_FAILS && lockUntil <= Date.now() && error !== "Tài khoản đã bị vô hiệu hóa" && (
                        <div style={{ color: '#e65100', marginBottom: 8, fontSize: '0.88rem' }}>
                            Bạn đã đăng nhập sai <strong>{failCount}/{MAX_FAILS}</strong> lần.
                            {MAX_FAILS - failCount === 1
                                ? " Thêm 1 lần sai nữa tài khoản sẽ bị tạm khóa 15 phút."
                                : ` Còn ${MAX_FAILS - failCount} lần trước khi tài khoản bị tạm khóa 15 phút.`}
                        </div>
                    )}
                    {lockUntil > Date.now() && countdown > 0 && (
                        <div style={{ background: '#fbe9e7', border: '1px solid #ff8a65', borderRadius: 7, padding: '8px 12px', marginBottom: 8, color: '#bf360c', fontSize: '0.88rem' }}>
                            ⚠️ Tài khoản bị <strong>tạm khóa</strong> do đăng nhập sai quá {MAX_FAILS} lần.
                            Vui lòng thử lại sau <strong>{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</strong> phút.
                        </div>
                    )}
                    {info && <div style={{ color: 'green', marginBottom: 8 }}>{info}</div>}
                    <button className="login-button" type="submit" disabled={loading || lockUntil > Date.now()}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
                </form>
            </div>
        </div>
    );
}
