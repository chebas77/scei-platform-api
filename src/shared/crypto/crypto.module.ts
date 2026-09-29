import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env';
import { CLOCK, SystemClock } from '../clock/clock.port';
import { Argon2PasswordHasher } from './argon2-password-hasher';
import { AesGcmSecretCipher, HmacSigner, PASSWORD_HASHER, SECRET_CIPHER, SIGNER } from './crypto.ports';

@Global()
@Module({
  providers: [
    { provide: SECRET_CIPHER, inject: [APP_CONFIG], useFactory: (c: AppConfig) => new AesGcmSecretCipher(c.MASTER_KEY) },
    { provide: SIGNER, inject: [APP_CONFIG], useFactory: (c: AppConfig) => new HmacSigner(c.SIGNING_KEY) },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [SECRET_CIPHER, SIGNER, PASSWORD_HASHER, CLOCK],
})
export class CryptoModule {}
