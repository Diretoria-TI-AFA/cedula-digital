import { useEffect, useState } from 'react';
import type { User, Club, ClubMembership, Transaction, DirectorReport, ScaerConfig, MonthlySummary } from './types';
import { DatabaseService, pb } from './lib/pocketbase';
import { queryCache } from './lib/queryCache';
import { Header } from './components/common/Header';
import { LoginView } from './components/auth/LoginView';
import { CreditCard3D } from './components/cadet/CreditCard3D';
import { CadetInvoiceView } from './components/cadet/CadetInvoiceView';
import { CadetClubsView } from './components/cadet/CadetClubsView';
import { CadetReligiousView } from './components/cadet/CadetReligiousView';
import { ScaerManagerView } from './components/scaer/ScaerManagerView';
import { DirectorDashboard } from './components/director/DirectorDashboard';
import { Shield } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reports, setReports] = useState<DirectorReport[]>([]);
  const [scaerConfig, setScaerConfig] = useState<ScaerConfig | null>(null);
  const [_monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [isPbConnected, setIsPbConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Estado do Tema (Dark vs Light Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cedula_theme') as 'dark' | 'light') || 'dark';
  });

  const [activeTab, setActiveTab] = useState<'card' | 'clubs' | 'religious' | 'scaer' | 'director'>('card');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('cedula_theme', nextTheme);
  };

  // Verificar autenticação e carregar dados reais do PocketBase
  const loadData = async () => {
    setIsLoading(true);
    try {
      const connected = await DatabaseService.checkConnection();
      setIsPbConnected(connected);

      if (pb.authStore.isValid && pb.authStore.record) {
        const user = pb.authStore.record as unknown as User;
        setCurrentUser(user);

        const isCadet = user.role === 'cadete' || !user.role;
        const txsPromise = isCadet
          ? DatabaseService.getTransactionsForCadet(user)
          : DatabaseService.getTransactionsByPeriod('2026-08');

        const [usersData, clubsData, memsData, txsData, repsData, configData, summariesData] = await Promise.all([
          DatabaseService.getUsers(),
          DatabaseService.getClubs(),
          DatabaseService.getMemberships(),
          txsPromise,
          DatabaseService.getDirectorReports(),
          DatabaseService.getScaerConfig(),
          DatabaseService.getMonthlySummaries(),
        ]);

        setAllUsers(usersData);
        setClubs(clubsData);
        setMemberships(memsData);
        setTransactions(txsData);
        setReports(repsData);
        setScaerConfig(configData);
        setMonthlySummaries(summariesData);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do PocketBase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    if (user.role === 'cadete') setActiveTab('card');
    else if (user.role === 'scaer' || user.role === 'presidente') setActiveTab('scaer');
    else if (user.role === 'diretor') setActiveTab('director');
    await loadData();
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setCurrentUser(null);
    queryCache.clear();
  };

  const handleRequestMembership = async (clubId: string, action: 'join' | 'leave', notes?: string) => {
    if (!currentUser) return;
    await DatabaseService.requestClubMembership(currentUser.id, clubId, action, notes);
    const updatedMems = await DatabaseService.getMemberships();
    setMemberships(updatedMems);
  };

  const handleUpdateMembershipStatus = async (
    membershipId: string,
    status: 'approved' | 'rejected' | 'inactive' | 'active'
  ) => {
    await DatabaseService.updateMembershipStatus(membershipId, status);
    const updatedMems = await DatabaseService.getMemberships();
    const updatedClubs = await DatabaseService.getClubs();
    setMemberships(updatedMems);
    setClubs(updatedClubs);
  };

  const handleLaunchIndividual = async (launch: Omit<Transaction, 'id' | 'createdAt' | 'status' | 'created' | 'updated'>) => {
    await DatabaseService.createTransaction(launch);
    const updatedTxs = await DatabaseService.getTransactions();
    setTransactions(updatedTxs);
  };

  const handleLaunchBulk = async (launches: Omit<Transaction, 'id' | 'createdAt' | 'status' | 'created' | 'updated'>[]) => {
    await DatabaseService.createTransactions(launches);
    const updatedTxs = await DatabaseService.getTransactions();
    setTransactions(updatedTxs);
  };

  const handleTriggerRecurring = async (clubId: string, billingPeriod: string): Promise<number> => {
    if (!currentUser) return 0;
    const count = await DatabaseService.triggerRecurringMonthlyFees(clubId, billingPeriod, currentUser);
    const updatedTxs = await DatabaseService.getTransactions();
    setTransactions(updatedTxs);
    return count;
  };

  const handleUpdateScaerConfig = async (newConfig: Partial<ScaerConfig>) => {
    const updated = await DatabaseService.updateScaerConfig(newConfig);
    if (updated) {
      setScaerConfig(updated);
    }
  };

  const handleTriggerMonthlyBilling = async (period: string): Promise<boolean> => {
    const success = await DatabaseService.triggerMonthlyBilling(period);
    if (success) {
      const updatedTxs = await DatabaseService.getTransactions();
      const updatedSummaries = await DatabaseService.getMonthlySummaries();
      setTransactions(updatedTxs);
      setMonthlySummaries(updatedSummaries);
    }
    return success;
  };

  const handleSaveReport = async (report: Omit<DirectorReport, 'id'>): Promise<DirectorReport> => {
    const saved = await DatabaseService.saveDirectorReport(report);
    const updatedReports = await DatabaseService.getDirectorReports();
    setReports(updatedReports);
    return saved || (report as DirectorReport);
  };

  const handleSetReligiousDonation = async (clubId: string, clubName: string, amount: number) => {
    if (!currentUser) return;
    await DatabaseService.setCadetReligiousDonation(currentUser.id, clubId, clubName, amount);
    await loadData();
  };

  const handleCancelReligiousDonation = async (clubId: string) => {
    if (!currentUser) return;
    await DatabaseService.cancelCadetReligiousDonation(currentUser.id, clubId);
    await loadData();
  };

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
        }`}
      >
        <div className="text-center space-y-3">
          <div
            className={`w-10 h-10 rounded-lg border flex items-center justify-center mx-auto ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <Shield className="w-5 h-5 animate-pulse text-amber-500" />
          </div>
          <p className="text-xs font-semibold">Conectando ao PocketBase SCAER...</p>
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de Login
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Cédula Atual do Cadete Logado
  const currentPeriod = scaerConfig?.currentBillingPeriod || '2026-08';
  const userNum = (currentUser.cadetNumber || '').replace(/\D/g, '');
  const currentCadetExpenses = transactions.filter((e) => {
    const expNum = (e.cadetNumber || '').replace(/\D/g, '');
    const matchesNum = Boolean(userNum && expNum && userNum === expNum);
    const matchesUser = Boolean(
      e.userId === currentUser.id ||
      e.cadetId === currentUser.id ||
      (currentUser.cadetNumber && e.cadetNumber === currentUser.cadetNumber) ||
      matchesNum
    );
    return matchesUser && e.billingPeriod === currentPeriod && e.status !== 'cancelled' && e.status !== 'deferred';
  });

  const invoiceTotal = currentCadetExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const isDark = theme === 'dark';
  const cadetList = allUsers.filter((u) => u.role === 'cadete' || !u.role || u.role === 'diretor');

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
        isDark
          ? 'bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white'
          : 'bg-zinc-50 text-zinc-900 selection:bg-zinc-200 selection:text-zinc-900'
      }`}
    >
      {/* Header Principal */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPbConnected={isPbConnected}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ABA: Cartão & Cédula do Cadete */}
        {activeTab === 'card' && (
          <div className="space-y-6">
            <CreditCard3D
              user={currentUser}
              invoiceTotal={invoiceTotal}
              dueDate={`10/${currentPeriod.split('-')[1] || '08'}/${currentPeriod.split('-')[0] || '2026'}`}
              theme={theme}
            />

            <CadetInvoiceView
              user={currentUser}
              transactions={transactions}
              expenses={transactions}
              scaerConfig={scaerConfig}
              theme={theme}
            />
          </div>
        )}

        {/* ABA: Clubes da SCAER */}
        {activeTab === 'clubs' && (
          <div>
            <CadetClubsView
              user={currentUser}
              clubs={clubs}
              memberships={memberships}
              onRequestMembership={handleRequestMembership}
              theme={theme}
            />
          </div>
        )}

        {/* ABA: Cultos Religiosos & Ação Social */}
        {activeTab === 'religious' && (
          <div>
            <CadetReligiousView
              user={currentUser}
              clubs={clubs}
              memberships={memberships}
              expenses={transactions}
              onSetDonation={handleSetReligiousDonation}
              onCancelDonation={handleCancelReligiousDonation}
              theme={theme}
            />
          </div>
        )}

        {/* ABA: Portal do Gestor SCAER / Presidente do Clube */}
        {activeTab === 'scaer' && (
          <div>
            <ScaerManagerView
              user={currentUser}
              clubs={clubs}
              memberships={memberships}
              expenses={transactions}
              allCadets={cadetList}
              scaerConfig={scaerConfig}
              onUpdateScaerConfig={handleUpdateScaerConfig}
              onTriggerMonthlyBilling={handleTriggerMonthlyBilling}
              onUpdateMembershipStatus={handleUpdateMembershipStatus}
              onLaunchIndividual={handleLaunchIndividual}
              onLaunchBulk={handleLaunchBulk}
              onTriggerRecurring={handleTriggerRecurring}
              theme={theme}
            />
          </div>
        )}

        {/* ABA: Diretoria de Cédula */}
        {activeTab === 'director' && (
          <div>
            <DirectorDashboard
              directorUser={currentUser}
              allUsers={allUsers}
              expenses={transactions}
              clubs={clubs}
              memberships={memberships}
              reports={reports}
              onSaveReport={handleSaveReport}
              theme={theme}
              onRefreshData={loadData}
            />
          </div>
        )}
      </main>

      {/* Rodapé da Aplicação Simplificado */}
      <footer
        className={`border-t py-6 mt-12 transition-colors ${
          isDark ? 'border-zinc-900 bg-zinc-950 text-zinc-500' : 'border-zinc-200 bg-white text-zinc-400'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 text-center text-[11px] font-medium">
          <p>Academia da Força Aérea • Diretoria de Cédula • SCAER 2026</p>
        </div>
      </footer>
    </div>
  );
}
