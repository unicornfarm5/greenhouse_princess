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

const UNSAFE_TEXT_PATTERN = /[<>\u0000-\u001f\u007f]/;

export function validateTextField(value, maxLength, minLength = 1) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength || UNSAFE_TEXT_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function validateEmail(value) {
  const trimmed = validateTextField(value, FIELD_LIMITS.email, 3);
  if (!trimmed) {
    return null;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(trimmed) ? trimmed.toLowerCase() : null;
}
