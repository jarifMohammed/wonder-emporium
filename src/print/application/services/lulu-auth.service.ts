import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import config from '../../../common/config/app.config';

@Injectable()
export class LuluAuthService {
  private readonly logger = new Logger(LuluAuthService.name);
  private readonly http: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.http = axios.create({
      baseURL: config.lulu_api_base_url,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.lulu_client_key);
    params.append('client_secret', config.lulu_client_secret);

    try {
      const response = await this.http.post(
        '/auth/oauth2/token',
        params.toString(),
      );
      const data = response.data;
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
      this.logger.log('Lulu access token acquired');
      return this.accessToken!;
    } catch (error: any) {
      this.logger.error(
        'Failed to acquire Lulu access token',
        error?.response?.data || error.message,
      );
      throw new Error('Lulu authentication failed');
    }
  }
}
