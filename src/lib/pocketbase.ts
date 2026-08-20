import PocketBase from 'pocketbase';
import type { User, Club, ClubMembership, Expense, DirectorReport, CadetRosterItem, PendingExemption, DesligadoItem } from '../types';
import { queryCache } from './queryCache';
import { INITIAL_CLUBS } from './mockData';

export const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://cedula-scaer.pockethost.io';
export const pb = new PocketBase(POCKETBASE_URL);

// Desativar auto-cancelamento do PocketBase para evitar erros de AbortError em requisições paralelas
pb.autoCancellation(false);

// Armazenamento da chave do usuário ativo local
const CURRENT_USER_ID_KEY = 'cedula_digital_current_user_id';

export class DatabaseService {
  private static isPocketBaseConnected = false;

  // Testar Conectividade com o PocketBase Remoto
  static async checkConnection(): Promise<boolean> {
    try {
      const health = await pb.health.check();
      this.isPocketBaseConnected = health.code === 200;
      return this.isPocketBaseConnected;
    } catch {
      this.isPocketBaseConnected = false;
      return false;
    }
  }

  // Obter Lista Real de Usuários do PocketBase
  static async getUsers(): Promise<User[]> {
    const cacheKey = 'pb_users_list';
    const cached = queryCache.get<User[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const records = await pb.collection('users').getFullList<User>({ sort: 'warName' });
      if (records && records.length > 0) {
        queryCache.set(cacheKey, records);
        return records;
      }
    } catch (err) {
      console.error('Erro ao buscar usuários no PocketBase:', err);
    }
    return [];
  }

  // Obter Usuário Atual Selecionado
  static async getCurrentUser(): Promise<User | null> {
    const users = await this.getUsers();
    if (users.length === 0) return null;

    const savedId = localStorage.getItem(CURRENT_USER_ID_KEY);
    const found = users.find(u => u.id === savedId || u.cadetNumber === '23/001' || u.role === 'diretor');
    return found || users[0];
  }

  static setCurrentUserId(userId: string) {
    localStorage.setItem(CURRENT_USER_ID_KEY, userId);
  }

  // Obter Lista de Clubes da SCAER (incluindo Lavanderia e Entidades Religiosas)
  static async getClubs(): Promise<Club[]> {
    const cacheKey = 'pb_clubs_list';
    const cached = queryCache.get<Club[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const records = await pb.collection('clubs').getFullList<Club>({ sort: 'name' });
      if (records && records.length > 0) {
        // Garantir que Lavanderia e Entidades Religiosas existam na lista
        const merged = [...records];
        INITIAL_CLUBS.forEach(initClub => {
          if (!merged.some(c => c.name.toUpperCase().trim() === initClub.name.toUpperCase().trim() || c.id === initClub.id)) {
            merged.push(initClub);
          }
        });
        queryCache.set(cacheKey, merged);
        return merged;
      }
    } catch (err) {
      console.error('Erro ao buscar clubes no PocketBase (usando lista base):', err);
    }
    return INITIAL_CLUBS;
  }

  // Obter Adesões aos Clubes
  static async getMemberships(): Promise<ClubMembership[]> {
    const cacheKey = 'pb_memberships_list';
    const cached = queryCache.get<ClubMembership[]>(cacheKey);
    if (cached) return cached;

    try {
      const records = await pb.collection('club_memberships').getFullList<ClubMembership>();
      queryCache.set(cacheKey, records || []);
      return records || [];
    } catch (err) {
      console.error('Erro ao buscar adesões aos clubes:', err);
    }
    return [];
  }

  // Solicitar Adesão/Saída de Clube no PocketBase
  static async requestClubMembership(userId: string, clubId: string, action: 'join' | 'leave', notes?: string): Promise<ClubMembership> {
    const users = await this.getUsers();
    const clubs = await this.getClubs();
    const user = users.find(u => u.id === userId);
    const club = clubs.find(c => c.id === clubId);

    if (!user || !club) throw new Error('Usuário ou Clube não encontrado no PocketBase');

    const memberships = await this.getMemberships();
    const existing = memberships.find(m => m.userId === userId && m.clubId === clubId);
    const newStatus = action === 'join' ? 'pending_entry' : 'pending_exit';
    const now = new Date().toISOString().split('T')[0];

    let result: ClubMembership;

    if (existing) {
      result = await pb.collection('club_memberships').update<ClubMembership>(existing.id, {
        status: newStatus,
        requestedAt: now,
        notes: notes || existing.notes,
      });
    } else {
      result = await pb.collection('club_memberships').create<ClubMembership>({
        userId: user.id,
        userName: user.warName,
        cadetNumber: user.cadetNumber,
        squadron: user.squadron,
        clubId: club.id,
        clubName: club.name,
        status: newStatus,
        requestedAt: now,
        notes,
      });
    }

    queryCache.clear();
    return result;
  }

  // Atualizar Status de Adesão (Gestor SCAER)
  static async updateMembershipStatus(membershipId: string, status: 'approved' | 'rejected' | 'inactive'): Promise<void> {
    const now = new Date().toISOString().split('T')[0];
    await pb.collection('club_memberships').update(membershipId, {
      status,
      approvedAt: status === 'approved' ? now : undefined,
    });
    queryCache.clear();
  }

  // Obter Gastos/Lançamentos do PocketBase
  static async getExpenses(): Promise<Expense[]> {
    const cacheKey = 'pb_expenses_list';
    const cached = queryCache.get<Expense[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const records = await pb.collection('expenses').getFullList<Expense>({ sort: '-id' });
      queryCache.set(cacheKey, records || []);
      return records || [];
    } catch (err) {
      console.error('Erro ao buscar lançamentos no PocketBase:', err);
    }
    return [];
  }

  // Criar Novos Lançamentos no PocketBase
  static async createExpenses(newExpenses: Omit<Expense, 'id' | 'createdAt' | 'status'>[]): Promise<Expense[]> {
    const createdList: Expense[] = [];
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    for (const item of newExpenses) {
      try {
        const res = await pb.collection('expenses').create<Expense>({
          ...item,
          createdAt: now,
          status: 'pending',
        });
        createdList.push(res);
      } catch (err) {
        console.error('Erro ao salvar gasto no PocketBase:', err);
      }
    }

    queryCache.clear();
    return createdList;
  }

  // Processar Mensalidades Recorrentes
  static async triggerRecurringMonthlyFees(clubId: string, billingPeriod: string, managerUser: User): Promise<number> {
    const memberships = await this.getMemberships();
    const clubs = await this.getClubs();
    const club = clubs.find(c => c.id === clubId);

    if (!club) throw new Error('Clube não encontrado no PocketBase');

    const activeMembers = memberships.filter(m => m.clubId === clubId && m.status === 'approved');
    const existingExpenses = await this.getExpenses();
    const newLaunches: Omit<Expense, 'id' | 'createdAt' | 'status'>[] = [];

    for (const member of activeMembers) {
      const alreadyBilled = existingExpenses.some(
        e => e.userId === member.userId && e.clubId === clubId && e.billingPeriod === billingPeriod && e.category === 'Mensalidade'
      );

      if (!alreadyBilled) {
        newLaunches.push({
          userId: member.userId,
          userName: member.userName,
          cadetNumber: member.cadetNumber,
          clubId: club.id,
          clubName: club.name,
          description: `Mensalidade ${billingPeriod} - ${club.code || club.name}`,
          amount: club.monthlyFee,
          category: 'Mensalidade',
          billingPeriod,
          launchType: 'recurring',
          createdBy: managerUser.id,
          createdByName: managerUser.warName,
        });
      }
    }

    if (newLaunches.length > 0) {
      await this.createExpenses(newLaunches);
    }

    return newLaunches.length;
  }

  // Obter Relatórios Emitidos no PocketBase
  static async getDirectorReports(): Promise<DirectorReport[]> {
    try {
      const records = await pb.collection('director_reports').getFullList<DirectorReport>({ sort: '-id' });
      return records || [];
    } catch {
      return [];
    }
  }

  // Salvar Relatório Emitido
  static async saveDirectorReport(report: Omit<DirectorReport, 'id'>): Promise<DirectorReport> {
    const res = await pb.collection('director_reports').create<DirectorReport>(report);
    return res;
  }

  // Importação em Lote Direta para o PocketBase
  static async importBulkDataFromExcel(
    _newRoster: CadetRosterItem[],
    newExpenses: Omit<Expense, 'id' | 'createdAt' | 'status'>[],
    _newExemptions: PendingExemption[],
    _newDesligados: DesligadoItem[],
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    if (onProgress) onProgress(10, 'Iniciando importação para o PocketBase remoto...');

    if (newExpenses.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < newExpenses.length; i += chunkSize) {
        const chunk = newExpenses.slice(i, i + chunkSize);
        await Promise.all(chunk.map(item => pb.collection('expenses').create(item).catch(() => null)));
        const pct = 10 + Math.floor(((i + chunk.length) / newExpenses.length) * 85);
        if (onProgress) onProgress(pct, `Enviados ${i + chunk.length} de ${newExpenses.length} lançamentos...`);
      }
    }

    if (onProgress) onProgress(100, 'Importação para o PocketBase concluída!');
    queryCache.clear();
  }

  // Definir Doação Recorrente de Culto Religioso / Ação Social
  static async setCadetReligiousDonation(
    userId: string,
    clubId: string,
    clubName: string,
    amount: number,
    billingPeriod: string = '2026-08'
  ): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado');

    const now = new Date().toISOString().split('T')[0];
    const memberships = await this.getMemberships();
    const existingMem = memberships.find(m => m.userId === userId && (m.clubId === clubId || (m.clubName && m.clubName.toLowerCase() === clubName.toLowerCase())));

    if (existingMem) {
      await pb.collection('club_memberships').update(existingMem.id, {
        status: 'approved',
        approvedAt: now,
        notes: `Doação Mensal: R$ ${amount.toFixed(2)}`,
      }).catch(() => null);
    } else {
      await pb.collection('club_memberships').create({
        userId: user.id,
        userName: user.warName || user.name,
        cadetNumber: user.cadetNumber,
        squadron: user.squadron || '1º Esquadrão',
        clubId,
        clubName,
        status: 'approved',
        requestedAt: now,
        approvedAt: now,
        notes: `Doação Mensal: R$ ${amount.toFixed(2)}`,
      }).catch(() => null);
    }

    // Atualizar ou criar o lançamento da doação no período
    const expenses = await this.getExpenses();
    const existingExp = expenses.find(
      e => (e.userId === userId || e.cadetNumber === user.cadetNumber) &&
           e.billingPeriod === billingPeriod &&
           (e.clubId === clubId || (e.description && e.description.toLowerCase().includes(clubName.toLowerCase())))
    );

    if (existingExp) {
      await pb.collection('expenses').update(existingExp.id, {
        amount,
        description: `Doação Mensal - ${clubName}`,
        category: 'Mensalidade',
      }).catch(() => null);
    } else {
      await pb.collection('expenses').create({
        userId: user.id,
        userName: user.warName || user.name,
        cadetNumber: user.cadetNumber,
        clubId,
        clubName,
        description: `Doação Mensal - ${clubName}`,
        amount,
        category: 'Mensalidade',
        billingPeriod,
        launchType: 'recurring',
        createdBy: user.id,
        createdByName: user.warName || user.name,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'pending',
      }).catch(() => null);
    }

    queryCache.clear();
  }

  // Cancelar Doação de Culto
  static async cancelCadetReligiousDonation(
    userId: string,
    clubId: string,
    billingPeriod: string = '2026-08'
  ): Promise<void> {
    const memberships = await this.getMemberships();
    const existingMem = memberships.find(m => m.userId === userId && m.clubId === clubId);
    if (existingMem) {
      await pb.collection('club_memberships').update(existingMem.id, {
        status: 'inactive',
      }).catch(() => null);
    }

    const expenses = await this.getExpenses();
    const existingExp = expenses.find(
      e => (e.userId === userId || e.cadetNumber) && e.billingPeriod === billingPeriod && e.clubId === clubId
    );
    if (existingExp) {
      await pb.collection('expenses').delete(existingExp.id).catch(() => null);
    }

    queryCache.clear();
  }
}
