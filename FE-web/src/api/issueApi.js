// src/api/issueApi.js
import axiosInstance from './axiosInstance';

const BASE = '/api/goods-issues';

/** GET /api/goods-issues — Danh sách phiếu xuất */
export const getAllIssues = async () => {
    const res = await axiosInstance.get(BASE);
    return res.data.data || [];
};

/** GET /api/goods-issues/{id} — Chi tiết phiếu xuất */
export const getIssueById = async (id) => {
    const res = await axiosInstance.get(`${BASE}/${id}`);
    return res.data.data;
};

/** GET /api/goods-issues/available-locations?itemId=X
 *  Liệt kê TẤT CẢ vị trí đang chứa itemId, sắp xếp tồn kho giảm dần
 *  Response: LocationDetailResponse (có items[] với quantity của từng mã hàng)
 */
export const getAvailableLocations = async (itemId) => {
    const res = await axiosInstance.get(
        `${BASE}/available-locations?itemId=${itemId}`
    );
    return res.data.data || [];
};

/**
 * POST /api/goods-issues — Tạo phiếu xuất (DRAFT)
 * body: { docno, docDate, description, customerId, details: [{itemId, locationId, quantity, unitprice}] }
 */
export const createIssue = async (body) => {
    const res = await axiosInstance.post(BASE, body);
    return res.data;
};

/**
 * PUT /api/goods-issues/{id} — Cập nhật phiếu xuất (chỉ DRAFT)
 */
export const updateIssue = async (id, body) => {
    const res = await axiosInstance.put(`${BASE}/${id}`, body);
    return res.data;
};

/** POST /api/goods-issues/{id}/confirm — Xác nhận phiếu xuất */
export const confirmIssue = async (id) => {
    const res = await axiosInstance.post(`${BASE}/${id}/confirm`);
    return res.data;
};

/** POST /api/goods-issues/{id}/cancel — Hủy phiếu xuất */
export const cancelIssue = async (id) => {
    const res = await axiosInstance.post(`${BASE}/${id}/cancel`);
    return res.data;
};

/** GET /api/goods-issues/suggest-split?itemId=X&quantity=Y
 *  BE tự động chia số lượng xuất qua nhiều vị trí (ưu tiên vị trí tồn kho nhiều nhất)
 *  Mỗi phần tử trả về có thêm trường `suggestedQuantity`
 */
export const suggestSplitIssue = async (itemId, quantity) => {
    const res = await axiosInstance.get(
        `${BASE}/suggest-split?itemId=${itemId}&quantity=${quantity}`
    );
    return res.data;
};
