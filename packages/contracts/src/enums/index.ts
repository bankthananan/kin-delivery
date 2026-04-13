export enum Role {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER',
  RESTAURANT = 'RESTAURANT',
  ADMIN = 'ADMIN',
}

export enum OrderTier {
  FASTEST = 'FASTEST',
  NORMAL = 'NORMAL',
  SAVER = 'SAVER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  PROMPTPAY = 'PROMPTPAY',
  APP_QR = 'APP_QR',
  COD = 'COD',
  CARD = 'CARD',
  WALLET = 'WALLET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum TransactionType {
  TOPUP = 'TOPUP',
  PAYOUT = 'PAYOUT',
  EARNING = 'EARNING',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}
