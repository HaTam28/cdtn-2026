// src/api/batchApi.js
import axiosInstance from './axiosInstance';

const API_URL = '/api/batches';

// Lấy danh sách lô hàng
export const getAllBatches = async () => {
    const res = await axiosInstance.get(API_URL);
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
