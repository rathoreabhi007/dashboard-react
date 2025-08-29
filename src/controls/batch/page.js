// Converted from Next.js to Create React App

import { useState } from 'react';

export default function BatchControl() {
    const [selectedBatch, setSelectedBatch] = useState('batch1');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        GENERIC BATCH RUN CONTROL
                    </h1>
                    <p className="text-gray-300">
                        Monitor and manage batch processing operations with real-time tracking
                    </p>
                </div>

                {/* Main Control Panel */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Batch Selection */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-emerald-400 mb-4">Batch Selection</h2>
                        <select
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            className="w-full bg-slate-700 text-gray-300 rounded-md p-2 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value="batch1">Daily Reconciliation</option>
                            <option value="batch2">Weekly Summary</option>
                            <option value="batch3">Monthly Report</option>
                            <option value="batch4">Custom Batch</option>
                        </select>
                    </div>

                    {/* Batch Status Panel */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-emerald-400 mb-4">Batch Status</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">Status</span>
                                <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">Running</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">Progress</span>
                                <span className="text-emerald-400">75%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">Estimated Time</span>
                                <span className="text-emerald-400">5 min remaining</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-emerald-400 mb-4">Actions</h2>
                        <div className="space-y-3">
                            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-md transition-colors">
                                Start Batch
                            </button>
                            <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors">
                                Stop Batch
                            </button>
                            <button className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-2 px-4 rounded-md transition-colors">
                                View Logs
                            </button>
                        </div>
                    </div>
                </div>

                {/* Batch History */}
                <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-emerald-400 mb-4">Batch History</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-3 px-4 text-gray-300">Batch ID</th>
                                    <th className="text-left py-3 px-4 text-gray-300">Type</th>
                                    <th className="text-left py-3 px-4 text-gray-300">Start Time</th>
                                    <th className="text-left py-3 px-4 text-gray-300">Duration</th>
                                    <th className="text-left py-3 px-4 text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-700">
                                    <td className="py-3 px-4 text-gray-300">BAT001</td>
                                    <td className="py-3 px-4 text-gray-300">Daily Reconciliation</td>
                                    <td className="py-3 px-4 text-gray-300">2024-03-19 09:00</td>
                                    <td className="py-3 px-4 text-gray-300">15m 30s</td>
                                    <td className="py-3 px-4">
                                        <span className="text-emerald-400">Completed</span>
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-700">
                                    <td className="py-3 px-4 text-gray-300">BAT002</td>
                                    <td className="py-3 px-4 text-gray-300">Weekly Summary</td>
                                    <td className="py-3 px-4 text-gray-300">2024-03-18 23:00</td>
                                    <td className="py-3 px-4 text-gray-300">45m 12s</td>
                                    <td className="py-3 px-4">
                                        <span className="text-red-400">Failed</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
} 