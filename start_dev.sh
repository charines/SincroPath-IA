#!/bin/bash
echo "🚀 Iniciando SincroPath-IA Dev Environment..."

# 1. Inicia o Backend FastAPI no background
echo "🔧 Subindo Backend (FastAPI na porta 8000)..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# 2. Inicia o Frontend Vite
echo "💻 Subindo Frontend (Vite)..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "====================================="
echo "✅ SERVIÇOS INICIADOS:"
echo "👉 FastAPI Backend: http://localhost:8000"
echo "👉 React Frontend: Use a porta listada pelo vite acima"
echo "Para desligar, aperte CTRL+C."
echo "====================================="

# Espera CTRL+C e mata ambos
trap "echo 'Terminando serviços...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

wait
