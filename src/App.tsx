import { useEffect, useState } from 'react';
import type { User, Club, ClubMembership, Expense, DirectorReport } from './types';
import { DatabaseService, pb } from './lib/pocketbase';
import { queryCache } from './lib/queryCache';
import { Header } from './components/common/Header';
import { LoginView } from './components/auth/LoginView';
import { CreditCard3D } from './components/cadet/CreditCard3D';
import { CadetInvoiceView } from './components/cadet/CadetInvoiceView';
import { CadetClubsView } from './components/cadet/CadetClubsView';
import { ScaerManagerView } from './components/scaer/ScaerManagerView';
import { DirectorDashboard } from './components/director/DirectorDashboard';
import { Shield } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reports, setReports] = useState<DirectorReport[]>([]);
  const [isPbConnected, setIsPbConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Estado do Tema (Dark vs Light Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cedula_theme') as 'dark' | 'light') || 'dark';
  });

  const [activeTab, setActiveTab] = useState<'card' | 'clubs' | 'scaer' | 'director'>('card');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('cedula_theme', nextTheme);
  };

  // Verificar autenticação e carregar dados do usuário logado
  const loadData = async () => {
    setIsLoading(true);
    try {
      const connected = await DatabaseService.checkConnection();
      setIsPbConnected(connected);

      if (pb.authStore.isValid && pb.authStore.record) {
        const user = pb.authStore.record as unknown as User;
        setCurrentUser(user);

        if (user.role === 'cadete') setActiveTab('card');
        else if (user.role === 'scaer' || user.role === 'presidente') setActiveTab('scaer');
        else if (user.role === 'diretor') setActiveTab('director');

        const [usersData, clubsData, memsData, expsData, repsData] = await Promise.all([
          DatabaseService.getUsers(),
          DatabaseService.getClubs(),
          DatabaseService.getMemberships(),
          DatabaseService.getExpenses(),
          DatabaseService.getDirectorReports(),
        ]);

        setAllUsers(usersData);
        setClubs(clubsData);
        setMemberships(memsData);
        setExpenses(expsData);
        setReports(repsData);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
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

  const handleUpdateMembershipStatus = async (membershipId: string, status: 'approved' | 'rejected' | 'inactive') => {
    await DatabaseService.updateMembershipStatus(membershipId, status);
    const updatedMems = await DatabaseService.getMemberships();
    const updatedClubs = await DatabaseService.getClubs();
    setMemberships(updatedMems);
    setClubs(updatedClubs);
  };

  const handleLaunchIndividual = async (launch: Omit<Expense, 'id' | 'createdAt' | 'status'>) => {
    await DatabaseService.createExpenses([launch]);
    const updatedExps = await DatabaseService.getExpenses();
    setExpenses(updatedExps);
  };

  const handleLaunchBulk = async (launches: Omit<Expense, 'id' | 'createdAt' | 'status'>[]) => {
    await DatabaseService.createExpenses(launches);
    const updatedExps = await DatabaseService.getExpenses();
    setExpenses(updatedExps);
  };

  const handleTriggerRecurring = async (clubId: string, billingPeriod: string): Promise<number> => {
    if (!currentUser) return 0;
    const count = await DatabaseService.triggerRecurringMonthlyFees(clubId, billingPeriod, currentUser);
    const updatedExps = await DatabaseService.getExpenses();
    setExpenses(updatedExps);
    return count;
  };

  const handleSaveReport = async (report: Omit<DirectorReport, 'id'>): Promise<DirectorReport> => {
    const saved = await DatabaseService.saveDirectorReport(report);
    const updatedReports = await DatabaseService.getDirectorReports();
    setReports(updatedReports);
    return saved;
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-500 border border-cyan-500/30 flex items-center justify-center mx-auto animate-bounce">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold">Conectando ao PocketBase SCAER...</p>
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
  const currentCadetExpenses = expenses.filter(
    (e) => (e.userId === currentUser.id || e.cadetNumber === currentUser.cadetNumber) && e.billingPeriod === '2026-07'
  );
  const invoiceTotal = currentCadetExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const isDark = theme === 'dark';
  const cadetList = allUsers.filter(u => u.role === 'cadete' || !u.role || u.role === 'diretor');

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-300 ${
      isDark
        ? 'bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950'
        : 'bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white'
    }`}>
      
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ABA: Cartão & Cédula do Cadete */}
        {activeTab === 'card' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <CreditCard3D
              user={currentUser}
              invoiceTotal={invoiceTotal}
              dueDate="10/08/2026"
              theme={theme}
            />

            <CadetInvoiceView user={currentUser} expenses={expenses} theme={theme} />
          </div>
        )}

        {/* ABA: Clubes da SCAER */}
        {activeTab === 'clubs' && (
          <div className="animate-in fade-in duration-300">
            <CadetClubsView
              user={currentUser}
              clubs={clubs}
              memberships={memberships}
              onRequestMembership={handleRequestMembership}
              theme={theme}
            />
          </div>
        )}

        {/* ABA: Portal do Gestor SCAER / Presidente do Clube */}
        {activeTab === 'scaer' && (
          <div className="animate-in fade-in duration-300">
            <ScaerManagerView
              user={currentUser}
              clubs={clubs}
              memberships={memberships}
              expenses={expenses}
              allCadets={cadetList}
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
          <div className="animate-in fade-in duration-300">
            <DirectorDashboard
              directorUser={currentUser}
              expenses={expenses}
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
      <footer className={`border-t py-8 mt-16 transition-colors ${
        isDark ? 'border-slate-900 bg-slate-950/90 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 text-center text-xs font-semibold">
          <p>Academia da Força Aérea • Diretoria de Cédula • © 2026 SCAER</p>
        </div>
      </footer>

    </div>
  );
}
