'use client';

import React from 'react';

interface PaymentLogoProps {
  className?: string;
  size?: number;
}

// Orange Money Logo - Orange brand color (#FF7900)
export function OrangeMoneyLogo({ className = '', size = 48 }: PaymentLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" fill="#FF7900"/>
      <path 
        d="M24 8C15.163 8 8 15.163 8 24s7.163 16 16 16 16-7.163 16-16S32.837 8 24 8zm0 28c-6.627 0-12-5.373-12-12s5.373-12 12-12 12 5.373 12 12-5.373 12-12 12z" 
        fill="white"
      />
      <path 
        d="M24 14c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10zm0 16c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" 
        fill="white" 
        fillOpacity="0.7"
      />
      <text x="24" y="28" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">OM</text>
    </svg>
  );
}

// MTN Money Logo - MTN yellow (#FFCC00) with black text
export function MtnMoneyLogo({ className = '', size = 48 }: PaymentLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" fill="#FFCC00"/>
      <ellipse cx="24" cy="24" rx="14" ry="12" fill="#003366"/>
      <path 
        d="M16 20l4 8 4-8 4 8 4-8" 
        stroke="#FFCC00" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      <text x="24" y="34" textAnchor="middle" fill="#FFCC00" fontSize="6" fontWeight="bold">MTN</text>
    </svg>
  );
}

// Visa Logo - Visa blue (#1A1F71)
export function VisaLogo({ className = '', size = 48 }: PaymentLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" fill="#1A1F71"/>
      <path 
        d="M19.5 30L21.5 18H25L23 30H19.5Z" 
        fill="white"
      />
      <path 
        d="M34 18L31 27L30.5 24.5L29.5 19C29.5 19 29.3 18 28 18H22.5L22.4 18.3C22.4 18.3 24 18.6 25.8 19.7L28.5 30H32.5L38 18H34Z" 
        fill="white"
      />
      <path 
        d="M13 18L9 30H13L13.8 27.5H18.2L18.7 30H22.5L19 18H13ZM14.8 24.5L16 20.5L17 24.5H14.8Z" 
        fill="white"
      />
    </svg>
  );
}

// Mastercard Logo - Mastercard circles
export function MastercardLogo({ className = '', size = 48 }: PaymentLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" fill="#000"/>
      <circle cx="18" cy="24" r="10" fill="#EB001B"/>
      <circle cx="30" cy="24" r="10" fill="#F79E1B"/>
      <path 
        d="M24 17.5C25.9 19.2 27.1 21.5 27.1 24C27.1 26.5 25.9 28.8 24 30.5C22.1 28.8 20.9 26.5 20.9 24C20.9 21.5 22.1 19.2 24 17.5Z" 
        fill="#FF5F00"
      />
    </svg>
  );
}

// Stripe Logo - Stripe purple (#635BFF)
export function StripeLogo({ className = '', size = 48 }: PaymentLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" fill="#635BFF"/>
      <path 
        d="M41 24.2c0-4.8-2.3-8.6-6.8-8.6-4.5 0-7.2 3.8-7.2 8.6 0 5.7 3.2 8.5 7.8 8.5 2.2 0 3.9-.5 5.2-1.2v-3.8c-1.3.6-2.8 1-4.7 1-1.9 0-3.5-.7-3.7-2.9h9.3c0-.2.1-1.1.1-1.6zm-9.4-1.8c0-2.2 1.3-3.1 2.6-3.1 1.2 0 2.5.9 2.5 3.1h-5.1zM21.7 15.6c-1.9 0-3.1.9-3.8 1.5l-.2-1.2h-4.3v21.9l4.9-1v-5.3c.7.5 1.7 1.2 3.4 1.2 3.5 0 6.6-2.8 6.6-8.6-.1-5.4-3.2-8.5-6.6-8.5zm-1.2 12.9c-1.1 0-1.8-.4-2.2-.9v-6.5c.5-.5 1.2-.9 2.2-.9 1.7 0 2.9 1.9 2.9 4.1 0 2.3-1.1 4.2-2.9 4.2zM7 11l4.9-1v4H7v-3z" 
        fill="white"
      />
    </svg>
  );
}

// Cash Icon - Money/cash icon
export function CashLogo({ className = '', size = 48 }: PaymentLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" fill="#22C55E"/>
      <rect x="8" y="14" width="32" height="20" rx="2" fill="white"/>
      <circle cx="24" cy="24" r="6" fill="#22C55E"/>
      <text x="24" y="27" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">$</text>
      <circle cx="12" cy="24" r="2" fill="#22C55E" fillOpacity="0.5"/>
      <circle cx="36" cy="24" r="2" fill="#22C55E" fillOpacity="0.5"/>
    </svg>
  );
}

// Generic Payment Card Icon
export function CardLogo({ className = '', size = 48 }: PaymentLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" fill="#64748B"/>
      <rect x="6" y="12" width="36" height="24" rx="3" fill="white"/>
      <rect x="6" y="18" width="36" height="5" fill="#64748B"/>
      <rect x="10" y="28" width="10" height="3" rx="1" fill="#64748B"/>
      <rect x="10" y="32" width="6" height="2" rx="1" fill="#CBD5E1"/>
    </svg>
  );
}

// Payment method configuration
export const paymentMethodConfig = {
  ORANGE_MONEY: {
    label: 'Orange Money',
    logo: OrangeMoneyLogo,
    accountNumber: '+237 671 490 733',
    accountName: 'The Yard Restaurant',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
  },
  MTN_MONEY: {
    label: 'MTN Money',
    logo: MtnMoneyLogo,
    accountNumber: '+237 671 490 733',
    accountName: 'The Yard Restaurant',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
  },
  VISA: {
    label: 'Visa Card',
    logo: VisaLogo,
    accountNumber: '',
    accountName: 'Pay via Stripe',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
  },
  MASTERCARD: {
    label: 'Mastercard',
    logo: MastercardLogo,
    accountNumber: '',
    accountName: 'Pay via Stripe',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
  },
  STRIPE: {
    label: 'Stripe Payment',
    logo: StripeLogo,
    accountNumber: '',
    accountName: 'Secure Online Payment',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
  },
  CASH: {
    label: 'Cash on Pickup/Delivery',
    logo: CashLogo,
    accountNumber: '',
    accountName: '',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
  },
};

// Payment Method Logo Component - returns appropriate logo based on method
interface PaymentMethodLogoProps extends PaymentLogoProps {
  method: keyof typeof paymentMethodConfig;
}

export function PaymentMethodLogo({ method, className = '', size = 48 }: PaymentMethodLogoProps) {
  const config = paymentMethodConfig[method];
  if (!config) {
    return <CardLogo className={className} size={size} />;
  }
  const LogoComponent = config.logo;
  return <LogoComponent className={className} size={size} />;
}

// Payment Method Card Component
interface PaymentMethodCardProps {
  method: keyof typeof paymentMethodConfig;
  selected?: boolean;
  onClick?: () => void;
  showDetails?: boolean;
}

export function PaymentMethodCard({ method, selected, onClick, showDetails = true }: PaymentMethodCardProps) {
  const config = paymentMethodConfig[method];
  if (!config) return null;

  const LogoComponent = config.logo;

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
        selected
          ? `border-amber-500 bg-amber-500/10`
          : 'border-stone-600 bg-stone-700/50 hover:border-stone-500'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.bgColor}`}>
          <LogoComponent size={40} />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">{config.label}</p>
          {showDetails && config.accountNumber && (
            <p className={`text-sm ${config.color}`}>Send to: {config.accountNumber}</p>
          )}
          {showDetails && !config.accountNumber && (
            <p className="text-stone-400 text-sm">Pay when you receive your order</p>
          )}
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-amber-500 bg-amber-500' : 'border-stone-500'
        }`}>
          {selected && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

// Payment Badge Component for displaying in lists
interface PaymentBadgeProps {
  method?: string;
  size?: 'sm' | 'md';
}

export function PaymentBadge({ method, size = 'sm' }: PaymentBadgeProps) {
  if (!method) return null;
  
  const config = paymentMethodConfig[method as keyof typeof paymentMethodConfig];
  if (!config) return null;

  const LogoComponent = config.logo;
  const iconSize = size === 'sm' ? 16 : 24;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${config.bgColor} ${textSize}`}>
      <LogoComponent size={iconSize} />
      <span className={config.color}>{config.label}</span>
    </span>
  );
}

export default paymentMethodConfig;
