import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { createAudit, getAllAudits, getAuditStockRows } from "../../api/auditApi";
import { getAllEmployees } from "../../api/employeeApi";
import TopbarRight from "../../components/TopbarRight";
import notify from "../../utils/notify";
import { auditDetailPayload, formatNumber, makeRowsFromStockRows, toInputDate } from "./auditRowUtils";

function buildNextDocno(prefix, list) {
    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    const maxNum = (list || []).reduce((max, r) => {
        const m = String(r.docno || "").match(regex);
        if (!m) return max;
        const n = Number(m[1]);
        return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    return `${prefix}-${String(maxNum + 1).padStart(2, "0")}`;
}

function todayStr() {
    return toInputDate(new Date());
}

function IconTrash() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    );
}

export default function AuditCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF" || user?.role === "NV";

    const [form, setForm] = useState({
        startDate: todayStr(),
        endDate: todayStr(),
        docno: "",
        description: "",
        assigneeId: "",
    });
    const [rows, setRows] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);

    const selectedAssignee = useMemo(
        () => employees.find((e) => String(e.id) === String(form.assigneeId)),
        [employees, form.assigneeId]
    );

    const totalSystemQty = useMemo(
        () => rows.reduce((sum, row) => sum + Number(row.bookquantity || 0), 0),
        [rows]
    );

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [employeeList, stockRows, auditList] = await Promise.all([
                getAllEmployees(),
                getAuditStockRows(),
                getAllAudits(),
            ]);
            setEmployees(employeeList || []);
            setRows(makeRowsFromStockRows(stockRows));
            const clone = location.state?.clone;
            setForm((prev) => ({
                ...prev,
                docno: prev.docno || buildNextDocno("PKK", auditList),
                description: clone?.description || prev.description,
                startDate: toInputDate(clone?.startDate || clone?.auditStartDate || clone?.fromDate || clone?.docDate) || prev.startDate,
                endDate: toInputDate(clone?.endDate || clone?.auditEndDate || clone?.toDate || clone?.dueDate || clone?.docDate) || prev.endDate,
            }));
        } catch {
            notify("Không thể tải dữ liệu tồn kho theo lô.", { type: "error" });
        } finally {
            setLoadingData(false);
        }
    }, [location.state]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (isStaff) navigate("/audits/requests");
    }, [isStaff, navigate]);

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const validateBase = () => {
        if (!form.startDate) {
            notify("Vui lòng chọn ngày bắt đầu kiểm kê.", { type: "error" });
            return false;
        }
        if (!form.endDate) {
            notify("Vui lòng chọn ngày kết thúc kiểm kê.", { type: "error" });
            return false;
        }
        if (form.endDate < form.startDate) {
            notify("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.", { type: "error" });
            return false;
        }
        if (rows.length === 0) {
            notify("Không có dòng tồn kho theo mã lô để lập phiếu kiểm kê.", { type: "error" });
            return false;
        }
        return true;
    };

    const validateActualsForDraft = () => {
        for (let i = 0; i < rows.length; i += 1) {
            const value = rows[i].actualquantity;
            if (value === "" || value === null || value === undefined) {
                notify(`Dòng ${i + 1}: Vui lòng nhập SL thực tế để lưu nháp theo API kiểm kê.`, { type: "error" });
                return false;
            }
            if (!Number.isFinite(Number(value)) || Number(value) < 0) {
                notify(`Dòng ${i + 1}: SL thực tế phải là số hợp lệ và không được âm.`, { type: "error" });
                return false;
            }
        }
        return true;
    };

    const buildPayload = ({ sendToStaff = false } = {}) => ({
        docDate: form.startDate,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim() || null,
        details: rows.map((row) => auditDetailPayload(row, !sendToStaff)),
        ...(sendToStaff ? { assignedUserId: Number(form.assigneeId), sendToStaff: true } : {}),
    });

    const handleSaveDraft = async () => {
        if (!validateBase()) return;
        if (!validateActualsForDraft()) return;
        setSaving(true);
        try {
            const result = await createAudit(buildPayload());
            if (result?.success) {
                notify("Đã lưu nháp phiếu kiểm kê.", { type: "success" });
                const newId = result?.data?.id;
                setTimeout(() => navigate(newId ? `/audits/${newId}` : "/audits"), 800);
            } else {
                notify(result?.message || "Lưu nháp thất bại.", { type: "error" });
            }
        } catch (err) {
            notify(err?.response?.data?.message || "Có lỗi xảy ra khi lưu phiếu.", { type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleSendRequest = async () => {
        if (!validateBase()) return;
        if (!form.assigneeId) {
            notify("Vui lòng chọn nhân viên để gửi yêu cầu.", { type: "error" });
            return;
        }
        setSaving(true);
        try {
            const result = await createAudit(buildPayload({ sendToStaff: true }));
            if (result?.success) {
                notify("Đã gửi yêu cầu kiểm kê cho nhân viên.", { type: "success" });
                const newId = result?.data?.id;
                setTimeout(() => navigate(newId ? `/audits/${newId}` : "/audits"), 800);
            } else {
                notify(result?.message || "Gửi yêu cầu thất bại.", { type: "error" });
            }
        } catch (err) {
            notify(err?.response?.data?.message || "Có lỗi xảy ra khi gửi yêu cầu.", { type: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sp-main">
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Chứng từ &rsaquo;{" "}
                        <span className="sp-breadcrumb-link" onClick={() => navigate("/audits")}>Kiểm kê hàng tồn kho</span>
                        {" "}&rsaquo;{" "}
                        <span className="sp-breadcrumb-active">Thêm mới phiếu kiểm kê</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                <h1 className="sp-title">Phiếu kiểm kê hàng tồn kho</h1>

                <div className="rc-form-card">
                    <div className="rc-header-row au-header-wrap">
                        <label className="rc-form-label">Ngày bắt đầu</label>
                        <input
                            type="date"
                            className="rc-form-input"
                            style={{ minWidth: 150 }}
                            value={form.startDate}
                            onChange={(e) => setField("startDate", e.target.value)}
                        />
                        <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày kết thúc</label>
                        <input
                            type="date"
                            className="rc-form-input"
                            style={{ minWidth: 150 }}
                            value={form.endDate}
                            onChange={(e) => setField("endDate", e.target.value)}
                        />
                        <label className="rc-form-label" style={{ marginLeft: 16 }}>Số</label>
                        <input
                            className="rc-form-input"
                            style={{ minWidth: 180, background: "#f6fbf8", color: "#4c6152" }}
                            placeholder="Tự động điền"
                            value={form.docno}
                            readOnly
                        />
                    </div>

                    <div className="rc-form-2col">
                        <div className="rc-form-field">
                            <label className="rc-form-label" style={{ minWidth: 110 }}>Mã nhân viên</label>
                            <select
                                className="rc-form-select"
                                value={form.assigneeId}
                                onChange={(e) => setField("assigneeId", e.target.value)}
                                disabled={loadingData}
                            >
                                <option value="">(Chọn nhân viên kiểm kê)</option>
                                {employees.filter((e) => e.role === "STAFF" || e.role === "NV").map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.usercode || emp.username || emp.id}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="rc-form-field">
                            <label className="rc-form-label" style={{ minWidth: 110 }}>Tên nhân viên</label>
                            <input
                                className="rc-form-input"
                                value={selectedAssignee?.fullname || selectedAssignee?.username || ""}
                                placeholder="Tự điền khi chọn mã nhân viên"
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="rc-form-row">
                        <label className="rc-form-label">Diễn giải</label>
                        <input
                            className="rc-form-input rc-form-full"
                            placeholder="Nhập diễn giải"
                            value={form.description}
                            onChange={(e) => setField("description", e.target.value)}
                        />
                    </div>

                    <div className="au-table-note">
                        Danh sách kiểm kê theo từng mã lô và vị trí. Xóa dòng nếu không đưa lô đó vào phiếu.
                    </div>
                    <div className="rc-detail-table-wrap">
                        <table className="rc-detail-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "4%" }}>STT</th>
                                    <th style={{ width: "10%" }}>Mã vật tư</th>
                                    <th>Tên vật tư hàng hóa</th>
                                    <th style={{ width: "7%" }}>ĐVT</th>
                                    <th style={{ width: "12%" }}>Mã lô</th>
                                    <th style={{ width: "12%", textAlign: "right" }}>SL hệ thống</th>
                                    <th style={{ width: "12%", textAlign: "right" }}>SL thực tế</th>
                                    <th style={{ width: "14%" }}>Vị trí</th>
                                    <th style={{ width: "4%" }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingData && (
                                    <tr><td colSpan={9} className="sp-status-row">Đang tải tồn kho theo lô...</td></tr>
                                )}
                                {!loadingData && rows.length === 0 && (
                                    <tr><td colSpan={9} className="sp-status-row">Không có tồn kho theo mã lô.</td></tr>
                                )}
                                {!loadingData && rows.map((row, idx) => (
                                    <tr key={row._id}>
                                        <td className="rc-td-stt">{idx + 1}</td>
                                        <td style={{ fontWeight: 600, color: "#1E854A" }}>{row.itemcode}</td>
                                        <td>{row.itemname}</td>
                                        <td>{row.unitof || "—"}</td>
                                        <td>{row.batchCode || "—"}</td>
                                        <td className="rc-td-num au-book-qty">{formatNumber(row.bookquantity)}</td>
                                        <td>
                                            <input
                                                className="rc-td-input rc-td-num"
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={row.actualquantity ?? ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) return;
                                                    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, actualquantity: value } : r));
                                                }}
                                                style={{ width: "90%" }}
                                                placeholder="Nháp"
                                            />
                                        </td>
                                        <td>{row.locationcode || row.locationname || "—"}</td>
                                        <td>
                                            <button
                                                className="rc-row-del-btn"
                                                onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                                                type="button"
                                                title="Xóa dòng"
                                            >
                                                <IconTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loadingData && rows.length > 0 && (
                                    <tr className="au-total-row">
                                        <td colSpan={5}>Tổng cộng</td>
                                        <td className="rc-td-num">{formatNumber(totalSystemQty)}</td>
                                        <td colSpan={3}></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="rc-form-actions">
                        <button className="sp-btn-outline" onClick={() => navigate("/audits")}>Hủy bỏ</button>
                        <button className="sp-btn-outline" onClick={handleSaveDraft} disabled={saving || loadingData}>
                            {saving ? "Đang lưu..." : "Lưu nháp"}
                        </button>
                        <button className="sp-btn-primary" onClick={handleSendRequest} disabled={saving || loadingData}>
                            {saving ? "Đang gửi..." : "Gửi yêu cầu"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
