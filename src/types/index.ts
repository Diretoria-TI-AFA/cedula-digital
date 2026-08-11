export type UserRole = 'cadete' | 'scaer' | 'diretor' | 'presidente';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  warName: string; // Nome de Guerra (ex: FERNANDO)
  cadetNumber: string; // Nº de Ordem (ex: 23/001)
  squadron: string; // Esquadrão (ex: Athos)
  role: UserRole;
  clubId?: string; // ID do clube administrado se for gestor SCAER / Presidente
  avatar?: string;
  cpf: string;
  phone?: string;
  email1?: string;
  email2?: string;
}

export interface Club {
  id: string;
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  monthlyFee: number;
  category?: string;
  status?: 'active' | 'inactive';
  managerId?: string;
  managerName?: string;
  memberCount?: number;
  bannerGradient?: string;
}

export type MembershipStatus = 'approved' | 'pending_entry' | 'pending_exit' | 'rejected' | 'inactive';

export interface ClubMembership {
  id: string;
  userId: string;
  userName: string;
  cadetNumber: string;
  squadron: string;
  clubId: string;
  clubName?: string;
  status: MembershipStatus;
  requestedAt: string;
  approvedAt?: string;
  notes?: string;
}

export type LaunchType = 'recurring' | 'individual' | 'bulk' | 'event_non_member' | 'csv';

export interface Expense {
  id: string;
  userId: string;
  userName: string;
  cadetNumber: string;
  clubId: string;
  clubName: string;
  description: string;
  amount: number;
  category: 'Mensalidade' | 'Consumo' | 'Evento' | 'Equipamento' | 'Taxa Avulsa';
  billingPeriod: string; // ex: '2026-07'
  launchType: LaunchType;
  createdBy: string; // ID do gestor
  createdByName: string;
  createdAt?: string;
  status?: 'pending' | 'paid' | 'cancelled';
  isNonMemberEvent?: boolean;
}

export interface DirectorReport {
  id: string;
  title: string;
  period: string;
  reportType: 'synthetic' | 'detailed'; // Sintético (Soma por Cadete) ou Detalhado
  totalAmount: number;
  totalLaunches: number;
  totalCadets: number;
  verificationHash: string;
  issuedAt: string;
  issuedBy: string;
  directorName: string;
  pdfUrl?: string;
}

// Interfaces da Planilha CédulAthos 2k26
export interface CadetRosterItem {
  id: string;
  number: string;
  warName: string;
  fullName: string;
  squadron: string;
  cpf: string;
  phone: string;
  email: string;
}

export interface PendingExemption {
  id: string;
  cadetName: string;
  cadetNumber?: string;
  description: string;
  period: string;
  status: 'active' | 'resolved';
}

export interface ClubPayoutSummary {
  clubName: string;
  totalAmount: number;
  launchCount: number;
  period: string;
}

export interface DesligadoItem {
  id: string;
  period: string;
  cadetNumber: string;
  warName: string;
  amount: number;
  clubName: string;
  description: string;
}
