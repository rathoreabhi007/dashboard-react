// Converted from Next.js to Create React App

import { useState, useCallback, useRef, useEffect, useMemo, useContext, memo } from 'react';
import ReactFlow, {
    Controls,
    Background,
    addEdge,
    ConnectionMode,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaCircle, FaPlay, FaStop, FaUndo, FaChevronLeft, FaChevronUp, FaGripLines, FaTable, FaClock } from 'react-icons/fa';
import { ApiService } from '../../services/api';
import { buildDependencyMap, buildDownstreamMap, getAllDownstreamNodes } from '../../utils/graph-utils';
import { HandlerContext } from './HandlerContext';
import DataOutputTab from '../../components/DataOutput/DataOutputTab';
import UserAttributesIcon from '../../components/UserAttributesIcon';
import DocumentSearchIcon from '../../components/DocumentSearchIcon';
import LibraryBooksIcon from '../../components/LibraryBooksIcon';
import TableEditIcon from '../../components/TableEditIcon';
import DatasetLinkedIcon from '../../components/DatasetLinkedIcon';
import TableConvertIcon from '../../components/TableConvertIcon';
import StacksIcon from '../../components/StacksIcon';
import DataInfoAlertIcon from '../../components/DataInfoAlertIcon';
import OutputIcon from '../../components/OutputIcon';
import ChangeCircleIcon from '../../components/ChangeCircleIcon';
import HSBCLogo from '../../components/HSBCLogo';
import FailedNodeIndicator from '../../components/FailedNodeIndicator';
import '../../styles/dataOutput.css';

// Node status types (removed TypeScript types for JavaScript)

// Constants for consistent styling and configuration
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
    },

    // Status Colors
    STATUS_COLORS: {
        completed: '#22c55e',
        failed: '#ef4444',
        running: '#facc15',
        stopped: '#ef4444',
        idle: '#64748b',
        queued: '#f97316' // Orange color for queued status
    },

    // API Configuration
    POLLING_INTERVAL: 1000,
    MAX_RETRIES: 3,

    // Local Storage Keys
    STORAGE_KEYS: {
        PARAMS: 'validatedParams',
        NODE_OUTPUTS: 'nodeOutputs',
        NODES: 'nodes',
        PROCESS_IDS: 'processIds',
        UI_STATE: 'uiState'
    }
};

// Add these styles at the top of the file after imports
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
    }
};

// Function to create fresh initial nodes for each instance
const createInitialNodes = () => [
    // Initial nodes
    {
        id: 'reading_config_comp',
        type: 'custom',
        data: { fullName: 'Reading_Config_Comp', status: 'idle' },
        position: { x: 100, y: 250 },
        draggable: false
    },
    {
        id: 'read_src_comp',
        type: 'custom',
        data: { fullName: 'Read_SRC_Comp', status: 'idle' },
        position: { x: 300, y: 100 },
        draggable: false
    },
    {
        id: 'read_tgt_comp',
        type: 'custom',
        data: { fullName: 'Read_TGT_Comp', status: 'idle' },
        position: { x: 300, y: 400 },
        draggable: false
    },
    // Top flow nodes (SRC)
    {
        id: 'pre_harmonisation_src_comp',
        type: 'custom',
        data: { fullName: 'Reading & Pre-Harmonisation_SRC', status: 'idle' },
        position: { x: 500, y: 100 },
        draggable: false
    },
    {
        id: 'harmonisation_src_comp',
        type: 'custom',
        data: { fullName: 'Harmonisation_SRC', status: 'idle' },
        position: { x: 700, y: 100 },
        draggable: false
    },
    {
        id: 'enrichment_file_search_src_comp',
        type: 'custom',
        data: { fullName: 'Enrichment File Search_SRC', status: 'idle' },
        position: { x: 900, y: 100 },
        draggable: false
    },
    {
        id: 'enrichment_src_comp',
        type: 'custom',
        data: { fullName: 'Enrichment_SRC', status: 'idle' },
        position: { x: 1100, y: 100 },
        draggable: false
    },
    {
        id: 'data_transform_src_comp',
        type: 'custom',
        data: { fullName: 'Data Transform Post Enrichment_SRC', status: 'idle' },
        position: { x: 1300, y: 100 },
        draggable: false
    },
    {
        id: 'combine_data_comp',
        type: 'custom',
        data: { fullName: 'Combine SRC and TGT Data', status: 'idle' },
        position: { x: 1500, y: 250 },
        draggable: false
    },
    {
        id: 'apply_rules_comp',
        type: 'custom',
        data: { fullName: 'Apply Rec Rules & Break Explain', status: 'idle' },
        position: { x: 1700, y: 250 },
        draggable: false
    },
    {
        id: 'output_rules_comp',
        type: 'custom',
        data: { fullName: 'Output Rules', status: 'idle' },
        position: { x: 1900, y: 250 },
        draggable: false
    },
    {
        id: 'break_rolling_comp',
        type: 'custom',
        data: { fullName: 'BreakRolling Details', status: 'idle' },
        position: { x: 2100, y: 250 },
        draggable: false
    },
    // Bottom flow nodes (TGT)
    {
        id: 'pre_harmonisation_tgt_comp',
        type: 'custom',
        data: { fullName: 'Reading & Pre-Harmonisation_TGT', status: 'idle' },
        position: { x: 500, y: 400 },
        draggable: false
    },
    {
        id: 'harmonisation_tgt_comp',
        type: 'custom',
        data: { fullName: 'Harmonisation_TGT', status: 'idle' },
        position: { x: 700, y: 400 },
        draggable: false
    },
    {
        id: 'enrichment_file_search_tgt_comp',
        type: 'custom',
        data: { fullName: 'Enrichment File Search_TGT', status: 'idle' },
        position: { x: 900, y: 400 },
        draggable: false
    },
    {
        id: 'enrichment_tgt_comp',
        type: 'custom',
        data: { fullName: 'Enrichment_TGT', status: 'idle' },
        position: { x: 1100, y: 400 },
        draggable: false
    },
    {
        id: 'data_transform_tgt_comp',
        type: 'custom',
        data: { fullName: 'Data Transform Post Enrichment_TGT', status: 'idle' },
        position: { x: 1300, y: 400 },
        draggable: false
    }
];

// Function to create fresh initial edges for each instance
const createInitialEdges = () => [
    // Initial flow to SRC
    {
        id: 'config-to-read-src',
        source: 'reading_config_comp',
        target: 'read_src_comp',
        sourceHandle: 'reading_config_comp-source',
        targetHandle: 'read_src_comp-target',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    // Initial flow to TGT
    {
        id: 'config-to-file-search-tgt',
        source: 'reading_config_comp',
        target: 'read_tgt_comp',
        sourceHandle: 'reading_config_comp-source',
        targetHandle: 'read_tgt_comp-target',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    // Top flow edges (SRC)
    {
        id: 'read-src-to-pre-harmonisation-src',
        source: 'read_src_comp',
        target: 'pre_harmonisation_src_comp',
        sourceHandle: 'read_src_comp-source',
        targetHandle: 'pre_harmonisation_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'pre-harmonisation-to-harmonisation-src',
        source: 'pre_harmonisation_src_comp',
        target: 'harmonisation_src_comp',
        sourceHandle: 'pre_harmonisation_src_comp-source',
        targetHandle: 'harmonisation_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'harmonisation-to-enrichment-search-src',
        source: 'harmonisation_src_comp',
        target: 'enrichment_file_search_src_comp',
        sourceHandle: 'harmonisation_src_comp-source',
        targetHandle: 'enrichment_file_search_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'enrichment-search-to-enrichment-src',
        source: 'enrichment_file_search_src_comp',
        target: 'enrichment_src_comp',
        sourceHandle: 'enrichment_file_search_src_comp-source',
        targetHandle: 'enrichment_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'enrichment-to-transform',
        source: 'enrichment_src_comp',
        target: 'data_transform_src_comp',
        sourceHandle: 'enrichment_src_comp-source',
        targetHandle: 'data_transform_src_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'transform-to-combine',
        source: 'data_transform_src_comp',
        target: 'combine_data_comp',
        sourceHandle: 'data_transform_src_comp-source',
        targetHandle: 'combine_data_comp-target',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    // Bottom flow edges (TGT)
    {
        id: 'read-tgt-to-pre-harmonisation-tgt',
        source: 'read_tgt_comp',
        target: 'pre_harmonisation_tgt_comp',
        sourceHandle: 'read_tgt_comp-source',
        targetHandle: 'pre_harmonisation_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'pre-harmonisation-to-harmonisation-tgt',
        source: 'pre_harmonisation_tgt_comp',
        target: 'harmonisation_tgt_comp',
        sourceHandle: 'pre_harmonisation_tgt_comp-source',
        targetHandle: 'harmonisation_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'harmonisation-to-enrichment-search-tgt',
        source: 'harmonisation_tgt_comp',
        target: 'enrichment_file_search_tgt_comp',
        sourceHandle: 'harmonisation_tgt_comp-source',
        targetHandle: 'enrichment_file_search_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'enrichment-search-to-enrichment-tgt',
        source: 'enrichment_file_search_tgt_comp',
        target: 'enrichment_tgt_comp',
        sourceHandle: 'enrichment_file_search_tgt_comp-source',
        targetHandle: 'enrichment_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'enrichment-to-transform-tgt',
        source: 'enrichment_tgt_comp',
        target: 'data_transform_tgt_comp',
        sourceHandle: 'enrichment_tgt_comp-source',
        targetHandle: 'data_transform_tgt_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'transform-to-combine-tgt',
        source: 'data_transform_tgt_comp',
        target: 'combine_data_comp',
        sourceHandle: 'data_transform_tgt_comp-source',
        targetHandle: 'combine_data_comp-target',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    // Final flow edges
    {
        id: 'combine-to-rules',
        source: 'combine_data_comp',
        target: 'apply_rules_comp',
        sourceHandle: 'combine_data_comp-source',
        targetHandle: 'apply_rules_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'rules-to-output',
        source: 'apply_rules_comp',
        target: 'output_rules_comp',
        sourceHandle: 'apply_rules_comp-source',
        targetHandle: 'output_rules_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    },
    {
        id: 'output-to-break',
        source: 'output_rules_comp',
        target: 'break_rolling_comp',
        sourceHandle: 'output_rules_comp-source',
        targetHandle: 'break_rolling_comp-target',
        type: 'straight',
        animated: false,
        style: { stroke: '#1e293b', strokeWidth: 2 }
    }
];

// Removed TypeScript type for run parameter validation

// Removed TypeScript type for run parameters

// Define the CustomNode component outside the main component
const CustomNode = memo(({ data, id, nodeOutputs, setSelectedNode, setSelectedTab, setIsBottomBarOpen, setActivePanel }) => {
    const { runNode, resetNodeAndDownstream } = useContext(HandlerContext);
    const [isHovered, setIsHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const isRunning = data.status === 'running';
    const isQueued = data.status === 'queued';
    const canReset = data.status === 'failed' || data.status === 'completed' || data.status === 'stopped' || data.status === 'queued';
    const isSelected = data.selected || false;
    const canRun = data.areParamsApplied && !isRunning && !isQueued;

    // Base node style
    const baseStyle = {
        transition: 'all 0.2s ease',
        border: '2px solid transparent',
        boxShadow: 'none',
        transform: 'scale(1)'
    };

    // Compute node style based on state
    const nodeStyle = {
        ...baseStyle,
        ...(isSelected && styles.selectedNode),
        ...(isHovered && !isSelected && styles.hoveredNode),
        ...(data.style || {}) // Allow for custom styles from parent
    };



    return (
        <div
            className="relative flex flex-col items-center"
            style={nodeStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setShowTooltip(false);
            }}
        >
            <div
                className="relative"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #2a2a2a',      // Enhanced border
                    borderRadius: '50%',
                    width: 68,
                    height: 68,
                    background: 'linear-gradient(145deg, #f0f0f0 0%, #d1d1d1 50%, #b8b8b8 100%)',
                    // boxShadow: `
                    //     0 8px 16px rgba(0,0,0,0.3),
                    //     0 4px 8px rgba(0,0,0,0.2),
                    //     0 2px 4px rgba(0,0,0,0.1),
                    //     inset 0 1px 0 rgba(255,255,255,0.8),
                    //     inset 0 -1px 0 rgba(0,0,0,0.2)
                    // `,
                    transform: 'perspective(500px) rotateX(5deg)',
                }}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        background: '#10b981',
                        border: '2px solid #ffffff',
                        width: '12px',
                        height: '12px',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        top: '50%',
                        left: '-18px',
                        transform: 'translateY(-50%)',
                        position: 'absolute'
                    }}
                    id={`${id}-target`}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    style={{
                        background: '#10b981',
                        border: '2px solid #ffffff',
                        width: '12px',
                        height: '12px',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        top: '50%',
                        right: '-18px',
                        transform: 'translateY(-50%)',
                        position: 'absolute'
                    }}
                    id={`${id}-source`}
                />

                <div
                    style={{
                        border: '4px solid white',    // Middle thick white border
                        borderRadius: '50%',
                        width: 64,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #e8e8e8 100%)',
                        // boxShadow: `
                        //     inset 0 2px 4px rgba(255,255,255,0.9),
                        //     inset 0 -2px 4px rgba(0,0,0,0.1)
                        // `,
                    }}
                >
                    <div
                        style={{
                            background: `
                                radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%),
                                linear-gradient(145deg, rgb(240, 20, 40) 0%, rgb(219, 0, 17) 50%, rgb(180, 0, 14) 100%)
                            `,
                            borderRadius: '50%',
                            width: 60,
                            height: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            // boxShadow: `
                            //     0 4px 8px rgba(219, 0, 17, 0.4),
                            //     0 2px 4px rgba(0,0,0,0.3),
                            //     inset 0 1px 0 rgba(255,255,255,0.3),
                            //     inset 0 -1px 0 rgba(0,0,0,0.2)
                            // `,
                            border: '1px solid rgba(150, 0, 12, 0.8)',
                        }}
                    >
                        {(() => {
                            // Function to get the appropriate icon based on node ID
                            const getNodeIcon = (nodeId) => {
                                // Reading config node
                                if (nodeId === 'reading_config_comp') {
                                    return <UserAttributesIcon size={44} color="white" />;
                                }
                                // File searching/reading nodes
                                else if (nodeId === 'read_src_comp' || nodeId === 'read_tgt_comp') {
                                    return <DocumentSearchIcon size={44} color="white" />;
                                }
                                // Pre-harmonisation nodes (reading & pre-harmonisation)
                                else if (nodeId.includes('pre_harmonisation')) {
                                    return <LibraryBooksIcon size={44} color="white" />;
                                }
                                // Harmonisation nodes (but not pre-harmonisation)
                                else if (nodeId.includes('harmonisation') && !nodeId.includes('pre_harmonisation')) {
                                    return <TableEditIcon size={44} color="white" />;
                                }
                                // Enrichment file search nodes
                                else if (nodeId.includes('enrichment_file_search')) {
                                    return <DocumentSearchIcon size={44} color="white" />;
                                }
                                // Enrichment nodes (but not file search)
                                else if (nodeId.includes('enrichment') && !nodeId.includes('file_search')) {
                                    return <DatasetLinkedIcon size={44} color="white" />;
                                }
                                // Data transform nodes
                                else if (nodeId.includes('data_transform')) {
                                    return <TableConvertIcon size={44} color="white" />;
                                }
                                // Combine data node
                                else if (nodeId === 'combine_data_comp') {
                                    return <StacksIcon size={44} color="white" />;
                                }
                                // Apply rules node
                                else if (nodeId === 'apply_rules_comp') {
                                    return <DataInfoAlertIcon size={44} color="white" />;
                                }
                                // Output rules node
                                else if (nodeId === 'output_rules_comp') {
                                    return <OutputIcon size={44} color="white" />;
                                }
                                // Break rolling node
                                else if (nodeId === 'break_rolling_comp') {
                                    return <ChangeCircleIcon size={44} color="white" />;
                                }
                                // Default fallback
                                else {
                                    return (
                                        <img
                                            src="/nodecubic.png"
                                            alt="Node"
                                            style={{
                                                width: '96%',
                                                height: '96%',
                                                objectFit: 'contain',
                                                background: 'none',
                                            }}
                                        />
                                    );
                                }
                            };

                            const icon = getNodeIcon(id);

                            // If it's an icon component (not the default image), wrap it in the styled container
                            if (typeof icon.type === 'function') {
                                return (
                                    <div style={{
                                        width: '96%',
                                        height: '96%',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(78, 94, 103, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        aspectRatio: '1'
                                    }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {icon}
                                        </div>
                                    </div>
                                );
                            } else {
                                // For the default image, return it as-is
                                return icon;
                            }
                        })()}
                    </div>
                </div>
            </div>
            {/* Status badge below the node */}
            <div className="flex justify-center w-full">
                <div className={`relative -mt-3 z-20 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md
                    ${data.status === 'completed' ? 'bg-green-500' :
                        data.status === 'failed' ? 'bg-red-500' :
                            data.status === 'running' ? 'bg-yellow-400' :
                                data.status === 'queued' ? 'bg-orange-500' :
                                    data.status === 'stopped' ? 'bg-red-500' :
                                        'bg-slate-400'}
                `}>
                    {data.status === 'running' && <FaSpinner className="animate-spin text-white w-3.5 h-3.5" />}
                    {data.status === 'completed' && <FaCheckCircle className="text-white w-3.5 h-3.5" />}
                    {data.status === 'failed' && <FaTimesCircle className="text-white w-3.5 h-3.5" />}
                    {data.status === 'queued' && <FaClock className="text-white w-3.5 h-3.5" />}
                    {data.status === 'stopped' && <FaStop className="text-white w-3.5 h-3.5" />}
                    {data.status === 'standby' && <FaCircle className="text-white/80 w-3.5 h-3.5" />}
                </div>
            </div>


            <div className="text-[10px] text-black mt-1 max-w-[80px] text-center font-medium">{data.fullName}</div>

            {/* Failed Node Indicator Component */}
            <FailedNodeIndicator
                nodeId={id}
                nodeData={data}
                nodeOutputs={nodeOutputs}
                onViewError={(selectedNodeData) => {
                    setSelectedNode(selectedNodeData);
                    setSelectedTab('fail');
                    setIsBottomBarOpen(true);
                    setActivePanel('bottombar');
                }}
            />

            <div className="flex gap-1 mt-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        canRun && runNode(id);
                    }}
                    disabled={!canRun}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[8px] relative
                        ${!canRun
                            ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                        }`}
                >
                    <FaPlay className="w-1.5 h-1.5" />
                    Run
                    {showTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-[8px] 
                            bg-slate-900 text-white rounded whitespace-nowrap z-50">
                            {canRun ? "Click to run node" : isQueued ? "Node is queued" : "Node is running"}
                        </div>
                    )}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onStop?.(id);
                    }}
                    disabled={!isRunning && !isQueued}
                    className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[8px] ${!isRunning && !isQueued
                        ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-red-400'
                        }`}
                >
                    <FaStop className="w-1.5 h-1.5" />
                    Stop
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        resetNodeAndDownstream(id);
                    }}
                    disabled={!canReset && !isRunning && !isQueued}
                    className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[8px] ${!canReset && !isRunning && !isQueued
                        ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                >
                    <FaUndo className="w-1.5 h-1.5" />
                    Reset
                </button>
            </div>
        </div>
    );
});

// Utility function to safely manage localStorage quota
const safeLocalStorageSet = (key, value) => {
    try {
        // Check if the value is too large (localStorage has ~5-10MB limit)
        const sizeInBytes = new Blob([value]).size;
        const maxSize = 4 * 1024 * 1024; // 4MB limit

        if (sizeInBytes > maxSize) {
            console.warn(`Data too large for localStorage (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB), skipping save`);
            return false;
        }

        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, attempting to free space...');

            // Clear old data to free space (more aggressive cleanup)
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('nodeOutputs_') || key.includes('nodes_') || key.includes('processIds_'))) {
                    keysToRemove.push(key);
                }
            }

            // Remove oldest keys first
            keysToRemove.slice(0, Math.floor(keysToRemove.length / 2)).forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    console.warn('Failed to remove key:', key);
                }
            });

            // Try again after cleanup
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (retryError) {
                console.warn('Still failed to save to localStorage after cleanup');
                return false;
            }
        }
        console.warn('Failed to save to localStorage:', error);
        return false;
    }
};

export default function CompletenessControl({ instanceId }) {
    // Define instance-specific localStorage keys
    const paramKey = `${CONSTANTS.STORAGE_KEYS.PARAMS}_${instanceId || 'default'}`;
    const nodeOutputsKey = `${CONSTANTS.STORAGE_KEYS.NODE_OUTPUTS}_${instanceId || 'default'}`;
    const nodesKey = `${CONSTANTS.STORAGE_KEYS.NODES}_${instanceId || 'default'}`;
    const processIdsKey = `${CONSTANTS.STORAGE_KEYS.PROCESS_IDS}_${instanceId || 'default'}`;
    const uiStateKey = `${CONSTANTS.STORAGE_KEYS.UI_STATE}_${instanceId || 'default'}`;

    // Restore UI state from localStorage
    const getStoredUIState = () => {
        const saved = localStorage.getItem(uiStateKey);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return {};
            }
        }
        return {};
    };

    const storedUIState = getStoredUIState();

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(CONSTANTS.DEFAULT_SIDEBAR_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [isBottomBarOpen, setIsBottomBarOpen] = useState(storedUIState.isBottomBarOpen || false);
    const [activePanel, setActivePanel] = useState(storedUIState.activePanel || null);
    const [bottomBarHeight, setBottomBarHeight] = useState(() => {
        // Desktop-optimized initial height
        if (typeof window !== 'undefined') {
            const vh = window.innerHeight;
            return Math.min(Math.max(vh * 0.4, 300), vh * 0.7); // 40-70% of viewport height for desktop
        }
        return 400; // desktop fallback
    });
    const [isResizingBottom, setIsResizingBottom] = useState(false);
    const [selectedNode, setSelectedNode] = useState(storedUIState.selectedNode || null);
    const [selectedTab, setSelectedTab] = useState(storedUIState.selectedTab || 'data');
    const [dataViewLocked, setDataViewLocked] = useState(false); // Track if data view is locked open
    const [areParamsApplied, setAreParamsApplied] = useState(() => {
        const saved = localStorage.getItem(paramKey);
        if (!saved) return false;
        try {
            const params = JSON.parse(saved);
            return Object.values(params).every(v => v && String(v).trim() !== '');
        } catch {
            return false;
        }
    });
    const resizeRef = useRef(null);
    const minWidth = CONSTANTS.MIN_SIDEBAR_WIDTH;
    const maxWidth = CONSTANTS.MAX_SIDEBAR_WIDTH;
    const minHeight = CONSTANTS.MIN_BOTTOM_BAR_HEIGHT;  // Desktop minimum height
    const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 800;  // Max 80% of viewport for desktop
    const nodeTimeouts = useRef({});
    const [runParams, setRunParams] = useState(() => {
        const saved = localStorage.getItem(paramKey);
        return saved
            ? JSON.parse(saved)
            : {
                expectedRunDate: '',
                inputConfigFilePath: '',
                inputConfigFilePattern: '',
                rootFileDir: '',
                runEnv: '',
                tempFilePath: ''
            };
    });
    const [processIds, setProcessIds] = useState(() => {
        const savedProcessIds = localStorage.getItem(processIdsKey);
        if (savedProcessIds) {
            try {
                return JSON.parse(savedProcessIds);
            } catch {
                return {};
            }
        }
        return {};
    });
    const [isRunningAll, setIsRunningAll] = useState(false);
    const [invalidFields, setInvalidFields] = useState(new Set());
    const [validatedParams, setValidatedParams] = useState(null);
    const [selectedNodes] = useState(new Set());

    // Synchronous ref for node outputs to avoid async state issues
    const nodeOutputsRef = useRef({});

    const [nodeOutputs, setNodeOutputs] = useState(() => {
        const savedOutputs = localStorage.getItem(nodeOutputsKey);
        if (savedOutputs) {
            try {
                const parsed = JSON.parse(savedOutputs);
                // Initialize the ref with restored data
                nodeOutputsRef.current = parsed;
                console.log('🔄 Restored node outputs from localStorage:', Object.keys(parsed));
                // Log table sizes for verification
                Object.entries(parsed).forEach(([nodeId, output]) => {
                    if (output?.calculation_results?.table_size) {
                        console.log(`   - ${nodeId}: ${output.calculation_results.table_size}`);
                    }
                });
                return parsed;
            } catch (error) {
                console.warn('Failed to parse saved node outputs:', error);
                return {};
            }
        }
        return {};
    });

    // Keep ref synchronized with state
    useEffect(() => {
        nodeOutputsRef.current = nodeOutputs;
    }, [nodeOutputs]);

    // Helper function to update both state and ref simultaneously
    const updateNodeOutput = useCallback((nodeId, output) => {
        nodeOutputsRef.current = { ...nodeOutputsRef.current, [nodeId]: output };
        setNodeOutputs(prev => ({ ...prev, [nodeId]: output }));
    }, []);

    const cancelledNodesRef = useRef(new Set());
    const forceUpdate = useState({})[1];

    // Add validation state
    const [paramValidation, setParamValidation] = useState({
        isValid: false,
        message: 'Please fill all required parameters'
    });

    // Add this at the top level of CompletenessControl, with other useState hooks

    const [histogramFilterType, setHistogramFilterType] = useState('contains');
    const [histogramFilterValue, setHistogramFilterValue] = useState('');

    // Column selector for Data Output tab


    // Restore nodes from localStorage if available, otherwise use initialNodes
    const restoredNodes = (() => {
        const saved = localStorage.getItem(nodesKey);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                // fallback to initialNodes
            }
        }
        return createInitialNodes();
    })();
    const [nodes, setNodes, onNodesChange] = useNodesState(
        restoredNodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                areParamsApplied,
                nodeOutputs,
                setSelectedNode
            }
        }))
    );

    const [edges, setEdges, onEdgesChange] = useEdgesState(createInitialEdges());

    // Create refs for edges to avoid dependency issues in onStop
    const edgesRef = useRef(edges);
    const setEdgesRef = useRef(setEdges);

    // Update edges ref when edges change
    useEffect(() => {
        edgesRef.current = edges;
        setEdgesRef.current = setEdges;
    }, [edges, setEdges]);

    // Build dependency and downstream maps from edges
    const dependencyMap = useMemo(() => buildDependencyMap(edges), [edges]);
    const downstreamMap = useMemo(() => buildDownstreamMap(edges), [edges]);

    // Helper: get node status map
    const nodeStatusMap = useMemo(() => {
        const map = {};
        nodes.forEach(n => { map[n.id] = n.data.status; });
        return map;
    }, [nodes]);

    // Use validatedParams and selectedNodes for debugging and state tracking
    useEffect(() => {
        if (validatedParams) {
            console.log('📋 Validated parameters updated:', Object.keys(validatedParams));
        }
    }, [validatedParams]);

    useEffect(() => {
        if (selectedNodes.size > 0) {
            console.log('🎯 Selected nodes updated:', Array.from(selectedNodes));
        }
    }, [selectedNodes]);

    // Memoize data transformations for AgGridTable with better optimization


    const updateNodeStatus = useCallback((nodeId, status) => {
        console.log(`Node ${nodeId} status updated to: ${status}`);

        // Update node status
        setNodes(nds => nds.map(node =>
            node.id === nodeId
                ? { ...node, data: { ...node.data, status } }
                : node
        ));

        // Update edge colors and labels based on source node status
        setEdges(eds => eds.map(edge => {
            if (edge.source === nodeId) {
                const sourceOutput = nodeOutputs?.[nodeId];
                // sourceOutput is used for data processing but not directly referenced
                // Use the count field from backend response (total rows generated)
                // instead of table length (frontend-limited rows)
                const rowCount = sourceOutput?.count ? parseInt(sourceOutput.count) :
                    sourceOutput?.calculation_results?.table?.length;

                return {
                    ...edge,
                    style: {
                        ...edge.style,
                        stroke: status === 'completed' ? '#22c55e' :
                            status === 'queued' ? '#f97316' : '#1e293b'
                    },
                    label: status === 'completed' && rowCount && rowCount > 0 ?
                        rowCount.toLocaleString() : undefined,
                    labelStyle: {
                        fill: '#1f2937',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        cursor: 'pointer'
                    },
                    labelBgStyle: {
                        fill: '#ffffff',
                        fillOpacity: 0.95,
                        stroke: '#3b82f6',
                        strokeWidth: 2,
                        cursor: 'pointer'
                    },
                    labelBgPadding: [6, 12],
                    labelBgBorderRadius: 6
                };
            }
            return edge;
        }));
    }, [setNodes, setEdges, nodeOutputs]);

    // Function to handle connections
    const onConnect = useCallback((params) => {
        // Add source and target handles to the connection
        const connection = {
            ...params,
            sourceHandle: `${params.source}-source`,
            targetHandle: `${params.target}-target`
        };
        setEdges((eds) => addEdge(connection, eds));
    }, [setEdges]);

    // Handle edge click to show data view
    const onEdgeClick = useCallback((event, edge) => {
        event.stopPropagation();

        // Only show data view if edge has a label (meaning it has data)
        if (edge.label) {
            const sourceNodeId = edge.source;
            const sourceNode = nodes.find(n => n.id === sourceNodeId);

            if (sourceNode && sourceNode.data.status === 'completed') {
                const output = (nodeOutputs && nodeOutputs[sourceNodeId]) ? nodeOutputs[sourceNodeId] : {};

                // Batch state updates to prevent flickering
                setTimeout(() => {
                    setSelectedNode({
                        id: sourceNodeId,
                        data: {
                            ...sourceNode.data,
                            output
                        }
                    });
                    setSelectedTab('data');
                    setIsBottomBarOpen(true);
                    setActivePanel('bottombar');
                    setDataViewLocked(true); // Lock the data view open
                }, 0);
            }
        }
    }, [nodes, nodeOutputs, setSelectedNode, setSelectedTab, setIsBottomBarOpen, setActivePanel]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            Object.values(nodeTimeouts.current).forEach(timeout => clearTimeout(timeout));
        };
    }, []);

    const handleParamChange = (param, value) => {
        // Clean the input value by trimming whitespace
        const cleanValue = value.trim();

        setRunParams(prev => ({
            ...prev,
            [param]: cleanValue
        }));

        // Clear the error state for this field when user types
        if (invalidFields.has(param)) {
            const newInvalidFields = new Set(invalidFields);
            newInvalidFields.delete(param);
            setInvalidFields(newInvalidFields);
        }
    };

    const validateParameters = useCallback(() => {
        const newInvalidFields = new Set();
        let hasErrors = false;

        // Check each parameter for empty or whitespace-only values
        Object.entries(runParams).forEach(([key, value]) => {
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                newInvalidFields.add(key);
                hasErrors = true;
                console.log(`❌ Validation Error: ${key} is empty or contains only whitespace`);
            }
        });

        setInvalidFields(newInvalidFields);

        setParamValidation({
            isValid: !hasErrors,
            message: hasErrors ? 'Please fill in all required fields' : 'Parameters are valid'
        });

        if (!hasErrors) {
            console.log('✅ All parameters are valid:', runParams);
            const success = safeLocalStorageSet(paramKey, JSON.stringify(runParams));
            if (!success) {
                console.warn('Failed to save parameters to localStorage');
            }
            setValidatedParams(runParams);
            setAreParamsApplied(true);
        } else {
            try {
                localStorage.removeItem(paramKey);
            } catch (error) {
                console.warn('Failed to remove parameters from localStorage:', error);
            }
            setAreParamsApplied(false);
        }

        return !hasErrors;
    }, [runParams, paramKey]);

    const handleApplyParams = useCallback(() => {
        const isValid = validateParameters();
        if (!isValid) {
            console.log('⚠️ Parameter validation failed. Please check highlighted fields.');
            setAreParamsApplied(false);
            return false;
        }
        setAreParamsApplied(true);
        return true;
    }, [validateParameters]);

    // Update the getInputStyle function to use emerald text color
    const getInputStyle = (fieldName) => {
        const baseStyle = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-sm text-black placeholder-white focus:ring-black bg-white";
        return invalidFields.has(fieldName)
            ? `${baseStyle} border-red-500 bg-red-50 focus:ring-red-200`
            : `${baseStyle} border-gray-300`;
    };

    // Parameter input fields JSX
    const renderParameterInputs = () => (
        <div className="space-y-4">
            {Object.entries(runParams).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                    <label className="text-sm font-bold text-black mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                        {invalidFields.has(key) && (
                            <span className="text-red-500 ml-1">*</span>
                        )}
                    </label>
                    {key === 'runEnv' ? (
                        <select
                            value={value || ''}
                            onChange={(e) => handleParamChange(key, e.target.value)}
                            className={`${getInputStyle(key)} text-black`}
                        >
                            <option value="" className="text-black text-xs">Select Environment</option>
                            <option value="development" className="text-black">Development</option>
                            <option value="staging" className="text-black">Staging</option>
                            <option value="production" className="text-black">Production</option>
                            <option value="TEST_FAILURE" className="text-black text-red-600 font-semibold">🧪 TEST_FAILURE (Simulate Error)</option>
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => handleParamChange(key, e.target.value)}
                            className={getInputStyle(key)}
                            onFocus={() => {
                                if (invalidFields.has(key)) {
                                    const newInvalidFields = new Set(invalidFields);
                                    newInvalidFields.delete(key);
                                    setInvalidFields(newInvalidFields);
                                }
                            }}
                            placeholder={`Enter ${(key.charAt(0).toUpperCase() + key.slice(1)).replace(/([A-Z])/g, ' $1')}`}
                        />
                    )}
                    {invalidFields.has(key) && (
                        <p className="mt-1 text-xs text-red-500">
                            This field is required
                        </p>
                    )}
                </div>
            ))}
        </div>
    );

    // Function to reset all nodes
    const resetAllNodes = useCallback(() => {
        // Clear all node outputs from localStorage
        localStorage.removeItem(nodeOutputsKey);
        setNodeOutputs({});

        // Reset all process IDs
        setProcessIds({});
        localStorage.removeItem(processIdsKey);

        // Reset UI state
        setIsBottomBarOpen(false);
        setActivePanel(null);
        setSelectedNode(null);
        setSelectedTab('data');
        localStorage.removeItem(uiStateKey);

        // Reset all node statuses to idle and clear all visual states
        setNodes(nds => nds.map(node => ({
            ...node,
            data: {
                ...node.data,
                status: 'idle',
                output: undefined,
                selected: false,
                style: undefined // Clear any custom styles
            },
            style: undefined, // Clear node-level styles
            selected: false // Clear ReactFlow's internal selection state
        })));

        // Clear any running timeouts
        Object.values(nodeTimeouts.current).forEach(timeout => {
            clearInterval(timeout);
        });
        nodeTimeouts.current = {};

        // Clear selected nodes (not needed as this state was removed)

        // Clear selected node in output panel
        setSelectedNode(null);

        // Cancel all running/cancelled nodes
        cancelledNodesRef.current = new Set();
        forceUpdate({});

        console.log('🧹 Reset all nodes and cleared all data');
    }, [setNodes, nodeOutputsKey, forceUpdate, processIdsKey, uiStateKey]);

    // Function to run nodes in sequence
    const runAllNodes = async () => {
        if (!areParamsApplied) {
            console.log('❌ Cannot run all nodes: Parameters have not been applied');
            return;
        }

        // Get parameters from localStorage
        const storedParams = localStorage.getItem(paramKey);
        if (!storedParams) {
            console.log('❌ Cannot run all nodes: No validated parameters found');
            setAreParamsApplied(false);
            return;
        }

        setIsRunningAll(true);
        const nodeSequence = [
            // Top flow
            'reading_config_comp',
            'read_src_comp',
            'pre_harmonisation_src_comp',
            'harmonisation_src_comp',
            'enrichment_file_search_src_comp',
            'enrichment_src_comp',
            'data_transform_src_comp',
            // Bottom flow
            'read_tgt_comp',
            'pre_harmonisation_tgt_comp',
            'harmonisation_tgt_comp',
            'enrichment_file_search_tgt_comp',
            'enrichment_tgt_comp',
            'data_transform_tgt_comp',
            // Final flow
            'combine_data_comp',
            'apply_rules_comp',
            'output_rules_comp',
            'break_rolling_comp'
        ];

        try {
            for (const nodeId of nodeSequence) {
                const node = nodes.find(n => n.id === nodeId);
                if (node?.data.onRun) {
                    await new Promise((resolve, reject) => {
                        let checkInterval;

                        const checkStatus = () => {
                            // Check if node has been cancelled
                            if (cancelledNodesRef.current.has(nodeId)) {
                                console.log(`🛑 Node ${nodeId} was cancelled during sequential execution, stopping polling`);
                                clearInterval(checkInterval);
                                resolve(); // Resolve instead of reject to continue with next nodes
                                return;
                            }

                            const currentNode = nodes.find(n => n.id === nodeId);
                            if (currentNode?.data.status === 'completed') {
                                console.log(`✅ Node ${nodeId} completed in sequential execution`);
                                clearInterval(checkInterval);
                                resolve();
                            } else if (currentNode?.data.status === 'failed') {
                                console.log(`❌ Node ${nodeId} failed in sequential execution`);
                                clearInterval(checkInterval);
                                reject(new Error(`Node ${nodeId} failed`));
                            } else if (currentNode?.data.status === 'stopped') {
                                console.log(`🛑 Node ${nodeId} was stopped/terminated in sequential execution`);
                                clearInterval(checkInterval);
                                resolve(); // Resolve instead of reject to continue with next nodes
                            } else {
                                console.log(`⏳ Node ${nodeId} still running in sequential execution (${currentNode?.data.status})`);
                            }
                        };

                        node.data.onRun(nodeId);
                        checkInterval = setInterval(checkStatus, 5000); // Changed to 5 seconds
                    });
                }
            }
        } catch (error) {
            console.error('Error in sequential execution:', error);
        } finally {
            setIsRunningAll(false);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing && !isResizingBottom) return;

            if (isResizingBottom) {
                const height = document.documentElement.clientHeight - e.clientY;
                const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight);
                setBottomBarHeight(clampedHeight);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setIsResizingBottom(false);
        };

        if (isResizing || isResizingBottom) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isResizingBottom, minHeight, maxHeight]);

    // Handle window resize for desktop optimization
    useEffect(() => {
        const handleWindowResize = () => {
            const vh = window.innerHeight;
            const newMaxHeight = vh * 0.8;
            const newMinHeight = 300; // Desktop minimum

            // Adjust bottom bar height if it's outside the new bounds
            setBottomBarHeight(prev => {
                if (prev > newMaxHeight) return newMaxHeight;
                if (prev < newMinHeight) return newMinHeight;
                return prev;
            });
        };

        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, []);

    // Update localStorage whenever nodeOutputs changes
    useEffect(() => {
        try {
            // Store complete data including 100x1000 tables (smaller than 200x1000)
            const compressedOutputs = {};

            Object.keys(nodeOutputs).forEach(nodeId => {
                const output = nodeOutputs[nodeId];
                if (output) {
                    compressedOutputs[nodeId] = {
                        ...output,
                        calculation_results: output.calculation_results ? {
                            headers: output.calculation_results.headers,
                            // Store complete table data (100x1000 is manageable in localStorage)
                            table: output.calculation_results.table || [],
                            // Add metadata to track data completeness
                            table_size: output.calculation_results.table ?
                                `${output.calculation_results.headers?.length || 0}x${output.calculation_results.table.length || 0}` : '0x0'
                        } : output.calculation_results
                    };
                }
            });

            const success = safeLocalStorageSet(nodeOutputsKey, JSON.stringify(compressedOutputs));
            if (success) {
                console.log('💾 Saved complete node outputs to localStorage (100x1000 tables included)');
            }
        } catch (error) {
            console.warn('Failed to save complete node outputs, trying lightweight version:', error);
            // Fallback: try saving without table data
            try {
                const lightweightOutputs = {};
                Object.keys(nodeOutputs).forEach(nodeId => {
                    const output = nodeOutputs[nodeId];
                    if (output) {
                        lightweightOutputs[nodeId] = {
                            ...output,
                            calculation_results: output.calculation_results ? {
                                headers: output.calculation_results.headers,
                                table: [], // Fallback: empty table
                                table_size: output.calculation_results.table ?
                                    `${output.calculation_results.headers?.length || 0}x${output.calculation_results.table.length || 0}` : '0x0'
                            } : output.calculation_results
                        };
                    }
                });

                const fallbackSuccess = safeLocalStorageSet(nodeOutputsKey, JSON.stringify(lightweightOutputs));
                if (fallbackSuccess) {
                    console.log('💾 Saved lightweight node outputs to localStorage (fallback mode)');
                }
            } catch (fallbackError) {
                console.warn('Failed to save even lightweight data:', fallbackError);
            }
        }
    }, [nodeOutputs, nodeOutputsKey]);

    // Update localStorage whenever processIds changes
    useEffect(() => {
        try {
            safeLocalStorageSet(processIdsKey, JSON.stringify(processIds));
            console.log('💾 Saved process IDs to localStorage');
        } catch (error) {
            console.warn('Failed to save process IDs:', error);
        }
    }, [processIds, processIdsKey]);

    // Update localStorage whenever UI state changes
    useEffect(() => {
        const uiState = {
            isBottomBarOpen,
            activePanel,
            selectedNode,
            selectedTab
        };
        try {
            safeLocalStorageSet(uiStateKey, JSON.stringify(uiState));
            console.log('💾 Saved UI state to localStorage');
        } catch (error) {
            console.warn('Failed to save UI state:', error);
        }
    }, [isBottomBarOpen, activePanel, selectedNode, selectedTab, uiStateKey]);



    // Update the onSelectionChange handler
    const onSelectionChange = useCallback(({ nodes: selectedNodesArr }) => {
        const selectedIds = new Set(selectedNodesArr.map(n => n.id));

        // Update nodes with selection state
        setNodes(nds => nds.map(node => ({
            ...node,
            data: {
                ...node.data,
                selected: selectedIds.has(node.id)
            }
        })));

        // Only clear selectedNode if data view is not locked
        if (!dataViewLocked) {
            setSelectedNode(null);
        }
    }, [setNodes, dataViewLocked]);

    // Refactored runNodeWithDependencies to pass previousOutputs down the chain
    const runNodeWithDependencies = useCallback(async (
        nodeId,
        runNodeFn,
        dependencyMap,
        nodeStatusMap,
        nodeOutputs,
        alreadyRun = new Set(),
        path = []
    ) => {
        // Cancel if node is in cancelledNodes
        if (cancelledNodesRef.current.has(nodeId)) {
            console.log(`Node ${nodeId} dependency run cancelled.`);
            return;
        }
        if (alreadyRun.has(nodeId) || nodeStatusMap[nodeId] === 'completed') return nodeOutputs[nodeId];
        if (path.includes(nodeId)) throw new Error(`Cycle detected: ${[...path, nodeId].join(' -> ')}`);

        // Set node to queued status if it has dependencies and is not already running
        const deps = dependencyMap[nodeId] || [];
        if (deps.length > 0 && nodeStatusMap[nodeId] !== 'running') {
            updateNodeStatus(nodeId, 'queued');
        }

        let prevOutputs = { ...nodeOutputs };
        for (let dep of deps) {
            const depOutput = await runNodeWithDependencies(dep, runNodeFn, dependencyMap, nodeStatusMap, prevOutputs, alreadyRun, [...path, nodeId]);
            prevOutputs[dep] = depOutput;
        }
        // Now run the node, passing prevOutputs
        if (cancelledNodesRef.current.has(nodeId)) {
            console.log(`Node ${nodeId} run cancelled (post-deps).`);
            return;
        }
        const output = await runNodeFn(nodeId, prevOutputs);
        alreadyRun.add(nodeId);
        return output;
    }, [updateNodeStatus]);

    // Enhanced node runner with detailed logging and proper failed node handling
    const runNodeAndWait = useCallback(async (nodeId) => {
        console.log(`🚀 Starting runNodeAndWait for node: ${nodeId}`);
        
        try {
            // Check if node is already running
            const currentNode = nodes.find(n => n.id === nodeId);
            if (currentNode?.data.status === 'running') {
                console.log(`⚠️ Node ${nodeId} is already running, skipping...`);
                return null;
            }

            console.log(`📋 Preparing to run node: ${nodeId}`);
            
            // Get node outputs for previous steps with proper validation
            const previousOutputs = {};
            const dependencies = dependencyMap[nodeId] || [];
            
            console.log(`🔗 Dependencies for ${nodeId}:`, dependencies);
            
            // Validate that all dependencies completed successfully
            for (const depId of dependencies) {
                const depNode = nodes.find(n => n.id === depId);
                if (!depNode) {
                    console.error(`❌ Dependency node ${depId} not found`);
                    updateNodeStatus(nodeId, 'failed');
                    return null;
                }
                
                // Check if dependency has output using synchronous ref
                const depOutput = nodeOutputsRef.current[depId];
                
                if (!depOutput) {
                    console.error(`❌ Dependency ${depId} has no output (not completed)`);
                    console.log(`🔍 Available outputs in ref:`, Object.keys(nodeOutputsRef.current));
                    console.log(`🔍 Available outputs in state:`, Object.keys(nodeOutputs));
                    updateNodeStatus(nodeId, 'failed');
                    return null;
                }
                
                // Validate that the dependency output is successful
                if (depOutput.status === 'failed' || depOutput.fail_message) {
                    console.error(`❌ Dependency ${depId} failed: ${depOutput.fail_message}`);
                    updateNodeStatus(nodeId, 'failed');
                    return null;
                }
                
                console.log(`✅ Dependency ${depId} completed successfully`);
                
                // Add the dependency output to previous outputs
                previousOutputs[depId] = depOutput;
                console.log(`📤 Added previous output from ${depId} to ${nodeId}`);
            }

            // Prepare input parameters with proper structure for enhanced ETL
            const input = {
                nodeId: nodeId,
                parameters: validatedParams,
                previousOutputs: Object.keys(previousOutputs).length > 0 ? previousOutputs : null,
                customParams: {
                    step_type: nodeId,
                    timestamp: new Date().toISOString()
                }
            };

            console.log(`📤 Sending request for node ${nodeId}:`, {
                nodeId: input.nodeId,
                hasPreviousOutputs: !!input.previousOutputs,
                previousOutputKeys: input.previousOutputs ? Object.keys(input.previousOutputs) : [],
                customParams: input.customParams
            });

            // Start the calculation
            const response = await ApiService.startCalculation(input);
            console.log(`✅ Started calculation for ${nodeId}:`, response);

            // Store process ID
            setProcessIds(prev => ({ ...prev, [nodeId]: response.process_id }));
            console.log(`💾 Stored process ID for ${nodeId}: ${response.process_id}`);

            // Update node status to running
            updateNodeStatus(nodeId, 'running');
            console.log(`🔄 Updated ${nodeId} status to 'running'`);

            // Poll for completion with enhanced logging and failed status handling
            const pollInterval = 5000; // 5 seconds
            let pollCount = 0;

            console.log(`⏰ Starting polling for ${nodeId} - Interval: ${pollInterval}ms (No max attempts)`);

            while (true) {
                pollCount++;
                console.log(`🔄 Polling status for node ${nodeId} (Process ID: ${response.process_id}) - Attempt ${pollCount}`);
                
                // Check if node has been cancelled
                if (cancelledNodesRef.current.has(nodeId)) {
                    console.log(`🛑 Node ${nodeId} was cancelled, stopping polling`);
                    updateNodeStatus(nodeId, 'stopped');
                    return null;
                }
                
                // Check if node status is already stopped (from onStop function)
                const currentNode = nodes.find(n => n.id === nodeId);
                if (currentNode?.data.status === 'stopped') {
                    console.log(`🛑 Node ${nodeId} is already stopped, stopping polling`);
                    return null;
                }
                
                try {
                    const status = await ApiService.getProcessStatus(response.process_id);
                    console.log(`📊 Status response for ${nodeId}:`, {
                        process_id: status.process_id,
                        status: status.status,
                        hasOutput: !!status.output,
                        hasError: !!status.error,
                        pollCount: pollCount
                    });

                    if (status.status === 'completed') {
                        console.log(`✅ Node ${nodeId} completed successfully!`);
                        
                        // Get the output
                        try {
                            const output = await ApiService.getProcessOutput(response.process_id);
                            console.log(`📥 Retrieved output for ${nodeId}:`, {
                                hasOutput: !!output,
                                outputType: typeof output,
                                outputKeys: output ? Object.keys(output) : null
                            });
                            
                            // Validate the output before storing
                            if (output && output.status === 'failed') {
                                console.error(`❌ Node ${nodeId} returned failed status in output`);
                                updateNodeStatus(nodeId, 'failed');
                                updateNodeOutput(nodeId, output);
                                return null;
                            }
                            
                            if (output && output.fail_message) {
                                console.error(`❌ Node ${nodeId} has fail message: ${output.fail_message}`);
                                updateNodeStatus(nodeId, 'failed');
                                updateNodeOutput(nodeId, output);
                                return null;
                            }
                            
                            updateNodeOutput(nodeId, output);
                            console.log(`💾 Stored output for ${nodeId}`);
                            
                            updateNodeStatus(nodeId, 'completed');
                            console.log(`✅ Updated ${nodeId} status to 'completed'`);
                            
                            return output;
                        } catch (outputError) {
                            console.error(`❌ Error getting output for ${nodeId}:`, outputError);
                            updateNodeStatus(nodeId, 'failed');
                            console.log(`❌ Updated ${nodeId} status to 'failed' due to output error`);
                            break;
                        }
                    } else if (status.status === 'failed') {
                        console.error(`❌ Node ${nodeId} failed:`, status.error);
                        updateNodeStatus(nodeId, 'failed');
                        console.log(`❌ Updated ${nodeId} status to 'failed'`);
                        
                        // Store the error output for display
                        updateNodeOutput(nodeId, { 
                            status: 'failed', 
                            fail_message: status.error || 'Unknown error occurred',
                            execution_logs: [`Node ${nodeId} failed: ${status.error}`]
                        });
                        break;
                    } else if (status.status === 'terminated') {
                        console.log(`🛑 Node ${nodeId} was terminated - STOPPING POLLING`);
                        updateNodeStatus(nodeId, 'stopped');
                        console.log(`🛑 Updated ${nodeId} status to 'stopped' due to termination`);
                        console.log(`🛑 Breaking out of polling loop for ${nodeId}`);
                        break;
                    } else if (status.status === 'running') {
                        console.log(`⏳ Node ${nodeId} still running... (${status.status}) - Poll count: ${pollCount}`);
                        await new Promise(res => setTimeout(res, pollInterval));
                    } else {
                        console.log(`❓ Unknown status for ${nodeId}: ${status.status} - continuing to poll`);
                        await new Promise(res => setTimeout(res, pollInterval));
                    }
                } catch (error) {
                    console.error(`❌ Error polling node ${nodeId}:`, error);
                    console.error(`❌ Error details:`, {
                        message: error.message,
                        stack: error.stack,
                        pollCount: pollCount
                    });
                    
                    // Only set to failed if the node is not idle and not cancelled
                    if (!cancelledNodesRef.current.has(nodeId)) {
                        setNodes(nds => nds.map(node =>
                            node.id === nodeId && node.data.status !== 'idle'
                                ? { ...node, data: { ...node.data, status: 'failed' } }
                                : node
                        ));
                        console.log(`❌ Set ${nodeId} status to 'failed' due to polling error`);
                    } else {
                        console.log(`🛑 Node ${nodeId} was cancelled during error, not setting to failed`);
                    }
                    break; // Exit the loop on error
                }
            }
            
            return null;
        } catch (error) {
            console.error(`❌ Error in runNodeAndWait for ${nodeId}:`, error);
            console.error(`❌ Error details:`, {
                message: error.message,
                stack: error.stack,
                nodeId: nodeId
            });
            
            // Only set to failed if the node is not idle
            setNodes(nds => nds.map(node =>
                node.id === nodeId && node.data.status !== 'idle'
                    ? { ...node, data: { ...node.data, status: 'failed' } }
                    : node
            ));
            console.log(`❌ Set ${nodeId} status to 'failed' due to execution error`);
        }
    }, [nodes, setNodes, updateNodeStatus, updateNodeOutput, dependencyMap, nodeOutputs, validatedParams]);

    // Chain-dependency aware node runner with enhanced failed node handling
    const runNode = useCallback(async (nodeId) => {
        cancelledNodesRef.current = new Set();
        try {
            // Check if any dependencies have failed
            const dependencies = dependencyMap[nodeId] || [];
            for (const depId of dependencies) {
                const depNode = nodes.find(n => n.id === depId);
                if (depNode && depNode.data.status === 'failed') {
                    console.error(`❌ Cannot run ${nodeId}: dependency ${depId} has failed`);
                    updateNodeStatus(nodeId, 'failed');
                    return;
                }
            }
            
            await runNodeWithDependencies(
                nodeId,
                runNodeAndWait,
                dependencyMap,
                nodeStatusMap,
                nodeOutputs
            );
        } catch (err) {
            console.error(`❌ Error in runNode for ${nodeId}:`, err);
            updateNodeStatus(nodeId, 'failed');
            alert(err instanceof Error ? err.message : String(err));
        }
    }, [dependencyMap, nodeStatusMap, runNodeAndWait, nodeOutputs, runNodeWithDependencies, nodes, updateNodeStatus]);

    // Downstream reset logic
    const resetNodeAndDownstream = useCallback(async (nodeId) => {
        const toReset = Array.from(getAllDownstreamNodes(nodeId, downstreamMap));
        toReset.push(nodeId); // include the node itself
        // Add all to cancelledNodesRef
        toReset.forEach(id => cancelledNodesRef.current.add(id));

        // Reset nodes
        for (const id of toReset) {
            if (processIds[id]) {
                try { await ApiService.resetProcess(processIds[id]); } catch { }
            }
            if (nodeTimeouts.current[id]) {
                clearInterval(nodeTimeouts.current[id]);
                delete nodeTimeouts.current[id];
            }
            updateNodeStatus(id, 'idle');
            setNodeOutputs(prev => {
                const updated = { ...prev };
                delete updated[id];
                // localStorage is now handled by useEffect with lightweight data
                return updated;
            });
        }

        // Reset edge colors and labels for all affected edges
        setEdges(eds => eds.map(edge => {
            if (toReset.includes(edge.source)) {
                return {
                    ...edge,
                    style: {
                        ...edge.style,
                        stroke: '#1e293b'
                    },
                    label: undefined, // Clear the data count label
                    labelStyle: undefined,
                    labelBgStyle: undefined
                };
            }
            return edge;
        }));
    }, [downstreamMap, processIds, updateNodeStatus, setNodeOutputs, setEdges]);

    // Update nodes when areParamsApplied changes
    useEffect(() => {
        setNodes(nodes => nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                areParamsApplied
            }
        })));
    }, [areParamsApplied, setNodes]);

    // Update edge labels when nodeOutputs change
    useEffect(() => {
        setEdges(eds => eds.map(edge => {
            const sourceOutput = nodeOutputs && nodeOutputs[edge.source];
            // Use the count field from backend response (total rows generated)
            // instead of table length (frontend-limited rows)
            const rowCount = sourceOutput?.count ? parseInt(sourceOutput.count) :
                sourceOutput?.calculation_results?.table?.length;
            const sourceNode = nodes.find(n => n.id === edge.source);
            const sourceStatus = sourceNode?.data?.status;

            return {
                ...edge,
                label: sourceStatus === 'completed' && rowCount && rowCount > 0 ?
                    rowCount.toLocaleString() : undefined,
                labelStyle: {
                    fill: '#1f2937',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    cursor: 'pointer'
                },
                labelBgStyle: {
                    fill: '#ffffff',
                    fillOpacity: 0.95,
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    cursor: 'pointer'
                },
                labelBgPadding: [6, 12],
                labelBgBorderRadius: 6
            };
        }));
    }, [nodeOutputs, nodes, setEdges]);

    // Define nodeTypes with the required props
    const nodeTypes = useMemo(() => ({
        custom: (props) => (
            <CustomNode
                {...props}
                nodeOutputs={nodeOutputs}
                setSelectedNode={setSelectedNode}
                setSelectedTab={setSelectedTab}
                setIsBottomBarOpen={setIsBottomBarOpen}
                setActivePanel={setActivePanel}
            />
        )
    }), [nodeOutputs, setSelectedNode, setSelectedTab, setIsBottomBarOpen, setActivePanel]);

    // Persist nodes to localStorage whenever they change
    useEffect(() => {
        const success = safeLocalStorageSet(nodesKey, JSON.stringify(nodes));
        if (!success) {
            console.warn('Failed to save nodes to localStorage');
        }
    }, [nodes, nodesKey, nodeOutputsKey]);

    // Add the onStop handler - data view safe implementation
    const onStop = useCallback(async (nodeId) => {
        try {
            // Add the stopped node to cancelled nodes
            cancelledNodesRef.current.add(nodeId);

            // Get current values using refs to avoid dependencies
            const currentDownstreamMap = buildDownstreamMap(edgesRef.current);
            const downstreamNodes = Array.from(getAllDownstreamNodes(nodeId, currentDownstreamMap));

            // Set all downstream nodes to idle status (they were queued/running)
            downstreamNodes.forEach(downstreamId => {
                if (downstreamId !== nodeId) { // Don't update the stopped node itself
                    // Use updateNodeStatus which will handle the node state update
                    updateNodeStatus(downstreamId, 'idle');
                    // Also add to cancelled nodes to prevent them from running
                    cancelledNodesRef.current.add(downstreamId);
                }
            });

            // Update edge styling for all affected edges using ref
            setEdgesRef.current(eds => eds.map(edge => {
                if (downstreamNodes.includes(edge.source)) {
                    return {
                        ...edge,
                        style: {
                            ...edge.style,
                            stroke: '#1e293b' // Reset to default color
                        }
                    };
                }
                return edge;
            }));

            const processId = processIds[nodeId];
            if (!processId) {
                console.warn(`No processId found for node ${nodeId}`);
                return;
            }
            try {
                await ApiService.stopProcess(processId);
                updateNodeStatus(nodeId, 'stopped');
            } catch (error) {
                console.error(`Failed to stop process for node ${nodeId}:`, error);
            }
        } catch (error) {
            console.error('Error in onStop:', error);
        }
    }, [processIds, updateNodeStatus]);

    // Inject onStop into node data with stable approach
    useEffect(() => {
        setNodes(nds =>
            nds.map(node => ({
                ...node,
                data: {
                    ...node.data,
                    onStop
                }
            }))
        );
    }, [onStop, setNodes]);

    // Add error boundary and loading state
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Set loading to false after component mounts
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Error boundary
    if (hasError) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'white', color: 'black' }}>
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'white', color: 'black' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-lg">Loading Completeness Control...</div>
                </div>
            </div>
        );
    }

    try {
        return (
            <HandlerContext.Provider value={{ runNode, resetNodeAndDownstream }}>
                <div className="min-h-screen" style={{ backgroundColor: 'white' }}>
                    {/* Main Content */}
                    <div
                        className="flex flex-col h-screen transition-all duration-300 ease-in-out"
                        style={{
                            marginRight: isSidebarOpen ? `${sidebarWidth}px` : '64px'
                        }}
                    >
                        {/* Flow Container */}
                        <div
                            className="flex-1 overflow-hidden flex flex-col"
                            style={{
                                height: isBottomBarOpen
                                    ? `calc(100vh - ${bottomBarHeight}px)`
                                    : 'calc(100vh - 48px)'
                            }}
                        >
                            <div
                                className="border-b border-slate-200 px-8 py-4"
                                style={{
                                    backgroundColor: 'white',
                                    height: '80px', // Fixed desktop header height
                                    boxShadow: `
                                    0 4px 8px rgba(0,0,0,0.15),
                                    0 8px 16px rgba(0,0,0,0.1),
                                    0 2px 4px rgba(0,0,0,0.1),
                                    inset 0 2px 0 rgba(255,255,255,0.8),
                                    inset 0 -2px 0 rgba(0,0,0,0.1)
                                `
                                }}
                            >
                                <div className="flex items-center justify-between h-full">
                                    {/* HSBC Logo and Name - Left */}
                                    <div className="flex items-center flex-shrink-0">
                                        <HSBCLogo
                                            height={64}
                                            className="mr-4"
                                        />
                                    </div>

                                    {/* Professional Title - Center */}
                                    <div className="flex-1 flex justify-center">
                                        <h1 className="text-2xl font-bold text-black text-center">
                                            GENERIC COMPLETENESS CONTROL
                                        </h1>
                                    </div>

                                    {/* Right spacer for balance */}
                                    <div className="flex-shrink-0 w-24"></div>
                                </div>
                            </div>
                            <div
                                className="relative h-full"
                                style={{
                                    background: 'white',
                                    boxShadow: `
                                    inset 0 4px 8px rgba(0,0,0,0.08),
                                    inset 0 2px 4px rgba(0,0,0,0.05),
                                    inset 0 8px 16px rgba(0,0,0,0.02),
                                    inset 0 -2px 4px rgba(255,255,255,0.9),
                                    0 1px 0 rgba(255,255,255,0.95)
                                `,
                                    border: '24px solid #f5f5f5',
                                    borderRadius: '8px'
                                }}
                                onClick={() => setActivePanel(null)}
                            >
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    onConnect={onConnect}
                                    onEdgeClick={onEdgeClick}
                                    nodeTypes={nodeTypes}
                                    connectionMode={ConnectionMode.Loose}
                                    fitView
                                    minZoom={0.5}
                                    maxZoom={2}
                                    nodesDraggable={false}
                                    panOnDrag={true}
                                    zoomOnScroll={false}
                                    preventScrolling={true}
                                    className="bg-transparent"
                                    selectNodesOnDrag={false}
                                    onSelectionChange={onSelectionChange}
                                    multiSelectionKeyCode="Control"
                                    proOptions={{ hideAttribution: true }}
                                >
                                    <Background
                                        color="#f3f4f6"
                                        gap={20}
                                        className="bg-white"
                                    />
                                    <Controls className="bg-slate-800 border border-slate-700/50 rounded-lg" />
                                </ReactFlow>
                            </div>
                        </div>

                        {/* Bottom Data View Bar with Resize Handle */}
                        <div
                            className={`
                            relative bg-white border-t border-slate-200
                            transition-all duration-300 ease-in-out
                            ${!isBottomBarOpen ? 'h-12' : ''}
                        `}
                            style={{
                                height: isBottomBarOpen ? `${bottomBarHeight}px` : '48px',
                                minHeight: isBottomBarOpen ? `${minHeight}px` : '48px',
                                maxHeight: isBottomBarOpen ? `${maxHeight}px` : '48px',
                                transition: isResizingBottom ? 'none' : undefined,
                                zIndex: activePanel === 'bottombar' ? 50 : 10,

                            }}
                            onClick={() => setActivePanel('bottombar')}
                        >
                            {/* Resize Handle - only show when open */}
                            {isBottomBarOpen && (
                                <div
                                    className={`
                                    absolute -top-1 left-0 w-full h-2 cursor-row-resize z-10
                                    ${isResizingBottom ? 'bg-slate-700' : 'bg-transparent hover:bg-slate-700/30'}
                                    transition-colors
                                `}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsResizingBottom(true);
                                    }}
                                >
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <FaGripLines className="text-slate-700/70" />
                                    </div>
                                </div>
                            )}

                            {/* Header Bar */}
                            <div className="flex items-center justify-between h-12 px-4 border-b border-slate-700/50">
                                {/* DataView Button - Left */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsBottomBarOpen(!isBottomBarOpen);
                                        // Unlock data view when user explicitly closes it
                                        if (isBottomBarOpen) {
                                            setDataViewLocked(false);

                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
                                >
                                    <FaTable className="w-3 h-3" />
                                    DataView
                                </button>

                                {/* Selected Node Name - Center */}
                                {selectedNode && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-sm font-medium text-slate-700">
                                        <span className="font-semibold">Node:</span>
                                        <span className="text-slate-800">{selectedNode.data.fullName}</span>
                                    </div>
                                )}

                                {/* Chevron Icon - Right */}
                                <FaChevronUp
                                    className={`
                                    text-slate-700/70 cursor-pointer transition-transform duration-300 hover:text-slate-600
                                    ${isBottomBarOpen ? '' : 'rotate-180'}
                                `}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsBottomBarOpen(!isBottomBarOpen);
                                        // Unlock data view when user explicitly closes it
                                        if (isBottomBarOpen) {
                                            setDataViewLocked(false);

                                        }
                                    }}
                                />
                            </div>

                            {/* Content - only show when open */}
                            {isBottomBarOpen && (
                                <div className="h-[calc(100%-48px)] px-4 overflow-y-auto">
                                    {selectedNode ? (
                                        <div className="flex-1 text-sm text-slate-300 h-full overflow-hidden">
                                            {/* Tab Buttons */}
                                            <div className="flex gap-2 border-b border-slate-700/50 mb-2">
                                                <button onClick={() => setSelectedTab('histogram')} className={`px-2 py-1 rounded-t ${selectedTab === 'histogram' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Histogram</button>
                                                <button onClick={() => setSelectedTab('data')} className={`px-2 py-1 rounded-t ${selectedTab === 'data' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Data Output</button>
                                                <button onClick={() => setSelectedTab('log')} className={`px-2 py-1 rounded-t ${selectedTab === 'log' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Log</button>
                                                <button onClick={() => setSelectedTab('fail')} className={`px-2 py-1 rounded-t ${selectedTab === 'fail' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Fail Message</button>
                                            </div>
                                            {/* Tab Content */}
                                            <div className="mt-2">
                                                {selectedTab === 'histogram' && (
                                                    <div>
                                                        {/* Show histogram data with statistics */}
                                                        {selectedNode.data.output?.histogram_data ? (
                                                            <div className="flex flex-col h-full">
                                                                <div className="mb-2">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="font-semibold text-black text-sm">Histogram Analysis ({selectedNode.data.output.histogram_data.length} columns)</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <select
                                                                            value={histogramFilterType}
                                                                            onChange={e => setHistogramFilterType(e.target.value)}
                                                                            className="px-3 py-1 rounded bg-white text-black text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                        >
                                                                            <option value="contains">Contains</option>
                                                                            <option value="equals">Equals</option>
                                                                            <option value="startsWith">Starts With</option>
                                                                            <option value="endsWith">Ends With</option>
                                                                        </select>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Filter column names..."
                                                                            value={histogramFilterValue}
                                                                            onChange={e => setHistogramFilterValue(e.target.value)}
                                                                            className="px-3 py-1 rounded bg-white text-black text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1"
                                                                            style={{ minWidth: 120 }}
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                setHistogramFilterValue('');
                                                                                setHistogramFilterType('contains');
                                                                            }}
                                                                            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-black text-sm border border-gray-300 transition-colors"
                                                                        >
                                                                            Reset
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="border border-gray-300 rounded bg-white overflow-auto"
                                                                    style={{
                                                                        height: `${bottomBarHeight - 140}px`
                                                                    }}
                                                                >
                                                                    <div className="p-4">
                                                                        {(() => {
                                                                            const histogramData = selectedNode.data.output.histogram_data;
                                                                            const filteredHistogram = histogramData.filter((item) => {
                                                                                if (!histogramFilterValue) return true;

                                                                                const columnName = item.column_name.toLowerCase();
                                                                                const filterValue = histogramFilterValue.toLowerCase();

                                                                                switch (histogramFilterType) {
                                                                                    case 'equals':
                                                                                        return columnName === filterValue;
                                                                                    case 'startsWith':
                                                                                        return columnName.startsWith(filterValue);
                                                                                    case 'endsWith':
                                                                                        return columnName.endsWith(filterValue);
                                                                                    case 'contains':
                                                                                    default:
                                                                                        return columnName.includes(filterValue);
                                                                                }
                                                                            });

                                                                            return filteredHistogram.length > 0 ? (
                                                                                <div className="space-y-4">
                                                                                    {filteredHistogram.map((item, idx) => (
                                                                                        <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                                                                            <div className="flex items-center justify-between mb-3">
                                                                                                <h3 className="text-lg font-semibold text-gray-800">
                                                                                                    {item.column_name}
                                                                                                </h3>
                                                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${item.data_type === 'text' ? 'bg-blue-100 text-blue-800' :
                                                                                                    item.data_type === 'numeric' ? 'bg-green-100 text-green-800' :
                                                                                                        'bg-gray-100 text-gray-800'
                                                                                                    }`}>
                                                                                                    {item.data_type}
                                                                                                </span>
                                                                                            </div>

                                                                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                                                                <div>
                                                                                                    <span className="text-sm font-medium text-gray-600">Total Values:</span>
                                                                                                    <span className="ml-2 text-sm text-gray-800">{item.total_values.toLocaleString()}</span>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="text-sm font-medium text-gray-600">Unique Values:</span>
                                                                                                    <span className="ml-2 text-sm text-gray-800">{item.unique_values.toLocaleString()}</span>
                                                                                                </div>
                                                                                            </div>

                                                                                            {item.data_type === 'text' && item.top_values && item.top_values.length > 0 && (
                                                                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                                                                    <div className="text-xs text-gray-500 mb-1">Top 5 Values:</div>
                                                                                                    {item.top_values.slice(0, 5).map((val, valIdx) => (
                                                                                                        <div key={valIdx} className="flex justify-between text-xs mb-1">
                                                                                                            <span className="text-gray-800 truncate flex-1 mr-2" title={val.value}>
                                                                                                                {val.value.length > 100 ? 
                                                                                                                    val.value.substring(0, 100) + '...' : 
                                                                                                                    val.value
                                                                                                                }
                                                                                                            </span>
                                                                                                            <span className="text-gray-600 font-medium">
                                                                                                                {val.count}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}

                                                                                            {item.data_type === 'numeric' && item.summary && (
                                                                                                <div className="mb-3">
                                                                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Statistics:</h4>
                                                                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                                                                        <div><span className="text-gray-600">Min:</span> <span className="text-gray-800">{item.summary.min?.toFixed(2)}</span></div>
                                                                                                        <div><span className="text-gray-600">Max:</span> <span className="text-gray-800">{item.summary.max?.toFixed(2)}</span></div>
                                                                                                        <div><span className="text-gray-600">Mean:</span> <span className="text-gray-800">{item.summary.mean?.toFixed(2)}</span></div>
                                                                                                        <div><span className="text-gray-600">Median:</span> <span className="text-gray-800">{item.summary.median?.toFixed(2)}</span></div>
                                                                                                        <div><span className="text-gray-600">Std Dev:</span> <span className="text-gray-800">{item.summary.std_dev?.toFixed(2)}</span></div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {item.data_type === 'text' && item.summary && (
                                                                                                <div className="mb-3">
                                                                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Text Statistics:</h4>
                                                                                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                                                                                        <div><span className="text-gray-600">Min Length:</span> <span className="text-gray-800">{item.summary.min_length}</span></div>
                                                                                                        <div><span className="text-gray-600">Max Length:</span> <span className="text-gray-800">{item.summary.max_length}</span></div>
                                                                                                        <div><span className="text-gray-600">Avg Length:</span> <span className="text-gray-800">{item.summary.avg_length?.toFixed(1)}</span></div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {item.data_type === 'numeric' && item.distribution && (
                                                                                                <div>
                                                                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Distribution (10 bins):</h4>
                                                                                                    <div className="space-y-1">
                                                                                                        {item.distribution.bin_counts.map((count, binIdx) => (
                                                                                                            <div key={binIdx} className="flex items-center text-sm">
                                                                                                                <span className="text-gray-600 w-16">Bin {binIdx + 1}:</span>
                                                                                                                <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                                                                                                                    <div
                                                                                                                        className="bg-blue-500 h-2 rounded-full"
                                                                                                                        style={{
                                                                                                                            width: `${Math.max(2, (count / Math.max(...item.distribution.bin_counts)) * 100)}%`
                                                                                                                        }}
                                                                                                                    ></div>
                                                                                                                </div>
                                                                                                                <span className="text-gray-800 w-12 text-right">{count}</span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className="mt-4 text-sm text-gray-600 border-t border-gray-200 pt-2">
                                                                                        Showing {filteredHistogram.length} of {histogramData.length} columns
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-gray-600 text-center py-8">No columns found matching the filter criteria.</div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>No columns found.</div>
                                                        )}
                                                    </div>
                                                )}
                                                {selectedTab === 'data' && (
                                                    <div>
                                                        {/* New Optimized Data Output Tab */}
                                                        {selectedNode.data.output?.calculation_results?.headers && selectedNode.data.output?.calculation_results?.table ? (
                                                            <div className="flex flex-col h-full">
                                                                <DataOutputTab
                                                                    selectedNode={selectedNode}
                                                                    bottomBarHeight={bottomBarHeight}
                                                                    onError={(error) => {
                                                                        console.error('Data Output Error:', error);
                                                                        // Handle error - could show notification or fallback
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : selectedNode.data.output?.calculation_results ? (
                                                            <div>
                                                                <h3 className="text-emerald-400 font-medium mb-2">Calculation Results:</h3>
                                                                <div
                                                                    className="bg-slate-900/50 rounded p-2 overflow-y-auto"
                                                                    style={{ height: `${bottomBarHeight - 100}px` }}
                                                                >
                                                                    <pre className="text-slate-300 whitespace-pre-wrap">
                                                                        {JSON.stringify(selectedNode.data.output.calculation_results, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                        ) : 'No data output. Please run the Node to see data.'}
                                                    </div>
                                                )}
                                                {selectedTab === 'log' && (
                                                    <div>
                                                        {/* Execution Logs */}
                                                        {selectedNode.data.output?.execution_logs ? (
                                                            <div>
                                                                <h3 className="text-emerald-400 font-medium mb-2">Execution Logs:</h3>
                                                                <div
                                                                    className="bg-slate-900/50 rounded p-2 space-y-1 overflow-y-auto"
                                                                    style={{ height: `${bottomBarHeight - 100}px` }}
                                                                >
                                                                    {selectedNode.data.output.execution_logs.map((log, index) => (
                                                                        <div key={index} className="text-slate-300">
                                                                            {log}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : 'No logs.'}
                                                    </div>
                                                )}
                                                {selectedTab === 'fail' && (
                                                    <div>
                                                        {/* Fail Message display */}
                                                        {selectedNode.data.output?.fail_message ? (
                                                            <div className="space-y-4">
                                                                {/* Error Details */}
                                                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                                                            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-lg font-semibold text-red-800">Node Execution Failed</h3>
                                                                            <p className="text-sm text-red-600">The node encountered an error during execution</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Error Message */}
                                                                <div className="bg-white border border-red-200 rounded-md p-4">
                                                                    <h4 className="text-sm font-medium text-red-800 mb-2">Error Details:</h4>
                                                                    <pre className="text-sm text-red-700 bg-red-50 p-3 rounded border overflow-auto max-h-96">
                                                                        {selectedNode.data.output.fail_message}
                                                                    </pre>
                                                                </div>

                                                                {/* Execution Logs */}
                                                                {selectedNode.data.output?.execution_logs && (
                                                                    <div className="bg-white border border-red-200 rounded-md p-4">
                                                                        <h4 className="text-sm font-medium text-red-800 mb-2">Execution Logs:</h4>
                                                                        <div className="text-sm text-red-700 bg-red-50 p-3 rounded border max-h-48 overflow-auto">
                                                                            {selectedNode.data.output.execution_logs.map((log, index) => (
                                                                                <div key={index} className="mb-1">
                                                                                    <span className="text-red-600">[{index + 1}]</span> {log}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-400 text-center py-8">
                                                                No fail message available. This node did not encounter any errors.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400">
                                            Select a node to view its output
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Collapsed state indicator - removed since we now have the button */}
                        </div>
                    </div>



                    {/* Right Sidebar */}
                    <div
                        ref={resizeRef}
                        className={`
                        fixed right-0 top-0 h-full bg-white border-l border-slate-200
                    transition-all duration-300 ease-in-out
                    ${!isSidebarOpen ? 'w-12' : ''}
                `}
                        style={{
                            width: isSidebarOpen ? `${sidebarWidth}px` : '64px',
                            transition: isResizing ? 'none' : undefined,
                            zIndex: activePanel === 'sidebar' ? 50 : 20
                        }}
                        onDoubleClick={() => !isResizing && setIsSidebarOpen(!isSidebarOpen)}
                        onClick={() => setActivePanel('sidebar')}
                    >
                        {/* Resize Handle */}
                        <div
                            className={`
                            absolute left-0 top-0 h-full w-1 cursor-col-resize
                            ${isResizing ? 'bg-slate-700' : 'hover:bg-slate-700/30'}
                            transition-colors
                        `}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsResizing(true);

                                const startX = e.pageX;
                                const startWidth = sidebarWidth;

                                const handleMouseMove = (moveEvent) => {
                                    const deltaX = startX - moveEvent.pageX;
                                    const newWidth = Math.min(Math.max(startWidth + deltaX, minWidth), maxWidth);
                                    setSidebarWidth(newWidth);
                                };

                                const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                    setIsResizing(false);
                                };

                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                            }}
                        />

                        <div className={`
                        flex items-center h-16 px-0 border-b border-slate-700/50
                        ${isSidebarOpen ? 'justify-between' : 'justify-center'}
                    `}>
                            {isSidebarOpen && (
                                <div className="flex-1 flex justify-center">
                                    <span className="text-black font-medium">
                                        Run Parameters
                                    </span>
                                </div>
                            )}
                            <FaChevronLeft
                                className={`
                                text-slate-700/70 cursor-pointer transition-transform duration-300 hover:text-slate-600
                                ${isSidebarOpen ? '' : 'rotate-180'}
                            `}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSidebarOpen(!isSidebarOpen);
                                }}
                            />
                        </div>

                        {/* Sidebar Content */}
                        {isSidebarOpen && (
                            <div className="px-2 py-2 text-slate-300 overflow-y-auto max-h-[calc(100vh-4rem)]">
                                <div className="space-y-4">
                                    {/* Form fields with updated styling */}
                                    <div className="space-y-4">
                                        {renderParameterInputs()}
                                    </div>

                                    {/* Buttons Container */}
                                    <div className="pt-4 flex gap-4">
                                        <button
                                            onClick={handleApplyParams}
                                            className={`flex-1 px-4 py-3 bg-green-800 hover:bg-green-700 text-white rounded-lg text-sm 
                                        font-medium transition-colors shadow-lg shadow-green-900/20 focus:ring-2 
                                        focus:ring-green-500/50 active:transform active:scale-[0.98]`}
                                        >
                                            Apply Parameters
                                        </button>
                                        {/* Validation Message */}
                                        {paramValidation.message && (
                                            <p className={`mt-2 text-sm ${paramValidation.isValid ? 'text-green-800' : 'text-red-400'
                                                }`}>
                                                {paramValidation.message}
                                            </p>
                                        )}
                                        <button
                                            onClick={runAllNodes}
                                            disabled={isRunningAll}
                                            className={`flex-1 px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors 
                                        shadow-lg shadow-blue-900/20 focus:ring-2 focus:ring-blue-500/50 
                                        active:transform active:scale-[0.98] ${isRunningAll
                                                    ? 'bg-blue-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-500'}`}
                                        >
                                            {isRunningAll ? 'Running...' : 'Run All'}
                                        </button>
                                    </div>

                                    {/* Reset All Button */}
                                    <div className="pt-2">
                                        <button
                                            onClick={resetAllNodes}
                                            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm 
                                        font-medium transition-colors shadow-lg shadow-slate-900/20 focus:ring-2 
                                        focus:ring-slate-500/50 active:transform active:scale-[0.98]"
                                        >
                                            Reset All Nodes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Collapsed state indicator */}
                        {!isSidebarOpen && (
                            <div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-black vertical-text"
                            >
                                <style>{`
                            .vertical-text {
                                writing-mode: vertical-rl;
                                text-orientation: mixed;
                                transform: rotate(180deg);
                            }
                        `}</style>
                                Run Parameters
                            </div>
                        )}
                    </div>
                </div>
            </HandlerContext.Provider>
        );
    } catch (error) {
        console.error('Error rendering CompletenessControl:', error);
        setHasError(true);
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'white', color: 'black' }}>
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                    <p className="mb-4 text-red-600">{error.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }
} 