import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

load_dotenv()

# Configuração de Fuso Horário - Prioritário contra conflitos com HostGator UTC
TIMEZONE = os.getenv("TIMEZONE", "America/Sao_Paulo")

# Força PyMySQL como provider universal via String Replace
raw_url = os.getenv("DATABASE_URL", "mysql+pymysql://root:secret@localhost/sincropath_db")
if raw_url.startswith("mysql://"):
    raw_url = raw_url.replace("mysql://", "mysql+pymysql://")
elif "mysqlconnector" in raw_url:
    raw_url = raw_url.replace("mysqlconnector", "pymysql")

SQLALCHEMY_DATABASE_URL = raw_url

# Adicionado pool_pre_ping=True para hospedagens compartilhadas tipo HostGator
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

# Evento na engine para forçar timezone nos queries do banco nativamente
@event.listens_for(engine, "connect")
def connect(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET time_zone = '-03:00'")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
