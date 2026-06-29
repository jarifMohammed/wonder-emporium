export interface StripeConnectedAccountData {
  id: string;
  authId: string;
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommerceRepository {
  getConnectedAccountByAuthId(
    authId: string,
  ): Promise<StripeConnectedAccountData | null>;
  getConnectedAccountByStripeId(
    stripeAccountId: string,
  ): Promise<StripeConnectedAccountData | null>;
  createConnectedAccount(
    authId: string,
    stripeAccountId: string,
  ): Promise<StripeConnectedAccountData>;
  updateConnectedAccountStatus(
    stripeAccountId: string,
    chargesEnabled: boolean,
    payoutsEnabled: boolean,
  ): Promise<void>;
  incrementPendingBalance(authId: string, amount: number): Promise<void>;
}

export const COMMERCE_REPOSITORY_TOKEN = Symbol('ICommerceRepository');
