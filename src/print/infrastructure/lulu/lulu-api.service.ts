import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { LuluAuthService } from '../../application/services/lulu-auth.service';
import config from '../../../common/config/app.config';
import {
  LuluValidationResponse,
  LuluPrintJob,
  LuluPrintJobRequest,
  LuluCostResponse,
  ShippingCostRequest,
} from '../../domain/interfaces/lulu.types';

@Injectable()
export class LuluApiService {
  private readonly logger = new Logger(LuluApiService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly authService: LuluAuthService) {
    this.http = axios.create({
      baseURL: config.lulu_api_base_url,
    });
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.authService.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async validateInteriorPdf(
    fileUrl: string,
    fileName: string,
  ): Promise<LuluValidationResponse> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.post(
        '/print-job/validation/interiors/',
        {
          printable: { type: 'INTERIOR', url: fileUrl, name: fileName },
        },
        { headers },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Interior PDF validation failed',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async createInteriorValidation(
    sourceUrl: string,
  ): Promise<LuluValidationResponse> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.post(
        '/validate-interior/',
        { source_url: sourceUrl },
        { headers },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Interior validation request failed',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async getInteriorValidation(
    id: string | number,
  ): Promise<LuluValidationResponse> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.get(`/validate-interior/${id}/`, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get interior validation ${id}`,
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async calculateCoverDimensions(request: {
    pod_package_id: string;
    interior_page_count: number;
    unit?: 'pt' | 'mm' | 'inch';
  }): Promise<{ width: string; height: string; unit: string }> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.post('/cover-dimensions/', request, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Cover dimensions calculation failed',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async createCoverValidation(request: {
    source_url: string;
    pod_package_id: string;
    interior_page_count: number;
  }): Promise<LuluValidationResponse> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.post('/validate-cover/', request, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Cover validation request failed',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async getCoverValidation(id: string | number): Promise<LuluValidationResponse> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.get(`/validate-cover/${id}/`, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get cover validation ${id}`,
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async validateCoverPdf(
    fileUrl: string,
    fileName: string,
  ): Promise<LuluValidationResponse> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.post(
        '/print-job/validation/covers/',
        {
          printable: { type: 'COVER', url: fileUrl, name: fileName },
        },
        { headers },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Cover PDF validation failed',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async getValidationStatus(
    validationId: string,
  ): Promise<LuluValidationResponse> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.get(
        `/print-job/validation/${validationId}/`,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get validation status for ${validationId}`,
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async createPrintJob(request: LuluPrintJobRequest): Promise<LuluPrintJob> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.post('/print-job/', request, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Failed to create Lulu print job',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async getPrintJob(jobId: number): Promise<LuluPrintJob> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.get(`/print-job/${jobId}/`, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get print job ${jobId}`,
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async getShippingCost(
    request: ShippingCostRequest,
    currency: string = 'USD',
  ): Promise<LuluCostResponse> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.post(
        '/print-job/cost-calculation/',
        {
          line_items: request.line_items,
          shipping_address: request.shipping_address,
          currency,
        },
        { headers },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Failed to calculate shipping cost',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async getPodPackages(): Promise<{ id: number; name: string }[]> {
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.http.get('/print-job/pod-packages/', {
        headers,
      });
      return response.data.results || response.data;
    } catch (error: any) {
      this.logger.error(
        'Failed to fetch POD packages',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }
}
