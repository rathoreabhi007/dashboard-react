import React from 'react';
import { FaTimesCircle } from 'react-icons/fa';

/**
 * Failed Node Indicator Component
 * Displays a "Fail" indicator and "View Error" button for failed nodes
 * This is a separate component to avoid affecting existing functionality
 */
const FailedNodeIndicator = ({
    nodeId,
    nodeData,
    nodeOutputs,
    onViewError
}) => {
    // Only render if node status is failed
    if (nodeData.status !== 'failed') {
        return null;
    }

    const handleViewError = (e) => {
        e.stopPropagation();

        // Create a mock output with fail_message for testing if nodeOutputs doesn't have it
        const output = nodeOutputs[nodeId] || {
            fail_message: "Test failure: This is a simulated error for testing the failed node functionality. The node encountered a critical error during data processing.",
            execution_logs: [
                "Starting processing at " + new Date().toISOString(),
                "Processing with environment: TEST_FAILURE",
                "Processing failed at " + new Date().toISOString()
            ],
            status: "failed"
        };

        // Call the parent handler with the node data and output
        onViewError({
            id: nodeId,
            data: { ...nodeData, output }
        });
    };

    return (
        <div className="mt-1 px-2 py-1 bg-red-100 border border-red-300 rounded text-[8px] text-red-700 font-medium">
            <div className="flex items-center justify-center gap-1">
                <FaTimesCircle className="w-2 h-2" />
                <span>Fail</span>
            </div>
            <button
                onClick={handleViewError}
                className="mt-1 w-full bg-red-200 hover:bg-red-300 text-red-800 text-[7px] px-1 py-0.5 rounded transition-colors"
            >
                View Error
            </button>
        </div>
    );
};

export default FailedNodeIndicator;

