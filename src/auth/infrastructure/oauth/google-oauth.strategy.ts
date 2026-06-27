import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import config from '../../../common/config/app.config';
import { AppError } from '../../../common/errors/app.error';

export interface GoogleUserInfo {
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  sub: string;
  email_verified: boolean;
}

interface GoogleTokenResponse {
  id_token: string;
  access_token: string;
}

interface GoogleTokenInfo {
  aud: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  sub: string;
  email_verified: string;
}

interface GoogleUserInfoResponse {
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  sub: string;
  email_verified: boolean;
}

@Injectable()
export class GoogleOAuthStrategy {
  private readonly clientId: string;

  constructor() {
    this.clientId = config.google_client_id;
  }

  getAuthorizationUrl(redirectUri?: string): string {
    const redirect = redirectUri || config.google_redirect_uri;
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getTokensFromCode(
    code: string,
    redirectUri?: string,
  ): Promise<{ idToken: string; accessToken: string }> {
    const redirect = redirectUri || config.google_redirect_uri;
    try {
      const response: AxiosResponse<GoogleTokenResponse> = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: config.google_client_id,
          client_secret: config.google_client_secret,
          redirect_uri: redirect,
          grant_type: 'authorization_code',
        },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return {
        idToken: response.data.id_token,
        accessToken: response.data.access_token,
      };
    } catch {
      throw AppError.badRequest('Failed to exchange Google authorization code');
    }
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const response: AxiosResponse<GoogleTokenInfo> = await axios.get(
        'https://oauth2.googleapis.com/tokeninfo',
        { params: { id_token: idToken } },
      );
      const payload = response.data;
      if (payload.aud !== this.clientId) {
        throw AppError.unauthorized('Invalid Google token audience');
      }
      return {
        email: payload.email,
        name: payload.name || '',
        given_name: payload.given_name || '',
        family_name: payload.family_name || '',
        picture: payload.picture || '',
        sub: payload.sub,
        email_verified: payload.email_verified === 'true',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.unauthorized('Invalid Google ID token');
    }
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response: AxiosResponse<GoogleUserInfoResponse> = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = response.data;
      return {
        email: data.email,
        name: data.name || '',
        given_name: data.given_name || '',
        family_name: data.family_name || '',
        picture: data.picture || '',
        sub: data.sub,
        email_verified: data.email_verified || false,
      };
    } catch {
      throw AppError.unauthorized('Failed to fetch Google user info');
    }
  }
}
