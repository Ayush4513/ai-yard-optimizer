# Complete API Integration Guide

Step-by-step guide to connect your React UI to the FastAPI backend.

---

## Table of Contents

1. [Current Status](#current-status)
2. [Quick Start - Save Your First Container](#quick-start)
3. [Complete Workflow Integration](#complete-workflow-integration)
4. [All Available APIs](#all-available-apis)
5. [Testing](#testing)
6. [Common Patterns](#common-patterns)

---

## Current Status

✅ **Backend Running:** http://localhost:8000
✅ **Frontend Running:** http://localhost:5175
✅ **API Service Created:** `src/services/api.ts`
✅ **Database Seeded:** 7 sample containers

**What's Ready:**
- All database tables created
- Container CRUD endpoints working
- Location management endpoints working
- Optimization endpoint (ready for your algorithm)
- Statistics endpoints
- API service layer with TypeScript types

---

## Quick Start - Save Your First Container

### Step 1: Test the API First

Open http://localhost:8000/docs

1. Click on `POST /containers`
2. Click "Try it out"
3. Paste this test data:

```json
{
  "container_id": "CNT-TEST-001",
  "container_number": "TEST1234567",
  "iso_code": "42G1",
  "size_teu": 2,
  "container_type": "Dry",
  "load_status": "Full",
  "weight_mt": 22.5,
  "weight_class": "Heavy",
  "cargo_description": "Test Cargo",
  "seal_number": "SL123456",
  "type": "export_container",
  "customs_status": "Cleared",
  "shipping_line": "Test Line",
  "consignee": "Test Company",
  "hazmat_flag": false,
  "reefer_flag": false,
  "gate_in_time": "2024-01-15T10:00:00"
}
```

4. Click "Execute"
5. You should see a 200 response with your container!

### Step 2: Fetch from React

Open your browser console and try:

```javascript
// Test fetching containers
fetch('http://localhost:8000/containers')
  .then(r => r.json())
  .then(data => console.log('Containers:', data));
```

You should see 8 containers (7 seed + 1 test)!

### Step 3: Update Your Container Form

**File:** `src/app/components/container-entry-form.tsx`

**Add at the top:**
```typescript
import { containerAPI } from '@/services/api';
import { useState } from 'react';
```

**Add loading state:**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Replace your `onFormSubmit` function:**
```typescript
const onFormSubmit = async (data: any) => {
  setIsSubmitting(true);

  try {
    const containerId = `CNT-${Date.now()}`;
    const weight_class = getWeightClass(data.weight_mt);

    const container: Container = {
      container_id: containerId,
      container_number: data.container_number,
      iso_code: data.iso_code,
      size_teu: parseInt(data.size_teu) as 1 | 2,
      container_type: data.container_type,
      load_status: data.load_status,
      weight_mt: parseFloat(data.weight_mt),
      weight_class,
      cargo_description: data.cargo_description || "",
      type: data.type,
      customs_status: data.customs_status,
      shipping_line: data.shipping_line || undefined,
      consignee: data.consignee || undefined,
      pod: data.pod || undefined,
      pod_priority: data.pod ? parseInt(data.pod_priority) as 1 | 2 | 3 | 4 : undefined,
      hazmat_flag: data.hazmat_flag,
      imdg_class: data.hazmat_flag ? data.imdg_class : undefined,
      un_number: data.hazmat_flag ? data.un_number : undefined,
      hazmat_segregation: data.hazmat_flag ? data.hazmat_segregation : undefined,
      reefer_flag: data.reefer_flag,
      set_temperature: data.reefer_flag && data.set_temperature ? parseFloat(data.set_temperature) : undefined,
      current_temperature: data.reefer_flag && data.current_temperature ? parseFloat(data.current_temperature) : undefined,
      ventilation_setting: data.reefer_flag ? data.ventilation_setting : undefined,
      humidity_setting: data.reefer_flag && data.humidity_setting ? parseFloat(data.humidity_setting) : undefined,
      seal_number: data.seal_number || undefined,
      vessel_id: data.vessel_id || undefined,
      voyage_id: data.voyage_id || undefined,
      shipping_bill_number: data.shipping_bill_number || undefined,
      bill_of_lading: data.bill_of_lading || undefined,
      gate_in_time: data.gate_in_time,
      cutoff_datetime: data.cutoff_datetime || undefined,
      expected_pickup_time: data.expected_pickup_time || undefined,
    };

    // 🔥 SAVE TO DATABASE
    const savedContainer = await containerAPI.create(container);

    console.log("✅ Container saved to database!", savedContainer);

    toast.success(`Container ${data.container_number} saved to database!`);
    onSubmit(savedContainer);

  } catch (error: any) {
    console.error("❌ Failed to save:", error);
    toast.error("Failed to save container", {
      description: error.response?.data?.detail || "Please try again"
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Update your submit button:**
```typescript
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Saving..." : "Continue to Yard Map"}
</Button>
```

### Step 4: Test It!

1. Go to your container entry form
2. Fill out the form
3. Click submit
4. Open the browser console - you should see "✅ Container saved to database!"
5. Go to http://localhost:8000/docs and check `GET /containers` - your new container is there!

---

## Complete Workflow Integration

### 1. Container List Page

**File:** `src/app/pages/containers-page.tsx`

**Replace mock data with API:**

```typescript
import { containerAPI } from '@/services/api';
import { useEffect, useState } from 'react';

export function ContainersPage() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch containers on mount
  useEffect(() => {
    loadContainers();
  }, []);

  const loadContainers = async () => {
    try {
      setLoading(true);
      const data = await containerAPI.getAll();
      setContainers(data);
    } catch (error) {
      console.error("Failed to load containers:", error);
      toast.error("Failed to load containers");
    } finally {
      setLoading(false);
    }
  };

  // Refresh after adding new container
  const handleContainerAdded = async (container) => {
    // Container already saved by form, just refresh list
    await loadContainers();
  };

  if (loading) {
    return <div>Loading containers...</div>;
  }

  return (
    <div>
      <h1>Containers ({containers.length})</h1>
      {/* Your existing UI */}
    </div>
  );
}
```

### 2. Filter Containers

```typescript
// Filter by type
const reeferContainers = await containerAPI.getAll({
  container_type: 'Reefer'
});

// Filter by customs status
const holdContainers = await containerAPI.getAll({
  customs_status: 'Hold'
});
```

### 3. Get Available Locations

```typescript
import { locationAPI } from '@/services/api';

// Get all available locations
const availableLocations = await locationAPI.getAvailable();

// Get available locations in a specific yard
const seaSideLocations = await locationAPI.getAvailable({
  yard_name: 'Sea-Side Yard 1'
});

// Get available locations in a specific block
const blockA1Locations = await locationAPI.getAvailable({
  block_id: 'BLK-A1'
});
```

### 4. Assign Container to Location

Add this to your `src/services/api.ts`:

```typescript
export const placementAPI = {
  /**
   * Assign a container to a yard location
   */
  assignLocation: async (containerId: string, locationId: string) => {
    const response = await api.post(
      `/containers/${containerId}/assign-location`,
      null,
      { params: { location_id: locationId } }
    );
    return response.data;
  },
};
```

Use it in your location selection component:

```typescript
import { placementAPI } from '@/services/api';

const handleLocationSelect = async (location) => {
  try {
    const result = await placementAPI.assignLocation(
      container.container_id,
      location.location_id
    );

    toast.success("Container assigned successfully!", {
      description: `Placed at ${result.location_details.yard} - ${result.location_details.block}`
    });
  } catch (error) {
    toast.error("Failed to assign location");
  }
};
```

### 5. Get AI Recommendations

```typescript
import { optimizationAPI } from '@/services/api';

const getRecommendations = async (container) => {
  try {
    const result = await optimizationAPI.getPlacementRecommendations({
      container_id: container.container_id,
      container_type: container.container_type,
      pod: container.pod,
      weight_class: container.weight_class,
      hazmat_flag: container.hazmat_flag,
      reefer_flag: container.reefer_flag,
    });

    console.log("AI Recommendations:", result.recommendations);
    // Display recommendations to user
    setRecommendations(result.recommendations);
  } catch (error) {
    console.error("Failed to get recommendations:", error);
  }
};
```

---

## All Available APIs

### Container APIs

```typescript
import { containerAPI } from '@/services/api';

// Get all containers
const all = await containerAPI.getAll();

// Get with filters
const filtered = await containerAPI.getAll({
  container_type: 'Reefer',
  customs_status: 'Cleared',
  limit: 50,
  skip: 0
});

// Get specific container
const container = await containerAPI.getById('CNT-001');

// Create container
const newContainer = await containerAPI.create(containerData);

// Update container
const updated = await containerAPI.update('CNT-001', {
  customs_status: 'Cleared'
});

// Delete container
await containerAPI.delete('CNT-001');
```

### Location APIs

```typescript
import { locationAPI } from '@/services/api';

// Get all locations
const all = await locationAPI.getAll();

// Get available locations only
const available = await locationAPI.getAvailable();

// Get locations in specific yard
const yardLocs = await locationAPI.getAll({
  yard_name: 'Sea-Side Yard 1'
});

// Get locations in specific block
const blockLocs = await locationAPI.getAll({
  block_id: 'BLK-A1'
});

// Get specific location
const location = await locationAPI.getById('LOC-0001');

// Update location (mark as occupied)
await locationAPI.update('LOC-0001', {
  occupied: true,
  container_id: 'CNT-001'
});
```

### Optimization APIs

```typescript
import { optimizationAPI } from '@/services/api';

// Get placement recommendations
const recs = await optimizationAPI.getPlacementRecommendations({
  container_id: 'CNT-001',
  container_type: 'Dry',
  pod: 'Singapore',
  weight_class: 'Heavy'
});

console.log(recs.recommendations); // Top 3 recommended locations
```

### Statistics APIs

```typescript
import { statsAPI } from '@/services/api';

// Get yard statistics
const yardStats = await statsAPI.getYardStats();
console.log(yardStats.total_containers);
console.log(yardStats.occupancy_rate);

// Get container statistics
const containerStats = await statsAPI.getContainerStats();
console.log(containerStats.by_type); // Containers by type
console.log(containerStats.by_status); // Containers by customs status
```

---

## Testing

### Test in Browser Console

Open browser console (F12) and try:

```javascript
// Test the API is working
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log(d)); // Should show {status: "healthy"}

// Get all containers
fetch('http://localhost:8000/containers')
  .then(r => r.json())
  .then(d => console.log('Containers:', d));

// Using the API service (if on your React app page)
import { containerAPI } from './services/api';
containerAPI.getAll().then(c => console.log('Containers:', c));
```

### Test in Swagger UI

1. Go to http://localhost:8000/docs
2. Try each endpoint
3. See sample requests/responses

### Verify Database

```bash
cd backend
python

>>> from database import SessionLocal
>>> from models import Container
>>> db = SessionLocal()
>>> containers = db.query(Container).all()
>>> print(f"Total containers: {len(containers)}")
>>> for c in containers:
...     print(f"- {c.container_number}")
```

---

## Common Patterns

### Pattern 1: List with Real-Time Updates

```typescript
function ContainerList() {
  const [containers, setContainers] = useState([]);

  const loadContainers = async () => {
    const data = await containerAPI.getAll();
    setContainers(data);
  };

  useEffect(() => {
    loadContainers();
  }, []);

  const handleDelete = async (id) => {
    await containerAPI.delete(id);
    await loadContainers(); // Refresh list
  };

  return (
    <div>
      {containers.map(c => (
        <div key={c.container_id}>
          {c.container_number}
          <button onClick={() => handleDelete(c.container_id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 2: Form with Validation

```typescript
const handleSubmit = async (formData) => {
  try {
    const container = await containerAPI.create(formData);
    toast.success("Saved!");
    navigate(`/containers/${container.container_id}`);
  } catch (error) {
    if (error.response?.status === 400) {
      toast.error(error.response.data.detail); // Show validation error
    } else {
      toast.error("Something went wrong");
    }
  }
};
```

### Pattern 3: Loading States

```typescript
function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    containerAPI.getAll()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{/* Render data */}</div>;
}
```

### Pattern 4: Optimistic Updates

```typescript
const handleUpdate = async (id, changes) => {
  // Update UI immediately
  setContainers(prev => prev.map(c =>
    c.container_id === id ? { ...c, ...changes } : c
  ));

  // Save to backend
  try {
    await containerAPI.update(id, changes);
  } catch (error) {
    // Revert on error
    await loadContainers();
    toast.error("Update failed");
  }
};
```

---

## Next Steps

1. ✅ Update your container form to save to API
2. ✅ Update your containers page to load from API
3. ✅ Add location assignment functionality
4. ✅ Implement AI recommendations display
5. ✅ Add real-time yard statistics
6. ✅ Implement your optimization algorithm in backend

---

## Need Help?

- **Check backend logs:** Look at the terminal where uvicorn is running
- **Check browser console:** Look for network errors (F12 → Network tab)
- **Test endpoints:** Use http://localhost:8000/docs to verify backend is working
- **Check CORS:** Make sure backend allows localhost:5175 (already configured)

---

**Your backend is ready! Start integrating! 🚀**
