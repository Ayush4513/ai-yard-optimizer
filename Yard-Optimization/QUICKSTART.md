# ⚡ QUICK START - 32 Hour Hackathon Edition

## 🏃‍♂️ Start Everything (2 Commands)

### Terminal 1 - Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Terminal 2 - Frontend
```bash
npm run dev
```

## 🌐 URLs

- **App:** http://localhost:5175
- **API Docs:** http://localhost:8000/docs 👈 **Test your API here!**

## 🔥 What You Got

### Backend Files (Python)
```
backend/
├── main.py         - All your API endpoints
├── models.py       - Database tables
├── schemas.py      - Request/response models
├── database.py     - DB config (SQLite)
└── requirements.txt
```

### Frontend Integration (React)
```
src/services/api.ts - Ready-to-use API functions
```

## 📝 Using the API in React

```typescript
import { containerAPI } from '../services/api';

// Get all containers
const containers = await containerAPI.getAll();

// Create container
const newContainer = await containerAPI.create(containerData);

// Get AI recommendations
import { optimizationAPI } from '../services/api';
const recs = await optimizationAPI.getPlacementRecommendations({
  container_id: "CNT001"
});
```

## 🎯 API Endpoints You Have

| What | Method | Endpoint |
|------|--------|----------|
| List containers | GET | `/containers` |
| Create container | POST | `/containers` |
| Update container | PUT | `/containers/{id}` |
| Delete container | DELETE | `/containers/{id}` |
| List locations | GET | `/locations` |
| AI Recommendations | POST | `/optimize/placement` 🤖 |
| Yard stats | GET | `/stats/overview` |

## 🤖 Add Your Optimization Algorithm

Edit `backend/main.py`, find this function:

```python
@app.post("/optimize/placement", response_model=schemas.PlacementRecommendation)
def get_placement_recommendation(
    request: schemas.PlacementRequest,
    db: Session = Depends(get_db)
):
    # TODO: YOUR ALGORITHM HERE
    # - Pathfinding
    # - Constraint satisfaction
    # - ML model
    # - Whatever makes judges go "wow!"
```

## 🧪 Testing

1. **Go to:** http://localhost:8000/docs
2. **Click:** Any endpoint → "Try it out"
3. **Execute:** Creates real data in your database
4. **See it:** Refresh your React app

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| "Module not found" | `cd backend && pip install -r requirements.txt` |
| "Port in use" | Backend: `uvicorn main:app --reload --port 8001` |
| "Network error" | Make sure backend is running on :8000 |
| Database locked | Delete `backend/yard_optimization.db` and restart |

## 🚀 Hackathon Pro Tips

1. **Use Swagger docs** (http://localhost:8000/docs) to test before coding
2. **Keep mock data** as fallback during demo
3. **Seed sample data** before presenting
4. **Focus on ONE feature** - make it perfect
5. **Backend down?** Your React app still works with mock data

## 📦 What's Different From Before

**Before:** All data in React state → lost on refresh

**Now:** Data stored in SQLite database → persists forever

## 🎬 Demo Script

1. Show container form → submit
2. Open API docs → show data persisted
3. Request AI recommendation → show algorithm working
4. Show stats updating in real-time
5. **Boom - working product! 💥**

## ⏱️ Time Budget (If Starting Fresh)

- ✅ Setup (done): 0 min (I did it for you!)
- 🔨 Integrate 1 component: 30 min
- 🧠 Custom algorithm: 2-4 hours
- 🎨 Polish UI: 1-2 hours
- 🧪 Testing: 1 hour
- 📊 Seed data: 30 min
- **Total: ~5-8 hours** (24 hours left for features!)

---

**Need help?** Check [SETUP.md](SETUP.md) for detailed guide.

**Ready to code?** Start at `src/services/api.ts` - it's all there!
