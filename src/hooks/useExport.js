import { useCallback } from 'react';
import { useDataOutput } from '../contexts/DataOutputContext';

/**
 * Custom hook for handling data export functionality
 * Implements streaming export for large datasets
 */
export const useExport = () => {
    const { state, computed, actions } = useDataOutput();

    const { data } = state;
    const { filteredData, visibleColumnsList } = computed;

    // Helper function to convert data to CSV format
    const convertToCSV = useCallback((data, columns) => {
        if (!data || !columns || data.length === 0 || columns.length === 0) {
            return '';
        }

        // Handle both object format (field/headerName) and string format (column names)
        const headers = columns.map(col => typeof col === 'string' ? col : (col.headerName || col.field));
        const headerRow = headers.join(',');

        const dataRows = data.map(row => {
            return columns.map(col => {
                const field = typeof col === 'string' ? col : col.field;
                const value = row[field];
                const cleanValue = value?.toString().replace(/"/g, '""') || '';
                return cleanValue.includes(',') ? `"${cleanValue}"` : cleanValue;
            }).join(',');
        });

        return [headerRow, ...dataRows].join('\n');
    }, []);

    // Helper function to download CSV
    const downloadCSV = useCallback((csvContent, fileName) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }, []);

    // Streaming export for large datasets
    const streamingExport = useCallback(async (data, columns, fileName) => {
        const chunkSize = 1000;

        // Create readable stream
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Write headers
                    const headers = columns.map(col => typeof col === 'string' ? col : (col.headerName || col.field));
                    controller.enqueue(headers.join(',') + '\n');

                    // Process data in chunks
                    for (let i = 0; i < data.length; i += chunkSize) {
                        const chunk = data.slice(i, i + chunkSize);
                        const csvChunk = chunk.map(row =>
                            columns.map(col => {
                                const field = typeof col === 'string' ? col : col.field;
                                const value = row[field];
                                const cleanValue = value?.toString().replace(/"/g, '""') || '';
                                return cleanValue.includes(',') ? `"${cleanValue}"` : cleanValue;
                            }).join(',')
                        ).join('\n');

                        controller.enqueue(csvChunk + '\n');

                        // Yield to prevent blocking UI
                        if (i % 5000 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }

                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            }
        });

        // Convert stream to blob and download
        const response = new Response(stream);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();

        URL.revokeObjectURL(url);
    }, []);

    // Export all data
    const exportToCsv = useCallback(() => {
        const fileName = `data_export_all_${new Date().toISOString().split('T')[0]}.csv`;

        if (data.table.length > 5000) {
            // Use streaming for large datasets
            streamingExport(data.table, visibleColumnsList, fileName);
        } else {
            // Use regular export for smaller datasets
            const csvContent = convertToCSV(data.table, visibleColumnsList);
            downloadCSV(csvContent, fileName);
        }
    }, [data.table, visibleColumnsList, convertToCSV, downloadCSV, streamingExport]);

    // Export filtered data
    const exportFilteredToCsv = useCallback(() => {
        const fileName = `data_export_filtered_${new Date().toISOString().split('T')[0]}.csv`;

        if (filteredData.length > 5000) {
            // Use streaming for large datasets
            streamingExport(filteredData, visibleColumnsList, fileName);
        } else {
            // Use regular export for smaller datasets
            const csvContent = convertToCSV(filteredData, visibleColumnsList);
            downloadCSV(csvContent, fileName);
        }
    }, [filteredData, visibleColumnsList, convertToCSV, downloadCSV, streamingExport]);



    // Clear all filters
    const clearAllFilters = useCallback(() => {
        actions.clearAllFilters();
    }, [actions]);

    return {
        exportToCsv,
        exportFilteredToCsv,
        clearAllFilters
    };
};
