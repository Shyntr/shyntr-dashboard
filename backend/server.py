from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
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

# Tenant Models
class TenantBase(BaseModel):
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class Tenant(TenantBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    updated_at: str

# OAuth2/OIDC Client Models (Applications)
class OIDCClientBase(BaseModel):
    client_id: str
    tenant_id: str = "default"
    name: Optional[str] = None
    redirect_uris: List[str] = []
    allowed_cors_origins: List[str] = []
    grant_types: List[str] = ["authorization_code"]
    response_types: List[str] = ["code"]
    scopes: List[str] = ["openid", "profile", "email"]
    audience: List[str] = []
    public: bool = False
    enforce_pkce: bool = True
    auth_method: str = "client_secret_basic"  # client_secret_basic, client_secret_post, private_key_jwt, none

class OIDCClientCreate(OIDCClientBase):
    client_secret: Optional[str] = None

class OIDCClient(OIDCClientBase):
    model_config = ConfigDict(extra="ignore")
    client_secret: str
    protocol: str = "oidc"
    created_at: str
    updated_at: str

# SAML Client (Service Provider) Models
class SAMLClientBase(BaseModel):
    entity_id: str
    tenant_id: str = "default"
    name: Optional[str] = None
    acs_url: str  # Assertion Consumer Service URL
    sp_certificate: Optional[str] = None  # PEM format
    sign_response: bool = True
    sign_assertion: bool = True
    encrypt_assertion: bool = False
    force_authn: bool = False
    attribute_mapping: Dict[str, str] = {}

class SAMLClientCreate(SAMLClientBase):
    pass

class SAMLClient(SAMLClientBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    protocol: str = "saml"
    created_at: str
    updated_at: str

# SAML Connection (Identity Provider) Models
class SAMLConnectionBase(BaseModel):
    name: str
    tenant_id: str = "default"
    idp_metadata_xml: str
    sign_request: bool = True
    force_authn: bool = False
    attribute_mapping: Dict[str, str] = {}

class SAMLConnectionCreate(SAMLConnectionBase):
    pass

class SAMLConnection(SAMLConnectionBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    protocol: str = "saml"
    created_at: str
    updated_at: str

# OIDC Connection (External Provider) Models
class OIDCConnectionBase(BaseModel):
    name: str
    tenant_id: str = "default"
    issuer_url: str
    client_id: str
    client_secret: str
    scopes: List[str] = ["openid", "email", "profile"]
    # Advanced endpoint overrides
    authorization_endpoint: Optional[str] = None
    token_endpoint: Optional[str] = None
    userinfo_endpoint: Optional[str] = None

class OIDCConnectionCreate(OIDCConnectionBase):
    pass

class OIDCConnection(OIDCConnectionBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    protocol: str = "oidc"
    created_at: str
    updated_at: str

# Dashboard Stats Model
class DashboardStats(BaseModel):
    total_oidc_clients: int
    total_saml_clients: int
    total_saml_connections: int
    total_oidc_connections: int
    total_tenants: int
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
    return {"message": "Shyntr Authentication Hub API"}

# Dashboard Stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total_oidc_clients = await db.oidc_clients.count_documents({})
    total_saml_clients = await db.saml_clients.count_documents({})
    total_saml_connections = await db.saml_connections.count_documents({})
    total_oidc_connections = await db.oidc_connections.count_documents({})
    total_tenants = await db.tenants.count_documents({})
    public_clients = await db.oidc_clients.count_documents({"public": True})
    confidential_clients = total_oidc_clients - public_clients
    
    # Get recent activity
    recent_oidc_clients = await db.oidc_clients.find({}, {"_id": 0}).sort("created_at", -1).limit(2).to_list(2)
    recent_saml_clients = await db.saml_clients.find({}, {"_id": 0}).sort("created_at", -1).limit(2).to_list(2)
    recent_connections = await db.saml_connections.find({}, {"_id": 0}).sort("created_at", -1).limit(2).to_list(2)
    
    recent_activity = []
    for c in recent_oidc_clients:
        recent_activity.append({
            "type": "oidc_client",
            "protocol": "oidc",
            "action": "created",
            "name": c.get("name") or c.get("client_id", "Unknown"),
            "timestamp": c.get("created_at", "")
        })
    for c in recent_saml_clients:
        recent_activity.append({
            "type": "saml_client",
            "protocol": "saml",
            "action": "created",
            "name": c.get("name") or c.get("entity_id", "Unknown"),
            "timestamp": c.get("created_at", "")
        })
    for s in recent_connections:
        recent_activity.append({
            "type": "saml_connection",
            "protocol": "saml",
            "action": "created",
            "name": s.get("name", "Unknown"),
            "timestamp": s.get("created_at", "")
        })
    
    recent_activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return DashboardStats(
        total_oidc_clients=total_oidc_clients,
        total_saml_clients=total_saml_clients,
        total_saml_connections=total_saml_connections,
        total_oidc_connections=total_oidc_connections,
        total_tenants=total_tenants if total_tenants > 0 else 1,  # At least default tenant
        public_clients=public_clients,
        confidential_clients=confidential_clients,
        recent_activity=recent_activity[:5]
    )

# ============== Tenants CRUD ==============

@api_router.get("/tenants", response_model=List[Tenant])
async def get_tenants():
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(1000)
    # Always include default tenant
    if not any(t.get("name") == "default" for t in tenants):
        default_tenant = {
            "id": "default",
            "name": "default",
            "display_name": "Default Tenant",
            "description": "The default isolation zone",
            "created_at": get_current_timestamp(),
            "updated_at": get_current_timestamp()
        }
        tenants.insert(0, default_tenant)
    return tenants

@api_router.get("/tenants/{tenant_id}", response_model=Tenant)
async def get_tenant(tenant_id: str):
    if tenant_id == "default":
        return Tenant(
            id="default",
            name="default",
            display_name="Default Tenant",
            description="The default isolation zone",
            created_at=get_current_timestamp(),
            updated_at=get_current_timestamp()
        )
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@api_router.post("/tenants", response_model=Tenant)
async def create_tenant(tenant_data: TenantCreate):
    existing = await db.tenants.find_one({"name": tenant_data.name})
    if existing or tenant_data.name == "default":
        raise HTTPException(status_code=400, detail="Tenant name already exists")
    
    timestamp = get_current_timestamp()
    tenant_dict = tenant_data.model_dump()
    tenant_dict["id"] = str(uuid.uuid4())
    tenant_dict["created_at"] = timestamp
    tenant_dict["updated_at"] = timestamp
    
    await db.tenants.insert_one(tenant_dict)
    tenant_dict.pop("_id", None)
    return tenant_dict

@api_router.put("/tenants/{tenant_id}", response_model=Tenant)
async def update_tenant(tenant_id: str, tenant_data: TenantCreate):
    if tenant_id == "default":
        raise HTTPException(status_code=400, detail="Cannot modify default tenant")
    
    existing = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    timestamp = get_current_timestamp()
    tenant_dict = tenant_data.model_dump()
    tenant_dict["id"] = tenant_id
    tenant_dict["created_at"] = existing.get("created_at", timestamp)
    tenant_dict["updated_at"] = timestamp
    
    await db.tenants.update_one({"id": tenant_id}, {"$set": tenant_dict})
    return tenant_dict

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str):
    if tenant_id == "default":
        raise HTTPException(status_code=400, detail="Cannot delete default tenant")
    
    result = await db.tenants.delete_one({"id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"message": "Tenant deleted successfully"}

# ============== OIDC Clients CRUD ==============

@api_router.get("/clients", response_model=List[OIDCClient])
async def get_oidc_clients():
    clients = await db.oidc_clients.find({}, {"_id": 0}).to_list(1000)
    return clients

@api_router.get("/clients/{client_id}", response_model=OIDCClient)
async def get_oidc_client(client_id: str):
    client = await db.oidc_clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="OIDC Client not found")
    return client

@api_router.post("/clients", response_model=OIDCClient)
async def create_oidc_client(client_data: OIDCClientCreate):
    existing = await db.oidc_clients.find_one({"client_id": client_data.client_id})
    if existing:
        raise HTTPException(status_code=400, detail="Client ID already exists")
    
    timestamp = get_current_timestamp()
    client_dict = client_data.model_dump()
    client_dict["client_secret"] = client_data.client_secret if client_data.client_secret else generate_secret()
    client_dict["protocol"] = "oidc"
    client_dict["created_at"] = timestamp
    client_dict["updated_at"] = timestamp
    
    await db.oidc_clients.insert_one(client_dict)
    client_dict.pop("_id", None)
    return client_dict

@api_router.put("/clients/{client_id}", response_model=OIDCClient)
async def update_oidc_client(client_id: str, client_data: OIDCClientCreate):
    existing = await db.oidc_clients.find_one({"client_id": client_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="OIDC Client not found")
    
    timestamp = get_current_timestamp()
    client_dict = client_data.model_dump()
    client_dict["client_secret"] = client_data.client_secret if client_data.client_secret else existing.get("client_secret")
    client_dict["protocol"] = "oidc"
    client_dict["created_at"] = existing.get("created_at", timestamp)
    client_dict["updated_at"] = timestamp
    
    await db.oidc_clients.update_one({"client_id": client_id}, {"$set": client_dict})
    return client_dict

@api_router.delete("/clients/{client_id}")
async def delete_oidc_client(client_id: str):
    result = await db.oidc_clients.delete_one({"client_id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="OIDC Client not found")
    return {"message": "OIDC Client deleted successfully"}

# ============== SAML Clients CRUD ==============

@api_router.get("/saml-clients", response_model=List[SAMLClient])
async def get_saml_clients():
    clients = await db.saml_clients.find({}, {"_id": 0}).to_list(1000)
    return clients

@api_router.get("/saml-clients/{client_id}", response_model=SAMLClient)
async def get_saml_client(client_id: str):
    client = await db.saml_clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="SAML Client not found")
    return client

@api_router.post("/saml-clients", response_model=SAMLClient)
async def create_saml_client(client_data: SAMLClientCreate):
    existing = await db.saml_clients.find_one({"entity_id": client_data.entity_id})
    if existing:
        raise HTTPException(status_code=400, detail="Entity ID already exists")
    
    timestamp = get_current_timestamp()
    client_dict = client_data.model_dump()
    client_dict["id"] = str(uuid.uuid4())
    client_dict["protocol"] = "saml"
    client_dict["created_at"] = timestamp
    client_dict["updated_at"] = timestamp
    
    await db.saml_clients.insert_one(client_dict)
    client_dict.pop("_id", None)
    return client_dict

@api_router.put("/saml-clients/{client_id}", response_model=SAMLClient)
async def update_saml_client(client_id: str, client_data: SAMLClientCreate):
    existing = await db.saml_clients.find_one({"id": client_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="SAML Client not found")
    
    timestamp = get_current_timestamp()
    client_dict = client_data.model_dump()
    client_dict["id"] = client_id
    client_dict["protocol"] = "saml"
    client_dict["created_at"] = existing.get("created_at", timestamp)
    client_dict["updated_at"] = timestamp
    
    await db.saml_clients.update_one({"id": client_id}, {"$set": client_dict})
    return client_dict

@api_router.delete("/saml-clients/{client_id}")
async def delete_saml_client(client_id: str):
    result = await db.saml_clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SAML Client not found")
    return {"message": "SAML Client deleted successfully"}

# ============== SAML Connections CRUD ==============

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
    connection_dict["protocol"] = "saml"
    connection_dict["created_at"] = timestamp
    connection_dict["updated_at"] = timestamp
    
    # Basic XML validation
    xml = connection_dict["idp_metadata_xml"].strip()
    if not xml.startswith("<?xml") and not xml.startswith("<"):
        raise HTTPException(status_code=400, detail="Invalid XML: IDP metadata must be valid XML")
    
    await db.saml_connections.insert_one(connection_dict)
    connection_dict.pop("_id", None)
    return connection_dict

@api_router.put("/saml-connections/{connection_id}", response_model=SAMLConnection)
async def update_saml_connection(connection_id: str, connection_data: SAMLConnectionCreate):
    existing = await db.saml_connections.find_one({"id": connection_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="SAML Connection not found")
    
    xml = connection_data.idp_metadata_xml.strip()
    if not xml.startswith("<?xml") and not xml.startswith("<"):
        raise HTTPException(status_code=400, detail="Invalid XML: IDP metadata must be valid XML")
    
    timestamp = get_current_timestamp()
    connection_dict = connection_data.model_dump()
    connection_dict["id"] = connection_id
    connection_dict["protocol"] = "saml"
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

# ============== OIDC Connections CRUD ==============

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
    connection_dict["protocol"] = "oidc"
    connection_dict["created_at"] = timestamp
    connection_dict["updated_at"] = timestamp
    
    await db.oidc_connections.insert_one(connection_dict)
    connection_dict.pop("_id", None)
    return connection_dict

@api_router.put("/oidc-connections/{connection_id}", response_model=OIDCConnection)
async def update_oidc_connection(connection_id: str, connection_data: OIDCConnectionCreate):
    existing = await db.oidc_connections.find_one({"id": connection_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="OIDC Connection not found")
    
    timestamp = get_current_timestamp()
    connection_dict = connection_data.model_dump()
    connection_dict["id"] = connection_id
    connection_dict["protocol"] = "oidc"
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
