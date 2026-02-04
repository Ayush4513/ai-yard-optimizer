# Yard Optimization - Full Stack Setup Guide

Complete setup guide for running the React frontend + FastAPI backend.

## Prerequisites

- **Node.js** (v18+)
- **Python** (v3.9+)
- **npm** or **pnpm**

## 🚀 Quick Start (Both Frontend + Backend)

### Step 1: Install Frontend Dependencies

```bash
# In the root directory
npm install
```

### Step 2: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Start Backend Server

```bash
# Make sure you're in the backend directory and venv is activated
cd backend
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Keep this terminal running!**

### Step 4: Start Frontend Server

Open a **NEW terminal** (keep backend running):

```bash
# In the root directory
npm run dev
```

You should see:
```
VITE v6.3.5  ready in XXX ms
➜  Local:   http://localhost:5175/
```

## 🎯 Access Your Application

- **Frontend (React):** http://localhost:5175
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs
- **API Docs (ReDoc):** http://localhost:8000/redoc

## 📁 Project Structure

```
yard-optimization/
├── src/                          # React frontend
│   ├── app/
│   │   ├── components/          # React components
│   │   ├── contexts/            # React context providers
│   │   ├── pages/               # Page components
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Utility functions
│   ├── services/
│   │   └── api.ts               # API service layer ⭐ NEW
│   └── main.tsx                 # React entry point
│
├── backend/                      # FastAPI backend ⭐ NEW
│   ├── main.py                  # FastAPI app & routes
│   ├── models.py                # Database models
│   ├── schemas.py               # Pydantic schemas
│   ├── database.py              # Database config
│   ├── requirements.txt         # Python dependencies
│   └── README.md                # Backend documentation
│
├── package.json                 # Frontend dependencies
└── SETUP.md                     # This file
```

## 🔧 Using the API in Your React App

The API service is ready to use at `src/services/api.ts`.

### Example: Fetch Containers

```typescript
import { containerAPI } from '../services/api';

function MyComponent() {
  const [containers, setContainers] = useState([]);

  useEffect(() => {
    // Fetch all containers
    containerAPI.getAll()
      .then(data => setContainers(data))
      .catch(err => console.error('Error:', err));
  }, []);

  return (
    <div>
      {containers.map(c => (
        <div key={c.container_id}>{c.container_number}</div>
      ))}
    </div>
  );
}
```

### Example: Create Container

```typescript
import { containerAPI } from '../services/api';

const handleSubmit = async (formData) => {
  try {
    const newContainer = await containerAPI.create(formData);
    console.log('Created:', newContainer);
    // Refresh your list or update state
  } catch (error) {
    console.error('Failed to create container:', error);
  }
};
```

### Example: Get AI Recommendations

```typescript
import { optimizationAPI } from '../services/api';

const getRecommendations = async (containerId: string) => {
  try {
    const result = await optimizationAPI.getPlacementRecommendations({
      container_id: containerId,
      container_type: 'Dry',
      pod: 'Singapore',
      weight_class: 'Heavy',
    });

    console.log('Recommendations:', result.recommendations);
    // Display recommendations to user
  } catch (error) {
    console.error('Failed to get recommendations:', error);
  }
};
```

## 🔄 Switching from Mock Data to Real API

Currently your React app uses hardcoded mock data. To switch to the API:

### Before (Mock Data):
```typescript
// In containers-page.tsx
const [containers, setContainers] = useState([
  { container_id: '1', container_number: 'MAEU123', ... },
  { container_id: '2', container_number: 'MSC456', ... },
]);
```

### After (Real API):
```typescript
import { containerAPI } from '../services/api';

const [containers, setContainers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  containerAPI.getAll()
    .then(data => {
      setContainers(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
}, []);
```

## 🛠️ Development Workflow

### Both servers running:
1. **Terminal 1 (Backend):** `cd backend && uvicorn main:app --reload --port 8000`
2. **Terminal 2 (Frontend):** `npm run dev`

### Making changes:
- **Frontend changes:** Hot reload automatically (Vite)
- **Backend changes:** Auto-reload with `--reload` flag

## 📊 Populating Sample Data

Your database starts empty. You can:

### Option 1: Use the API Docs
1. Go to http://localhost:8000/docs
2. Use the "Try it out" feature to create containers/locations

### Option 2: Create a seed script

Create `backend/seed_data.py`:

```python
from database import SessionLocal
import models

db = SessionLocal()

# Create sample containers
containers = [
    models.Container(
        container_id="CNT001",
        container_number="MAEU1234567",
        iso_code="22G1",
        size_teu=1,
        container_type="Dry",
        load_status="Full",
        weight_mt=18.5,
        weight_class="Heavy",
        cargo_description="Electronics",
        type="export_container",
        customs_status="Cleared",
        hazmat_flag=False,
        reefer_flag=False,
    ),
    # ... add more
]

db.add_all(containers)
db.commit()
db.close()
print("Database seeded!")
```

Run it:
```bash
cd backend
python seed_data.py
```

## ⚠️ Troubleshooting

### Backend won't start
- **Error: "No module named 'fastapi'"**
  - Solution: Activate virtual environment and install dependencies
  ```bash
  cd backend
  venv\Scripts\activate  # Windows
  pip install -r requirements.txt
  ```

### Frontend can't connect to backend
- **Error: "Network Error"**
  - Check if backend is running on http://localhost:8000
  - Check CORS settings in `backend/main.py`
  - Verify frontend is making requests to correct URL

### Port conflicts
- **Backend port 8000 in use:**
  ```bash
  uvicorn main:app --reload --port 8001
  ```
  Then update `src/services/api.ts`:
  ```typescript
  const API_BASE_URL = 'http://localhost:8001';
  ```

- **Frontend port in use:**
  Vite will automatically try ports 5174, 5175, 5176, etc.

### Database errors
- Delete `backend/yard_optimization.db` and restart backend (fresh DB)

## 🚢 For Your Hackathon

### Time-saving tips:

1. **Start simple:** Get basic CRUD working first (containers only)
2. **Add complexity later:** Add optimization algorithm when basic flow works
3. **Use mock data initially:** Keep your existing mock data while building API integration
4. **Test with Swagger:** Use http://localhost:8000/docs to test backend before integrating

### Demo preparation:

1. **Seed database** with impressive sample data before demo
2. **Keep both servers running** throughout presentation
3. **Have fallback:** Keep mock data code commented out as backup
4. **Test offline:** SQLite works without internet

## 📦 Environment Variables (Optional)

Create `.env` file in root:

```env
VITE_API_URL=http://localhost:8000
```

Then in `src/services/api.ts`, it will automatically use this URL.

## 🎓 Next Steps

1. ✅ Both servers running
2. ✅ Test API at http://localhost:8000/docs
3. ✅ Create a few test containers via API
4. ✅ Update one React component to use `containerAPI.getAll()`
5. ✅ Verify data shows in your React app
6. ✅ Gradually migrate other components
7. ✅ Implement your optimization algorithm in `/optimize/placement`

Good luck with your hackathon! 🚀
