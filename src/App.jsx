import { CLAN } from './config.js';
import React, { useEffect, useState } from 'react';
import Overview from './pages/Overview.jsx';
import Race from './pages/Race.jsx';
import { PlayerList, Profile } from './pages/Players.jsx';
import { Kraken, Records, Ratings, Trends } from './pages/Misc.jsx';
import Admin from './pages/Admin.jsx';

const NAV = [['', 'Overview', '⌂', 'Clan performance at a glance'], ['piggy', 'Piggy Race', '🐷', 'Overall, event, recent-form and week comparison views'], ['space', 'Space Race', '🚀', 'Lightyears, event results and recent-form views'], ['kraken', 'Kraken', '🐙', 'Monthly damage, personal bests and current-roster performance'], ['trends', 'Trends', '↗', 'Compare players over time'], ['ratings', 'Player Ratings', '★', 'Master rating model'], ['players', 'Players', '●', 'Individual performance history and profiles'], ['records', 'Records', '♛', `Current ${CLAN} benchmark board`], ['admin', 'Data', '⚙', 'Add weeks and import scores']];
const useHash = () => { const [h, s] = useState(location.hash.slice(2)); useEffect(() => { const f = () => { s(location.hash.slice(2)); window.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []); return h; };

export default function App() {
  const hash = useHash(), [open, setOpen] = useState(false), [path, qs] = hash.split('?'), [root, arg] = path.split('/');
  const go = p => { location.hash = '/' + p; setOpen(false); };
  const cur = NAV.find(n => n[0] === root) || NAV[0];
  const title = root === 'players' && arg ? 'Players' : cur[1];
  let page;
  switch (root) {
    case 'piggy': page = <Race k="pr" go={go} />; break;
    case 'space': page = <Race k="sr" go={go} />; break;
    case 'kraken': page = <Kraken go={go} />; break;
    case 'trends': page = <Trends params={new URLSearchParams(qs)} key={qs} />; break;
    case 'ratings': page = <Ratings go={go} />; break;
    case 'players': page = arg ? <Profile id={arg} go={go} /> : <PlayerList go={go} />; break;
    case 'records': page = <Records go={go} />; break;
    case 'admin': page = <Admin />; break;
    default: page = <Overview go={go} />;
  }
  return (
    <div className="shell">
      <div className={'scrim' + (open ? ' on' : '')} onClick={() => setOpen(false)} />
      <nav className={'nav' + (open ? ' on' : '')} aria-label="Main">
        <div className="brand"><div className="logo">{CLAN[0]}</div><div><b>{CLAN}</b><small>STAT CENTER</small></div></div>
        {NAV.map(([k, l, i]) => <a key={k} href={'#/' + k} className={k === cur[0] ? 'on' : ''} onClick={() => setOpen(false)}><span style={{ width: 20, textAlign: 'center' }}>{i}</span>{l}</a>)}
        <div className="src"><div className="up">Data source</div>Weekly scorelog · stored locally</div>
      </nav>
      <header className="hdr"><button className="ico" aria-label="Open menu" onClick={() => setOpen(true)}>☰</button><div><h1>{title}</h1><small>{cur[3]}</small></div></header>
      <main className="main">{page}</main>
    </div>
  );
}
