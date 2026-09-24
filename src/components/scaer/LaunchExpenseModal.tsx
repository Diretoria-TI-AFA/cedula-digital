import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import type { Club, User, Expense, LaunchType, ClubMembership } from '../../types';
import {
  PlusCircle,
  Users,
  UserCheck,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Search,
  X,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export interface ParsedXlsxRow {
  id: string;
  rowNumber: number;
  cadetQuery: string;
  cadetNumber: string;
  cadetName: string;
  userId: string;
  amount: number;
  clubQuery: string;
  clubId: string;
  clubName: string;
  responsibleQuery: string;
  createdBy: string;
  createdByName: string;
  description: string;
  category: Expense['category'];
  billingPeriod: string;
  isValid: boolean;
  errorReason?: string;
}

interface LaunchExpenseModalProps {
  club: Club;
  allClubs?: Club[];
  managerUser: User;
  allCadets: User[];
  activeMembers?: ClubMembership[];
  scannedCadet?: { cadetNumber: string; warName?: string } | null;
  onClose: () => void;
  onLaunchIndividual: (launch: Omit<Expense, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  onLaunchBulk: (launches: Omit<Expense, 'id' | 'createdAt' | 'status'>[]) => Promise<void>;
  theme?: 'dark' | 'light';
}

// ==========================================
// Helpers de Sanitização e Associação Inteligente
// ==========================================

const normalizeText = (str: string): string => {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const parseAmount = (val: any): number => {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }
  if (!val) return 0;
  let str = String(val).trim().replace(/R\$\s*/gi, '').replace(/\s+/g, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
};

const parseCategory = (catRaw: string, descRaw: string): Expense['category'] => {
  const combined = `${normalizeText(catRaw)} ${normalizeText(descRaw)}`;
  if (/mensalidade/i.test(combined)) return 'Mensalidade';
  if (/evento|inscricao|inscrição/i.test(combined)) return 'Evento';
  if (/equipamento|fardamento|uniforme|material/i.test(combined)) return 'Equipamento';
  if (/taxa/i.test(combined)) return 'Taxa Avulsa';
  return 'Consumo';
};

const matchCadet = (numStr: string, nameStr: string, cadets: User[]): User | null => {
  const cleanNum = numStr.replace(/[^\d]/g, '');
  const cleanName = normalizeText(nameStr);

  // 1. Tentar encontrar por número se existir
  if (cleanNum.length > 0) {
    const foundByNum = cadets.find((c) => {
      const cClean = c.cadetNumber.replace(/[^\d]/g, '');
      return cClean === cleanNum || c.cadetNumber.trim().toLowerCase() === numStr.trim().toLowerCase();
    });
    if (foundByNum) return foundByNum;
  }

  // 2. Tentar por Nome de Guerra ou Nome Completo
  if (cleanName.length >= 2) {
    const foundByName = cadets.find((c) => {
      const cWar = normalizeText(c.warName);
      const cFullName = normalizeText(c.name);
      return (
        cWar === cleanName ||
        cFullName === cleanName ||
        (cleanName.length >= 3 && (cWar.includes(cleanName) || cleanName.includes(cWar)))
      );
    });
    if (foundByName) return foundByName;
  }

  return null;
};

const matchClub = (
  clubStr: string,
  clubs: Club[],
  fallbackClub: Club
): { id: string; name: string } => {
  if (!clubStr || !clubStr.trim()) {
    return { id: fallbackClub.id, name: fallbackClub.name };
  }

  const query = normalizeText(clubStr);
  const found = clubs.find((c) => {
    const cName = normalizeText(c.name);
    return (
      c.id.toLowerCase() === query ||
      cName === query ||
      (query.length >= 3 && (cName.includes(query) || query.includes(cName)))
    );
  });

  if (found) {
    return { id: found.id, name: found.name };
  }

  return {
    id: fallbackClub.id,
    name: clubStr.trim().toUpperCase(),
  };
};

const matchResponsible = (
  respStr: string,
  cadets: User[],
  fallbackManager: User
): { id: string; name: string } => {
  if (!respStr || !respStr.trim()) {
    return {
      id: fallbackManager.id,
      name: fallbackManager.warName || fallbackManager.name || 'Responsável',
    };
  }

  const query = normalizeText(respStr);
  const cleanNum = respStr.replace(/[^\d]/g, '');

  const foundUser = cadets.find((u) => {
    const uWar = normalizeText(u.warName);
    const uName = normalizeText(u.name);
    const uNum = u.cadetNumber.replace(/[^\d]/g, '');
    return (
      (cleanNum.length >= 3 && uNum === cleanNum) ||
      uWar === query ||
      (query.length >= 3 && (uWar.includes(query) || uName.includes(query)))
    );
  });

  if (foundUser) {
    return {
      id: foundUser.id,
      name: foundUser.warName || foundUser.name,
    };
  }

  return {
    id: fallbackManager.id,
    name: respStr.trim().toUpperCase(),
  };
};

const parseBillingPeriod = (monthStr: string, fallback: string): string => {
  if (!monthStr || !monthStr.trim()) return fallback;
  const str = normalizeText(monthStr);

  const ymMatch = str.match(/(\d{4})[-/](\d{1,2})/);
  if (ymMatch) {
    return `${ymMatch[1]}-${ymMatch[2].padStart(2, '0')}`;
  }

  const myMatch = str.match(/(\d{1,2})[-/](\d{4})/);
  if (myMatch) {
    return `${myMatch[2]}-${myMatch[1].padStart(2, '0')}`;
  }

  const defaultYear = fallback.split('-')[0] || '2026';
  if (str.includes('jan')) return `${defaultYear}-01`;
  if (str.includes('fev')) return `${defaultYear}-02`;
  if (str.includes('mar')) return `${defaultYear}-03`;
  if (str.includes('abr')) return `${defaultYear}-04`;
  if (str.includes('mai')) return `${defaultYear}-05`;
  if (str.includes('jun')) return `${defaultYear}-06`;
  if (str.includes('jul')) return `${defaultYear}-07`;
  if (str.includes('ago')) return `${defaultYear}-08`;
  if (str.includes('set')) return `${defaultYear}-09`;
  if (str.includes('out')) return `${defaultYear}-10`;
  if (str.includes('nov')) return `${defaultYear}-11`;
  if (str.includes('dez')) return `${defaultYear}-12`;

  return fallback;
};

// ==========================================
// Componente Principal
// ==========================================

export const LaunchExpenseModal: React.FC<LaunchExpenseModalProps> = ({
  club,
  allClubs,
  managerUser,
  allCadets,
  scannedCadet,
  onClose,
  onLaunchIndividual,
  onLaunchBulk,
  theme = 'dark',
}) => {
  const [launchType, setLaunchType] = useState<LaunchType>('individual');
  const [selectedCadetId, setSelectedCadetId] = useState<string>(allCadets[0]?.id || '');
  const [selectedCadetIds, setSelectedCadetIds] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<Expense['category']>('Consumo');
  const [billingPeriod, setBillingPeriod] = useState<string>('2026-08');

  // Estado para Importação de Planilha Excel (.xlsx)
  const [spreadsheetFileName, setSpreadsheetFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedXlsxRow[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showOnlyValid, setShowOnlyValid] = useState<boolean>(false);

  // Estado para busca de cadetes (Individual)
  const [cadetSearchQuery, setCadetSearchQuery] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Estado para busca de cadetes (Em Lote)
  const [bulkSearchQuery, setBulkSearchQuery] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isDark = theme === 'dark';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pré-selecionar o cadete escaneado via QR Code
  useEffect(() => {
    if (scannedCadet) {
      const found = allCadets.find(
        (c) =>
          c.cadetNumber.toLowerCase().includes(scannedCadet.cadetNumber.toLowerCase()) ||
          (scannedCadet.warName && c.warName.toLowerCase().includes(scannedCadet.warName.toLowerCase()))
      );
      if (found) {
        setSelectedCadetId(found.id);
        setCadetSearchQuery(`${found.cadetNumber} ${found.warName}`);
      }
    }
  }, [scannedCadet, allCadets]);

  // Função de filtro reutilizável
  const filterCadets = (cadets: User[], query: string): User[] => {
    if (!query.trim()) return cadets;
    const normalizedQuery = query.toLowerCase().trim();
    return cadets.filter(
      (c) =>
        (c.warName || '').toLowerCase().includes(normalizedQuery) ||
        (c.name || '').toLowerCase().includes(normalizedQuery) ||
        (c.cadetNumber || '').toLowerCase().includes(normalizedQuery)
    );
  };

  const filteredCadetsIndividual = filterCadets(allCadets, cadetSearchQuery);
  const filteredCadetsBulk = filterCadets(allCadets, bulkSearchQuery);

  // ==========================================
  // Lógica de Leitura e Parsing da Planilha XLSX
  // ==========================================

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSpreadsheetFileName(file.name);
    setIsParsing(true);
    setParseError(null);
    setParsedRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Escolhe a primeira planilha ou a que tiver nome de lançamentos
      const sheetName =
        workbook.SheetNames.find((name) =>
          /lan[cç]amento|extrato|dados|planilha/i.test(name)
        ) || workbook.SheetNames[0];

      if (!sheetName || !workbook.Sheets[sheetName]) {
        throw new Error('Nenhuma aba válida encontrada no arquivo Excel.');
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawData.length === 0) {
        throw new Error('A planilha selecionada está vazia.');
      }

      // Procurar linha de cabeçalho inteligente (procura nas primeiras 10 linhas)
      let headerRowIndex = -1;
      let colMap = {
        num: -1,
        name: -1,
        val: -1,
        club: -1,
        resp: -1,
        desc: -1,
        cat: -1,
        month: -1,
      };

      for (let r = 0; r < Math.min(rawData.length, 10); r++) {
        const row = rawData[r];
        if (!Array.isArray(row)) continue;

        let hasNumIndicator = false;
        let hasValIndicator = false;

        row.forEach((cell) => {
          const str = normalizeText(String(cell));
          if (/n[uú]mero|numero|n[ºo]|matricula|matr[ií]cula/i.test(str)) hasNumIndicator = true;
          if (/valor|quantia|total|pre[cç]o/i.test(str)) hasValIndicator = true;
        });

        if (hasNumIndicator || hasValIndicator) {
          headerRowIndex = r;
          row.forEach((cell, cIdx) => {
            const str = normalizeText(String(cell));
            if (/n[uú]mero|numero|n[ºo]|matricula|matr[ií]cula/i.test(str) && colMap.num === -1) colMap.num = cIdx;
            else if (/nome|guerra|cadete/i.test(str) && colMap.name === -1) colMap.name = cIdx;
            else if (/valor|quantia|total|pre[cç]o/i.test(str) && colMap.val === -1) colMap.val = cIdx;
            else if (/clube|entidade|setor/i.test(str) && colMap.club === -1) colMap.club = cIdx;
            else if (/respons[aá]vel|lan[cç]ado\s*por|criado\s*por|gestor/i.test(str) && colMap.resp === -1) colMap.resp = cIdx;
            else if (/descri[cç][aã]o|obs|observa[cç][aã]o|motivo|item/i.test(str) && colMap.desc === -1) colMap.desc = cIdx;
            else if (/categoria|tipo/i.test(str) && colMap.cat === -1) colMap.cat = cIdx;
            else if (/m[eê]s|per[ií]odo|compet[eê]ncia/i.test(str) && colMap.month === -1) colMap.month = cIdx;
          });
          break;
        }
      }

      // Se nenhum cabeçalho foi detectado pelo nome, assume padrão sequencial
      if (headerRowIndex === -1) {
        headerRowIndex = 0;
        colMap = {
          num: 0,
          name: 1,
          val: 2,
          club: 3,
          resp: 4,
          desc: 5,
          cat: 6,
          month: 7,
        };
      }

      const availableClubs = allClubs && allClubs.length > 0 ? allClubs : [club];
      const dataRows = rawData.slice(headerRowIndex + 1);
      const results: ParsedXlsxRow[] = [];

      dataRows.forEach((row, idx) => {
        if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
          return;
        }

        const rowNumber = headerRowIndex + 2 + idx;
        const cadetNumRaw = colMap.num !== -1 ? String(row[colMap.num] || '').trim() : '';
        const cadetNameRaw = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
        const valRaw = colMap.val !== -1 ? row[colMap.val] : '';
        const clubRaw = colMap.club !== -1 ? String(row[colMap.club] || '').trim() : '';
        const respRaw = colMap.resp !== -1 ? String(row[colMap.resp] || '').trim() : '';
        const descRaw = colMap.desc !== -1 ? String(row[colMap.desc] || '').trim() : '';
        const catRaw = colMap.cat !== -1 ? String(row[colMap.cat] || '').trim() : '';
        const monthRaw = colMap.month !== -1 ? String(row[colMap.month] || '').trim() : '';

        // Ignorar linhas de rodapé ou totalizadores
        if (
          /total|soma|subtotal/i.test(normalizeText(cadetNumRaw)) ||
          /total|soma|subtotal/i.test(normalizeText(cadetNameRaw))
        ) {
          return;
        }

        // 1. Extração do Valor
        const amountNum = parseAmount(valRaw);

        // 2. Busca do Cadete
        const matchedCadet = matchCadet(cadetNumRaw, cadetNameRaw, allCadets);

        // 3. Busca do Clube (fallback para o clube atual do modal)
        const matchedClub = matchClub(clubRaw, availableClubs, club);

        // 4. Busca do Responsável (fallback para o usuário logado)
        const matchedResp = matchResponsible(respRaw, allCadets, managerUser);

        // 5. Mês (prioridade para a planilha, fallback para o selecionado no modal)
        const rowBillingPeriod = parseBillingPeriod(monthRaw, billingPeriod);

        // 6. Categoria
        const cat = parseCategory(catRaw, descRaw);

        // 7. Descrição
        const desc = descRaw || `Consumo / Lançamento ${matchedClub.name}`;

        // Validação da linha
        let isValid = true;
        let errorReason = '';

        if (!matchedCadet) {
          isValid = false;
          errorReason = `Cadete "${cadetNumRaw || cadetNameRaw || 'não informado'}" não localizado no sistema.`;
        } else if (isNaN(amountNum) || amountNum <= 0) {
          isValid = false;
          errorReason = `Valor zerado ou inválido (${valRaw || 'vazio'}).`;
        }

        results.push({
          id: `xlsx_${rowNumber}_${idx}`,
          rowNumber,
          cadetQuery: cadetNumRaw || cadetNameRaw,
          cadetNumber: matchedCadet ? matchedCadet.cadetNumber : cadetNumRaw,
          cadetName: matchedCadet ? matchedCadet.warName : cadetNameRaw || 'Não encontrado',
          userId: matchedCadet ? matchedCadet.id : '',
          amount: amountNum,
          clubQuery: clubRaw,
          clubId: matchedClub.id,
          clubName: matchedClub.name,
          responsibleQuery: respRaw,
          createdBy: matchedResp.id,
          createdByName: matchedResp.name,
          description: desc,
          category: cat,
          billingPeriod: rowBillingPeriod,
          isValid,
          errorReason,
        });
      });

      if (results.length === 0) {
        setParseError('Nenhum registro com dados pôde ser extraído da planilha.');
      } else {
        setParsedRows(results);
      }
    } catch (err: any) {
      console.error('Erro ao ler planilha Excel:', err);
      setParseError(err?.message || 'Falha ao processar arquivo .xlsx. Verifique a formatação.');
    } finally {
      setIsParsing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Gerar e Baixar Modelo de Planilha (.xlsx)
  const handleDownloadTemplate = () => {
    const headers = [
      'Número',
      'Nome de Guerra',
      'Valor (R$)',
      'Clube',
      'Responsável',
      'Descrição',
      'Categoria',
      'Mês',
    ];

    const sampleCadet1 = allCadets[0] || { cadetNumber: '24/015', warName: 'SILVA' };
    const sampleCadet2 = allCadets[1] || { cadetNumber: '23/001', warName: 'MORO' };
    const sampleCadet3 = allCadets[2] || { cadetNumber: '25/088', warName: 'SANTOS' };

    const rows = [
      [
        sampleCadet1.cadetNumber,
        sampleCadet1.warName,
        45.5,
        club.name,
        managerUser.warName || managerUser.name || 'GESTÃO',
        'Consumo Cantina / Bar',
        'Consumo',
        billingPeriod,
      ],
      [
        sampleCadet2.cadetNumber,
        sampleCadet2.warName,
        75.0,
        club.name,
        managerUser.warName || managerUser.name || 'GESTÃO',
        'Mensalidade de Atividades',
        'Mensalidade',
        billingPeriod,
      ],
      [
        sampleCadet3.cadetNumber,
        sampleCadet3.warName,
        30.0,
        'CLUBE DE TIRO',
        'TEN. LIMA',
        'Munição para Treinamento',
        'Consumo',
        billingPeriod,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 12 }, // Número
      { wch: 20 }, // Nome de Guerra
      { wch: 14 }, // Valor
      { wch: 22 }, // Clube
      { wch: 24 }, // Responsável
      { wch: 28 }, // Descrição
      { wch: 16 }, // Categoria
      { wch: 12 }, // Mês
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos');
    XLSX.writeFile(wb, 'Modelo_Lancamentos_CedulAthos.xlsx');
  };

  const handleRemoveRow = (rowId: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Estatísticas de Validação
  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);
  const totalValidAmount = useMemo(
    () => validRows.reduce((acc, curr) => acc + curr.amount, 0),
    [validRows]
  );
  const displayedRows = useMemo(
    () => (showOnlyValid ? validRows : parsedRows),
    [showOnlyValid, validRows, parsedRows]
  );

  const isSpreadsheet = launchType === 'xlsx' || launchType === 'csv';

  // ==========================================
  // Envio dos Lançamentos
  // ==========================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSpreadsheet) {
        if (validRows.length === 0) {
          alert('Por favor, carregue uma planilha .xlsx com lançamentos válidos antes de confirmar.');
          setIsSubmitting(false);
          return;
        }

        const bulkLaunches: Omit<Expense, 'id' | 'createdAt' | 'status'>[] = validRows.map((r) => ({
          userId: r.userId,
          userName: r.cadetName,
          cadetNumber: r.cadetNumber,
          clubId: r.clubId,
          clubName: r.clubName,
          description: r.description,
          amount: r.amount,
          category: r.category,
          billingPeriod: r.billingPeriod,
          launchType: 'xlsx',
          createdBy: r.createdBy,
          createdByName: r.createdByName,
        }));

        await onLaunchBulk(bulkLaunches);
        const skippedCount = invalidRows.length;
        alert(
          `Sucesso! ${validRows.length} lançamentos da planilha foram registrados na cédula!` +
            (skippedCount > 0 ? ` (${skippedCount} linha(s) com erros foram descartadas automaticamente).` : '')
        );
        onClose();
        return;
      }

      const numAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        alert('Por favor, insira um valor válido maior que R$ 0,00.');
        setIsSubmitting(false);
        return;
      }

      if (!description.trim()) {
        alert('Por favor, informe a descrição do gasto.');
        setIsSubmitting(false);
        return;
      }

      if (launchType === 'individual' || launchType === 'event_non_member') {
        const targetCadet = allCadets.find((c) => c.id === selectedCadetId);
        if (!targetCadet) return;

        await onLaunchIndividual({
          userId: targetCadet.id,
          userName: targetCadet.warName,
          cadetNumber: targetCadet.cadetNumber,
          clubId: club.id,
          clubName: club.name,
          description: description.trim(),
          amount: numAmount,
          category,
          billingPeriod,
          launchType,
          createdBy: managerUser.id,
          createdByName: managerUser.warName,
          isNonMemberEvent: launchType === 'event_non_member',
        });

        alert(`Gasto de R$ ${numAmount.toFixed(2)} lançado na cédula de ${targetCadet.cadetNumber} ${targetCadet.warName}!`);
        onClose();
      } else if (launchType === 'bulk') {
        if (selectedCadetIds.length === 0) {
          alert('Selecione ao menos um cadete para o lançamento em lote.');
          setIsSubmitting(false);
          return;
        }

        const bulkList: Omit<Expense, 'id' | 'createdAt' | 'status'>[] = selectedCadetIds.map((cId) => {
          const c = allCadets.find((item) => item.id === cId)!;
          return {
            userId: c.id,
            userName: c.warName,
            cadetNumber: c.cadetNumber,
            clubId: club.id,
            clubName: club.name,
            description: description.trim(),
            amount: numAmount,
            category,
            billingPeriod,
            launchType: 'bulk',
            createdBy: managerUser.id,
            createdByName: managerUser.warName,
          };
        });

        await onLaunchBulk(bulkList);
        alert(`Gasto lançado com sucesso para ${bulkList.length} cadetes!`);
        onClose();
      }
    } catch (err) {
      console.error('Erro ao lançar gasto:', err);
      alert('Erro ao registrar lançamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCadetObj = allCadets.find((c) => c.id === selectedCadetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-xl md:max-w-3xl lg:max-w-4xl rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 my-8 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Lançar Gasto na Cédula</h3>
              <p className="text-xs text-slate-400">
                Clube Principal: <strong className="text-amber-400">{club.name}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            ✕
          </button>
        </div>

        {/* Alerta de Cadete Lido via QR Code */}
        {scannedCadet && selectedCadetObj && (
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center space-x-2.5 animate-in fade-in">
            <QrCode className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
            <div>
              <span>Cadete Lido via QR Code: </span>
              <span className="font-mono text-white text-sm ml-1">
                {selectedCadetObj.cadetNumber} {selectedCadetObj.warName}
              </span>
            </div>
          </div>
        )}

        {/* Seleção do Tipo de Lançamento */}
        <div className={`grid grid-cols-3 gap-2 p-1.5 rounded-2xl border text-xs font-bold ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setLaunchType('individual')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              launchType === 'individual'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Individual</span>
          </button>

          <button
            type="button"
            onClick={() => setLaunchType('bulk')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              launchType === 'bulk'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Em Lote</span>
          </button>

          <button
            type="button"
            onClick={() => setLaunchType('xlsx')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              isSpreadsheet
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar Planilha (.xlsx)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Lançamento Individual */}
          {launchType === 'individual' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Selecionar Cadete Target</label>
              <div className="relative">
                <div className={`flex items-center w-full border rounded-2xl overflow-hidden transition-all ${
                  isSearchDropdownOpen ? 'ring-2 ring-amber-500/50' : ''
                } ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                }`}>
                  <Search className={`w-4 h-4 ml-4 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar por nome, nome de guerra ou número..."
                    value={cadetSearchQuery}
                    onChange={(e) => {
                      setCadetSearchQuery(e.target.value);
                      setIsSearchDropdownOpen(true);
                    }}
                    onFocus={() => setIsSearchDropdownOpen(true)}
                    className={`w-full px-3 py-3 text-xs font-semibold focus:outline-none bg-transparent ${
                      isDark ? 'text-slate-100 placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  {cadetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCadetSearchQuery('');
                        setSelectedCadetId('');
                        setIsSearchDropdownOpen(true);
                        searchInputRef.current?.focus();
                      }}
                      className={`mr-2 p-1 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isSearchDropdownOpen && (
                  <div
                    ref={searchDropdownRef}
                    className={`absolute z-50 w-full mt-1 max-h-48 overflow-y-auto border rounded-2xl shadow-xl ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    {filteredCadetsIndividual.length === 0 ? (
                      <div className={`px-4 py-3 text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Nenhum cadete encontrado para "{cadetSearchQuery}"
                      </div>
                    ) : (
                      filteredCadetsIndividual.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCadetId(c.id);
                            setCadetSearchQuery(`${c.cadetNumber} ${c.warName}`);
                            setIsSearchDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors flex items-center space-x-2 ${
                            selectedCadetId === c.id
                              ? isDark
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-amber-50 text-amber-700'
                              : isDark
                                ? 'hover:bg-slate-800 text-slate-200'
                                : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="font-mono text-amber-400 font-bold shrink-0">{c.cadetNumber}</span>
                          <span className="font-bold">{c.warName}</span>
                          <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'}`}>({c.name})</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Cadete selecionado indicator */}
              {selectedCadetId && !isSearchDropdownOpen && (() => {
                const sel = allCadets.find((c) => c.id === selectedCadetId);
                return sel ? (
                  <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-[11px] font-bold ${
                    isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Selecionado: {sel.cadetNumber} {sel.warName}</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* 2. Lançamento em Lote */}
          {launchType === 'bulk' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Selecionar Cadetes ({selectedCadetIds.length} selecionados)</label>
              <div className={`flex items-center w-full border-b px-3 py-2 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <Search className={`w-3.5 h-3.5 mr-2 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Filtrar cadetes..."
                  value={bulkSearchQuery}
                  onChange={(e) => setBulkSearchQuery(e.target.value)}
                  className={`w-full text-xs font-semibold focus:outline-none bg-transparent ${
                    isDark ? 'text-slate-100 placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                {bulkSearchQuery && (
                  <button type="button" onClick={() => setBulkSearchQuery('')} className={`p-0.5 rounded ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className={`max-h-40 overflow-y-auto border rounded-2xl p-3 space-y-2 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
              }`}>
                {filteredCadetsBulk.length === 0 ? (
                  <div className={`text-center py-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Nenhum cadete encontrado para "{bulkSearchQuery}"
                  </div>
                ) : (
                  filteredCadetsBulk.map((c) => (
                    <label key={c.id} className="flex items-center space-x-2 cursor-pointer hover:opacity-80">
                      <input
                        type="checkbox"
                        checked={selectedCadetIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCadetIds([...selectedCadetIds, c.id]);
                          else setSelectedCadetIds(selectedCadetIds.filter((id) => id !== c.id));
                        }}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="font-mono text-amber-400 font-bold">{c.cadetNumber}</span>
                      <span>{c.warName}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. Lançamento via Planilha Excel (.xlsx) */}
          {isSpreadsheet && (
            <div className="space-y-4">
              
              {/* Barra de Ações: Upload e Baixar Modelo */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">
                      {spreadsheetFileName ? spreadsheetFileName : 'Importar Lançamentos via Planilha'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {spreadsheetFileName
                        ? `${parsedRows.length} linha(s) processada(s) da planilha`
                        : 'Formatos aceitos: .xlsx, .xls (com colunas de Cadete, Clube, Responsável, Valor)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="Baixar planilha pré-formatada de exemplo"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Baixar Modelo (.xlsx)</span>
                  </button>

                  <label className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-md transition-all flex items-center space-x-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{spreadsheetFileName ? 'Trocar Planilha' : 'Carregar .xlsx'}</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Mensagem de Erro de Processamento */}
              {parseError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Estado Carregando */}
              {isParsing && (
                <div className="p-8 rounded-2xl border border-slate-800 bg-slate-950 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">Lendo e validando linhas da planilha...</p>
                </div>
              )}

              {/* Tabela de Prévia e Resumo */}
              {!isParsing && parsedRows.length > 0 && (
                <div className="space-y-3">
                  
                  {/* Resumo de Validação */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block font-semibold">Total Linhas</span>
                      <strong className="text-sm font-bold">{parsedRows.length}</strong>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                      <span className="text-[10px] block font-semibold opacity-80">Válidos</span>
                      <strong className="text-sm font-bold">{validRows.length}</strong>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      invalidRows.length > 0
                        ? isDark ? 'bg-amber-950/20 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <span className="text-[10px] block font-semibold opacity-80">Avisos / Descarte</span>
                      <strong className="text-sm font-bold">{invalidRows.length}</strong>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-slate-200 text-amber-600'}`}>
                      <span className="text-[10px] text-slate-400 block font-semibold">Total a Lançar</span>
                      <strong className="text-sm font-bold font-mono">
                        R$ {totalValidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>

                  {/* Filtro da Prévia */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="font-bold text-slate-300">
                      Prévia dos Lançamentos ({displayedRows.length} exibidos)
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setShowOnlyValid(!showOnlyValid)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors border ${
                          showOnlyValid
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {showOnlyValid ? 'Mostrando apenas válidos' : 'Mostrar todos'}
                      </button>
                    </div>
                  </div>

                  {/* Tabela Rolável */}
                  <div className={`max-h-60 overflow-y-auto overflow-x-auto rounded-2xl border text-xs ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <table className="w-full text-left border-collapse min-w-[620px]">
                      <thead>
                        <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                          isDark ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}>
                          <th className="p-2.5 w-10 text-center">#</th>
                          <th className="p-2.5">Cadete</th>
                          <th className="p-2.5">Clube</th>
                          <th className="p-2.5">Responsável</th>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Mês</th>
                          <th className="p-2.5 text-right">Valor</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {displayedRows.map((r) => (
                          <tr
                            key={r.id}
                            className={`transition-colors ${
                              !r.isValid
                                ? isDark ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-red-50/50 hover:bg-red-50'
                                : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-white'
                            }`}
                          >
                            <td className="p-2.5 text-center text-slate-500 font-mono text-[10px]">
                              {r.rowNumber}
                            </td>
                            <td className="p-2.5">
                              <div className="font-bold flex items-center space-x-1.5">
                                <span className="font-mono text-amber-400">{r.cadetNumber || '-'}</span>
                                <span className="truncate max-w-[110px]" title={r.cadetName}>{r.cadetName}</span>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 truncate max-w-[100px] inline-block" title={r.clubName}>
                                {r.clubName}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="text-slate-300 text-[11px] truncate max-w-[90px] block" title={r.createdByName}>
                                {r.createdByName}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="text-slate-400 text-[11px] truncate max-w-[120px] block" title={r.description}>
                                {r.description}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-slate-400">
                              {r.billingPeriod}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                              R$ {r.amount.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              {r.isValid ? (
                                <span className="inline-flex items-center text-emerald-400 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  OK
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center text-red-400 text-[10px] font-bold cursor-help"
                                  title={r.errorReason}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                  Erro
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(r.id)}
                                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Remover da importação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {invalidRows.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Atenção: <strong>{invalidRows.length}</strong> linha(s) com erros serão descartadas automaticamente na importação. Apenas as <strong>{validRows.length}</strong> linhas válidas serão gravadas.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Campos Comuns (Descrição e Valor) para Individual/Lote */}
          {!isSpreadsheet && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Valor do Gasto (R$)</label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-3 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className={`w-full border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Consumo">Consumo / Produto</option>
                    <option value="Mensalidade">Mensalidade</option>
                    <option value="Evento">Evento / Inscrição</option>
                    <option value="Equipamento">Equipamento</option>
                    <option value="Taxa Avulsa">Taxa Avulsa</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Descrição do Gasto</label>
                <input
                  type="text"
                  placeholder="Ex: Consumo Bar do Clube, Camiseta Oficial, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>
            </>
          )}

          {/* Rodapé com Mês e Botão de Envio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isSpreadsheet ? 'Mês de Cobrança Padrão (Fallback)' : 'Mês de Cobrança'}
              </label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className={`w-full border rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="2026-10">Outubro / 2026 (Prévia)</option>
                <option value="2026-09">Setembro / 2026</option>
                <option value="2026-08">Agosto / 2026</option>
                <option value="2026-07">Julho / 2026</option>
                <option value="2026-06">Junho / 2026</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting || (isSpreadsheet && validRows.length === 0)}
                className={`w-full py-3 rounded-2xl font-extrabold text-xs shadow-lg transition-all ${
                  isSpreadsheet && validRows.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white cursor-pointer'
                }`}
              >
                {isSubmitting
                  ? 'Gravando...'
                  : isSpreadsheet
                  ? validRows.length > 0
                    ? `Confirmar ${validRows.length} Lançamento(s) (R$ ${totalValidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
                    : 'Carregue uma planilha com dados'
                  : 'Confirmar Lançamento'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
