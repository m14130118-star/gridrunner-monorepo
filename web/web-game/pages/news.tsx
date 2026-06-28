import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '../src/lib/i18n';
import { BackButton } from '../src/components/BackButton';

interface NewsItem {
  id: string; title: string; content: string;
  date: number; author: string; pinned?: boolean;
}

function getNews(): NewsItem[] {
  try { return JSON.parse(localStorage.getItem('gridrunner_news') || '[]'); } catch { return []; }
}

export default function NewsPage() {
  const { t, lang } = useT();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    setNews(getNews().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.date - a.date));
    try { const u = localStorage.getItem('gridrunner_user'); if (u) setUser(JSON.parse(u)); } catch {}
  }, []);

  const ADMIN_USER = 'hexvel';

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px' }}>
      <BackButton />
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{lang === 'ru' ? 'Новости' : 'News'}</h1>
      <p style={{ opacity: 0.4, fontSize: 14, marginBottom: 24 }}>
        {lang === 'ru' ? 'Обновления и анонсы GridRunner' : 'GridRunner updates and announcements'}
      </p>
      {user?.username === ADMIN_USER && (
        <Link href="/admin/news" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(0,230,118,0.1)', color: '#00e676', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>
          + {lang === 'ru' ? 'Новая запись' : 'New post'}
        </Link>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {news.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', opacity: 0.3, fontSize: 14 }}>
            {lang === 'ru' ? 'Новостей пока нет' : 'No news yet'}
          </div>
        )}
        {news.map(item => (
          <div key={item.id} style={{ padding: 20, borderRadius: 16, background: item.pinned ? 'rgba(255,145,0,0.04)' : 'rgba(255,255,255,0.02)', border: item.pinned ? '1px solid rgba(255,145,0,0.15)' : '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {item.pinned && <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(255,145,0,0.15)', color: '#ff9100', fontSize: 10, fontWeight: 700 }}>{lang === 'ru' ? 'ЗАКРЕПЛЕНО' : 'PINNED'}</span>}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{item.title}</h2>
            <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.content}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, opacity: 0.3 }}>
              <span>{item.author} · {new Date(item.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
