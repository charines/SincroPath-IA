import { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Network, 
  Users, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Github, 
  MessageSquare, 
  ExternalLink,
  ChevronRight,
  Search,
  MoreVertical
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

// --- COMPONENTS ---

const TaskCard = ({ task, onApprove }: { task: Task, onApprove?: (id: number) => void | Promise<void>, key?: any }) => {
  const sourceIcons = {
    GLPI: <ExternalLink className="w-3 h-3 text-blue-500" />,
    GitHub: <Github className="w-3 h-3 text-zinc-900" />,
    Meeting: <MessageSquare className="w-3 h-3 text-mist-500" />,
    Sales: <Clock className="w-3 h-3 text-orange-500" />,
    DFlix: <LayoutDashboard className="w-3 h-3 text-blue-500" />,
    Manual: <Plus className="w-3 h-3 text-zinc-400" />
  };

  return (
    <motion.div 
      layout
      className={cn(
        "bg-white border-zinc-200 border rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden",
        !task.is_approved && "border-dashed border-zinc-300 bg-zinc-50/50"
      )}
    >
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        task.criticality === "Crítica" ? "bg-orange-500" : 
        task.criticality === "Alta" ? "bg-orange-400" : "bg-mist-500"
      )} />
      
      <div className="flex justify-between items-start mb-2">
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

      <h4 className="text-sm font-semibold text-zinc-900 mb-3 line-clamp-2 leading-snug">
        {task.title}
      </h4>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-mist-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
            {task.owner_email.charAt(0).toUpperCase()}
          </div>
        </div>
        
        {!task.is_approved ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onApprove?.(task.id); }}
            className="text-[10px] font-bold text-mist-500 hover:text-mist-900 flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" /> APROVAR
          </button>
        ) : (
          <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
            <CheckCircle2 className="w-3 h-3 text-mist-500" /> APROVADO
          </div>
        )}
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

const nodeTypes = {
  task: CustomNode
};

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
    const res = await fetch("/api/data");
    const json = await res.json();
    setData(json);
  };

  const fetchPertData = async (projectId: number) => {
    const res = await fetch(`/api/analytics/pert/${projectId}`);
    const json = await res.json();
    setPertNodes(json);
  };

  useEffect(() => {
    if (activeTab === "pert") {
      fetchPertData(selectedProjectId);
    }
  }, [activeTab, selectedProjectId]);

  const handleApprove = async (id: number) => {
    await fetch(`/api/tasks/${id}/approve`, { method: "PATCH" });
    fetchData();
  };

  const handleProcessMeeting = async () => {
    const res = await fetch("/api/ingestion/meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcription })
    });
    const json = await res.json();
    setSuggestedTasks(json.suggestedTasks);
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

  // React Flow Setup
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

  if (!data) return <div className="flex items-center justify-center h-screen bg-mist-50">Carregando...</div>;

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-mist-900 text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-mist-500 rounded-xl flex items-center justify-center shadow-lg">
              <Network className="text-white w-6 h-6" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">PERT-Kanban IA</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab("kanban")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                activeTab === "kanban" ? "bg-mist-500 text-white" : "text-mist-100 hover:bg-mist-800"
              )}
            >
              <LayoutDashboard className="w-4 h-4" /> Kanban
            </button>
            <button 
              onClick={() => setActiveTab("pert")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                activeTab === "pert" ? "bg-mist-500 text-white" : "text-mist-100 hover:bg-mist-800"
              )}
            >
              <Network className="w-4 h-4" /> Gráfico PERT
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-mist-800">
          <h3 className="text-[10px] font-bold text-mist-400 uppercase tracking-widest mb-4">Equipes</h3>
          <div className="space-y-2">
            {data.teams.map(team => (
              <button 
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  selectedTeamId === team.id ? "bg-mist-800 text-white" : "text-mist-300 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" /> {team.name}
                </div>
                {selectedTeamId === team.id && <div className="w-1.5 h-1.5 rounded-full bg-mist-500" />}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-zinc-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">{currentTeam?.name}</h2>
              <p className="text-xs text-zinc-500 font-medium">{currentSprint?.name} • {currentSprint && formatDateBR(currentSprint.start_date)} - {currentSprint && formatDateBR(currentSprint.end_date)}</p>
            </div>

            <div className="h-8 w-px bg-zinc-200" />

            <div className="w-64">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Capacidade da Sprint</span>
                <span className={cn(
                  "text-[10px] font-bold",
                  capacityPercentage > 90 ? "text-orange-500" : "text-mist-500"
                )}>
                  {sprintWeight} / {currentTeam?.max_weight} pts ({Math.round(capacityPercentage)}%)
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
              className="bg-mist-500 hover:bg-mist-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Processar Reunião
            </button>
            <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
              <Users className="w-5 h-5 text-zinc-400" />
            </div>
          </div>
        </header>

        {/* VIEW AREA */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === "kanban" ? (
            <div className="space-y-12">
              {data.projects.filter(p => p.team_id === selectedTeamId).map(project => (
                <div key={project.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-mist-500 rounded-full" />
                    <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{project.name}</h3>
                    <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                      {filteredTasks.filter(t => t.project_id === project.id).length} tarefas
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {["todo", "in-progress", "done"].map(status => (
                      <div key={status} className="bg-zinc-50/50 rounded-2xl p-4 border border-zinc-200/50 min-h-[200px]">
                        <div className="flex items-center justify-between mb-4 px-1">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {status === "todo" ? "A Fazer" : status === "in-progress" ? "Em Curso" : "Concluído"}
                          </h4>
                          <div className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                            {filteredTasks.filter(t => t.project_id === project.id && t.status === status).length}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {filteredTasks
                            .filter(t => t.project_id === project.id && t.status === status)
                            .map(task => (
                              <TaskCard key={task.id} task={task} onApprove={handleApprove} />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200">
                <span className="text-sm font-bold text-zinc-500">Projeto:</span>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(parseInt(e.target.value))}
                  className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-mist-500"
                >
                  {data.projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-4 ml-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Caminho Crítico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-zinc-400 rounded-full" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Fluxo Normal</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-2xl border border-zinc-200 overflow-hidden relative">
                <ReactFlow
                  nodes={flowElements.nodes}
                  edges={flowElements.edges}
                  nodeTypes={nodeTypes}
                  fitView
                >
                  <Background color="#f4f4f5" gap={20} />
                  <Controls />
                </ReactFlow>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MEETING MODAL */}
      <AnimatePresence>
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMeetingModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-zinc-900">Meeting Processor IA</h3>
                  <button onClick={() => setIsMeetingModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-widest">Transcrição da Reunião</label>
                    <textarea 
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      placeholder="Cole aqui a transcrição bruta da reunião..."
                      className="w-full h-40 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-mist-500 transition-all resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleProcessMeeting}
                    className="w-full bg-mist-900 text-white py-4 rounded-2xl font-bold hover:bg-mist-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" /> Extrair Tarefas com IA
                  </button>

                  {suggestedTasks.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tarefas Sugeridas</h4>
                      <div className="space-y-2">
                        {suggestedTasks.map((task, i) => (
                          <div key={i} className="flex items-center justify-between bg-mist-50 border border-mist-100 p-4 rounded-xl">
                            <div>
                              <p className="text-sm font-bold text-mist-900">{task.title}</p>
                              <p className="text-[10px] text-mist-500 font-medium">{task.owner_email} • {task.weight} pts</p>
                            </div>
                            <button className="bg-white text-mist-500 p-2 rounded-lg border border-mist-200 hover:bg-mist-500 hover:text-white transition-all">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
