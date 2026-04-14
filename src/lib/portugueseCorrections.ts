/**
 * Correções ortográficas para nomes de categorias financeiras.
 * Mapeia texto normalizado (lowercase, sem acentos) para a forma correta.
 */
const CORRECTIONS: Record<string, string> = {
  // Acentuação
  "agua": "Água",
  "gas": "Gás",
  "energia": "Energia",
  "manutencao nautica": "Manutenção Náutica",
  "manutencao geral": "Manutenção Geral",
  "manutencao piscina": "Manutenção Piscina",
  "manutencao predial": "Manutenção Predial",
  "manutencao": "Manutenção",
  "servicos de terceiros": "Serviços de Terceiros",
  "servicos": "Serviços",
  "custos com pessoal": "Custos com Pessoal",
  "eventos sociais": "Eventos Sociais",
  "competicoes de vela": "Competições de Vela",
  "competicoes": "Competições",
  "obra de prevencao e recuperacao": "Obra de Prevenção e Recuperação",
  "obra de prevencao": "Obra de Prevenção",
  "prevencao": "Prevenção",
  "imobilizado": "Imobilizado",
  "outros": "Outros",
  "provisao 13": "Provisão 13º",
  "provisao": "Provisão",
  "aplicacao": "Aplicação",
  "posicao de caixa": "Posição de Caixa",
  "posicao": "Posição",
  "contribuicao": "Contribuição",
  "contribuicoes": "Contribuições",
  "mensalidades": "Mensalidades",
  "titulos patrimoniais": "Títulos Patrimoniais",
  "titulos": "Títulos",
  "taxas": "Taxas",
  "locacao": "Locação",
  "locacoes": "Locações",
  "estacionamento": "Estacionamento",
  "receitas financeiras": "Receitas Financeiras",
  "receitas diversas": "Receitas Diversas",
  "comunicacao": "Comunicação",
  "alimentacao": "Alimentação",
  "seguranca": "Segurança",
  "limpeza e conservacao": "Limpeza e Conservação",
  "conservacao": "Conservação",
  "administracao": "Administração",
  "obrigacoes": "Obrigações",
  "educacao": "Educação",
  "recreacao": "Recreação",
  "natacao": "Natação",
};

/**
 * Normaliza texto removendo acentos e convertendo para lowercase.
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Corrige a ortografia de um nome de categoria.
 * Tenta match exato primeiro, depois match parcial para palavras individuais.
 */
export function correctPortuguese(text: string): string {
  if (!text) return text;

  const normalized = normalizeForMatch(text);

  // Exact match (case-insensitive, accent-insensitive)
  if (CORRECTIONS[normalized]) {
    // Preserve original casing style (all caps vs title case)
    const isAllCaps = text === text.toUpperCase();
    const corrected = CORRECTIONS[normalized];
    return isAllCaps ? corrected.toUpperCase() : corrected;
  }

  // Try matching each known correction as a substring/word replacement
  let result = text;
  // Sort by length descending to match longer phrases first
  const sortedKeys = Object.keys(CORRECTIONS).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const normalizedResult = normalizeForMatch(result);
    const idx = normalizedResult.indexOf(key);
    if (idx !== -1) {
      // Check it's a word boundary match
      const before = idx > 0 ? normalizedResult[idx - 1] : " ";
      const after = idx + key.length < normalizedResult.length ? normalizedResult[idx + key.length] : " ";
      if (/[\s\-_,;.()]/.test(before) || idx === 0) {
        if (/[\s\-_,;.()]/.test(after) || idx + key.length === normalizedResult.length) {
          const original = result.substring(idx, idx + key.length);
          const isAllCaps = original === original.toUpperCase();
          const corrected = isAllCaps ? CORRECTIONS[key].toUpperCase() : CORRECTIONS[key];
          result = result.substring(0, idx) + corrected + result.substring(idx + key.length);
        }
      }
    }
  }

  return result;
}
