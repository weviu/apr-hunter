/** A balance the user actually holds on a centralized exchange. */
export interface ExchangeHolding {
  asset: string;
  amount: number;
  /** 'spot' = sitting in the wallet/trading account; 'earn' = in a savings/staking product. */
  type: 'spot' | 'earn';
  /** Earn product name when type === 'earn'. */
  product?: string;
}
