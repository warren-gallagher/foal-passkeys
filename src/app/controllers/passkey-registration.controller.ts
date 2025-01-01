import { Context, Config, Post, HttpResponseOK, ApiUseTag, ApiRequestBody, IApiSchema, dependency, HttpResponseConflict, ApiResponse, Logger, HttpResponseNotFound, HttpResponseBadRequest } from '@foal/core';
import { z } from 'zod';
import { generateSchema } from '@anatine/zod-openapi';
import { UserService } from '../services/user.service';
import { generateRegistrationOptions, verifyRegistrationResponse, RegistrationResponseJSON } from '@simplewebauthn/server';
import { CredentialService } from '../services/credential.service';
import { uint8ArrayToBase64 } from '../utils/utils';

const RegisterStartRequestSchema = z.object({
  email: z.string().email()
});

const RelyingPartyConfigSchema = z.object({
  name: z.string(),
  id: z.string(),
  origin: z.string().url()
});

type RegisterStartRequest = z.infer<typeof RegisterStartRequestSchema>;

interface RegistrationContext {
  userId: string,
  challenge: string
}


@ApiUseTag('/api/passkey-registration - apis to register with passkey')
export class PasskeyRegistrationController {
  @dependency logger: Logger;
  @dependency userService: UserService;
  @dependency credentialService: CredentialService;

  @Post('/register-start')
  @ApiRequestBody({
    required: true,
    content: {
      'application/json': { schema: generateSchema(RegisterStartRequestSchema, false, '3.0') as IApiSchema }
    }
  })
  @ApiResponse(200, { description: 'successful operation' })
  @ApiResponse(400, { description: 'invalid email address in request body' })
  @ApiResponse(409, { description: 'user with email already exists' })
  async registerStart(ctx: Context, {}, body: RegisterStartRequest) {
   
    let user = await this.userService.getByEmail(body.email);
    if (user) {
        return new HttpResponseConflict({reason: `User with email ${body.email} already exists`});
    }
        
    user = await this.userService.create(body.email);

    const relyingParty = RelyingPartyConfigSchema.parse(Config.getOrThrow('relyingParty'));
    const userID = Buffer.from(user.id, 'utf8');
    const options = await generateRegistrationOptions({
        rpName: relyingParty.name,
        rpID: relyingParty.id,
        userID: userID,
        userName: user.email,
        timeout: 60000,
        attestationType: 'direct',
        excludeCredentials: [],
        authenticatorSelection: {
            residentKey: 'preferred'
        },
        // Support for the two most common algorithms: ES256, and RS256
        supportedAlgorithmIDs: [-7, -257],
    });

    // set a signed cookie that has the userId and challenge it so we can get it back in registerFinish()
    const context : RegistrationContext = {
      userId: user.id,
      challenge: options.challenge
    };
    const encodedContext = Buffer.from(JSON.stringify(context)).toString('base64');
    return new HttpResponseOK(options).setCookie('pkRegisterContext', encodedContext, {httpOnly: true, signed: true});
  }

  @Post('/register-finish')
  async registerFinish(ctx: Context, {}, body: RegistrationResponseJSON) {
    // retrieve the signed cookie set in registerStart()
    const encodedContext = ctx.request.signedCookies['pkRegisterContext'] as string;
    const decodedContext: RegistrationContext = JSON.parse(Buffer.from(encodedContext, 'base64').toString());
    const { userId, challenge } = decodedContext;
    if (!userId) {
      return new HttpResponseNotFound({reason: 'userId not found in saved context'})
    }
    const user = await this.userService.getById(userId);
    if( !user ) {
      return new HttpResponseNotFound({reason: `user not found using userId${userId}`});
    }
    if (!challenge) {
      return new HttpResponseNotFound({reason: 'challenge not found in saved context'})
    }
 
    const relyingParty = RelyingPartyConfigSchema.parse(Config.getOrThrow('relyingParty'));

    const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: relyingParty.origin,
            expectedRPID: relyingParty.id,
            requireUserVerification: true,
    });
    if (verification.verified && verification.registrationInfo) {
        const { registrationInfo } = verification;
        const { credential } = registrationInfo;
        const {publicKey, id, counter} = credential;
        await this.credentialService.create(user, id, uint8ArrayToBase64(publicKey), counter, body.response.transports as string[]);
        this.logger.debug(`registerFinish for user=${JSON.stringify(user,null,2)}`);
        return new HttpResponseOK({verified: true}).setCookie('pkRegisterContext', '', {httpOnly: true, signed: true});
    }
    return new HttpResponseBadRequest({reason: 'Verification failed'});
  }
}
