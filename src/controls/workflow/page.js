// Converted from Next.js to Create React App

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
    Controls,
    Background,
    addEdge,
    ConnectionMode,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    MiniMap,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
    FaFileCsv, 
    FaFileAlt, 
    FaFileExcel, 
    FaExchangeAlt, 
    FaFilter, 
    FaLink, 
    FaChartBar,
    FaPlay, 
    FaStop, 
    FaUndo, 
    FaSave, 
    FaFolderOpen,
    FaCog,
    FaCheckCircle,
    FaTimesCircle,
    FaSpinner,
    FaCircle,
    FaPlus,
    FaTrash,
    FaTable,
    FaEye,
    FaEdit,
    FaDownload
} from 'react-icons/fa';
import HSBCLogo from '../../components/HSBCLogo';
import DataOutputTab from '../../components/DataOutput/DataOutputTab';
import DataGrid from '../../components/DataGrid/DataGrid';

// Node types for data operations
const NODE_TYPES = {
    READ_CSV: 'read_csv',
    READ_PARQUET: 'read_parquet', 
    READ_EXCEL: 'read_excel',
    CONVERT_PARQUET: 'convert_parquet',
    FILTER: 'filter',
    JOIN: 'join',
    AGGREGATE: 'aggregate',
    OUTPUT: 'output'
};

// Node definitions with parameters
const NODE_DEFINITIONS = {
    [NODE_TYPES.READ_CSV]: {
        label: 'Read CSV',
        icon: FaFileCsv,
        color: '#3B82F6',
        parameters: {
            file_path: { type: 'string', label: 'File Path', required: true, placeholder: '/path/to/file.csv' },
            delimiter: { type: 'string', label: 'Delimiter', required: false, default: ',', placeholder: ',' },
            encoding: { type: 'string', label: 'Encoding', required: false, default: 'utf-8', placeholder: 'utf-8' },
            header: { type: 'boolean', label: 'Has Header', required: false, default: true },
            skip_rows: { type: 'number', label: 'Skip Rows', required: false, default: 0, placeholder: '0' }
        }
    },
    [NODE_TYPES.READ_PARQUET]: {
        label: 'Read Parquet',
        icon: FaFileAlt,
        color: '#10B981',
        parameters: {
            file_path: { type: 'string', label: 'File Path', required: true, placeholder: '/path/to/file.parquet' },
            columns: { type: 'string', label: 'Columns (comma-separated)', required: false, placeholder: 'col1,col2,col3' },
            filters: { type: 'string', label: 'Row Filters', required: false, placeholder: 'column > 100' }
        }
    },
    [NODE_TYPES.READ_EXCEL]: {
        label: 'Read Excel',
        icon: FaFileExcel,
        color: '#059669',
        parameters: {
            file_path: { type: 'string', label: 'File Path', required: true, placeholder: '/path/to/file.xlsx' },
            sheet_name: { type: 'string', label: 'Sheet Name', required: false, placeholder: 'Sheet1' },
            header_row: { type: 'number', label: 'Header Row', required: false, default: 0, placeholder: '0' },
            skip_rows: { type: 'number', label: 'Skip Rows', required: false, default: 0, placeholder: '0' }
        }
    },
    [NODE_TYPES.CONVERT_PARQUET]: {
        label: 'Convert to Parquet',
        icon: FaExchangeAlt,
        color: '#F59E0B',
        parameters: {
            output_path: { type: 'string', label: 'Output Path', required: true, placeholder: '/path/to/output.parquet' },
            compression: { type: 'select', label: 'Compression', required: false, default: 'snappy', options: ['snappy', 'gzip', 'brotli', 'none'] },
            partition_by: { type: 'string', label: 'Partition By', required: false, placeholder: 'date,region' }
        }
    },
    [NODE_TYPES.FILTER]: {
        label: 'Filter Data',
        icon: FaFilter,
        color: '#EF4444',
        parameters: {
            condition: { type: 'string', label: 'Filter Condition', required: true, placeholder: 'column > 100 AND status == "active"' },
            case_sensitive: { type: 'boolean', label: 'Case Sensitive', required: false, default: false }
        }
    },
    [NODE_TYPES.JOIN]: {
        label: 'Join Data',
        icon: FaLink,
        color: '#8B5CF6',
        parameters: {
            join_type: { type: 'select', label: 'Join Type', required: true, default: 'inner', options: ['inner', 'left', 'right', 'outer'] },
            left_key: { type: 'string', label: 'Left Key', required: true, placeholder: 'id' },
            right_key: { type: 'string', label: 'Right Key', required: true, placeholder: 'id' },
            suffixes: { type: 'string', label: 'Suffixes', required: false, default: '_x,_y', placeholder: '_left,_right' }
        }
    },
    [NODE_TYPES.AGGREGATE]: {
        label: 'Aggregate Data',
        icon: FaChartBar,
        color: '#EC4899',
        parameters: {
            group_by: { type: 'string', label: 'Group By', required: true, placeholder: 'date,region' },
            aggregations: { type: 'string', label: 'Aggregations', required: true, placeholder: 'sum:amount,count:id,mean:value' },
            sort_by: { type: 'string', label: 'Sort By', required: false, placeholder: 'date DESC' }
        }
    },
    [NODE_TYPES.OUTPUT]: {
        label: 'Data Output',
        icon: FaCheckCircle,
        color: '#10B981',
        parameters: {
            output_type: { type: 'select', label: 'Output Type', required: true, default: 'preview', options: ['preview', 'download', 'save'] },
            max_rows: { type: 'number', label: 'Max Rows', required: false, default: 1000, placeholder: '1000' }
        }
    }
};

// Custom Node Component
const DataNode = ({ data, id, selected }) => {
    const nodeDef = NODE_DEFINITIONS[data.type];
    const Icon = nodeDef.icon;
    
    // Check if parameters are configured
    const hasRequiredParams = () => {
        if (!nodeDef.parameters) return true;
        const requiredParams = Object.entries(nodeDef.parameters)
            .filter(([_, param]) => param.required)
            .map(([key, _]) => key);
        
        return requiredParams.every(param => 
            data.parameters && data.parameters[param] && data.parameters[param].toString().trim() !== ''
        );
    };

    const isConfigured = hasRequiredParams();
    
    return (
        <div className={`px-4 py-3 rounded-lg border-2 shadow-lg transition-all duration-200 ${
            selected 
                ? 'border-blue-500 shadow-blue-500/20' 
                : !isConfigured
                ? 'border-orange-400 shadow-orange-400/20'
                : 'border-gray-200 hover:border-gray-300'
        }`} style={{ backgroundColor: 'white', minWidth: '180px' }}>
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-gray-400 border-2 border-white"
            />
            
            <div className="flex items-center gap-3">
                <div 
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${nodeDef.color}20` }}
                >
                    <Icon className="text-lg" style={{ color: nodeDef.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                        {nodeDef.label}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                        {data.label || data.id}
                    </div>
                    {!isConfigured && (
                        <div className="text-xs text-orange-600 mt-1">
                            ⚠️ Configure parameters
                        </div>
                    )}
                </div>
            </div>

            {/* Status indicator */}
            <div className="flex justify-end mt-2">
                <div className={`w-2 h-2 rounded-full ${
                    data.status === 'completed' ? 'bg-green-500' :
                    data.status === 'running' ? 'bg-yellow-500' :
                    data.status === 'failed' ? 'bg-red-500' :
                    'bg-gray-300'
                }`} />
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-gray-400 border-2 border-white"
            />
        </div>
    );
};

// Parameter Configuration Modal
const ParameterModal = ({ node, isOpen, onClose, onSave }) => {
    const [parameters, setParameters] = useState({});
    const nodeDef = NODE_DEFINITIONS[node?.data?.type];

    useEffect(() => {
        if (node && isOpen) {
            setParameters(node.data.parameters || {});
        }
    }, [node, isOpen]);

    const handleParameterChange = (key, value) => {
        setParameters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = () => {
        onSave(node.id, parameters);
        onClose();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !node || !nodeDef) {
        console.log('ParameterModal Debug - Modal not showing:', { 
            isOpen, 
            node: !!node, 
            nodeDef: !!nodeDef,
            nodeType: node?.data?.type,
            availableTypes: Object.keys(NODE_DEFINITIONS)
        });
        return null;
    }

    console.log('ParameterModal Debug - Modal should show:', { 
        isOpen, 
        nodeType: node?.data?.type, 
        nodeDef: nodeDef?.label,
        parameters: Object.keys(nodeDef.parameters || {})
    });

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleBackdropClick}
        >
            <div 
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Configure {nodeDef.label}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <FaTimesCircle />
                    </button>
                </div>

                <div className="space-y-4">
                    {Object.entries(nodeDef.parameters || {}).map(([key, param]) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {param.label}
                                {param.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            
                            {param.type === 'string' && (
                                <input
                                    type="text"
                                    value={parameters[key] || param.default || ''}
                                    onChange={(e) => handleParameterChange(key, e.target.value)}
                                    placeholder={param.placeholder}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            )}
                            
                            {param.type === 'number' && (
                                <input
                                    type="number"
                                    value={parameters[key] || param.default || ''}
                                    onChange={(e) => handleParameterChange(key, e.target.value)}
                                    placeholder={param.placeholder}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            )}
                            
                            {param.type === 'boolean' && (
                                <select
                                    value={parameters[key] !== undefined ? parameters[key] : param.default}
                                    onChange={(e) => handleParameterChange(key, e.target.value === 'true')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={true}>True</option>
                                    <option value={false}>False</option>
                                </select>
                            )}
                            
                            {param.type === 'select' && (
                                <select
                                    value={parameters[key] || param.default}
                                    onChange={(e) => handleParameterChange(key, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {param.options.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

// Node Palette Component
const NodePalette = ({ onAddNode }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Data Operations</h3>
            <p className="text-xs text-gray-600 mb-3">
                Click on nodes after adding them to configure parameters
            </p>
            <div className="space-y-2">
                {Object.entries(NODE_DEFINITIONS).map(([type, def]) => {
                    const Icon = def.icon;
                    return (
                        <button
                            key={type}
                            onClick={() => onAddNode(type)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                            title={`Add ${def.label} node. Click on the node after adding to configure parameters.`}
                        >
                            <div 
                                className="p-1 rounded"
                                style={{ backgroundColor: `${def.color}20` }}
                            >
                                <Icon className="text-sm" style={{ color: def.color }} />
                            </div>
                            <span>{def.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default function WorkflowTool({ instanceId }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [isParameterModalOpen, setIsParameterModalOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [workflowStatus, setWorkflowStatus] = useState('idle');
    const [selectedNodeForOutput, setSelectedNodeForOutput] = useState(null);
    const [isOutputPanelOpen, setIsOutputPanelOpen] = useState(false);
    const [nodeOutputs, setNodeOutputs] = useState({});
    
    // Data grid state
    const [gridData, setGridData] = useState([]);
    const [isGridLoading, setIsGridLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalRows, setTotalRows] = useState(0);
    const [selectedNodeForGrid, setSelectedNodeForGrid] = useState(null);
    const [isGridVisible, setIsGridVisible] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);

    const nodeTypes = useMemo(() => ({
        dataNode: DataNode
    }), []);

    // Add new node
    const addNode = useCallback((type) => {
        const newNode = {
            id: `${type}_${Date.now()}`,
            type: 'dataNode',
            position: { x: 100, y: 100 },
            data: {
                type,
                label: NODE_DEFINITIONS[type].label,
                status: 'idle',
                parameters: {}
            }
        };
        setNodes(nds => [...nds, newNode]);
    }, [setNodes]);

    // Handle node selection
    const onNodeClick = useCallback((event, node) => {
        console.log('Node clicked:', node);
        console.log('Node data:', node.data);
        console.log('Node type:', node.data.type);
        console.log('Available types:', Object.keys(NODE_DEFINITIONS));
        setSelectedNode(node);
        setIsParameterModalOpen(true);
    }, []);

    // Node context menu handler
    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        setSelectedNode(node);
        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            nodeId: node.id
        });
    }, []);

    // Close context menu when clicking outside
    const onPaneClick = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Save node parameters
    const saveNodeParameters = useCallback((nodeId, parameters) => {
        setNodes(nds => nds.map(node => 
            node.id === nodeId 
                ? { ...node, data: { ...node.data, parameters } }
                : node
        ));
    }, [setNodes]);

    // Handle connections
    const onConnect = useCallback((params) => {
        setEdges(eds => addEdge(params, eds));
    }, [setEdges]);

    // Run workflow
    const runWorkflow = useCallback(async () => {
        setIsRunning(true);
        setWorkflowStatus('running');
        
        // Simulate workflow execution
        for (const node of nodes) {
            // Update node status to running
            setNodes(nds => nds.map(n => 
                n.id === node.id 
                    ? { ...n, data: { ...n.data, status: 'running' } }
                    : n
            ));
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update node status to completed
            setNodes(nds => nds.map(n => 
                n.id === node.id 
                    ? { ...n, data: { ...n.data, status: 'completed' } }
                    : n
            ));
            
            // Simulate output data
            setNodeOutputs(prev => ({
                ...prev,
                [node.id]: {
                    calculation_results: {
                        headers: ['id', 'name', 'value', 'date'],
                        table: Array.from({ length: 100 }, (_, i) => [
                            i + 1,
                            `Item ${i + 1}`,
                            Math.floor(Math.random() * 1000),
                            new Date().toISOString().split('T')[0]
                        ]),
                        table_size: '4x100'
                    },
                    count: 100
                }
            }));
        }
        
        setIsRunning(false);
        setWorkflowStatus('completed');
    }, [nodes, setNodes]);

    // Stop workflow
    const stopWorkflow = useCallback(() => {
        setIsRunning(false);
        setWorkflowStatus('stopped');
        setNodes(nds => nds.map(node => ({
            ...node,
            data: { ...node.data, status: 'idle' }
        })));
    }, [setNodes]);

    // Reset workflow
    const resetWorkflow = useCallback(() => {
        setWorkflowStatus('idle');
        setNodes(nds => nds.map(node => ({
            ...node,
            data: { ...node.data, status: 'idle' }
        })));
        setNodeOutputs({});
        setSelectedNodeForOutput(null);
        setIsOutputPanelOpen(false);
    }, [setNodes]);

    // Delete selected node
    const deleteSelectedNode = useCallback(() => {
        if (selectedNode) {
            setNodes(nds => nds.filter(node => node.id !== selectedNode.id));
            setEdges(eds => eds.filter(edge => 
                edge.source !== selectedNode.id && edge.target !== selectedNode.id
            ));
            setSelectedNode(null);
        }
    }, [selectedNode, setNodes, setEdges]);

    // Load data for grid
    const loadGridData = useCallback(async (nodeId, page = 1, size = 25) => {
        if (!nodeId) return;

        setIsGridLoading(true);
        try {
            // Simulate API call to get data
            const response = await new Promise(resolve => {
                setTimeout(() => {
                    const headers = ['ID', 'Name', 'Value', 'Date', 'Status'];
                    const data = Array.from({ length: size }, (_, i) => [
                        (page - 1) * size + i + 1,
                        `Item ${(page - 1) * size + i + 1}`,
                        Math.floor(Math.random() * 1000),
                        new Date().toISOString().split('T')[0],
                        ['Active', 'Inactive', 'Pending'][Math.floor(Math.random() * 3)]
                    ]);
                    resolve({ data: [headers, ...data], total: 1000 });
                }, 500);
            });

            setGridData(response.data);
            setTotalRows(response.total);
            setCurrentPage(page);
            setPageSize(size);
            setSelectedNodeForGrid(nodeId);
            setIsGridVisible(true);
        } catch (error) {
            console.error('Error loading grid data:', error);
        } finally {
            setIsGridLoading(false);
        }
    }, []);

    // Handle page change
    const handlePageChange = useCallback((page) => {
        loadGridData(selectedNodeForGrid, page, pageSize);
    }, [selectedNodeForGrid, pageSize, loadGridData]);

    // Handle page size change
    const handlePageSizeChange = useCallback((newSize) => {
        loadGridData(selectedNodeForGrid, 1, newSize);
    }, [selectedNodeForGrid, loadGridData]);

    // View data for a node
    const viewNodeData = useCallback((node) => {
        if (node.data.status === 'completed') {
            loadGridData(node.id, 1, pageSize);
        }
    }, [loadGridData, pageSize]);

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5', color: 'black' }}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                                         <div className="flex items-center">
                         <HSBCLogo height={48} className="mr-4" />
                         <div>
                             <h1 className="text-2xl font-bold text-black">
                                 Data Workflow Tool
                             </h1>
                             <p className="text-gray-600 text-sm">
                                 Instance ID: {instanceId}
                             </p>
                             <p className="text-gray-500 text-xs mt-1">
                                 💡 Click on nodes to configure parameters (file paths, filters, etc.)
                             </p>
                         </div>
                     </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={runWorkflow}
                            disabled={isRunning || nodes.length === 0}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                isRunning || nodes.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                        >
                            <FaPlay className="inline mr-2" />
                            Run Workflow
                        </button>
                        <button
                            onClick={stopWorkflow}
                            disabled={!isRunning}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                !isRunning
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                        >
                            <FaStop className="inline mr-2" />
                            Stop
                        </button>
                        <button
                            onClick={resetWorkflow}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
                        >
                            <FaUndo className="inline mr-2" />
                            Reset
                        </button>
                                                 {nodes.length > 0 && (
                             <button
                                                                   onClick={() => {
                                      const unconfiguredNode = nodes.find(node => {
                                          const nodeDef = NODE_DEFINITIONS[node.data.type];
                                          if (!nodeDef.parameters) return false;
                                          const requiredParams = Object.entries(nodeDef.parameters)
                                              .filter(([_, param]) => param.required)
                                              .map(([key, _]) => key);
                                          return !requiredParams.every(param => 
                                              node.data.parameters && node.data.parameters[param] && node.data.parameters[param].toString().trim() !== ''
                                          );
                                      });
                                      console.log('Configure Next clicked, unconfiguredNode:', unconfiguredNode);
                                      if (unconfiguredNode) {
                                          setSelectedNode(unconfiguredNode);
                                          setIsParameterModalOpen(true);
                                      }
                                  }}
                                 className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-medium transition-colors"
                             >
                                 <FaEdit className="inline mr-2" />
                                 Configure Next
                             </button>
                         )}
                         {selectedNode && (
                             <button
                                 onClick={deleteSelectedNode}
                                 className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                             >
                                 <FaTrash className="inline mr-2" />
                                 Delete
                             </button>
                         )}
                    </div>
                </div>
            </div>

            <div className="flex h-[calc(100vh-80px)]">
                {/* Left Sidebar - Node Palette */}
                <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
                    <NodePalette onAddNode={addNode} />
                    
                                         {/* Workflow Status */}
                     <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                         <h3 className="text-sm font-semibold text-gray-900 mb-3">Workflow Status</h3>
                         <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                 <span className="text-sm text-gray-600">Status</span>
                                 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                     workflowStatus === 'running' ? 'bg-yellow-100 text-yellow-800' :
                                     workflowStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                     workflowStatus === 'stopped' ? 'bg-red-100 text-red-800' :
                                     'bg-gray-100 text-gray-800'
                                 }`}>
                                     {workflowStatus.charAt(0).toUpperCase() + workflowStatus.slice(1)}
                                 </span>
                             </div>
                             <div className="flex justify-between items-center">
                                 <span className="text-sm text-gray-600">Nodes</span>
                                 <span className="text-sm font-medium">{nodes.length}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                 <span className="text-sm text-gray-600">Connections</span>
                                 <span className="text-sm font-medium">{edges.length}</span>
                             </div>
                             {nodes.length > 0 && (
                                 <div className="flex justify-between items-center">
                                     <span className="text-sm text-gray-600">Configured</span>
                                     <span className={`text-sm font-medium ${
                                         nodes.every(node => {
                                             const nodeDef = NODE_DEFINITIONS[node.data.type];
                                             if (!nodeDef.parameters) return true;
                                             const requiredParams = Object.entries(nodeDef.parameters)
                                                 .filter(([_, param]) => param.required)
                                                 .map(([key, _]) => key);
                                             return requiredParams.every(param => 
                                                 node.data.parameters && node.data.parameters[param] && node.data.parameters[param].toString().trim() !== ''
                                             );
                                         })
                                         ? 'text-green-600'
                                         : 'text-orange-600'
                                     }`}>
                                         {nodes.filter(node => {
                                             const nodeDef = NODE_DEFINITIONS[node.data.type];
                                             if (!nodeDef.parameters) return true;
                                             const requiredParams = Object.entries(nodeDef.parameters)
                                                 .filter(([_, param]) => param.required)
                                                 .map(([key, _]) => key);
                                             return requiredParams.every(param => 
                                                 node.data.parameters && node.data.parameters[param] && node.data.parameters[param].toString().trim() !== ''
                                             );
                                         }).length}/{nodes.length}
                                     </span>
                                 </div>
                             )}
                         </div>
                     </div>
                </div>

                {/* Main Workflow Area */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onNodeContextMenu={onNodeContextMenu}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        connectionMode={ConnectionMode.Loose}
                        fitView
                        minZoom={0.5}
                        maxZoom={2}
                        className="bg-gray-50"
                    >
                        <Background color="#e5e7eb" gap={20} />
                        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
                        <MiniMap 
                            className="bg-white border border-gray-200 rounded-lg shadow-sm"
                            nodeColor="#3B82F6"
                        />
                        
                        {/* Output Panel Toggle */}
                        <Panel position="top-right" className="bg-white border border-gray-200 rounded-lg shadow-sm p-2">
                            <button
                                onClick={() => setIsOutputPanelOpen(!isOutputPanelOpen)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                {isOutputPanelOpen ? 'Hide' : 'Show'} Output
                            </button>
                        </Panel>
                        
                        {/* Grid Toggle */}
                        <Panel position="top-right" className="bg-white border border-gray-200 rounded-lg shadow-sm p-2" style={{ top: '60px' }}>
                            <button
                                onClick={() => setIsGridVisible(!isGridVisible)}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                                <FaTable className="inline mr-1" />
                                {isGridVisible ? 'Hide' : 'Show'} Grid
                            </button>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Right Sidebar - Output Panel */}
                {isOutputPanelOpen && (
                    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Data Output</h3>
                        
                        {nodes.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <FaCog className="mx-auto text-4xl mb-2" />
                                <p>Add nodes to see data output</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {nodes.map(node => {
                                    const output = nodeOutputs[node.id];
                                    const isCompleted = node.data.status === 'completed';
                                    
                                    return (
                                        <div
                                            key={node.id}
                                            onClick={() => setSelectedNodeForOutput(node)}
                                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                                selectedNodeForOutput?.id === node.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-900 truncate">
                                                    {node.data.label}
                                                </span>
                                                <div className={`w-2 h-2 rounded-full ${
                                                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                                }`} />
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {isCompleted && output 
                                                    ? `${output.count} records`
                                                    : 'No data'
                                                }
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Parameter Configuration Modal */}
            <ParameterModal
                node={selectedNode}
                isOpen={isParameterModalOpen}
                onClose={() => {
                    setIsParameterModalOpen(false);
                }}
                onSave={saveNodeParameters}
            />

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                    style={{
                        left: contextMenu.x,
                        top: contextMenu.y
                    }}
                >
                    <button
                        onClick={() => {
                            const node = nodes.find(n => n.id === contextMenu.nodeId);
                            console.log('Context menu - Edit Parameters clicked:', node);
                            setSelectedNode(node);
                            setIsParameterModalOpen(true);
                            setContextMenu(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                        <FaEdit />
                        Edit Parameters
                    </button>
                    <button
                        onClick={() => {
                            setSelectedNodeForOutput(nodes.find(n => n.id === contextMenu.nodeId));
                            setContextMenu(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                        <FaEye />
                        View Output
                    </button>
                    <button
                        onClick={() => {
                            viewNodeData(contextMenu.nodeId);
                            setContextMenu(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                        <FaTable />
                        View Data Grid
                    </button>
                    <hr className="my-1" />
                    <button
                        onClick={() => {
                            deleteSelectedNode();
                            setContextMenu(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                        <FaTrash />
                        Delete Node
                    </button>
                </div>
            )}

            {/* Data Grid Panel */}
            {isGridVisible && (
                <div className="fixed bottom-0 left-0 right-0 h-96 bg-white border-t border-gray-200 shadow-lg z-40">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Data Grid: {selectedNodeForGrid ? nodes.find(n => n.id === selectedNodeForGrid)?.data.label : 'No node selected'}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => selectedNodeForGrid && loadGridData(selectedNodeForGrid, 1, pageSize)}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                <FaDownload className="inline mr-1" />
                                Refresh
                            </button>
                            <button
                                onClick={() => setIsGridVisible(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimesCircle />
                            </button>
                        </div>
                    </div>
                    <div className="h-full overflow-auto p-4">
                        <DataGrid
                            data={gridData}
                            isLoading={isGridLoading}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                            currentPage={currentPage}
                            pageSize={pageSize}
                            totalRows={totalRows}
                        />
                    </div>
                </div>
            )}

            {/* Data Output Modal */}
            {selectedNodeForOutput && nodeOutputs[selectedNodeForOutput.id] && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Data Output: {selectedNodeForOutput.data.label}
                            </h3>
                            <button
                                onClick={() => setSelectedNodeForOutput(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimesCircle />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <DataOutputTab
                                selectedNode={{
                                    id: selectedNodeForOutput.id,
                                    data: {
                                        output: nodeOutputs[selectedNodeForOutput.id]
                                    }
                                }}
                                bottomBarHeight={window.innerHeight * 0.8}
                                onError={(error) => console.error('Data Output Error:', error)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
