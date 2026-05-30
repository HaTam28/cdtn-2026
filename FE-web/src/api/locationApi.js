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

/**
 * Aggregate all item codes currently present across all locations.
 * Note: This function fetches each location's items in parallel and extracts
 * `itemcode` (normalizing common variants). If the backend provides a single
 * endpoint for this aggregation, prefer that endpoint instead to avoid many requests.
 */
export const getAllItemCodesInLocations = async () => {
    const locations = await getAllLocations();
    if (!locations || !locations.length) return [];

    const fetches = locations.map(loc => getItemsAtLocation(loc.locationId ?? loc.id).catch(() => null));
    const results = await Promise.all(fetches);

    const codes = new Set();
    results.forEach(data => {
        if (!data || !Array.isArray(data.items)) return;
        data.items.forEach(it => {
            const code = (it.itemcode ?? it.itemCode ?? it.code ?? it.ma ?? '').toString?.() ?? '';
            if (code && code.trim()) codes.add(code.trim());
        });
    });

    return Array.from(codes).sort();
};
