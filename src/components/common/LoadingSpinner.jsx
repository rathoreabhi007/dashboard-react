import React, { memo } from 'react';

/**
 * Loading Spinner Component
 * Consistent loading indicator for the application
 */
const LoadingSpinner = memo(({
    message = 'Loading data...',
    size = 'medium',
    overlay = true
}) => {
    const sizeClasses = {
        small: 'loading-spinner-small',
        medium: 'loading-spinner-medium',
        large: 'loading-spinner-large'
    };

    const spinnerContent = (
        <div className={`loading-spinner ${sizeClasses[size]}`}>
            <div className="loading-spinner-icon"></div>
            {message && <span className="loading-spinner-text">{message}</span>}
        </div>
    );

    if (overlay) {
        return (
            <div className="loading-overlay">
                {spinnerContent}
            </div>
        );
    }

    return spinnerContent;
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;

