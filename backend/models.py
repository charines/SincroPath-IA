import os
import pytz
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from database import Base, TIMEZONE

def get_local_now():
    tz = pytz.timezone(TIMEZONE)
    return datetime.now(tz)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    max_weight = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=get_local_now)
    
    projects = relationship("Project", back_populates="team", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="team", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=get_local_now)
    
    team = relationship("Team", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

class Sprint(Base):
    __tablename__ = "sprints"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=get_local_now)
    
    team = relationship("Team", back_populates="sprints")
    tasks = relationship("Task", back_populates="sprint")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sprint_id = Column(Integer, ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True)
    weight = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="todo", nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)
    criticality = Column(String(50), default="Média")
    owner_email = Column(String(255), nullable=False)
    source_system = Column(String(50), default="Manual")
    created_at = Column(DateTime, default=get_local_now)

    project = relationship("Project", back_populates="tasks")
    sprint = relationship("Sprint", back_populates="tasks")

class Dependency(Base):
    __tablename__ = "dependencies"
    id = Column(Integer, primary_key=True, index=True)
    from_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    to_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    
    # constraint UNIQUE feita pelo metadata.create_all via SQLAlchemy caso seja recriada
