// Importing necessary modules and initializing axios
import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'https://api.example.com/',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Login method
export const login = async (username, password) => {
    const response = await apiClient.post('/login', { username, password });
    return response.data;
};

// Get projects
export const getProjects = async () => {
    const response = await apiClient.get('/projects');
    return response.data;
};

// Create project
export const createProject = async (projectData) => {
    const response = await apiClient.post('/projects', projectData);
    return response.data;
};

// Get alerts
export const getAlerts = async () => {
    const response = await apiClient.get('/alerts');
    return response.data;
};

// Read an alert
export const readAlert = async (alertId) => {
    const response = await apiClient.get(`/alerts/${alertId}`);
    return response.data;
};

// Resolve an alert
export const resolveAlert = async (alertId) => {
    const response = await apiClient.patch(`/alerts/${alertId}/resolve`);
    return response.data;
};

// Create expense
export const createExpense = async (expenseData) => {
    const response = await apiClient.post('/expenses', expenseData);
    return response.data;
};

// Upload document
export const uploadDocument = async (documentData) => {
    const formData = new FormData();
    formData.append('file', documentData);
    const response = await apiClient.post('/documents/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// Get audit logs
export const getAuditLogs = async () => {
    const response = await apiClient.get('/audit-logs');
    return response.data;
};

// Get documents
export const getDocuments = async () => {
    const response = await apiClient.get('/documents');
    return response.data;
};

// Get stats
export const getStats = async () => {
    const response = await apiClient.get('/stats');
    return response.data;
};

// Health check
export const getHealth = async () => {
    const response = await apiClient.get('/health');
    return response.data;
};

// Token refresh logic
export const refreshToken = async (token) => {
    const response = await apiClient.post('/token/refresh', { token });
    return response.data;
};