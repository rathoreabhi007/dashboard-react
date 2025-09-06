const API_BASE_URL = 'http://127.0.0.1:8000';

// Enhanced API configuration with backward compatibility
const API_CONFIG = {
    REQUEST_TIMEOUT: 30000,        // 30 seconds timeout for API calls
    POLLING_INTERVAL: 2000,        // 2 seconds between polls (improved from 1s)
    MAX_POLLING_ATTEMPTS: 900,     // 30 minutes max (900 * 2 seconds)
    RETRY_ATTEMPTS: 3,             // Retry failed requests 3 times
    RETRY_DELAY: 1000,             // 1 second delay between retries
    HEALTH_CHECK_INTERVAL: 10000,  // Check backend health every 10 seconds
    CONNECTION_TIMEOUT: 10000,     // 10 seconds connection timeout
    TASK_TIMEOUT_MINUTES: 30,      // Task timeout in minutes
    
    // Backward compatibility settings
    LEGACY_POLLING_INTERVAL: 1000, // Original 1 second interval
    LEGACY_MAX_RETRIES: 3,         // Original retry count
};

// Completeness Control Step Names (matching backend)
const COMPLETENESS_STEPS = {
    // Initial steps
    'reading_config_comp': 'Reading_Config_Comp',
    'read_src_comp': 'Read_SRC_Comp',
    'read_tgt_comp': 'Read_TGT_Comp',
    
    // SRC flow steps
    'pre_harmonisation_src_comp': 'Reading & Pre-Harmonisation_SRC',
    'harmonisation_src_comp': 'Harmonisation_SRC',
    'enrichment_file_search_src_comp': 'Enrichment File Search_SRC',
    'enrichment_src_comp': 'Enrichment_SRC',
    'data_transform_src_comp': 'Data Transform Post Enrichment_SRC',
    
    // TGT flow steps
    'pre_harmonisation_tgt_comp': 'Reading & Pre-Harmonisation_TGT',
    'harmonisation_tgt_comp': 'Harmonisation_TGT',
    'enrichment_file_search_tgt_comp': 'Enrichment File Search_TGT',
    'enrichment_tgt_comp': 'Enrichment_TGT',
    'data_transform_tgt_comp': 'Data Transform Post Enrichment_TGT',
    
    // Combined steps
    'combine_data_comp': 'Combine SRC and TGT Data',
    'apply_rules_comp': 'Apply Rec Rules & Break Explain',
    'output_rules_comp': 'Output Rules',
    'break_rolling_comp': 'BreakRolling Details'
};

// Enhanced API Service with timeout, retry, health checking, and backward compatibility
export class ApiService {
    static isBackendHealthy = true;
    static lastHealthCheck = 0;
    static useLegacyMode = false; // Flag to enable legacy behavior

    // Enhanced fetch with timeout and retry logic
    static async fetchWithTimeout(url, options = {}, timeout = API_CONFIG.REQUEST_TIMEOUT) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    // Retry mechanism for failed requests
    static async retryRequest(requestFn, maxRetries = API_CONFIG.RETRY_ATTEMPTS) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Request attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = API_CONFIG.RETRY_DELAY * attempt; // Exponential backoff
                    console.log(`🔄 Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`Request failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    // Health check with caching
    static async checkBackendHealth(forceCheck = false) {
        const now = Date.now();
        
        // Use cached result if recent and not forced
        if (!forceCheck && 
            this.isBackendHealthy && 
            (now - this.lastHealthCheck) < API_CONFIG.HEALTH_CHECK_INTERVAL) {
            return this.isBackendHealthy;
        }

        try {
            const response = await this.fetchWithTimeout(
                `${API_BASE_URL}/health`,
                { method: 'GET' },
                API_CONFIG.CONNECTION_TIMEOUT
            );
            
            this.isBackendHealthy = response.ok;
            this.lastHealthCheck = now;
            
            if (!response.ok) {
                console.error('❌ Backend health check failed:', response.status);
            }
            
            return this.isBackendHealthy;
        } catch (error) {
            console.error('❌ Backend health check error:', error.message);
            this.isBackendHealthy = false;
            this.lastHealthCheck = now;
            return false;
        }
    }

    // Enhanced health check with system stats
    static async healthCheck() {
        return this.retryRequest(async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/health`);
            if (!response.ok) {
                throw new Error(`Health check failed: ${response.status}`);
            }
            return response.json();
        });
    }

    // Get available steps
    static async getAvailableSteps() {
        return this.retryRequest(async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/steps`);
            if (!response.ok) {
                throw new Error('Failed to get available steps');
            }
            return response.json();
        });
    }

    // Start calculation with enhanced error handling and backward compatibility
    static async startCalculation(input) {
        // Check backend health first (unless in legacy mode)
        if (!this.useLegacyMode) {
            const isHealthy = await this.checkBackendHealth();
            if (!isHealthy) {
                throw new Error('Backend is not responding. Please check the server status.');
            }
        }

        // Prepare the request body (same as original)
        const requestBody = {
            parameters: {
                expectedRunDate: input.parameters?.expectedRunDate || "2024-01-01",
                inputConfigFilePath: input.parameters?.inputConfigFilePath || "/path/to/config",
                inputConfigFilePattern: input.parameters?.inputConfigFilePattern || "*.json",
                rootFileDir: input.parameters?.rootFileDir || "/data",
                runEnv: input.parameters?.runEnv || "production",
                tempFilePath: input.parameters?.tempFilePath || "/tmp"
            },
            previous_outputs: null,
            custom_params: input.customParams || null
        };

        // Process previous outputs with validation (same as original)
        if (input.previousOutputs && Object.keys(input.previousOutputs).length > 0) {
            console.log('📤 Processing previous outputs for enhanced ETL system');
            
            const processedOutputs = {};
            
            for (const [nodeId, output] of Object.entries(input.previousOutputs)) {
                if (output && output.status !== 'failed' && !output.fail_message) {
                    processedOutputs[nodeId] = {
                        status: output.status || 'success',
                        calculation_results: output.calculation_results || {},
                        histogram_data: output.histogram_data || [],
                        count: output.count || '0',
                        file_info: output.file_info || null,
                        input_file_info: output.input_file_info || null,
                        execution_logs: output.execution_logs || [],
                        step_type: output.step_type || nodeId,
                        processed_at: output.processed_at || new Date().toISOString()
                    };
                    
                    console.log(`📤 Added previous output from ${nodeId} with file info:`, output.file_info);
                } else {
                    console.warn(`⚠️ Skipping failed previous output from ${nodeId}:`, output?.fail_message || 'Unknown error');
                }
            }
            
            if (Object.keys(processedOutputs).length > 0) {
                requestBody.previous_outputs = processedOutputs;
                console.log(`📤 Sending ${Object.keys(processedOutputs).length} previous outputs to backend`);
            }
        }

        console.log('📤 Request body prepared:', {
            nodeId: input.nodeId,
            hasPreviousOutputs: !!requestBody.previous_outputs,
            previousOutputKeys: requestBody.previous_outputs ? Object.keys(requestBody.previous_outputs) : [],
            customParams: requestBody.custom_params
        });

        // Use retry logic unless in legacy mode
        const requestFn = async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/run/${input.nodeId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API Error for ${input.nodeId}:`, errorText);
                throw new Error(`Failed to start calculation for node ${input.nodeId}: ${errorText}`);
            }
            
            const result = await response.json();
            
            return {
                process_id: result.task_id,
                status: result.status,
                pid: result.pid,
                thread_id: result.thread_id, // New field from v2
                node_id: input.nodeId
            };
        };

        if (this.useLegacyMode) {
            return await requestFn();
        } else {
            return await this.retryRequest(requestFn);
        }
    }

    // Enhanced process status with timeout and retry
    static async getProcessStatus(processId) {
        const requestFn = async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/status/${processId}`);
            if (!response.ok) {
                throw new Error(`Failed to get process status: ${response.status}`);
            }
            
            const result = await response.json();
            
            return {
                process_id: processId,
                status: result.status,
                output: result.output,
                error: result.error || (result.status === 'failed' ? result.output : null),
                step_name: result.step_name,
                created_at: result.created_at,
                started_at: result.started_at,
                completed_at: result.completed_at
            };
        };

        if (this.useLegacyMode) {
            return await requestFn();
        } else {
            return await this.retryRequest(requestFn);
        }
    }

    // Enhanced process output with timeout and retry
    static async getProcessOutput(processId) {
        const requestFn = async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/output/${processId}`);
            if (!response.ok) {
                throw new Error(`Failed to get process output: ${response.status}`);
            }
            
            const result = await response.json();
            return result.output;
        };

        if (this.useLegacyMode) {
            return await requestFn();
        } else {
            return await this.retryRequest(requestFn);
        }
    }

    // Stop process with enhanced error handling
    static async stopProcess(processId) {
        const requestFn = async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/stop/${processId}`, {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error(`Failed to stop process: ${response.status}`);
            }
            
            const result = await response.json();
            
            return {
                process_id: processId,
                status: result.status,
                message: `Process ${result.status}`
            };
        };

        if (this.useLegacyMode) {
            return await requestFn();
        } else {
            return await this.retryRequest(requestFn);
        }
    }

    // Reset process
    static async resetProcess(processId) {
        try {
            await this.stopProcess(processId);
            return {
                process_id: processId,
                status: "reset",
                message: "Process reset successfully"
            };
        } catch (error) {
            throw new Error(`Failed to reset process: ${error.message}`);
        }
    }

    // Manual cleanup
    static async manualCleanup() {
        const requestFn = async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/cleanup/now`, {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error(`Failed to trigger manual cleanup: ${response.status}`);
            }
            return response.json();
        };

        if (this.useLegacyMode) {
            return await requestFn();
        } else {
            return await this.retryRequest(requestFn);
        }
    }

    // Get cleanup schedule
    static async getCleanupSchedule() {
        const requestFn = async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/cleanup/schedule`);
            if (!response.ok) {
                throw new Error(`Failed to get cleanup schedule: ${response.status}`);
            }
            return response.json();
        };

        if (this.useLegacyMode) {
            return await requestFn();
        } else {
            return await this.retryRequest(requestFn);
        }
    }

    // Get system statistics (new in v2)
    static async getSystemStats() {
        const requestFn = async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/stats`);
            if (!response.ok) {
                throw new Error(`Failed to get system stats: ${response.status}`);
            }
            return response.json();
        };

        if (this.useLegacyMode) {
            return await requestFn();
        } else {
            return await this.retryRequest(requestFn);
        }
    }

    // Get all tasks (new in v2)
    static async getAllTasks(limit = 100) {
        const requestFn = async () => {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}/tasks?limit=${limit}`);
            if (!response.ok) {
                throw new Error(`Failed to get all tasks: ${response.status}`);
            }
            return response.json();
        };

        if (this.useLegacyMode) {
            return await requestFn();
        } else {
            return await this.retryRequest(requestFn);
        }
    }

    // Helper methods (same as original)
    static isValidStepName(stepName) {
        return stepName in COMPLETENESS_STEPS;
    }

    static getStepDisplayName(stepName) {
        return COMPLETENESS_STEPS[stepName] || stepName;
    }

    static getAllStepNames() {
        return Object.keys(COMPLETENESS_STEPS);
    }

    // Enhanced polling with timeout and health checks (NEW)
    static async pollTaskStatus(processId, onStatusUpdate, onComplete, onError, options = {}) {
        const {
            maxAttempts = API_CONFIG.MAX_POLLING_ATTEMPTS,
            interval = API_CONFIG.POLLING_INTERVAL,
            healthCheckInterval = API_CONFIG.HEALTH_CHECK_INTERVAL
        } = options;

        let attempts = 0;
        let lastHealthCheck = 0;

        const poll = async () => {
            attempts++;
            
            // Check backend health periodically (unless in legacy mode)
            if (!this.useLegacyMode) {
                const now = Date.now();
                if (now - lastHealthCheck > healthCheckInterval) {
                    const isHealthy = await this.checkBackendHealth(true);
                    if (!isHealthy) {
                        onError(new Error('Backend is not responding'));
                        return;
                    }
                    lastHealthCheck = now;
                }
            }

            try {
                const status = await this.getProcessStatus(processId);
                
                // Call status update callback
                if (onStatusUpdate) {
                    onStatusUpdate(status, attempts);
                }

                if (status.status === 'completed') {
                    if (onComplete) {
                        onComplete(status);
                    }
                    return;
                } else if (status.status === 'failed') {
                    if (onError) {
                        onError(new Error(status.error || 'Task failed'));
                    }
                    return;
                } else if (status.status === 'cancelled' || status.status === 'stopped') {
                    if (onError) {
                        onError(new Error('Task was cancelled'));
                    }
                    return;
                } else if (status.status === 'running' || status.status === 'pending') {
                    // Continue polling
                    if (attempts >= maxAttempts) {
                        if (onError) {
                            onError(new Error(`Task timeout after ${maxAttempts} attempts (${Math.round(maxAttempts * interval / 1000)} seconds)`));
                        }
                        return;
                    }
                    
                    setTimeout(poll, interval);
                } else {
                    // Unknown status, continue polling with warning
                    console.warn(`⚠️ Unknown status: ${status.status}, continuing to poll...`);
                    if (attempts >= maxAttempts) {
                        if (onError) {
                            onError(new Error(`Task timeout with unknown status: ${status.status}`));
                        }
                        return;
                    }
                    setTimeout(poll, interval);
                }
            } catch (error) {
                console.error(`❌ Error polling task ${processId}:`, error);
                
                // If it's a network error, retry a few times
                if (error.message.includes('timeout') || error.message.includes('fetch')) {
                    if (attempts < 5) { // Retry network errors up to 5 times
                        console.log(`🔄 Retrying poll attempt ${attempts} due to network error...`);
                        setTimeout(poll, interval * 2); // Longer delay for network errors
                        return;
                    }
                }
                
                if (onError) {
                    onError(error);
                }
            }
        };

        // Start polling
        poll();
    }

    // Legacy polling method (for backward compatibility)
    static async legacyPollTaskStatus(processId, onStatusUpdate, onComplete, onError, options = {}) {
        const {
            maxAttempts = 17280, // 24 hours = 17280 polls (5-second intervals)
            interval = 5000,     // 5 seconds (original interval)
        } = options;

        let attempts = 0;

        const poll = async () => {
            attempts++;
            
            try {
                const status = await this.getProcessStatus(processId);
                
                // Call status update callback
                if (onStatusUpdate) {
                    onStatusUpdate(status, attempts);
                }

                if (status.status === 'completed') {
                    if (onComplete) {
                        onComplete(status);
                    }
                    return;
                } else if (status.status === 'failed') {
                    if (onError) {
                        onError(new Error(status.error || 'Task failed'));
                    }
                    return;
                } else if (status.status === 'terminated') {
                    if (onError) {
                        onError(new Error('Task was terminated'));
                    }
                    return;
                } else if (status.status === 'running') {
                    // Continue polling
                    if (attempts >= maxAttempts) {
                        if (onError) {
                            onError(new Error(`Task timeout after ${maxAttempts} attempts (${Math.round(maxAttempts * interval / 1000 / 60)} minutes)`));
                        }
                        return;
                    }
                    
                    setTimeout(poll, interval);
                } else {
                    // Unknown status, continue polling
                    console.log(`❓ Unknown status for ${processId}: ${status.status} - continuing to poll`);
                    if (attempts >= maxAttempts) {
                        if (onError) {
                            onError(new Error(`Task timeout with unknown status: ${status.status}`));
                        }
                        return;
                    }
                    setTimeout(poll, interval);
                }
            } catch (error) {
                console.error(`❌ Error polling task ${processId}:`, error);
                
                if (onError) {
                    onError(error);
                }
            }
        };

        // Start polling
        poll();
    }

    // Configuration methods
    static enableLegacyMode() {
        this.useLegacyMode = true;
        console.log('🔄 Enabled legacy mode - using original polling behavior');
    }

    static disableLegacyMode() {
        this.useLegacyMode = false;
        console.log('🔄 Disabled legacy mode - using enhanced polling behavior');
    }

    static setPollingInterval(interval) {
        API_CONFIG.POLLING_INTERVAL = interval;
        console.log(`🔄 Set polling interval to ${interval}ms`);
    }

    static setMaxPollingAttempts(attempts) {
        API_CONFIG.MAX_POLLING_ATTEMPTS = attempts;
        console.log(`🔄 Set max polling attempts to ${attempts}`);
    }

    static setRequestTimeout(timeout) {
        API_CONFIG.REQUEST_TIMEOUT = timeout;
        console.log(`🔄 Set request timeout to ${timeout}ms`);
    }

    static getConfig() {
        return { ...API_CONFIG };
    }
}


