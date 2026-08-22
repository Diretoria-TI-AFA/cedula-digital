export type UserRole = 'cadete' | 'scaer' | 'diretor' | 'presidente';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  warName: string;
  cadetNumber: string;
  squadron: string;
  role: UserRole;
  clubId?: string;
  avatar?: string;
  cpf?: string;
  phone?: string;
  email1?: string;
  email2?: string;
}

export interface Cadet {
  id: string;
  userId: string;
  cadetNumber: string;
  warName: string;
  fullName: string;
  squadron: string;
  cpf?: string;
  email?: string;
  phone?: string;
  clubs?: string[];
  religiousDonations?: Record<string, number>;
  status?: string; // 'ativo', 'desligado', 'afastado'
}

export interface Club {
  id: string;
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  monthlyFee: number;
  category?: string;
  status?: string;
  managerId?: string;
  managerName?: string;
  memberCount?: number;
}

export type MembershipStatus =
  | 'active'
  | 'approved'
  | 'pending_entry'
  | 'pending_exit'
  | 'exited'
  | 'rejected'
  | 'inactive';

export interface ClubMembership {
  id: string;
  userId: string;
  userName: string;
  cadetNumber: string;
  squadron: string;
  clubId: string;
  clubName: string;
  status: MembershipStatus;
  requestedAt?: string;
  approvedAt?: string;
  notes?: string;
  effectiveFrom?: string; // Período em que a mudança terá efeito (regra do dia 20)
}

export type TransactionCategory =
  | 'mensalidade_scaer'
  | 'mensalidade_clube'
  | 'Mensalidade'
  | 'evento'
  | 'Evento'
  | 'consumo'
  | 'Consumo'
  | 'equipamento'
  | 'Equipamento'
  | 'taxa'
  | 'Taxa Avulsa'
  | 'doacao_religiosa'
  | 'parcelamento';

export type TransactionType =
  | 'automatic'
  | 'manual'
  | 'bulk'
  | 'installment'
  | 'deferred'
  | 'recurring'
  | 'individual'
  | 'event_non_member'
  | 'csv';

export type TransactionStatus = 'pending' | 'paid' | 'cancelled' | 'deferred';

export interface InstallmentInfo {
  total: number;
  current: number;
  originalTransactionId: string;
}

export interface Transaction {
  id: string;
  cadetId?: string;
  userId?: string;
  cadetNumber: string;
  cadetName?: string;
  userName?: string;
  clubId: string;
  clubName: string;
  description: string;
  amount: number;
  originalAmount?: number;
  category: TransactionCategory;
  billingPeriod: string; // ex: '2026-08'
  originalPeriod?: string;
  type?: TransactionType;
  launchType?: TransactionType;
  status?: TransactionStatus;
  installmentInfo?: InstallmentInfo;
  deferredTo?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  notes?: string;
  isNonMemberEvent?: boolean;
  created?: string; // autodate do PocketBase
  updated?: string; // autodate do PocketBase
}

// Alias para compatibilidade
export type Expense = Transaction;
export type LaunchType = TransactionType;

export interface ClubBreakdownItem {
  clubId: string;
  clubName: string;
  amount: number;
  transactionsCount: number;
}

export interface CadetBreakdownItem {
  cadetId: string;
  cadetNumber: string;
  cadetName: string;
  amount: number;
}

export interface MonthlySummary {
  id: string;
  billingPeriod: string;
  totalGeneral: number;
  totalCadets: number;
  totalTransactions: number;
  clubBreakdown: ClubBreakdownItem[];
  cadetBreakdown?: CadetBreakdownItem[];
  scaerFeeTotal?: number;
  status: 'open' | 'closed' | 'finalized';
  created?: string;
  updated?: string;
}

export interface ScaerConfig {
  id: string;
  scaerMonthlyFee: number;
  currentBillingPeriod: string;
  dueDay: number;
  clubChangeDeadlineDay: number;
  activeCategories?: Record<string, boolean>;
  lastCronRun?: string;
  updatedBy?: string;
}

export interface DirectorReport {
  id: string;
  title: string;
  period: string;
  reportType: 'synthetic' | 'detailed';
  totalAmount: number;
  totalLaunches: number;
  totalCadets: number;
  verificationHash: string;
  issuedAt: string;
  issuedBy: string;
  directorName: string;
  pdfUrl?: string;
}

// Interfaces auxiliares da Planilha CédulAthos 2k26
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
