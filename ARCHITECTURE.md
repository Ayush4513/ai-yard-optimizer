# Container Yard Optimization - Architecture Diagram

## Complete System Architecture

```mermaid
graph TB
    User[User Browser]
    Frontend[React Frontend<br/>Port: 5173<br/>Vite + TypeScript]
    API[FastAPI Backend<br/>Port: 8000<br/>REST API]
    Orchestrator[Orchestrator Agent<br/>LangChain Agent<br/>Query Routing]
    
    subgraph Tools["Agent Tools - 8 Tools"]
        Tool1[query_yard_state<br/>Neo4j]
        Tool2[find_container<br/>Neo4j]
        Tool3[get_blocking_analysis<br/>Neo4j]
        Tool4[search_rules<br/>ChromaDB]
        Tool5[search_patterns<br/>ChromaDB]
        Tool6[get_movement_history<br/>SQLite]
        Tool7[get_vessel_plan<br/>SQLite + Neo4j]
        Tool8[suggest_placement<br/>Hybrid - All DBs]
    end
    
    subgraph Databases["Database Layer"]
        Neo4jDB[(Neo4j<br/>Graph Database<br/>Port: 7474, 7687<br/>Container, Slot, Vessel nodes<br/>Relationships: LOCATED_AT, STACKED_ON, BLOCKS)]
        ChromaDB[(ChromaDB<br/>Vector Database<br/>Port: 8001<br/>Collections: yard_rules,<br/>historical_patterns)]
        SQLiteDB[(SQLite<br/>Raw Data and Audit Log<br/>Read-only mount<br/>Tables: containers,<br/>yard_locations, blocks)]
    end
    
    LLM[Anthropic Claude<br/>LLM for RAG<br/>claude-3-5-sonnet]
    
    subgraph Ingestion["Data Ingestion Pipelines"]
        CSV1[CSV Rules Files]
        CSV2[Historical Movement Data]
        Ingest1[ingest_rules.py<br/>CSV to JSON to ChromaDB]
        Ingest2[ingest_historical_data.py<br/>CSV to ChromaDB]
        Ingest3[ingest_to_neo4j.py<br/>SQLite to Neo4j Graph]
    end
    
    User -->|HTTP Requests| Frontend
    Frontend -->|REST API Calls| API
    API -->|Routes Queries| Orchestrator
    
    Orchestrator -->|Selects Tools| Tool1
    Orchestrator -->|Selects Tools| Tool2
    Orchestrator -->|Selects Tools| Tool3
    Orchestrator -->|Selects Tools| Tool4
    Orchestrator -->|Selects Tools| Tool5
    Orchestrator -->|Selects Tools| Tool6
    Orchestrator -->|Selects Tools| Tool7
    Orchestrator -->|Selects Tools| Tool8
    
    Tool1 -->|Cypher Queries| Neo4jDB
    Tool2 -->|Cypher Queries| Neo4jDB
    Tool3 -->|Cypher Queries| Neo4jDB
    Tool4 -->|Semantic Search| ChromaDB
    Tool5 -->|Semantic Search| ChromaDB
    Tool6 -->|SQL Queries| SQLiteDB
    Tool7 -->|SQL Queries| SQLiteDB
    Tool7 -->|Cypher Queries| Neo4jDB
    Tool8 -->|Cypher Queries| Neo4jDB
    Tool8 -->|Semantic Search| ChromaDB
    Tool8 -->|SQL Queries| SQLiteDB
    
    Orchestrator -->|RAG Chain| LLM
    LLM -->|Uses Context| ChromaDB
    LLM -->|Uses Context| Neo4jDB
    
    CSV1 --> Ingest1
    CSV2 --> Ingest2
    SQLiteDB --> Ingest3
    Ingest1 --> ChromaDB
    Ingest2 --> ChromaDB
    Ingest3 --> Neo4jDB
```

---

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph Sources["Data Sources"]
        CSV[CSV Files<br/>Rules and Movements]
        SQLiteSource[(SQLite DB<br/>Raw Data)]
    end
    
    subgraph Processing["Processing Layer"]
        Convert[Convert CSV<br/>to JSON]
        IngestRules[Ingest Rules<br/>to ChromaDB]
        IngestHistory[Ingest History<br/>to ChromaDB]
        IngestGraph[Ingest to<br/>Neo4j Graph]
    end
    
    subgraph Storage["Storage Layer"]
        Chroma[(ChromaDB<br/>Vector Store)]
        Neo[(Neo4j<br/>Graph Store)]
        SQL[(SQLite<br/>Audit Log)]
    end
    
    subgraph Query["Query Layer"]
        Agent[Orchestrator<br/>Agent]
        Tools[8 Agent<br/>Tools]
    end
    
    subgraph Response["Response Layer"]
        API[FastAPI<br/>REST API]
        Frontend[React<br/>Frontend]
    end
    
    CSV --> Convert
    Convert --> IngestRules
    CSV --> IngestHistory
    SQLiteSource --> IngestGraph
    
    IngestRules --> Chroma
    IngestHistory --> Chroma
    IngestGraph --> Neo
    SQLiteSource --> SQL
    
    Chroma --> Tools
    Neo --> Tools
    SQL --> Tools
    
    Tools --> Agent
    Agent --> API
    API --> Frontend
```

---

## Database Schema Architecture

```mermaid
erDiagram
    Container ||--o{ LOCATED_AT : "has"
    Container ||--o{ STACKED_ON : "stacked on"
    Container ||--o{ BLOCKS : "blocks"
    Container ||--o| ASSIGNED_TO : "assigned to"
    Container }o--|| Slot : "located at"
    Container }o--|| Vessel : "assigned to"
    Slot }o--|| Block : "belongs to"
    Block }o--|| Yard : "belongs to"
    
    Container {
        string containerId PK
        string containerNumber UK
        string containerType
        string weightClass
        string pod
        string status
        int bay
        int row
        int tier
    }
    
    Slot {
        string slotId PK
        string blockId FK
        string yardName
        int bay
        int row
        int tier
        string zoneType
        boolean isOccupied
    }
    
    Block {
        string blockId PK
        string yardName
        string blockType
        int totalSlots
        int occupiedSlots
    }
    
    Yard {
        string yardId PK
        string yardName UK
        string yardType
    }
    
    Vessel {
        string vesselId PK
        string voyageNumber
        string pod
    }
    
    SQLite_Container ||--o{ SQLite_Event : "has"
    
    SQLite_Container {
        string container_id PK
        string container_number
        string container_type
        string weight_class
        string vessel_id
        string pod
        string block_id
        int bay
        int row
        int tier
    }
    
    SQLite_Event {
        int event_sequence_number
        string movement_id
        string event_type
        string actual_timestamp
        boolean rehandle_flag
    }
```

---

## Query Routing Flow

```mermaid
flowchart TD
    Start[User Query] --> Router{Query Router<br/>route_query}
    
    Router -->|Where is container X| Neo4jRoute[Neo4j Only<br/>find_container tool]
    Router -->|What are rules for| ChromaRoute[ChromaDB Only<br/>search_rules tool]
    Router -->|Show movement history| SQLiteRoute[SQLite Only<br/>get_movement_history tool]
    Router -->|Vessel plan| Hybrid1[SQLite + Neo4j<br/>get_vessel_plan tool]
    Router -->|Where should I place| Hybrid2[All Databases<br/>suggest_placement tool]
    Router -->|Yard state| Neo4jRoute2[Neo4j<br/>query_yard_state tool]
    
    Neo4jRoute --> Neo4jDB[(Neo4j)]
    ChromaRoute --> ChromaDB[(ChromaDB)]
    SQLiteRoute --> SQLiteDB[(SQLite)]
    Hybrid1 --> Neo4jDB
    Hybrid1 --> SQLiteDB
    Hybrid2 --> Neo4jDB
    Hybrid2 --> ChromaDB
    Hybrid2 --> SQLiteDB
    Neo4jRoute2 --> Neo4jDB
    
    Neo4jDB --> Format[Format Context]
    ChromaDB --> Format
    SQLiteDB --> Format
    
    Format --> LLM{LLM Available?}
    LLM -->|Yes| Generate[Generate Response<br/>with Claude]
    LLM -->|No| Return[Return Raw Results]
    Generate --> Response[Final Response]
    Return --> Response
    Response --> User[User]
```

---

## Docker Container Architecture

```mermaid
graph TB
    subgraph Docker["Docker Compose Services"]
        subgraph Network["container_yard_network"]
            FrontendC[frontend:5173<br/>React + Nginx]
            APIC[api:8000<br/>FastAPI + Python]
            Neo4jC[neo4j:7474,7687<br/>Neo4j Graph DB]
            ChromaC[chromadb:8001<br/>ChromaDB Vector DB]
            SQLiteC[sqlite<br/>Alpine + Data Mount]
        end
    end
    
    subgraph Volumes["Docker Volumes"]
        Neo4jVol[neo4j_data<br/>neo4j_logs]
        ChromaVol[chromadb_data]
        LocalData[./data<br/>./chroma_db<br/>./Yard-Optimization/backend]
    end
    
    FrontendC -->|HTTP| APIC
    APIC -->|Bolt Protocol| Neo4jC
    APIC -->|HTTP| ChromaC
    APIC -->|File Access| SQLiteC
    
    Neo4jC --> Neo4jVol
    ChromaC --> ChromaVol
    SQLiteC --> LocalData
    APIC --> LocalData
```

---

## Complete System Overview

```mermaid
graph TB
    subgraph UserLayer["User Layer"]
        User[User Browser]
    end
    
    subgraph AppLayer["Application Layer"]
        Frontend[React Frontend<br/>Port 5173]
        API[FastAPI API<br/>Port 8000]
    end
    
    subgraph AILayer["AI/ML Layer"]
        Orchestrator[Orchestrator Agent]
        RAG[RAG Chain]
        LLM[Claude LLM]
        Tools[8 Agent Tools]
    end
    
    subgraph DataLayer["Data Layer"]
        Neo4j[(Neo4j<br/>Graph)]
        ChromaDB[(ChromaDB<br/>Vectors)]
        SQLite[(SQLite<br/>Raw Data)]
    end
    
    subgraph IngestLayer["Ingestion Layer"]
        Scripts[Ingestion Scripts<br/>convert_rules_csv_to_json.py<br/>ingest_rules.py<br/>ingest_historical_data.py<br/>ingest_to_neo4j.py]
    end
    
    User --> Frontend
    Frontend --> API
    API --> Orchestrator
    Orchestrator --> Tools
    Orchestrator --> RAG
    RAG --> LLM
    Tools --> Neo4j
    Tools --> ChromaDB
    Tools --> SQLite
    RAG --> ChromaDB
    RAG --> Neo4j
    Scripts --> Neo4j
    Scripts --> ChromaDB
    Scripts --> SQLite
```

---

## Request Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Orchestrator
    participant Tools
    participant Neo4j
    participant ChromaDB
    participant SQLite
    participant LLM
    
    User->>Frontend: HTTP Request
    Frontend->>API: REST API Call
    API->>Orchestrator: Route Query
    Orchestrator->>Orchestrator: Analyze Query Type
    Orchestrator->>Tools: Select Appropriate Tool
    
    alt Neo4j Query
        Tools->>Neo4j: Cypher Query
        Neo4j-->>Tools: Graph Results
    else ChromaDB Query
        Tools->>ChromaDB: Semantic Search
        ChromaDB-->>Tools: Vector Results
    else SQLite Query
        Tools->>SQLite: SQL Query
        SQLite-->>Tools: Raw Data
    else Hybrid Query
        Tools->>Neo4j: Cypher Query
        Tools->>ChromaDB: Semantic Search
        Tools->>SQLite: SQL Query
        Neo4j-->>Tools: Graph Results
        ChromaDB-->>Tools: Vector Results
        SQLite-->>Tools: Raw Data
    end
    
    Tools-->>Orchestrator: Combined Results
    Orchestrator->>LLM: RAG Chain with Context
    LLM-->>Orchestrator: Generated Response
    Orchestrator-->>API: Formatted Response
    API-->>Frontend: JSON Response
    Frontend-->>User: Display Results
```

---

## Component Details

### Services Running:
1. **Frontend** (React + Vite) - Port 5173
2. **API** (FastAPI) - Port 8000
3. **Neo4j** (Graph DB) - Ports 7474, 7687
4. **ChromaDB** (Vector DB) - Port 8001
5. **SQLite** (Data Mount) - Read-only

### Agent Tools (8):
1. `query_yard_state` → Neo4j
2. `find_container` → Neo4j
3. `get_blocking_analysis` → Neo4j
4. `search_rules` → ChromaDB
5. `search_patterns` → ChromaDB
6. `get_movement_history` → SQLite
7. `get_vessel_plan` → SQLite + Neo4j
8. `suggest_placement` → All 3 DBs

### Data Flow:
- **CSV Rules** → JSON → ChromaDB
- **Historical Data** → ChromaDB
- **SQLite Data** → Neo4j Graph
- **User Query** → Orchestrator → Tools → Databases → Response
