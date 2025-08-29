import React, { memo } from 'react';
import { useDataOutput } from '../../contexts/DataOutputContext';
import { useColumnResize } from '../../contexts/ColumnResizeContext';
import { useExport } from '../../hooks/useExport';
import { useColumnReorder } from '../../hooks/useColumnReorder';
import ColumnSelector from './ColumnSelector';
import FilterControls from './FilterControls';

/**
 * Data Controls Component
 * Handles export functionality, column selection, and filter controls
 */
const DataControls = memo(() => {
    const { state } = useDataOutput();
    const { exportToCsv, exportFilteredToCsv, clearAllFilters } = useExport();
    const { customColumnWidths, resetColumnWidths } = useColumnResize();
    const { resetColumnOrder } = useColumnReorder();

    const { filters } = state;

    const hasActiveFilters = Object.keys(filters.columnFilters).length > 0;
    const hasCustomColumnOrder = filters.columnOrder.length > 0;
    const hasCustomColumnWidths = Object.keys(customColumnWidths).length > 0;

    return (
        <div className="data-controls">
            <div className="data-controls-content">
                {/* Export Buttons */}
                <div className="export-buttons">
                    <button
                        onClick={clearAllFilters}
                        className="export-button export-button-clear"
                        title="Clear all applied filters"
                    >
                        Clear All Filters
                    </button>

                    <button
                        onClick={exportToCsv}
                        className="export-button export-button-all"
                        title="Export all data to CSV"
                    >
                        Export All to CSV
                    </button>

                    <button
                        onClick={exportFilteredToCsv}
                        className="export-button export-button-filtered"
                        title="Export filtered data to CSV"
                    >
                        Export Filtered to CSV
                    </button>

                    {hasCustomColumnWidths && (
                        <button
                            onClick={resetColumnWidths}
                            className="export-button export-button-reset"
                            title="Reset all column widths to default"
                        >
                            Reset Column Widths
                        </button>
                    )}

                    {hasCustomColumnOrder && (
                        <button
                            onClick={resetColumnOrder}
                            className="export-button export-button-reset-order"
                            title="Reset column order to original"
                        >
                            Reset Column Order
                        </button>
                    )}

                </div>

                {/* Right Side Controls */}
                <div className="control-panels">
                    {/* Column Selector */}
                    <ColumnSelector />

                    {/* Active Filters Display */}
                    {hasActiveFilters && <FilterControls />}
                </div>
            </div>
        </div>
    );
});

DataControls.displayName = 'DataControls';

export default DataControls;
