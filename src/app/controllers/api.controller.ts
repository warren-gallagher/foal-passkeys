import { readFileSync } from 'node:fs';
import { controller, Context, Get, HttpResponseOK, IAppController, ApiDefineSecurityScheme, ApiInfo, ApiServer } from '@foal/core';
import { PasskeyRegistrationController } from './passkey-registration.controller';
import { PasskeyAuthenticationController } from './passkey-authentication.controller';
const packageFilename = process.env.npm_package_json ? process.env.npm_package_json : 'package.json';
const contentJsonString = readFileSync(packageFilename, 'utf8');
const packageObject = JSON.parse(contentJsonString);
const packageName = packageObject.name;
const packageDescription = packageObject.description;
const packageVersion = packageObject.version;

@ApiInfo({
  title: packageName,
  description: packageDescription,
  version: packageVersion
})
@ApiServer({
  url: '/api'
})
@ApiDefineSecurityScheme('bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT'
})

export class ApiController implements IAppController {

  subControllers = [
    controller('/passkey-registration', PasskeyRegistrationController),
    controller('/passkey-authentication', PasskeyAuthenticationController)
  ];

  @Get('/')
  index(ctx: Context) {
    return new HttpResponseOK('Hello world!');
  }
}
