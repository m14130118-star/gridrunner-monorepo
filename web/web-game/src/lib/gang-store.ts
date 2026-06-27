export interface Gang {
  id: string;
  name: string;
  color: string;
  baseLat: number;
  baseLng: number;
  leader: string;
  members: string[];
}

export interface GangInvite {
  id: string;
  gangId: string;
  gangName: string;
  from: string;
  to: string;
}

function gangs(): Gang[] {
  try { return JSON.parse(localStorage.getItem('gridrunner_gangs') || '[]'); } catch { return []; }
}

function save(g: Gang[]) { localStorage.setItem('gridrunner_gangs', JSON.stringify(g)); }

function invites(): GangInvite[] {
  try { return JSON.parse(localStorage.getItem('gridrunner_invites') || '[]'); } catch { return []; }
}

function saveInvites(i: GangInvite[]) { localStorage.setItem('gridrunner_invites', JSON.stringify(i)); }

export function createGang(name: string, color: string, lat: number, lng: number, leader: string): Gang {
  const g: Gang = { id: `g_${Date.now()}`, name, color, baseLat: lat, baseLng: lng, leader, members: [leader] };
  const all = gangs();
  all.push(g);
  save(all);
  return g;
}

export function getMyGangs(username: string): Gang[] {
  return gangs().filter(g => g.members.includes(username));
}

export function getGang(id: string): Gang | undefined {
  return gangs().find(g => g.id === id);
}

export function sendInvite(gangId: string, from: string, to: string): void {
  const g = getGang(gangId);
  if (!g) return;
  const inv = invites();
  if (inv.find(i => i.gangId === gangId && i.to === to && i.from === from)) return;
  inv.push({ id: `inv_${Date.now()}`, gangId, gangName: g.name, from, to });
  saveInvites(inv);
}

export function getMyInvites(username: string): GangInvite[] {
  return invites().filter(i => i.to === username);
}

export function acceptInvite(inviteId: string): boolean {
  const inv = invites();
  const idx = inv.findIndex(i => i.id === inviteId);
  if (idx === -1) return false;
  const i = inv[idx];
  const allGangs = gangs();
  const g = allGangs.find(gg => gg.id === i.gangId);
  if (!g) return false;
  if (!g.members.includes(i.to)) g.members.push(i.to);
  save(allGangs);
  inv.splice(idx, 1);
  saveInvites(inv);
  return true;
}

export function declineInvite(inviteId: string): void {
  const inv = invites();
  saveInvites(inv.filter(i => i.id !== inviteId));
}

export function getGangColor(username: string): string | null {
  const g = gangs().find(gg => gg.members.includes(username));
  return g?.color || null;
}
