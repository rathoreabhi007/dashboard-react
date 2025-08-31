import React from 'react';
import { FaSpinner, FaTable, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const DataGrid = ({ 
    data, 
    isLoading, 
    onPageChange, 
    onPageSizeChange,
    currentPage, 
    pageSize, 
    totalRows 
}) => {
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
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {header}
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
                            <FaChevronLeft className="inline mr-1" />
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
                            <FaChevronRight className="inline ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataGrid;
