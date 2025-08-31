import React from 'react';

/**
 * Node Name Display Component
 * Shows only the name of the node whose data is currently being viewed
 * Simple, minimal display without container or extra information
 */
const NodeNameDisplay = ({ selectedNode, className = '' }) => {
    // Don't render if no node is selected or no node data
    if (!selectedNode || !selectedNode.data) {
        return null;
    }

    const { data } = selectedNode;
    const nodeName = data.fullName || data.label || selectedNode.id;

    return (
        <div className={`node-name-display ${className}`}>
            <span className="text-sm font-medium text-slate-700">
                {nodeName}
            </span>
        </div>
    );
};

export default NodeNameDisplay;
