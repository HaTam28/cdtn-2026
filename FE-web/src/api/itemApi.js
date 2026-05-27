// src/api/itemApi.js
import axiosInstance from './axiosInstance';

const API_URL = '/api/items';

// Lấy danh sách hàng hóa, hỗ trợ phân trang
export const getAllItems = async (page, size) => {
    let url = API_URL;
    if (page !== undefined && size !== undefined) url += `?page=${page}&size=${size}`;
    const res = await axiosInstance.get(url);
    return res.data.data || [];
};

// Lấy chi tiết hàng hóa theo id
export const getItemById = async (id) => {
    const res = await axiosInstance.get(`${API_URL}/${id}`);
    return res.data.data;
};

// Tạo mới hàng hóa
// body: { itemcode, barcode, itemname, invoicename, description, itemtype, unitof, itemcatg, minstocklevel, modifiedBy }
export const createItem = async (body) => {
    const res = await axiosInstance.post(API_URL, body);
    return res.data.data;
};

// Cập nhật hàng hóa
// body: { itemcode*, itemname*, barcode, invoicename, description, itemtype, unitof, itemcatg, minstocklevel, modifiedBy* }
export const updateItem = async (id, body) => {
    const res = await axiosInstance.put(`${API_URL}/${id}`, body);
    return res.data.data;
};

// Import items from a file (Excel/CSV) - expects backend endpoint POST /api/items/import
// Import items from a file (XLSX/CSV).
// Chooses endpoint by file extension and supports preview flag.
export const importItems = async (file, { preview = false } = {}) => {
    if (!file) throw new Error('No file provided');
    const name = (file.name || '').toLowerCase();
    const isCsv = name.endsWith('.csv');
    const endpoint = isCsv ? '/api/import/items/csv' : '/api/import/items/xlsx';
    const url = `${endpoint}${preview ? '?preview=true' : ''}`;

    const form = new FormData();
    form.append('file', file);
    // Do not set Content-Type header explicitly; let the browser set multipart boundary
    const res = await axiosInstance.post(url, form);
    // backend may wrap result in { success, message, data } or return summary directly
    return res.data;
};
