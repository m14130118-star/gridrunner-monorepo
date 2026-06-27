import { useEffect, useState } from 'react';

interface Props {
  width?: string;
  height?: string;
  count?: number;
  variant?: 'card' | 'line' | 'avatar' | 'map';
}

export default function SkeletonLoader({ width = '100%', height = '100%', count = 1, variant = 'card' }: Props) {
  return (
    <div className="skeleton-scan-container" style={{ width, height }}>
      <div className="skeleton-scan-line" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton-block skeleton-${variant}`}>
          <div className="skeleton-shine" />
        </div>
      ))}
      <style jsx>{`
        .skeleton-scan-container {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          background: var(--card-bg, #1a1a2e);
          border: 1px solid var(--border, rgba(255,255,255,0.06));
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .skeleton-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(0, 230, 118, 0.6) 20%,
            rgba(0, 230, 118, 0.9) 50%,
            rgba(0, 230, 118, 0.6) 80%,
            transparent 100%
          );
          filter: blur(1px);
          animation: scanLine 2.5s ease-in-out infinite;
          z-index: 2;
        }
        @keyframes scanLine {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .skeleton-block {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--card-bg, #1a1a2e) 0%, rgba(255,255,255,0.03) 50%, var(--card-bg, #1a1a2e) 100%);
        }
        .skeleton-card {
          height: 120px;
        }
        .skeleton-line {
          height: 14px;
          width: 80%;
        }
        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }
        .skeleton-map {
          height: 200px;
        }
        .skeleton-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg, transparent, rgba(255,255,255,0.04) 50%, transparent
          );
          animation: shine 1.5s ease-in-out infinite;
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
