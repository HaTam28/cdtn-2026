// src/api/employeeApi.js
import axiosInstance from './axiosInstance';

const API_URL = '/api/users';

export const getAllEmployees = async () => {
    const res = await axiosInstance.get(API_URL);
    return res.data.data || [];
};

export const getEmployeeById = async (id) => {
    const res = await axiosInstance.get(`${API_URL}/${id}`);
    return res.data.data;
};

export const createEmployee = async (body) => {
    const res = await axiosInstance.post(API_URL, body);
    return res.data.data;
};

export const updateEmployee = async (id, body) => {
    const res = await axiosInstance.put(`${API_URL}/${id}`, body);
    return res.data.data;
};

export const deleteEmployee = async (id) => {
    const res = await axiosInstance.delete(`${API_URL}/${id}`);
    return res.data;
};
