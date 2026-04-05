import os
from datetime import datetime, date
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
import models
from dotenv import load_dotenv

load_dotenv()

def run_seed():
    db = SessionLocal()
    
    print("⏳ Limpando banco atual (para seed limpo)...")
    # Para reset rápido (perigoso em prod: só para o contexto do exercício)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✅ Banco zerado e recriado.")

    print("🌱 Semeando Tabelas...")

    try:
        # 1. Equipes
        tec = models.Team(name="Tecnologia", max_weight=40)
        midia = models.Team(name="Mídia & Vídeo", max_weight=30)
        db.add_all([tec, midia])
        db.commit()

        # 2. Sprints
        s_tec = models.Sprint(name="Sprint 04/2026", start_date=date(2026, 4, 1), end_date=date(2026, 4, 30), team_id=tec.id)
        s_midia = models.Sprint(name="Sprint 04/2026", start_date=date(2026, 4, 1), end_date=date(2026, 4, 30), team_id=midia.id)
        db.add_all([s_tec, s_midia])
        db.commit()

        # 3. Projetos
        p_ead = models.Project(name="Plataforma EAD", team_id=tec.id)
        p_campanha = models.Project(name="Campanha Lançamento", team_id=midia.id)
        p_infra = models.Project(name="Infraestrutura Cloud", team_id=tec.id)
        db.add_all([p_ead, p_campanha, p_infra])
        db.commit()

        # 4. Tarefas
        t1 = models.Task(title="Configurar Servidor", project_id=p_infra.id, sprint_id=s_tec.id, weight=5, status="done", is_approved=True, criticality="Alta", owner_email="dev@empresa.com", source_system="Manual")
        t2 = models.Task(title="Deploy API (Depende do Servidor)", project_id=p_infra.id, sprint_id=s_tec.id, weight=8, status="todo", is_approved=True, criticality="Crítica", owner_email="dev@empresa.com", source_system="Manual")
        t3 = models.Task(title="Edição Video Aula", project_id=p_ead.id, sprint_id=s_midia.id, weight=5, status="in-progress", is_approved=False, criticality="Média", owner_email="midia@empresa.com", source_system="DFlix")
        t4 = models.Task(title="Gravar Módulo AWS", project_id=p_ead.id, sprint_id=s_midia.id, weight=13, status="todo", is_approved=True, criticality="Alta", owner_email="midia@empresa.com", source_system="Manual")
        t5 = models.Task(title="Automação Marketing", project_id=p_campanha.id, sprint_id=s_midia.id, weight=3, status="todo", is_approved=True, criticality="Baixa", owner_email="mkt@empresa.com", source_system="Sales")
        
        db.add_all([t1, t2, t3, t4, t5])
        db.commit()

        # 5. Dependências (T1 bloqueia T2 | T4 bloqueia T3)
        d1 = models.Dependency(from_id=t1.id, to_id=t2.id)
        d2 = models.Dependency(from_id=t4.id, to_id=t3.id)
        db.add_all([d1, d2])
        db.commit()

        print("🚀 Seed Completo! Total de dados simulados injetados via SQLAlchemy.")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro na semeadura: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
