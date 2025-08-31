# NodeNameDisplay Component

## Overview

The `NodeNameDisplay` component is a reusable UI component that displays information about a selected node when viewing its data output. It provides a clear visual indication of which node's data is currently being displayed.

## Features

- **Node Information Display**: Shows the node name, ID, type, and status
- **Status Color Coding**: Different colors for different node statuses (completed, failed, running, etc.)
- **Data Summary**: Displays total record count when available
- **Responsive Design**: Adapts to different screen sizes
- **Independent Component**: Can be used across all control types

## Usage

```jsx
import NodeNameDisplay from '../components/NodeNameDisplay';

// In your component
<NodeNameDisplay selectedNode={selectedNode} />
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `selectedNode` | `Object` | Yes | The selected node object containing node data |
| `className` | `String` | No | Additional CSS classes for styling |

## Node Object Structure

The component expects a `selectedNode` object with the following structure:

```javascript
{
  id: 'node-id',
  data: {
    fullName: 'Node Display Name',
    type: 'node_type',
    status: 'completed|failed|running|stopped|idle|queued',
    output: {
      count: '1500' // Optional: total record count
    }
  }
}
```

## Status Colors

- **completed**: Green (`text-green-600`)
- **failed**: Red (`text-red-600`)
- **running**: Yellow (`text-yellow-600`)
- **stopped**: Red (`text-red-600`)
- **idle**: Gray (`text-gray-600`)
- **queued**: Orange (`text-orange-600`)

## Integration

The component is integrated into the `DataOutputTab` component and appears above the data grid when viewing node data. It automatically adjusts the available height for the data grid to accommodate the node name display.

## Styling

The component uses Tailwind CSS classes and includes:
- Hover effects for better user interaction
- Responsive design for different screen sizes
- Consistent styling with the rest of the application
- HSBC branding integration

## Error Handling

The component gracefully handles:
- Missing node data
- Incomplete node information
- Missing output data
- Invalid status values

## Testing

The component includes comprehensive tests covering:
- Normal rendering with complete data
- Edge cases with missing data
- Different status types
- Error scenarios

Run tests with:
```bash
npm test -- --testPathPattern=NodeNameDisplay.test.js
```

