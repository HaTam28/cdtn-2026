// src/api/batchApi.js
import axiosInstance from './axiosInstance';

const API_URL = '/api/batches';

// Lấy danh sách lô hàng
export const getAllBatches = async (params = {}) => {
    // params: optional query params (e.g., pagination, filters)
    const res = await axiosInstance.get(API_URL, { params });
    return res.data.data || [];
};

// Lấy chi tiết lô hàng theo id
export const getBatchById = async (id) => {
    const res = await axiosInstance.get(`${API_URL}/${id}`);
    return res.data.data;
};

// Tạo mới lô hàng
// body: { itemId*, receiptDetailId*, manufactureDate, expiryDate, unitCost*, quantity* }
// batchCode do BE tự sinh, FE không gửi
export const createBatch = async (body) => {
    const res = await axiosInstance.post(API_URL, body);
    return res.data.data;
};

// Lấy danh sách lô theo vị trí: /api/batches/by-location?locationId={id}
export const getBatchesByLocation = async (locationId) => {
    const res = await axiosInstance.get(`${API_URL}/by-location`, { params: { locationId } });
    return res.data.data || [];
};
