export interface Team {
  id: number;
  name: string;
  max_weight: number;
}

export interface Project {
  id: number;
  name: string;
  team_id: number;
}

export interface Sprint {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  team_id: number;
}

export interface Task {
  id: number;
  title: string;
  project_id: number;
  sprint_id: number;
  weight: number;
  status: "todo" | "in-progress" | "done";
  is_approved: boolean;
  criticality: "Baixa" | "Média" | "Alta" | "Crítica";
  owner_email: string;
  source_system: "GLPI" | "Sales" | "DFlix" | "Meeting" | "Manual" | "GitHub";
}

export interface Dependency {
  from_id: number;
  to_id: number;
}

export interface CPMNode {
  id: number;
  title: string;
  duration: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
}
