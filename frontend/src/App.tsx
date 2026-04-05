import { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Network, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Github, 
  MessageSquare, 
  ExternalLink,
  Search,
  Users
} from "lucide-react";
import ReactFlow, { 
  Background, 
  Controls, 
  Edge, 
  Node, 
  Handle, 
  Position,
  MarkerType
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDateBR } from "./lib/utils";
import { Team, Project, Sprint, Task, Dependency, CPMNode } from "./types";

// --- API CONFIGURATION ---
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// --- COMPONENTS ---

const TaskCard = ({ task, onApprove }: { task: Task, onApprove?: (id: number) => void | Promise<void> }) => {
  const sourceIcons = {
    GLPI: <ExternalLink className="w-3 h-3 text-blue-500" />,
    GitHub: <Github className="w-3 h-3 text-zinc-900" />,
    Meeting: <MessageSquare className="w-3 h-3 text-mist-500" />,
    Sales: <Clock className="w-3 h-3 text-orange-500" />,
    DFlix: <LayoutDashboard className="w-3 h-3 text-blue-500" />,
    Manual: <Plus className="w-3 h-3 text-zinc-400" />
  };

  // Mock capacity indicator for the user (Max 20 pts)
  const capacityPct = Math.min((task.weight / 20) * 100, 100);

  return (
    <motion.div 
      layout
      className={cn(
        "bg-white border-zinc-200 border rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden",
        !task.is_approved && "border-dashed border-zinc-400 bg-zinc-200 opacity-60"
      )}
    >
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        task.criticality === "Crítica" ? "bg-orange-500" : 
        task.criticality === "Alta" ? "bg-orange-400" : "bg-mist-500"
      )} />
      
      <div className="flex justify-between items-start mb-2 pl-1">
        <div className="flex items-center gap-1.5">
          {sourceIcons[task.source_system as keyof typeof sourceIcons]}
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            {task.source_system}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold bg-mist-100 text-mist-900 px-1.5 py-0.5 rounded-md">
            {task.weight} pts
          </span>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-zinc-900 mb-3 line-clamp-2 leading-snug pl-1">
        {task.title}
      </h4>

      <div className="flex flex-col mt-auto border-t border-zinc-100 pt-2 pl-1 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-mist-500 flex items-center justify-center text-[10px] text-white font-bold">
              {task.owner_email.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-zinc-500 uppercase">Capacidade</span>
              <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-0.5">
                <div 
                  className={cn("h-full", capacityPct > 80 ? "bg-orange-500" : "bg-mist-500")}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            </div>
          </div>
          
          {!task.is_approved ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onApprove?.(task.id); }}
              className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded"
            >
              APROVAR
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
              <CheckCircle2 className="w-3 h-3 text-mist-500" /> APROVADO
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const CustomNode = ({ data }: { data: CPMNode }) => (
  <div className="p-3 w-48">
    <Handle type="target" position={Position.Left} className="!bg-zinc-400" />
    <div className="flex justify-between items-start mb-2">
      <span className="text-[9px] font-bold text-zinc-400 uppercase">ID: {data.id}</span>
      <span className={cn(
        "text-[9px] font-bold px-1.5 py-0.5 rounded",
        data.slack === 0 ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-600"
      )}>
        SLACK: {data.slack}d
      </span>
    </div>
    <h5 className="text-xs font-bold text-zinc-900 mb-2 leading-tight">{data.title}</h5>
    <div className="grid grid-cols-2 gap-1 text-[8px] font-mono">
      <div className="bg-zinc-50 p-1 rounded">ES: {data.es}</div>
      <div className="bg-zinc-50 p-1 rounded">EF: {data.ef}</div>
      <div className="bg-zinc-50 p-1 rounded">LS: {data.ls}</div>
      <div className="bg-zinc-50 p-1 rounded">LF: {data.lf}</div>
    </div>
    <Handle type="source" position={Position.Right} className="!bg-zinc-400" />
  </div>
);

const nodeTypes = { task: CustomNode };

export default function App() {
  const [activeTab, setActiveTab] = useState<"kanban" | "pert">("kanban");
  const [data, setData] = useState<{
    teams: Team[],
    projects: Project[],
    sprints: Sprint[],
    tasks: Task[],
    dependencies: Dependency[]
  } | null>(null);
  
  const [selectedTeamId, setSelectedTeamId] = useState<number>(1);
  const [selectedSprintId, setSelectedSprintId] = useState<number>(1);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [pertNodes, setPertNodes] = useState<CPMNode[]>([]);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [suggestedTasks, setSuggestedTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/data`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn("Backend FastAPI not ready, using empty state initially");
    }
  };

  const fetchPertData = async (projectId: number) => {
    try {
      const res = await fetch(`${API_URL}/analytics/pert/${projectId}`);
      if (res.ok) {
        const json = await res.json();
        setPertNodes(json);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === "pert") {
      fetchPertData(selectedProjectId);
    }
  }, [activeTab, selectedProjectId]);

  const handleApprove = async (id: number) => {
    try {
      await fetch(`${API_URL}/tasks/${id}/approve`, { method: "PATCH" });
      fetchData();
    } catch (e) {}
  };

  const handleProcessMeeting = async () => {
    try {
      const res = await fetch(`${API_URL}/ingestion/meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription })
      });
      if (res.ok) {
        const json = await res.json();
        setSuggestedTasks(json.suggestedTasks);
      }
    } catch (e) {}
  };

  const currentTeam = data?.teams.find(t => t.id === selectedTeamId);
  const currentSprint = data?.sprints.find(s => s.id === selectedSprintId);
  
  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter(t => t.sprint_id === selectedSprintId);
  }, [data, selectedSprintId]);

  const sprintWeight = useMemo(() => {
    return filteredTasks.filter(t => t.is_approved).reduce((acc, t) => acc + t.weight, 0);
  }, [filteredTasks]);

  const capacityPercentage = currentTeam ? (sprintWeight / currentTeam.max_weight) * 100 : 0;

  const flowElements = useMemo(() => {
    const nodes: Node[] = pertNodes.map((n, i) => ({
      id: n.id.toString(),
      type: "task",
      data: n,
      position: { x: i * 250, y: 100 + (i % 2) * 100 },
    }));

    const edges: Edge[] = (data?.dependencies || []).filter(d => 
      pertNodes.some(n => n.id === d.from_id) && pertNodes.some(n => n.id === d.to_id)
    ).map(d => {
      const fromNode = pertNodes.find(n => n.id === d.from_id);
      const toNode = pertNodes.find(n => n.id === d.to_id);
      const isCritical = fromNode?.slack === 0 && toNode?.slack === 0;

      return {
        id: `e-${d.from_id}-${d.to_id}`,
        source: d.from_id.toString(),
        target: d.to_id.toString(),
        className: isCritical ? "critical-path" : "",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCritical ? "#f97316" : "#a1a1aa",
        },
      };
    });

    return { nodes, edges };
  }, [pertNodes, data?.dependencies]);

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-mist-500 rounded-xl flex items-center justify-center shadow-lg">
              <Network className="text-white w-6 h-6" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">SincroPath-IA</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab("kanban")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                activeTab === "kanban" ? "bg-mist-500 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <LayoutDashboard className="w-4 h-4" /> Swimlanes (Kanban)
            </button>
            <button 
              onClick={() => setActiveTab("pert")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                activeTab === "pert" ? "bg-mist-500 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Network className="w-4 h-4" /> Gráfico PERT
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Equipe</span>
              <select 
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(Number(e.target.value))}
                className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 text-sm font-bold text-zinc-900 w-48 outline-none focus:ring-2 focus:ring-mist-500"
              >
                {data?.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Sprint</span>
              <select 
                value={selectedSprintId}
                onChange={e => setSelectedSprintId(Number(e.target.value))}
                className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 text-sm font-bold text-zinc-900 w-56 outline-none focus:ring-2 focus:ring-mist-500"
              >
                {data?.sprints.filter(s => s.team_id === selectedTeamId).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatDateBR(s.start_date)} - {formatDateBR(s.end_date)})
                  </option>
                ))}
              </select>
            </div>

            <div className="h-10 w-px bg-zinc-200" />

            <div className="w-64">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Capacidade Equipe</span>
                <span className={cn(
                  "text-[10px] font-bold",
                  capacityPercentage > 90 ? "text-orange-500" : "text-mist-500"
                )}>
                  {sprintWeight} / {currentTeam?.max_weight || 0} pts ({Math.round(capacityPercentage)}%)
                </span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                  className={cn(
                    "h-full transition-all",
                    capacityPercentage > 90 ? "bg-orange-500" : "bg-mist-500"
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMeetingModalOpen(true)}
              className="bg-mist-500 hover:bg-mist-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Meeting IA Backend
            </button>
          </div>
        </header>

        {/* VIEW AREA */}
        <div className="flex-1 overflow-auto p-6 bg-zinc-50">
          {activeTab === "kanban" ? (
            <div className="flex flex-col gap-6">
              {/* SWIMLANES HEADER */}
              <div className="grid grid-cols-[200px_1fr] gap-4 mb-2 sticky top-0 bg-zinc-50 z-10 pb-2 border-b border-zinc-200">
                <div className="flex items-center text-xs font-bold text-zinc-500 uppercase tracking-widest pl-2">
                  Projetos
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {["A Fazer", "Em Curso", "Concluído"].map(title => (
                    <div key={title} className="bg-zinc-100 rounded-lg p-3 border border-zinc-200 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">{title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SWIMLANES ROWS */}
              {data?.projects.filter(p => p.team_id === selectedTeamId).map(project => (
                <div key={project.id} className="grid grid-cols-[200px_1fr] gap-4 items-stretch border-b border-zinc-200 pb-6 mb-2">
                  {/* PROJECT ROW HEADER */}
                  <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm flex flex-col justify-center">
                    <div className="w-8 h-1 bg-mist-500 rounded-full mb-3" />
                    <h3 className="text-sm font-bold text-zinc-900 leading-tight">{project.name}</h3>
                    <span className="text-xs font-medium text-zinc-400 mt-2">
                      {filteredTasks.filter(t => t.project_id === project.id).length} tarefas
                    </span>
                  </div>

                  {/* STATUS COLUMNS */}
                  <div className="grid grid-cols-3 gap-6 bg-white/50 p-4 rounded-xl border border-zinc-200/50">
                    {["todo", "in-progress", "done"].map(status => (
                      <div key={status} className="bg-zinc-50/50 rounded-xl p-3 border border-dashed border-zinc-200 min-h-[150px] space-y-3">
                        {filteredTasks
                          .filter(t => t.project_id === project.id && t.status === status)
                          .map(task => (
                            <TaskCard key={task.id} task={task} onApprove={handleApprove} />
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!data && (
                <div className="text-center p-12 text-zinc-500 uppercase tracking-widest text-xs font-bold">
                  Aguardando conexão com FastAPI Backend...
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <span className="text-sm font-bold text-zinc-500">Filtrar Projeto:</span>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(parseInt(e.target.value))}
                  className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-mist-500"
                >
                  {data?.projects.filter(p => p.team_id === selectedTeamId).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden relative">
                <ReactFlow nodes={flowElements.nodes} edges={flowElements.edges} nodeTypes={nodeTypes} fitView>
                  <Background color="#e4e4e7" gap={20} />
                  <Controls />
                </ReactFlow>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MEETING MODAL (DECOUPLED TO BACKEND) */}
      <AnimatePresence>
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMeetingModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-mist-500" /> Processador IA (Backend)
                  </h3>
                  <button onClick={() => setIsMeetingModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2 tracking-widest">
                      Transcrição da Reunião
                    </label>
                    <textarea 
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      placeholder="Cole aqui a transcrição. O Python FastAPI processará usando o Gemini na camada segura..."
                      className="w-full h-40 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-mist-500 transition-all resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleProcessMeeting}
                    className="w-full bg-mist-500 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-mist-600 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" /> Analisar transcrição no Servidor
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
