const API_BASE_URL = 'http://127.0.0.1:8000';

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

export class ApiService {
    static async healthCheck() {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
            throw new Error('Health check failed');
        }
        return response.json();
    }

    static async getAvailableSteps() {
        const response = await fetch(`${API_BASE_URL}/steps`);
        if (!response.ok) {
            throw new Error('Failed to get available steps');
        }
        return response.json();
    }

    static async startCalculation(input) {
        // Prepare the request body for the new backend structure
        const requestBody = {
            parameters: {
                expectedRunDate: input.parameters?.expectedRunDate || "2024-01-01",
                inputConfigFilePath: input.parameters?.inputConfigFilePath || "/path/to/config",
                inputConfigFilePattern: input.parameters?.inputConfigFilePattern || "*.json",
                rootFileDir: input.parameters?.rootFileDir || "/data",
                runEnv: input.parameters?.runEnv || "production",
                tempFilePath: input.parameters?.tempFilePath || "/tmp"
            },
            previous_outputs: input.previousOutputs || null,
            custom_params: input.customParams || null
        };

        const response = await fetch(`${API_BASE_URL}/run/${input.nodeId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to start calculation for node ${input.nodeId}`);
        }
        
        const result = await response.json();
        
        // Transform the response to match the expected frontend format
        return {
            process_id: result.task_id,
            status: result.status,
            pid: result.pid,
            node_id: input.nodeId
        };
    }

    static async getProcessStatus(processId) {
        const response = await fetch(`${API_BASE_URL}/status/${processId}`);
        if (!response.ok) {
            throw new Error('Failed to get process status');
        }
        
        const result = await response.json();
        
        // Transform the response to match the expected frontend format
        return {
            process_id: processId,
            status: result.status,
            output: result.output,
            error: result.status === 'failed' ? result.output : null
        };
    }

    static async getProcessOutput(processId) {
        const response = await fetch(`${API_BASE_URL}/output/${processId}`);
        if (!response.ok) {
            throw new Error('Failed to get process output');
        }
        
        const result = await response.json();
        return result.output;
    }

    static async stopProcess(processId) {
        const response = await fetch(`${API_BASE_URL}/stop/${processId}`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to stop process');
        }
        
        const result = await response.json();
        
        // Transform the response to match the expected frontend format
        return {
            process_id: processId,
            status: result.status,
            message: `Process ${result.status}`
        };
    }

    static async resetProcess(processId) {
        // For the new backend, we'll stop the process and clean up
        try {
            await this.stopProcess(processId);
            return {
                process_id: processId,
                status: "reset",
                message: "Process reset successfully"
            };
        } catch (error) {
            throw new Error('Failed to reset process');
        }
    }

    static async manualCleanup() {
        const response = await fetch(`${API_BASE_URL}/cleanup/now`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to trigger manual cleanup');
        }
        return response.json();
    }

    static async getCleanupSchedule() {
        const response = await fetch(`${API_BASE_URL}/cleanup/schedule`);
        if (!response.ok) {
            throw new Error('Failed to get cleanup schedule');
        }
        return response.json();
    }

    // Helper method to validate step names
    static isValidStepName(stepName) {
        return stepName in COMPLETENESS_STEPS;
    }

    // Helper method to get step display name
    static getStepDisplayName(stepName) {
        return COMPLETENESS_STEPS[stepName] || stepName;
    }

    // Helper method to get all step names
    static getAllStepNames() {
        return Object.keys(COMPLETENESS_STEPS);
    }
} 