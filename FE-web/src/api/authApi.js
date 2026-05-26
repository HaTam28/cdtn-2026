// src/api/authApi.js
import axios from 'axios';

// Interceptor: tự động thêm Authorization nếu có token
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const API_URL = '/api/auth';


export const login = async (data) => {
    try {
        const res = await axios.post(`${API_URL}/login`, data);
        console.log('login response:', res.data);
        // Nếu có token trong res.data.data, lưu vào localStorage
        if (res.data && res.data.data && res.data.data.token) {
            localStorage.setItem('token', res.data.data.token);
        }
        return res.data;
    } catch (err) {
        console.error('login error:', err);
        throw err;
    }
};

export const register = async (data) => {
    try {
        const res = await axios.post(`${API_URL}/register`, data);
        console.log('register response:', res.data);
        return res.data;
    } catch (err) {
        console.error('register error:', err);
        throw err;
    }
};

export const forgotPassword = async (data) => {
    try {
        const res = await axios.post(`${API_URL}/forgot-password`, data);
        console.log('forgotPassword response:', res.data);
        return res.data;
    } catch (err) {
        console.error('forgotPassword error:', err);
        throw err;
    }
};

export const updatePassword = async (data) => {
    try {
        const res = await axios.post(`${API_URL}/update-password`, data);
        console.log('updatePassword response:', res.data);
        return res.data;
    } catch (err) {
        console.error('updatePassword error:', err);
        throw err;
    }
};
