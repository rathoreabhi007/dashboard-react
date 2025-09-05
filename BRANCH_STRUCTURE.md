# Branch Filesystem Structure

## Overview
This document outlines the new branch filesystem structure that allows you to maintain both the original and improved versions of your application.

## Directory Structure

```
dashboard-react/
├── src/
│   ├── services/
│   │   ├── api.js                    # Original API service
│   │   └── api_improved.js           # Enhanced API service with timeout/retry
│   ├── controls/
│   │   └── completeness/
│   │       ├── page.js               # Original completeness page
│   │       ├── page_improved.js      # Enhanced completeness page
│   │       └── page_integrated.js    # Integrated version (all features + improvements)
│   └── ...
├── api/
│   ├── main1.py                      # Original backend (v1)
│   ├── main_v2.py                    # New backend (v2) with diskcache
│   ├── task_manager.py               # Original task manager
│   ├── task_manager_v2.py            # New task manager with diskcache
│   ├── enhanced_etl.py               # ETL logic (unchanged)
│   ├── gunicorn.conf.py              # Optimized Gunicorn config
│   ├── start_server.sh               # Linux startup script
│   ├── start_server.bat              # Windows startup script
│   ├── requirements.txt              # Updated dependencies
│   └── README_v2.md                  # Backend v2 documentation
├── docs/
│   ├── FRONTEND_MIGRATION_GUIDE.md   # Frontend migration guide
│   ├── BACKEND_MIGRATION_GUIDE.md    # Backend migration guide
│   └── BRANCH_STRUCTURE.md           # This file
└── ...
```

## Version Management

### Backend Versions
- **v1 (Original)**: `main1.py` + `task_manager.py` - Multiprocessing-based
- **v2 (Improved)**: `main_v2.py` + `task_manager_v2.py` - Diskcache-based

### Frontend Versions
- **v1 (Original)**: `api.js` + `page.js` - Basic polling, no timeout
- **v2 (Improved)**: `api_improved.js` + `page_improved.js` - Enhanced timeout/retry
- **v3 (Integrated)**: `api_integrated.js` + `page_integrated.js` - All features + improvements

## Migration Paths

### Option 1: Gradual Migration (Recommended)
1. **Phase 1**: Deploy backend v2 alongside v1
2. **Phase 2**: Test frontend v2 with backend v2
3. **Phase 3**: Switch traffic to v2 systems
4. **Phase 4**: Remove v1 systems after validation

### Option 2: Direct Integration
1. **Step 1**: Use integrated versions (v3)
2. **Step 2**: Deploy both backend and frontend v3
3. **Step 3**: Test thoroughly
4. **Step 4**: Remove old versions

### Option 3: Hybrid Approach
1. **Backend**: Use v2 (diskcache) for reliability
2. **Frontend**: Use v3 (integrated) for all features
3. **Gradual**: Migrate users in batches

## File Naming Convention

### Backend Files
- `*_v1.py` or `main1.py` - Original version
- `*_v2.py` or `main_v2.py` - Improved version
- `*_integrated.py` - Combined version (if needed)

### Frontend Files
- `*_original.js` or `page.js` - Original version
- `*_improved.js` or `page_improved.js` - Enhanced version
- `*_integrated.js` or `page_integrated.js` - Combined version

## Configuration Management

### Environment Variables
```bash
# Backend version selection
BACKEND_VERSION=v2  # or v1
API_BASE_URL=http://127.0.0.1:8000

# Frontend version selection
FRONTEND_VERSION=integrated  # or original, improved
```

### Package.json Scripts
```json
{
  "scripts": {
    "start:original": "REACT_APP_VERSION=original npm start",
    "start:improved": "REACT_APP_VERSION=improved npm start",
    "start:integrated": "REACT_APP_VERSION=integrated npm start",
    "build:original": "REACT_APP_VERSION=original npm run build",
    "build:improved": "REACT_APP_VERSION=improved npm run build",
    "build:integrated": "REACT_APP_VERSION=integrated npm run build"
  }
}
```

## Testing Strategy

### Backend Testing
1. **Unit Tests**: Test each version independently
2. **Integration Tests**: Test v1 ↔ v2 compatibility
3. **Load Tests**: Compare performance between versions
4. **Migration Tests**: Test data migration between versions

### Frontend Testing
1. **Component Tests**: Test each version's components
2. **API Tests**: Test API compatibility
3. **User Tests**: Test user workflows
4. **Performance Tests**: Compare response times

## Rollback Strategy

### Backend Rollback
1. **Quick Rollback**: Switch Gunicorn config to point to v1
2. **Data Rollback**: Restore from backup if needed
3. **Process Rollback**: Restart with v1 processes

### Frontend Rollback
1. **Quick Rollback**: Switch environment variable
2. **Build Rollback**: Deploy previous build
3. **Feature Rollback**: Disable specific features

## Monitoring and Metrics

### Backend Metrics
- Task completion rates
- Error rates
- Response times
- Memory usage
- Worker health

### Frontend Metrics
- Page load times
- API call success rates
- User interaction rates
- Error rates
- Timeout occurrences

## Documentation

### Version-Specific Docs
- `README_v1.md` - Original system documentation
- `README_v2.md` - Improved system documentation
- `README_integrated.md` - Integrated system documentation

### Migration Docs
- `MIGRATION_GUIDE.md` - Step-by-step migration
- `ROLLBACK_GUIDE.md` - Rollback procedures
- `TESTING_GUIDE.md` - Testing procedures

## Best Practices

### Development
1. **Feature Flags**: Use environment variables for version selection
2. **Backward Compatibility**: Maintain API compatibility
3. **Documentation**: Keep docs updated for each version
4. **Testing**: Test all versions before deployment

### Deployment
1. **Blue-Green**: Deploy new version alongside old
2. **Canary**: Gradual rollout to subset of users
3. **Monitoring**: Monitor metrics during deployment
4. **Rollback**: Have rollback plan ready

### Maintenance
1. **Version Control**: Use Git branches for versions
2. **Documentation**: Keep migration guides updated
3. **Monitoring**: Monitor all versions in production
4. **Cleanup**: Remove old versions after validation

## Support Matrix

| Version | Backend | Frontend | Status | Support |
|---------|---------|----------|--------|---------|
| v1 | ✅ | ✅ | Stable | Full |
| v2 | ✅ | ✅ | Stable | Full |
| v3 | ✅ | ✅ | Stable | Full |

## Next Steps

1. **Create integrated versions** of both backend and frontend
2. **Set up testing environment** for all versions
3. **Create deployment scripts** for version switching
4. **Set up monitoring** for all versions
5. **Create user documentation** for migration
