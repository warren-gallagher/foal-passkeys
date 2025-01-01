import { dependency, Logger } from '@foal/core';
import { User } from '../entities/user.entity';
import { Credential } from '../entities/credential.entity';
import { AuthenticatorTransportFuture, WebAuthnCredential } from '@simplewebauthn/server';
import { base64ToUint8Array } from '../utils/utils';

export class CredentialService {
    @dependency logger: Logger;

    async create(user: User, credentialId: string, publicKey: string, counter: number, transports: string[]) : Promise<Credential> {
        const credential = new Credential();
        credential.id = credentialId;
        credential.user = user;
        credential.publicKey = publicKey;
        credential.counter = counter;
        credential.transports = transports;
        const createdCredential = await credential.save();
        return createdCredential;
    }

    async getById(user: User, id: string): Promise<WebAuthnCredential> {
        const credential = await Credential.findOneBy({ id: id });
        if( !credential ) {
            const error = `Error retrieving credential id=${id} for user ${user.email}`
            this.logger.error(error);
            throw new Error(error);
        }
        const webAuthnCredential: WebAuthnCredential = {
            id: id,
            publicKey: base64ToUint8Array(credential.publicKey),
            counter: credential.counter,
            transports: credential.transports  as AuthenticatorTransportFuture[]
        }
        return webAuthnCredential;
    }

    async getAllowedCredentials(userId: string) : Promise<{id: string, transports?: AuthenticatorTransportFuture[]}[]> {
        const allowedPasskeys : {id: string, transports?: AuthenticatorTransportFuture[]}[] = [];
        const user = await User.find({ 
            where: {
                id: userId
            },
            relations: {
                credentials: true
            }
        });
        for( const credential of user[0].credentials ) {
            allowedPasskeys.push({
                id: credential.id,  
                transports: credential.transports as AuthenticatorTransportFuture[]
            });
        }
        if( allowedPasskeys.length === 0 ) {
            const error = `No allowed passkeys defined for user ${user[0].email}.`
            throw new Error(error);
        }
        return allowedPasskeys;
    }

    async updateCounter(user: User, credentialId: string, newCounter: number) {
        const credential = await Credential.findOneBy({ id: credentialId });
        if( !credential ) {
            const error = `Error retrieving credential id=${credentialId} for user ${user.email}`
            this.logger.error(error);
            throw new Error(error);
        }
        credential.counter = newCounter;
        await credential.save();
    }
}