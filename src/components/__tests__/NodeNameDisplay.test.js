import React from 'react';
import { render, screen } from '@testing-library/react';
import NodeNameDisplay from '../NodeNameDisplay';

describe('NodeNameDisplay', () => {
    const mockSelectedNode = {
        id: 'test-node-123',
        data: {
            fullName: 'Test Node Name',
            type: 'data_processing',
            status: 'completed',
            output: {
                count: '1500'
            }
        }
    };

    it('renders node name correctly', () => {
        render(<NodeNameDisplay selectedNode={mockSelectedNode} />);

        expect(screen.getByText('Test Node Name')).toBeInTheDocument();
    });

    it('does not render when no node is selected', () => {
        const { container } = render(<NodeNameDisplay selectedNode={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('does not render when node data is missing', () => {
        const { container } = render(<NodeNameDisplay selectedNode={{ id: 'test' }} />);
        expect(container.firstChild).toBeNull();
    });

    it('handles missing node properties gracefully', () => {
        const incompleteNode = {
            id: 'test-node',
            data: {
                // Missing fullName
            }
        };

        render(<NodeNameDisplay selectedNode={incompleteNode} />);

        expect(screen.getByText('test-node')).toBeInTheDocument(); // Uses ID as fallback
    });

    it('uses fallback to node ID when fullName is missing', () => {
        const nodeWithoutName = {
            id: 'fallback-node-id',
            data: {
                // No fullName or label
            }
        };

        render(<NodeNameDisplay selectedNode={nodeWithoutName} />);
        expect(screen.getByText('fallback-node-id')).toBeInTheDocument();
    });
});
