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
