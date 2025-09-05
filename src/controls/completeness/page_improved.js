// Enhanced Completeness Control Page with Improved Timeout and Retry Logic
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { FaPlay, FaStop, FaSpinner, FaCheckCircle, FaTimesCircle, FaClock, FaCircle, FaExclamationTriangle } from 'react-icons/fa';
import { ImprovedApiService } from '../../services/api_improved';
import '../../styles/dataOutput.css';

// Enhanced constants with better timeout configuration
const CONSTANTS = {
    // UI Dimensions - Desktop Optimized
    MIN_SIDEBAR_WIDTH: 64,
    MAX_SIDEBAR_WIDTH: 600,
    MIN_BOTTOM_BAR_HEIGHT: 300,
    DEFAULT_SIDEBAR_WIDTH: 400,

    // Colors
    COLORS: {
        SLATE_600: '#334155',
        SLATE_500: '#475569',
        SLATE_400: '#64748b',
        SLATE_300: '#cbd5e1',
        GREEN_500: '#22c55e',
        RED_500: '#ef4444',
        YELLOW_400: '#facc15',
        ORANGE_500: '#f97316',
        BLUE_500: '#3b82f6',
    },

    // Status Colors
    STATUS_COLORS: {
        completed: '#22c55e',
        failed: '#ef4444',
        running: '#facc15',
        stopped: '#ef4444',
        idle: '#64748b',
        queued: '#f97316',
        timeout: '#ef4444',
        retrying: '#3b82f6'
    },

    // Enhanced API Configuration
    POLLING_INTERVAL: 2000,           // 2 seconds between polls
    MAX_POLLING_ATTEMPTS: 900,        // 30 minutes max (900 * 2 seconds)
    REQUEST_TIMEOUT: 30000,           // 30 seconds timeout for API calls
    RETRY_ATTEMPTS: 3,                // Retry failed requests 3 times
    HEALTH_CHECK_INTERVAL: 10000,     // Check backend health every 10 seconds
    TASK_TIMEOUT_MINUTES: 30,         // Task timeout in minutes

    // Local Storage Keys
    STORAGE_KEYS: {
        PARAMS: 'validatedParams',
        NODE_OUTPUTS: 'nodeOutputs',
        NODES: 'nodes',
        PROCESS_IDS: 'processIds',
        UI_STATE: 'uiState'
    }
};

// Enhanced styles
const styles = {
    selectedNode: {
        border: `2px solid ${CONSTANTS.COLORS.SLATE_600}`,
        boxShadow: `0 0 0 2px rgba(51, 65, 85, 0.2)`,
        transform: 'scale(1.02)',
        transition: 'all 0.2s ease'
    },
    hoveredNode: {
        border: `2px solid ${CONSTANTS.COLORS.SLATE_600}`,
        boxShadow: `0 0 0 2px rgba(51, 65, 85, 0.1)`,
        transform: 'scale(1.01)',
        transition: 'all 0.2s ease'
    },
    timeoutNode: {
        border: `2px solid ${CONSTANTS.COLORS.RED_500}`,
        boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.2)`,
        animation: 'pulse 2s infinite'
    }
};

// Function to create fresh initial nodes for each instance
const createInitialNodes = () => [
    {
        id: 'reading_config_comp',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
            label: 'Reading Config Comp',
            fullName: 'Reading_Config_Comp',
            status: 'idle',
            description: 'Reads and validates configuration files'
        }
    },
    {
        id: 'read_src_comp',
        type: 'custom',
        position: { x: 300, y: 100 },
        data: {
            label: 'Read SRC Comp',
            fullName: 'Read_SRC_Comp',
            status: 'idle',
            description: 'Reads source data files'
        }
    },
    {
        id: 'read_tgt_comp',
        type: 'custom',
        position: { x: 500, y: 100 },
        data: {
            label: 'Read TGT Comp',
            fullName: 'Read_TGT_Comp',
            status: 'idle',
            description: 'Reads target data files'
        }
    },
    // Add more nodes as needed...
];

// Enhanced CustomNode component with timeout indicators
const CustomNode = memo(({ data, id, nodeOutputs, setSelectedNode, setSelectedTab, setIsBottomBarOpen, setActivePanel }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

    // Check if node has been running too long
    useEffect(() => {
        if (data.status === 'running' && data.startTime) {
            const runningTime = Date.now() - data.startTime;
            const timeoutThreshold = CONSTANTS.TASK_TIMEOUT_MINUTES * 60 * 1000;
            
            if (runningTime > timeoutThreshold) {
                setShowTimeoutWarning(true);
            }
        } else {
            setShowTimeoutWarning(false);
        }
    }, [data.status, data.startTime]);

    const getStatusIcon = () => {
        switch (data.status) {
            case 'running':
                return <FaSpinner className="animate-spin text-white w-3.5 h-3.5" />;
            case 'completed':
                return <FaCheckCircle className="text-white w-3.5 h-3.5" />;
            case 'failed':
            case 'timeout':
                return <FaTimesCircle className="text-white w-3.5 h-3.5" />;
            case 'queued':
                return <FaClock className="text-white w-3.5 h-3.5" />;
            case 'stopped':
                return <FaStop className="text-white w-3.5 h-3.5" />;
            case 'retrying':
                return <FaSpinner className="animate-spin text-white w-3.5 h-3.5" />;
            default:
                return <FaCircle className="text-white/80 w-3.5 h-3.5" />;
        }
    };

    const getStatusColor = () => {
        if (showTimeoutWarning) return 'bg-red-500';
        return CONSTANTS.STATUS_COLORS[data.status] ? 
            `bg-[${CONSTANTS.STATUS_COLORS[data.status]}]` : 'bg-slate-400';
    };

    return (
        <div
            className={`relative bg-white border-2 border-gray-300 rounded-lg p-3 shadow-md cursor-pointer transition-all duration-200 ${
                isHovered ? 'shadow-lg' : ''
            } ${showTimeoutWarning ? 'border-red-500' : ''}`}
            style={{
                ...(isHovered ? styles.hoveredNode : {}),
                ...(showTimeoutWarning ? styles.timeoutNode : {})
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
                setSelectedNode({ id, data, outputs: nodeOutputs[id] });
                setSelectedTab('output');
                setIsBottomBarOpen(true);
                setActivePanel('bottombar');
            }}
        >
            {/* Timeout Warning */}
            {showTimeoutWarning && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                    <FaExclamationTriangle className="w-3 h-3" />
                </div>
            )}

            {/* Node Content */}
            <div className="text-center">
                <div className="text-sm font-semibold text-gray-800 mb-2">{data.label}</div>
                
                {/* Status badge */}
                <div className="flex justify-center w-full">
                    <div className={`relative -mt-3 z-20 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md ${getStatusColor()}`}>
                        {getStatusIcon()}
                    </div>
                </div>

                <div className="text-[10px] text-black mt-1 max-w-[80px] text-center font-medium">{data.fullName}</div>

                {/* Timeout Warning Text */}
                {showTimeoutWarning && (
                    <div className="text-[8px] text-red-600 mt-1 font-bold">
                        TIMEOUT WARNING
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-1 mt-2 justify-center">
                    {data.status === 'idle' && (
                        <button
                            className="bg-green-500 hover:bg-green-600 text-white p-1 rounded text-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Handle run action
                            }}
                        >
                            <FaPlay className="w-2 h-2" />
                        </button>
                    )}
                    {(data.status === 'running' || data.status === 'queued') && (
                        <button
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Handle stop action
                            }}
                        >
                            <FaStop className="w-2 h-2" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

CustomNode.displayName = 'CustomNode';

// Enhanced Completeness Control Component
export default function ImprovedCompletenessControl({ instanceId }) {
    // State management
    const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes());
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [nodeOutputs, setNodeOutputs] = useState({});
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedTab, setSelectedTab] = useState('output');
    const [isBottomBarOpen, setIsBottomBarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState('bottombar');
    const [validatedParams, setValidatedParams] = useState({});
    const [isBackendHealthy, setIsBackendHealthy] = useState(true);
    const [backendHealthMessage, setBackendHealthMessage] = useState('');

    // Refs for managing async operations
    const cancelledNodesRef = useRef(new Set());
    const activeTasksRef = useRef(new Map()); // Track active tasks with their polling
    const healthCheckIntervalRef = useRef(null);

    // Define instance-specific localStorage keys
    const paramKey = `${CONSTANTS.STORAGE_KEYS.PARAMS}_${instanceId || 'default'}`;
    const nodeOutputsKey = `${CONSTANTS.STORAGE_KEYS.NODE_OUTPUTS}_${instanceId || 'default'}`;
    const nodesKey = `${CONSTANTS.STORAGE_KEYS.NODES}_${instanceId || 'default'}`;
    const processIdsKey = `${CONSTANTS.STORAGE_KEYS.PROCESS_IDS}_${instanceId || 'default'}`;
    const uiStateKey = `${CONSTANTS.STORAGE_KEYS.UI_STATE}_${instanceId || 'default'}`;

    // Backend health monitoring
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const isHealthy = await ImprovedApiService.checkBackendHealth(true);
                setIsBackendHealthy(isHealthy);
                setBackendHealthMessage(isHealthy ? 'Backend is healthy' : 'Backend is not responding');
            } catch (error) {
                setIsBackendHealthy(false);
                setBackendHealthMessage(`Backend error: ${error.message}`);
            }
        };

        // Initial health check
        checkHealth();

        // Set up periodic health checks
        healthCheckIntervalRef.current = setInterval(checkHealth, CONSTANTS.HEALTH_CHECK_INTERVAL);

        return () => {
            if (healthCheckIntervalRef.current) {
                clearInterval(healthCheckIntervalRef.current);
            }
        };
    }, []);

    // Enhanced node status update with timeout tracking
    const updateNodeStatus = useCallback((nodeId, status, additionalData = {}) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                const updatedData = {
                    ...node.data,
                    status,
                    ...additionalData
                };

                // Track start time for running tasks
                if (status === 'running' && !node.data.startTime) {
                    updatedData.startTime = Date.now();
                }

                // Clear start time for completed/failed tasks
                if (status === 'completed' || status === 'failed' || status === 'stopped') {
                    updatedData.startTime = null;
                }

                return { ...node, data: updatedData };
            }
            return node;
        }));
    }, [setNodes]);

    // Enhanced node output update
    const updateNodeOutput = useCallback((nodeId, output) => {
        setNodeOutputs(prev => ({
            ...prev,
            [nodeId]: output
        }));
    }, []);

    // Enhanced task cancellation
    const cancelTask = useCallback(async (nodeId) => {
        const activeTask = activeTasksRef.current.get(nodeId);
        if (activeTask) {
            try {
                await ImprovedApiService.stopProcess(activeTask.processId);
                console.log(`🛑 Successfully cancelled task for node ${nodeId}`);
            } catch (error) {
                console.error(`❌ Error cancelling task for node ${nodeId}:`, error);
            }
            activeTasksRef.current.delete(nodeId);
        }
        
        cancelledNodesRef.current.add(nodeId);
        updateNodeStatus(nodeId, 'stopped');
    }, [updateNodeStatus]);

    // Enhanced node runner with improved timeout and retry logic
    const runNodeAndWait = useCallback(async (nodeId) => {
        if (!isBackendHealthy) {
            console.error('❌ Cannot run node: Backend is not healthy');
            updateNodeStatus(nodeId, 'failed');
            return null;
        }

        try {
            console.log(`🚀 Starting enhanced execution for node: ${nodeId}`);
            updateNodeStatus(nodeId, 'queued');

            // Prepare input data
            const input = {
                nodeId: nodeId,
                parameters: validatedParams,
                previousOutputs: nodeOutputs,
                customParams: {}
            };

            // Start the task
            const response = await ImprovedApiService.startCalculation(input);
            console.log(`✅ Task started for ${nodeId}:`, response);

            updateNodeStatus(nodeId, 'running', { 
                processId: response.process_id,
                startTime: Date.now()
            });

            // Store active task
            activeTasksRef.current.set(nodeId, {
                processId: response.process_id,
                startTime: Date.now()
            });

            // Enhanced polling with timeout and retry logic
            return new Promise((resolve, reject) => {
                let isResolved = false;

                const onStatusUpdate = (status, attempts) => {
                    if (isResolved) return;
                    
                    console.log(`📊 Status update for ${nodeId} (attempt ${attempts}):`, {
                        status: status.status,
                        hasOutput: !!status.output,
                        hasError: !!status.error
                    });

                    // Update node status based on polling status
                    if (status.status === 'running' || status.status === 'pending') {
                        updateNodeStatus(nodeId, 'running');
                    }
                };

                const onComplete = async (status) => {
                    if (isResolved) return;
                    isResolved = true;

                    console.log(`✅ Node ${nodeId} completed successfully!`);

                    try {
                        // Get the output
                        const output = await ImprovedApiService.getProcessOutput(status.process_id);
                        console.log(`📥 Retrieved output for ${nodeId}:`, {
                            hasOutput: !!output,
                            outputType: typeof output,
                            outputKeys: output ? Object.keys(output) : null
                        });

                        // Validate the output
                        if (output && output.status === 'failed') {
                            console.error(`❌ Node ${nodeId} returned failed status in output`);
                            updateNodeStatus(nodeId, 'failed');
                            updateNodeOutput(nodeId, output);
                            reject(new Error('Task failed'));
                            return;
                        }

                        if (output && output.fail_message) {
                            console.error(`❌ Node ${nodeId} has fail message: ${output.fail_message}`);
                            updateNodeStatus(nodeId, 'failed');
                            updateNodeOutput(nodeId, output);
                            reject(new Error(output.fail_message));
                            return;
                        }

                        updateNodeOutput(nodeId, output);
                        updateNodeStatus(nodeId, 'completed');
                        console.log(`✅ Updated ${nodeId} status to 'completed'`);

                        resolve(output);
                    } catch (outputError) {
                        console.error(`❌ Error getting output for ${nodeId}:`, outputError);
                        updateNodeStatus(nodeId, 'failed');
                        reject(outputError);
                    } finally {
                        activeTasksRef.current.delete(nodeId);
                    }
                };

                const onError = (error) => {
                    if (isResolved) return;
                    isResolved = true;

                    console.error(`❌ Node ${nodeId} failed:`, error.message);

                    // Check if it was cancelled
                    if (cancelledNodesRef.current.has(nodeId)) {
                        console.log(`🛑 Node ${nodeId} was cancelled`);
                        updateNodeStatus(nodeId, 'stopped');
                        resolve(null);
                        return;
                    }

                    // Check if it's a timeout
                    if (error.message.includes('timeout')) {
                        console.error(`⏰ Node ${nodeId} timed out`);
                        updateNodeStatus(nodeId, 'timeout');
                        updateNodeOutput(nodeId, {
                            status: 'failed',
                            fail_message: `Task timed out after ${CONSTANTS.TASK_TIMEOUT_MINUTES} minutes`,
                            execution_logs: [`Task timed out: ${error.message}`]
                        });
                    } else {
                        updateNodeStatus(nodeId, 'failed');
                        updateNodeOutput(nodeId, {
                            status: 'failed',
                            fail_message: error.message,
                            execution_logs: [`Task failed: ${error.message}`]
                        });
                    }

                    activeTasksRef.current.delete(nodeId);
                    reject(error);
                };

                // Start enhanced polling
                ImprovedApiService.pollTaskStatus(
                    response.process_id,
                    onStatusUpdate,
                    onComplete,
                    onError,
                    {
                        maxAttempts: CONSTANTS.MAX_POLLING_ATTEMPTS,
                        interval: CONSTANTS.POLLING_INTERVAL,
                        healthCheckInterval: CONSTANTS.HEALTH_CHECK_INTERVAL
                    }
                );
            });

        } catch (error) {
            console.error(`❌ Error in runNodeAndWait for ${nodeId}:`, error);
            updateNodeStatus(nodeId, 'failed');
            activeTasksRef.current.delete(nodeId);
            throw error;
        }
    }, [isBackendHealthy, validatedParams, nodeOutputs, updateNodeStatus, updateNodeOutput]);

    // Enhanced node runner with dependency checking
    const runNode = useCallback(async (nodeId) => {
        cancelledNodesRef.current = new Set();
        
        try {
            // Check dependencies (simplified for this example)
            const dependencies = []; // Add your dependency logic here
            
            for (const depId of dependencies) {
                const depNode = nodes.find(n => n.id === depId);
                if (depNode?.data.status === 'failed') {
                    console.error(`❌ Cannot run ${nodeId}: dependency ${depId} has failed`);
                    updateNodeStatus(nodeId, 'failed');
                    return;
                }
            }

            // Run the node
            await runNodeAndWait(nodeId);
            
        } catch (error) {
            console.error(`❌ Error running node ${nodeId}:`, error);
        }
    }, [nodes, runNodeAndWait, updateNodeStatus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cancel all active tasks
            activeTasksRef.current.forEach((task, nodeId) => {
                cancelTask(nodeId);
            });
        };
    }, [cancelTask]);

    return (
        <div className="h-screen w-full bg-gray-100">
            {/* Backend Health Indicator */}
            <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-lg text-sm font-medium ${
                isBackendHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
                {isBackendHealthy ? '🟢' : '🔴'} {backendHealthMessage}
            </div>

            {/* React Flow */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={addEdge}
                nodeTypes={{ custom: CustomNode }}
                fitView
                className="bg-gray-50"
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>

            {/* Bottom Bar (simplified for this example) */}
            {isBottomBarOpen && selectedNode && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">{selectedNode.data.fullName}</h3>
                        <button
                            onClick={() => setIsBottomBarOpen(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {selectedTab === 'output' && selectedNode.outputs && (
                        <div className="text-sm">
                            <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(selectedNode.outputs, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
