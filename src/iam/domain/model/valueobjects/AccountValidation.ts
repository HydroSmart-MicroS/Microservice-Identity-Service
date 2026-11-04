export function passwordError(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128)
    return 'La contraseña debe tener entre 12 y 128 caracteres.';
  if (/[\u0000-\u001f\u007f]/u.test(value) || !/\p{Lu}/u.test(value) || !/\p{Ll}/u.test(value) || !/[0-9]/u.test(value) || !/[^\p{L}\p{N}\s]/u.test(value))
    return 'Incluye una mayúscula, una minúscula, un número y un símbolo. No uses caracteres de control.';
  return null;
}
export function validText(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum && !/[\u0000-\u001f\u007f]/u.test(value);
}
