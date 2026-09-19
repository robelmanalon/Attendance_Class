// Parses pasted student lists into structured entries.
//
// Supported formats:
//  1. Student number + name separated by tab(s)
//  2. Student number + name separated by one or more spaces or commas
//  3. Name only (one student per line)
//  4. Excel / Google Sheets copied rows (tab separated)

const NAME_SEPARATOR_PATTERNS = [/\t+/, /\s{2,}/, /,\s*/, /;\s*/];

/**
 * Split a raw line into [studentNumber, fullName] when possible.
 * Returns null if the line cannot be interpreted as an entry.
 */
function parseLine(rawLine) {
  let line = rawLine.trim();
  // Remove trailing empty separators / stray commas at the end.
  line = line.replace(/[,;\t]+$/, '').trim();
  if (!line) return null;

  // Try each separator; first token must look like a student number.
  for (const pattern of NAME_SEPARATOR_PATTERNS) {
    const parts = line.split(pattern).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2 && looksLikeStudentNumber(parts[0])) {
      const name = parts.slice(1).join(' ').trim();
      if (name) {
        return { studentNumber: normalizeStudentNumber(parts[0]), fullName: name };
      }
    }
  }

  // Fallback: single-space separated "2026-001 Juan Dela Cruz".
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && looksLikeStudentNumber(words[0])) {
    const name = words.slice(1).join(' ').trim();
    if (name) {
      return { studentNumber: normalizeStudentNumber(words[0]), fullName: name };
    }
  }

  // No numeric id detected -> treat entire line as a name.
  if (!looksLikeStudentNumber(words[0])) {
    return { studentNumber: null, fullName: line };
  }

  return null;
}

function looksLikeStudentNumber(token) {
  return /^\d{3,}-\d{2,}$/.test(token) || /^\d{6,}$/.test(token);
}

function normalizeStudentNumber(token) {
  return token.replace(/[^\w-]/g, '').toUpperCase();
}

/**
 * Validate a student name.
 * @returns {string|null} error message or null if valid
 */
function validateName(name) {
  if (!name || !name.trim()) return 'Missing name';
  if (name.trim().length < 3) return 'Name too short';
  if (!/[a-zA-Z\u00C0-\u017F]/.test(name)) return 'Name has no letters';
  if (name.trim().split(/\s+/).length > 6) return 'Too many words';
  return null;
}

/**
 * Parse a full pasted block of text.
 * Returns { entries, errors }
 *  entry: { raw, studentNumber, fullName, error }
 */
export function parseStudentList(text) {
  if (!text || typeof text !== 'string') {
    return { entries: [], errors: [] };
  }
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\r/g, '').trim())
    .filter(Boolean);

  const entries = [];
  const errors = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      errors.push({ raw: line, reason: 'Unrecognized format' });
      continue;
    }
    const nameError = validateName(parsed.fullName);
    if (nameError) {
      errors.push({ raw: line, reason: nameError });
      continue;
    }
    entries.push({
      studentNumber: parsed.studentNumber,
      fullName: parsed.fullName,
    });
  }

  return { entries, errors };
}

/**
 * Detect duplicate student numbers, and mark entries that already exist in a class.
 * The first occurrence of a student number is kept; later ones are flagged.
 */
export function analyzeImport(entries, existingStudents = [], existingNumbers = new Set()) {
  const existing = new Set(existingStudents.map((s) => String(s.studentNumber || '').toUpperCase()).filter(Boolean));
  const allExisting = new Set([...existing, ...existingNumbers]);
  const seen = new Set();
  const normalized = entries.map((e) => {
    const num = e.studentNumber ? String(e.studentNumber).toUpperCase() : null;
    const status = {
      duplicate: !!num && seen.has(num),
      alreadyExisting: !!num && allExisting.has(num),
    };
    if (num && !status.duplicate) seen.add(num);
    return { ...e, studentNumber: num, status };
  });
  return normalized;
}

/**
 * Generate a deterministic-ish unique student number for entry index.
 * Format: YYYY-<index+1> zero padded.
 */
export function generateMissingStudentNumber(entry, index) {
  const year = new Date().getFullYear();
  const seq = String(index + 1).padStart(3, '0');
  return `${year}-${seq}`;
}