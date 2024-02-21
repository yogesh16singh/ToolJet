import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { LICENSE_FIELD, LICENSE_TYPE, decrypt, freshDeskBaseUrl } from 'src/helpers/license.helper';
import License from '@ee/licensing/configs/License';
import { LicenseUpdateDto } from '@dto/license.dto';
import { InstanceSettings } from 'src/entities/instance_settings.entity';
import { CreateTrialLicenseDto } from '@dto/create-trial-license.dto';
import got from 'got';
import { SelfhostCustomerLicense } from 'src/entities/selfhost_customer_license.entity';
import { ConfigService } from '@nestjs/config';
import { CRMData } from '@ee/licensing/types';
import OrganizationLicense from '@ee/licensing/configs/OrganizationLicense';
import { OrganizationsLicense } from 'src/entities/organization_license.entity';
import { OrganizationLicenseService } from './organization_license.service';
import { dbTransactionWrap } from 'src/helpers/utils.helper';
import { Brackets, EntityManager } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { USER_STATUS, USER_TYPE } from 'src/helpers/user_lifecycle';

@Injectable()
export class LicenseService {
  constructor(private configService: ConfigService, private organizationLicenseService: OrganizationLicenseService) {}

  async getLicenseTerms(type?: LICENSE_FIELD | LICENSE_FIELD[], organizationId?: string): Promise<any> {
    let organizationLicense;
    if (!organizationId) {
      await this.init();
      //cloud-licensing specific, don't change
    } else {
      const license = await this.organizationLicenseService.getLicense(organizationId);
      organizationLicense = new OrganizationLicense(license?.terms, license?.updatedAt); // get terms from organization license table and pass it here)
    }

    if (Array.isArray(type)) {
      const result: any = {};

      type.forEach(async (key) => {
        result[key] = await this.getLicenseFieldValue(key, organizationLicense);
      });

      return result;
    } else {
      return await this.getLicenseFieldValue(type, organizationLicense);
    }
  }

  private async getLicenseFieldValue(type: LICENSE_FIELD, organizationLicense?: OrganizationLicense): Promise<any> {
    const licenseInstance = organizationLicense || License.Instance();

    switch (type) {
      case LICENSE_FIELD.ALL:
        return licenseInstance.terms;

      case LICENSE_FIELD.APP_COUNT:
        return licenseInstance.apps;

      case LICENSE_FIELD.TABLE_COUNT:
        return licenseInstance.tables;

      case LICENSE_FIELD.TOTAL_USERS:
        return licenseInstance.users;

      case LICENSE_FIELD.EDITORS:
        return licenseInstance.editorUsers;

      case LICENSE_FIELD.VIEWERS:
        return licenseInstance.viewerUsers;

      case LICENSE_FIELD.IS_EXPIRED:
        return licenseInstance.isExpired;

      case LICENSE_FIELD.OIDC:
        return licenseInstance.oidc;

      case LICENSE_FIELD.LDAP:
        return licenseInstance.ldap;

      case LICENSE_FIELD.SAML:
        return licenseInstance.saml;

      case LICENSE_FIELD.GIT_SYNC:
        return licenseInstance.gitSync;

      case LICENSE_FIELD.CUSTOM_STYLE:
        return licenseInstance.customStyling;

      case LICENSE_FIELD.AUDIT_LOGS:
        return licenseInstance.auditLogs;

      case LICENSE_FIELD.MAX_DURATION_FOR_AUDIT_LOGS:
        return licenseInstance.maxDurationForAuditLogs;

      case LICENSE_FIELD.MULTI_ENVIRONMENT:
        return licenseInstance.multiEnvironment;

      case LICENSE_FIELD.VALID:
        return licenseInstance.isValid && !licenseInstance.isExpired;

      case LICENSE_FIELD.WORKSPACES:
        return licenseInstance.workspaces;

      case LICENSE_FIELD.WHITE_LABEL:
        return licenseInstance.whiteLabelling;

      case LICENSE_FIELD.USER:
        return {
          total: licenseInstance.users,
          editors: licenseInstance.editorUsers,
          viewers: licenseInstance.viewerUsers,
          superadmins: licenseInstance.superadminUsers,
        };

      case LICENSE_FIELD.FEATURES:
        return licenseInstance.features;

      case LICENSE_FIELD.DOMAINS:
        return licenseInstance.domains;

      case LICENSE_FIELD.STATUS:
        return {
          isLicenseValid: licenseInstance.isValid,
          isExpired: licenseInstance.isExpired,
          licenseType: licenseInstance.licenseType,
          expiryDate: licenseInstance.expiry,
          // Add the startDate only if organizationLicense exists.
          ...(organizationLicense && { startDate: organizationLicense.startDate }),
        };

      case LICENSE_FIELD.META:
        return licenseInstance.metaData;

      case LICENSE_FIELD.WORKFLOWS:
        return License.Instance().workflows;

      default:
        return licenseInstance.terms;
    }
  }

  getLicense(): Promise<InstanceSettings> {
    return dbTransactionWrap((manager: EntityManager) => {
      return manager.findOneOrFail(InstanceSettings, { where: { key: 'LICENSE_KEY' } });
    });
  }

  async init(): Promise<void> {
    const licenseSetting: InstanceSettings = await this.getLicense();
    const updatedAt = License.Instance()?.updatedAt;
    const isUpdated: boolean = updatedAt?.getTime() !== new Date(licenseSetting.updatedAt).getTime();

    if (!updatedAt || isUpdated) {
      // No License updated or new license available
      License.Reload(licenseSetting?.value, licenseSetting?.updatedAt);
    }
  }

  validateHostnameSubpath(domainsList = []) {
    if (!domainsList.length && (!License.Instance()?.isValid || License.Instance()?.isExpired)) {
      // not validating license for invalid licenses -> Basic plan
      return;
    }
    //check for valid hostname
    const domain = process.env.TOOLJET_HOST;
    const subPath = process.env.SUB_PATH;
    const domains = domainsList.length ? domainsList : License.Instance().domains || [];

    if (domains?.length) {
      if (subPath) {
        if (!domains.some((host) => host.subpath === subPath && host.hostname === domain)) {
          throw new BadRequestException(`Domain configurations does not match with ${domain}${subPath || ''}`);
        }
      } else {
        if (!domains.some((host) => host.hostname === domain && !host.subPath)) {
          throw new BadRequestException(`Domain configurations does not match with ${domain}${subPath || ''}`);
        }
      }
    }
  }

  async updateLicense(dto: LicenseUpdateDto, organizationId?: string, manager?: EntityManager): Promise<void> {
    if (organizationId) {
      try {
        const licenseTerms = decrypt(dto.key);
        if (!(licenseTerms?.expiry && licenseTerms?.workspaceId)) {
          throw new Error('Invalid License Key:expiry or key:workspaceId not found');
        }

        if (organizationId !== licenseTerms.workspaceId) {
          throw new Error('Incorrect organization in license key');
        }

        await dbTransactionWrap((manager: EntityManager) => {
          return manager.upsert(
            OrganizationsLicense,
            {
              licenseKey: dto.key,
              terms: licenseTerms,
              expiryDate: licenseTerms.expiry,
              licenseType: licenseTerms.type,
              organizationId: licenseTerms.workspaceId,
              updatedAt: new Date(),
            },
            ['organizationId']
          );
        }, manager);
      } catch (err) {
        throw new BadRequestException(err?.message || 'License key is invalid');
      }
    } else {
      const licenseSetting: InstanceSettings = await this.getLicense();
      try {
        const licenseTerms = decrypt(dto.key);

        // TODO: validate expiry of new license
        const { isLicenseValid } = await this.getLicenseTerms(LICENSE_FIELD.STATUS);

        // updated with a valid license and trying to update trial license generated using API
        if (
          isLicenseValid &&
          licenseTerms?.type === LICENSE_TYPE.TRIAL &&
          licenseTerms?.meta?.generatedFrom === 'API'
        ) {
          throw new Error(
            'Trying to use a trial license key, please reach out to hello@tooljet.com to get a valid license key'
          );
        }

        this.validateHostnameSubpath(licenseTerms.domains);
        await dbTransactionWrap((manager: EntityManager) => {
          return manager.update(InstanceSettings, { id: licenseSetting.id }, { value: dto.key });
        }, manager);
      } catch (err) {
        throw new BadRequestException(err?.message || 'License key is invalid');
      }
    }
  }

  async generateTrialLicense(createDto: CreateTrialLicenseDto) {
    const { firstName, lastName, email, hostname, subpath, companyName, otherData, customerId, version } = createDto;

    return await dbTransactionWrap(async (manager: EntityManager) => {
      const isExisted = await manager.findOne(SelfhostCustomerLicense, {
        where: { email },
      });
      if (isExisted) {
        if (isExisted.hostname === hostname && (!subpath || isExisted.subpath === subpath)) return isExisted.licenseKey;
        throw new ConflictException('License with same email exists');
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 14);
      const body = {
        expiry: expiryDate.toISOString().split('T')[0], // 14 days from now
        apps: '',
        workspaces: '',
        type: LICENSE_TYPE.TRIAL,
        users: {
          total: 15,
          editor: 5,
          viewer: 10,
          superadmin: 1,
        },
        database: {
          table: '',
        },
        domains: [
          {
            ...(subpath ? { subpath } : {}),
            hostname,
          },
        ],
        features: {
          oidc: true,
          auditLogs: true,
          ldap: true,
          customStyling: true,
        },
        meta: {
          generatedFrom: 'API',
          customerName: companyName || email,
          customerId,
        },
      };

      const LICENSE_SERVER_URL =
        version !== '2'
          ? this.configService.get<string>('LICENSE_SERVER_URL')
          : this.configService.get<string>('LICENSE_SERVER_URL_V2');
      const LICENSE_SERVER_SECRET = this.configService.get<string>('LICENSE_SERVER_SECRET');

      /* generate license here */
      const licenseResponse = await got(LICENSE_SERVER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${LICENSE_SERVER_SECRET}`).toString('base64')}`,
        },
        json: body,
      });

      if (!licenseResponse) {
        throw new Error('Empty response from Licensing');
      }
      const {
        license: licenseKey,
        meta: { customerName, customerId: customerIdGenerated },
      } = JSON.parse(licenseResponse.body);

      if (!licenseKey) {
        throw new Error('License key not generated');
      }

      const extraData = {
        ...(otherData || {}),
        name: `${firstName || ''}${firstName ? (lastName ? ` ${lastName}` : '') : `${lastName || ''}`}`,
      };

      /* add new entry to license table */
      const licenseEntry = manager.create(SelfhostCustomerLicense, {
        email,
        hostname,
        subpath,
        companyName: customerName,
        customerId: customerIdGenerated,
        otherData: JSON.stringify(extraData || {}),
        licenseKey,
      });
      await manager.save(SelfhostCustomerLicense, licenseEntry);

      this.createCRMUser({ firstName, lastName, email, isTrialOpted: true });

      return licenseKey;
    });
  }

  async createCRMUser(user: CRMData): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;

    try {
      await got(`${freshDeskBaseUrl}contacts`, {
        method: 'post',
        headers: { Authorization: `Token token=${process.env.FWAPIKey}`, 'Content-Type': 'application/json' },
        json: {
          contact: {
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            custom_field: {
              job_title: user.role,
              ...(user.isTrialOpted && { cf_has_started_on_prem_trial: 1 }),
            },
          },
        },
      });
    } catch (error) {
      const errors = JSON.parse(error.response?.body || '{}').errors;
      const freshDeskContactAlreadyExists = (email, errorMessage) => errorMessage?.includes(`${email} already exists`);

      if (errors?.code === 400 && freshDeskContactAlreadyExists(user.email, errors?.message?.[0])) {
        console.log(`Contact ${user.email} already exists. Updating custom fields.`);
        this.updateCRM(user);
      } else {
        console.error('error while connection to freshDeskBaseUrl : createCRMUser', error);
      }
    }

    return true;
  }

  async updateCRM(user: CRMData): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;

    try {
      const response = await got(`${freshDeskBaseUrl}lookup?q=${user.email}&f=email&entities=contact`, {
        method: 'get',
        headers: {
          Authorization: `Token token=${process.env.FWAPIKey}`,
          'Content-Type': 'application/json',
        },
      });

      const contacts = JSON.parse(response.body)['contacts']['contacts'];

      if (!contacts?.length) {
        return;
      }

      await got(`${freshDeskBaseUrl}contacts/${contacts[0].id}`, {
        method: 'put',
        headers: { Authorization: `Token token=${process.env.FWAPIKey}`, 'Content-Type': 'application/json' },
        json: {
          contact: {
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            custom_field: {
              job_title: user.role,
              ...(user.isTrialOpted && { cf_has_started_on_prem_trial: 1 }),
              ...(user.isCloudTrialOpted && { cf_has_started_cloud_trial: 1 }),
              ...(user.isCloudTrialOpted && { cf_cloud_trial_start_on: new Date().toISOString() }),
              ...(user.paymentTry && { cf_tried_self_pay_on: new Date().toISOString() }),
            },
          },
        },
      });
    } catch (error) {
      console.error('error while connection to freshDeskBaseUrl : updateCRM', error);
    }

    return true;
  }

  isBasicPlan = async () => !(await this.getLicenseFieldValue(LICENSE_FIELD.VALID));

  private createAppsJoinCondition(organizationId?: string): string {
    return organizationId ? 'apps.organizationId = :organizationId' : '1=1';
  }

  private createGroupPermissionsJoinCondition(organizationId?: string): string {
    return organizationId ? 'group_permissions.organizationId = :organizationId' : '1=1';
  }

  createOrganizationUsersJoinCondition(organizationId?: string): string {
    const statusCondition = 'organization_users.status IN (:...statusList)';
    const organizationCondition = organizationId ? ' AND organization_users.organizationId = :organizationId' : '';
    return `${statusCondition}${organizationCondition}`;
  }

  private async getUserIdWithEditPermission(manager: EntityManager, organizationId?: string) {
    const statusList = [USER_STATUS.INVITED, USER_STATUS.ACTIVE];
    const groupPermissionsCondition = this.createGroupPermissionsJoinCondition(organizationId);
    const organizationUsersCondition = this.createOrganizationUsersJoinCondition(organizationId);
    const appsCondition = this.createAppsJoinCondition(organizationId);
    const userIdsWithEditPermissions = (
      await manager
        .createQueryBuilder(User, 'users')
        .innerJoin('users.groupPermissions', 'group_permissions', groupPermissionsCondition, { organizationId })
        .leftJoin('group_permissions.appGroupPermission', 'app_group_permissions')
        .innerJoin('users.organizationUsers', 'organization_users', organizationUsersCondition, {
          statusList,
          organizationId,
        })
        .andWhere('users.status != :archived', { archived: USER_STATUS.ARCHIVED })
        .andWhere(
          new Brackets((qb) => {
            qb.where('app_group_permissions.read = true AND app_group_permissions.update = true').orWhere(
              'group_permissions.appCreate = true'
            );
          })
        )
        .select('users.id')
        .distinct()
        .getMany()
    ).map((record) => record.id);

    const userIdsOfAppOwners = (
      await manager
        .createQueryBuilder(User, 'users')
        .innerJoin('users.apps', 'apps', appsCondition, { organizationId })
        .innerJoin('users.organizationUsers', 'organization_users', organizationUsersCondition, {
          statusList,
          organizationId,
        })
        .andWhere('users.status != :archived', { archived: USER_STATUS.ARCHIVED })
        .select('users.id')
        .distinct()
        .getMany()
    ).map((record) => record.id);

    const userIdsOfSuperAdmins = (
      await manager
        .createQueryBuilder(User, 'users')
        .select('users.id')
        .where('users.userType = :userType', { userType: USER_TYPE.INSTANCE })
        .andWhere('users.status = :status', { status: USER_STATUS.ACTIVE })
        .getMany()
    ).map((record) => record.id);

    return [...new Set([...userIdsWithEditPermissions, ...userIdsOfAppOwners, ...userIdsOfSuperAdmins])];
  }

  async fetchTotalEditorCount(manager: EntityManager, organizationId?: string): Promise<number> {
    const userIdsWithEditPermissions = await this.getUserIdWithEditPermission(manager, organizationId);
    return userIdsWithEditPermissions?.length || 0;
  }

  async fetchTotalViewerEditorCount(
    manager: EntityManager,
    organizationId?: string
  ): Promise<{ editor: number; viewer: number }> {
    const userIdsWithEditPermissions = await this.getUserIdWithEditPermission(manager, organizationId);
    const statusList = [USER_STATUS.INVITED, USER_STATUS.ACTIVE];
    const organizationUsersCondition = this.createOrganizationUsersJoinCondition(organizationId);

    if (!userIdsWithEditPermissions?.length) {
      // No editors -> No viewers
      return { editor: 0, viewer: 0 };
    }
    const viewer = await manager
      .createQueryBuilder(User, 'users')
      .innerJoin('users.organizationUsers', 'organization_users', organizationUsersCondition, {
        statusList,
        organizationId,
      })
      .andWhere('users.status != :archived', { archived: USER_STATUS.ARCHIVED })
      .andWhere('users.id NOT IN(:...userIdsWithEditPermissions)', { userIdsWithEditPermissions })
      .select('users.id')
      .distinct()
      .getCount();

    return { editor: userIdsWithEditPermissions?.length || 0, viewer };
  }
}
