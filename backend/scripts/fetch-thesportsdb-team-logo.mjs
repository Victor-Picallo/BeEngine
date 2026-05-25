/** Extrae logo de equipo desde TheSportsDB (página HTML). */
export async function fetchTheSportsDbTeamLogo(teamId) {
  const r = await fetch(`https://www.thesportsdb.com/team/${teamId}`, {
    headers: { 'User-Agent': 'BeEngine/1.0 (moto2-logos)' },
  });
  const html = await r.text();
  const m = html.match(
    /https:\/\/r2\.thesportsdb\.com\/images\/media\/team\/logo\/[a-z0-9]+\.(?:png|jpg|svg)/i,
  );
  return m?.[0] ?? null;
}
