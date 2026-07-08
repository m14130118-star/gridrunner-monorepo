import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '../../src/lib/i18n';
import { getApiUrl } from '../../src/lib/api';

// Управление новостями. Вход по админ-паролю (ADMIN_PASSWORD на сервере),
// как в /cyber-admin. Новости хранятся на сервере и видны всем игрокам.

interface NewsItem {
  id: string | number; title: string; content: string;
  date: number; author: string; pinned?: boolean;
}

export default function AdminNews() {
  const { lang } = useT();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [msg, setMsg] = useState('');

  const hdrs = (t: string) => ({ Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' });

  const loadNews = async (t: string) => {
    try {
      const r = await fetch(getApiUrl() + '/api/v1/admin/news', { headers: hdrs(t) });
      const d = await r.json();
      if (d.success) setNews(d.news || []);
      else if (r.status === 401) { setToken(null); localStorage.removeItem('gridrunner_admin_token'); }
    } catch {}
  };

  useEffect(() => {
    const saved = localStorage.getItem('gridrunner_admin_token');
    if (saved) { setToken(saved); loadNews(saved); }
  }, []);

  const login = async () => {
    setLoginError('');
    try {
      const r = await fetch(getApiUrl() + '/api/v1/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
      });
      const d = await r.json();
      if (d.success) {
        setToken(d.token);
        localStorage.setItem('gridrunner_admin_token', d.token);
        loadNews(d.token);
      } else setLoginError(d.message || 'Неверный пароль');
    } catch { setLoginError('Network error'); }
  };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2000); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title.trim() || !content.trim()) return;
    if (editingId) {
      await fetch(getApiUrl() + '/api/v1/admin/news/' + editingId, {
        method: 'PUT', headers: hdrs(token), body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      flash(lang === 'ru' ? 'Сохранено' : 'Saved');
    } else {
      await fetch(getApiUrl() + '/api/v1/admin/news', {
        method: 'POST', headers: hdrs(token), body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      flash(lang === 'ru' ? 'Опубликовано' : 'Published');
    }
    setTitle(''); setContent(''); setEditingId(null);
    loadNews(token);
  };

  const edit = (item: NewsItem) => {
    setTitle(item.title); setContent(item.content); setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string | number) => {
    if (!token || !confirm(lang === 'ru' ? 'Удалить?' : 'Delete?')) return;
    await fetch(getApiUrl() + '/api/v1/admin/news/' + id, { method: 'DELETE', headers: hdrs(token) });
    if (editingId === id) { setTitle(''); setContent(''); setEditingId(null); }
    loadNews(token);
  };

  const togglePin = async (item: NewsItem) => {
    if (!token) return;
    await fetch(getApiUrl() + '/api/v1/admin/news/' + item.id, {
      method: 'PUT', headers: hdrs(token), body: JSON.stringify({ pinned: !item.pinned }),
    });
    loadNews(token);
  };

  if (!token) {
    return (
      <div className="page" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{lang === 'ru' ? 'Управление новостями' : 'News management'}</h2>
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          <input type="password" placeholder={lang === 'ru' ? 'Админ-пароль' : 'Admin password'} value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', marginBottom: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, outline: 'none' }} />
          <button onClick={login}
            style={{ width: '100%', padding: '12px 0', background: 'rgba(0,230,118,0.12)', border: '1px solid #00e676', borderRadius: 10, cursor: 'pointer', color: '#00e676', fontWeight: 700, fontSize: 14 }}>
            {lang === 'ru' ? 'ВОЙТИ' : 'LOGIN'}
          </button>
          {loginError && <p style={{ color: '#ff5050', fontSize: 12, marginTop: 12 }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px' }}>
      <Link href="/news" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, color: 'inherit', textDecoration: 'none', fontSize: 14, opacity: 0.5 }}>&larr; {lang === 'ru' ? 'К новостям' : 'Back to news'}</Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>{lang === 'ru' ? 'Управление новостями' : 'News management'}</h1>

      {msg && <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(0,255,200,0.15)', border: '1px solid #00ffcc', borderRadius: 8, padding: '8px 16px', fontSize: 12 }}>{msg}</div>}

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
            <button onClick={() => togglePin(item)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', color: item.pinned ? '#ff9100' : 'inherit', fontSize: 11, cursor: 'pointer' }}>PIN</button>
            <button onClick={() => edit(item)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', color: 'inherit', fontSize: 11, cursor: 'pointer' }}>{lang === 'ru' ? 'Ред' : 'Edit'}</button>
            <button onClick={() => remove(item.id)} style={{ background: 'none', border: '1px solid rgba(255,23,68,0.3)', borderRadius: 6, padding: '4px 8px', color: '#ff1744', fontSize: 11, cursor: 'pointer' }}>X</button>
          </div>
        ))}
      </div>
    </div>
  );
}
