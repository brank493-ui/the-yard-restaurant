'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { MenuProvider } from '@/contexts/MenuContext';
import { GalleryProvider } from '@/contexts/GalleryContext';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <MenuProvider>
        <GalleryProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </GalleryProvider>
      </MenuProvider>
    </AuthProvider>
  );
}
