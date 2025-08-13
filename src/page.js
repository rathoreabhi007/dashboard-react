import { FaChartLine, FaCheckCircle, FaCog, FaServer, FaBars, FaTimes } from 'react-icons/fa';
import { useState } from 'react';
import './globals.css';

function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openNewInstance = (type) => {
    // Generate a unique ID using timestamp and random number
    const uniqueId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // Open the instance page in a new tab
    window.open(`/instances/${type}/${uniqueId}`, '_blank');
  };

  return (
    <div className="relative isolate min-h-screen" style={{ backgroundColor: '#F5F5F5', color: 'black' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 px-0">
            <div className="flex items-center flex-shrink-0">
              <img src="/hsbc.png" alt="HSBC Logo" className="h-16 w-auto" />
              <span className="text-black font-semibold text-lg">HSBC</span>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-300 hover:text-slate-700 focus:outline-none"
              >
                {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
              </button>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-black hover:text-slate-700 transition-colors">Features</a>
              <button className="text-black hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer">Documentation</button>
              <button className="text-black hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer">Support</button>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} pb-4`}>
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-black hover:text-slate-700 transition-colors">Features</a>
              <button className="text-black hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer">Documentation</button>
              <button className="text-black hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer">Support</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-col min-h-screen">
        {/* Hero section with reduced padding */}
        <div className="px-6 pt-24 pb-8 sm:pt-32 sm:pb-12 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-black sm:text-6xl">
              Generic Control Dashboard
            </h1>
            <p className="mt-6 text-lg leading-8 text-black">
              In House Reconciliation Framework - A comprehensive solution for monitoring and managing reconciliation processes.
            </p>
          </div>
        </div>

        {/* Features section with adjusted padding */}
        <div id="features" className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {/* Feature 1 */}
            <div
              onClick={() => openNewInstance('completeness')}
              className="group rounded-lg border border-slate-200 p-6 transition-all duration-300 ease-in-out bg-white hover:scale-105 hover:shadow-xl hover:shadow-slate-700/10 cursor-pointer transform-gpu"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-white text-red-500 transition-colors">
                  <FaCheckCircle size={32} />
                </div>
                <h3 className="text-lg font-semibold text-black">GENERIC COMPLETENESS CONTROL</h3>
              </div>
              <p className="mt-2 text-black">
                Monitor and verify data completeness across systems, ensuring all required information is present and accurately reconciled.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              onClick={() => openNewInstance('quality')}
              className="group rounded-lg border border-slate-200 p-6 transition-all duration-300 ease-in-out bg-white hover:scale-105 hover:shadow-xl hover:shadow-slate-700/10 cursor-pointer transform-gpu"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-white text-red-500 transition-colors">
                  <FaChartLine size={32} />
                </div>
                <h3 className="text-lg font-semibold text-black">GENERIC QUALITY & ASSURANCE CONTROL</h3>
              </div>
              <p className="mt-2 text-black">
                Ensure data quality and integrity through comprehensive validation checks and quality assurance protocols.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              onClick={() => openNewInstance('batch')}
              className="group rounded-lg border border-slate-200 p-6 transition-all duration-300 ease-in-out bg-white hover:scale-105 hover:shadow-xl hover:shadow-slate-700/10 cursor-pointer transform-gpu"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-white text-red-500 transition-colors">
                  <FaServer size={32} />
                </div>
                <h3 className="text-lg font-semibold text-black">GENERIC BATCH RUN CONTROL</h3>
              </div>
              <p className="mt-2 text-black">
                Manage and monitor batch processing operations with real-time tracking and execution control capabilities.
              </p>
            </div>

            {/* Feature 4 */}
            <div
              onClick={() => openNewInstance('config')}
              className="group rounded-lg border border-slate-200 p-6 transition-all duration-300 ease-in-out bg-white hover:scale-105 hover:shadow-xl hover:shadow-slate-700/10 cursor-pointer transform-gpu"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-white text-red-500 transition-colors">
                  <FaCog size={32} />
                </div>
                <h3 className="text-lg font-semibold text-black">GENERIC AUTO CONFIG CHECKER</h3>
              </div>
              <p className="mt-2 text-black">
                Automatically verify and validate system configurations, ensuring alignment with established standards and requirements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
