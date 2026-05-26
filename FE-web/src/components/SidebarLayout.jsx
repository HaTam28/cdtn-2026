import React, { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "../styles/shared.css";
import logo from "../assets/logo.png";

export default function SidebarLayout({ children, activeKey }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF";

    const getInitialOpen = (path) => {
        if (path.startsWith("/supplies") || path.startsWith("/employees") || path.startsWith("/locations") || path.startsWith("/partners") || path.startsWith("/batches")) {
            return { danhmuc: true, chungtu: false, baocao: false };
        }
        if (path.startsWith("/receipts") || path.startsWith("/issues") || path.startsWith("/audits")) {
            return { danhmuc: false, chungtu: true, baocao: false };
        }
        if (path.startsWith("/reports")) {
            return { danhmuc: false, chungtu: false, baocao: true };
        }
        return { danhmuc: false, chungtu: false, baocao: false };
    };

    const [openGroups, setOpenGroups] = useState(() => getInitialOpen(location.pathname));

    // Cho phép nhiều group mở cùng lúc
    const toggleGroup = (key) => {
        setOpenGroups((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const navTo = (label, path) => {
        navigate(path);
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <div className="sp-layout">
            <aside className="sp-sidebar">
                <div className="sp-sidebar-logo">
                    <img src={logo} alt="Logo" className="sp-logo-img" />
                </div>

                <nav className="sp-nav">
                    <div className={`sp-nav-standalone${location.pathname.startsWith("/overview") ? " sp-nav-active" : ""}`} onClick={() => navTo("Tổng quan", "/overview")}>
                        <span className="sp-nav-icon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                        </span>
                        <span>Tổng quan</span>
                    </div>

                    {/* Danh mục */}
                    <div
                        className={`sp-nav-group-hd${(openGroups.danhmuc || location.pathname.startsWith("/supplies") || location.pathname.startsWith("/employees") || location.pathname.startsWith("/locations") || location.pathname.startsWith("/partners") || location.pathname.startsWith("/batches")) ? " sp-group-active" : ""}`}
                        onClick={() => toggleGroup("danhmuc")}
                    >
                        <span className="sp-nav-icon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </span>
                        <span>Danh mục</span>
                        <span className={`sp-chevron${openGroups.danhmuc ? " open" : ""}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </span>
                    </div>
                    {openGroups.danhmuc && (
                        <div className="sp-nav-children">
                            <div className={`sp-nav-child${location.pathname.startsWith("/supplies") ? " sp-child-active" : ""}`} onClick={() => navTo("Danh mục vật tư hàng hóa", "/supplies")}>Danh mục vật tư hàng hóa</div>
                            <div className={`sp-nav-child${location.pathname.startsWith("/batches") ? " sp-child-active" : ""}`} onClick={() => navTo("Danh mục lô vật tư hàng hóa", "/batches")}>Danh mục lô vật tư hàng hóa</div>
                            {!isStaff && (
                                <div className={`sp-nav-child${location.pathname.startsWith("/employees") ? " sp-child-active" : ""}`} onClick={() => navTo("Danh mục nhân viên", "/employees")}>Danh mục nhân viên</div>
                            )}
                            <div className={`sp-nav-child${location.pathname.startsWith("/locations") ? " sp-child-active" : ""}`} onClick={() => navTo("Danh mục vị trí", "/locations")}>Danh mục vị trí</div>
                            <div className={`sp-nav-child${location.pathname.startsWith("/partners") ? " sp-child-active" : ""}`} onClick={() => navTo("Danh mục đối tượng", "/partners")}>Danh mục đối tượng</div>
                        </div>
                    )}

                    {/* Chứng từ */}
                    <div
                        className={`sp-nav-group-hd${(openGroups.chungtu || location.pathname.startsWith("/receipts") || location.pathname.startsWith("/issues") || location.pathname.startsWith("/audits")) ? " sp-group-active" : ""}`}
                        onClick={() => toggleGroup("chungtu")}
                    >
                        <span className="sp-nav-icon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                        </span>
                        <span>Chứng từ</span>
                        <span className={`sp-chevron${openGroups.chungtu ? " open" : ""}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </span>
                    </div>
                    {openGroups.chungtu && (
                        <div className="sp-nav-children">
                            <div className={`sp-nav-child${location.pathname.startsWith("/receipts") ? " sp-child-active" : ""}`} onClick={() => navTo("Phiếu nhập kho", "/receipts")}>Phiếu nhập kho</div>
                            <div className={`sp-nav-child${location.pathname.startsWith("/issues") ? " sp-child-active" : ""}`} onClick={() => navTo("Phiếu xuất kho", "/issues")}>Phiếu xuất kho</div>
                            <div className={`sp-nav-child${location.pathname.startsWith("/audits") ? " sp-child-active" : ""}`} onClick={() => navTo("Kiểm kê hàng tồn kho", "/audits")}>Kiểm kê hàng tồn kho</div>
                        </div>
                    )}

                    {!isStaff && (
                        <>
                            {/* Báo cáo */}
                            <div
                                className={`sp-nav-group-hd${(openGroups.baocao || location.pathname.startsWith("/reports")) ? " sp-group-active" : ""}`}
                                onClick={() => toggleGroup("baocao")}
                            >
                                <span className="sp-nav-icon">
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                                    </svg>
                                </span>
                                <span>Báo cáo</span>
                                <span className={`sp-chevron${openGroups.baocao ? " open" : ""}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                </span>
                            </div>
                            {openGroups.baocao && (
                                <div className="sp-nav-children">
                                    <div className={`sp-nav-child${location.pathname.startsWith("/reports/receipt") ? " sp-child-active" : ""}`} onClick={() => navTo("Bảng kê chứng từ Phiếu nhập", "/reports/receipt")}>Bảng kê chứng từ Phiếu nhập</div>
                                    <div className={`sp-nav-child${location.pathname.startsWith("/reports/issue") ? " sp-child-active" : ""}`} onClick={() => navTo("Bảng kê chứng từ Phiếu xuất", "/reports/issue")}>Bảng kê chứng từ Phiếu xuất</div>
                                    <div className={`sp-nav-child${location.pathname.startsWith("/reports/inventory-summary") ? " sp-child-active" : ""}`} onClick={() => navTo("Báo cáo Nhập - Xuất - Tồn", "/reports/inventory-summary")}>Báo cáo Nhập - Xuất - Tồn</div>
                                    <div className={`sp-nav-child${location.pathname.startsWith("/reports/item-detail") ? " sp-child-active" : ""}`} onClick={() => navTo("Sổ chi tiết vật tư", "/reports/item-detail")}>Sổ chi tiết vật tư</div>
                                </div>
                            )}
                        </>
                    )}
                </nav>

                <div className="sp-sidebar-bottom">
                    <div className={`sp-nav-standalone${location.pathname.startsWith("/account") ? " sp-nav-active" : ""}`} onClick={() => navTo("Tài khoản", "/account")}>
                        <span className="sp-nav-icon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                        </span>
                        <span>Tài khoản</span>
                    </div>
                    <div className="sp-nav-standalone" onClick={handleLogout}>
                        <span className="sp-nav-icon">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </span>
                        <span>Đăng xuất</span>
                    </div>
                </div>
            </aside>

            {children ?? <Outlet />}
        </div>
    );
}
