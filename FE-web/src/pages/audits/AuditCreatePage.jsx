import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "../receipts/receipts.css";
import "./audits.css";
import { createAudit, getAllAudits, getAuditStockRows } from "../../api/auditApi";
import { getAllEmployees } from "../../api/employeeApi";
import TopbarRight from "../../components/TopbarRight";
import notify from "../../utils/notify";
import { formatDateForDisplay, normalizeDateDisplayInput, parseDisplayDateToIso } from "../../utils/dateInput";
import { auditDetailPayload, formatNumber, makeRowsFromStockRows, toInputDate } from "./auditRowUtils";
import { useDraft } from "../../utils/useDraft";
import DraftBanner from "../../components/DraftBanner";

const DRAFT_KEY = "draft_audit_create";

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

let _auditRowKey = 0;
function newEmptyAuditRow() {
    _auditRowKey += 1;
    return {
        _id: `audit-empty-${_auditRowKey}`,
        selectedItemId: "",
        itemId: null,
        itemcode: "",
        itemname: "",
        unitof: "",
        batchEntries: [],
    };
}

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

function IconClose() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function IconChevron() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function BatchPickerModal({ open, onClose, onConfirm, options }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(new Set());
    const PAGE_SIZE = 10;

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSearch("");
            setPage(1);
            setSelected(new Set());
        }
    }, [open]);

    if (!open) return null;

    const query = search.trim().toLowerCase();
    const filtered = (options || []).filter((row) => (
        !query
        || (row.batchCode || "").toLowerCase().includes(query)
        || (row.locationcode || "").toLowerCase().includes(query)
        || (row.locationname || "").toLowerCase().includes(query)
    ));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const handleToggle = (rowId) => {
        setSelected((prev) => {
            const next = new Set(prev);
            const key = String(rowId);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };
    const handleConfirm = () => {
        const picked = filtered.filter((row) => selected.has(String(row._id)));
        if (picked.length > 0) onConfirm(picked);
    };

    return (
        <div className="rc-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rc-modal">
                <div className="rc-modal-header">
                    <span className="rc-modal-title">Chọn mã lô kiểm kê</span>
                    <button className="rc-modal-close" onClick={onClose}><IconClose /></button>
                </div>
                <div className="rc-modal-body">
                    <div className="rc-modal-search-row">
                        <input
                            className="rc-modal-search"
                            placeholder="Tìm kiếm mã lô, vị trí..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#8ba392", padding: "16px 0" }}>Không có mã lô phù hợp.</div>
                    ) : (
                        <>
                            <div className="rc-modal-section-hd">Mã lô có hàng trong kho</div>
                            <table className="rc-modal-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 36 }} />
                                        <th>Mã lô</th>
                                        <th>Vị trí</th>
                                        <th style={{ textAlign: "right" }}>SL hệ thống</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.map((row) => {
                                        const isChecked = selected.has(String(row._id));
                                        return (
                                            <tr key={row._id} onClick={() => handleToggle(row._id)} style={{ cursor: "pointer" }} className={isChecked ? "rc-row-selected" : ""}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleToggle(row._id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td style={{ fontWeight: 600, color: "#1E854A" }}>{row.batchCode || "Không mã lô"}</td>
                                                <td>{row.locationcode || row.locationname || "—"}</td>
                                                <td style={{ textAlign: "right" }}>{formatNumber(row.bookquantity)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    )}

                    {totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 }}>
                            <button className="sp-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
                            <span style={{ fontSize: "0.85rem", color: "#4c6152" }}>{safePage} / {totalPages}</span>
                            <button className="sp-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
                        </div>
                    )}
                </div>
                <div className="rc-modal-footer">
                    <span className="rc-modal-selected-info">
                        {selected.size > 0 ? `Đã chọn: ${selected.size} mã lô` : "Chưa chọn mã lô nào"}
                    </span>
                    <button className="sp-btn-outline" onClick={onClose}>Hủy bỏ</button>
                    <button className="sp-btn-primary" onClick={handleConfirm} disabled={selected.size === 0}>Xác nhận</button>
                </div>
            </div>
        </div>
    );
}

export default function AuditCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = user?.role === "STAFF" || user?.role === "NV";

    const { hasDraft, draftSavedAt, saveDraft, loadDraft, clearDraft } = useDraft(DRAFT_KEY);
    const [showDraftBanner, setShowDraftBanner] = useState(false);

    const [form, setForm] = useState({
        startDate: todayStr(),
        endDate: todayStr(),
        docno: "",
        description: "",
        assigneeId: "",
    });
    const [dateDisplay, setDateDisplay] = useState({
        startDate: formatDateForDisplay(todayStr()),
        endDate: formatDateForDisplay(todayStr()),
    });
    const [rows, setRows] = useState([]);
    const [stockOptions, setStockOptions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [batchModal, setBatchModal] = useState({ open: false, rowIdx: null, options: [] });

    // Hiển thị banner nháp hoặc tự động khôi phục nháp nếu được yêu cầu từ trang danh sách
    useEffect(() => {
        const hasCloneState = !!location.state?.clone;
        if (hasDraft && !hasCloneState) {
            if (location.state?.resumeDraft) {
                const draft = loadDraft();
                if (draft) {
                    if (draft.form) setForm(draft.form);
                    if (draft.dateDisplay) setDateDisplay(draft.dateDisplay);
                    if (draft.rows) {
                        setRows(draft.rows.map((r) => ({
                            ...r,
                            _id: `audit-restore-${++_auditRowKey}`,
                            batchEntries: (r.batchEntries || []).map((entry) => ({
                                ...entry,
                                _id: `audit-batch-restore-${++_auditRowKey}`,
                            })),
                        })));
                    }
                }
            } else {
                setShowDraftBanner(true);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedAssignee = useMemo(
        () => employees.find((e) => String(e.id) === String(form.assigneeId)),
        [employees, form.assigneeId]
    );

    const selectedStockIds = useMemo(
        () => new Set(rows.flatMap((row) => row.batchEntries || []).map((entry) => entry.selectedStockId).filter(Boolean)),
        [rows]
    );

    const selectedItemIds = useMemo(
        () => new Set(rows.map((row) => row.selectedItemId).filter(Boolean)),
        [rows]
    );

    const itemOptions = useMemo(() => {
        const map = new Map();
        stockOptions.forEach((row) => {
            if (!row.itemId || map.has(String(row.itemId))) return;
            map.set(String(row.itemId), {
                itemId: row.itemId,
                itemcode: row.itemcode,
                itemname: row.itemname,
                unitof: row.unitof,
            });
        });
        return Array.from(map.values());
    }, [stockOptions]);

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [employeeList, stockRows, auditList] = await Promise.all([
                getAllEmployees(),
                getAuditStockRows(),
                getAllAudits(),
            ]);
            const selectableStockRows = makeRowsFromStockRows(stockRows);
            setEmployees(employeeList || []);
            setStockOptions(selectableStockRows);
            const clone = location.state?.clone;
            if (clone && clone.details && clone.details.length > 0) {
                const grouped = {};
                clone.details.forEach((d) => {
                    const key = String(d.itemId);
                    if (!grouped[key]) {
                        grouped[key] = {
                            _id: `audit-clone-row-${++_auditRowKey}`,
                            selectedItemId: String(d.itemId),
                            itemId: d.itemId,
                            itemcode: d.itemcode || "",
                            itemname: d.itemname || "",
                            unitof: d.unitof || "",
                            batchEntries: [],
                        };
                    }
                    grouped[key].batchEntries.push({
                        _id: `audit-batch-clone-${++_auditRowKey}`,
                        selectedStockId: `${d.batchId || ""}-${d.locationId || ""}`,
                        batchId: d.batchId,
                        batchCode: d.batchCode || d.batchcode || "",
                        locationId: d.locationId,
                        locationcode: d.locationcode || d.locationname || "",
                        locationname: d.locationname || "",
                        bookquantity: d.bookquantity,
                    });
                });
                setRows(Object.values(grouped));
            } else {
                setRows(selectableStockRows.length > 0 ? [newEmptyAuditRow()] : []);
            }
            const nextStartDate = toInputDate(clone?.startDate || clone?.auditStartDate || clone?.fromDate || clone?.docDate);
            const nextEndDate = toInputDate(clone?.endDate || clone?.auditEndDate || clone?.toDate || clone?.dueDate || clone?.docDate);
            setForm((prev) => ({
                ...prev,
                docno: prev.docno || buildNextDocno("PKK", auditList),
                description: clone?.description || prev.description,
                startDate: nextStartDate || prev.startDate,
                endDate: nextEndDate || prev.endDate,
                assigneeId: clone?.assignedToUserId ? String(clone.assignedToUserId) : (clone?.assigneeId ? String(clone.assigneeId) : prev.assigneeId),
            }));
            setDateDisplay((prev) => ({
                startDate: formatDateForDisplay(nextStartDate || form.startDate || prev.startDate),
                endDate: formatDateForDisplay(nextEndDate || form.endDate || prev.endDate),
            }));
        } catch {
            notify("Không thể tải dữ liệu tồn kho theo lô.", { type: "error" });
        } finally {
            setLoadingData(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (isStaff && !location.state?.clone) {
            navigate("/audits/requests");
        }
    }, [isStaff, navigate, location.state]);

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };
    const setDateField = (field, value) => {
        const display = normalizeDateDisplayInput(value);
        setDateDisplay((prev) => ({ ...prev, [field]: display }));
        setForm((prev) => ({ ...prev, [field]: parseDisplayDateToIso(display) }));
    };

    const makeBatchEntry = (stockRow) => {
        _auditRowKey += 1;
        return {
            _id: `audit-batch-${_auditRowKey}`,
            selectedStockId: stockRow._id,
            batchId: stockRow.batchId,
            batchCode: stockRow.batchCode,
            locationId: stockRow.locationId,
            locationcode: stockRow.locationcode,
            locationname: stockRow.locationname,
            bookquantity: stockRow.bookquantity,
        };
    };

    const addBatchEntries = (idx, pickedRows) => {
        setRows((prev) => {
            const next = [...prev];
            const row = next[idx];
            if (!row) return prev;
            const currentIds = new Set((row.batchEntries || []).map((entry) => entry.selectedStockId));
            const newEntries = (pickedRows || [])
                .filter((stockRow) => !currentIds.has(stockRow._id))
                .map(makeBatchEntry);
            next[idx] = {
                ...row,
                batchEntries: [...(row.batchEntries || []), ...newEntries],
            };
            return next;
        });
    };

    const openBatchModal = (idx) => {
        const row = rows[idx];
        if (!row?.selectedItemId) {
            notify("Vui lòng chọn mã vật tư trước.", { type: "warning" });
            return;
        }
        const options = stockOptions
            .filter((option) => String(option.itemId) === String(row.selectedItemId))
            .filter((option) => !selectedStockIds.has(option._id))
            .sort((a, b) => String(a.batchCode || "").localeCompare(String(b.batchCode || "")));
        setBatchModal({ open: true, rowIdx: idx, options });
    };

    const handleBatchConfirm = (pickedRows) => {
        if (batchModal.rowIdx === null || !pickedRows?.length) return;
        addBatchEntries(batchModal.rowIdx, pickedRows);
        setBatchModal({ open: false, rowIdx: null, options: [] });
    };

    const handleSelectItem = (idx, itemId) => {
        setRows((prev) => {
            const next = [...prev];
            const found = itemOptions.find((item) => String(item.itemId) === String(itemId));
            next[idx] = {
                ...newEmptyAuditRow(),
                _id: next[idx]?._id || `audit-row-${idx}`,
                selectedItemId: itemId,
                itemId: found?.itemId || null,
                itemcode: found?.itemcode || "",
                itemname: found?.itemname || "",
                unitof: found?.unitof || "",
                batchEntries: [],
            };
            return next;
        });
    };

    const handleAddRow = () => {
        setRows((prev) => [...prev, newEmptyAuditRow()]);
    };

    const handleRemoveRow = (idx) => {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    };

    const removeBatchEntry = (rowIdx, entryIdx) => {
        setRows((prev) => {
            const next = [...prev];
            const row = next[rowIdx];
            if (!row) return prev;
            next[rowIdx] = {
                ...row,
                batchEntries: (row.batchEntries || []).filter((_, i) => i !== entryIdx),
            };
            return next;
        });
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
        if (stockOptions.length === 0) {
            notify("Không có dòng tồn kho theo mã lô để lập phiếu kiểm kê.", { type: "error" });
            return false;
        }
        if (rows.length === 0) {
            notify("Vui lòng thêm ít nhất một dòng kiểm kê.", { type: "error" });
            return false;
        }
        for (let i = 0; i < rows.length; i += 1) {
            if (!rows[i].itemId) {
                notify(`Dòng ${i + 1}: Vui lòng chọn mã vật tư.`, { type: "error" });
                return false;
            }
            if (!rows[i].batchEntries?.length) {
                notify(`Dòng ${i + 1}: Vui lòng chọn ít nhất một mã lô kiểm kê.`, { type: "error" });
                return false;
            }
            for (let j = 0; j < rows[i].batchEntries.length; j += 1) {
                const entry = rows[i].batchEntries[j];
                if (!entry.batchId || !entry.locationId) {
                    notify(`Dòng ${i + 1}, lô ${j + 1}: Dữ liệu mã lô hoặc vị trí không hợp lệ.`, { type: "error" });
                    return false;
                }
            }
        }
        return true;
    };

    const flattenRowsForPayload = (includeActual) => rows.flatMap((row) => (
        (row.batchEntries || []).map((entry) => auditDetailPayload({
            ...row,
            ...entry,
            itemId: row.itemId,
            itemcode: row.itemcode,
            itemname: row.itemname,
            unitof: row.unitof,
        }, includeActual))
    ));

    const buildPayload = ({ sendToStaff = false } = {}) => ({
        docDate: form.startDate,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim() || null,
        details: flattenRowsForPayload(false),
        ...(sendToStaff ? { assignedUserId: Number(form.assigneeId), sendToStaff: true } : {}),
    });



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
                clearDraft(); // Xóa nháp local khi gửi yêu cầu thành công
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

    // ── Lưu nháp local ──────────────────────────────────────────────────────
    const handleSaveDraftLocal = () => {
        try {
            saveDraft({ form, rows, dateDisplay });
            notify("Đã lưu nháp thành công.", { type: "success" });
            setTimeout(() => navigate("/audits"), 1000);
        } catch {
            notify("Không thể lưu nháp.", { type: "error" });
        }
    };

    const handleRestoreDraft = () => {
        const draft = loadDraft();
        if (!draft) return;
        if (draft.form) setForm(draft.form);
        if (draft.dateDisplay) setDateDisplay(draft.dateDisplay);
        if (draft.rows) {
            setRows(draft.rows.map((r) => ({
                ...r,
                _id: `audit-restore-${++_auditRowKey}`,
                batchEntries: (r.batchEntries || []).map((entry) => ({
                    ...entry,
                    _id: `audit-batch-restore-${++_auditRowKey}`,
                })),
            })));
        }
        setShowDraftBanner(false);
        notify("Đã khôi phục nháp.", { type: "success" });
    };

    const handleDeleteDraft = () => {
        clearDraft();
        setShowDraftBanner(false);
        notify("Đã xóa nháp local.", { type: "success" });
    };

    const handleDismissBanner = () => {
        setShowDraftBanner(false);
    };

    return (
        <>
            <BatchPickerModal
                open={batchModal.open}
                onClose={() => setBatchModal({ open: false, rowIdx: null, options: [] })}
                onConfirm={handleBatchConfirm}
                options={batchModal.options}
            />
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

                {showDraftBanner && (
                    <DraftBanner
                        draftSavedAt={draftSavedAt}
                        onResume={handleRestoreDraft}
                        onDelete={handleDeleteDraft}
                        onDismiss={handleDismissBanner}
                    />
                )}

                <div className="rc-form-card">
                    <div className="rc-header-row au-header-wrap">
                        <label className="rc-form-label">Ngày bắt đầu</label>
                        <input
                            className="rc-form-input"
                            style={{ minWidth: 150 }}
                            placeholder="dd/mm/yyyy"
                            value={dateDisplay.startDate}
                            onChange={(e) => setDateField("startDate", e.target.value)}
                        />
                        <label className="rc-form-label" style={{ marginLeft: 16 }}>Ngày kết thúc</label>
                        <input
                            className="rc-form-input"
                            style={{ minWidth: 150 }}
                            placeholder="dd/mm/yyyy"
                            value={dateDisplay.endDate}
                            onChange={(e) => setDateField("endDate", e.target.value)}
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
                        Chọn mã vật tư trước, sau đó chọn mã lô cần kiểm kê cho từng dòng. Số lượng hệ thống và vị trí sẽ tự điền theo mã lô.
                    </div>
                    <div className="rc-detail-table-wrap">
                        <table className="rc-detail-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "4%" }}>STT</th>
                                    <th style={{ width: "10%" }}>Mã vật tư</th>
                                    <th>Tên vật tư hàng hóa</th>
                                    <th style={{ width: "7%" }}>ĐVT</th>
                                    <th style={{ width: "12%", textAlign: "right" }}>SL hệ thống</th>
                                    <th style={{ width: "12%", textAlign: "right" }}>SL thực tế</th>
                                    <th style={{ width: "4%" }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingData && (
                                    <tr><td colSpan={7} className="sp-status-row">Đang tải tồn kho theo lô...</td></tr>
                                )}
                                {!loadingData && stockOptions.length === 0 && (
                                    <tr><td colSpan={7} className="sp-status-row">Không có tồn kho theo mã lô.</td></tr>
                                )}
                                {!loadingData && rows.map((row, idx) => {
                                    const rowSystemQty = row.selectedItemId
                                        ? stockOptions
                                            .filter((option) => String(option.itemId) === String(row.selectedItemId))
                                            .reduce((sum, option) => sum + Number(option.bookquantity || 0), 0)
                                        : 0;
                                    return (
                                        <React.Fragment key={row._id}>
                                            <tr>
                                                <td className="rc-td-stt">{idx + 1}</td>
                                                <td>
                                                    <select
                                                        className="rc-td-select"
                                                        value={row.selectedItemId || ""}
                                                        onChange={(e) => handleSelectItem(idx, e.target.value)}
                                                        disabled={loadingData}
                                                    >
                                                        <option value="">Chọn vật tư</option>
                                                        {itemOptions
                                                            .filter((item) => !selectedItemIds.has(String(item.itemId)) || String(item.itemId) === String(row.selectedItemId))
                                                            .map((item) => (
                                                                <option key={item.itemId} value={item.itemId}>
                                                                    {item.itemcode}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </td>
                                                <td>{row.itemname}</td>
                                                <td>{row.unitof || "—"}</td>
                                                <td className="rc-td-num au-book-qty">{formatNumber(rowSystemQty)}</td>
                                                <td className="rc-td-num" style={{ color: "#8ba392" }}>-</td>
                                                <td>
                                                    <button
                                                        className="rc-del-btn"
                                                        onClick={() => handleRemoveRow(idx)}
                                                        type="button"
                                                        title="Xóa dòng"
                                                    >
                                                        <IconTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colSpan={7} style={{ padding: "0 0 10px 32px", background: "#fafcfb" }}>
                                                    <div style={{ borderLeft: "3px solid #c6dfd0", paddingLeft: 12, paddingTop: 6 }}>
                                                        {(row.batchEntries || []).length > 0 && (
                                                            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: "0.84rem" }}>
                                                                <thead>
                                                                    <tr style={{ background: "#edf6f1" }}>
                                                                        <th style={{ padding: "5px 10px", textAlign: "left", fontWeight: 600, color: "#1E3A2F", width: "34%", borderBottom: "1px solid #c6dfd0" }}>Mã lô</th>
                                                                        <th style={{ padding: "5px 10px", textAlign: "left", fontWeight: 600, color: "#1E3A2F", width: "36%", borderBottom: "1px solid #c6dfd0" }}>Vị trí</th>
                                                                        <th style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: "#1E3A2F", width: "18%", borderBottom: "1px solid #c6dfd0" }}>SL hệ thống</th>
                                                                        <th style={{ width: "4%", borderBottom: "1px solid #c6dfd0" }}></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {row.batchEntries.map((entry, entryIdx) => (
                                                                        <tr key={entry._id} style={{ borderBottom: "1px solid #edf6f1" }}>
                                                                            <td style={{ padding: "5px 10px", fontWeight: 600, color: "#1E854A" }}>{entry.batchCode || "Không mã lô"}</td>
                                                                            <td style={{ padding: "5px 10px", color: "#4c6152" }}>{entry.locationcode || entry.locationname || "—"}</td>
                                                                            <td style={{ padding: "5px 10px", textAlign: "right", color: "#4c6152" }}>{formatNumber(entry.bookquantity)}</td>
                                                                            <td style={{ padding: "5px 8px", textAlign: "center" }}>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeBatchEntry(idx, entryIdx)}
                                                                                    title="Xóa mã lô"
                                                                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#e57373", padding: 2 }}
                                                                                >
                                                                                    <IconTrash />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                                            <button
                                                                type="button"
                                                                className={`rc-loc-btn${(row.batchEntries || []).length > 0 ? " rc-loc-btn-set" : ""}`}
                                                                onClick={() => openBatchModal(idx)}
                                                                disabled={loadingData || !row.selectedItemId}
                                                                style={{ opacity: loadingData || !row.selectedItemId ? 0.5 : 1 }}
                                                            >
                                                                <IconPlus size={12} />
                                                                &nbsp;Chọn mã lô <IconChevron />
                                                            </button>
                                                            {!row.selectedItemId && (
                                                                <span style={{ fontSize: "0.82rem", color: "#8ba392" }}>Chọn mã vật tư trước để lọc danh sách mã lô.</span>
                                                            )}
                                                            {row.selectedItemId && (row.batchEntries || []).length === 0 && (
                                                                <span style={{ fontSize: "0.82rem", color: "#8ba392" }}>Có thể chọn nhiều mã lô cho cùng mã vật tư.</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                                {!loadingData && stockOptions.length > 0 && rows.length < itemOptions.length && (
                                    <tr className="rc-add-row" onClick={handleAddRow}>
                                        <td colSpan={7}>
                                            <button className="rc-add-row-btn" type="button">
                                                <IconPlus size={13} /> Thêm dòng chọn mã vật tư
                                            </button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="rc-form-actions">
                        <button className="sp-btn-outline" onClick={() => navigate("/audits")}>Hủy bỏ</button>
                        <button
                            id="audit-local-draft-save-btn"
                            type="button"
                            className="sp-btn-draft"
                            onClick={handleSaveDraftLocal}
                            disabled={saving || loadingData}
                            title="Lưu tạm dữ liệu vào máy, không tạo phiếu chính thức"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            Lưu nháp
                        </button>

                        <button className="sp-btn-primary" onClick={handleSendRequest} disabled={saving || loadingData}>
                            {saving ? "Đang gửi..." : "Gửi yêu cầu"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
