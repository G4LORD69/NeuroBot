from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

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

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Game(BaseModel):
    id: str
    key: str
    title_ru: str
    title_en: str
    domain: str
    description_ru: str
    description_en: str
    icon: str  # lucide icon name for frontend

# Static game catalog (design-first; minimal data; no ObjectId)
GAMES: List[Game] = [
    Game(
        id=str(uuid.uuid4()),
        key="memory_matrix",
        title_ru="Memory Matrix",
        title_en="Memory Matrix",
        domain="memory",
        description_ru="Запоминай вспыхивающий узор и повторяй его. Тренирует зрительно-пространственную память.",
        description_en="Remember the flashing pattern and repeat it. Trains visuospatial memory.",
        icon="GridIcon",
    ),
    Game(
        id=str(uuid.uuid4()),
        key="n_back",
        title_ru="N-Back",
        title_en="N-Back",
        domain="memory",
        description_ru="Сигналь, когда текущий стимул совпадает с тем, что был N шагов назад.",
        description_en="Signal when the current stimulus matches the one N steps back.",
        icon="RepeatIcon",
    ),
    Game(
        id=str(uuid.uuid4()),
        key="stroop",
        title_ru="Струп-тест",
        title_en="Stroop Test",
        domain="attention",
        description_ru="Выбирай цвет шрифта, игнорируя слово. Тренирует селективное внимание.",
        description_en="Choose the font color while ignoring the word. Trains selective attention.",
        icon="PaletteIcon",
    ),
    Game(
        id=str(uuid.uuid4()),
        key="schulte",
        title_ru="Таблица Шульте",
        title_en="Schulte Table",
        domain="attention",
        description_ru="Нажимай числа в порядке 1→25 как можно быстрее.",
        description_en="Tap numbers 1→25 as fast as possible.",
        icon="HashIcon",
    ),
    Game(
        id=str(uuid.uuid4()),
        key="quick_math",
        title_ru="Быстрый счёт",
        title_en="Quick Math",
        domain="speed",
        description_ru="Решай простую арифметику на время.",
        description_en="Solve simple arithmetic against the clock.",
        icon="CalculatorIcon",
    ),
    Game(
        id=str(uuid.uuid4()),
        key="hanoi",
        title_ru="Ханойские башни",
        title_en="Towers of Hanoi",
        domain="logic",
        description_ru="Перемести башню за минимум ходов. Планирование и рабочая память.",
        description_en="Move the tower in minimum moves. Planning and working memory.",
        icon="LayersIcon",
    ),
]

# Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    await db.status_checks.insert_one({**status_obj.dict(), "timestamp": status_obj.timestamp.isoformat()})
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    # Parse back timestamp to aware datetime if needed is optional for demo
    result: List[StatusCheck] = []
    for sc in status_checks:
        ts = sc.get("timestamp")
        if isinstance(ts, str):
            try:
                sc["timestamp"] = datetime.fromisoformat(ts)
            except Exception:
                sc["timestamp"] = datetime.now(timezone.utc)
        result.append(StatusCheck(**{k: v for k, v in sc.items() if k != "_id"}))
    return result

@api_router.get("/games", response_model=List[Game])
async def list_games():
    return GAMES

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()