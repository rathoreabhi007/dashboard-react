# Frontend Migration Guide - Enhanced Timeout & Retry Logic

## Overview

This guide shows how to migrate your frontend to use the new improved API service with enhanced timeout handling, retry logic, and better error management.

## Key Improvements

### ✅ **Enhanced Timeout Handling**
- **Request timeouts**: 30-second timeout for API calls
- **Task timeouts**: 30-minute maximum task execution time
- **Connection timeouts**: 10-second connection timeout
- **Polling timeouts**: Automatic timeout after 30 minutes of polling

### ✅ **Retry Logic**
- **Automatic retries**: 3 retry attempts for failed requests
- **Exponential backoff**: Increasing delay between retries
- **Network error handling**: Special handling for network issues
- **Health check integration**: Backend health monitoring

### ✅ **Better Error Management**
- **Timeout warnings**: Visual indicators for long-running tasks
- **Graceful degradation**: Fallback behavior when backend is down
- **Detailed error messages**: Better error reporting and logging
- **Task cancellation**: Proper cleanup of cancelled tasks

## Migration Steps

### 1. **Update API Service**

Replace your current `src/services/api.js` with the new `src/services/api_improved.js`:

```javascript
// Old import
import { ApiService } from '../services/api';

// New import
import { ImprovedApiService } from '../services/api_improved';
```

### 2. **Update Completeness Page**

Replace your current `src/controls/completeness/page.js` with the new `src/controls/completeness/page_improved.js`:

```javascript
// Old import
import { ApiService } from '../../services/api';

// New import
import { ImprovedApiService } from '../../services/api_improved';
```

### 3. **Update API Calls**

Replace all API service calls:

```javascript
// Old way
const response = await ApiService.startCalculation(input);
const status = await ApiService.getProcessStatus(processId);

// New way (same interface, enhanced internally)
const response = await ImprovedApiService.startCalculation(input);
const status = await ImprovedApiService.getProcessStatus(processId);
```

### 4. **Update Polling Logic**

Replace the old `while (true)` polling with the new enhanced polling:

```javascript
// Old way (infinite loop)
while (true) {
    const status = await ApiService.getProcessStatus(processId);
    if (status.status === 'completed') break;
    await new Promise(res => setTimeout(res, 5000));
}

// New way (with timeout and retry)
ImprovedApiService.pollTaskStatus(
    processId,
    (status, attempts) => {
        // Status update callback
        console.log(`Status: ${status.status}, Attempt: ${attempts}`);
    },
    (status) => {
        // Completion callback
        console.log('Task completed!');
    },
    (error) => {
        // Error callback
        console.error('Task failed:', error.message);
    },
    {
        maxAttempts: 900,        // 30 minutes
        interval: 2000,          // 2 seconds
        healthCheckInterval: 10000 // 10 seconds
    }
);
```

## Configuration Options

### API Configuration
```javascript
const API_CONFIG = {
    REQUEST_TIMEOUT: 30000,        // 30 seconds timeout for API calls
    POLLING_INTERVAL: 2000,        // 2 seconds between polls
    MAX_POLLING_ATTEMPTS: 900,     // 30 minutes max (900 * 2 seconds)
    RETRY_ATTEMPTS: 3,             // Retry failed requests 3 times
    RETRY_DELAY: 1000,             // 1 second delay between retries
    HEALTH_CHECK_INTERVAL: 10000,  // Check backend health every 10 seconds
    CONNECTION_TIMEOUT: 10000,     // 10 seconds connection timeout
    TASK_TIMEOUT_MINUTES: 30,      // Task timeout in minutes
};
```

### Customizing Timeouts
```javascript
// For shorter tasks (5 minutes max)
const shortTaskConfig = {
    maxAttempts: 150,  // 5 minutes (150 * 2 seconds)
    interval: 2000,
    healthCheckInterval: 5000
};

// For longer tasks (60 minutes max)
const longTaskConfig = {
    maxAttempts: 1800, // 60 minutes (1800 * 2 seconds)
    interval: 2000,
    healthCheckInterval: 15000
};
```

## New Features

### 1. **Backend Health Monitoring**
```javascript
// Check if backend is healthy
const isHealthy = await ImprovedApiService.checkBackendHealth();

// Get system statistics
const stats = await ImprovedApiService.getSystemStats();
```

### 2. **Enhanced Task Management**
```javascript
// Get all tasks
const tasks = await ImprovedApiService.getAllTasks(100);

// Manual cleanup
const cleanupResult = await ImprovedApiService.manualCleanup();
```

### 3. **Timeout Warnings**
The new UI shows visual warnings when tasks run longer than expected:
- **Yellow warning**: Task running longer than normal
- **Red warning**: Task approaching timeout
- **Timeout status**: Task has exceeded maximum time

### 4. **Better Error Handling**
```javascript
// Automatic retry for network errors
// Exponential backoff for failed requests
// Graceful handling of backend unavailability
// Detailed error messages with context
```

## Backward Compatibility

The new API service maintains **100% backward compatibility** with your existing code:

- ✅ Same method names
- ✅ Same request/response format
- ✅ Same error handling interface
- ✅ Same configuration options

## Testing the Migration

### 1. **Test Basic Functionality**
```javascript
// Test health check
const health = await ImprovedApiService.healthCheck();
console.log('Backend health:', health);

// Test task creation
const response = await ImprovedApiService.startCalculation({
    nodeId: 'reading_config_comp',
    parameters: { /* your params */ }
});
console.log('Task started:', response);
```

### 2. **Test Timeout Handling**
```javascript
// Start a task and let it timeout
const task = await ImprovedApiService.startCalculation(input);

// The polling will automatically timeout after 30 minutes
// and call the error callback with timeout message
```

### 3. **Test Retry Logic**
```javascript
// Temporarily disable backend to test retry logic
// The API will retry 3 times before failing
```

## Performance Benefits

| Feature | Old System | New System |
|---------|------------|------------|
| **Request Timeout** | ❌ No timeout | ✅ 30-second timeout |
| **Task Timeout** | ❌ 24-hour emergency stop | ✅ 30-minute timeout |
| **Retry Logic** | ❌ No retries | ✅ 3 retries with backoff |
| **Health Monitoring** | ❌ No health checks | ✅ Continuous monitoring |
| **Error Recovery** | ❌ Basic error handling | ✅ Graceful degradation |
| **Resource Cleanup** | ❌ Manual cleanup | ✅ Automatic cleanup |

## Troubleshooting

### Common Issues

**1. Tasks timing out too quickly**
```javascript
// Increase timeout in configuration
const config = {
    maxAttempts: 1800, // 60 minutes instead of 30
    interval: 2000
};
```

**2. Too many retries**
```javascript
// Reduce retry attempts
const config = {
    retryAttempts: 1 // Only retry once
};
```

**3. Backend health check failing**
```javascript
// Check if backend is running on correct port
// Verify CORS settings
// Check network connectivity
```

### Debug Mode
```javascript
// Enable detailed logging
console.log('API Config:', API_CONFIG);
console.log('Backend Health:', await ImprovedApiService.checkBackendHealth());
```

## Rollback Plan

If you need to rollback:

1. **Keep old files**: Don't delete the original `api.js` and `page.js`
2. **Revert imports**: Change imports back to original services
3. **Test thoroughly**: Ensure everything works as before

## Support

For issues or questions:
1. Check the browser console for detailed error messages
2. Verify backend health with `/health` endpoint
3. Check network connectivity and CORS settings
4. Review the configuration options

---

**Note**: This migration maintains full backward compatibility while adding significant improvements to reliability and user experience.
