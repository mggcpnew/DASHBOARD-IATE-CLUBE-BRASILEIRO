import * as XLSX from "xlsx";

export interface MonthlyDelinquency {
  monthYear: string; // "01/2025"
  label: string; // "Jan/25"
  faturadas: number;
  recebidasNoMes: number;
  sociosPagantes: number;
  sociosSocial: number;
  sociosNautica: number;
  inadimplenciaMensalidades: number; // percentage
  inadimplenciaSocios: number; // percentage
}

export interface CompetencePayment {
  month: string; // "Janeiro"
  label: string; // "Jan"
  antecipado: number;
  mesCorrente: number;
  emAtraso: number;
  total: number;
  inadimplencia: number; // percentage
}

export interface DelinquencyData {
  monthly: MonthlyDelinquency[];
  competence: CompetencePayment[];
  isValid: boolean;
  year: string;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

const COMPETENCE_LABELS: Record<string, string> = {
  "DEZEMBRO": "Dez", "JANEIRO": "Jan", "FEVEREIRO": "Fev",
  "MARÇO": "Mar", "ABRIL": "Abr", "MAIO": "Mai",
  "JUNHO": "Jun", "JULHO": "Jul", "AGOSTO": "Ago",
  "SETEMBRO": "Set", "OUTUBRO": "Out", "NOVEMBRO": "Nov",
};

function parsePercentage(val: unknown): number {
  if (typeof val === "number") {
    // If it looks like already a percentage (e.g. 6.86), return as-is
    // If it looks like a decimal (e.g. 0.0686), multiply by 100
    return Math.abs(val) < 1 ? val * 100 : val;
  }
  if (typeof val === "string") {
    const cleaned = val.replace("%", "").replace(",", ".").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function safeNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const num = parseFloat(val.replace(",", ".").trim());
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function parseDelinquencyFile(file: File): Promise<DelinquencyData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        const result = extractDelinquencyData(rows);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

function extractDelinquencyData(rows: unknown[][]): DelinquencyData {
  const monthly: MonthlyDelinquency[] = [];
  const competence: CompetencePayment[] = [];
  let year = "2026";

  // Find the year from the first cell
  for (const row of rows) {
    const firstCell = String(row[0] || "");
    const yearMatch = firstCell.match(/(\d{4})/);
    if (yearMatch) {
      year = yearMatch[1];
      break;
    }
  }

  // Strategy: scan rows for monthly data patterns (MM/YYYY format in first column)
  let inCompetenceSection = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const firstCell = String(row[0] || "").trim();

    // Detect competence section
    if (firstCell.includes("COMPETÊNCIA") || firstCell.includes("COMPETENCIA")) {
      inCompetenceSection = true;
      continue;
    }

    // Monthly data: first cell matches MM/YYYY pattern
    const monthYearMatch = firstCell.match(/^(\d{2})\/(\d{4})$/);
    if (monthYearMatch && !inCompetenceSection) {
      const mm = monthYearMatch[1];
      const yyyy = monthYearMatch[2];
      const label = `${MONTH_LABELS[mm] || mm}/${yyyy.slice(2)}`;

      monthly.push({
        monthYear: firstCell,
        label,
        faturadas: safeNumber(row[1]),
        recebidasNoMes: safeNumber(row[3]),
        sociosPagantes: safeNumber(row[4]),
        sociosSocial: safeNumber(row[5]),
        sociosNautica: safeNumber(row[6]),
        inadimplenciaMensalidades: parsePercentage(row[7]),
        inadimplenciaSocios: parsePercentage(row[8]),
      });
      continue;
    }

    // Competence data: first cell is a month name
    const upperFirst = firstCell.toUpperCase();
    if (inCompetenceSection && COMPETENCE_LABELS[upperFirst]) {
      competence.push({
        month: firstCell,
        label: COMPETENCE_LABELS[upperFirst],
        antecipado: safeNumber(row[1]),
        mesCorrente: safeNumber(row[2]),
        emAtraso: safeNumber(row[3]),
        total: safeNumber(row[4]),
        inadimplencia: parsePercentage(row[5]),
      });
    }
  }

  return {
    monthly,
    competence,
    isValid: monthly.length > 0,
    year,
  };
}
