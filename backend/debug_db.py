import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Carrega o .env da pasta root/backend explicitamente
load_dotenv()

# Pegar a URL. Se não existir, avisa.
# Força PyMySQL (livre de dependência do MySQLdb Nativo)
raw_url = os.getenv("DATABASE_URL")
if not raw_url:
    print("❌ ERRO: DATABASE_URL não encontrada no arquivo .env!")
    sys.exit(1)

if raw_url.startswith("mysql://"):
    raw_url = raw_url.replace("mysql://", "mysql+pymysql://")
elif "mysqlconnector" in raw_url:
    raw_url = raw_url.replace("mysqlconnector", "pymysql")

DATABASE_URL = raw_url

print(f"🔧 Tentando conectar ao banco...")

try:
    # 1. Configurar Motor
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # IMPORTANTE: Importar a Base e as models explicitamente para garantir acoplamento
    from database import Base
    import models

    print("✅ Conexão ORM e Modelos Carregados localmente!")

    # 2. Criar Tabelas
    print("⏳ Tentando disparar Base.metadata.create_all()...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas Criadas/Verificadas com Sucesso!")

    # 3. Teste de Permissões (Read/Write/Delete)
    print("⏳ Verificando permissões de Escrita/Deleção...")
    db = SessionLocal()
    try:
        # Inserção
        teste_team = models.Team(name="Equipe Debug", max_weight=99)
        db.add(teste_team)
        db.commit()
        db.refresh(teste_team)
        team_id = teste_team.id
        print(f"   -> ✅ Inserção OK (Equipe Debug gerada com ID {team_id})")

        # Deleção
        db.delete(teste_team)
        db.commit()
        print(f"   -> ✅ Deleção OK (ID {team_id} removido)")

    except Exception as perm_error:
        print(f"❌ Falha de Permissão CRUD: {perm_error}")
        db.rollback()
    finally:
        db.close()
        
    print("🚀 TUDO VERDE! O HostGator aceitou a arquitetura perfeitamente.")

except Exception as e:
    print(f"\n❌ ERRO DETALHADO DO MYSQL/SQLALCHEMY ❌")
    print("Verifique se o usuário HostGator tem privilégios totais ou se a senha contém caracteres não encodados.")
    print(f"Stacktrace: {str(e)}")
    sys.exit(1)
