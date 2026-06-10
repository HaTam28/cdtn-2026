import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./overview.css";
import { getAllItems } from "../../api/itemApi";
import { getAllBatches } from "../../api/batchApi";
import { getAllLocations, getItemsAtLocation } from "../../api/locationApi";
import { getAllReceipts, confirmReceipt } from "../../api/receiptApi";
import { getAllIssues, confirmIssue } from "../../api/issueApi";
import { getAssignedAuditsPending } from "../../api/auditApi";
import TopbarRight from "../../components/TopbarRight";
import notify from "../../utils/notify";

const BAR_COLORS = ["#F3A33B", "#FF8A7A", "#1FBE5F", "#4B3DE3", "#B07AF8"];

function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "0";
    const num = Number(value);
    if (Number.isNaN(num)) return "0";
    return num.toLocaleString("vi-VN");
}

function formatDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function OverviewPage() {
    const navigate = useNavigate();

    // User Role check
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);
    const isStaff = user?.role === "STAFF" || user?.role === "NV";

    // Staff state
    const [items, setItems] = useState([]);
    const [batches, setBatches] = useState([]);
    const [locations, setLocations] = useState([]);
    const [locationDetails, setLocationDetails] = useState([]);
    const [locationSearch, setLocationSearch] = useState("");
    const [assignedAudits, setAssignedAudits] = useState([]);

    // Manager/Admin state
    const [receipts, setReceipts] = useState([]);
    const [issues, setIssues] = useState([]);
    const [approvingId, setApprovingId] = useState(null);

    // Cấp giới hạn lọc tháng động (Tháng hiện tại trở về trước)
    const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
    const [selectedMonthImportExport, setSelectedMonthImportExport] = useState(String(currentMonth));
    const [selectedMonthTop5, setSelectedMonthTop5] = useState(String(currentMonth));
    const [filterDocType, setFilterDocType] = useState("ALL");
    const [hoveredAreaPoint, setHoveredAreaPoint] = useState(null);
    const [hoveredBarGroup, setHoveredBarGroup] = useState(null);
    const [hoveredCardId, setHoveredCardId] = useState(null);

    // Common state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load Data based on role
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isStaff) {
                const [itemList, batchList, locList, receiptList, issueList, auditList] = await Promise.all([
                    getAllItems(),
                    getAllBatches(),
                    getAllLocations(),
                    getAllReceipts(),
                    getAllIssues(),
                    getAssignedAuditsPending(),
                ]);
                setItems(itemList || []);
                setBatches(batchList || []);
                setLocations(locList || []);
                setReceipts(receiptList || []);
                setIssues(issueList || []);
                setAssignedAudits(auditList || []);

                const detailList = await Promise.all(
                    (locList || []).map(async (loc) => {
                        try {
                            const detail = await getItemsAtLocation(loc.id);
                            return { location: loc, detail };
                        } catch {
                            return { location: loc, detail: null };
                        }
                    })
                );
                setLocationDetails(detailList);
            } else {
                // Manager/Admin loads items, batches, receipts, issues
                const [itemList, batchList, receiptList, issueList] = await Promise.all([
                    getAllItems(),
                    getAllBatches(),
                    getAllReceipts(),
                    getAllIssues(),
                ]);
                setItems(itemList || []);
                setBatches(batchList || []);
                setReceipts(receiptList || []);
                setIssues(issueList || []);
            }
        } catch (err) {
            setError("Không thể tải dữ liệu tổng quan kho.");
        } finally {
            setLoading(false);
        }
    }, [isStaff]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Duyệt nhanh phiếu (Chỉ dành cho Manager/Admin)
    const handleApprove = async (e, doc) => {
        e.stopPropagation();
        if (approvingId) return;
        setApprovingId(doc.id);
        try {
            if (doc.type === "PN") {
                await confirmReceipt(doc.id);
                notify("Duyệt phiếu nhập kho thành công!", { type: "success" });
            } else {
                await confirmIssue(doc.id);
                notify("Duyệt phiếu xuất kho thành công!", { type: "success" });
            }
            // Reload data after approval
            await loadData();
        } catch (err) {
            notify(err?.response?.data?.message || "Duyệt phiếu thất bại.", { type: "error" });
        } finally {
            setApprovingId(null);
        }
    };

    // Chuyển hướng xem chi tiết
    const handleViewDetail = (doc) => {
        if (doc.type === "PN") {
            navigate(`/receipts/${doc.id}`);
        } else {
            navigate(`/issues/${doc.id}`);
        }
    };

    // --- STAFF CALCULATIONS ---
    const stockByItem = useMemo(() => {
        const map = new Map();
        batches.forEach((b) => {
            const qty = Number(b.quantityRemaining ?? b.quantity ?? 0);
            const key = String(b.itemId);
            map.set(key, (map.get(key) || 0) + (Number.isFinite(qty) ? qty : 0));
        });
        return map;
    }, [batches]);

    const inventoryValue = useMemo(() => {
        return batches.reduce((sum, b) => {
            const qty = Number(b.quantityRemaining ?? b.quantity ?? 0);
            const cost = Number(b.unitCost ?? 0);
            if (!Number.isFinite(qty) || !Number.isFinite(cost)) return sum;
            return sum + qty * cost;
        }, 0);
    }, [batches]);

    const lowStockItems = useMemo(() => {
        return items
            .map((it) => {
                const rawMin = it.minstocklevel ?? it.minStockLevel ?? 50;
                const min = Number(rawMin);
                const stock = stockByItem.get(String(it.id)) || 0;
                return { item: it, min: Number.isFinite(min) ? min : 50, stock };
            })
            .filter((row) => row.min > 0 && row.stock < row.min)
            .sort((a, b) => (a.stock - b.stock));
    }, [items, stockByItem]);

    const outOfStockCount = useMemo(() => {
        return items.filter((it) => (stockByItem.get(String(it.id)) || 0) <= 0).length;
    }, [items, stockByItem]);

    const outOfStockItemsList = useMemo(() => {
        return items
            .filter((it) => (stockByItem.get(String(it.id)) || 0) <= 0)
            .map((it) => ({
                id: it.id,
                name: it.itemname || it.itemcode || "--"
            }));
    }, [items, stockByItem]);

    const overStockItemsList = useMemo(() => {
        return items
            .map((it) => {
                const rawMax = it.maxstocklevel ?? it.maxStockLevel ?? 500;
                const max = Number(rawMax);
                const stock = stockByItem.get(String(it.id)) || 0;
                return { item: it, max, stock };
            })
            .filter((row) => row.max > 0 && row.stock > row.max)
            .map((row) => ({
                id: row.item.id,
                name: row.item.itemname || row.item.itemcode || "--",
                stock: row.stock,
                max: row.max
            }));
    }, [items, stockByItem]);

    const overStockItemsCount = useMemo(() => overStockItemsList.length, [overStockItemsList]);

    const topStock = useMemo(() => {
        const list = items
            .map((it) => ({
                id: it.id,
                name: it.itemname || it.itemcode || "--",
                value: stockByItem.get(String(it.id)) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((entry, idx) => ({ ...entry, color: BAR_COLORS[idx % BAR_COLORS.length] }));
        return list;
    }, [items, stockByItem]);

    const lowStockList = useMemo(() => {
        return lowStockItems.slice(0, 5).map((row) => ({
            id: row.item.id,
            code: row.item.itemcode || "",
            name: row.item.itemname || row.item.itemcode || "--",
            unit: row.item.unitof || "",
            qty: row.stock,
            min: row.min,
            need: Math.max(0, row.min - row.stock),
        }));
    }, [lowStockItems]);

    const handleCreateReceipt = (item) => {
        if (!item) return;
        const payload = [{
            itemId: item.id,
            itemcode: item.code,
            itemname: item.name,
            unitof: item.unit,
            quantity: item.need,
        }];
        navigate("/receipts/create", { state: { prefillItems: payload } });
    };

    const inventoryRows = useMemo(() => {
        const rows = [];
        locationDetails.forEach((entry) => {
            const itemsAtLoc = entry.detail?.items || [];
            itemsAtLoc.forEach((it) => {
                const match = items.find((item) => String(item.id) === String(it.itemId));
                const min = Number(match?.minstocklevel ?? match?.minStockLevel ?? 50);
                const max = Number(match?.maxstocklevel ?? match?.maxStockLevel ?? 500);
                rows.push({
                    id: `${entry.location.id}-${it.itemId}`,
                    name: it.itemname || it.itemcode || "--",
                    location: entry.location.locationcode || entry.location.locationname || "--",
                    qty: it.quantity ?? 0,
                    min: Number.isFinite(min) ? min : 50,
                    max: Number.isFinite(max) ? max : 500,
                });
            });
        });
        return rows.slice(0, 8);
    }, [locationDetails, items]);

    const emptyLocations = useMemo(() => {
        return locationDetails
            .filter((entry) => entry.detail && entry.detail.type === "EMPTY")
            .map((entry) => ({
                id: entry.location.id,
                code: entry.location.locationcode || "--",
                zone: entry.location.rackno || "--",
                rack: entry.location.columnno || "--",
                floor: entry.location.floorno || "--",
                capacity: entry.detail && entry.detail.hasOwnProperty('remainingCapacity') && entry.detail.remainingCapacity == null
                    ? "Không giới hạn"
                    : (entry.detail?.remainingCapacity ?? entry.location.capacity ?? "Không giới hạn"),
            }))
            .slice(0, 8);
    }, [locationDetails]);

    const filteredEmptyLocations = useMemo(() => {
        if (!locationSearch.trim()) return emptyLocations;
        const q = locationSearch.trim().toLowerCase();
        return emptyLocations.filter((row) => String(row.code).toLowerCase().includes(q));
    }, [emptyLocations, locationSearch]);


    // --- MANAGER/ADMIN CALCULATIONS & DYNAMIC DATA ---
    const pendingList = useMemo(() => {
        const list = [];
        receipts.forEach((r) => {
            if (r.docstatus === "DRAFT") {
                list.push({
                    id: r.id,
                    type: "PN",
                    docno: r.docno || `PN-${r.id}`,
                    creator: r.createdByFullname || r.createdByName || "Nguyễn Văn A",
                    description: r.description || "Nhập hàng hóa",
                    date: r.docDate || r.createdAt,
                    rawDate: new Date(r.docDate || r.createdAt)
                });
            }
        });
        issues.forEach((i) => {
            if (i.docstatus === "DRAFT") {
                list.push({
                    id: i.id,
                    type: "PX",
                    docno: i.docno || `PX-${i.id}`,
                    creator: i.createdByFullname || i.createdByName || "Nguyễn Văn B",
                    description: i.description || "Xuất hàng hóa",
                    date: i.docDate || i.createdAt,
                    rawDate: new Date(i.docDate || i.createdAt)
                });
            }
        });
        // Sort by date descending
        list.sort((a, b) => b.rawDate - a.rawDate);
        return list;
    }, [receipts, issues]);

    const filteredPendingList = useMemo(() => {
        if (filterDocType === "ALL") return pendingList;
        return pendingList.filter((doc) => doc.type === filterDocType);
    }, [pendingList, filterDocType]);

    // Thống kê đơn nhập/xuất hôm nay
    const todayReceiptsList = useMemo(() => {
        return receipts.filter(r => {
            const d = new Date(r.createdAt || r.docDate);
            return d.toDateString() === new Date().toDateString();
        });
    }, [receipts]);

    const todayIssuesList = useMemo(() => {
        return issues.filter(i => {
            const d = new Date(i.createdAt || i.docDate);
            return d.toDateString() === new Date().toDateString();
        });
    }, [issues]);

    const todayReceiptsCount = useMemo(() => todayReceiptsList.length, [todayReceiptsList]);
    const todayIssuesCount = useMemo(() => todayIssuesList.length, [todayIssuesList]);

    // RENDER STAFF VIEW
    if (isStaff) {
        const staffSummaryCards = [
            {
                id: 1,
                label: "Nhiệm vụ kiểm kê",
                value: assignedAudits.length > 0 ? formatNumber(assignedAudits.length) : "10",
                sub: `+${assignedAudits.filter(a => new Date(a.createdAt || a.docDate).toDateString() === new Date().toDateString()).length} mới hôm nay`,
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                ),
                iconTone: "blue"
            },
            {
                id: 2,
                label: "Đơn Nhập/Xuất hôm nay",
                value: `${todayReceiptsCount}/${todayIssuesCount}`,
                sub: `Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}`,
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                ),
                iconTone: "green"
            },
            {
                id: 3,
                label: "Vật tư dưới mức an toàn",
                value: lowStockItems.length > 0 ? formatNumber(lowStockItems.length) : "25",
                sub: "Cần bổ sung",
                subColor: "#d97706",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                ),
                iconTone: "amber"
            },
            {
                id: 4,
                label: "Vật tư hết hàng",
                value: outOfStockCount > 0 ? formatNumber(outOfStockCount) : "10",
                sub: "Cần nhập gấp",
                subColor: "#ef4444",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                ),
                iconTone: "red"
            },
            {
                id: 5,
                label: "Vật tư vượt định mức",
                value: overStockItemsCount > 0 ? formatNumber(overStockItemsCount) : "0",
                sub: "Cần xả bớt",
                subColor: "#c07a2a",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c07a2a" strokeWidth="2">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                        <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                ),
                iconTone: "amber"
            }
        ];

        return (
            <div className="sp-main">
                <div className="sp-topbar">
                    <div>
                        <div className="sp-breadcrumb">
                            Tổng quan &rsaquo; <span className="sp-breadcrumb-active">Kho</span>
                        </div>
                    </div>
                    <TopbarRight />
                </div>

                <div className="sp-content">
                    {error && <div className="sp-status-row sp-status-error" style={{ marginBottom: 12 }}>{error}</div>}
                    
                    {/* Thẻ chỉ số Staff */}
                    <div className="ov-summary-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                        {staffSummaryCards.map((card) => {
                            return (
                                <div 
                                    key={card.id} 
                                    className="ov-summary-card" 
                                    style={{ display: 'flex', gap: '16px', alignItems: 'center', position: 'relative' }}
                                    onMouseEnter={() => setHoveredCardId(card.id)}
                                    onMouseLeave={() => setHoveredCardId(null)}
                                >
                                    <div className={`ov-card-icon ov-${card.iconTone}`} style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
                                        {card.icon}
                                    </div>
                                    <div>
                                        <div className="ov-card-label" style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>{card.label}</div>
                                        <div className="ov-card-value" style={{ fontSize: '1.4rem', fontWeight: '700', margin: '2px 0' }}>
                                            {loading ? "..." : card.value}
                                        </div>
                                        {card.id === 1 ? (
                                            <div className="ov-card-trend ov-trend-up" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="18 15 12 9 6 15" />
                                                </svg>
                                                <span>{card.sub}</span>
                                            </div>
                                        ) : (
                                            <div className="ov-card-sub" style={{ fontSize: '0.75rem', color: card.subColor || '#6b7280', fontWeight: card.subColor ? '600' : '400' }}>{card.sub}</div>
                                        )}
                                    </div>

                                    {/* Tooltip hiển thị thông tin chi tiết khi hover từng card */}
                                    {hoveredCardId === card.id && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: card.id >= 4 ? 'auto' : '0',
                                            right: card.id >= 4 ? '0' : 'auto',
                                            width: '280px',
                                            backgroundColor: 'rgba(30, 41, 59, 0.98)',
                                            border: '1px solid #475569',
                                            borderRadius: '8px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                            padding: '10px 12px',
                                            zIndex: 50,
                                            color: '#fff',
                                            fontSize: '0.8rem',
                                            marginTop: '6px',
                                            textAlign: 'left'
                                        }}>
                                            <div style={{ fontWeight: '700', marginBottom: '6px', borderBottom: '1px solid #475569', paddingBottom: '4px', color: '#cbd5e1' }}>
                                                {card.label}
                                            </div>
                                            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {/* Card 1: Nhiệm vụ kiểm kê */}
                                                {card.id === 1 && (
                                                    assignedAudits.length === 0 ? (
                                                        <div style={{ color: '#94a3b8' }}>Không có nhiệm vụ</div>
                                                    ) : (
                                                        assignedAudits.map(a => {
                                                            const locs = Array.from(new Set((a.details || []).map(d => d.locationcode || d.locationname || "—"))).join(", ") || "—";
                                                            return (
                                                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                                                    <span style={{ fontWeight: '600', color: '#818cf8' }}>{a.docno}</span>
                                                                    <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locs}</span>
                                                                </div>
                                                            );
                                                        })
                                                     )
                                                )}

                                                {/* Card 2: Đơn Nhập/Xuất hôm nay */}
                                                {card.id === 2 && (
                                                    (todayReceiptsList.length === 0 && todayIssuesList.length === 0) ? (
                                                        <div style={{ color: '#94a3b8' }}>Không có đơn nào</div>
                                                    ) : (
                                                        <>
                                                            {todayReceiptsList.map(r => (
                                                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                                                    <span style={{ fontWeight: '600', color: '#34d399' }}>{r.docno || `PN-${r.id}`}</span>
                                                                    <span style={{ color: '#94a3b8' }}>Nhập kho</span>
                                                                </div>
                                                            ))}
                                                            {todayIssuesList.map(i => (
                                                                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                                                    <span style={{ fontWeight: '600', color: '#fca5a5' }}>{i.docno || `PX-${i.id}`}</span>
                                                                    <span style={{ color: '#94a3b8' }}>Xuất kho</span>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )
                                                )}

                                                {/* Card 3: Vật tư dưới mức an toàn */}
                                                {card.id === 3 && (
                                                    lowStockItems.length === 0 ? (
                                                        <div style={{ color: '#94a3b8' }}>Không có vật tư</div>
                                                    ) : (
                                                        lowStockItems.map(row => (
                                                            <div key={row.item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                                                <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={row.item.itemname || row.item.itemcode || "--"}>
                                                                    {row.item.itemname || row.item.itemcode || "--"}
                                                                </span>
                                                                <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                                                                    {formatNumber(row.stock)} / {formatNumber(row.min)}
                                                                </span>
                                                            </div>
                                                        ))
                                                    )
                                                )}

                                                {/* Card 4: Vật tư hết hàng */}
                                                {card.id === 4 && (
                                                    outOfStockItemsList.length === 0 ? (
                                                        <div style={{ color: '#94a3b8' }}>Không có vật tư</div>
                                                    ) : (
                                                        outOfStockItemsList.map(item => (
                                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                                                <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
                                                                    {item.name}
                                                                </span>
                                                                <span style={{ color: '#ef4444', fontWeight: '600' }}>0</span>
                                                            </div>
                                                        ))
                                                    )
                                                )}

                                                {/* Card 5: Vật tư vượt định mức */}
                                                {card.id === 5 && (
                                                    overStockItemsList.length === 0 ? (
                                                        <div style={{ color: '#94a3b8' }}>Không có vật tư</div>
                                                    ) : (
                                                        overStockItemsList.map(item => (
                                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                                                <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={item.name}>
                                                                    {item.name}
                                                                </span>
                                                                <span style={{ color: '#fb7185', fontWeight: '600' }}>
                                                                    {formatNumber(item.stock)} / {formatNumber(item.max)}
                                                                </span>
                                                            </div>
                                                        ))
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="ov-grid">
                        {/* Cảnh báo tồn kho */}
                        <div className="ov-panel">
                            <div className="ov-panel-hd">
                                <div>
                                    <div className="ov-panel-title">Cảnh báo tồn kho</div>
                                    <div className="ov-panel-sub">Các vật tư gần chạm ngưỡng tối thiểu</div>
                                </div>
                                <span className="ov-badge" style={{ background: '#fca5a5', color: '#b91c1c' }}>{lowStockList.length} vật tư</span>
                            </div>
                            <div className="ov-alert-list">
                                {lowStockList.map((item) => (
                                    <div key={item.id} className="ov-alert-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div className="ov-alert-name" style={{ fontWeight: '600' }}>{item.name}</div>
                                            <div className="ov-alert-meta" style={{ color: '#6b7280', fontSize: '0.78rem', margin: '2px 0' }}>{formatNumber(item.qty)} cái</div>
                                            <div className="ov-alert-min" style={{ color: '#d97706', fontSize: '0.75rem', fontWeight: '500' }}>Tồn tối thiểu: {formatNumber(item.min)}</div>
                                        </div>
                                        <button className="ov-alert-action" onClick={() => handleCreateReceipt(item)}>Nhập hàng</button>
                                    </div>
                                ))}
                                {!loading && lowStockList.length === 0 && (
                                    <div className="sp-status-row">Không có vật tư dưới mức an toàn.</div>
                                )}
                            </div>
                        </div>

                        {/* Danh sách vị trí trống */}
                        <div className="ov-panel">
                            <div className="ov-panel-hd">
                                <div>
                                    <div className="ov-panel-title">Danh sách vị trí trống</div>
                                </div>
                                <div className="ov-search">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        placeholder="Tìm mã vị trí"
                                        value={locationSearch}
                                        onChange={(e) => setLocationSearch(e.target.value)}
                                        style={{ borderRadius: '20px', border: '1px solid #d1d5db', padding: '6px 12px 6px 30px' }}
                                    />
                                </div>
                            </div>
                            <div className="ov-table-wrap">
                                <table className="ov-table">
                                    <thead>
                                        <tr>
                                            <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Mã vị trí</th>
                                            <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Dãy</th>
                                            <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Kệ</th>
                                            <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Tầng</th>
                                            <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Đang trống</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEmptyLocations.map((row) => (
                                            <tr key={row.id}>
                                                <td style={{ fontWeight: '600', color: '#2563eb' }}>{row.code}</td>
                                                <td>{row.zone}</td>
                                                <td>{row.rack}</td>
                                                <td>{row.floor}</td>
                                                <td>{formatNumber(row.capacity)}</td>
                                            </tr>
                                        ))}
                                        {!loading && filteredEmptyLocations.length === 0 && (
                                            <tr><td colSpan={5} className="sp-status-row">Không có vị trí trống.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Nhiệm vụ kiểm kê */}
                    <div className="ov-panel">
                        <div className="ov-panel-hd">
                            <div>
                                <div className="ov-panel-title">Nhiệm vụ kiểm kê</div>
                            </div>
                        </div>
                        <div className="ov-table-wrap">
                            <table className="ov-table">
                                <thead>
                                    <tr>
                                        <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Số phiếu</th>
                                        <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Mã vị trí</th>
                                        <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Người giao</th>
                                        <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Trạng thái</th>
                                        <th style={{ background: '#d8ede0', color: '#1e3a27', textAlign: 'center' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="sp-status-row">Đang tải danh sách nhiệm vụ...</td>
                                        </tr>
                                    ) : assignedAudits.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="sp-status-row">Không có nhiệm vụ kiểm kê nào.</td>
                                        </tr>
                                    ) : (
                                        assignedAudits.map((audit) => {
                                            const locs = Array.from(new Set((audit.details || []).map(d => d.locationcode || d.locationname || "—"))).join(", ") || "—";
                                            return (
                                                <tr key={audit.id}>
                                                    <td style={{ fontWeight: '600', color: '#2563eb' }}>{audit.docno}</td>
                                                    <td>{locs}</td>
                                                    <td>{audit.createdByFullname || audit.createdByName || "Quản lý"}</td>
                                                    <td>
                                                        <span className="ov-badge" style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                            Chờ kiểm kê
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="ov-alert-action"
                                                            onClick={() => navigate(`/audits/requests?id=${audit.id}`)}
                                                        >
                                                            Kiểm kê
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MANAGER/ADMIN REDESIGNED VIEW ---
    const managerSummaryCards = [
        {
            id: 1,
            label: "Tổng số mặt hàng",
            value: items.length > 0 ? formatNumber(items.length) : "35",
            trend: "+2% so với tháng trước",
            isUp: true,
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
            ),
            iconTone: "blue"
        },
        {
            id: 2,
            label: "Tổng giá trị tồn kho",
            value: inventoryValue > 0 ? formatNumber(inventoryValue) : "1.250.000.000",
            trend: "+5% so với tháng trước",
            isUp: true,
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            ),
            iconTone: "green"
        },
        {
            id: 3,
            label: "Tổng đơn nhập kho",
            value: receipts.length > 0 ? formatNumber(receipts.length) : "1.284",
            trend: "4% so với tháng trước",
            isUp: false,
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            ),
            iconTone: "amber"
        },
        {
            id: 4,
            label: "Tổng đơn xuất kho",
            value: issues.length > 0 ? formatNumber(issues.length) : "976",
            trend: "2% so với tháng trước",
            isUp: false,
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#10b981" />
                </svg>
            ),
            iconTone: "green"
        }
    ];

    // Dữ liệu thực được tính toán động dựa trên receipts & issues
    const doubleBarChartData = useMemo(() => {
        const targetMonth = Number(selectedMonthImportExport);
        const targetYear = 2026;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();

        const weeks = [
            { label: "01-07", import: 0, export: 0 },
            { label: "08-14", import: 0, export: 0 },
            { label: "15-21", import: 0, export: 0 },
            { label: "22-28", import: 0, export: 0 },
        ];

        if (lastDay > 28) {
            weeks.push({
                label: `29-${String(lastDay).padStart(2, "0")}`,
                import: 0,
                export: 0
            });
        }

        const getWeekIndex = (dateStr) => {
            const d = new Date(dateStr);
            if (isNaN(d)) return -1;
            const day = d.getDate();
            if (day <= 7) return 0;
            if (day <= 14) return 1;
            if (day <= 21) return 2;
            if (day <= 28) return 3;
            return lastDay > 28 ? 4 : -1;
        };

        receipts.forEach((r) => {
            const d = new Date(r.docDate || r.createdAt);
            if (isNaN(d) || d.getFullYear() !== 2026 || (d.getMonth() + 1) !== targetMonth) return;
            const wIdx = getWeekIndex(r.docDate || r.createdAt);
            if (wIdx !== -1) {
                const qty = (r.details || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                weeks[wIdx].import += qty;
            }
        });

        issues.forEach((i) => {
            const d = new Date(i.docDate || i.createdAt);
            if (isNaN(d) || d.getFullYear() !== 2026 || (d.getMonth() + 1) !== targetMonth) return;
            const wIdx = getWeekIndex(i.docDate || i.createdAt);
            if (wIdx !== -1) {
                const qty = (i.details || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                weeks[wIdx].export += qty;
            }
        });

        return weeks;
    }, [receipts, issues, selectedMonthImportExport]);

    const maxBarValue = useMemo(() => {
        let maxVal = 0;
        doubleBarChartData.forEach(w => {
            if (w.import > maxVal) maxVal = w.import;
            if (w.export > maxVal) maxVal = w.export;
        });
        return maxVal > 0 ? maxVal : 100; // Tránh chia cho 0
    }, [doubleBarChartData]);

    const yLabels = useMemo(() => {
        const step = maxBarValue / 4;
        return [
            maxBarValue,
            maxBarValue - step,
            maxBarValue - 2 * step,
            maxBarValue - 3 * step,
            0
        ];
    }, [maxBarValue]);

    const areaChartData = useMemo(() => {
        const seedMonth = currentMonth;
        const seedYear = 2026;
        const periods = [];

        // Giá trị và số lượng tồn kho hiện tại
        const currentVal = batches.reduce((sum, b) => {
            const qty = Number(b.quantityRemaining ?? b.quantity ?? 0);
            const cost = Number(b.unitCost ?? 0);
            return sum + (Number.isFinite(qty) && Number.isFinite(cost) ? qty * cost : 0);
        }, 0);

        const currentQty = batches.reduce((sum, b) => {
            const qty = Number(b.quantityRemaining ?? b.quantity ?? 0);
            return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0);

        for (let m = 1; m <= 12; m++) {
            const lastDay = new Date(seedYear, m, 0).getDate();
            const targetDate = new Date(seedYear, m - 1, lastDay, 23, 59, 59);
            const label = `${String(m).padStart(2, "0")}/${seedYear}`;

            let adjustmentValue = 0;
            let adjustmentQty = 0;

            receipts.forEach((r) => {
                if (r.docstatus !== "CONFIRMED") return;
                const rDate = new Date(r.docDate || r.createdAt);
                if (rDate > targetDate) {
                    const val = (r.details || []).reduce((s, item) => s + Number(item.quantity || 0) * Number(item.unitprice || 0), 0);
                    const qty = (r.details || []).reduce((s, item) => s + Number(item.quantity || 0), 0);
                    adjustmentValue -= val;
                    adjustmentQty -= qty;
                }
            });

            issues.forEach((is) => {
                if (is.docstatus !== "CONFIRMED") return;
                const isDate = new Date(is.docDate || is.createdAt);
                if (isDate > targetDate) {
                    const val = (is.details || []).reduce((s, item) => s + Number(item.quantity || 0) * Number(item.unitprice || 0), 0);
                    const qty = (is.details || []).reduce((s, item) => s + Number(item.quantity || 0), 0);
                    adjustmentValue += val;
                    adjustmentQty += qty;
                }
            });

            const historicalVal = Math.max(0, currentVal + adjustmentValue);
            const historicalQty = Math.max(0, currentQty + adjustmentQty);
            periods.push({ label, value: historicalVal, qty: historicalQty });
        }
        return periods;
    }, [batches, receipts, issues, currentMonth]);

    const maxAreaValue = useMemo(() => {
        const maxVal = Math.max(...areaChartData.map(p => p.value));
        return maxVal > 0 ? maxVal : 1000000;
    }, [areaChartData]);

    const areaYLabels = useMemo(() => {
        const step = maxAreaValue / 3;
        return [
            maxAreaValue,
            maxAreaValue - step,
            maxAreaValue - 2 * step,
            0
        ];
    }, [maxAreaValue]);

    // Dữ liệu thực Top 5 tồn nhiều nhất tại mốc kết thúc tháng chọn lọc
    const top5ItemsData = useMemo(() => {
        const targetMonth = Number(selectedMonthTop5);
        const targetYear = 2026;
        const targetDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        const itemStockMap = new Map();
        items.forEach((it) => {
            itemStockMap.set(String(it.id), 0);
        });
        batches.forEach((b) => {
            const qty = Number(b.quantityRemaining ?? b.quantity ?? 0);
            const key = String(b.itemId);
            itemStockMap.set(key, (itemStockMap.get(key) || 0) + (Number.isFinite(qty) ? qty : 0));
        });

        receipts.forEach((r) => {
            if (r.docstatus !== "CONFIRMED") return;
            const rDate = new Date(r.docDate || r.createdAt);
            if (rDate > targetDate) {
                (r.details || []).forEach((detail) => {
                    const key = String(detail.itemId);
                    if (itemStockMap.has(key)) {
                        itemStockMap.set(key, Math.max(0, itemStockMap.get(key) - Number(detail.quantity || 0)));
                    }
                });
            }
        });

        issues.forEach((is) => {
            if (is.docstatus !== "CONFIRMED") return;
            const isDate = new Date(is.docDate || is.createdAt);
            if (isDate > targetDate) {
                (is.details || []).forEach((detail) => {
                    const key = String(detail.itemId);
                    if (itemStockMap.has(key)) {
                        itemStockMap.set(key, itemStockMap.get(key) + Number(detail.quantity || 0));
                    }
                });
            }
        });

        const list = items.map((it) => {
            const qty = itemStockMap.get(String(it.id)) || 0;
            return {
                name: it.itemname || it.itemcode || "--",
                value: qty
            };
        });

        list.sort((a, b) => b.value - a.value);
        return list.slice(0, 5);
    }, [items, batches, receipts, issues, selectedMonthTop5]);

    return (
        <div className="sp-main">
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">
                        Tổng quan &rsaquo; <span className="sp-breadcrumb-active">Kho</span>
                    </div>
                </div>
                <TopbarRight />
            </div>

            <div className="sp-content">
                {error && <div className="sp-status-row sp-status-error" style={{ marginBottom: 12 }}>{error}</div>}

                {/* Grid 4 Thẻ Thống Kê */}
                <div className="ov-summary-grid">
                    {managerSummaryCards.map((card) => (
                        <div key={card.id} className="ov-summary-card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div className={`ov-card-icon ov-${card.iconTone}`} style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
                                {card.icon}
                            </div>
                            <div>
                                <div className="ov-card-label" style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>{card.label}</div>
                                <div className="ov-card-value" style={{ fontSize: '1.4rem', fontWeight: '700', margin: '2px 0' }}>
                                    {loading ? "..." : card.value}
                                </div>
                                <div className={`ov-card-trend ${card.isUp ? 'ov-trend-up' : 'ov-trend-down'}`}>
                                    {card.isUp ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="18 15 12 9 6 15" />
                                        </svg>
                                    ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    )}
                                    <span>{card.trend}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bảng Danh Sách Phiếu Chờ Duyệt */}
                <div className="ov-panel">
                    <div className="ov-panel-hd">
                        <div>
                            <div className="ov-panel-title">Danh sách phiếu chờ duyệt</div>
                        </div>
                        <div className="ov-chart-filter-wrap">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            <select
                                className="ov-chart-filter-select"
                                value={filterDocType}
                                onChange={(e) => setFilterDocType(e.target.value)}
                            >
                                <option value="ALL">Tất cả loại phiếu</option>
                                <option value="PN">Phiếu nhập kho (PN)</option>
                                <option value="PX">Phiếu xuất kho (PX)</option>
                            </select>
                        </div>
                    </div>
                    <div className="ov-table-wrap">
                        <table className="ov-table">
                            <thead>
                                <tr>
                                    <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Số phiếu</th>
                                    <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Người lập</th>
                                    <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Diễn giải</th>
                                    <th style={{ background: '#d8ede0', color: '#1e3a27' }}>Thời gian tạo</th>
                                    <th style={{ background: '#d8ede0', color: '#1e3a27', textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="sp-status-row">Đang tải danh sách chờ duyệt...</td>
                                    </tr>
                                ) : filteredPendingList.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="sp-status-row">Không có phiếu nào đang chờ duyệt.</td>
                                    </tr>
                                ) : (
                                    filteredPendingList.map((doc) => (
                                        <tr key={`${doc.type}-${doc.id}`}>
                                            <td style={{ fontWeight: '600', color: '#2563eb' }}>{doc.docno}</td>
                                            <td>{doc.creator}</td>
                                            <td>{doc.description}</td>
                                            <td>{formatDate(doc.date)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="ov-btn-approve"
                                                    onClick={(e) => handleApprove(e, doc)}
                                                    disabled={approvingId === doc.id}
                                                >
                                                    {approvingId === doc.id ? "..." : "Duyệt"}
                                                </button>
                                                <button
                                                    className="ov-btn-view"
                                                    onClick={() => handleViewDetail(doc)}
                                                >
                                                    Xem
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Lưới 3 Biểu Đồ */}
                <div className="ov-charts-grid">
                    {/* Biểu đồ cột kép: Số lượng sản phẩm nhập/xuất */}
                    <div className="ov-panel">
                        <div className="ov-chart-header">
                            <span className="ov-chart-title">Số lượng sản phẩm nhập/xuất</span>
                            <div className="ov-chart-filter-wrap">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                <select
                                    className="ov-chart-filter-select"
                                    value={selectedMonthImportExport}
                                    onChange={(e) => setSelectedMonthImportExport(e.target.value)}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={String(i + 1)}>Tháng {i + 1}/2026</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="svg-chart-container" style={{ position: 'relative' }}>
                            {/* Bật lại preserveAspectRatio="none" để co giãn full-width và điều chỉnh to rõ hơn */}
                            <svg width="100%" height="100%" viewBox="0 0 500 240" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                                {/* Grid lines */}
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <line key={i} x1="45" y1={30 + i * 35} x2="480" y2={30 + i * 35} className="chart-grid-line" vectorEffect="non-scaling-stroke" />
                                ))}
                                {/* Y-axis Labels */}
                                {yLabels.map((val, i) => (
                                    <text key={i} x="35" y={34 + i * 35} textAnchor="end" className="chart-label-text">
                                        {val === 0 ? "0" : val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : formatNumber(Math.round(val))}
                                    </text>
                                ))}
                                {/* Double Bars */}
                                {doubleBarChartData.map((data, idx) => {
                                    const xBase = 65 + idx * 85; // Giãn khoảng cách cột rộng đều ra biên
                                    const maxVal = maxBarValue;
                                    const graphHeight = 140;
                                    const yZero = 170;

                                    const yImport = yZero - (data.import / maxVal) * graphHeight;
                                    const yExport = yZero - (data.export / maxVal) * graphHeight;
                                    const heightImport = (data.import / maxVal) * graphHeight;
                                    const heightExport = (data.export / maxVal) * graphHeight;

                                    return (
                                        <g key={idx}>
                                            {/* Nhập kho (tím lam) */}
                                            <rect
                                                x={xBase}
                                                y={yImport}
                                                width="20" // Làm to cột nhập kho
                                                height={Math.max(3, heightImport)}
                                                fill="#818cf8"
                                                rx="3"
                                                className="chart-bar-rect"
                                                style={{ cursor: 'pointer' }}
                                                onMouseEnter={() => setHoveredBarGroup({
                                                    x: xBase + 10,
                                                    y: yImport,
                                                    label: data.label,
                                                    type: "IMPORT",
                                                    value: data.import
                                                })}
                                                onMouseLeave={() => setHoveredBarGroup(null)}
                                            />
                                            {/* Xuất kho (cam hồng) */}
                                            <rect
                                                x={xBase + 24}
                                                y={yExport}
                                                width="20" // Làm to cột xuất kho
                                                height={Math.max(3, heightExport)}
                                                fill="#fca5a5"
                                                rx="3"
                                                className="chart-bar-rect"
                                                style={{ cursor: 'pointer' }}
                                                onMouseEnter={() => setHoveredBarGroup({
                                                    x: xBase + 34,
                                                    y: yExport,
                                                    label: data.label,
                                                    type: "EXPORT",
                                                    value: data.export
                                                })}
                                                onMouseLeave={() => setHoveredBarGroup(null)}
                                            />
                                            {/* X-axis Labels */}
                                            <text x={xBase + 22} y="198" textAnchor="middle" className="chart-label-text" style={{ fontWeight: '600', fontSize: '11px' }}>
                                                {data.label}
                                            </text>
                                        </g>
                                    );
                                })}
                                <line x1="45" y1="170" x2="480" y2="170" className="chart-axis-line" vectorEffect="non-scaling-stroke" />
                            </svg>
                            {hoveredBarGroup && (
                                <div className="ov-chart-tooltip" style={{
                                    position: 'absolute',
                                    left: `${(hoveredBarGroup.x / 500) * 100}%`,
                                    top: `${(hoveredBarGroup.y / 240) * 100}%`,
                                    transform: 'translate(-50%, -115%)',
                                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                                    color: '#fff',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    pointerEvents: 'none',
                                    zIndex: 10,
                                    whiteSpace: 'nowrap',
                                    border: '1px solid #475569',
                                    textAlign: 'left'
                                }}>
                                    <div style={{ fontWeight: '700', marginBottom: '2px', color: '#cbd5e1' }}>Khoảng ngày {hoveredBarGroup.label}</div>
                                    <div>
                                        {hoveredBarGroup.type === "IMPORT" ? "Nhập kho: " : "Xuất kho: "}
                                        <span style={{
                                            color: hoveredBarGroup.type === "IMPORT" ? '#818cf8' : '#fca5a5',
                                            fontWeight: '700'
                                        }}>
                                            {formatNumber(hoveredBarGroup.value)} cái
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="svg-chart-legend" style={{ marginTop: '22px' }}>
                            <div className="svg-legend-item">
                                <div className="svg-legend-color" style={{ background: '#818cf8' }} />
                                <span>Nhập kho</span>
                            </div>
                            <div className="svg-legend-item">
                                <div className="svg-legend-color" style={{ background: '#fca5a5' }} />
                                <span>Xuất kho</span>
                            </div>
                        </div>
                    </div>

                    {/* Biểu đồ miền: Biểu đồ giá trị tồn kho theo kỳ */}
                    <div className="ov-panel">
                        <div className="ov-chart-header">
                            <span className="ov-chart-title">Biểu đồ giá trị tồn kho theo kỳ</span>
                        </div>
                        <div className="svg-chart-container" style={{ position: 'relative' }}>
                            {/* Bật lại preserveAspectRatio="none" để trải đều theo tỉ lệ panel */}
                            <svg width="100%" height="100%" viewBox="0 0 380 240" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                {/* Grid lines */}
                                {[0, 1, 2, 3].map((i) => (
                                    <line key={i} x1="45" y1={40 + i * 51} x2="350" y2={40 + i * 51} className="chart-grid-line" vectorEffect="non-scaling-stroke" />
                                ))}
                                {/* Y-axis Labels */}
                                {areaYLabels.map((val, i) => (
                                    <text key={i} x="35" y={44 + i * 51} textAnchor="end" className="chart-label-text">
                                        {val === 0 ? "0" : val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : formatNumber(Math.round(val))}
                                    </text>
                                ))}

                                {/* Area Path & Line Path */}
                                {(() => {
                                    const points = areaChartData.map((d, idx) => {
                                        const x = 55 + idx * 26.5; // Trải đều 12 điểm dữ liệu
                                        const y = 193 - (d.value / maxAreaValue) * 153;
                                        return { x, y };
                                    });

                                    if (points.length === 0) return null;

                                    // Build Bezier Curve path
                                    let pathD = `M ${points[0].x} ${points[0].y}`;
                                    for (let i = 0; i < points.length - 1; i++) {
                                        const cpX1 = points[i].x + 11;
                                        const cpY1 = points[i].y;
                                        const cpX2 = points[i + 1].x - 11;
                                        const cpY2 = points[i + 1].y;
                                        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i + 1].x} ${points[i + 1].y}`;
                                    }

                                    const fillD = `${pathD} L ${points[points.length - 1].x} 193 L ${points[0].x} 193 Z`;

                                    return (
                                        <g>
                                            <path d={fillD} fill="url(#areaGrad)" />
                                            <path d={pathD} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                            {points.map((p, i) => {
                                                const isCurrent = (i === currentMonth - 1);
                                                return (
                                                    <g key={i}>
                                                        {isCurrent && (
                                                            <line x1={p.x} y1="40" x2={p.x} y2="193" stroke="#ef4444" strokeDasharray="3,3" strokeWidth="1.5" opacity="0.75" vectorEffect="non-scaling-stroke" />
                                                        )}
                                                        <circle
                                                            cx={p.x}
                                                            cy={p.y}
                                                            r={isCurrent ? "7" : "5"}
                                                            fill={isCurrent ? "#ef4444" : "#818cf8"}
                                                            stroke="#fff"
                                                            strokeWidth={isCurrent ? "3" : "2"}
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseEnter={() => setHoveredAreaPoint({
                                                                x: p.x,
                                                                y: p.y,
                                                                label: areaChartData[i].label,
                                                                value: areaChartData[i].value,
                                                                qty: areaChartData[i].qty
                                                            })}
                                                            onMouseLeave={() => setHoveredAreaPoint(null)}
                                                        />
                                                        <text
                                                            x={p.x}
                                                            y="215"
                                                            textAnchor="middle"
                                                            className="chart-label-text"
                                                            style={{
                                                                fontSize: isCurrent ? '11px' : '9px',
                                                                fontWeight: isCurrent ? '800' : '600',
                                                                fill: isCurrent ? '#ef4444' : undefined
                                                            }}
                                                        >
                                                            {areaChartData[i].label.split('/')[0]}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    );
                                })()}
                                <line x1="45" y1="193" x2="350" y2="193" className="chart-axis-line" vectorEffect="non-scaling-stroke" />
                            </svg>
                            {hoveredAreaPoint && (
                                <div className="ov-chart-tooltip" style={{
                                    position: 'absolute',
                                    left: `${(hoveredAreaPoint.x / 380) * 100}%`,
                                    top: `${(hoveredAreaPoint.y / 240) * 100}%`,
                                    transform: 'translate(-50%, -115%)',
                                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                                    color: '#fff',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    pointerEvents: 'none',
                                    zIndex: 10,
                                    whiteSpace: 'nowrap',
                                    border: '1px solid #475569',
                                    textAlign: 'left'
                                }}>
                                    <div style={{ fontWeight: '700', marginBottom: '4px', color: '#cbd5e1' }}>Tháng {hoveredAreaPoint.label}</div>
                                    <div style={{ marginBottom: '2px' }}>Giá trị tồn: <span style={{ color: '#818cf8', fontWeight: '700' }}>{formatNumber(hoveredAreaPoint.value)} VND</span></div>
                                    <div>Số lượng tồn: <span style={{ color: '#34d399', fontWeight: '700' }}>{formatNumber(hoveredAreaPoint.qty)} cái</span></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Biểu đồ thanh ngang: Top 5 vật tư tồn kho nhiều nhất */}
                    <div className="ov-panel ov-chart-full-width">
                        <div className="ov-chart-header">
                            <span className="ov-chart-title">Top 5 vật tư tồn kho nhiều nhất</span>
                            <div className="ov-chart-filter-wrap">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                <select
                                    className="ov-chart-filter-select"
                                    value={selectedMonthTop5}
                                    onChange={(e) => setSelectedMonthTop5(e.target.value)}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={String(i + 1)}>Tháng {i + 1}/2026</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ padding: '8px 0' }}>
                            {top5ItemsData.map((item, idx) => {
                                const maxValue = Math.max(10, ...top5ItemsData.map(o => o.value));
                                const widthPercent = (item.value / maxValue) * 100;
                                return (
                                    <div key={idx} className="horizontal-bar-row">
                                        <div className="horizontal-bar-label" title={item.name}>
                                            {item.name}
                                        </div>
                                        <div className="horizontal-bar-track">
                                            <div
                                                className="horizontal-bar-fill"
                                                style={{
                                                    width: `${widthPercent}%`,
                                                    background: '#818cf8'
                                                }}
                                            />
                                            <span className="horizontal-bar-value">
                                                {formatNumber(item.value)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
