import { useRouter } from 'next/router';
import { useT } from '../lib/i18n';

export const BackButton = () => {
  const router = useRouter();
  const { t } = useT();
  return (
    <button 
      onClick={() => router.back()} 
      style={{
        background: 'none', border: 'none', color: 'var(--text)',
        fontSize: 16, padding: '16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6
      }}
    >
      <i className="fa-solid fa-chevron-left"></i> {t('common.back')}
    </button>
  );
};
