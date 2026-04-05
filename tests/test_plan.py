import os
import json
import time
import requests
from datetime import datetime
from sqlalchemy import text
from dotenv import load_dotenv
import sys

# Adiciona o diretório backend ao path para importar database e models
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from database import engine

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

def run_tests():
    results = {
        "timestamp": datetime.now().isoformat(),
        "status": "PASS",
        "database_latency": "0ms",
        "ai_response_valid": False,
        "critical_path_found": False,
        "errors": []
    }

    # 1. Teste de Conectividade MySQL
    try:
        start_time = time.time()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        latency = int((time.time() - start_time) * 1000)
        results["database_latency"] = f"{latency}ms"
        if latency > 500:
            results["errors"].append(f"Alta latência no banco: {latency}ms")
    except Exception as e:
        results["status"] = "FAIL"
        results["errors"].append(f"Erro de conexão com Banco: {str(e)}")

    # 2. Teste de Inteligência (OpenAI via Backend)
    # Nota: Assume que o backend está rodando na porta 8000 (conforme start_dev.sh)
    backend_url = "http://localhost:8000/api"
    try:
        test_transcription = "Realizar o deploy do servidor e configurar o firewall."
        response = requests.post(
            f"{backend_url}/ingestion/meeting",
            json={"transcription": test_transcription},
            timeout=15
        )
        if response.status_code == 200:
            data = response.json()
            if "suggestedTasks" in data and len(data["suggestedTasks"]) > 0:
                task = data["suggestedTasks"][0]
                if "weight" in task and "owner_email" in task:
                    results["ai_response_valid"] = True
                else:
                    results["errors"].append("IA retornou JSON incompleto (faltando campos)")
            else:
                results["errors"].append("IA retornou JSON sem tarefas sugeridas")
        else:
            results["errors"].append(f"Erro na rota de Ingestão: {response.status_code}")
    except Exception as e:
        results["errors"].append(f"Falha ao conectar no endpoint de IA: {str(e)}")

    # 3. Lógica PERT / Caminho Crítico
    try:
        # Testa o endpoint de analytics para o projeto 1 (criado no seed)
        response = requests.get(f"{backend_url}/analytics/pert/1", timeout=5)
        if response.status_code == 200:
                nodes = response.json()
                critical_nodes = [n for n in nodes if n.get("slack") == 0]
                if len(critical_nodes) > 0:
                    results["critical_path_found"] = True
                else:
                    results["errors"].append("PERT não identificou caminho crítico (slack=0)")
        else:
            results["errors"].append(f"Erro na rota PERT: {response.status_code}")
    except Exception as e:
        results["errors"].append(f"Falha ao validar lógica PERT: {str(e)}")

    # 4. Integridade Frontend (CORS) - Simulação via Head
    try:
        response = requests.options(f"{backend_url}/tasks", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }, timeout=5)
        if response.status_code not in [200, 204]:
            results["errors"].append(f"Problema detectado com CORS: {response.status_code}")
    except Exception as e:
         results["errors"].append(f"Erro ao testar pre-flight CORS: {str(e)}")

    if results["errors"]:
        results["status"] = "FAIL"

    # Salva resultado
    output_path = os.path.join(os.path.dirname(__file__), 'test_results_log.json')
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    run_tests()
