import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { LicenseService } from '@services/license.service';
import { LICENSE_FIELD } from 'src/helpers/license.helper';

@Injectable()
export class SAMLGuard implements CanActivate {
  constructor(private licenseService: LicenseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!(await this.licenseService.getLicenseTerms(LICENSE_FIELD.SAML))) {
      throw new HttpException('SAML not enabled', 451);
    }
    return true;
  }
}
