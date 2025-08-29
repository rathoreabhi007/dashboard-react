import React from 'react';
import { render, screen } from '@testing-library/react';
import DataOutputTab from '../DataOutputTab';

// Mock the context provider
jest.mock('../../contexts/DataOutputContext', () => ({
    DataOutputProvider: ({ children }) => <div data-testid="data-output-provider">{children}</div>,
}));

// Mock child components
jest.mock('../DataOutputContent', () => {
    return function MockDataOutputContent() {
        return <div data-testid="data-output-content">Data Output Content</div>;
    };
});

jest.mock('../DataControls', () => {
    return function MockDataControls() {
        return <div data-testid="data-controls">Data Controls</div>;
    };
});

jest.mock('../OptimizedDataGrid', () => {
    return function MockOptimizedDataGrid() {
        return <div data-testid="optimized-data-grid">Optimized Data Grid</div>;
    };
});

jest.mock('../PaginationControls', () => {
    return function MockPaginationControls() {
        return <div data-testid="pagination-controls">Pagination Controls</div>;
    };
});

jest.mock('../../common/ErrorBoundary', () => {
    return function MockErrorBoundary({ children }) {
        return <div data-testid="error-boundary">{children}</div>;
    };
});

describe('DataOutputTab', () => {
    const mockSelectedNode = {
        data: {
            output: {
                calculation_results: {
                    headers: ['col_1', 'col_2', 'col_3'],
                    table: [
                        ['value1', 'value2', 'value3'],
                        ['value4', 'value5', 'value6']
                    ]
                },
                count: '2'
            }
        }
    };

    it('renders without crashing', () => {
        render(
            <DataOutputTab
                selectedNode={mockSelectedNode}
                bottomBarHeight={600}
            />
        );

        expect(screen.getByTestId('data-output-provider')).toBeInTheDocument();
        expect(screen.getByTestId('data-output-content')).toBeInTheDocument();
    });

    it('shows no data message when no data is available', () => {
        const emptyNode = {
            data: {
                output: {
                    calculation_results: {
                        headers: [],
                        table: []
                    }
                }
            }
        };

        render(
            <DataOutputTab
                selectedNode={emptyNode}
                bottomBarHeight={600}
            />
        );

        expect(screen.getByText('No data output. Please run the Node to see data.')).toBeInTheDocument();
    });

    it('handles missing calculation results gracefully', () => {
        const nodeWithoutResults = {
            data: {
                output: {}
            }
        };

        render(
            <DataOutputTab
                selectedNode={nodeWithoutResults}
                bottomBarHeight={600}
            />
        );

        expect(screen.getByText('No data output. Please run the Node to see data.')).toBeInTheDocument();
    });
});
