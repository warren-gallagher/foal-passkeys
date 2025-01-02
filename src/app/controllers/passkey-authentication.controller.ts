import { generateAuthenticationOptions, verifyAuthenticationResponse, } from '@simplewebauthn/server';
import {VerifiedAuthenticationResponse, VerifyAuthenticationResponseOpts} from '@simplewebauthn/server/esm';
import { Context, Config, Post, HttpResponseOK, ApiUseTag, ApiRequestBody, IApiSchema, dependency, ApiResponse, Logger, HttpResponseNotFound, HttpResponseBadRequest } from '@foal/core';
import { z } from 'zod';
import { generateSchema } from '@anatine/zod-openapi';
import { UserService } from '../services/user.service';
import { CredentialService } from '../services/credential.service';

const LoginStartRequestSchema = z.object({
  email: z.union([z.literal(''), z.string().email().toLowerCase().trim()])
});

const RelyingPartyConfigSchema = z.object({
  name: z.string(),
  id: z.string(),
  origin: z.string().url()
});

type LoginStartRequest = z.infer<typeof LoginStartRequestSchema>;

export interface LoginContext {
    userId: string,
    challenge: string
}

@ApiUseTag('/api/passkey-authentication - apis to login with passkey') 
export class PasskeyAuthenticationController {
    @dependency logger: Logger;
    @dependency userService: UserService;
    @dependency credentialService: CredentialService;
    
    @Post('/login-start')
    @ApiRequestBody({
        required: true,
        content: {
        'application/json': { schema: generateSchema(LoginStartRequestSchema, false, '3.0') as IApiSchema }
        }
    })
    @ApiResponse(200, { description: 'successful operation' })
    @ApiResponse(400, { description: 'invalid email address in request body' })
    async loginStart(ctx: Context, {}, body: LoginStartRequest) {
        const {email} = body;
        const user = await this.userService.getByEmail(email);
        if (!user && email !== '') {
            return new HttpResponseNotFound({reason: `User with email ${email} not found`});
        }
        const relyingParty = RelyingPartyConfigSchema.parse(Config.getOrThrow('relyingParty'));

        // If user email was supplied then set allowCredentials filtered by the specific user
        const options = await generateAuthenticationOptions({
            timeout: 60000,
            allowCredentials: user ? await this.credentialService.getAllowedCredentials(user.id) : [],
            userVerification: 'required',
            rpID: relyingParty.id
        });
        // set a signed cookie that has the userId and challenge it so we can get it back in LoginFinish()
        const context : LoginContext = {
        userId: user ? user.id : '',
        challenge: options.challenge
        };
        const encodedContext = Buffer.from(JSON.stringify(context)).toString('base64');
        return new HttpResponseOK(options).setCookie('pkLoginContext', encodedContext, {httpOnly: true, signed: true});
    }
 
    @Post('/login-finish')
    async loginFinish(ctx: Context) {
        const body = ctx.request.body;

        // retrieve the signed cookie set in registerStart()
        const encodedContext = ctx.request.signedCookies['pkLoginContext'] as string;
        const decodedContext: LoginContext = JSON.parse(Buffer.from(encodedContext, 'base64').toString());
        const { userId, challenge } = decodedContext;
        if (!userId && userId !== '') {
          return new HttpResponseNotFound({reason: 'userId not found in saved context'})
        }
        const user = await this.userService.getById(userId);
        if( !user && userId !== '' ) {
            return new HttpResponseNotFound({reason: `user not found using userId${userId}`});
        }
        if (!challenge) {
          return new HttpResponseNotFound({reason: 'challenge not found in saved context'})
        }
        const relyingParty = RelyingPartyConfigSchema.parse(Config.getOrThrow('relyingParty'));
 
        const credentialId = body.rawId;
        const credential = await this.credentialService.getById(credentialId);
        if (!credential) {
            return new HttpResponseNotFound({reason: 'Passkey not registered with this site'});
        }
        const opts: VerifyAuthenticationResponseOpts = {
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: relyingParty.origin,
            expectedRPID: relyingParty.id,
            credential: credential
        };
        const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse(opts);
        const { verified, authenticationInfo } = verification;
 
        if (verified) {
            await this.credentialService.updateCounter(
                credentialId,
                authenticationInfo.newCounter
            );
            console.log(`loginFinish with authenticationInfo ${JSON.stringify(authenticationInfo,null,2)}`);

            /**
             * This is where you would add whatever mechanism you want to use to maintain a login session.
             *  Could be session cookies.
             *  Could be JWT
             *  Other
             */
            return new HttpResponseOK({verified: true}).setCookie('pkLoginContext', '', {httpOnly: true, signed: true});
        }
        return new HttpResponseBadRequest({reason: 'Verification failed'});
    }
}