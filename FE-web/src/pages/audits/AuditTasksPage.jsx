import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { getAssignedAudits, getAuditById, updateAssignedAudit, submitAudit } from "../../api/auditApi";
import { getAllLocations, getItemsAtLocation } from "../../api/locationApi";
import TopbarRight from "../../components/TopbarRight";

const STATUS_LABELS = {
    REQUESTED: "Chờ kiểm kê",
    IN_PROGRESS: "Đang kiểm kê",
    SUBMITTED: "Chờ duyệt",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
};
const STATUS_BADGE = {
    REQUESTED: "rc-badge au-badge-requested",
    IN_PROGRESS: "rc-badge au-badge-in-progress",
    SUBMITTED: "rc-badge au-badge-submitted",
    CONFIRMED: "rc-badge au-badge-confirmed",
    CANCELLED: "rc-badge au-badge-cancelled",
};
const STATUS_FILTERS = ["ALL", "REQUESTED", "IN_PROGRESS", "SUBMITTED", "CONFIRMED", "CANCELLED"];

function formatDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function DiffCell({ diff }) {
    if (diff === null || diff === undefined) return <td className="rc-td-num">—</td>;
    if (diff > 0) return (
        <td className="rc-td-num au-td-plus">
            <span className="au-diff-plus">+{diff}</span>
        </td>
    );
    if (diff < 0) return (
        <td className="rc-td-num au-td-minus">
            <span className="au-diff-minus">{diff}</span>
        </td>
    );
    return <td className="rc-td-num"><span className="au-diff-zero">0</span></td>;
}

function LocationModal({ open, loading, locations, initialEntries, onClose, onConfirm }) {
    const [selected, setSelected] = useState(new Map());

    useEffect(() => {
        if (!open) return;
        const next = new Map();
        (initialEntries || []).forEach((entry) => {
            next.set(entry.locationId, Number(entry.actualQty || 0));
        });
        setSelected(next);
    }, [open, initialEntries]);

    if (!open) return null;

    const toggle = (loc) => {
        setSelected((prev) => {
            const next = new Map(prev);
            if (next.has(loc.locationId)) next.delete(loc.locationId);
            else next.set(loc.locationId, 0);
            return next;
        });
    };

    const updateQty = (loc, value) => {
        setSelected((prev) => {
            const next = new Map(prev);
            if (!next.has(loc.locationId)) return prev;
            if (value === "") next.set(loc.locationId, "");
            else next.set(loc.locationId, Math.max(0, Number(value)));
            return next;
        });
    };

    const entries = Array.from(selected.entries()).map(([locationId, actualQty]) => {
        const found = (locations || []).find((loc) => loc.locationId === locationId);
        return {
            locationId,
            locationcode: found?.locationcode || found?.locationname || "",
            actualQty: actualQty === "" ? 0 : Number(actualQty || 0),
            systemQty: Number(found?.systemQty || 0),
            batchCodes: found?.batchCodes || [],
        };
    });
    const total = entries.reduce((sum, entry) => sum + Number(entry.actualQty || 0), 0);

    return (
        <div className="rc-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rc-modal">
                <div className="rc-modal-header">
                    <span className="rc-modal-title">Chọn vị trí kiểm kê</span>
                    <button className="rc-modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="rc-modal-body">
                    {loading && <div style={{ textAlign: "center", color: "#8ba392", padding: "20px 0" }}>Đang tải vị trí...</div>}
                    {!loading && (locations || []).length === 0 && (
                        <div style={{ textAlign: "center", color: "#e57373", padding: "16px 0" }}>Không có vị trí đang chứa.</div>
                    )}
                    {!loading && (locations || []).length > 0 && (
                        <table className="rc-modal-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }} />
                                    <th style={{ width: "24%" }}>Vị trí</th>
                                    <th style={{ width: "16%", textAlign: "right" }}>SL hệ thống</th>
                                    <th style={{ width: "20%", textAlign: "right" }}>SL hiện tại</th>
                                    <th>Số lô</th>
                                </tr>
                            </thead>
                            <tbody>
                                {locations.map((loc) => {
                                    const isSel = selected.has(loc.locationId);
                                    const qty = selected.get(loc.locationId) ?? "";
                                    return (
                                        <tr key={loc.locationId} className={isSel ? "rc-row-selected" : ""}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={isSel}
                                                    onChange={() => toggle(loc)}
                                                />
                                            </td>
                                            <td>{loc.locationcode || loc.locationname || "—"}</td>
                                            <td className="rc-td-num">{loc.systemQty ?? 0}</td>
                                            <td>
                                                <input
                                                    className="rc-td-input rc-td-num"
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={qty}
                                                    disabled={!isSel}
                                                    onChange={(e) => updateQty(loc, e.target.value)}
                                                    style={{ width: "100%" }}
                                                />
                                            </td>
                                            <td style={{ fontSize: "0.82rem", color: "#4c6152" }}>
                                                {(loc.batchCodes || []).length > 0
                                                    ? loc.batchCodes.join(", ")
                                                    : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="rc-modal-footer">
                    <span className="rc-modal-selected-info">Tổng SL thực tế: {total}</span>
                    <button className="sp-btn-outline" onClick={onClose}>Hủy bỏ</button>
                    <button className="sp-btn-primary" onClick={() => onConfirm(entries)}>Xác nhận</button>
                </div>
            </div>
        </div>
    );
}

export default function AuditTasksPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF";
    const queryId = new URLSearchParams(location.search).get("id");

    const [audits, setAudits] = useState([]);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [active, setActive] = useState(null);
    const [activeLoading, setActiveLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [locModal, setLocModal] = useState({ open: false, rowIdx: null, locations: [], loading: false });

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    useEffect(() => {
        if (!isStaff) navigate("/audits");
    }, [isStaff, navigate]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAssignedAudits();
            setAudits(data);
        } catch {
            setError("Không thể tải danh sách yêu cầu kiểm kê.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);

    const statusCounts = useMemo(() => {
        const counts = { ALL: audits.length };
        STATUS_FILTERS.forEach((s) => { if (s !== "ALL") counts[s] = 0; });
        (audits || []).forEach((a) => {
            const st = a?.docstatus;
            if (st) counts[st] = (counts[st] || 0) + 1;
        });
        return counts;
    }, [audits]);

    const filteredAudits = useMemo(() => {
        if (statusFilter === "ALL") return audits;
        return (audits || []).filter((a) => a?.docstatus === statusFilter);
    }, [audits, statusFilter]);

    useEffect(() => {
        if (!queryId) {
            setActive(null);
            return;
        }
        handleOpen(Number(queryId));
    }, [queryId]);

    const handleOpen = async (auditId) => {
        setActiveLoading(true);
        try {
            const data = await getAuditById(auditId);
            setActive({
                ...data,
                details: (data.details || []).map((d) => ({
                    ...d,
                    locationEntries: d.locationEntries || [],
                })),
            });
        } catch {
            showToast("error", "Không thể tải chi tiết phiếu kiểm kê.");
        } finally {
            setActiveLoading(false);
        }
    };

    const handleItemChange = (idx, field, value) => {
        setActive((prev) => {
            if (!prev) return prev;
            const details = [...prev.details];
            details[idx] = { ...details[idx], [field]: value };
            return { ...prev, details };
        });
    };

    const openLocationModal = async (idx) => {
        if (!active) return;
        const row = active.details[idx];
        if (!row?.itemId) {
            showToast("error", "Vui lòng chọn mặt hàng trước.");
            return;
        }
        setLocModal({ open: true, rowIdx: idx, locations: [], loading: true });
        try {
            const locs = await getAllLocations();
            const itemsByLoc = await Promise.all(locs.map((loc) => getItemsAtLocation(loc.id)));
            const data = locs.map((loc, i) => {
                const items = itemsByLoc[i]?.items || [];
                const matched = items.find((it) => String(it.itemId) === String(row.itemId));
                return {
                    locationId: loc.id,
                    locationcode: loc.locationcode,
                    locationname: loc.locationname,
                    systemQty: matched ? Number(matched.quantity || 0) : 0,
                    batchCodes: matched?.batchCodes || [],
                };
            }).filter((loc) => Number(loc.systemQty || 0) > 0);
            setLocModal({ open: true, rowIdx: idx, locations: data, loading: false });
        } catch {
            setLocModal({ open: true, rowIdx: idx, locations: [], loading: false });
            showToast("error", "Không thể tải vị trí đang chứa.");
        }
    };

    const handleLocConfirm = (entries) => {
        setActive((prev) => {
            if (!prev) return prev;
            const details = [...prev.details];
            const idx = locModal.rowIdx;
            if (idx === null || idx === undefined) return prev;
            const total = entries.reduce((sum, e) => sum + Number(e.actualQty || 0), 0);
            details[idx] = {
                ...details[idx],
                locationEntries: entries,
                actualquantity: total,
            };
            return { ...prev, details };
        });
        setLocModal({ open: false, rowIdx: null, locations: [], loading: false });
    };

    const handleSave = async () => {
        if (!active) return;
        setSaving(true);
        try {
            const body = {
                docno: active.docno,
                docDate: active.docDate ? active.docDate.substring(0, 10) : null,
                description: active.description || null,
                details: active.details.map((d) => ({
                    itemId: d.itemId,
                    actualquantity: d.actualquantity === "" || d.actualquantity === null || d.actualquantity === undefined
                        ? null
                        : Number(d.actualquantity),
                    description: d.description || null,
                    locationEntries: (d.locationEntries || []).map((e) => ({
                        locationId: e.locationId,
                        locationcode: e.locationcode,
                        actualQty: Number(e.actualQty || 0),
                        systemQty: Number(e.systemQty || 0),
                        batchCodes: e.batchCodes || [],
                    })),
                })),
            };
            const res = await updateAssignedAudit(active.id, body);
            if (res?.success) {
                showToast("success", "Đã lưu số liệu kiểm kê.");
                const updated = await getAuditById(active.id);
                setActive({ ...updated, details: (updated.details || []).map((d) => ({ ...d })) });
            } else {
                showToast("error", res?.message || "Lưu thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra khi lưu.");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!active) return;
        const missing = active.details.find((d) => d.actualquantity === "" || d.actualquantity === null || d.actualquantity === undefined);
        if (missing) {
            showToast("error", "Vui lòng nhập số lượng thực tế cho tất cả mặt hàng.");
            return;
        }
        const negative = active.details.find((d) => Number(d.actualquantity) < 0);
        if (negative) {
            showToast("error", "Số lượng thực tế không được nhỏ hơn 0.");
            return;
        }
        setSubmitting(true);
        try {
            const saveBody = {
                docno: active.docno,
                docDate: active.docDate ? active.docDate.substring(0, 10) : null,
                description: active.description || null,
                details: active.details.map((d) => ({
                    itemId: d.itemId,
                    actualquantity: Number(d.actualquantity),
                    description: d.description || null,
                    locationEntries: (d.locationEntries || []).map((e) => ({
                        locationId: e.locationId,
                        locationcode: e.locationcode,
                        actualQty: Number(e.actualQty || 0),
                        systemQty: Number(e.systemQty || 0),
                        batchCodes: e.batchCodes || [],
                    })),
                })),
            };
            await updateAssignedAudit(active.id, saveBody);
            const res = await submitAudit(active.id);
            if (res?.success) {
                showToast("success", "Đã gửi kết quả kiểm kê cho quản lý!");
                await fetchList();
                setActive(null);
                navigate("/audits");
            } else {
                showToast("error", res?.message || "Gửi thất bại.");
            }
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Có lỗi xảy ra khi gửi.");
        } finally {
            setSubmitting(false);
        }
    };

    // Theo API docs: staff có thể cập nhật khi REQUESTED (chuyển sang IN_PROGRESS) hoặc đang IN_PROGRESS
    const canEdit = active && ["REQUESTED", "IN_PROGRESS"].includes(active.docstatus);

    return (
        <>
            {toast && (
                <div className={`sp-toast ${toast.type === "success" ? "sp-toast-success" : "sp-toast-error"}`}>{toast.msg}</div>
            )}

            <LocationModal
                open={locModal.open}
                loading={locModal.loading}
                locations={locModal.locations}
                initialEntries={locModal.rowIdx !== null && active ? active.details[locModal.rowIdx]?.locationEntries : []}
                onClose={() => setLocModal({ open: false, rowIdx: null, locations: [], loading: false })}
                onConfirm={handleLocConfirm}
            />

            <div className="sp-main">
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Chứng từ &rsaquo;{" "}
                            <span className="sp-breadcrumb-link" onClick={() => navigate("/audits")}>Kiểm kê hàng tồn kho</span>
                            {" "}&rsaquo;{" "}
                            <span className="sp-breadcrumb-active">Yêu cầu kiểm kê</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                <div className="sp-content">
                    <h1 className="sp-title">Yêu cầu kiểm kê</h1>

                    {!queryId && (
                        <div className="sp-status-row" style={{ padding: "36px 0" }}>
                            Vui lòng chọn phiếu từ danh sách yêu cầu kiểm kê.
                        </div>
                    )}

                    {activeLoading && (
                        <div style={{ textAlign: "center", color: "#4c6152", padding: "24px 0" }}>Đang tải chi tiết phiếu...</div>
                    )}

                    {!activeLoading && active && (
                        <div className="rc-form-card" style={{ marginTop: 16 }}>
                            <div className="rc-header-row">
                                <label className="rc-form-label">Số phiếu</label>
                                <input className="rc-form-input" style={{ minWidth: 180 }} value={active.docno || ""} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày</label>
                                <input type="date" className="rc-form-input" style={{ minWidth: 150 }}
                                    value={active.docDate ? active.docDate.substring(0, 10) : ""} readOnly />
                                <label className="rc-form-label" style={{ marginLeft: 16 }}>Người giao</label>
                                <input className="rc-form-input" style={{ minWidth: 180 }}
                                    value={active.createdByFullname || active.createdByUsername || ""} readOnly />
                                <span style={{ marginLeft: "auto" }}>
                                    <span className={STATUS_BADGE[active.docstatus] || "rc-badge"}>
                                        {STATUS_LABELS[active.docstatus] || active.docstatus}
                                    </span>
                                </span>
                            </div>

                            {active.description && (
                                <div className="rc-form-row">
                                    <label className="rc-form-label">Diễn giải</label>
                                    <input className="rc-form-input rc-form-full" value={active.description} readOnly />
                                </div>
                            )}

                            {!canEdit && active.docstatus === "SUBMITTED" && (
                                <div style={{ background: "#fff3e0", border: "1px solid #ffb74d", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#5d4037" }}>
                                    Đã gửi kết quả cho quản lý. Đang chờ xác nhận.
                                </div>
                            )}
                            {active.docstatus === "REJECTED" && (
                                <div style={{ background: "#fbe9e7", border: "1px solid #ff8a65", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.85rem", color: "#bf360c" }}>
                                    Phiếu kiểm kê đã bị <strong>từ chối</strong> bởi quản lý.
                                    {active.rejectReason && (
                                        <span> Lý do: <strong>{active.rejectReason}</strong></span>
                                    )}
                                </div>
                            )}

                            <div className="rc-detail-table-wrap">
                                <table className="rc-detail-table" style={{ width: "100%" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: "4%" }}>STT</th>
                                            <th style={{ width: "9%" }}>Mã hàng</th>
                                            <th style={{ width: "18%" }}>Tên hàng hóa</th>
                                            <th style={{ width: "5%" }}>ĐVT</th>
                                            <th style={{ width: "22%" }}>Vị trí kiểm kê</th>
                                            <th style={{ width: "9%", textAlign: "right" }}>SL hệ thống</th>
                                            <th style={{ width: "9%", textAlign: "right" }}>SL thực tế</th>
                                            <th style={{ width: "8%", textAlign: "right" }}>Chênh lệch</th>
                                            <th style={{ width: "16%" }}>Đề xuất xử lý</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {active.details && active.details.map((d, idx) => (
                                            <tr key={d.id || idx}>
                                                <td className="rc-td-stt">{idx + 1}</td>
                                                <td style={{ fontWeight: 600, color: "#1E854A" }}>{d.itemcode}</td>
                                                <td>{d.itemname}</td>
                                                <td>{d.unitof}</td>
                                                <td>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                        {d.locationEntries && d.locationEntries.length > 0 && (
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem" }}>
                                                                {d.locationEntries.map((e) => (
                                                                    <span key={`${d.itemId}-${e.locationId}`} style={{ color: "#4c6152" }}>
                                                                        {e.locationcode}: <strong>{e.actualQty}</strong> / {e.systemQty}
                                                                        {(e.batchCodes || []).length > 0 && (
                                                                            <span style={{ color: "#8ba392", marginLeft: 4 }}>
                                                                                (Lô: {e.batchCodes.join(", ")})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {canEdit && (
                                                            <button
                                                                className="sp-btn-outline"
                                                                type="button"
                                                                onClick={() => openLocationModal(idx)}
                                                                style={{ padding: "4px 10px", fontSize: "0.78rem", alignSelf: "flex-start" }}
                                                            >
                                                                Chọn vị trí
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="rc-td-num au-book-qty">{d.bookquantity ?? "—"}</td>
                                                <td>
                                                    <input
                                                        className="rc-td-input rc-td-num"
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={d.actualquantity ?? ""}
                                                        onChange={(e) => handleItemChange(idx, "actualquantity", e.target.value)}
                                                        disabled={!canEdit}
                                                        style={{ width: "90%" }}
                                                    />
                                                </td>
                                                {(() => {
                                                    const book = Number(d.bookquantity ?? 0);
                                                    const actual = d.actualquantity === "" || d.actualquantity === null || d.actualquantity === undefined
                                                        ? null
                                                        : Number(d.actualquantity);
                                                    const diff = actual === null ? null : actual - book;
                                                    let suggestion = "—";
                                                    if (diff !== null) {
                                                        if (diff > 0) suggestion = "Tạo phiếu nhập";
                                                        else if (diff < 0) suggestion = "Tạo phiếu xuất";
                                                        else suggestion = "Khớp sổ sách";
                                                    }
                                                    return (
                                                        <>
                                                            <DiffCell diff={diff} />
                                                            <td style={{ whiteSpace: "nowrap" }}>
                                                                {suggestion === "Khớp sổ sách"
                                                                    ? <span style={{ color: "#8ba392", fontSize: "0.83rem" }}>{suggestion}</span>
                                                                    : suggestion}
                                                            </td>
                                                        </>
                                                    );
                                                })()}
                                            </tr>
                                        ))}
                                        {(!active.details || active.details.length === 0) && (
                                            <tr><td colSpan={9} style={{ textAlign: "center", color: "#8ba392", padding: 16 }}>Không có dữ liệu.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="rc-form-actions">
                                <button className="sp-btn-outline" onClick={() => navigate("/audits")}>Đóng</button>
                                {canEdit && (
                                    <>
                                        <button className="sp-btn-outline" onClick={handleSave} disabled={saving || submitting}>
                                            {saving ? "Đang lưu..." : "Lưu nháp"}
                                        </button>
                                        <button className="sp-btn-primary" onClick={handleSubmit} disabled={saving || submitting}>
                                            {submitting ? "Đang gửi..." : "Gửi kết quả"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
