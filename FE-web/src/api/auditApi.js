// src/api/auditApi.js
import axiosInstance from './axiosInstance';

const BASE = '/api/inventory-audits';

/** GET /api/inventory-audits */
export const getAllAudits = async () => {
    const res = await axiosInstance.get(BASE);
    return res.data.data || [];
};

/** GET /api/inventory-audits/{id} */
export const getAuditById = async (id) => {
    const res = await axiosInstance.get(`${BASE}/${id}`);
    return res.data.data;
};

/**
 * POST /api/inventory-audits — Tạo phiếu kiểm kê (DRAFT/REQUESTED)
 * body: { docno, docDate, description, locationId, assignedUserId?, sendToStaff?, details: [{itemId, actualquantity, description}] }
 */
export const createAudit = async (body) => {
    const res = await axiosInstance.post(BASE, body);
    return res.data;
};

/**
 * PUT /api/inventory-audits/{id} — Cập nhật phiếu DRAFT
 */
export const updateAudit = async (id, body) => {
    const res = await axiosInstance.put(`${BASE}/${id}`, body);
    return res.data;
};

/** POST /api/inventory-audits/{id}/confirm */
export const confirmAudit = async (id) => {
    const res = await axiosInstance.post(`${BASE}/${id}/confirm`);
    return res.data;
};

/** POST /api/inventory-audits/{id}/cancel */
export const cancelAudit = async (id) => {
    const res = await axiosInstance.post(`${BASE}/${id}/cancel`);
    return res.data;
};

/** GET /api/inventory-audits/assigned — Danh sách phiếu giao cho STAFF đang đăng nhập */
export const getAssignedAudits = async () => {
    const res = await axiosInstance.get(`${BASE}/assigned`);
    return res.data.data || [];
};

/** GET /api/inventory-audits/assigned/pending — Danh sách phiếu kiểm kê chưa làm */
export const getAssignedAuditsPending = async () => {
    const res = await axiosInstance.get(`${BASE}/assigned/pending`);
    return res.data.data || [];
};

/** GET /api/inventory-audits/assigned/done — Danh sách phiếu kiểm kê đã làm */
export const getAssignedAuditsDone = async () => {
    const res = await axiosInstance.get(`${BASE}/assigned/done`);
    return res.data.data || [];
};

/**
 * PUT /api/inventory-audits/{id}/assigned — STAFF cập nhật số liệu thực tế
 * body: { docno, docDate, description, details: [{ itemId, actualquantity, description }] }
 */
export const updateAssignedAudit = async (id, body) => {
    const res = await axiosInstance.put(`${BASE}/${id}/assigned`, body);
    return res.data;
};

/** POST /api/inventory-audits/{id}/submit — STAFF gửi kết quả về Manager */
export const submitAudit = async (id) => {
    const res = await axiosInstance.post(`${BASE}/${id}/submit`);
    return res.data;
};

/** POST /api/inventory-audits/{id}/reject — Manager từ chối duyệt (kèm lý do) */
export const rejectAudit = async (id, reason) => {
    const res = await axiosInstance.post(`${BASE}/${id}/reject`, { reason });
    return res.data;
};
