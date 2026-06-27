import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useT } from '../../src/lib/i18n';

const ADMIN_USER = 'hexvel';

interface NewsItem {
  id: string; title: string; content: string;
  date: number; author: string; pinned?: boolean;
}

function getNews(): NewsItem[] {
  try { return JSON.parse(localStorage.getItem('gridrunner_news') || '[]'); } catch { return []; }
}

function saveNews(items: NewsItem[]) {
  localStorage.setItem('gridrunner_news', JSON.stringify(items));
}

export default function AdminNews() {
  const { t, lang } = useT();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('gridrunner_user');
      if (u) {
        const p = JSON.parse(u);
        if (p.username === ADMIN_USER) setAuthed(true);
        else { router.replace('/profile'); return; }
      } else { router.replace('/auth/login'); return; }
    } catch { router.replace('/profile'); return; }
    setNews(getNews().sort((a, b) => b.date - a.date));
  }, [router]);

  if (!authed) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const items = getNews();
    if (editingId) {
      const idx = items.findIndex(n => n.id === editingId);
      if (idx >= 0) { items[idx].title = title.trim(); items[idx].content = content.trim(); }
    } else {
      items.push({ id: String(Date.now()), title: title.trim(), content: content.trim(), date: Date.now(), author: ADMIN_USER });
    }
    saveNews(items);
    setNews(items.sort((a, b) => b.date - a.date));
    setTitle(''); setContent(''); setEditingId(null);
  };

  const edit = (item: NewsItem) => {
    setTitle(item.title); setContent(item.content); setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (id: string) => {
    if (!confirm(lang === 'ru' ? 'Удалить?' : 'Delete?')) return;
    const items = getNews().filter(n => n.id !== id);
    saveNews(items);
    setNews(items);
    if (editingId === id) { setTitle(''); setContent(''); setEditingId(null); }
  };

  const togglePin = (id: string) => {
    const items = getNews();
    const item = items.find(n => n.id === id);
    if (item) { item.pinned = !item.pinned; saveNews(items); setNews([...items].sort((a, b) => b.date - a.date)); }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px' }}>
      <Link href="/news" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, color: 'inherit', textDecoration: 'none', fontSize: 14, opacity: 0.5 }}>← {lang === 'ru' ? 'К новостям' : 'Back to news'}</Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>{lang === 'ru' ? 'Управление новостями' : 'News management'}</h1>

      <form onSubmit={handleSubmit} style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{editingId ? (lang === 'ru' ? 'Редактировать' : 'Edit') : (lang === 'ru' ? 'Новая запись' : 'New post')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="text" placeholder={lang === 'ru' ? 'Заголовок' : 'Title'} value={title} onChange={e => setTitle(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, outline: 'none' }} required />
          <textarea placeholder={lang === 'ru' ? 'Текст новости...' : 'News content...'} value={content} onChange={e => setContent(e.target.value)} rows={6} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} required />
          <button type="submit" style={{ background: '#00e676', color: '#000', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {editingId ? (lang === 'ru' ? 'Сохранить' : 'Save') : (lang === 'ru' ? 'Опубликовать' : 'Publish')}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {news.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.pinned && <span style={{ fontSize: 10, color: '#ff9100' }}>PIN</span>}
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.3, marginTop: 2 }}>{new Date(item.date).toLocaleDateString()}</div>
            </div>
            <button onClick={() => togglePin(item.id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', color: item.pinned ? '#ff9100' : 'inherit', fontSize: 11, cursor: 'pointer' }}>PIN</button>
            <button onClick={() => edit(item)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', color: 'inherit', fontSize: 11, cursor: 'pointer' }}>{lang === 'ru' ? 'Ред' : 'Edit'}</button>
            <button onClick={() => remove(item.id)} style={{ background: 'none', border: '1px solid rgba(255,23,68,0.3)', borderRadius: 6, padding: '4px 8px', color: '#ff1744', fontSize: 11, cursor: 'pointer' }}>X</button>
          </div>
        ))}
      </div>
    </div>
  );
}
