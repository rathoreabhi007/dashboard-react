# Complete Integration Guide

## Overview
This guide provides step-by-step instructions to integrate all original functionality with the improved timeout and retry logic.

## Integration Strategy

### Phase 1: Backend Integration ✅ (Already Complete)
- ✅ Created `main_v2.py` with diskcache architecture
- ✅ Created `task_manager_v2.py` with JSON persistence
- ✅ Created optimized `gunicorn.conf.py`
- ✅ Created startup scripts for both platforms

### Phase 2: Frontend Integration

#### Step 1: API Service Integration
Replace your current `src/services/api.js` with the integrated version:

```javascript
// Import the integrated API service
import { IntegratedApiService as ApiService } from './api_integrated';

// The integrated service maintains 100% backward compatibility
// All existing code will work without changes
```

#### Step 2: Enhanced Polling Integration
Replace the infinite `while (true)` loop in your `runNodeAndWait` function:

```javascript
// OLD CODE (in page.js around line 1540):
while (true) { // Continue polling as long as status is running
    // ... polling logic
}

// NEW CODE (integrated approach):
// Option 1: Use enhanced polling (recommended)
ImprovedApiService.pollTaskStatus(
    response.process_id,
    onStatusUpdate,    // Status callback
    onComplete,        // Success callback  
    onError,          // Error callback
    {
        maxAttempts: 900,        // 30 minutes max
        interval: 2000,          // 2 seconds
        healthCheckInterval: 10000 // 10 seconds
    }
);

// Option 2: Use legacy polling (for backward compatibility)
ImprovedApiService.legacyPollTaskStatus(
    response.process_id,
    onStatusUpdate,
    onComplete,
    onError,
    {
        maxAttempts: 17280,  // 24 hours (original)
        interval: 5000       // 5 seconds (original)
    }
);
```

#### Step 3: Configuration Integration
Add configuration options to your constants:

```javascript
const CONSTANTS = {
    // ... existing constants
    
    // Enhanced API Configuration
    POLLING_INTERVAL: 2000,           // 2 seconds between polls
    MAX_POLLING_ATTEMPTS: 900,        // 30 minutes max
    REQUEST_TIMEOUT: 30000,           // 30 seconds timeout
    RETRY_ATTEMPTS: 3,                // Retry failed requests
    HEALTH_CHECK_INTERVAL: 10000,     // Check backend health
    TASK_TIMEOUT_MINUTES: 30,         // Task timeout
    
    // Legacy mode flag
    USE_LEGACY_MODE: false,           // Set to true for original behavior
};
```

#### Step 4: Health Monitoring Integration
Add backend health monitoring to your component:

```javascript
// Add to your component state
const [isBackendHealthy, setIsBackendHealthy] = useState(true);
const [backendHealthMessage, setBackendHealthMessage] = useState('');

// Add health monitoring effect
useEffect(() => {
    const checkHealth = async () => {
        try {
            const isHealthy = await ApiService.checkBackendHealth(true);
            setIsBackendHealthy(isHealthy);
            setBackendHealthMessage(isHealthy ? 'Backend is healthy' : 'Backend is not responding');
        } catch (error) {
            setIsBackendHealthy(false);
            setBackendHealthMessage(`Backend error: ${error.message}`);
        }
    };

    // Initial health check
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, CONSTANTS.HEALTH_CHECK_INTERVAL);
    return () => clearInterval(interval);
}, []);

// Add health indicator to your UI
<div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-lg text-sm font-medium ${
    isBackendHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}`}>
    {isBackendHealthy ? '🟢' : '🔴'} {backendHealthMessage}
</div>
```

#### Step 5: Enhanced Error Handling Integration
Replace error handling in your polling logic:

```javascript
// OLD CODE:
catch (error) {
    console.error(`❌ Error polling node ${nodeId}:`, error);
    // Basic error handling
}

// NEW CODE:
catch (error) {
    console.error(`❌ Error polling node ${nodeId}:`, error);
    
    // Enhanced error handling
    if (error.message.includes('timeout')) {
        console.error(`⏰ Node ${nodeId} timed out`);
        updateNodeStatus(nodeId, 'timeout');
        updateNodeOutput(nodeId, {
            status: 'failed',
            fail_message: `Task timed out after ${CONSTANTS.TASK_TIMEOUT_MINUTES} minutes`,
            execution_logs: [`Task timed out: ${error.message}`]
        });
    } else if (error.message.includes('Backend is not responding')) {
        console.error(`🔴 Backend health issue for node ${nodeId}`);
        updateNodeStatus(nodeId, 'failed');
        updateNodeOutput(nodeId, {
            status: 'failed',
            fail_message: 'Backend is not responding. Please check server status.',
            execution_logs: [`Backend health check failed: ${error.message}`]
        });
    } else {
        // Handle other errors
        updateNodeStatus(nodeId, 'failed');
        updateNodeOutput(nodeId, {
            status: 'failed',
            fail_message: error.message,
            execution_logs: [`Task failed: ${error.message}`]
        });
    }
}
```

#### Step 6: Timeout Warning Integration
Add timeout warnings to your node components:

```javascript
// Add to your CustomNode component
const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

// Check if node has been running too long
useEffect(() => {
    if (data.status === 'running' && data.startTime) {
        const runningTime = Date.now() - data.startTime;
        const timeoutThreshold = CONSTANTS.TASK_TIMEOUT_MINUTES * 60 * 1000;
        
        if (runningTime > timeoutThreshold) {
            setShowTimeoutWarning(true);
        }
    } else {
        setShowTimeoutWarning(false);
    }
}, [data.status, data.startTime]);

// Add timeout warning to your node JSX
{showTimeoutWarning && (
    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
        <FaExclamationTriangle className="w-3 h-3" />
    </div>
)}
```

## Complete Integration Checklist

### Backend Integration ✅
- [x] Deploy `main_v2.py` with diskcache architecture
- [x] Deploy `task_manager_v2.py` with JSON persistence
- [x] Configure `gunicorn.conf.py` for optimal performance
- [x] Test backend v2 functionality
- [x] Verify task persistence and cleanup

### Frontend Integration
- [ ] Replace `api.js` with `api_integrated.js`
- [ ] Update polling logic in `runNodeAndWait` function
- [ ] Add health monitoring to component
- [ ] Add timeout warnings to nodes
- [ ] Update error handling throughout
- [ ] Test all existing functionality
- [ ] Verify timeout and retry mechanisms
- [ ] Test backend health monitoring

### Testing Checklist
- [ ] Test basic node execution
- [ ] Test dependency chain execution
- [ ] Test timeout scenarios
- [ ] Test retry mechanisms
- [ ] Test backend health monitoring
- [ ] Test error handling
- [ ] Test UI responsiveness
- [ ] Test data persistence

### Deployment Checklist
- [ ] Backup current system
- [ ] Deploy backend v2
- [ ] Deploy frontend with integrated API
- [ ] Monitor system health
- [ ] Verify all functionality
- [ ] Update documentation
- [ ] Train users on new features

## Configuration Options

### Environment Variables
```bash
# Backend configuration
BACKEND_VERSION=v2
API_BASE_URL=http://127.0.0.1:8000

# Frontend configuration
REACT_APP_USE_LEGACY_MODE=false
REACT_APP_POLLING_INTERVAL=2000
REACT_APP_MAX_POLLING_ATTEMPTS=900
REACT_APP_REQUEST_TIMEOUT=30000
```

### Runtime Configuration
```javascript
// Enable/disable legacy mode
ApiService.enableLegacyMode();   // Use original behavior
ApiService.disableLegacyMode();  // Use enhanced behavior

// Configure timeouts
ApiService.setPollingInterval(2000);        // 2 seconds
ApiService.setMaxPollingAttempts(900);      // 30 minutes
ApiService.setRequestTimeout(30000);        // 30 seconds

// Get current configuration
const config = ApiService.getConfig();
console.log('Current config:', config);
```

## Migration Scenarios

### Scenario 1: Gradual Migration
1. Deploy backend v2 alongside v1
2. Deploy frontend with integrated API
3. Test with subset of users
4. Gradually migrate all users
5. Remove v1 systems

### Scenario 2: Direct Migration
1. Deploy backend v2
2. Deploy frontend with integrated API
3. Switch all traffic to v2
4. Monitor and verify
5. Remove v1 systems

### Scenario 3: Rollback Plan
1. Keep v1 systems running
2. Use feature flags for version selection
3. Quick rollback via configuration
4. Monitor both versions
5. Gradual migration back to v1 if needed

## Support and Troubleshooting

### Common Issues
1. **Timeout too aggressive**: Increase `MAX_POLLING_ATTEMPTS`
2. **Too many retries**: Decrease `RETRY_ATTEMPTS`
3. **Health check failing**: Check backend connectivity
4. **Legacy mode needed**: Enable `USE_LEGACY_MODE`

### Debug Commands
```javascript
// Check backend health
const health = await ApiService.checkBackendHealth();
console.log('Backend health:', health);

// Get system stats
const stats = await ApiService.getSystemStats();
console.log('System stats:', stats);

// Check configuration
const config = ApiService.getConfig();
console.log('API config:', config);
```

### Performance Monitoring
- Monitor task completion rates
- Monitor timeout occurrences
- Monitor retry attempts
- Monitor backend health
- Monitor response times

## Next Steps

1. **Review Integration Guide**: Understand all integration points
2. **Plan Migration**: Choose migration strategy
3. **Test Integration**: Test in development environment
4. **Deploy Gradually**: Start with backend v2
5. **Monitor Performance**: Watch key metrics
6. **Complete Migration**: Switch all traffic to v2
7. **Cleanup**: Remove v1 systems after validation

## Support

For questions or issues:
1. Check the troubleshooting section
2. Review the configuration options
3. Test with legacy mode enabled
4. Monitor backend health
5. Check system logs for errors
