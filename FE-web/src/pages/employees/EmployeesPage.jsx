import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import { getAllEmployees } from "../../api/employeeApi";
import TopbarRight from "../../components/TopbarRight";

const ROWS_OPTIONS = [10, 15, 20, 50];

function SortIcon() {
    return (
        <svg width="11" height="11" viewBox="0 0 12 14" fill="none" style={{ marginLeft: 4, verticalAlign: "middle", opacity: 0.75 }}>
            <path d="M4 5.5L6 3L8 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 8.5L6 11L8 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function EmployeesPage() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF";
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [selected, setSelected] = useState(new Set());
    const navigate = useNavigate();

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllEmployees();
            setItems(data);
        } catch {
            setError("Không thể tải danh sách nhân viên. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (!isStaff) fetchItems(); }, [fetchItems, isStaff]);

    useEffect(() => {
        if (isStaff) {
            // Staff are not allowed to view employee catalog — redirect to home
            navigate("/");
        }
    }, [isStaff, navigate]);

    const filtered = useMemo(() => {
        let sorted = [...items].sort((a, b) => (a.id || 0) - (b.id || 0));
        sorted = sorted.filter((r) => r.role !== "ADMIN");
        if (!search.trim()) return sorted;
        const q = search.toLowerCase();
        return sorted.filter((r) =>
            r.usercode?.toLowerCase().includes(q) ||
            r.fullname?.toLowerCase().includes(q) ||
            r.username?.toLowerCase().includes(q)
        );
    }, [search, items]);

    const totalRows = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const start = (page - 1) * rowsPerPage;
    const rows = filtered.slice(start, start + rowsPerPage);

    const allIds = rows.map((r) => r.id);
    const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));
    const someChecked = allIds.some((id) => selected.has(id)) && !allChecked;

    const toggleRow = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const toggleAll = (checked) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) allIds.forEach((id) => next.add(id));
            else allIds.forEach((id) => next.delete(id));
            return next;
        });

    const handleClone = () => {
        if (selected.size !== 1) {
            window.alert("Vui lòng chọn 1 dòng để tạo bản sao.");
            return;
        }
        const id = Array.from(selected)[0];
        const item = items.find((r) => r.id === id);
        if (!item) return;
        navigate("/employees/create", { state: { clone: item } });
    };

    const handleExportPdf = () => {
        if (selected.size === 0) return;
        const now = new Date();
        const title = "DANH MỤC NHÂN VIÊN";
        const exportRows = filtered.filter((r) => selected.has(r.id));
        const rowsHtml = exportRows.map((r, idx) => `
            <tr>
                <td class="center">${idx + 1}</td>
                <td>${r.usercode || ""}</td>
                <td>${r.fullname || ""}</td>
                <td>${r.username || ""}</td>
                <td>${r.gender || ""}</td>
                <td>${r.birthdate ? r.birthdate.slice(0, 10) : ""}</td>
                <td>${r.address || ""}</td>
                <td>${r.phoneNumber || ""}</td>
                <td>${r.email || ""}</td>
                <td>${r.isActive ? "Đang làm" : "Nghỉ việc"}</td>
                <td>${r.firstworkingdate ? r.firstworkingdate.slice(0, 10) : ""}</td>
            </tr>
        `).join("");

        const html = `
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: "Times New Roman", serif; margin: 24px 28px; color: #111; }
    h1 { text-align: center; margin: 0 0 6px; font-size: 20px; }
    .sub { text-align: center; margin-bottom: 12px; font-style: italic; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #000; padding: 6px; }
    th { text-align: center; font-weight: 700; }
    .center { text-align: center; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="sub">Ngày ${now.toLocaleDateString("vi-VN")}</div>
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Mã nhân viên</th>
        <th>Họ và tên</th>
        <th>Tên đăng nhập</th>
        <th>Giới tính</th>
        <th>Ngày sinh</th>
        <th>Địa chỉ</th>
        <th>Số điện thoại</th>
        <th>Email</th>
        <th>Trạng thái</th>
        <th>Ngày vào làm</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

        const win = window.open("", "_blank", "width=900,height=1200");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        let printed = false;
        const triggerPrint = () => {
            if (printed || win.closed) return;
            printed = true;
            win.focus();
            win.print();
        };
        win.onload = triggerPrint;
        setTimeout(triggerPrint, 600);
    };

    function getPages() {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        let arr = [1];
        if (page > 3) arr.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
        if (page < totalPages - 2) arr.push("…");
        arr.push(totalPages);
        return arr;
    }

    return (
        <div className="sp-main">
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Danh mục &rsaquo; <span className="sp-breadcrumb-active">Danh mục nhân viên</span>
                    </div>
                    {/* <div className="sp-breadcrumb-sub">Nhân viên</div> */}
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Nhân viên</h1>

                <div className="sp-toolbar">
                    <div className="sp-search-wrap">
                        <svg className="sp-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            className="sp-search"
                            type="text"
                            placeholder="Search"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="sp-toolbar-spacer" />
                    <button className="sp-btn-primary" onClick={() => navigate("/employees/create")}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Thêm mới
                    </button>
                    <button className="sp-btn-outline" onClick={handleClone}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Thêm bản sao mới
                    </button>
                    <button
                        className="sp-btn-outline"
                        onClick={handleExportPdf}
                        disabled={selected.size === 0}
                        title={selected.size === 0 ? "Chọn ít nhất 1 nhân viên để export" : `Export ${selected.size} nhân viên`}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Export {selected.size > 0 ? `(${selected.size})` : ""}
                    </button>
                </div>

                <div className="sp-table-wrap sp-scrollable">
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th className="sp-th-cb">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                        onChange={(e) => toggleAll(e.target.checked)}
                                    />
                                </th>
                                <th className="sp-th-sticky">Mã nhân viên <SortIcon /></th>
                                <th>Họ và tên <SortIcon /></th>
                                <th>Tên đăng nhập <SortIcon /></th>
                                <th>Giới tính <SortIcon /></th>
                                <th>Ngày sinh <SortIcon /></th>
                                <th>Địa chỉ <SortIcon /></th>
                                <th>Số điện thoại <SortIcon /></th>
                                <th>Email <SortIcon /></th>
                                <th>Trạng thái <SortIcon /></th>
                                <th>Ngày vào làm <SortIcon /></th>
                                <th className="sp-th-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={12} className="sp-status-row">Đang tải...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={12} className="sp-status-row sp-status-error">{error}</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={12} className="sp-status-row">Không có dữ liệu</td></tr>
                            ) : rows.map((r) => (
                                <tr
                                    key={r.id}
                                    className={`sp-row-clickable${selected.has(r.id) ? " sp-row-selected" : ""}`}
                                    onClick={() => navigate(`/employees/${r.id}`)}
                                >
                                    <td className="sp-td-cb" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(r.id)}
                                            onChange={() => toggleRow(r.id)}
                                        />
                                    </td>
                                    <td className="sp-td-id sp-td-sticky">{r.usercode}</td>
                                    <td>{r.fullname}</td>
                                    <td>{r.username}</td>
                                    <td>{r.gender}</td>
                                    <td>{r.birthdate ? r.birthdate.slice(0, 10) : ""}</td>
                                    <td>{r.address}</td>
                                    <td>{r.phoneNumber}</td>
                                    <td>{r.email}</td>
                                    <td>{r.isActive ? "Đang làm" : "Nghỉ việc"}</td>
                                    <td>{r.firstworkingdate ? r.firstworkingdate.slice(0, 10) : ""}</td>
                                    <td className="sp-td-action" onClick={(e) => e.stopPropagation()}>
                                        <button className="sp-edit-btn" title="Chỉnh sửa" onClick={() => navigate(`/employees/${r.id}`)}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="sp-pagination">
                        <span className="sp-rows-info">
                            Rows per page
                            <select
                                className="sp-rows-select"
                                value={rowsPerPage}
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                            >
                                {ROWS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <span className="sp-total-label">of {totalRows} rows</span>
                        </span>
                        <button className="sp-page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                        <button className="sp-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                        {getPages().map((p, idx) =>
                            p === "…"
                                ? <span key={`e${idx}`} className="sp-page-ellipsis">…</span>
                                : <button
                                    key={p}
                                    className={`sp-page-btn${p === page ? " sp-page-active" : ""}`}
                                    onClick={() => setPage(p)}
                                >{p}</button>
                        )}
                        <button className="sp-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
                        <button className="sp-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
