import {
  ApiResponse,
  SignupInput,
  LoginInput,
  UserSummary,
  CampaignDTO,
  SubmissionDTO,
  CreatorEarningsSummary,
  CampaignBudgetSummary,
  CreateCampaignInput,
  CreateSubmissionInput,
} from '@memed/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('memed_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('memed_token', token);
      } else {
        localStorage.removeItem('memed_token');
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('memed_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // for HttpOnly cookies
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      throw new Error(message);
    }
  }

  // Auth
  public async signup(input: SignupInput) {
    const res = await this.request<{ user: UserSummary; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  public async login(input: LoginInput) {
    const res = await this.request<{ user: UserSummary; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  public async logout() {
    this.setToken(null);
    return this.request<{ success: boolean }>('/auth/logout', { method: 'POST' });
  }

  public async getMe() {
    return this.request<UserSummary>('/auth/me');
  }

  // Campaigns
  public async getPublicCampaigns(page = 1, limit = 20, platform?: string) {
    const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (platform) query.append('platform', platform);
    return this.request<CampaignDTO[]>(`/campaigns?${query.toString()}`);
  }

  public async getMyCampaigns() {
    return this.request<CampaignDTO[]>('/campaigns/mine');
  }

  public async getCampaignById(id: string) {
    return this.request<CampaignDTO>(`/campaigns/${id}`);
  }

  public async createCampaign(input: CreateCampaignInput) {
    return this.request<CampaignDTO>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async updateCampaignStatus(id: string, status: 'live' | 'paused' | 'completed') {
    return this.request<{ id: string; status: string }>(`/campaigns/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  public async getCampaignSubmissions(id: string) {
    return this.request<SubmissionDTO[]>(`/campaigns/${id}/submissions`);
  }

  public async getCampaignBudget(id: string) {
    return this.request<CampaignBudgetSummary>(`/campaigns/${id}/budget`);
  }

  // Submissions
  public async submitPost(campaignId: string, input: CreateSubmissionInput) {
    return this.request<SubmissionDTO>(`/campaigns/${campaignId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async getMySubmissions() {
    return this.request<SubmissionDTO[]>('/submissions/mine');
  }

  public async getSubmissionById(id: string) {
    return this.request<SubmissionDTO>(`/submissions/${id}`);
  }

  public async updateViews(submissionId: string, views: number) {
    return this.request<{
      submissionId: string;
      views: number;
      eligiblePayoutPaise: number;
      paidAmountPaise: number;
      payoutAllocatedPaise: number;
      status: string;
      spikeDetected: boolean;
    }>(`/submissions/${submissionId}/views`, {
      method: 'PATCH',
      body: JSON.stringify({ views }),
    });
  }

  // Earnings
  public async getMyEarnings() {
    return this.request<CreatorEarningsSummary>('/earnings/me');
  }
}

export const api = new ApiClient();
