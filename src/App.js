import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './globals.css';
import HomePage from './page';
import CompletenessInstance from './instances/completeness/CompletenessInstance';
import QualityInstance from './instances/quality/QualityInstance';
import BatchInstance from './instances/batch/BatchInstance';
import ConfigInstance from './instances/config/ConfigInstance';
import WorkflowInstance from './instances/workflow/WorkflowInstance';

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/instances/completeness/:id" element={<CompletenessInstance />} />
                    <Route path="/instances/quality/:id" element={<QualityInstance />} />
                    <Route path="/instances/batch/:id" element={<BatchInstance />} />
                    <Route path="/instances/config/:id" element={<ConfigInstance />} />
                    <Route path="/instances/workflow/:id" element={<WorkflowInstance />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;