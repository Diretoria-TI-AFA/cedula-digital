import PocketBase from 'pocketbase';
import type {
  User,
  Club,
  ClubMembership,
  Transaction,
  DirectorReport,
  MonthlySummary,
  ScaerConfig,
  Cadet,
  InstallmentInfo,
  TransactionType,
  TransactionStatus,
  CadetRosterItem,
  PendingExemption,
  DesligadoItem,
} from '../types';
import { queryCache } from './queryCache';

export const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://cedula-scaer.pockethost.io';
export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

const getPeriodStr = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

const getNextPeriod = (currentPeriod: string): string => {
  const [year, month] = currentPeriod.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  d.setMonth(d.getMonth() + 1);
  return getPeriodStr(d);
};

const addMonths = (period: string, monthsToAdd: number): string => {
  const [year, month] = period.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  d.setMonth(d.getMonth() + monthsToAdd);
  return getPeriodStr(d);
};

class DatabaseServiceClass {
  // Connection & Auth
  async checkConnection(): Promise<boolean> {
    try {
      const health = await pb.health.check();
      return health.code === 200;
    } catch (error) {
      console.error('Falha na conexão com o PocketBase:', error);
      return false;
    }
  }

  async getUsers(): Promise<User[]> {
    return queryCache.fetch('users', async () => {
      try {
        const records = await pb.collection('users').getFullList({ sort: 'warName' });
        return records as unknown as User[];
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return [];
      }
    });
  }

  getCurrentUser(): User | null {
    return (pb.authStore.record as unknown as User) || null;
  }

  // Cadets
  async getCadets(): Promise<Cadet[]> {
    return queryCache.fetch('cadets', async () => {
      try {
        const records = await pb.collection('cadets').getFullList({ sort: 'cadetNumber' });
        return records as unknown as Cadet[];
      } catch (error) {
        console.error('Erro ao buscar cadetes:', error);
        return [];
      }
    });
  }

  async getCadetByUserId(userId: string): Promise<Cadet | null> {
    try {
      const record = await pb.collection('cadets').getFirstListItem(`userId="${userId}"`);
      return record as unknown as Cadet;
    } catch {
      return null;
    }
  }

  async updateCadetClubs(cadetId: string, clubs: string[]): Promise<Cadet | null> {
    try {
      const record = await pb.collection('cadets').update(cadetId, { clubs });
      queryCache.clear('cadets');
      return record as unknown as Cadet;
    } catch (error) {
      console.error('Erro ao atualizar clubes do cadete:', error);
      return null;
    }
  }

  // Clubs
  async getClubs(): Promise<Club[]> {
    return queryCache.fetch('clubs', async () => {
      try {
        const records = await pb.collection('clubs').getFullList({ sort: 'name' });
        return records as unknown as Club[];
      } catch (error) {
        console.error('Erro ao buscar clubes:', error);
        return [];
      }
    });
  }

  async updateClub(clubId: string, data: Partial<Club>): Promise<Club | null> {
    try {
      const record = await pb.collection('clubs').update(clubId, data);
      queryCache.clear('clubs');
      return record as unknown as Club;
    } catch (error) {
      console.error('Erro ao atualizar clube:', error);
      return null;
    }
  }

  // Memberships
  async getMemberships(): Promise<ClubMembership[]> {
    return queryCache.fetch('club_memberships', async () => {
      try {
        const records = await pb.collection('club_memberships').getFullList({ sort: '-created' });
        return records as unknown as ClubMembership[];
      } catch (error) {
        console.error('Erro ao buscar associações:', error);
        return [];
      }
    });
  }

  async requestClubMembership(
    userId: string,
    clubId: string,
    action: 'join' | 'leave',
    notes?: string
  ): Promise<ClubMembership | null> {
    try {
      const today = new Date();
      const currentPeriod = getPeriodStr(today);
      const effectiveFrom = today.getDate() <= 20 ? currentPeriod : getNextPeriod(currentPeriod);

      const status = action === 'join' ? 'pending_entry' : 'pending_exit';

      // Buscar info do usuário e clube para salvar desnormalizado
      const users = await this.getUsers();
      const clubs = await this.getClubs();
      const user = users.find((u) => u.id === userId);
      const club = clubs.find((c) => c.id === clubId);

      const existingMemberships = await this.getMemberships();
      const existing = existingMemberships.find((m) => m.userId === userId && m.clubId === clubId);

      let record;
      if (existing) {
        record = await pb.collection('club_memberships').update(existing.id, {
          status,
          requestedAt: new Date().toISOString(),
          notes: notes || existing.notes,
          effectiveFrom,
        });
      } else {
        const data = {
          userId,
          userName: user?.warName || user?.name || '',
          cadetNumber: user?.cadetNumber || '',
          squadron: user?.squadron || '',
          clubId,
          clubName: club?.name || '',
          status,
          requestedAt: new Date().toISOString(),
          notes,
          effectiveFrom,
        };
        record = await pb.collection('club_memberships').create(data);
      }

      queryCache.clear('club_memberships');
      return record as unknown as ClubMembership;
    } catch (error) {
      console.error('Erro ao solicitar associação:', error);
      return null;
    }
  }

  async updateMembershipStatus(
    membershipId: string,
    status: 'approved' | 'rejected' | 'inactive' | 'active'
  ): Promise<ClubMembership | null> {
    try {
      const now = new Date().toISOString().split('T')[0];
      const data = {
        status,
        approvedAt: status === 'approved' || status === 'active' ? now : null,
      };
      const record = await pb.collection('club_memberships').update(membershipId, data);
      queryCache.clear('club_memberships');
      return record as unknown as ClubMembership;
    } catch (error) {
      console.error('Erro ao atualizar status da associação:', error);
      return null;
    }
  }

  // Transactions
  async getTransactions(period?: string): Promise<Transaction[]> {
    if (period) {
      return this.getTransactionsByPeriod(period);
    }
    return queryCache.fetch('transactions_current', async () => {
      try {
        const records = await pb.collection('transactions').getList(1, 500, { sort: '-created' });
        return records.items as unknown as Transaction[];
      } catch (err) {
        console.error('Erro ao buscar transações:', err);
        return [];
      }
    });
  }

  // Alias para compatibilidade com componentes existentes
  async getExpenses(): Promise<Transaction[]> {
    return this.getTransactions();
  }

  async getTransactionsForCadet(user: User): Promise<Transaction[]> {
    const num = user.cadetNumber || '';
    const cleanNum = num.replace(/\D/g, '');
    const formattedNum = cleanNum.length === 5 ? `${cleanNum.slice(0, 2)}/${cleanNum.slice(2)}` : num;

    const filterParts: string[] = [];
    if (user.id) {
      filterParts.push(`userId="${user.id}"`);
      filterParts.push(`cadetId="${user.id}"`);
    }
    if (num) filterParts.push(`cadetNumber="${num}"`);
    if (cleanNum) filterParts.push(`cadetNumber="${cleanNum}"`);
    if (formattedNum) filterParts.push(`cadetNumber="${formattedNum}"`);

    const filter = filterParts.join(' || ');
    return queryCache.fetch(`transactions_cadet_${user.id}`, async () => {
      try {
        const records = await pb.collection('transactions').getFullList({
          filter,
          sort: '-billingPeriod',
        });
        return records as unknown as Transaction[];
      } catch (err) {
        console.error('Erro ao buscar transações do cadete:', err);
        return [];
      }
    });
  }

  async getTransactionsByPeriod(period: string): Promise<Transaction[]> {
    return queryCache.fetch(`transactions_${period}`, async () => {
      try {
        const records = await pb.collection('transactions').getFullList({
          batch: 500,
          filter: `billingPeriod="${period}"`,
        });
        return records as unknown as Transaction[];
      } catch (err) {
        console.error(`Erro ao buscar transações do período ${period}:`, err);
        return [];
      }
    });
  }

  async getTransactionsByCadet(cadetId: string, period?: string): Promise<Transaction[]> {
    try {
      let filter = `(cadetId="${cadetId}" || userId="${cadetId}")`;
      if (period) {
        filter += ` && billingPeriod="${period}"`;
      }
      const records = await pb.collection('transactions').getFullList({
        filter,
        sort: '-created',
      });
      return records as unknown as Transaction[];
    } catch {
      const all = await this.getTransactions();
      return all.filter(
        (t) => (t.cadetId === cadetId || t.userId === cadetId) && (!period || t.billingPeriod === period)
      );
    }
  }

  async createTransaction(data: Partial<Transaction>): Promise<Transaction | null> {
    try {
      const record = await pb.collection('transactions').create(data);
      queryCache.clear('transactions');
      if (data.billingPeriod) queryCache.clear(`transactions_${data.billingPeriod}`);
      return record as unknown as Transaction;
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      return null;
    }
  }

  async createTransactions(dataList: Partial<Transaction>[]): Promise<Transaction[]> {
    const results: Transaction[] = [];
    try {
      for (const data of dataList) {
        const record = await pb.collection('transactions').create(data);
        results.push(record as unknown as Transaction);
      }
      queryCache.clear('transactions');
      return results;
    } catch (error) {
      console.error('Erro ao criar múltiplas transações:', error);
      return results;
    }
  }

  // Alias para compatibilidade
  async createExpenses(dataList: Partial<Transaction>[]): Promise<Transaction[]> {
    return this.createTransactions(dataList);
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | null> {
    try {
      const record = await pb.collection('transactions').update(id, data);
      queryCache.clear('transactions');
      if (data.billingPeriod) queryCache.clear(`transactions_${data.billingPeriod}`);
      return record as unknown as Transaction;
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      return null;
    }
  }

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      await pb.collection('transactions').delete(id);
      queryCache.clear('transactions');
      return true;
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      return false;
    }
  }

  async installTransaction(id: string, numInstallments: number, startPeriod: string): Promise<boolean> {
    try {
      const original = (await pb.collection('transactions').getOne(id)) as unknown as Transaction;
      await pb.collection('transactions').update(id, { status: 'cancelled', notes: `Parcelado em ${numInstallments}x` });

      const amountPerInst = Math.floor((original.amount / numInstallments) * 100) / 100;
      const remainder = original.amount - amountPerInst * numInstallments;

      const newTxs: Partial<Transaction>[] = [];
      for (let i = 0; i < numInstallments; i++) {
        const currentAmount = i === 0 ? amountPerInst + remainder : amountPerInst;
        const currentPeriod = addMonths(startPeriod, i);

        const installmentInfo: InstallmentInfo = {
          current: i + 1,
          total: numInstallments,
          originalTransactionId: id,
        };

        const txData: Partial<Transaction> = {
          ...original,
          id: undefined,
          amount: currentAmount,
          description: `${original.description} (${i + 1}/${numInstallments})`,
          billingPeriod: currentPeriod,
          originalAmount: original.amount,
          type: 'installment' as TransactionType,
          status: 'pending' as TransactionStatus,
          installmentInfo,
        };
        newTxs.push(txData);
      }

      await this.createTransactions(newTxs);
      return true;
    } catch (error) {
      console.error('Erro ao parcelar transação:', error);
      return false;
    }
  }

  async deferTransaction(id: string, targetPeriod: string): Promise<boolean> {
    try {
      const original = (await pb.collection('transactions').getOne(id)) as unknown as Transaction;
      await pb.collection('transactions').update(id, {
        status: 'deferred',
        deferredTo: targetPeriod,
      });

      const txData: Partial<Transaction> = {
        ...original,
        id: undefined,
        billingPeriod: targetPeriod,
        originalPeriod: original.billingPeriod,
        type: 'deferred' as TransactionType,
        status: 'pending' as TransactionStatus,
        notes: `Adiado do período ${original.billingPeriod}`,
      };

      await this.createTransaction(txData);
      return true;
    } catch (error) {
      console.error('Erro ao adiar transação:', error);
      return false;
    }
  }

  async deferAllCadetTransactions(cadetId: string, sourcePeriod: string, targetPeriod: string): Promise<boolean> {
    try {
      const txs = await this.getTransactionsByCadet(cadetId, sourcePeriod);
      const pendingTxs = txs.filter((t) => t.status === 'pending' || !t.status);

      for (const tx of pendingTxs) {
        await this.deferTransaction(tx.id, targetPeriod);
      }
      return true;
    } catch (error) {
      console.error('Erro ao adiar todas transações:', error);
      return false;
    }
  }

  async installAllCadetTransactions(
    cadetId: string,
    period: string,
    numInstallments: number
  ): Promise<boolean> {
    try {
      const txs = await this.getTransactionsByCadet(cadetId, period);
      const pendingTxs = txs.filter((t) => t.status === 'pending' || !t.status);

      for (const tx of pendingTxs) {
        await this.installTransaction(tx.id, numInstallments, period);
      }
      return true;
    } catch (error) {
      console.error('Erro ao parcelar todas transações:', error);
      return false;
    }
  }

  // Monthly Summaries
  async getMonthlySummaries(): Promise<MonthlySummary[]> {
    return queryCache.fetch('monthly_summaries', async () => {
      try {
        const records = await pb.collection('monthly_summaries').getFullList({ sort: '-billingPeriod' });
        return records as unknown as MonthlySummary[];
      } catch (error) {
        console.error('Erro ao buscar resumos:', error);
        return [];
      }
    });
  }

  async generateMonthlySummary(period: string): Promise<MonthlySummary | null> {
    try {
      const txs = await this.getTransactionsByPeriod(period);

      let totalGeneral = 0;
      let scaerFeeTotal = 0;
      const clubMap: Record<string, { clubId: string; clubName: string; amount: number; transactionsCount: number }> = {};
      const cadetMap: Record<string, { cadetId: string; cadetNumber: string; cadetName: string; amount: number }> = {};

      for (const tx of txs) {
        if (tx.status !== 'cancelled' && tx.status !== 'deferred') {
          totalGeneral += tx.amount;
          if (tx.category === 'mensalidade_scaer' || tx.description.includes('SCAER')) {
            scaerFeeTotal += tx.amount;
          }

          if (tx.clubId) {
            if (!clubMap[tx.clubId]) {
              clubMap[tx.clubId] = {
                clubId: tx.clubId,
                clubName: tx.clubName || tx.clubId,
                amount: 0,
                transactionsCount: 0,
              };
            }
            clubMap[tx.clubId].amount += tx.amount;
            clubMap[tx.clubId].transactionsCount += 1;
          }

          const cId = tx.cadetId || tx.userId || tx.cadetNumber;
          if (cId) {
            if (!cadetMap[cId]) {
              cadetMap[cId] = {
                cadetId: cId,
                cadetNumber: tx.cadetNumber,
                cadetName: tx.cadetName || tx.userName || '',
                amount: 0,
              };
            }
            cadetMap[cId].amount += tx.amount;
          }
        }
      }

      const clubBreakdown = Object.values(clubMap);
      const cadetBreakdown = Object.values(cadetMap);
      const totalCadets = cadetBreakdown.length;

      const existing = await pb
        .collection('monthly_summaries')
        .getFirstListItem(`billingPeriod="${period}"`)
        .catch(() => null);

      const data = {
        billingPeriod: period,
        totalGeneral,
        totalCadets,
        totalTransactions: txs.length,
        clubBreakdown,
        cadetBreakdown,
        scaerFeeTotal,
        status: 'open' as const,
      };

      let record;
      if (existing) {
        record = await pb.collection('monthly_summaries').update(existing.id, data);
      } else {
        record = await pb.collection('monthly_summaries').create(data);
      }

      queryCache.clear('monthly_summaries');
      return record as unknown as MonthlySummary;
    } catch (error) {
      console.error('Erro ao gerar resumo mensal:', error);
      return null;
    }
  }

  // SCAER Config
  async getScaerConfig(): Promise<ScaerConfig | null> {
    return queryCache.fetch('scaer_config', async () => {
      try {
        const records = await pb.collection('scaer_config').getFullList();
        if (records.length > 0) {
          return records[0] as unknown as ScaerConfig;
        }
        return {
          id: 'default_config',
          scaerMonthlyFee: 100,
          currentBillingPeriod: '2026-08',
          dueDay: 10,
          clubChangeDeadlineDay: 20,
        };
      } catch {
        return {
          id: 'default_config',
          scaerMonthlyFee: 100,
          currentBillingPeriod: '2026-08',
          dueDay: 10,
          clubChangeDeadlineDay: 20,
        };
      }
    });
  }

  async updateScaerConfig(data: Partial<ScaerConfig>): Promise<ScaerConfig | null> {
    try {
      const records = await pb.collection('scaer_config').getFullList().catch(() => []);
      let record;
      if (records.length > 0) {
        record = await pb.collection('scaer_config').update(records[0].id, data);
      } else {
        record = await pb.collection('scaer_config').create({
          scaerMonthlyFee: 100,
          currentBillingPeriod: '2026-08',
          dueDay: 10,
          clubChangeDeadlineDay: 20,
          ...data,
        });
      }
      queryCache.clear('scaer_config');
      return record as unknown as ScaerConfig;
    } catch (error) {
      console.error('Erro ao atualizar config:', error);
      return null;
    }
  }

  // Director Reports
  async getDirectorReports(): Promise<DirectorReport[]> {
    return queryCache.fetch('director_reports', async () => {
      try {
        const records = await pb.collection('director_reports').getFullList<DirectorReport>({ sort: '-created' });
        return records || [];
      } catch (error) {
        console.error('Erro ao buscar relatórios:', error);
        return [];
      }
    });
  }

  async saveDirectorReport(report: Partial<DirectorReport>): Promise<DirectorReport | null> {
    try {
      const record = await pb.collection('director_reports').create<DirectorReport>(report);
      queryCache.clear('director_reports');
      return record;
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      return null;
    }
  }

  // Recurring Billing / Manual Launch
  async triggerRecurringMonthlyFees(clubId: string, billingPeriod: string, managerUser: User): Promise<number> {
    const memberships = await this.getMemberships();
    const clubs = await this.getClubs();
    const club = clubs.find((c) => c.id === clubId);

    if (!club) throw new Error('Clube não encontrado');

    const activeMembers = memberships.filter((m) => m.clubId === clubId && (m.status === 'approved' || m.status === 'active'));
    const existingTransactions = await this.getTransactions();
    const newLaunches: Partial<Transaction>[] = [];

    for (const member of activeMembers) {
      const alreadyBilled = existingTransactions.some(
        (e) =>
          (e.userId === member.userId || e.cadetNumber === member.cadetNumber) &&
          e.clubId === clubId &&
          e.billingPeriod === billingPeriod &&
          (e.category === 'Mensalidade' || e.category === 'mensalidade_clube')
      );

      if (!alreadyBilled) {
        newLaunches.push({
          userId: member.userId,
          cadetId: member.userId,
          userName: member.userName,
          cadetName: member.userName,
          cadetNumber: member.cadetNumber,
          clubId: club.id,
          clubName: club.name,
          description: `Mensalidade ${billingPeriod} - ${club.code || club.name}`,
          amount: club.monthlyFee,
          category: 'mensalidade_clube',
          billingPeriod,
          type: 'recurring',
          createdBy: managerUser.id,
          createdByName: managerUser.warName || managerUser.name,
          status: 'pending',
        });
      }
    }

    if (newLaunches.length > 0) {
      await this.createTransactions(newLaunches);
    }

    return newLaunches.length;
  }

  async triggerMonthlyBilling(period: string): Promise<boolean> {
    try {
      const config = await this.getScaerConfig();
      const fee = config?.scaerMonthlyFee || 100;
      const users = await this.getUsers();
      const cadetes = users.filter((u) => u.role === 'cadete' || !u.role);
      const existingTxs = await this.getTransactionsByPeriod(period);

      const txsToCreate: Partial<Transaction>[] = [];

      for (const cadet of cadetes) {
        // Verificar se já tem mensalidade SCAER
        const hasScaer = existingTxs.some(
          (t) =>
            (t.userId === cadet.id || t.cadetNumber === cadet.cadetNumber) &&
            (t.category === 'mensalidade_scaer' || t.description.includes('Mensalidade SCAER'))
        );

        if (!hasScaer) {
          txsToCreate.push({
            userId: cadet.id,
            cadetId: cadet.id,
            cadetNumber: cadet.cadetNumber,
            cadetName: cadet.warName || cadet.name,
            userName: cadet.warName || cadet.name,
            clubId: 'SCAER',
            clubName: 'SCAER',
            description: 'Mensalidade SCAER',
            amount: fee,
            category: 'mensalidade_scaer',
            billingPeriod: period,
            type: 'automatic',
            status: 'pending',
          });
        }
      }

      if (txsToCreate.length > 0) {
        await this.createTransactions(txsToCreate);
      }
      await this.generateMonthlySummary(period);
      return true;
    } catch (error) {
      console.error('Erro no faturamento mensal:', error);
      return false;
    }
  }

  // Religious Donations
  async setCadetReligiousDonation(
    userId: string,
    clubId: string,
    clubName: string,
    amount: number,
    billingPeriod: string = '2026-08'
  ): Promise<boolean> {
    try {
      const users = await this.getUsers();
      const user = users.find((u) => u.id === userId);
      if (!user) throw new Error('Usuário não encontrado');

      const now = new Date().toISOString().split('T')[0];
      const memberships = await this.getMemberships();
      const existingMem = memberships.find(
        (m) =>
          m.userId === userId &&
          (m.clubId === clubId || (m.clubName && m.clubName.toLowerCase() === clubName.toLowerCase()))
      );

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

      // Criar ou atualizar transação de doação
      const transactions = await this.getTransactions();
      const existingTx = transactions.find(
        (e) =>
          (e.userId === userId || e.cadetNumber === user.cadetNumber) &&
          e.billingPeriod === billingPeriod &&
          (e.clubId === clubId || (e.description && e.description.toLowerCase().includes(clubName.toLowerCase())))
      );

      if (existingTx) {
        await this.updateTransaction(existingTx.id, {
          amount,
          description: `Doação Mensal - ${clubName}`,
          category: 'doacao_religiosa',
        });
      } else {
        await this.createTransaction({
          userId: user.id,
          cadetId: user.id,
          userName: user.warName || user.name,
          cadetName: user.warName || user.name,
          cadetNumber: user.cadetNumber,
          clubId,
          clubName,
          description: `Doação Mensal - ${clubName}`,
          amount,
          category: 'doacao_religiosa',
          billingPeriod,
          type: 'recurring',
          createdBy: user.id,
          createdByName: user.warName || user.name,
          status: 'pending',
        });
      }

      queryCache.clear();
      return true;
    } catch (error) {
      console.error('Erro ao definir doação:', error);
      return false;
    }
  }

  async cancelCadetReligiousDonation(
    userId: string,
    clubId: string,
    billingPeriod: string = '2026-08'
  ): Promise<boolean> {
    try {
      const memberships = await this.getMemberships();
      const existingMem = memberships.find((m) => m.userId === userId && m.clubId === clubId);
      if (existingMem) {
        await pb.collection('club_memberships').update(existingMem.id, {
          status: 'inactive',
        }).catch(() => null);
      }

      const transactions = await this.getTransactions();
      const existingTx = transactions.find(
        (e) => (e.userId === userId || e.cadetNumber) && e.billingPeriod === billingPeriod && e.clubId === clubId
      );
      if (existingTx) {
        await this.deleteTransaction(existingTx.id);
      }

      queryCache.clear();
      return true;
    } catch (error) {
      console.error('Erro ao cancelar doação:', error);
      return false;
    }
  }

  // Importação em Lote Direta para o PocketBase
  async importBulkDataFromExcel(
    _newRoster: CadetRosterItem[],
    newTransactions: Partial<Transaction>[],
    _newExemptions: PendingExemption[],
    _newDesligados: DesligadoItem[],
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    if (onProgress) onProgress(10, 'Iniciando importação para o PocketBase remoto...');

    if (newTransactions.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < newTransactions.length; i += chunkSize) {
        const chunk = newTransactions.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((item) =>
            pb.collection('transactions').create(item).catch(() => null)
          )
        );
        const pct = 10 + Math.floor(((i + chunk.length) / newTransactions.length) * 85);
        if (onProgress) onProgress(pct, `Enviados ${i + chunk.length} de ${newTransactions.length} lançamentos...`);
      }
    }

    if (onProgress) onProgress(100, 'Importação para o PocketBase concluída!');
    queryCache.clear();
  }
}

export const DatabaseService = new DatabaseServiceClass();
