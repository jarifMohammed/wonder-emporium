import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import config from '../../../common/config/app.config';

@Injectable()
export class LuluAuthService {
  private readonly logger = new Logger(LuluAuthService.name);
  private readonly http: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private readonly proactiveRefreshMs = 2 * 60 * 1000;

  constructor() {
    this.http = axios.create({
      baseURL: config.lulu_api_base_url,
    });
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await this.requestToken();
      const data = response.data;
      this.accessToken = data.access_token;
      const expiresInMs = Math.max(Number(data.expires_in || 0) * 1000, 0);
      this.tokenExpiresAt =
        Date.now() +
        Math.max(Math.min(expiresInMs - 60 * 1000, this.proactiveRefreshMs), 0);
      this.logger.log('Lulu access token acquired');
      return this.accessToken!;
    } catch (error: any) {
      const detail = error?.response?.data || error.message;
      this.logger.error(
        'Failed to acquire Lulu access token',
        detail,
      );
      throw new Error(`Lulu authentication failed: ${JSON.stringify(detail)}`);
    }
  }

  private async requestToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    try {
      return await this.http.post(
        '/auth/realms/glasstree/protocol/openid-connect/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: this.getBasicAuthHeader(),
          },
        },
      );
    } catch (error: any) {
      this.logger.warn(
        `Lulu OpenID token endpoint failed, trying oauth2 fallback: ${JSON.stringify(error?.response?.data || error.message)}`,
      );
      const fallbackParams = new URLSearchParams();
      fallbackParams.append('grant_type', 'client_credentials');
      fallbackParams.append('client_id', config.lulu_client_key);
      fallbackParams.append('client_secret', config.lulu_client_secret);
      return this.http.post('/auth/oauth2/token', fallbackParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
  }

  private getBasicAuthHeader(): string {
    if (config.lulu_auth_basic) {
      return config.lulu_auth_basic.startsWith('Basic ')
        ? config.lulu_auth_basic
        : `Basic ${config.lulu_auth_basic}`;
    }

    const credentials = `${config.lulu_client_key}:${config.lulu_client_secret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }
}
