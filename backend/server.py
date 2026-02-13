from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== Models ==============

# OAuth2 Client Models
class OAuth2ClientBase(BaseModel):
    id: str
    tenant_id: str = "default"
    redirect_uris: List[str] = []
    grant_types: List[str] = ["authorization_code"]
    response_types: List[str] = ["code"]
    scopes: List[str] = ["openid", "profile", "email"]
    public: bool = False
    enforce_pkce: bool = True
    allowed_cors_origins: List[str] = []

class OAuth2ClientCreate(OAuth2ClientBase):
    secret: Optional[str] = None

class OAuth2Client(OAuth2ClientBase):
    model_config = ConfigDict(extra="ignore")
    secret: str
    created_at: str
    updated_at: str

class OAuth2ClientResponse(OAuth2ClientBase):
    secret_masked: str = "*****"
    created_at: str
    updated_at: str

# SAML Connection Models
class SAMLConnectionBase(BaseModel):
    name: str
    tenant_id: str = "default"
    idp_metadata_xml: str
    force_authn: bool = False
    sign_request: bool = True

class SAMLConnectionCreate(SAMLConnectionBase):
    pass

class SAMLConnection(SAMLConnectionBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    updated_at: str

# OIDC Connection Models
class OIDCConnectionBase(BaseModel):
    name: str
    tenant_id: str = "default"
    issuer_url: str
    client_id: str
    client_secret: str
    scopes: List[str] = ["openid", "email", "profile"]

class OIDCConnectionCreate(OIDCConnectionBase):
    pass

class OIDCConnection(OIDCConnectionBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    updated_at: str

# Dashboard Stats Model
class DashboardStats(BaseModel):
    total_clients: int
    total_saml_connections: int
    total_oidc_connections: int
    public_clients: int
    confidential_clients: int
    recent_activity: List[dict]

# ============== Helper Functions ==============

def generate_secret():
    return secrets.token_urlsafe(32)

def get_current_timestamp():
    return datetime.now(timezone.utc).isoformat()

# ============== Routes ==============

@api_router.get("/")
async def root():
    return {"message": "Shyntr IAM API"}

# Dashboard Stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total_clients = await db.oauth2_clients.count_documents({})
    total_saml = await db.saml_connections.count_documents({})
    total_oidc = await db.oidc_connections.count_documents({})
    public_clients = await db.oauth2_clients.count_documents({"public": True})
    confidential_clients = total_clients - public_clients
    
    # Get recent activity (last 5 items from each collection)
    recent_clients = await db.oauth2_clients.find({}, {"_id": 0}).sort("created_at", -1).limit(3).to_list(3)
    recent_saml = await db.saml_connections.find({}, {"_id": 0}).sort("created_at", -1).limit(2).to_list(2)
    
    recent_activity = []
    for c in recent_clients:
        recent_activity.append({
            "type": "client",
            "action": "created",
            "name": c.get("id", "Unknown"),
            "timestamp": c.get("created_at", "")
        })
    for s in recent_saml:
        recent_activity.append({
            "type": "saml",
            "action": "created", 
            "name": s.get("name", "Unknown"),
            "timestamp": s.get("created_at", "")
        })
    
    # Sort by timestamp
    recent_activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return DashboardStats(
        total_clients=total_clients,
        total_saml_connections=total_saml,
        total_oidc_connections=total_oidc,
        public_clients=public_clients,
        confidential_clients=confidential_clients,
        recent_activity=recent_activity[:5]
    )

# OAuth2 Clients CRUD
@api_router.get("/clients", response_model=List[OAuth2Client])
async def get_clients():
    clients = await db.oauth2_clients.find({}, {"_id": 0}).to_list(1000)
    return clients

@api_router.get("/clients/{client_id}", response_model=OAuth2Client)
async def get_client(client_id: str):
    client = await db.oauth2_clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@api_router.post("/clients", response_model=OAuth2Client)
async def create_client(client_data: OAuth2ClientCreate):
    # Check if client already exists
    existing = await db.oauth2_clients.find_one({"id": client_data.id})
    if existing:
        raise HTTPException(status_code=400, detail="Client ID already exists")
    
    timestamp = get_current_timestamp()
    client_dict = client_data.model_dump()
    client_dict["secret"] = client_data.secret if client_data.secret else generate_secret()
    client_dict["created_at"] = timestamp
    client_dict["updated_at"] = timestamp
    
    await db.oauth2_clients.insert_one(client_dict)
    
    # Return without _id
    del client_dict["_id"] if "_id" in client_dict else None
    return client_dict

@api_router.put("/clients/{client_id}", response_model=OAuth2Client)
async def update_client(client_id: str, client_data: OAuth2ClientCreate):
    existing = await db.oauth2_clients.find_one({"id": client_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")
    
    timestamp = get_current_timestamp()
    client_dict = client_data.model_dump()
    client_dict["secret"] = client_data.secret if client_data.secret else existing.get("secret")
    client_dict["created_at"] = existing.get("created_at", timestamp)
    client_dict["updated_at"] = timestamp
    
    await db.oauth2_clients.update_one({"id": client_id}, {"$set": client_dict})
    return client_dict

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    result = await db.oauth2_clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

# SAML Connections CRUD
@api_router.get("/saml-connections", response_model=List[SAMLConnection])
async def get_saml_connections():
    connections = await db.saml_connections.find({}, {"_id": 0}).to_list(1000)
    return connections

@api_router.get("/saml-connections/{connection_id}", response_model=SAMLConnection)
async def get_saml_connection(connection_id: str):
    connection = await db.saml_connections.find_one({"id": connection_id}, {"_id": 0})
    if not connection:
        raise HTTPException(status_code=404, detail="SAML Connection not found")
    return connection

@api_router.post("/saml-connections", response_model=SAMLConnection)
async def create_saml_connection(connection_data: SAMLConnectionCreate):
    timestamp = get_current_timestamp()
    connection_dict = connection_data.model_dump()
    connection_dict["id"] = str(uuid.uuid4())
    connection_dict["created_at"] = timestamp
    connection_dict["updated_at"] = timestamp
    
    # Basic XML validation
    if not connection_dict["idp_metadata_xml"].strip().startswith("<?xml") and not connection_dict["idp_metadata_xml"].strip().startswith("<"):
        raise HTTPException(status_code=400, detail="Invalid XML: IDP metadata must be valid XML")
    
    await db.saml_connections.insert_one(connection_dict)
    del connection_dict["_id"] if "_id" in connection_dict else None
    return connection_dict

@api_router.put("/saml-connections/{connection_id}", response_model=SAMLConnection)
async def update_saml_connection(connection_id: str, connection_data: SAMLConnectionCreate):
    existing = await db.saml_connections.find_one({"id": connection_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="SAML Connection not found")
    
    # Basic XML validation
    if not connection_data.idp_metadata_xml.strip().startswith("<?xml") and not connection_data.idp_metadata_xml.strip().startswith("<"):
        raise HTTPException(status_code=400, detail="Invalid XML: IDP metadata must be valid XML")
    
    timestamp = get_current_timestamp()
    connection_dict = connection_data.model_dump()
    connection_dict["id"] = connection_id
    connection_dict["created_at"] = existing.get("created_at", timestamp)
    connection_dict["updated_at"] = timestamp
    
    await db.saml_connections.update_one({"id": connection_id}, {"$set": connection_dict})
    return connection_dict

@api_router.delete("/saml-connections/{connection_id}")
async def delete_saml_connection(connection_id: str):
    result = await db.saml_connections.delete_one({"id": connection_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SAML Connection not found")
    return {"message": "SAML Connection deleted successfully"}

# OIDC Connections CRUD
@api_router.get("/oidc-connections", response_model=List[OIDCConnection])
async def get_oidc_connections():
    connections = await db.oidc_connections.find({}, {"_id": 0}).to_list(1000)
    return connections

@api_router.get("/oidc-connections/{connection_id}", response_model=OIDCConnection)
async def get_oidc_connection(connection_id: str):
    connection = await db.oidc_connections.find_one({"id": connection_id}, {"_id": 0})
    if not connection:
        raise HTTPException(status_code=404, detail="OIDC Connection not found")
    return connection

@api_router.post("/oidc-connections", response_model=OIDCConnection)
async def create_oidc_connection(connection_data: OIDCConnectionCreate):
    timestamp = get_current_timestamp()
    connection_dict = connection_data.model_dump()
    connection_dict["id"] = str(uuid.uuid4())
    connection_dict["created_at"] = timestamp
    connection_dict["updated_at"] = timestamp
    
    await db.oidc_connections.insert_one(connection_dict)
    del connection_dict["_id"] if "_id" in connection_dict else None
    return connection_dict

@api_router.put("/oidc-connections/{connection_id}", response_model=OIDCConnection)
async def update_oidc_connection(connection_id: str, connection_data: OIDCConnectionCreate):
    existing = await db.oidc_connections.find_one({"id": connection_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="OIDC Connection not found")
    
    timestamp = get_current_timestamp()
    connection_dict = connection_data.model_dump()
    connection_dict["id"] = connection_id
    connection_dict["created_at"] = existing.get("created_at", timestamp)
    connection_dict["updated_at"] = timestamp
    
    await db.oidc_connections.update_one({"id": connection_id}, {"$set": connection_dict})
    return connection_dict

@api_router.delete("/oidc-connections/{connection_id}")
async def delete_oidc_connection(connection_id: str):
    result = await db.oidc_connections.delete_one({"id": connection_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="OIDC Connection not found")
    return {"message": "OIDC Connection deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
