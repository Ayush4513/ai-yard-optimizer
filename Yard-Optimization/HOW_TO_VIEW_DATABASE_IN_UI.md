# How to View Database Data in Your React UI (Right Now!)

## Option 1: Quick Browser Console Check (30 seconds)

**Right now, while your React app is running:**

1. Open your React app: http://localhost:5175
2. Press **F12** to open Developer Console
3. Go to the **Console** tab
4. Paste this code:

```javascript
fetch('http://localhost:8000/containers')
  .then(r => r.json())
  .then(containers => {
    console.log(`✅ Found ${containers.length} containers in database:`);
    console.table(containers);
  });
```

5. Press **Enter**

**You'll see a beautiful table showing all 7 containers from your database!** 🎉

---

## Option 2: Add a "Load from DB" Button (2 minutes)

**File:** `src/app/pages/containers-page.tsx`

**Add these lines at the top:**
```typescript
import { useEffect } from "react";  // Add useEffect if not already there
import { containerAPI } from "@/services/api";
import { toast } from "sonner";
```

**Inside your component, add this function:**
```typescript
export function ContainersPage() {
  const [containers, setContainers] = useState(incomingContainers); // Your existing state
  const [loading, setLoading] = useState(false);

  // ADD THIS FUNCTION:
  const loadFromDatabase = async () => {
    setLoading(true);
    try {
      const dbContainers = await containerAPI.getAll();

      console.log("✅ Loaded from database:", dbContainers);

      // Convert to your existing format or use directly
      setContainers(dbContainers);

      toast.success(`Loaded ${dbContainers.length} containers from database!`);
    } catch (error) {
      console.error("Failed to load:", error);
      toast.error("Failed to load from database");
    } finally {
      setLoading(false);
    }
  };

  // Your existing code...
  return (
    <div>
      {/* Add this button somewhere visible */}
      <Button onClick={loadFromDatabase} disabled={loading}>
        {loading ? "Loading..." : "🔄 Load from Database"}
      </Button>

      {/* Your existing UI */}
    </div>
  );
}
```

**Now:**
1. Refresh your page
2. Click the "Load from Database" button
3. See your real database containers!

---

## Option 3: Auto-Load on Page Load (Best - 3 minutes)

**Same file:** `src/app/pages/containers-page.tsx`

**Add this after your state declarations:**

```typescript
export function ContainersPage() {
  const [containers, setContainers] = useState([]);  // Start empty
  const [loading, setLoading] = useState(true);

  // Auto-load from database when page loads
  useEffect(() => {
    const loadContainers = async () => {
      try {
        const dbContainers = await containerAPI.getAll();
        setContainers(dbContainers);
      } catch (error) {
        console.error("Failed to load containers:", error);
        // Fall back to mock data if API fails
        setContainers(incomingContainers);
      } finally {
        setLoading(false);
      }
    };

    loadContainers();
  }, []);

  if (loading) {
    return <div>Loading containers from database...</div>;
  }

  // Your existing render code...
}
```

**Now your page automatically shows database data!**

---

## Option 4: Quick Test in Dashboard (1 minute)

**Open:** `src/app/pages/dashboard-page.tsx`

**Add at the top:**
```typescript
import { useEffect, useState } from "react";
import { containerAPI, statsAPI } from "@/services/api";
```

**Add this somewhere in your component:**
```typescript
const [dbStats, setDbStats] = useState(null);

useEffect(() => {
  statsAPI.getYardStats().then(stats => {
    console.log("📊 Database Stats:", stats);
    setDbStats(stats);
  });
}, []);

// Then display it:
return (
  <div>
    {dbStats && (
      <div className="rounded bg-blue-50 p-4">
        <h3 className="font-bold">Live Database Stats</h3>
        <p>Total Containers: {dbStats.total_containers}</p>
        <p>Occupancy Rate: {dbStats.occupancy_rate}%</p>
        <p>Available Locations: {dbStats.available_locations}</p>
      </div>
    )}
    {/* Your existing dashboard */}
  </div>
);
```

---

## Simplest Way - Check Right Now! (10 seconds)

**Open the browser console on your React app and paste:**

```javascript
// Quick check
fetch('http://localhost:8000/containers')
  .then(r => r.json())
  .then(data => console.table(data));

// Get stats
fetch('http://localhost:8000/stats/overview')
  .then(r => r.json())
  .then(stats => console.log('📊 Stats:', stats));

// Get locations
fetch('http://localhost:8000/locations?occupied=false')
  .then(r => r.json())
  .then(locs => console.log(`✅ ${locs.length} available locations`));
```

---

## What You'll See

When you load containers from the database, you'll see:

1. **MAEU1234567** - Maersk container with Electronics
2. **MSC9876543** - MSC Reefer with Frozen Seafood (-18°C)
3. **CMAU5555555** - CMA CGM Hazmat container
4. **HLCU2222222** - Hapag Lloyd with Machinery
5. **OOLU7777777** - OOCL container (on customs hold)
6. **TCLU3333333** - Empty Maersk container
7. **YMLU8888888** - Empty Yang Ming container

Plus any new containers you've added through your form!

---

## Live Example Code

**Full working example for containers page:**

```typescript
import { useState, useEffect } from "react";
import { containerAPI } from "@/services/api";

export function ContainersPage() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load on mount
    loadContainers();
  }, []);

  const loadContainers = async () => {
    setLoading(true);
    try {
      const data = await containerAPI.getAll();
      setContainers(data);
      console.log("✅ Loaded containers:", data);
    } catch (error) {
      console.error("❌ Error loading:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading from database...</div>;

  return (
    <div>
      <h1>Containers ({containers.length})</h1>
      <button onClick={loadContainers}>Refresh</button>

      <table>
        <thead>
          <tr>
            <th>Container #</th>
            <th>Type</th>
            <th>Weight</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {containers.map(c => (
            <tr key={c.container_id}>
              <td>{c.container_number}</td>
              <td>{c.container_type}</td>
              <td>{c.weight_mt}t</td>
              <td>{c.customs_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Try It NOW!

**Fastest way (literally 10 seconds):**

1. Go to your React app: http://localhost:5175
2. Press F12
3. Paste in console:
   ```javascript
   fetch('http://localhost:8000/containers').then(r=>r.json()).then(console.table)
   ```
4. Press Enter
5. **See your database!** ✅

---

**Your database is already accessible from your UI - just fetch it!** 🚀
