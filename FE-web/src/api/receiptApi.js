// src/api/receiptApi.js
import axiosInstance from './axiosInstance';

const BASE = '/api/goods-receipts';

/** GET /api/goods-receipts — Danh sách phiếu nhập */
export const getAllReceipts = async () => {
    const res = await axiosInstance.get(BASE);
    return res.data.data || [];
};

/** GET /api/goods-receipts/{id} — Chi tiết phiếu nhập */
export const getReceiptById = async (id) => {
    const res = await axiosInstance.get(`${BASE}/${id}`);
    return res.data.data;
};

/** GET /api/goods-receipts/available-locations?itemId=X
 *  Liệt kê TẤT CẢ vị trí còn chỗ trống (EXISTING → EMPTY → PARTIAL)
 *  Response: LocationDetailResponse (có remainingCapacity, usedCapacity, items[])
 */
export const getAvailableLocations = async (itemId) => {
    const res = await axiosInstance.get(
        `${BASE}/available-locations?itemId=${itemId}`
    );
    return res.data.data || [];
};

/**
 * POST /api/goods-receipts — Tạo phiếu nhập (DRAFT)
 * body: { docno, docDate, description, customerId, details: [{itemId, locationId, quantity, unitprice}] }
 */
export const createReceipt = async (body) => {
    const res = await axiosInstance.post(BASE, body);
    return res.data;
};

/**
 * PUT /api/goods-receipts/{id} — Cập nhật phiếu nhập (chỉ DRAFT)
 */
export const updateReceipt = async (id, body) => {
    const res = await axiosInstance.put(`${BASE}/${id}`, body);
    return res.data;
};

/** POST /api/goods-receipts/{id}/confirm — Xác nhận phiếu nhập */
export const confirmReceipt = async (id) => {
    const res = await axiosInstance.post(`${BASE}/${id}/confirm`);
    return res.data;
};

/** POST /api/goods-receipts/{id}/cancel — Hủy phiếu nhập */
export const cancelReceipt = async (id) => {
    const res = await axiosInstance.post(`${BASE}/${id}/cancel`);
    return res.data;
};

/** GET /api/goods-receipts/suggest-split?itemId=X&quantity=Y
 *  BE tự động chia số lượng qua nhiều vị trí (ưu tiên EXISTING → EMPTY)
 *  Mỗi phần tử trả về có thêm trường `suggestedQuantity`
 */
export const suggestSplitReceipt = async (itemId, quantity) => {
    const res = await axiosInstance.get(
        `${BASE}/suggest-split?itemId=${itemId}&quantity=${quantity}`
    );
    return res.data;
};
