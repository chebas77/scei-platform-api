import { passwordProblems } from './password-policy';

describe('política de contraseñas', () => {
  it('acepta una frase larga', () => expect(passwordProblems('Montana-Azul-Rio-Fuerte-26', 'x@y.pe')).toEqual([]));
  it('rechaza cortas, repetidas, comunes y con el correo', () => {
    expect(passwordProblems('corta')).not.toEqual([]);
    expect(passwordProblems('aaaaaaaaaaaaaa')).not.toEqual([]);
    expect(passwordProblems('password1234')).not.toEqual([]);
    expect(passwordProblems('Soporte-Larga-2026', 'soporte@plataforma.pe')).not.toEqual([]);
  });
  it('limita la longitud máxima (DoS sobre argon2)', () => expect(passwordProblems('a1'.repeat(80))).not.toEqual([]));
});
