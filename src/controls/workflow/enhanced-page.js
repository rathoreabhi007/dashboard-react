// Enhanced Workflow Tool with User Input Validation and Data Grid

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
import ApiService from '../../services/api';

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

// Enhanced Node definitions with validation
const NODE_DEFINITIONS = {
    [NODE_TYPES.READ_CSV]: {
        label: 'Read CSV',
        icon: FaFileCsv,
        color: '#3B82F6',
        parameters: {
            file_path: { 
                type: 'string', 
                label: 'File Path', 
                required: true, 
                placeholder: '/path/to/file.csv',
                validation: (value) => value && value.trim() !== '' ? null : 'File path is required'
            },
            delimiter: { 
                type: 'string', 
                label: 'Delimiter', 
                required: false, 
                default: ',', 
                placeholder: ',',
                validation: (value) => value && value.length === 1 ? null : 'Delimiter must be a single character'
            },
            encoding: { 
                type: 'string', 
                label: 'Encoding', 
                required: false, 
                default: 'utf-8', 
                placeholder: 'utf-8',
                validation: (value) => ['utf-8', 'latin-1', 'cp1252'].includes(value) ? null : 'Invalid encoding'
            },
            header: { 
                type: 'boolean', 
                label: 'Has Header', 
                required: false, 
                default: true 
            },
            skip_rows: { 
                type: 'number', 
                label: 'Skip Rows', 
                required: false, 
                default: 0, 
                placeholder: '0',
                validation: (value) => value >= 0 ? null : 'Skip rows must be non-negative'
            }
        }
    },
    [NODE_TYPES.READ_PARQUET]: {
        label: 'Read Parquet',
        icon: FaFileAlt,
        color: '#10B981',
        parameters: {
            file_path: { 
                type: 'string', 
                label: 'File Path', 
                required: true, 
                placeholder: '/path/to/file.parquet',
                validation: (value) => value && value.trim() !== '' ? null : 'File path is required'
            },
            columns: { 
                type: 'string', 
                label: 'Columns (comma-separated)', 
                required: false, 
                placeholder: 'col1,col2,col3',
                validation: (value) => !value || value.split(',').every(col => col.trim()) ? null : 'Invalid column format'
            },
            filters: { 
                type: 'string', 
                label: 'Row Filters', 
                required: false, 
                placeholder: 'column > 100' 
            }
        }
    },
    [NODE_TYPES.READ_EXCEL]: {
        label: 'Read Excel',
        icon: FaFileExcel,
        color: '#059669',
        parameters: {
            file_path: { 
                type: 'string', 
                label: 'File Path', 
                required: true, 
                placeholder: '/path/to/file.xlsx',
                validation: (value) => value && value.trim() !== '' ? null : 'File path is required'
            },
            sheet_name: { 
                type: 'string', 
                label: 'Sheet Name', 
                required: false, 
                placeholder: 'Sheet1' 
            },
            header_row: { 
                type: 'number', 
                label: 'Header Row', 
                required: false, 
                default: 0, 
                placeholder: '0',
                validation: (value) => value >= 0 ? null : 'Header row must be non-negative'
            },
            skip_rows: { 
                type: 'number', 
                label: 'Skip Rows', 
                required: false, 
                default: 0, 
                placeholder: '0',
                validation: (value) => value >= 0 ? null : 'Skip rows must be non-negative'
            }
        }
    },
    [NODE_TYPES.CONVERT_PARQUET]: {
        label: 'Convert to Parquet',
        icon: FaExchangeAlt,
        color: '#F59E0B',
        parameters: {
            output_path: { 
                type: 'string', 
                label: 'Output Path', 
                required: true, 
                placeholder: '/path/to/output.parquet',
                validation: (value) => value && value.trim() !== '' ? null : 'Output path is required'
            },
            compression: { 
                type: 'select', 
                label: 'Compression', 
                required: false, 
                default: 'snappy', 
                options: ['snappy', 'gzip', 'brotli', 'none'] 
            },
            partition_by: { 
                type: 'string', 
                label: 'Partition By', 
                required: false, 
                placeholder: 'date,region',
                validation: (value) => !value || value.split(',').every(col => col.trim()) ? null : 'Invalid partition format'
            }
        }
    },
    [NODE_TYPES.FILTER]: {
        label: 'Filter Data',
        icon: FaFilter,
        color: '#EF4444',
        parameters: {
            condition: { 
                type: 'string', 
                label: 'Filter Condition', 
                required: true, 
                placeholder: 'column > 100 AND status == "active"',
                validation: (value) => value && value.trim() !== '' ? null : 'Filter condition is required'
            },
            case_sensitive: { 
                type: 'boolean', 
                label: 'Case Sensitive', 
                required: false, 
                default: false 
            }
        }
    },
    [NODE_TYPES.JOIN]: {
        label: 'Join Data',
        icon: FaLink,
        color: '#8B5CF6',
        parameters: {
            join_type: { 
                type: 'select', 
                label: 'Join Type', 
                required: true, 
                default: 'inner', 
                options: ['inner', 'left', 'right', 'outer'] 
            },
            left_key: { 
                type: 'string', 
                label: 'Left Key', 
                required: true, 
                placeholder: 'id',
                validation: (value) => value && value.trim() !== '' ? null : 'Left key is required'
            },
            right_key: { 
                type: 'string', 
                label: 'Right Key', 
                required: true, 
                placeholder: 'id',
                validation: (value) => value && value.trim() !== '' ? null : 'Right key is required'
            },
            suffixes: { 
                type: 'string', 
                label: 'Suffixes', 
                required: false, 
                default: '_x,_y', 
                placeholder: '_left,_right',
                validation: (value) => !value || value.split(',').length === 2 ? null : 'Must provide exactly 2 suffixes'
            }
        }
    },
    [NODE_TYPES.AGGREGATE]: {
        label: 'Aggregate Data',
        icon: FaChartBar,
        color: '#EC4899',
        parameters: {
            group_by: { 
                type: 'string', 
                label: 'Group By', 
                required: true, 
                placeholder: 'date,region',
                validation: (value) => value && value.trim() !== '' ? null : 'Group by is required'
            },
            aggregations: { 
                type: 'string', 
                label: 'Aggregations', 
                required: true, 
                placeholder: 'sum:amount,count:id,mean:value',
                validation: (value) => value && value.trim() !== '' ? null : 'Aggregations are required'
            },
            sort_by: { 
                type: 'string', 
                label: 'Sort By', 
                required: false, 
                placeholder: 'date DESC' 
            }
        }
    },
    [NODE_TYPES.OUTPUT]: {
        label: 'Data Output',
        icon: FaCheckCircle,
        color: '#10B981',
        parameters: {
            output_type: { 
                type: 'select', 
                label: 'Output Type', 
                required: true, 
                default: 'preview', 
                options: ['preview', 'download', 'save'] 
            },
            max_rows: { 
                type: 'number', 
                label: 'Max Rows', 
                required: false, 
                default: 1000, 
                placeholder: '1000',
                validation: (value) => value > 0 ? null : 'Max rows must be positive'
            }
        }
    }
};

// Enhanced Parameter Modal with Validation
const EnhancedParameterModal = ({ node, isOpen, onClose, onSave }) => {
    const [parameters, setParameters] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [isValid, setIsValid] = useState(true);
    const nodeDef = NODE_DEFINITIONS[node?.type];

    useEffect(() => {
        if (node) {
            const initialParams = {};
            if (nodeDef) {
                Object.entries(nodeDef.parameters).forEach(([key, param]) => {
                    initialParams[key] = node.parameters?.[key] ?? param.default ?? '';
                });
            }
            setParameters(initialParams);
            validateAllParameters(initialParams);
        }
    }, [node, nodeDef]);

    const validateParameter = (key, value) => {
        if (!nodeDef?.parameters[key]) return null;
        
        const param = nodeDef.parameters[key];
        
        // Required field validation
        if (param.required && (!value || value === '')) {
            return `${param.label} is required`;
        }
        
        // Custom validation function
        if (param.validation) {
            return param.validation(value);
        }
        
        return null;
    };

    const validateAllParameters = (params) => {
        const errors = {};
        let valid = true;

        Object.keys(params).forEach(key => {
            const error = validateParameter(key, params[key]);
            if (error) {
                errors[key] = error;
                valid = false;
            }
        });

        setValidationErrors(errors);
        setIsValid(valid);
        return valid;
    };

    const handleParameterChange = (key, value) => {
        const newParams = { ...parameters, [key]: value };
        setParameters(newParams);
        
        const error = validateParameter(key, value);
        setValidationErrors(prev => ({
            ...prev,
            [key]: error
        }));
        
        // Check if all parameters are valid
        const allValid = validateAllParameters(newParams);
        setIsValid(allValid);
    };

    const handleSave = () => {
        if (isValid) {
            onSave(node.id, parameters);
            onClose();
        }
    };

    if (!isOpen || !node || !nodeDef) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Configure {nodeDef.label}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FaTimesCircle />
                    </button>
                </div>

                <div className="space-y-4">
                    {Object.entries(nodeDef.parameters).map(([key, param]) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {param.label}
                                {param.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            
                            {param.type === 'string' && (
                                <input
                                    type="text"
                                    value={parameters[key] || ''}
                                    onChange={(e) => handleParameterChange(key, e.target.value)}
                                    placeholder={param.placeholder}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors[key] ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                            )}
                            
                            {param.type === 'number' && (
                                <input
                                    type="number"
                                    value={parameters[key] || ''}
                                    onChange={(e) => handleParameterChange(key, e.target.value)}
                                    placeholder={param.placeholder}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors[key] ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                            )}
                            
                            {param.type === 'boolean' && (
                                <select
                                    value={parameters[key] !== undefined ? parameters[key] : param.default}
                                    onChange={(e) => handleParameterChange(key, e.target.value === 'true')}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors[key] ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    <option value={true}>True</option>
                                    <option value={false}>False</option>
                                </select>
                            )}
                            
                            {param.type === 'select' && (
                                <select
                                    value={parameters[key] || param.default}
                                    onChange={(e) => handleParameterChange(key, e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors[key] ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    {param.options.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            )}

                            {validationErrors[key] && (
                                <p className="text-red-500 text-xs mt-1">{validationErrors[key]}</p>
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
                        disabled={!isValid}
                        className={`flex-1 px-4 py-2 rounded-md font-medium ${
                            isValid 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

// Data Grid Component with Pagination
const DataGrid = ({ data, isLoading, onPageChange, currentPage, pageSize, totalRows, onPageSizeChange }) => {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const totalPages = Math.ceil(totalRows / pageSize);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <FaSpinner className="animate-spin text-4xl text-blue-500" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <FaTable className="mx-auto text-4xl mb-2" />
                <p>No data available</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* Grid Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
                <p className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRows)} of {totalRows} records
                </p>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {data[0] && data[0].map((header, index) => (
                                <th
                                    key={index}
                                    onClick={() => handleSort(index)}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                >
                                    <div className="flex items-center gap-2">
                                        {header}
                                        {sortColumn === index && (
                                            <span className="text-gray-400">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {typeof cell === 'string' && cell.length > 50 
                                            ? `${cell.substring(0, 50)}...` 
                                            : cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Rows per page:</span>
                        <select 
                            value={pageSize} 
                            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        
                        <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Enhanced Workflow Component
export default function EnhancedWorkflowTool({ instanceId }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [isParameterModalOpen, setIsParameterModalOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [workflowStatus, setWorkflowStatus] = useState('idle');
    const [nodeOutputs, setNodeOutputs] = useState({});
    
    // Data grid state
    const [gridData, setGridData] = useState([]);
    const [isGridLoading, setIsGridLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalRows, setTotalRows] = useState(0);
    const [selectedNodeForGrid, setSelectedNodeForGrid] = useState(null);
    const [isGridVisible, setIsGridVisible] = useState(false);

    const nodeTypes = useMemo(() => ({
        dataNode: ({ data, id, selected }) => (
            <div className={`px-4 py-3 rounded-lg border-2 shadow-lg transition-all duration-200 ${
                selected 
                    ? 'border-blue-500 shadow-blue-500/20' 
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
                        style={{ backgroundColor: `${NODE_DEFINITIONS[data.type]?.color}20` }}
                    >
                        {NODE_DEFINITIONS[data.type]?.icon && 
                         <NODE_DEFINITIONS[data.type].icon className="text-lg" style={{ color: NODE_DEFINITIONS[data.type].color }} />
                        }
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                            {NODE_DEFINITIONS[data.type]?.label || data.type}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {data.label || data.id}
                        </div>
                    </div>
                </div>

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
        )
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
        setSelectedNode(node);
        setIsParameterModalOpen(true);
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

    // Run workflow
    const runWorkflow = useCallback(async () => {
        setIsRunning(true);
        setWorkflowStatus('running');
        
        for (const node of nodes) {
            try {
                setNodes(nds => nds.map(n => 
                    n.id === node.id 
                        ? { ...n, data: { ...n.data, status: 'running' } }
                        : n
                ));
                
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                setNodes(nds => nds.map(n => 
                    n.id === node.id 
                        ? { ...n, data: { ...n.data, status: 'completed' } }
                        : n
                ));
                
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
                
            } catch (error) {
                console.error(`Error running node ${node.id}:`, error);
                setNodes(nds => nds.map(n => 
                    n.id === node.id 
                        ? { ...n, data: { ...n.data, status: 'failed' } }
                        : n
                ));
            }
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
        setIsGridVisible(false);
        setGridData([]);
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

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5', color: 'black' }}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <HSBCLogo height={48} className="mr-4" />
                        <div>
                            <h1 className="text-2xl font-bold text-black">
                                Enhanced Data Workflow Tool
                            </h1>
                            <p className="text-gray-600 text-sm">
                                Instance ID: {instanceId}
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
                {/* Left Sidebar */}
                <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Data Operations</h3>
                        <div className="space-y-2">
                            {Object.entries(NODE_DEFINITIONS).map(([type, def]) => {
                                const Icon = def.icon;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => addNode(type)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
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
                        
                        {/* Grid Toggle */}
                        <Panel position="top-right" className="bg-white border border-gray-200 rounded-lg shadow-sm p-2">
                            <button
                                onClick={() => setIsGridVisible(!isGridVisible)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                <FaTable className="inline mr-1" />
                                {isGridVisible ? 'Hide' : 'Show'} Grid
                            </button>
                        </Panel>
                    </ReactFlow>
                </div>
            </div>

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

            {/* Enhanced Parameter Modal */}
            <EnhancedParameterModal
                node={selectedNode}
                isOpen={isParameterModalOpen}
                onClose={() => {
                    setIsParameterModalOpen(false);
                    setSelectedNode(null);
                }}
                onSave={saveNodeParameters}
            />
        </div>
    );
}
