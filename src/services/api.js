const API_BASE_URL = 'http://127.0.0.1:8000';

// Removed TypeScript interfaces - in JavaScript, we'll use JSDoc comments for documentation if needed

export class ApiService {
    static async healthCheck() {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
            throw new Error('Health check failed');
        }
        return response.json();
    }

    static async startCalculation(input) {
        const response = await fetch(`${API_BASE_URL}/run/${input.nodeId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });
        if (!response.ok) {
            throw new Error(`Failed to start calculation for node ${input.nodeId}`);
        }
        return response.json();
    }

    static async getProcessStatus(processId) {
        const response = await fetch(`${API_BASE_URL}/status/${processId}`);
        if (!response.ok) {
            throw new Error('Failed to get process status');
        }
        return response.json();
    }

    static async stopProcess(processId) {
        const response = await fetch(`${API_BASE_URL}/stop/${processId}`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to stop process');
        }
        return response.json();
    }

    static async resetProcess(processId) {
        const response = await fetch(`${API_BASE_URL}/reset/${processId}`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to reset process');
        }
        return response.json();
    }
} 