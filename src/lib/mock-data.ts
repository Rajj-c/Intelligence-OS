export type Candidate = {
  id: string;
  name: string;
  role: string;
  location: string;
  match: number;
  confidence: number;
  potential: number;
  skills: string[];
  experienceYears: number;
  education: string;
  recommendedRole: string;
  initials: string;
  status: "shortlisted" | "screening" | "interview" | "offer";
};

export const CANDIDATES: Candidate[] = [
  { id: "c1", name: "Aarav Mehta", role: "Senior ML Engineer", location: "Bengaluru, IN", match: 96, confidence: 94, potential: 92, skills: ["PyTorch", "Transformers", "RAG", "MLOps", "Kubernetes"], experienceYears: 7, education: "MS — IIT Bombay", recommendedRole: "Staff ML Engineer", initials: "AM", status: "interview" },
  { id: "c2", name: "Sofia Bianchi", role: "Staff Data Scientist", location: "Milan, IT", match: 92, confidence: 90, potential: 88, skills: ["Causal Inference", "Python", "SQL", "Experimentation"], experienceYears: 9, education: "PhD — Politecnico di Milano", recommendedRole: "Principal DS", initials: "SB", status: "shortlisted" },
  { id: "c3", name: "Daniel Okafor", role: "Applied Researcher", location: "Lagos, NG", match: 88, confidence: 86, potential: 95, skills: ["NLP", "LLMs", "JAX", "Distillation"], experienceYears: 5, education: "MS — Carnegie Mellon", recommendedRole: "Senior Researcher", initials: "DO", status: "screening" },
  { id: "c4", name: "Yuki Tanaka", role: "MLOps Lead", location: "Tokyo, JP", match: 81, confidence: 88, potential: 79, skills: ["Kubernetes", "Terraform", "Ray", "Triton"], experienceYears: 8, education: "BS — University of Tokyo", recommendedRole: "Platform Lead", initials: "YT", status: "interview" },
  { id: "c5", name: "Priya Nair", role: "Senior Backend Engineer", location: "Austin, US", match: 78, confidence: 82, potential: 84, skills: ["Go", "Postgres", "gRPC", "Kafka"], experienceYears: 6, education: "MS — UT Austin", recommendedRole: "Senior SWE", initials: "PN", status: "screening" },
  { id: "c6", name: "Lucas Almeida", role: "ML Engineer", location: "São Paulo, BR", match: 76, confidence: 80, potential: 89, skills: ["TensorFlow", "Recommender Systems", "Spark"], experienceYears: 4, education: "BS — USP", recommendedRole: "Senior ML Engineer", initials: "LA", status: "shortlisted" },
  { id: "c7", name: "Emma Larsson", role: "Data Engineer", location: "Stockholm, SE", match: 74, confidence: 78, potential: 81, skills: ["dbt", "Airflow", "Snowflake", "Python"], experienceYears: 5, education: "MS — KTH", recommendedRole: "Senior DE", initials: "EL", status: "screening" },
  { id: "c8", name: "Mateo Rivera", role: "Research Engineer", location: "Madrid, ES", match: 71, confidence: 75, potential: 86, skills: ["Diffusion Models", "CUDA", "PyTorch"], experienceYears: 3, education: "PhD — UPM", recommendedRole: "ML Engineer II", initials: "MR", status: "shortlisted" },
];

export const JOBS = [
  { id: "j1", title: "Senior ML Engineer", team: "Applied AI", candidates: 184, matches: 12, status: "Open" },
  { id: "j2", title: "Staff Data Scientist", team: "Growth", candidates: 96, matches: 8, status: "Open" },
  { id: "j3", title: "Applied Researcher — NLP", team: "Research", candidates: 142, matches: 15, status: "Open" },
  { id: "j4", title: "MLOps Lead", team: "Platform", candidates: 58, matches: 5, status: "Interviewing" },
  { id: "j5", title: "Backend Engineer (Go)", team: "Infra", candidates: 211, matches: 22, status: "Open" },
];

export const PIPELINE_DATA = [
  { stage: "Sourced", value: 2840 },
  { stage: "Screened", value: 1120 },
  { stage: "Shortlisted", value: 384 },
  { stage: "Interview", value: 142 },
  { stage: "Offer", value: 38 },
  { stage: "Hired", value: 24 },
];

export const HIRING_TREND = [
  { month: "Jan", hires: 12, applications: 1840 },
  { month: "Feb", hires: 18, applications: 2120 },
  { month: "Mar", hires: 22, applications: 2480 },
  { month: "Apr", hires: 19, applications: 2210 },
  { month: "May", hires: 28, applications: 2890 },
  { month: "Jun", hires: 34, applications: 3140 },
  { month: "Jul", hires: 31, applications: 2980 },
  { month: "Aug", hires: 38, applications: 3320 },
];

export const SKILL_RADAR = [
  { skill: "Technical", candidate: 92, role: 85 },
  { skill: "Domain", candidate: 88, role: 80 },
  { skill: "Leadership", candidate: 74, role: 70 },
  { skill: "Communication", candidate: 82, role: 75 },
  { skill: "Systems Design", candidate: 90, role: 88 },
  { skill: "Research", candidate: 86, role: 65 },
];
