import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./overview.css";
import { getAllItems } from "../../api/itemApi";
import { getAllBatches } from "../../api/batchApi";
import { getAllLocations, getItemsAtLocation } from "../../api/locationApi";
import TopbarRight from "../../components/TopbarRight";

const BAR_COLORS = ["#F3A33B", "#FF8A7A", "#1FBE5F", "#4B3DE3", "#B07AF8"];

function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "0";
    const num = Number(value);
    if (Number.isNaN(num)) return "0";
    return num.toLocaleString("vi-VN");
}

function SummaryIcon({ tone }) {
    return (
        <div className={`ov-card-icon ov-${tone}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
            </svg>
        </div>
    );
}

export default function OverviewPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [batches, setBatches] = useState([]);
    const [locations, setLocations] = useState([]);
    const [locationDetails, setLocationDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locationSearch, setLocationSearch] = useState("");

    useEffect(() => {
        let cancelled = false;
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [itemList, batchList, locList] = await Promise.all([
                    getAllItems(),
                    getAllBatches(),
                    getAllLocations(),
                ]);
                if (cancelled) return;
                setItems(itemList);
                setBatches(batchList);
                setLocations(locList);

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
                if (!cancelled) setLocationDetails(detailList);
            } catch (err) {
                if (!cancelled) setError("Không thể tải dữ liệu tổng quan.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadData();
        return () => { cancelled = true; };
    }, []);


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
                capacity: entry.detail?.remainingCapacity ?? entry.location.capacity ?? "Không giới hạn",
            }))
            .slice(0, 8);
    }, [locationDetails]);

    const filteredEmptyLocations = useMemo(() => {
        if (!locationSearch.trim()) return emptyLocations;
        const q = locationSearch.trim().toLowerCase();
        return emptyLocations.filter((row) => String(row.code).toLowerCase().includes(q));
    }, [emptyLocations, locationSearch]);

    const summaryCards = [
        { id: 1, label: "Sản phẩm", value: formatNumber(items.length), sub: "Tổng số tồn kho hiện tại", tone: "blue" },
        { id: 2, label: "Giá trị tồn kho", value: formatNumber(inventoryValue), unit: "VND", sub: "Giá trị tồn kho", tone: "green" },
        { id: 3, label: "Vật tư dưới mức an toàn", value: formatNumber(lowStockItems.length), sub: "Vật tư dưới mức an toàn", tone: "amber" },
        { id: 4, label: "Vật tư hết hàng", value: formatNumber(outOfStockCount), sub: "Vật tư hết hàng", tone: "red" },
    ];

    const maxBar = Math.max(1, ...topStock.map((b) => b.value));

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
                <div className="ov-summary-grid">
                    {summaryCards.map((card) => (
                        <div key={card.id} className="ov-summary-card">
                            <SummaryIcon tone={card.tone} />
                            <div>
                                <div className="ov-card-label">{card.label}</div>
                                <div className="ov-card-value">
                                    {loading ? "..." : card.value}
                                    {card.unit && <span className="ov-card-unit"> {card.unit}</span>}
                                </div>
                                <div className="ov-card-sub">{card.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="ov-grid">
                    <div className="ov-panel">
                        <div className="ov-panel-hd">
                            <div>
                                <div className="ov-panel-title">Cảnh báo tồn kho</div>
                                <div className="ov-panel-sub">Các vật tư gần chạm ngưỡng tối thiểu</div>
                            </div>
                            <span className="ov-badge">{lowStockList.length} vật tư</span>
                        </div>
                        <div className="ov-alert-list">
                            {lowStockList.map((item) => (
                                <div key={item.id} className="ov-alert-item">
                                    <div>
                                        <div className="ov-alert-name">{item.name}</div>
                                        <div className="ov-alert-meta">{formatNumber(item.qty)} cái</div>
                                        <div className="ov-alert-min">Tồn tối thiểu: {formatNumber(item.min)}</div>
                                    </div>
                                    <button className="ov-alert-action" onClick={() => handleCreateReceipt(item)}>Nhập hàng</button>
                                </div>
                            ))}
                            {!loading && lowStockList.length === 0 && (
                                <div className="sp-status-row">Không có vật tư dưới mức an toàn.</div>
                            )}
                        </div>
                    </div>

                    <div className="ov-panel">
                        <div className="ov-panel-hd">
                            <div>
                                <div className="ov-panel-title">Chi tiết tồn kho</div>
                                <div className="ov-panel-sub">Số lượng theo vị trí</div>
                            </div>
                            <div className="ov-filter-pill">Kho hàng hóa</div>
                        </div>
                        <div className="ov-table-wrap">
                            <table className="ov-table">
                                <thead>
                                    <tr>
                                        <th>Tên vật tư</th>
                                        <th>Vị trí</th>
                                        <th>Số lượng</th>
                                        <th>Tồn tối thiểu</th>
                                        <th>Tồn tối đa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryRows.map((row) => (
                                        <tr key={row.id}>
                                            <td>{row.name}</td>
                                            <td>{row.location}</td>
                                            <td>{formatNumber(row.qty)}</td>
                                            <td>{formatNumber(row.min)}</td>
                                            <td>{formatNumber(row.max)}</td>
                                        </tr>
                                    ))}
                                    {!loading && inventoryRows.length === 0 && (
                                        <tr><td colSpan={5} className="sp-status-row">Không có dữ liệu tồn kho.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="ov-panel">
                    <div className="ov-panel-hd">
                        <div>
                            <div className="ov-panel-title">Top 5 vật tư tồn nhiều nhất</div>
                            <div className="ov-panel-sub">So sánh theo tháng</div>
                        </div>
                        <select className="ov-select">
                            <option>Tháng</option>
                            <option>Tháng 1</option>
                            <option>Tháng 2</option>
                            <option>Tháng 3</option>
                        </select>
                    </div>
                    <div className="ov-chart">
                        {topStock.map((bar) => (
                            <div key={bar.id} className="ov-bar">
                                <div className="ov-bar-value" style={{ height: `${(bar.value / maxBar) * 100}%`, background: bar.color }} />
                                <div className="ov-bar-label">{bar.name}</div>
                            </div>
                        ))}
                        {!loading && topStock.length === 0 && (
                            <div className="sp-status-row" style={{ gridColumn: "1 / -1" }}>Không có dữ liệu.</div>
                        )}
                    </div>
                </div>

                <div className="ov-panel">
                    <div className="ov-panel-hd">
                        <div>
                            <div className="ov-panel-title">Cảnh báo ngưỡng an toàn</div>
                            <div className="ov-panel-sub">Vật tư cần theo dõi</div>
                        </div>
                        <span className="ov-badge">{lowStockList.length} vật tư</span>
                    </div>
                    <div className="ov-alert-list ov-alert-compact">
                        {lowStockList.map((item) => (
                            <div key={`safe-${item.id}`} className="ov-alert-item">
                                <div>
                                    <div className="ov-alert-name">{item.name}</div>
                                    <div className="ov-alert-meta">Kho hàng hóa</div>
                                </div>
                                <div className="ov-alert-right">
                                    <div className="ov-alert-meta">{formatNumber(item.qty)} cái</div>
                                    <div className="ov-alert-min">Tồn tối thiểu: {formatNumber(item.min)}</div>
                                </div>
                            </div>
                        ))}
                        {!loading && lowStockList.length === 0 && (
                            <div className="sp-status-row">Không có cảnh báo.</div>
                        )}
                    </div>
                </div>

                <div className="ov-panel">
                    <div className="ov-panel-hd">
                        <div>
                            <div className="ov-panel-title">Danh sách vị trí trống</div>
                            <div className="ov-panel-sub">Cập nhật gần nhất</div>
                        </div>
                        <div className="ov-search">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                placeholder="Tìm mã vị trí"
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="ov-table-wrap">
                        <table className="ov-table">
                            <thead>
                                <tr>
                                    <th>Mã vị trí</th>
                                    <th>Dãy</th>
                                    <th>Kệ</th>
                                    <th>Tầng</th>
                                    <th>Đang trống</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmptyLocations.map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.code}</td>
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
        </div>
    );
}
