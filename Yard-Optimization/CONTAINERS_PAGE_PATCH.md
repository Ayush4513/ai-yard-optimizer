# Containers Page Integration Patch

## Changes needed in `src/app/pages/containers-page.tsx`

### 1. Add Import at the top (around line 1-62)

```typescript
// Add this import with the other component imports
import { ContainerDetailsModal } from "@/app/components/container-details-modal";
```

### 2. Add State Variables (around line 63, after mock data)

```typescript
// Add these state variables for the details modal
const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
const [detailsModalOpen, setDetailsModalOpen] = useState(false);
```

### 3. Update "View Details" Buttons

Find all occurrences of "View Details" (lines 510, 618, 720) and update them:

#### For Incoming Containers (around line 508-511)
```typescript
// BEFORE:
<DropdownMenuItem>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>

// AFTER:
<DropdownMenuItem
  onClick={() => {
    setSelectedContainerId(container.id); // or container.container_id if using real data
    setDetailsModalOpen(true);
  }}
>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>
```

#### For In-Yard Containers (around line 616-619)
```typescript
// BEFORE:
<DropdownMenuItem>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>

// AFTER:
<DropdownMenuItem
  onClick={() => {
    setSelectedContainerId(container.id); // or container.container_id if using real data
    setDetailsModalOpen(true);
  }}
>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>
```

#### For Export Pending Containers (around line 718-721)
```typescript
// BEFORE:
<DropdownMenuItem>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>

// AFTER:
<DropdownMenuItem
  onClick={() => {
    setSelectedContainerId(container.id); // or container.container_id if using real data
    setDetailsModalOpen(true);
  }}
>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>
```

### 4. Add Modal Component at the End

Add this just before the closing `</div>` of the main component (around line 856):

```typescript
      {/* Container Details Modal */}
      <ContainerDetailsModal
        containerId={selectedContainerId}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedContainerId(null);
        }}
      />
    </div> {/* This is the closing div */}
  );
}
```

## Complete Code Snippet

Here's a complete snippet showing the structure:

```typescript
export function ContainersPage() {
  // ... existing state variables

  // ADD THESE:
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // ... rest of component code

  return (
    <div className="p-6 space-y-6">
      {/* ... all existing JSX ... */}

      {/* ADD THIS AT THE END: */}
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

## Using Real Database Data

When you connect to real database data (instead of mock data), make sure to:

1. **Update container ID field**: Change `container.id` to `container.container_id` or whatever field name your API returns

2. **Example with real data from API**:
```typescript
const [containers, setContainers] = useState([]);

useEffect(() => {
  fetch('http://localhost:8000/containers')
    .then(res => res.json())
    .then(data => setContainers(data))
    .catch(err => console.error(err));
}, []);

// Then in dropdown:
<DropdownMenuItem
  onClick={() => {
    setSelectedContainerId(container.container_id); // Use actual field name
    setDetailsModalOpen(true);
  }}
>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>
```

## Testing

1. Save the file
2. The TypeScript compiler should automatically recompile
3. Click "View Details" on any container
4. Modal should open with all container information in 6 tabs

## Quick Test with Mock Data

To quickly test without connecting to real API, you can temporarily use a mock container ID:

```typescript
<DropdownMenuItem
  onClick={() => {
    setSelectedContainerId("CNT-0034-EVT-1"); // Use actual ID from your database
    setDetailsModalOpen(true);
  }}
>
  <Eye className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>
```

This will fetch data for container "CNT-0034-EVT-1" from your database (which we imported earlier).

## Verification Checklist

- [ ] Import added at top of file
- [ ] State variables added
- [ ] All 3 "View Details" buttons updated
- [ ] Modal component added at end
- [ ] File saves without TypeScript errors
- [ ] Modal opens when clicking "View Details"
- [ ] All 6 tabs display data correctly
- [ ] Modal closes properly when clicking X or outside
