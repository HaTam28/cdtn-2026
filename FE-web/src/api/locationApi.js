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
    // Response shape per API doc: { locationId, locationcode, usedCapacity, remainingCapacity, type, items }
    // Return the data object or null when not present to let callers handle it.
    return res.data.data || null;
};

// Helper: normalize location item response for UI (optional convenience)
export const fetchLocationItemsNormalized = async (id) => {
    const data = await getItemsAtLocation(id);
    if (!data) return null;
    // Ensure fields exist and provide defaults for UI
    return {
        locationId: data.locationId,
        locationcode: data.locationcode,
        locationname: data.locationname,
        capacity: data.capacity ?? null,
        usedCapacity: data.usedCapacity ?? 0,
        remainingCapacity: data.hasOwnProperty('remainingCapacity') ? data.remainingCapacity : null,
        type: data.type || (data.items && data.items.length ? 'HAS_STOCK' : 'EMPTY'),
        items: data.items || []
    };
};
