import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../src/lib/i18n';
import { createGang, getMyGangs, getMyInvites, acceptInvite, declineInvite, sendInvite, getGang } from '../src/lib/gang-store';
import type { Gang, GangInvite } from '../src/lib/gang-store';

export default function Arena() {
  const { t, lang } = useT();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [myGangs, setMyGangs] = useState<Gang[]>([]);
  const [myInvites, setMyInvites] = useState<GangInvite[]>([]);
  const [tab, setTab] = useState<'gangs' | 'create' | 'invites'>('gangs');

  // create gang form
  const [gName, setGName] = useState('');
  const [gColor, setGColor] = useState('#00e676');
  const [inviteTarget, setInviteTarget] = useState('');
  const [selectedGang, setSelectedGang] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('gridrunner_user');
      if (!u) { router.push('/auth/login'); return; }
      const p = JSON.parse(u);
      if (!p.username) { router.push('/auth/login'); return; }
      setUsername(p.username);
      setMyGangs(getMyGangs(p.username));
      setMyInvites(getMyInvites(p.username));
    } catch { router.push('/auth/login'); }
  }, [router]);

  const refresh = () => {
    if (!username) return;
    setMyGangs(getMyGangs(username));
    setMyInvites(getMyInvites(username));
  };

  const handleCreate = () => {
    if (!gName.trim() || !username || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        createGang(gName.trim(), gColor, pos.coords.latitude, pos.coords.longitude, username);
        setGName('');
        refresh();
        setTab('gangs');
      },
      () => { createGang(gName.trim(), gColor, 55.75, 37.62, username); setGName(''); refresh(); setTab('gangs'); },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleInvite = () => {
    if (!selectedGang || !inviteTarget.trim() || !username) return;
    sendInvite(selectedGang, username, inviteTarget.trim());
    setInviteTarget('');
  };

  const selected = selectedGang ? getGang(selectedGang) : null;

  if (!username) return null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #ff1744, #ff9100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 18, fontWeight: 800, color: '#000' }}>A</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{lang === 'ru' ? 'Арена' : 'Arena'}</h1>
        <p style={{ fontSize: 13, opacity: 0.4 }}>{lang === 'ru' ? 'Банды, соревнования и обмен маршрутами' : 'Gangs, competitions and route sharing'}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['gangs', 'create', 'invites'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t ? 'rgba(255,255,255,0.06)' : 'transparent', color: tab === t ? 'inherit' : 'rgba(255,255,255,0.4)' }}>
            {t === 'gangs' ? (lang === 'ru' ? 'Мои банды' : 'My Gangs') : t === 'create' ? (lang === 'ru' ? 'Создать' : 'Create') : (lang === 'ru' ? `Приглашения (${myInvites.length})` : `Invites (${myInvites.length})`)}
          </button>
        ))}
      </div>

      {/* My Gangs */}
      {tab === 'gangs' && (
        <div>
          {myGangs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, opacity: 0.4, fontSize: 14 }}>
              {lang === 'ru' ? 'У тебя пока нет банды. Создай!' : 'You don\'t have a gang yet. Create one!'}
            </div>
          ) : (
            myGangs.map(g => (
              <div key={g.id} style={{ marginBottom: 12, padding: 16, borderRadius: 16, border: `2px solid ${g.color}30`, background: `${g.color}08` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#000' }}>{g.name[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.4 }}>{g.members.length} {lang === 'ru' ? 'участников' : 'members'} · {g.leader === username ? (lang === 'ru' ? 'лидер' : 'leader') : ''}</div>
                  </div>
                </div>

                {/* Mini-map territory */}
                <div style={{ width: '100%', height: 100, borderRadius: 10, background: `radial-gradient(ellipse at 50% 50%, ${g.color}30 0%, ${g.color}10 60%, transparent 80%)`, border: `1px solid ${g.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, opacity: 0.4, marginBottom: 8 }}>
                  {g.baseLat.toFixed(4)}, {g.baseLng.toFixed(4)}
                </div>

                {/* Invite members */}
                {g.leader === username && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={selectedGang === g.id ? inviteTarget : ''}
                      onChange={e => { setSelectedGang(g.id); setInviteTarget(e.target.value); }}
                      placeholder={lang === 'ru' ? 'Имя игрока' : 'Player name'}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 12, outline: 'none' }} />
                    <button onClick={() => { setSelectedGang(g.id); handleInvite(); }}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: g.color, color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      {lang === 'ru' ? 'Пригласить' : 'Invite'}
                    </button>
                  </div>
                )}

                {/* Members list */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {g.members.map(m => (
                    <span key={m} style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: `${g.color}15`, color: g.color, fontWeight: 600 }}>{m}{m === g.leader ? ' ★' : ''}</span>
                  ))}
                </div>
              </div>
            ))
          )}

          {myGangs.length > 0 && (
            <div style={{ marginTop: 16, padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
              <p style={{ fontSize: 12, opacity: 0.4, marginBottom: 12 }}>{lang === 'ru' ? 'Делись маршрутами внутри банды' : 'Share routes within the gang'}</p>
              <p style={{ fontSize: 11, opacity: 0.3 }}>{lang === 'ru' ? 'Скоро: общие челленджи и захват территорий' : 'Coming: shared challenges and territory capture'}</p>
            </div>
          )}
        </div>
      )}

      {/* Create gang */}
      {tab === 'create' && (
        <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{lang === 'ru' ? 'Создать банду' : 'Create a Gang'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={gName} onChange={e => setGName(e.target.value)} placeholder={lang === 'ru' ? 'Название банды' : 'Gang name'}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, outline: 'none' }} />
            <div>
              <label style={{ fontSize: 12, opacity: 0.4, display: 'block', marginBottom: 6 }}>{lang === 'ru' ? 'Цвет банды' : 'Gang color'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#00e676', '#69f0ae', '#ff9100', '#ff1744', '#7c4dff', '#ffd740', '#00bcd4', '#e040fb'].map(c => (
                  <button key={c} onClick={() => setGColor(c)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: c, border: gColor === c ? '2px solid #fff' : 'none', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <p style={{ fontSize: 11, opacity: 0.3 }}>{lang === 'ru' ? 'База банды будет установлена по твоему текущему местоположению' : 'Gang base will be set to your current location'}</p>
            <button onClick={handleCreate} disabled={!gName.trim()}
              style={{ padding: '12px 0', borderRadius: 10, border: 'none', background: gColor, color: '#000', fontWeight: 700, fontSize: 14, cursor: gName.trim() ? 'pointer' : 'not-allowed', opacity: gName.trim() ? 1 : 0.4 }}>
              {lang === 'ru' ? 'Создать банду' : 'Create Gang'}
            </button>
          </div>
        </div>
      )}

      {/* Invites */}
      {tab === 'invites' && (
        <div>
          {myInvites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, opacity: 0.4, fontSize: 14 }}>
              {lang === 'ru' ? 'Нет приглашений' : 'No invites'}
            </div>
          ) : (
            myInvites.map(inv => (
              <div key={inv.id} style={{ marginBottom: 10, padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{inv.gangName}</div>
                  <div style={{ fontSize: 11, opacity: 0.4 }}>{lang === 'ru' ? 'От' : 'From'} {inv.from}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { acceptInvite(inv.id); refresh(); }} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#00e676', color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✓</button>
                  <button onClick={() => { declineInvite(inv.id); refresh(); }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'inherit', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Route sharing placeholder */}
      <div style={{ marginTop: 32, padding: 20, borderRadius: 16, border: '1px solid rgba(0,230,118,0.1)', background: 'rgba(0,230,118,0.02)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {lang === 'ru' ? 'Обмен маршрутами' : 'Route Sharing'}
        </p>
        <p style={{ fontSize: 12, opacity: 0.4 }}>
          {lang === 'ru'
            ? 'После завершения трипа ты сможешь поделиться маршрутом с бандой. API готов.'
            : 'After completing a trip you can share it with your gang. API is ready.'}
        </p>
      </div>
    </div>
  );
}
