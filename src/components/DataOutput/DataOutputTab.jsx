import React, { memo, useMemo, useEffect, useState } from 'react';
import { DataOutputProvider } from '../../contexts/DataOutputContext';
import { ColumnResizeProvider } from '../../contexts/ColumnResizeContext';
import DataOutputContent from './DataOutputContent';
import ErrorBoundary from '../common/ErrorBoundary';

/**
 * Main Data Output Tab Component
 * Serves as the container for the optimized data output interface
 */
const DataOutputTab = memo(({
    selectedNode,
    bottomBarHeight = 600,
    onError
}) => {
    // Add a key to force re-render when selectedNode changes
    const nodeKey = selectedNode?.id || 'no-node';
    
    // Force re-render when selectedNode changes
    const [forceUpdate, setForceUpdate] = useState(0);
    
    useEffect(() => {
        console.log('🔄 DataOutputTab: selectedNode changed, forcing update:', selectedNode?.id);
        setForceUpdate(prev => prev + 1);
    }, [selectedNode?.id]);
    
    // Calculate available height based on bottomBarHeight
    const availableHeight = bottomBarHeight - 20; // Reduced padding since DataOverview is removed
    // Memoize data processing to prevent unnecessary re-renders
    const processedData = useMemo(() => {
        console.log('🔄 DataOutputTab: Processing data for node:', selectedNode?.id, selectedNode?.data?.fullName);
        
        if (!selectedNode?.data?.output?.calculation_results) {
            console.log('❌ DataOutputTab: No calculation results found');
            return {
                headers: [],
                table: [],
                totalRows: 0,
                displayedRows: 0,
                columns: 0
            };
        }

        const { headers, table, total_rows_generated } = selectedNode.data.output.calculation_results;
        const totalCount = selectedNode.data.output.count;

        console.log('📊 DataOutputTab: Processing data:', {
            nodeId: selectedNode.id,
            nodeName: selectedNode.data.fullName,
            headersCount: headers?.length,
            tableRows: table?.length,
            totalCount: totalCount
        });

        // Transform table data to object format for easier processing
        const transformedTable = table ? table.map((row, index) => {
            const obj = {};
            headers.forEach((header, colIndex) => {
                obj[header] = row[colIndex] || '';
            });
            return obj;
        }) : [];

        const result = {
            headers: headers || [],
            table: transformedTable,
            totalRows: totalCount ? parseInt(totalCount) : (total_rows_generated || transformedTable.length),
            displayedRows: transformedTable.length,
            columns: headers ? headers.length : 0
        };

        console.log('✅ DataOutputTab: Processed data result:', {
            headers: result.headers.slice(0, 3), // Show first 3 headers
            tableRows: result.table.length,
            totalRows: result.totalRows
        });

        return result;
    }, [selectedNode?.id, selectedNode?.data?.fullName, selectedNode?.data?.output?.calculation_results, selectedNode?.data?.output?.count]);

    // Check if node has failed and show fail_message
    if (selectedNode?.data?.output?.fail_message) {
        return (
            <div className="data-output-error">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-red-800">Node Execution Failed</h3>
                            <p className="text-sm text-red-600">The node encountered an error during execution</p>
                        </div>
                    </div>
                    <div className="bg-white border border-red-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-red-800 mb-2">Error Details:</h4>
                        <pre className="text-sm text-red-700 bg-red-50 p-3 rounded border overflow-auto max-h-96">
                            {selectedNode.data.output.fail_message}
                        </pre>
                    </div>
                    {selectedNode?.data?.output?.execution_logs && (
                        <div className="mt-4 bg-white border border-red-200 rounded-md p-4">
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
            </div>
        );
    }

    // Early return if no data
    if (!processedData.headers.length || !processedData.table.length) {
        return (
            <div className="data-output-empty">
                <p className="text-slate-400 text-center py-8">
                    No data output. Please run the Node to see data.
                </p>
            </div>
        );
    }

    return (
        <ErrorBoundary onError={onError}>
            <DataOutputProvider
                key={`${nodeKey}-${forceUpdate}`}
                initialData={processedData}
                nodeOutput={selectedNode.data.output}
            >
                <ColumnResizeProvider>
                    <div style={{ height: `${availableHeight}px` }}>
                        <DataOutputContent height={`${availableHeight}px`} />
                    </div>
                </ColumnResizeProvider>
            </DataOutputProvider>
        </ErrorBoundary>
    );
});

DataOutputTab.displayName = 'DataOutputTab';

export default DataOutputTab;
