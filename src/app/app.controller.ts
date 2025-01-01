import { controller, IAppController, Logger, dependency } from '@foal/core';

import { ApiController, OpenApiController } from './controllers';
import { MetadataService } from '@simplewebauthn/server';

export class AppController implements IAppController {

  @dependency logger: Logger;

  subControllers = [
    controller('/api', ApiController),
    controller('/openapi', OpenApiController),
  ];

  async init() {
    await MetadataService.initialize();
    this.logger.info('Webauthn MetadataService initialized.');
  }
}
