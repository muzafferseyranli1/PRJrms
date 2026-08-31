'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('prjrms_token');
    if (token) {
      router.push('/chat');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
