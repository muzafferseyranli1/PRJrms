'use client';

import React from 'react';
import { X, Download } from 'lucide-react';

interface Props {
  imageUrl: string | null;
  fileName?: string;
  onClose: () => void;
}

export default function LightboxModal({ imageUrl, fileName, onClose }: Props) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href={imageUrl}
          download={fileName || 'image.jpg'}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-full bg-[#202c33] text-[#e9edef] hover:text-[#00a884] transition"
          title="İndir"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-[#202c33] text-[#e9edef] hover:text-red-400 transition"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-[#222e35]">
        <img
          src={imageUrl}
          alt={fileName || 'Görsel önizleme'}
          className="w-full h-full object-contain max-h-[85vh]"
        />
      </div>
    </div>
  );
}
