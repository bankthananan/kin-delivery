export interface OmiseScannableCodeImage {
  download_uri: string;
  uri: string;
}

export interface OmiseScannableCode {
  type: string;
  image: OmiseScannableCodeImage;
}

export interface OmiseSourceResponse {
  object: 'source';
  id: string;
  type: string;
  amount: number;
  currency: string;
  scannable_code?: OmiseScannableCode;
  flow: string;
  expires_at: string | null;
}

export interface OmiseChargeResponse {
  object: 'charge';
  id: string;
  status: 'pending' | 'successful' | 'failed' | 'reversed' | 'expired';
  amount: number;
  currency: string;
  description: string | null;
  metadata: Record<string, unknown>;
  source?: OmiseSourceResponse;
  expires_at: string | null;
  authorize_uri: string | null;
  return_uri: string | null;
  paid: boolean;
  failure_code: string | null;
  failure_message: string | null;
  transaction: string | null;
}

export interface OmiseSourceCreateParams {
  type: string;
  amount: number;
  currency: string;
}

export interface OmiseChargeCreateParams {
  amount: number;
  currency: string;
  source?: string;
  card?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

export interface OmiseWebhookEvent {
  key: string;
  created_at: string;
  data: OmiseChargeResponse;
}

export interface OmiseInstance {
  sources: {
    create(params: OmiseSourceCreateParams): Promise<OmiseSourceResponse>;
  };
  charges: {
    create(params: OmiseChargeCreateParams): Promise<OmiseChargeResponse>;
    retrieve(id: string): Promise<OmiseChargeResponse>;
  };
}

export interface PromptPayChargeResult {
  chargeId: string;
  qrCodeUri: string;
  expiresAt: string | null;
}
