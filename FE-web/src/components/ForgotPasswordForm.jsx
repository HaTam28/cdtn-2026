
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPassword } from "../api/authApi";
import "./LoginForm.css";
import logo from "../assets/logo.png";

export default function ForgotPasswordForm() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await forgotPassword({ username, email });
            if (res.success) {
                // Lưu username để dùng ở bước đổi mật khẩu
                localStorage.setItem("reset_username", username);
                navigate("/update-password");
            } else {
                setError(res.message || "Tài khoản hoặc email không đúng");
            }
        } catch {
            setError("Lỗi kết nối. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="center-page">
            <div className="login-panel">
                <Link to="/login" className="back-arrow" style={{ position: 'absolute', left: 24, top: 24, textDecoration: 'none' }} title="Quay lại đăng nhập">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#277d4b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </Link>
                <img className="login-logo" src={logo} alt="Logo" />
                <div className="login-copy">
                    <h1>Quên mật khẩu</h1>
                    <p className="supporting-text">
                        Nhập tài khoản và email để lấy lại mật khẩu.
                    </p>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z" /></svg>
                        </span>
                        <input type="text" placeholder="Tài khoản" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </label>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M21 8V7a5 5 0 0 0-10 0v1a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-5-3a3 3 0 0 1 3 3v1h-6V8a3 3 0 0 1 3-3Zm4 12a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1Z" /></svg>
                        </span>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </label>
                    {error && <div style={{ color: "red", marginBottom: 8, fontSize: "0.9rem" }}>{error}</div>}
                    <button className="login-button" type="submit" disabled={loading}>{loading ? "Đang gửi..." : "Gửi yêu cầu"}</button>
                </form>
            </div>
        </div>
    );
}