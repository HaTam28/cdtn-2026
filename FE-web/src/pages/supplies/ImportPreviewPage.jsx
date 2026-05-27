import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./supplies.css";
import notify from "../../utils/notify";
import { importItems, getAllItems, createItem, updateItem } from "../../api/itemApi";
import * as XLSX from 'xlsx';

export default function ImportPreviewPage() {
    const loc = useLocation();
    const navigate = useNavigate();
    const { file, previewResult } = loc.state || {};
    const [loading, setLoading] = useState(false);

    if (!previewResult && !file) {
        // nothing to preview
        navigate('/supplies');
        return null;
    }

    const parsedFromState = previewResult?.parsed || [];
    const errorsFromState = previewResult?.errors || [];

    const [serverPreview, setServerPreview] = useState(null);

    const normalizeServerItem = (it) => {
        if (!it) return {};
        return {
            itemcode: (it.itemCode ?? it.itemcode ?? it.itemCode)?.toString?.() ?? (it.itemCode ?? it.itemcode ?? ''),
            itemname: it.itemName ?? it.itemname ?? '',
            itemcatg: it.itemCategory ?? it.itemCatg ?? it.itemcatg ?? it.category ?? '',
            invoicename: it.invoiceName ?? it.invoicename ?? '',
            description: it.description ?? it.desc ?? '',
            itemtype: it.itemType ?? it.itemtype ?? '',
            unitof: it.unitOf ?? it.unitof ?? '',
            minstocklevel: (it.minStockLevel ?? it.minstocklevel ?? null),
            maxstocklevel: (it.maxStockLevel ?? it.maxstocklevel ?? null),
            barcode: it.barcode ?? it.barCode ?? ''
        };
    };

    // choose server preview if available, otherwise use client-provided preview
    const parsed = serverPreview?.parsed || parsedFromState;
    const errors = serverPreview?.errors || errorsFromState;

    useEffect(() => {
        let cancelled = false;
        const fetchServerPreview = async () => {
            if (!file) return;
            setLoading(true);
            try {
                const body = await importItems(file, { preview: true });
                if (cancelled) return;
                let parsed = [];
                if (Array.isArray(body?.sample) && body.sample.length > 0) {
                    parsed = body.sample.map(normalizeServerItem);
                } else {
                    parsed = body?.parsed || body?.rows || body?.data || body?.items || [];
                    // if parsed exists but items use camelCase, normalize them
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object') {
                        parsed = parsed.map(p => ({
                            itemcode: p.itemcode ?? p.itemCode ?? p.code ?? '',
                            itemname: p.itemname ?? p.itemName ?? p.name ?? '',
                            itemcatg: p.itemcatg ?? p.itemCategory ?? p.itemCatg ?? p.category ?? '',
                            invoicename: p.invoicename ?? p.invoiceName ?? '',
                            description: p.description ?? p.desc ?? '',
                            itemtype: p.itemtype ?? p.itemType ?? '',
                            unitof: p.unitof ?? p.unitOf ?? p.donvi ?? '',
                            minstocklevel: p.minstocklevel ?? p.minStockLevel ?? null,
                            maxstocklevel: p.maxstocklevel ?? p.maxStockLevel ?? null,
                            barcode: p.barcode ?? p.barCode ?? ''
                        }));
                    }
                }
                const errors = body?.errors || [];
                setServerPreview({ parsed, errors });
            } catch (err) {
                console.error('Server preview failed', err);
                notify('Không thể lấy kết quả preview từ server, dùng kết quả client.', { type: 'warning' });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchServerPreview();

        // if server preview doesn't exist or fails, parse on client as fallback
        const parseClientFile = async () => {
            if (!file) return;
            try {
                const data = await file.arrayBuffer();
                const wb = XLSX.read(data, { type: 'array' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
                if (!rows || rows.length <= 1) {
                    notify('Không tìm thấy dữ liệu trong file', { type: 'error' });
                    return;
                }
                const rawHeaders = rows[0].map(h => String(h || '').trim());
                const dataRows = rows.slice(1);

                const normalizeHeader = (s) => String(s || '')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toLowerCase();

                const headerToKey = (h) => {
                    const nk = normalizeHeader(h);
                    if (nk.includes('itemcode') || nk === 'ma' || nk.includes('mavat') || nk.includes('mah')) return 'itemcode';
                    if (nk.includes('barcode') || nk.includes('mavach')) return 'barcode';
                    if (nk.includes('itemname') || nk.includes('ten') || nk.includes('tenvat')) return 'itemname';
                    if (nk.includes('invoicename') || nk.includes('tentrnhoa') || nk.includes('tenhoa')) return 'invoicename';
                    if (nk.includes('description') || nk.includes('mota') || nk.includes('thongs')) return 'description';
                    if (nk.includes('itemtype') || nk.includes('loai')) return 'itemtype';
                    if (nk.includes('unitof') || nk.includes('donvi') || nk.includes('dvt')) return 'unitof';
                    if (nk.includes('itemcatg') || nk.includes('danhmuc') || nk.includes('category')) return 'itemcatg';
                    if (nk.includes('minstock') || nk.includes('tontoithieu') || nk.includes('tontoi')) return 'minstocklevel';
                    if (nk.includes('maxstock') || nk.includes('tontoida') || nk.includes('tontoimax')) return 'maxstocklevel';
                    return nk || h;
                };

                const parsed = dataRows.map((r) => {
                    const obj = {};
                    for (let i = 0; i < rawHeaders.length; i++) {
                        const raw = rawHeaders[i] || `col${i}`;
                        const key = headerToKey(raw);
                        obj[key] = r[i] ?? '';
                    }
                    return obj;
                });

                const errors = [];
                parsed.forEach((r, idx) => {
                    if (!String(r.itemcode || '').trim()) errors.push({ rowIndex: idx + 1, message: 'Missing required itemCode' });
                });

                // Only set client preview if server preview didn't provide data
                setServerPreview((prev) => prev ?? { parsed, errors });
            } catch (err) {
                console.error('Client parse error', err);
                notify('Lỗi đọc file client-side.', { type: 'error' });
            }
        };

        parseClientFile();
        return () => { cancelled = true; };
    }, [file]);

    // columns in the exact order and Vietnamese titles used in the Excel template
    // Note: `invoicename` column hidden because data mapping is inconsistent
    const columns = [
        { key: 'itemcode', label: 'Mã vật tư' },
        { key: 'itemname', label: 'Tên vật tư hàng hóa' },
        { key: 'itemtype', label: 'Loại vật tư' },
        { key: 'itemcatg', label: 'Ngành hàng' },
        { key: 'description', label: 'Mô tả/ Thông số kỹ thuật' },
        { key: 'unitof', label: 'Đơn vị tính' },
        { key: 'minstocklevel', label: 'Tồn tối thiểu' },
        { key: 'maxstocklevel', label: 'Tồn tối đa' },
    ];

    const displayValue = (row, key) => {
        const v = row[key];
        if (v === undefined || v === null) return '';
        return String(v);
    };

    const mapRowToPayload = (row) => {
        const payload = {};
        payload.itemcode = (row.itemcode || row.ma || row.code || '').toString();
        payload.barcode = row.barcode || '';
        // Keep item name and invoice name from their explicit columns only
        payload.itemname = row.itemname || '';
        payload.invoicename = row.invoicename || '';
        payload.itemcatg = row.itemcatg || row.itemCategory || row.itemCatg || row.category || '';
        payload.description = row.description || '';
        payload.itemtype = row.itemtype || '';
        payload.unitof = row.unitof || '';
        if (row.minstocklevel !== undefined && row.minstocklevel !== '') payload.minstocklevel = Number(row.minstocklevel);
        if (row.maxstocklevel !== undefined && row.maxstocklevel !== '') payload.maxstocklevel = Number(row.maxstocklevel);
        payload.isActive = true;
        return payload;
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            // try server-side import first
            if (file) {
                const body = await importItems(file, { preview: false });
                const imported = body?.imported ?? body?.importedCount ?? 0;
                const updated = body?.updated ?? 0;
                const serverErrors = body?.errors || [];
                if ((imported + updated) > 0) {
                    if ((serverErrors?.length || 0) > 0) {
                        notify(`Import completed with ${serverErrors.length} errors`, { type: 'warning' });
                    } else {
                        notify(`Import thành công: ${imported} thêm, ${updated} cập nhật`, { type: 'success' });
                    }
                    navigate('/supplies');
                    return;
                }
                // if server did not persist, fall through to client upsert
            }

            // fallback: upsert on client (one request per row)
            const existing = await getAllItems();
            const existingByCode = (existing || []).reduce((acc, it) => { acc[it.itemcode] = it; return acc; }, {});
            let added = 0;
            let updated = 0;
            const sourceRows = serverPreview?.parsed || parsedFromState;
            for (const row of sourceRows) {
                const payload = mapRowToPayload(row);
                if (!payload.itemcode) continue;
                const exist = existingByCode[payload.itemcode];
                if (exist) {
                    await updateItem(exist.id, payload);
                    updated++;
                } else {
                    await createItem(payload);
                    added++;
                }
            }
            notify(`Import thành công: ${added} thêm, ${updated} cập nhật`, { type: 'success' });
            navigate('/supplies');
        } catch (err) {
            console.error(err);
            notify('Lỗi khi import. Kiểm tra console.', { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sp-main">
            <div className="sp-topbar">
                <div>
                    <div className="sp-breadcrumb">Import &rsaquo; <span className="sp-breadcrumb-active">Xem trước dữ liệu</span></div>
                </div>
            </div>

            <div className="sp-content">
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            className="sp-btn-outline"
                            onClick={() => navigate('/supplies')}
                            title="Quay lại"
                            aria-label="Quay lại"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <h1 className="sp-title" style={{ margin: 0 }}>Xem trước dữ liệu import</h1>
                    </div>

                    <div>
                        <button className="sp-btn-primary" onClick={handleConfirm} disabled={loading}>
                            Xác nhận import
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: '#f0f9f4', border: '1px solid #d1f3dd', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, background: '#0b8a46', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                {parsed.length}
                            </div>
                            <div style={{ color: '#1b3a2a' }}>
                                <div style={{ fontSize: 12, opacity: 0.9 }}>Tổng hàng</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{parsed.length} mục</div>
                            </div>
                        </div>

                        <div style={{ background: errors.length ? '#fff5f5' : '#f7fff8', border: '1px solid', borderColor: errors.length ? '#f5c2c7' : '#d6f6dd', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, background: errors.length ? '#d32f2f' : '#2e7d32', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                {errors.length}
                            </div>
                            <div style={{ color: errors.length ? '#7a1a1a' : '#143d1f' }}>
                                <div style={{ fontSize: 12, opacity: 0.9 }}>Lỗi</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{errors.length} mục</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginLeft: 'auto', color: '#666', fontSize: 13 }}>
                        Nguồn: {serverPreview ? 'Server' : 'Client'}
                    </div>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #ddd', background: '#fff' }}>
                    <table className="sp-table" style={{ minWidth: 900 }}>
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>#</th>
                                {columns.map((c) => (
                                    <th key={c.key}>{c.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {parsed.map((row, idx) => (
                                <tr key={idx}>
                                    <td className="center">{idx + 1}</td>
                                    {columns.map((c) => (
                                        <td key={c.key}>{displayValue(row, c.key)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {errors.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <h3>Lỗi</h3>
                        <ul>
                            {errors.map((e, i) => <li key={i}>Dòng {e.rowIndex ?? '(?)'}: {e.message}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
