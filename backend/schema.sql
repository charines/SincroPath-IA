-- Criação do banco de dados (Ajuste caso não use um schema default)
CREATE DATABASE IF NOT EXISTS sincropath_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sincropath_db;

-- Tabela: Teams (Equipes)
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    max_weight INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Projects (Projetos)
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    team_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Tabela: Sprints
CREATE TABLE IF NOT EXISTS sprints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    team_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Tabela: Tasks (Tarefas)
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title TEXT NOT NULL,
    project_id INT NOT NULL,
    sprint_id INT,
    weight INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'todo', -- 'todo', 'in-progress', 'done'
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    criticality VARCHAR(50) DEFAULT 'Média',
    owner_email VARCHAR(255) NOT NULL, -- Obrigatório para Auth Google
    source_system VARCHAR(50) DEFAULT 'Manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL
);

-- Tabela: Dependencies
CREATE TABLE IF NOT EXISTS dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_id INT NOT NULL,
    to_id INT NOT NULL,
    FOREIGN KEY (from_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (to_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dependency (from_id, to_id)
);

-- Povoamento Inicial Básico (Semente / Seed)
INSERT INTO teams (name, max_weight) VALUES 
('Tecnologia', 40), 
('Mídia & Vídeo', 30);

INSERT INTO projects (name, team_id) VALUES 
('Plataforma EAD', 1), 
('Campanha Lançamento', 2),
('Infraestrutura Cloud', 1);

INSERT INTO sprints (name, start_date, end_date, team_id) VALUES 
('Sprint 04/2026', '2026-04-01', '2026-04-30', 1),
('Sprint 04/2026', '2026-04-01', '2026-04-30', 2);

INSERT INTO tasks (title, project_id, sprint_id, weight, status, is_approved, criticality, owner_email, source_system) VALUES 
('Desenvolvimento API', 1, 1, 8, 'todo', TRUE, 'Alta', 'dev@empresa.com', 'Manual'),
('Edição de Vídeo Aula 01', 2, 2, 5, 'in-progress', TRUE, 'Média', 'midia@empresa.com', 'DFlix'),
('Deploy em Homologação', 1, 1, 3, 'todo', FALSE, 'Crítica', 'dev@empresa.com', 'GitHub'),
('Gravação de Conteúdo', 2, 2, 10, 'done', TRUE, 'Alta', 'midia@empresa.com', 'Meeting');

INSERT INTO dependencies (from_id, to_id) VALUES 
(4, 2),
(1, 3);
