import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Clean phone string to contain only digits and optional leading +
 */
export function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Checks for obvious fake patterns (sequential or repeating digits)
 */
export function hasInvalidRepeatedOrSequentialDigits(digitsOnly: string): boolean {
  if (/^(\d)\1+$/.test(digitsOnly)) return true;
  
  const seqAsc = '01234567890123456789';
  const seqDesc = '98765432109876543210';
  if (seqAsc.includes(digitsOnly) || seqDesc.includes(digitsOnly)) return true;
  
  return false;
}

/**
 * Validates a phone number based on strict rules for Ecuador and USA
 */
export function validatePhoneNumber(phone: string, country?: 'USA' | 'Ecuador'): { isValid: boolean; error?: string; normalized?: string } {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'El teléfono es obligatorio.' };
  }

  const trimmed = phone.trim();
  const basicPhoneRegex = /^\+?[0-9\s\-()]+$/;
  if (!basicPhoneRegex.test(trimmed)) {
    return { isValid: false, error: 'No se permiten letras ni caracteres inválidos en el teléfono.' };
  }

  const cleaned = cleanPhone(trimmed);
  const digitsOnly = cleaned.replace(/^\+/, '');

  if (hasInvalidRepeatedOrSequentialDigits(digitsOnly)) {
    return { isValid: false, error: 'El número de teléfono ingresado no parece real.' };
  }

  // Determine candidate countries if not explicitly provided
  const isUSACandidate = country ? country === 'USA' : (cleaned.startsWith('+1') || (digitsOnly.length === 10 && !cleaned.startsWith('+') && !cleaned.startsWith('0') && !cleaned.startsWith('593')));
  const isEcuadorCandidate = country ? country === 'Ecuador' : (cleaned.startsWith('+593') || cleaned.startsWith('593') || (digitsOnly.length === 10 && digitsOnly.startsWith('09')) || (digitsOnly.length === 9 && digitsOnly.startsWith('0')));

  if (isUSACandidate) {
    // USA Rules:
    // - Must have 10 digits (without +1 prefix) or 11 digits (if starts with +1/1)
    if (cleaned.startsWith('+1')) {
      if (digitsOnly.length !== 11 || !digitsOnly.startsWith('1')) {
        return { isValid: false, error: 'El teléfono para USA debe tener 10 dígitos.' };
      }
    } else if (cleaned.startsWith('1') && digitsOnly.length === 11) {
      // 1XXXXXXXXXX
    } else {
      if (digitsOnly.length !== 10) {
        return { isValid: false, error: 'El teléfono para USA debe tener 10 dígitos.' };
      }
    }
    const mainDigits = digitsOnly.length === 11 ? digitsOnly.slice(1) : digitsOnly;
    return { isValid: true, normalized: `+1${mainDigits}` };
  }

  if (isEcuadorCandidate) {
    // Ecuador Rules:
    let localDigits = digitsOnly;
    if (cleaned.startsWith('+593')) {
      localDigits = digitsOnly.slice(3); // remove 593
    } else if (cleaned.startsWith('593') && digitsOnly.length >= 11) {
      localDigits = digitsOnly.slice(3);
    }

    if (localDigits.startsWith('0')) {
      localDigits = localDigits.slice(1);
    }

    const isMobile = localDigits.startsWith('9') && localDigits.length === 9;
    const isLandline = /^[2-7]/.test(localDigits) && localDigits.length === 8;

    if (!isMobile && !isLandline) {
      return { isValid: false, error: 'El teléfono para Ecuador debe tener un formato válido.' };
    }

    return { isValid: true, normalized: `+593${localDigits}` };
  }

  return { isValid: false, error: 'Ingresa un número de teléfono válido.' };
}

/**
 * Normalizes a phone number to standard format
 */
export function normalizePhoneNumber(phone: string, country?: 'USA' | 'Ecuador'): string {
  const validation = validatePhoneNumber(phone, country);
  if (validation.isValid) {
    return validation.normalized!;
  }
  return cleanPhone(phone);
}

export function phoneValidator(country?: 'USA' | 'Ecuador'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Don't validate if empty. Use Validators.required if required.
    }
    const result = validatePhoneNumber(value, country);
    if (!result.isValid) {
      return { invalidPhone: result.error };
    }
    return null;
  };
}
