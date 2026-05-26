
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { updatePassword } from "../api/authApi";
import "./LoginForm.css";
import logo from "../assets/logo.png";

export default function UpdatePasswordForm() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const validatePassword = (value) => {
        if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự.";
        if (/\s/.test(value)) return "Mật khẩu không được chứa khoảng trắng.";
        if (!/[A-Z]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ cái viết hoa.";
        if (!/[a-z]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ cái viết thường.";
        if (!/[0-9]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ số (0-9).";
        if (!/[^A-Za-z0-9]/.test(value)) return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.";
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setError(passwordError);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }
        const username = localStorage.getItem("reset_username");
        if (!username) {
            setError("Phiên xác thực hết hạn. Vui lòng thực hiện lại từ bước Quên mật khẩu.");
            return;
        }
        setLoading(true);
        try {
            const res = await updatePassword({ username, newPassword });
            if (res.success) {
                localStorage.removeItem("reset_username");
                navigate("/login");
            } else {
                setError(res.message || "Cập nhật thất bại");
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
                <Link to="/forgot-password" className="back-arrow" style={{ position: 'absolute', left: 24, top: 24, textDecoration: 'none' }} title="Quay lại">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#277d4b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </Link>
                <img className="login-logo" src={logo} alt="Logo" />
                <div className="login-copy">
                    <h1>Cập nhật mật khẩu mới</h1>
                    <p className="supporting-text">
                        Nhập mật khẩu mới cho tài khoản của bạn.
                    </p>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 7.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z" /></svg>
                        </span>
                        <input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </label>
                    <label className="input-field">
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 7.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z" /></svg>
                        </span>
                        <input type="password" placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </label>
                    {error && <div style={{ color: "red", marginBottom: 8, fontSize: "0.9rem" }}>{error}</div>}
                    <button className="login-button" type="submit" disabled={loading}>{loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button>
                </form>
            </div>
        </div>
    );
}

