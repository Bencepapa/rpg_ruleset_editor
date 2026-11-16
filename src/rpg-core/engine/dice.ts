export type RngFn = () => number;

export function createSeededRng(seed: number): RngFn {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DiceRollTerm {
  count: number;
  sides: number;
  rolls: number[];
  sign: 1 | -1;
}

export interface DiceRollResult {
  expression: string;
  total: number;
  terms: DiceRollTerm[];
  flatBonus: number;
  rawSummary: string;
}

/**
 * Parses and rolls standard AD&D dice expressions like "1d8", "2d6+3", "1d20-2", "+3", "d10", "3d6+1d4+2".
 */
export function rollDiceExpression(expression: string, rng: RngFn = Math.random): DiceRollResult {
  const cleaned = expression.replace(/\s+/g, '').toLowerCase();
  if (!cleaned) {
    return { expression, total: 0, terms: [], flatBonus: 0, rawSummary: '0' };
  }

  const tokenRegex = /([+-]?)(\d*d\d+|\d+)/g;
  let match: RegExpExecArray | null;
  const terms: DiceRollTerm[] = [];
  let flatBonus = 0;
  const summaryParts: string[] = [];

  while ((match = tokenRegex.exec(cleaned)) !== null) {
    const signStr = match[1];
    const token = match[2];
    const sign: 1 | -1 = signStr === '-' ? -1 : 1;

    if (token.includes('d')) {
      const [countStr, sidesStr] = token.split('d');
      const count = countStr ? parseInt(countStr, 10) : 1;
      const sides = parseInt(sidesStr, 10);
      if (Number.isNaN(count) || Number.isNaN(sides) || count <= 0 || sides <= 0) {
        continue;
      }
      const rolls: number[] = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(rng() * sides) + 1);
      }
      terms.push({ count, sides, rolls, sign });
      const prefix = summaryParts.length > 0 ? (sign < 0 ? ' - ' : ' + ') : (sign < 0 ? '-' : '');
      summaryParts.push(`${prefix}[${rolls.join(',')}]`);
    } else {
      const val = parseInt(token, 10) * sign;
      flatBonus += val;
      const prefix = summaryParts.length > 0 ? (val < 0 ? ' - ' : ' + ') : (val < 0 ? '-' : '');
      summaryParts.push(`${prefix}${Math.abs(val)}`);
    }
  }

  const diceSum = terms.reduce(
    (sum, term) => sum + term.sign * term.rolls.reduce((a, b) => a + b, 0),
    0
  );
  const total = diceSum + flatBonus;

  return {
    expression,
    total,
    terms,
    flatBonus,
    rawSummary: summaryParts.join('') || '0',
  };
}

/**
 * Evaluates a check formula with named variables (e.g., "1d20 + dexMod + level").
 */
export function evaluateCheckFormula(
  formula: string,
  variables: Record<string, number>,
  rng: RngFn = Math.random
): DiceRollResult {
  const substituted = formula.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (token) => {
    if (/^\d*d\d+$/i.test(token)) {
      return token;
    }
    if (token in variables) {
      return String(variables[token]);
    }
    return '0';
  });
  // Normalize "+ -2" or "- -2"
  const normalized = substituted
    .replace(/\+\s*-/g, '-')
    .replace(/-\s*-/g, '+');
  return rollDiceExpression(normalized, rng);
}
