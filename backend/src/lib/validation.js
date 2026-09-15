const MAX_MONEY = 999_999_999_999.99;

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

export function requiredText(value, field, maxLength) {
  const text = String(value ?? '').trim();
  if (!text) throw validationError(`${field} is required`);
  if (text.length > maxLength) throw validationError(`${field} must not exceed ${maxLength} characters`);
  return text;
}

export function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  return requiredText(value, field, maxLength);
}

export function money(value, field, { allowZero = false } = {}) {
  const raw = typeof value === 'number' ? String(value) : String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw validationError(`${field} must be a valid amount with up to 2 decimal places`);
  }
  const amount = Number(raw);
  if (!Number.isSafeInteger(Math.round(amount * 100)) || amount > MAX_MONEY || (allowZero ? amount < 0 : amount <= 0)) {
    throw validationError(`${field} must be a valid ${allowZero ? 'non-negative' : 'positive'} amount`);
  }
  return amount;
}

export function optionalDate(value, field) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw validationError(`${field} must be a valid date`);
  return date;
}
