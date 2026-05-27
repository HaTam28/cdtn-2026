
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { updatePassword, forgotPassword, verifyOtp } from "../api/authApi";
import "./LoginForm.css";
import logo from "../assets/logo.png";
import { EyeIcon, EyeOffIcon } from "./ShowHideIcon";
import { OtpIcon } from "./AuthIcons";

export default function UpdatePasswordForm() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const [otpMessage, setOtpMessage] = useState("");
    const [newPasswordMessage, setNewPasswordMessage] = useState("");
    const [confirmPasswordMessage, setConfirmPasswordMessage] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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

    const isErrorMsg = (msg) => {
        if (!msg) return false;
        const lower = msg.toLowerCase();
        return lower.includes('không') || lower.includes('lỗi') || lower.includes('không thể') || lower.includes('thất bại') || lower.includes('invalid');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // clear previous messages
        setError("");
        setOtpMessage("");
        setNewPasswordMessage("");
        setConfirmPasswordMessage("");

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setNewPasswordMessage(passwordError);
            return;
        }
        if (newPassword !== confirmPassword) {
            setConfirmPasswordMessage("Mật khẩu xác nhận không khớp");
            return;
        }
        const username = localStorage.getItem("reset_username");
        if (!username) {
            setError("Phiên xác thực hết hạn. Vui lòng thực hiện lại từ bước Quên mật khẩu.");
            return;
        }
        if (!/^[0-9]{6}$/.test(otp)) {
            setOtpMessage("Mã OTP phải là 6 chữ số");
            return;
        }
        setLoading(true);
        try {
            // First verify OTP per API 2.3
            const v = await verifyOtp({ username, otp });
            if (!v || !v.success) {
                const msg = v?.message || 'Xác thực OTP thất bại';
                setOtpMessage(msg);
                setLoading(false);
                return;
            }

            // Then call update-password with username + newPassword (no otp)
            const res = await updatePassword({ username, newPassword });
            if (res && res.success) {
                localStorage.removeItem("reset_username");
                localStorage.removeItem("reset_email");
                localStorage.setItem("auth_success", res.message || "Cập nhật mật khẩu thành công");
                navigate("/login");
            } else {
                const msg = res?.message || "Cập nhật thất bại";
                // route to appropriate field
                const lower = msg.toLowerCase();
                if (lower.includes('otp') || lower.includes('mã')) {
                    setOtpMessage(msg);
                } else if (lower.includes('xác nhận') || lower.includes('không khớp')) {
                    setConfirmPasswordMessage(msg);
                } else if (lower.includes('mật khẩu')) {
                    setNewPasswordMessage(msg);
                } else {
                    setError(msg);
                }
            }
        } catch {
            setError("Lỗi kết nối. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setInterval(() => {
            setResendCooldown((c) => {
                if (c <= 1) {
                    clearInterval(t);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [resendCooldown]);

    return (
        <div className="center-page">
            <div className="login-panel">
                <Link to="/forgot-password" className="back-arrow" title="Quay lại">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#277d4b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </Link>
                <img className="login-logo" src={logo} alt="Logo" />
                <div className="login-copy">
                    <h1>Cập nhật mật khẩu mới</h1>
                    <p className="supporting-text">
                        Nhập mật khẩu mới cho tài khoản của bạn.
                    </p>
                </div>
                {/** Full page OTP + password form (per API spec) */}
                <form className="login-form" onSubmit={handleSubmit}>
                    <label className="input-field">
                        <span className="input-icon otp-icon">
                            <OtpIcon />
                        </span>
                        <input type="text" placeholder="Mã OTP (6 chữ số)" value={otp} onChange={(e) => { setOtp(e.target.value); setOtpMessage(''); }} required />
                    </label>
                    {otpMessage && <div className={`input-message ${isErrorMsg(otpMessage) ? 'error' : 'success'}`} style={{ marginTop: 6, marginBottom: 6 }}>{otpMessage}</div>}
                    <label className="input-field" style={{ position: 'relative' }}>
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 7.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z" /></svg>
                        </span>
                        <input type={showNew ? 'text' : 'password'} placeholder="Mật khẩu mới" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setNewPasswordMessage(''); }} required style={{ paddingRight: 60 }} />
                        <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1} aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#6b8f7e', display: 'flex', alignItems: 'center', padding: 0 }}>
                            {showNew ? <EyeIcon /> : <EyeOffIcon />}
                        </button>
                    </label>
                    <label className="input-field" style={{ position: 'relative' }}>
                        <span className="input-icon">
                            <svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 7.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z" /></svg>
                        </span>
                        <input type={showConfirm ? 'text' : 'password'} placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordMessage(''); }} required style={{ paddingRight: 60 }} />
                        <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1} aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#6b8f7e', display: 'flex', alignItems: 'center', padding: 0 }}>
                            {showConfirm ? <EyeIcon /> : <EyeOffIcon />}
                        </button>
                    </label>
                    {newPasswordMessage && <div className="input-message error" style={{ marginTop: 6, marginBottom: 6 }}>{newPasswordMessage}</div>}
                    {confirmPasswordMessage && <div className="input-message error" style={{ marginTop: 6, marginBottom: 6 }}>{confirmPasswordMessage}</div>}

                    <div style={{ marginBottom: 8 }}>
                        <button type="button" className="login-button resend-button" onClick={async () => {
                            setError("");
                            setInfoMessage("");
                            const username = localStorage.getItem("reset_username");
                            const email = localStorage.getItem("reset_email");
                            if (!username || !email) {
                                setError("Không tìm thấy thông tin tài khoản. Vui lòng yêu cầu lấy lại mã trước.");
                                return;
                            }
                            try {
                                setResendCooldown(60);
                                const r = await forgotPassword({ username, email });
                                if (r && r.success) {
                                    setOtpMessage(r.message || 'Mã OTP đã được gửi.');
                                } else {
                                    const msg = r?.message || 'Không thể gửi lại mã. Vui lòng thử lại.';
                                    if ((msg || '').toLowerCase().includes('mã') || (msg || '').toLowerCase().includes('otp')) {
                                        setOtpMessage(msg);
                                    } else {
                                        setError(msg);
                                    }
                                    setResendCooldown(0);
                                }
                            } catch (err) {
                                setError('Lỗi kết nối. Vui lòng thử lại.');
                                setResendCooldown(0);
                            }
                        }} disabled={resendCooldown > 0}>
                            {resendCooldown > 0 ? `Gửi lại mã (${resendCooldown}s)` : 'Gửi lại mã'}
                        </button>
                        {/* infoMessage is shown above inputs; keep the resend area compact */}
                    </div>
                    <button className="login-button" type="submit" disabled={loading}>{loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button>
                    {error && <div className="input-message error" style={{ marginTop: 8 }}>{error}</div>}
                </form>
            </div>
        </div>
    );
}

