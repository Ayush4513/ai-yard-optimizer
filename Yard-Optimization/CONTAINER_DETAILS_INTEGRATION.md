# Container Details Modal Integration Guide

## Overview
A comprehensive container details modal has been created with 6 tabs showing all container data from the database.

## Features
- **6 Information Tabs**: Basic Info, Vessel & Voyage, Location, Event Details, Operations, Metrics
- **70 Data Fields**: All database fields displayed with proper formatting
- **Real-time API Integration**: Fetches data from `/containers/{id}` endpoint
- **Responsive Design**: Works on all screen sizes
- **Visual Indicators**: Color-coded badges for status, priority, congestion, etc.
- **Special Handling**: Separate sections for Hazmat and Reefer containers
- **Performance Metrics**: Visual progress bars for utilization percentages

## Component Location
`src/app/components/container-details-modal.tsx`

## Integration Steps

### 1. Import the Component

```typescript
import { ContainerDetailsModal } from "@/app/components/container-details-modal";
```

### 2. Add State Management

```typescript
const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
const [detailsModalOpen, setDetailsModalOpen] = useState(false);
```

### 3. Add the Modal Component

```typescript
<ContainerDetailsModal
  containerId={selectedContainerId}
  open={detailsModalOpen}
  onClose={() => {
    setDetailsModalOpen(false);
    setSelectedContainerId(null);
  }}
/>
```

### 4. Connect to "View Details" Button

Replace the existing "View Details" menu item with:

```typescript
<DropdownMenuItem
  onClick={() => {
    setSelectedContainerId(container.container_id); // Use the actual container ID
    setDetailsModalOpen(true);
  }}
>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>
```

## Complete Example

Here's a complete example of how to integrate into containers-page.tsx:

```typescript
import { useState, useEffect } from "react";
import { ContainerDetailsModal } from "@/app/components/container-details-modal";
// ... other imports

export function ContainersPage() {
  // Add these state variables
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // ... existing code

  return (
    <div>
      {/* ... existing JSX */}

      {/* For each "View Details" button in dropdown menus, update to: */}
      <DropdownMenuItem
        onClick={() => {
          setSelectedContainerId(container.container_id);
          setDetailsModalOpen(true);
        }}
      >
        <Eye className="mr-2 h-4 w-4" />
        View Details
      </DropdownMenuItem>

      {/* Add modal at the end, before closing div */}
      <ContainerDetailsModal
        containerId={selectedContainerId}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedContainerId(null);
        }}
      />
    </div>
  );
}
```

## API Requirements

The modal expects this API endpoint:
- **URL**: `GET http://localhost:8000/containers/{container_id}`
- **Response**: JSON object with all container fields

The endpoint already exists in `backend/main.py` at line 76-86.

## Data Displayed by Tab

### Tab 1: Basic Information
- Container specifications (number, ISO code, size, type)
- Weight and cargo details
- Shipping documentation (bills, customs status)
- Special handling requirements (Hazmat/Reefer)
- Status badges (cleared, priority, special flags)

### Tab 2: Vessel & Voyage
- Vessel and voyage IDs
- Port of discharge (POD)
- POD priority
- All timing information (pickup, cutoff, gate-in)

### Tab 3: Location
- Current location (block, bay, row, tier)
- Stack information
- Yard zone type
- Movement details (from/to locations)

### Tab 4: Event Details
- Event sequence and movement ID
- Event and movement types
- Container status after event
- Timing and delays
- Exception information (if any)

### Tab 5: Operations
- Equipment details (ID, type)
- Operator information
- Job ID
- Optimization status (move intent, optimality tag)
- Rehandle information

### Tab 6: Metrics
- Yard utilization percentage (with progress bar)
- Block utilization percentage (with progress bar)
- Congestion level
- Performance summary
- Total dwell time
- Rehandle operations count

## Styling Features

### Color Coding
- **Customs Status**: Green (Cleared), Red (Hold), Yellow (Pending)
- **Priority**: Red (1), Orange (2), Yellow (3), Green (4)
- **Congestion**: Red (High), Yellow (Medium), Green (Low)
- **Utilization**: Green (<60%), Yellow (60-80%), Red (>80%)

### Special Badges
- Hazmat containers: Red badge with flame icon
- Reefer containers: Blue badge with snowflake icon
- Rehandled containers: Red badge with arrow icon
- Exception flags: Destructive alert banner

### Visual Elements
- Progress bars for utilization metrics
- Color-coded metric cards
- Organized info cards with icons
- Responsive grid layouts

## Testing

To test the integration:

1. **Start the backend**:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

3. **Click "View Details"** on any container in the containers page

4. **Verify all tabs** display data correctly

5. **Test with different container types**:
   - Dry containers
   - Reefer containers (should show temperature settings)
   - Hazmat containers (should show IMDG class, UN number)
   - Containers with exceptions (should show alert banner)

## Customization

### Adding More Sections
To add a new information section:

```typescript
<Separator />
<div>
  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
    <YourIcon className="h-5 w-5" />
    Section Title
  </h3>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    <InfoItem label="Field Label" value={containerData.your_field || "N/A"} />
  </div>
</div>
```

### Changing Colors
Colors are defined using Tailwind classes and can be modified in the helper functions:
- `getStatusColor()` - Customs status colors
- `getPriorityColor()` - Priority level colors
- `getCongestionColor()` - Congestion level colors
- `getUtilizationColor()` - Utilization percentage colors

### Adding Export Functionality
The Export button is already in the UI. To implement:

```typescript
const handleExport = () => {
  const dataStr = JSON.stringify(containerData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `container-${containerData.container_number}.json`;
  link.click();
};

// Update button
<Button variant="outline" size="sm" onClick={handleExport}>
  <Download className="h-4 w-4 mr-2" />
  Export
</Button>
```

## Troubleshooting

### Modal doesn't open
- Check that `open` prop is set to `true`
- Verify `containerId` is not null
- Check browser console for errors

### Data not loading
- Verify backend is running on `http://localhost:8000`
- Check API endpoint returns data: `GET /containers/{id}`
- Check browser network tab for failed requests
- Verify container ID exists in database

### Fields showing "N/A"
- This is expected for optional fields
- Check database to verify field has data
- Ensure API is returning all fields

### Styling issues
- Ensure all shadcn/ui components are installed
- Check that Tailwind CSS is configured properly
- Verify scroll-area component exists

## Future Enhancements

Potential improvements:
1. Add container history timeline (all events for this container)
2. Add QR code generation for container ID
3. Add print/PDF export functionality
4. Add edit capabilities for certain fields
5. Add real-time updates using WebSocket
6. Add image gallery for container photos
7. Add related containers section
8. Add predictive analytics (ETA, potential delays)

## Support

For issues or questions:
1. Check this integration guide
2. Review the component code for implementation details
3. Check the API endpoint returns correct data
4. Verify all required UI components are installed
