// Converted from Next.js to Create React App

import { useState } from 'react';

export default function QualityControl() {
    const [selectedMetric, setSelectedMetric] = useState('accuracy');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        GENERIC QUALITY & ASSURANCE CONTROL
                    </h1>
                    <p className="text-gray-300">
                        Monitor and maintain data quality standards across your systems
                    </p>
                </div>

                {/* Main Control Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Metric Selection */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-emerald-400 mb-4">Quality Metrics</h2>
                        <select
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                            className="w-full bg-slate-700 text-gray-300 rounded-md p-2 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value="accuracy">Data Accuracy</option>
                            <option value="consistency">Data Consistency</option>
                            <option value="validity">Data Validity</option>
                            <option value="timeliness">Data Timeliness</option>
                        </select>
                    </div>

                    {/* Quality Score Panel */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-emerald-400 mb-4">Quality Score</h2>
                        <div className="text-center">
                            <div className="text-5xl font-bold text-emerald-400 mb-2">98.5%</div>
                            <div className="text-gray-300">Overall Quality Score</div>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-semibold text-emerald-400">245</div>
                                    <div className="text-sm text-gray-300">Checks Passed</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-semibold text-red-400">4</div>
                                    <div className="text-sm text-gray-300">Checks Failed</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-emerald-400 mb-4">Actions</h2>
                        <div className="space-y-3">
                            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-md transition-colors">
                                Run Quality Check
                            </button>
                            <button className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-2 px-4 rounded-md transition-colors">
                                Generate Report
                            </button>
                            <button className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-2 px-4 rounded-md transition-colors">
                                View Trends
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quality Issues Table */}
                <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-emerald-400 mb-4">Quality Issues</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-3 px-4 text-gray-300">Issue ID</th>
                                    <th className="text-left py-3 px-4 text-gray-300">Type</th>
                                    <th className="text-left py-3 px-4 text-gray-300">Description</th>
                                    <th className="text-left py-3 px-4 text-gray-300">Severity</th>
                                    <th className="text-left py-3 px-4 text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-700">
                                    <td className="py-3 px-4 text-gray-300">QA001</td>
                                    <td className="py-3 px-4 text-gray-300">Data Format</td>
                                    <td className="py-3 px-4 text-gray-300">Invalid date format in customer records</td>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Medium</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-emerald-400">Fixed</span>
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-700">
                                    <td className="py-3 px-4 text-gray-300">QA002</td>
                                    <td className="py-3 px-4 text-gray-300">Data Consistency</td>
                                    <td className="py-3 px-4 text-gray-300">Mismatched product codes</td>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">High</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-yellow-400">In Progress</span>
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