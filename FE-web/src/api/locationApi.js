// src/api/locationApi.js
import axiosInstance from './axiosInstance';

const API_URL = '/api/locations';

export const getAllLocations = async () => {
    const res = await axiosInstance.get(API_URL);
    return res.data.data || [];
};

export const getLocationById = async (id) => {
    const res = await axiosInstance.get(`${API_URL}/${id}`);
    return res.data.data;
};

export const createLocation = async (body) => {
    const res = await axiosInstance.post(API_URL, body);
    return res.data.data;
};

export const updateLocation = async (id, body) => {
    const res = await axiosInstance.put(`${API_URL}/${id}`, body);
    return res.data.data;
};

/** GET /api/locations/{id}/items — Danh sách vật tư đang chứa tại vị trí */
export const getItemsAtLocation = async (id) => {
    const res = await axiosInstance.get(`${API_URL}/${id}/items`);
    return res.data.data || null;
};
