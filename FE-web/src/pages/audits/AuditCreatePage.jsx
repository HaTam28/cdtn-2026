import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { createAudit, getAllAudits } from "../../api/auditApi";
import { getAllItems } from "../../api/itemApi";
import { getAllBatches } from "../../api/batchApi";
import { getAllEmployees } from "../../api/employeeApi";
import { getAllLocations } from "../../api/locationApi";
import { getAvailableLocations } from "../../api/issueApi";
import TopbarRight from "../../components/TopbarRight";

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _rowKey = 0;
const newRow = () => ({
    _id: ++_rowKey,
    itemId: "",
    itemcode: "",
    itemname: "",
    unitof: "",
    actualquantity: "",
    bookquantity: null,   // null = chưa load
    loadingBook: false,
});

function buildNextDocno(prefix, list) {
    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    const maxNum = (list || []).reduce((max, r) => {
        const m = String(r.docno || "").match(regex);
        if (!m) return max;
        const n = Number(m[1]);
        return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    const next = String(maxNum + 1).padStart(2, "0");
    return `${prefix}-${next}`;
}

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconPlus({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
function IconTrash() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuditCreatePage() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF";

    const [form, setForm] = useState({ date: todayStr(), docno: "", description: "", assigneeId: "" });
    const [rows, setRows] = useState([newRow()]);
    const [items, setItems] = useState([]);
    const [stockByItem, setStockByItem] = useState({});
    const [employees, setEmployees] = useState([]);
    const [locations, setLocations] = useState([]);
    const [locationsByRow, setLocationsByRow] = useState({});
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const selectedAssignee = useMemo(
        () => employees.find((e) => String(e.id) === String(form.assigneeId)),
        [employees, form.assigneeId]
    );

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [iList, eList, bList, aList, lList] = await Promise.all([getAllItems(), getAllEmployees(), getAllBatches(), getAllAudits(), getAllLocations()]);
            setItems(iList);
            setEmployees(eList);
            setLocations(lList || []);
            const stockMap = (bList || []).reduce((acc, batch) => {
                const key = String(batch.itemId ?? "");
                if (!key) return acc;
                const qty = Number(batch.quantityRemaining ?? 0);
                acc[key] = (acc[key] || 0) + qty;
                return acc;
            }, {});
            setStockByItem(stockMap);
            setForm((prev) => ({
                ...prev,
                docno: prev.docno || buildNextDocno("PKK", aList),
            }));
        } catch { /* non-blocking */ } finally { setLoadingData(false); }
    }, []);
    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        setRows((prev) => prev.map((row) => {
            if (!row.itemId) return row;
            return {
                ...row,
                bookquantity: stockByItem[String(row.itemId)] ?? 0,
                loadingBook: false,
            };
        }));
    }, [stockByItem]);

    useEffect(() => {
        // Prevent staff from accessing manager create page
        if (isStaff) navigate("/audits/requests");
    }, [isStaff, navigate]);

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleRowChange = (idx, field, value) => {
        setRows((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            if (field === "itemId") {
                const found = items.find((it) => String(it.id) === String(value));
                next[idx].itemcode = found?.itemcode || "";
                next[idx].itemname = found?.itemname || "";
                next[idx].unitof = found?.unitof || "";
                next[idx].bookquantity = value ? (stockByItem[String(value)] ?? 0) : null;
                next[idx].loadingBook = false;
                // Load locations containing this item
                if (value) {
                    const rowId = next[idx]._id;
                    getAvailableLocations(value).then((locs) => {
                        setLocationsByRow((prev) => ({ ...prev, [rowId]: locs || [] }));
                    }).catch(() => {
                        setLocationsByRow((prev) => ({ ...prev, [rowId]: [] }));
                    });
                } else {
                    const rowId = next[idx]._id;
                    setLocationsByRow((prev) => { const n = { ...prev }; delete n[rowId]; return n; });
                }
            }
            return next;
        });
    };

    const handleAddRow = () => setRows((prev) => [...prev, newRow()]);
    const handleRemoveRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

    const handleSaveDraft = async () => {
        if (!form.date) { showToast("error", "Vui lòng chọn ngày kiểm kê."); return; }
        if (rows.length === 0 || !rows.some((r) => r.itemId)) {
            showToast("error", "Vui lòng thêm ít nhất một dòng vật tư."); return;
        }
        const details = rows.filter((r) => r.itemId).map((r) => ({
            itemId: Number(r.itemId),
            actualquantity: r.actualquantity === "" || r.actualquantity === null || r.actualquantity === undefined ? null : Number(r.actualquantity),
        }));
        setSaving(true);
        try {
            const payload = { docDate: form.date, description: form.description.trim() || null, details };
            const result = await createAudit(payload);
            if (result?.success) {
                showToast("success", "Đã lưu nháp phiếu kiểm kê.");
                const newId = result?.data?.id;
                setTimeout(() => navigate(newId ? `/audits/${newId}` : "/audits"), 1200);
            } else {
                showToast("error", result?.message || "Lưu nháp thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra khi lưu phiếu.");
        } finally { setSaving(false); }
    };

    const handleSendRequest = async () => {
        if (!form.date) { showToast("error", "Vui lòng chọn ngày kiểm kê."); return; }
        if (!form.assigneeId) { showToast("error", "Vui lòng chọn nhân viên để gửi yêu cầu."); return; }
        if (rows.length === 0) { showToast("error", "Vui lòng thêm ít nhất một dòng vật tư."); return; }
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].itemId) { showToast("error", `Dòng ${i + 1}: Vui lòng chọn mặt hàng.`); return; }
        }
        const itemIds = rows.map((r) => r.itemId);
        if (new Set(itemIds).size !== itemIds.length) {
            showToast("error", "Có mặt hàng bị trùng. Mỗi mặt hàng chỉ được nhập một lần."); return;
        }
        const details = rows.map((r) => ({
            itemId: Number(r.itemId),
            actualquantity: null,
        }));
        setSaving(true);
        try {
            const payload = {
                docDate: form.date,
                description: form.description.trim() || null,
                details,
                assignedUserId: Number(form.assigneeId),
                sendToStaff: true,
            };
            const result = await createAudit(payload);
            if (result?.success) {
                showToast("success", "Đã gửi yêu cầu kiểm kê cho nhân viên.");
                const newId = result?.data?.id;
                setTimeout(() => navigate(newId ? `/audits/${newId}` : "/audits"), 1200);
            } else {
                showToast("error", result?.message || "Gửi yêu cầu thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra khi gửi yêu cầu.");
        } finally { setSaving(false); }
    };

    return (
        <>
            {toast && (
                <div className={`sp-toast ${toast.type === "success" ? "sp-toast-success" : "sp-toast-error"}`}>{toast.msg}</div>
            )}
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
                        {/* ── Header row ── */}
                        <div className="rc-header-row">
                            <label className="rc-form-label">Ngày</label>
                            <input
                                type="date"
                                className="rc-form-input"
                                style={{ minWidth: 150 }}
                                value={form.date}
                                onChange={(e) => handleFormChange("date", e.target.value)}
                            />
                            <label className="rc-form-label" style={{ marginLeft: 16 }}>Số</label>
                            <input
                                className="rc-form-input"
                                style={{ minWidth: 200, background: "#f6fbf8", color: "#4c6152" }}
                                placeholder="Tự động điền"
                                value={form.docno}
                                readOnly
                            />
                        </div>

                        {/* ── Nhân viên kiểm kê ── */}
                        <div className="rc-form-2col">
                            <div className="rc-form-field">
                                <label className="rc-form-label" style={{ minWidth: 110 }}>Mã nhân viên</label>
                                <select
                                    className="rc-form-select"
                                    value={form.assigneeId}
                                    onChange={(e) => handleFormChange("assigneeId", e.target.value)}
                                    disabled={loadingData}
                                >
                                    <option value="">(Chọn nhân viên kiểm kê)</option>
                                    {employees.filter((e) => e.role === "STAFF").map((emp) => (
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

                        {/* ── Diễn giải ── */}
                        <div className="rc-form-row">
                            <label className="rc-form-label">Diễn giải</label>
                            <input
                                className="rc-form-input rc-form-full"
                                placeholder="Nhập diễn giải (VD: Kiểm kê tháng 5)"
                                value={form.description}
                                onChange={(e) => handleFormChange("description", e.target.value)}
                            />
                        </div>

                        {/* ── Detail table ── */}
                        <div style={{ marginTop: 8, marginBottom: 4, color: "#4c6152", fontSize: "0.84rem" }}>
                            Chọn danh sách hàng hóa và vị trí cần kiểm kê.
                        </div>
                        <div className="rc-detail-table-wrap">
                            <table className="rc-detail-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "4%" }}>STT</th>
                                        <th style={{ width: "10%" }}>Mã hàng</th>
                                        <th>Tên vật tư hàng hóa</th>
                                        <th style={{ width: "7%" }}>ĐVT</th>
                                        <th style={{ width: "10%" }}>SL hệ thống</th>
                                        <th style={{ width: "13%" }}>Vị trí</th>
                                        <th style={{ width: "4%" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => {
                                        return (
                                            <tr key={row._id}>
                                                <td className="rc-td-stt">{idx + 1}</td>
                                                <td>
                                                    <select
                                                        className="rc-td-select"
                                                        value={row.itemId}
                                                        onChange={(e) => handleRowChange(idx, "itemId", e.target.value)}
                                                        disabled={loadingData}
                                                    >
                                                        <option value="">--</option>
                                                        {items.map((it) => (
                                                            <option key={it.id} value={it.id}>{it.itemcode}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input
                                                        className="rc-td-input"
                                                        value={row.itemname}
                                                        readOnly
                                                        placeholder="Tên vật tư"
                                                        style={{ background: "#f6fbf8", color: "#4c6152" }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        className="rc-td-input"
                                                        style={{ background: "#f6fbf8", color: "#4c6152" }}
                                                        value={row.unitof}
                                                        readOnly
                                                    />
                                                </td>
                                                <td style={{ textAlign: "center", fontWeight: 600, color: "#1E3A2F" }}>
                                                    {row.itemId
                                                        ? (row.bookquantity ?? 0).toLocaleString()
                                                        : <span style={{ color: "#c5cdc9" }}>—</span>}
                                                </td>
                                                <td>
                                                    {!row.itemId ? (
                                                        <span style={{ color: "#c5cdc9", fontSize: "0.82rem" }}>—</span>
                                                    ) : (locationsByRow[row._id] || []).length === 0 ? (
                                                        <span style={{ color: "#8ba392", fontSize: "0.82rem" }}>Chưa có tồn</span>
                                                    ) : (
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                            {(locationsByRow[row._id] || []).map((loc) => (
                                                                <span
                                                                    key={loc.locationId || loc.id}
                                                                    style={{ background: "#e8f5e9", color: "#1E3A2F", border: "1px solid #a5d6a7", borderRadius: 4, padding: "1px 7px", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap" }}
                                                                >
                                                                    {loc.locationcode || loc.locationname}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="rc-row-del-btn"
                                                        onClick={() => handleRemoveRow(idx)}
                                                        type="button"
                                                        title="Xóa dòng"
                                                    >
                                                        <IconTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="rc-add-row" onClick={handleAddRow}>
                                        <td colSpan={7}>
                                            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#2DBE60", fontWeight: 500, fontSize: "0.87rem" }}>
                                                <IconPlus /> Thêm dòng vật tư
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ── Actions ── */}
                        <div className="rc-form-actions">
                            <button className="sp-btn-outline" onClick={() => navigate("/audits")}>Hủy bỏ</button>
                            <button className="sp-btn-outline" onClick={handleSaveDraft} disabled={saving}>
                                {saving ? "Đang lưu..." : "Lưu nháp"}
                            </button>
                            <button className="sp-btn-primary" onClick={handleSendRequest} disabled={saving}>
                                {saving ? "Đang gửi..." : "Gửi yêu cầu"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
