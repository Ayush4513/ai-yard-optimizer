# Yard Optimization FastAPI Backend

FastAPI backend for the Container Yard Optimization system.

## Quick Start

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Or using a virtual environment (recommended):

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Run the Backend Server

```bash
# Make sure you're in the backend directory
cd backend

# Run with uvicorn
uvicorn main:app --reload --port 8000
```

The API will be available at:
- **API:** http://localhost:8000
- **Interactive Docs (Swagger):** http://localhost:8000/docs
- **Alternative Docs (ReDoc):** http://localhost:8000/redoc

### 3. Database

The backend uses SQLite (file-based database). On first run:
- A file called `yard_optimization.db` will be created automatically
- All tables will be created automatically via SQLAlchemy

**No manual setup required!**

## API Endpoints

### Container Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/containers` | Get all containers (supports filtering) |
| GET | `/containers/{id}` | Get specific container |
| POST | `/containers` | Create new container |
| PUT | `/containers/{id}` | Update container |
| DELETE | `/containers/{id}` | Delete container |

### Location Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/locations` | Get all yard locations (supports filtering) |
| GET | `/locations/{id}` | Get specific location |
| POST | `/locations` | Create new location |
| PUT | `/locations/{id}` | Update location |

### Optimization Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/optimize/placement` | Get AI placement recommendations |

### Statistics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats/overview` | Get yard statistics |
| GET | `/stats/containers` | Get container statistics |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |
| GET | `/` | API info |

## Query Parameters Examples

### Get containers by type
```
GET /containers?container_type=Reefer
```

### Get containers by customs status
```
GET /containers?customs_status=Cleared
```

### Get available locations in a specific yard
```
GET /locations?yard_name=L1&occupied=false
```

## Request Body Examples

### Create a Container (POST /containers)

```json
{
  "container_id": "CNT001",
  "container_number": "MAEU1234567",
  "iso_code": "22G1",
  "size_teu": 1,
  "container_type": "Dry",
  "load_status": "Full",
  "weight_mt": 18.5,
  "weight_class": "Heavy",
  "cargo_description": "Electronics",
  "type": "export_container",
  "customs_status": "Cleared",
  "shipping_line": "Maersk",
  "pod": "Singapore",
  "hazmat_flag": false,
  "reefer_flag": false,
  "gate_in_time": "2024-01-15T10:30:00"
}
```

### Get Placement Recommendations (POST /optimize/placement)

```json
{
  "container_id": "CNT001",
  "container_type": "Dry",
  "pod": "Singapore",
  "weight_class": "Heavy",
  "hazmat_flag": false,
  "reefer_flag": false
}
```

## Development Notes

### File Structure

```
backend/
├── main.py           # FastAPI app & endpoints
├── models.py         # SQLAlchemy database models
├── schemas.py        # Pydantic request/response models
├── database.py       # Database configuration
├── requirements.txt  # Python dependencies
└── yard_optimization.db  # SQLite database (created on first run)
```

### Adding Custom Optimization Logic

The placement recommendation endpoint is at `/optimize/placement` in `main.py`.

Current implementation returns mock data. Replace the logic in this function to implement your real optimization algorithm:

```python
@app.post("/optimize/placement", response_model=schemas.PlacementRecommendation)
def get_placement_recommendation(
    request: schemas.PlacementRequest,
    db: Session = Depends(get_db)
):
    # TODO: Add your optimization algorithm here
    # Example: pathfinding, constraint satisfaction, ML model, etc.
    pass
```

### CORS Configuration

The backend allows requests from these origins (configured in `main.py`):
- http://localhost:5173
- http://localhost:5174
- http://localhost:5175
- http://localhost:5176
- http://localhost:3000

Add more origins if your React app runs on a different port.

## Testing the API

### Using the Interactive Docs

1. Go to http://localhost:8000/docs
2. Click "Try it out" on any endpoint
3. Fill in the request body/parameters
4. Click "Execute"

### Using curl

```bash
# Health check
curl http://localhost:8000/health

# Get all containers
curl http://localhost:8000/containers

# Create a container
curl -X POST http://localhost:8000/containers \
  -H "Content-Type: application/json" \
  -d '{"container_id":"CNT001","container_number":"TEST123","iso_code":"22G1","size_teu":1,"container_type":"Dry","load_status":"Full","weight_mt":15,"weight_class":"Medium","cargo_description":"Test","type":"export_container","customs_status":"Cleared","hazmat_flag":false,"reefer_flag":false}'
```

## Troubleshooting

### Port already in use
If port 8000 is busy, run on a different port:
```bash
uvicorn main:app --reload --port 8001
```

Don't forget to update `VITE_API_URL` in your React app!

### Database locked error
SQLite doesn't handle high concurrency well. For production, switch to PostgreSQL:

1. Install: `pip install psycopg2-binary`
2. Update `database.py`:
   ```python
   SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
   ```

### Import errors
Make sure you're in the `backend` directory when running uvicorn:
```bash
cd backend
uvicorn main:app --reload
```

## Production Deployment

For hackathon deployment, use free platforms:

### Option 1: Railway.app (Recommended)
1. Push code to GitHub
2. Connect Railway to your repo
3. Railway auto-detects Python and deploys
4. Update React app with production API URL

### Option 2: Render.com
1. Create new Web Service
2. Connect GitHub repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Option 3: Local for Demo
Keep it simple - run locally during demo presentation!
