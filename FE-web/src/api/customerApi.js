// src/api/customerApi.js
import axiosInstance from './axiosInstance';

const API_URL = '/api/customers';

export const getAllCustomers = async () => {
    const res = await axiosInstance.get(API_URL);
    return res.data.data || [];
};

export const getCustomerById = async (id) => {
    const res = await axiosInstance.get(`${API_URL}/${id}`);
    return res.data.data;
};

export const createCustomer = async (body) => {
    const res = await axiosInstance.post(API_URL, body);
    return res.data.data;
};

export const updateCustomer = async (id, body) => {
    const res = await axiosInstance.put(`${API_URL}/${id}`, body);
    return res.data.data;
};
