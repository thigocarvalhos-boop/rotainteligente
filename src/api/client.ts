// src/api/client.ts

// This file includes the bug fix for the updateProject method, including ID validation and specific error handling.

const updateProject = async (projectId, projectData) => {
    // Validate project ID
    if (!projectId || typeof projectId !== 'string') {
        throw new Error('Invalid project ID');
    }

    try {
        const response = await apiClient.put(`/projects/${projectId}`, projectData);
        return response.data;
    } catch (error) {
        // Handle specific HTTP status codes
        if (error.response) {
            switch (error.response.status) {
                case 400:
                    throw new Error('Bad Request: Please check your input.');
                case 403:
                    throw new Error('Forbidden: You do not have permission to update this project.');
                case 404:
                    throw new Error('Not Found: Project does not exist.');
                default:
                    throw new Error('An unexpected error occurred.');
            }
        } else {
            throw new Error('Network error: Unable to connect to the server.');
        }
    }
};

export default updateProject;
