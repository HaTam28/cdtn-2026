
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPassword } from "../api/authApi";
import "./LoginForm.css";
import logo from "../assets/logo.png";
import { PersonIcon, MailIcon } from "./AuthIcons";

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
                // Lưu username và email để dùng ở bước đổi mật khẩu và resend
                localStorage.setItem("reset_username", username);
                localStorage.setItem("reset_email", email);
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
                <Link to="/login" className="back-arrow" title="Quay lại đăng nhập">
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
                            <PersonIcon />
                        </span>
                        <input type="text" placeholder="Tài khoản" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </label>
                    <label className="input-field">
                        <span className="input-icon mail-icon">
                            <MailIcon />
                        </span>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </label>
                    {error && <div style={{ color: "red", marginBottom: 8, fontSize: "0.9rem" }}>{error}</div>}
                    <button className="login-button" type="submit" disabled={loading}>{loading ? "Đang gửi..." : "Gửi yêu cầu"}</button>
                    <div className="auth-footer">
                        <Link to="/login" className="back-to-login">Quay lại đăng nhập</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}