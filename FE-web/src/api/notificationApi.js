// src/api/notificationApi.js
import axiosInstance from "./axiosInstance";

const BASE = "/api/notifications";

export const getNotifications = async () => {
    const res = await axiosInstance.get(BASE);
    return res.data.data || [];
};

export const getUnreadCount = async () => {
    const res = await axiosInstance.get(`${BASE}/unread-count`);
    return res.data.data || 0;
};

export const markRead = async (id) => {
    const res = await axiosInstance.post(`${BASE}/${id}/read`);
    return res.data.data;
};

export const markReadAll = async () => {
    const res = await axiosInstance.post(`${BASE}/read-all`);
    return res.data.data;
};
