import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const raw = control.value;
  if (raw === null || raw === undefined || raw === '') return null;

  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 11) return { cpfInvalid: true };
  if (/^(\d)\1+$/.test(digits)) return { cpfInvalid: true };

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +digits[i] * (10 - i);
  let remainder = sum % 11;
  const check1 = remainder < 2 ? 0 : 11 - remainder;
  if (check1 !== +digits[9]) return { cpfInvalid: true };

  sum = 0;
  for (let i = 0; i < 10; i++) sum += +digits[i] * (11 - i);
  remainder = sum % 11;
  const check2 = remainder < 2 ? 0 : 11 - remainder;
  if (check2 !== +digits[10]) return { cpfInvalid: true };

  return null;
}

export function minAgeValidator(minAge: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const birth = new Date(control.value);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= minAge ? null : { minAge: { required: minAge, actual: age } };
  };
}
