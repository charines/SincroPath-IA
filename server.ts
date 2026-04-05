import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { format, addDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const app = express();
const PORT = 3000;
const TIMEZONE = "America/Sao_Paulo";

app.use(express.json());

// --- MOCK DATA ---
let teams = [
  { id: 1, name: "Tecnologia", max_weight: 40 },
  { id: 2, name: "Mídia & Vídeo", max_weight: 30 }
];

let projects = [
  { id: 1, name: "Plataforma EAD", team_id: 1 },
  { id: 2, name: "Campanha Lançamento", team_id: 2 },
  { id: 3, name: "Infraestrutura Cloud", team_id: 1 }
];

let sprints = [
  { id: 1, name: "Sprint 04/2026", start_date: "2026-04-01", end_date: "2026-04-30", team_id: 1 },
  { id: 2, name: "Sprint 04/2026", start_date: "2026-04-01", end_date: "2026-04-30", team_id: 2 }
];

let tasks = [
  { id: 1, title: "Desenvolvimento API", project_id: 1, sprint_id: 1, weight: 8, status: "todo", is_approved: true, criticality: "Alta", owner_email: "dev@empresa.com", source_system: "Manual" },
  { id: 2, title: "Edição de Vídeo Aula 01", project_id: 2, sprint_id: 2, weight: 5, status: "in-progress", is_approved: true, criticality: "Média", owner_email: "midia@empresa.com", source_system: "DFlix" },
  { id: 3, title: "Deploy em Homologação", project_id: 1, sprint_id: 1, weight: 3, status: "todo", is_approved: false, criticality: "Crítica", owner_email: "dev@empresa.com", source_system: "GitHub" },
  { id: 4, title: "Gravação de Conteúdo", project_id: 2, sprint_id: 2, weight: 10, status: "done", is_approved: true, criticality: "Alta", owner_email: "midia@empresa.com", source_system: "Meeting" }
];

let dependencies = [
  { from_id: 4, to_id: 2 }, // Gravação -> Edição
  { from_id: 1, to_id: 3 }  // API -> Deploy
];

// --- LOGIC: CPM (Critical Path Method) ---
function calculateCPM(projectId: number) {
  const projectTasks = tasks.filter(t => t.project_id === projectId);
  const projectDeps = dependencies.filter(d => 
    projectTasks.some(t => t.id === d.from_id) && projectTasks.some(t => t.id === d.to_id)
  );

  // Simple CPM implementation for POC
  // Duration = Weight (1 pt = 1 day)
  const nodes = projectTasks.map(t => ({
    id: t.id,
    title: t.title,
    duration: t.weight,
    es: 0, ef: 0, ls: 0, lf: 0, slack: 0
  }));

  // Forward Pass
  let changed = true;
  while(changed) {
    changed = false;
    nodes.forEach(node => {
      const predecessors = projectDeps.filter(d => d.to_id === node.id);
      const maxEf = predecessors.length > 0 
        ? Math.max(...predecessors.map(p => nodes.find(n => n.id === p.from_id)?.ef || 0))
        : 0;
      
      if (node.es !== maxEf) {
        node.es = maxEf;
        node.ef = node.es + node.duration;
        changed = true;
      }
    });
  }

  // Backward Pass
  const maxProjectEf = Math.max(...nodes.map(n => n.ef));
  nodes.forEach(n => { n.lf = maxProjectEf; n.ls = n.lf - n.duration; });

  changed = true;
  while(changed) {
    changed = false;
    nodes.forEach(node => {
      const successors = projectDeps.filter(d => d.from_id === node.id);
      const minLs = successors.length > 0
        ? Math.min(...successors.map(s => nodes.find(n => n.id === s.to_id)?.ls || maxProjectEf))
        : maxProjectEf;
      
      if (node.lf !== minLs) {
        node.lf = minLs;
        node.ls = node.lf - node.duration;
        changed = true;
      }
    });
  }

  nodes.forEach(n => { n.slack = n.lf - n.ef; });

  return nodes;
}

// --- API ENDPOINTS ---

app.get("/api/data", (req, res) => {
  res.json({ teams, projects, sprints, tasks, dependencies });
});

app.get("/api/analytics/pert/:projectId", (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const cpmData = calculateCPM(projectId);
  res.json(cpmData);
});

app.post("/api/ingestion/meeting", (req, res) => {
  const { transcription } = req.body;
  // Mock IA Extraction
  const suggestedTasks = [
    { title: "Ajustar Layout Dashboard", weight: 3, owner_email: "charles@inmade.com.br", project_id: 1 },
    { title: "Configurar Webhook GLPI", weight: 5, owner_email: "dev@empresa.com", project_id: 3 }
  ];
  res.json({ suggestedTasks });
});

app.patch("/api/tasks/:id/approve", (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.is_approved = true;
    res.json(task);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (Timezone: ${TIMEZONE})`);
  });
}

startServer();
