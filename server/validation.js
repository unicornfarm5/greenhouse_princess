/* Name: Request validation helpers
  Responsibility: Define field limits and validate text and email input. */

export const FIELD_LIMITS = {
  name: 80,
  sort: 80,
  shouldBeWatered: 120,
  mood: 40,
  email: 160,
  password: 128
};

export function validateTextField(value, maxLength, minLength = 1) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength ? trimmed : null;
}

export function validateEmail(value) {
  const trimmed = validateTextField(value, FIELD_LIMITS.email, 3);
  if (!trimmed) {
    return null;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(trimmed) ? trimmed.toLowerCase() : null;
}
