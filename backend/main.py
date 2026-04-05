import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import pytz

# Configuração de Banco de Dados real
from database import get_db, engine, Base, TIMEZONE
import models
from sqlalchemy.orm import Session

print("Conectando ao banco HostGator e criando tabelas...")
Base.metadata.create_all(bind=engine)
print("Tabelas verificadas/criadas com sucesso!")

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    client = OpenAI(api_key=openai_api_key)
else:
    client = None
    print("AVISO: OPENAI_API_KEY não localizada. O processamento da IA falhará.")

app = FastAPI(title="SincroPath-IA Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_local_now():
    tz = pytz.timezone(os.getenv("TIMEZONE", "America/Sao_Paulo"))
    return datetime.now(tz)

# --- MODELOS PYDANTIC REQUESTS ---
class MeetingRequest(BaseModel):
    transcription: str

class TaskCreate(BaseModel):
    title: str
    project_id: int
    sprint_id: Optional[int] = None
    weight: int = 1
    owner_email: str
    source_system: str = "Manual"
    criticality: str = "Média"

# Pydantic Output parsers manuais pra serialização segura
def serialize_obj(obj):
    d = {}
    for column in obj.__table__.columns:
        val = getattr(obj, column.name)
        if isinstance(val, (datetime, datetime.date)):
            d[column.name] = val.isoformat()
        else:
            d[column.name] = val
    return d

# --- ENDPOINTS REST REAIS (Usando SQLAlchemy) ---
@app.get("/api/teams")
def get_teams(db: Session = Depends(get_db)):
    return [serialize_obj(i) for i in db.query(models.Team).all()]

@app.get("/api/sprints")
def get_sprints(db: Session = Depends(get_db)):
    return [serialize_obj(i) for i in db.query(models.Sprint).all()]

@app.get("/api/tasks")
def get_tasks(db: Session = Depends(get_db)):
    return [serialize_obj(i) for i in db.query(models.Task).all()]

@app.get("/api/projects")
def get_projects(db: Session = Depends(get_db)):
    return [serialize_obj(i) for i in db.query(models.Project).all()]

@app.get("/api/dependencies")
def get_dependencies(db: Session = Depends(get_db)):
    return [serialize_obj(i) for i in db.query(models.Dependency).all()]

# Rota Agregadora Original (Retro-compatibilidade p/ o useEffect inicial do App.tsx)
@app.get("/api/data")
def get_data(db: Session = Depends(get_db)):
    return {
        "teams": [serialize_obj(i) for i in db.query(models.Team).all()],
        "projects": [serialize_obj(i) for i in db.query(models.Project).all()],
        "sprints": [serialize_obj(i) for i in db.query(models.Sprint).all()],
        "tasks": [serialize_obj(i) for i in db.query(models.Task).all()],
        "dependencies": [serialize_obj(i) for i in db.query(models.Dependency).all()]
    }

# --- LÓGICA CPM ALIMENTADA PELO DB ESTRITO ---
@app.get("/api/analytics/pert/{project_id}")
def get_pert(project_id: int, db: Session = Depends(get_db)):
    """Calcula o Critical Path Method local baseado na árvore real de dependências do MySQL"""
    project_tasks = db.query(models.Task).filter(models.Task.project_id == project_id).all()
    task_ids = [t.id for t in project_tasks]
    
    # Capturar apenas deps que interligam as taks deste projeto
    project_deps = db.query(models.Dependency).filter(
        models.Dependency.from_id.in_(task_ids),
        models.Dependency.to_id.in_(task_ids)
    ).all()
    
    nodes = []
    for t in project_tasks:
        nodes.append({"id": t.id, "title": t.title, "duration": t.weight, "es": 0, "ef": 0, "ls": 0, "lf": 0, "slack": 0})

    # Forward Pass
    changed = True
    while changed:
        changed = False
        for node in nodes:
            predecessors = [d for d in project_deps if d.to_id == node["id"]]
            max_ef = max([n["ef"] for n in nodes if n["id"] in [p.from_id for p in predecessors]] + [0]) if predecessors else 0
            if node["es"] != max_ef:
                node["es"] = max_ef; node["ef"] = node["es"] + node["duration"]; changed = True

    # Backward Pass
    max_project_ef = max([n["ef"] for n in nodes] + [0])
    for n in nodes:
        n["lf"] = max_project_ef; n["ls"] = n["lf"] - n["duration"]

    changed = True
    while changed:
        changed = False
        for node in nodes:
            successors = [d for d in project_deps if d.from_id == node["id"]]
            min_ls = min([n["ls"] for n in nodes if n["id"] in [s.to_id for s in successors]] + [max_project_ef]) if successors else max_project_ef
            if node["lf"] != min_ls:
                node["lf"] = min_ls; node["ls"] = node["lf"] - node["duration"]; changed = True

    for n in nodes:
        n["slack"] = n["lf"] - n["ef"]

    return nodes

@app.patch("/api/tasks/{task_id}/approve")
def approve_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.is_approved = True
    db.commit()
    db.refresh(task)
    return serialize_obj(task)

@app.post("/api/tasks")
def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(
        title=task_data.title,
        project_id=task_data.project_id,
        sprint_id=task_data.sprint_id,
        weight=task_data.weight,
        status="todo",
        is_approved=False,
        criticality=task_data.criticality,
        owner_email=task_data.owner_email,
        source_system=task_data.source_system
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return serialize_obj(db_task)

@app.post("/api/ingestion/meeting")
def process_meeting(req: MeetingRequest):
    if not client:
        return {"suggestedTasks": [{"title": "Ajustar Mocks (Sem OPENAI API KEY)", "weight": 3, "owner_email": "mock@empresa.com", "project_id": 1}]}
    
    prompt = f"""Atue como um Product Manager sênior analisando uma transcrição bruta de reunião.
    Sua missão é extrair tarefas tangíveis (To-Dos) do texto. Retorne um JSON.
    Transcrição para analisar: {req.transcription}"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "Você extrai tarefas em JSON Mode. Responda estritamente seguindo o schema: {\"suggestedTasks\": [{\"title\": \"...\", \"weight\": int, \"owner_email\": \"...\", \"project_id\": int}]}. weight de 1 a 13."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        raw_text = response.choices[0].message.content
        return json.loads(raw_text)
    except Exception as e:
        print(f"Erro OpenAI: {e}")
        raise HTTPException(status_code=500, detail="Erro no processamento OpenAI.")
