 "use client";

import { useMemo, useState } from "react";

type Status = "Queued" | "Ongoing" | "Completed";
type Match = {
  id: number;
  round: number;
  a: string[];
  b: string[];
  status: Status;
  winner?: "Team A" | "Team B";
};
type Page = "overview" | "players" | "matchmaking" | "games" | "queues" | "history" | "display";

const initialPlayers = [
  "Alex Morgan", "Jordan Lee", "Taylor Smith", "Chris Walker",
  "Sam Rivera", "Jamie Chen", "Drew Parker", "Casey Brooks",
  "Riley James", "Avery Scott", "Morgan Blake", "Cameron Reed",
];

const navItems: { id: Page; label: string; icon: string; group: string }[] = [
  { id: "overview", label: "Overview", icon: "▦", group: "WORKSPACE" },
  { id: "players", label: "Players", icon: "♙", group: "WORKSPACE" },
  { id: "matchmaking", label: "Matchmaking", icon: "⤨", group: "WORKSPACE" },
  { id: "games", label: "Game Management", icon: "▤", group: "WORKSPACE" },
  { id: "queues", label: "Winner & Loser Queues", icon: "⇄", group: "WORKSPACE" },
  { id: "history", label: "Match History", icon: "◷", group: "WORKSPACE" },
  { id: "display", label: "Live Court Display", icon: "▣", group: "DISPLAY" },
];

function shuffle<T,>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function Home() {
  const [page, setPage] = useState<Page>("overview");
  const [players, setPlayers] = useState(initialPlayers);
  const [matches, setMatches] = useState<Match[]>([]);
  const [nextId, setNextId] = useState(1);
  const [round, setRound] = useState(0);
  const [newPlayer, setNewPlayer] = useState("");
  const [search, setSearch] = useState("");
  const [sessionName] = useState("Saturday Open Play");
  const [notice, setNotice] = useState("");
  const [resultMatch, setResultMatch] = useState<number | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<"Team A" | "Team B">("Team A");

  const activeMatches = matches.filter((m) => m.status !== "Completed");
  const queuedMatches = matches.filter((m) => m.status === "Queued");
  const ongoingMatches = matches.filter((m) => m.status === "Ongoing");
  const completedMatches = matches.filter((m) => m.status === "Completed");
  const busyPlayers = new Set(activeMatches.flatMap((m) => [...m.a, ...m.b]));
  const availablePlayers = players.filter((p) => !busyPlayers.has(p));

  const winnerPlayers = completedMatches.flatMap((m) =>
    m.winner === "Team A" ? m.a : m.winner === "Team B" ? m.b : []
  );
  const loserPlayers = completedMatches.flatMap((m) =>
    m.winner === "Team A" ? m.b : m.winner === "Team B" ? m.a : []
  );

  const pageTitle: Record<Page, string> = {
    overview: "Overview",
    players: "Player Management",
    matchmaking: "Random Matchmaking",
    games: "Game Management",
    queues: "Winner & Loser Queues",
    history: "Match History",
    display: "Live Court Display",
  };

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  function addPlayer() {
    const name = newPlayer.trim();
    if (!name) return flash("Enter a player name.");
    if (players.some((p) => p.toLowerCase() === name.toLowerCase())) return flash("This player is already registered.");
    setPlayers((prev) => [...prev, name]);
    setNewPlayer("");
    flash("Player added successfully.");
  }

  function removePlayer(name: string) {
    if (busyPlayers.has(name)) return flash("This player is assigned to an active match.");
    setPlayers((prev) => prev.filter((p) => p !== name));
    flash("Player removed.");
  }

  function createMatches(names: string[], targetRound: number) {
    const shuffled = shuffle([...new Set(names)]);
    const created: Match[] = [];
    let id = nextId;
    for (let i = 0; i + 3 < shuffled.length; i += 4) {
      created.push({
        id: id++,
        round: targetRound,
        a: shuffled.slice(i, i + 2),
        b: shuffled.slice(i + 2, i + 4),
        status: "Queued",
      });
    }
    setNextId(id);
    setMatches((prev) => [...prev, ...created]);
    return { count: created.length, waiting: shuffled.length % 4 };
  }

  function generateInitial() {
    if (availablePlayers.length < 4) return flash("At least four available players are required.");
    const nextRound = round + 1;
    const result = createMatches(availablePlayers, nextRound);
    setRound(nextRound);
    flash(`${result.count} match(es) generated. ${result.waiting} player(s) waiting.`);
  }

  function advanceQueues() {
    const winners = [...new Set(winnerPlayers)].filter((p) => availablePlayers.includes(p));
    const losers = [...new Set(loserPlayers)].filter((p) => availablePlayers.includes(p));
    if (!winners.length && !losers.length) return flash("Record completed match results first.");
    const nextRound = round + 1;
    const w = createMatches(winners, nextRound);
    const l = createMatches(losers, nextRound);
    if (w.count + l.count === 0) return flash("Not enough eligible players to create a new match.");
    setRound(nextRound);
    flash(`Next round created: ${w.count} winner match(es), ${l.count} loser match(es).`);
  }

  function saveResult() {
    if (resultMatch === null) return;
    setMatches((prev) => prev.map((m) =>
      m.id === resultMatch ? { ...m, status: "Completed", winner: selectedWinner } : m
    ));
    setResultMatch(null);
    flash("Match result saved.");
  }

  function stat(label: string, value: number, note: string, icon: string) {
    return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
  }

  function matchCard(match: Match) {
    return <div className="match-card" key={match.id}>
      <div className="match-top"><span>MATCH {String(match.id).padStart(3, "0")} · ROUND {match.round}</span><span className={`pill ${match.status.toLowerCase()}`}>{match.status}</span></div>
      <div className="teams">
        <div className="team"><b>TEAM A</b>{match.a.map((p) => <span key={p}>{p}</span>)}</div>
        <div className="versus">VS</div>
        <div className="team"><b>TEAM B</b>{match.b.map((p) => <span key={p}>{p}</span>)}</div>
      </div>
      {match.status === "Completed" && <div className="winner-note">Winner: <strong>{match.winner}</strong></div>}
      {match.status !== "Completed" && <div className="match-actions">
        {match.status === "Queued" && <button className="button button-light button-small" onClick={() => setMatches((prev) => prev.map((m) => m.id === match.id ? { ...m, status: "Ongoing" } : m))}>Start match</button>}
        {match.status === "Ongoing" && <button className="button button-primary button-small" onClick={() => { setResultMatch(match.id); setSelectedWinner("Team A"); }}>Record result</button>}
      </div>}
    </div>;
  }

  function heading(eyebrow: string, title: string, subtitle: string, action?: React.ReactNode) {
    return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
  }

  const content = useMemo(() => {
    if (page === "overview") return <>
      {heading("SATURDAY OPEN PLAY · SESSION OVERVIEW", "Good game starts here.", "Manage players, create matches, and keep every court moving.", <button className="button button-primary" onClick={generateInitial}>＋ Generate matches</button>)}
      <div className="stats-grid">
        {stat("REGISTERED PLAYERS", players.length, "Players in this session", "♙")}
        {stat("ACTIVE MATCHES", ongoingMatches.length, "Currently on court", "▣")}
        {stat("QUEUED MATCHES", queuedMatches.length, "Waiting to play", "◷")}
        {stat("COMPLETED GAMES", completedMatches.length, "Results recorded", "✓")}
      </div>
      <div className="dashboard-columns">
        <section className="panel"><div className="panel-heading"><h3>Match activity</h3><span>Current session</span></div>
          {activeMatches.length ? activeMatches.slice(0, 3).map(matchCard) : <Empty>No active matches yet. Generate your first round to get started.</Empty>}
          <button className="button button-light button-small" onClick={() => setPage("games")}>View all matches →</button>
        </section>
        <section className="panel"><div className="panel-heading"><h3>Session snapshot</h3><span>Live</span></div>
          <InfoRow icon="♙" title={`${players.length} players registered`} detail="Ready for session play" />
          <InfoRow icon="▣" title={`${ongoingMatches.length} matches on court`} detail="Currently in progress" />
          <InfoRow icon="⇄" title={`${availablePlayers.length} available players`} detail="Not assigned to active matches" />
          <InfoRow icon="✓" title={`${completedMatches.length} results recorded`} detail="In this session" />
        </section>
      </div>
      <section className="panel quick-panel"><div className="panel-heading"><h3>Quick actions</h3><span>Session tools</span></div><div className="quick-actions">
        <button className="button button-light" onClick={() => setPage("players")}>＋ Add players</button>
        <button className="button button-light" onClick={() => setPage("matchmaking")}>⤨ Create matchups</button>
        <button className="button button-light" onClick={() => setPage("queues")}>⇄ Manage queues</button>
        <button className="button button-light" onClick={() => setPage("display")}>▣ Open live display</button>
      </div></section>
    </>;

    if (page === "players") return <>
      {heading("SESSION SETUP", "Player management", "Register and organize the players participating in your current session.")}
      <section className="panel"><div className="panel-heading"><h3>Add a player</h3><span>{players.length} registered</span></div>
        <div className="add-player-form"><div className="field"><label htmlFor="player-name">PLAYER NAME</label><input id="player-name" value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="Enter full name" /></div><div className="field"><label>SESSION</label><input value={sessionName} disabled /></div><button className="button button-primary" onClick={addPlayer}>＋ Add player</button></div>
      </section>
      <section className="panel section-gap"><div className="panel-heading"><h3>Registered players</h3><input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players..." /></div>
        <div className="table-wrap"><table><thead><tr><th>PLAYER</th><th>SESSION STATUS</th><th>GAMES PLAYED</th><th>ACTION</th></tr></thead><tbody>
          {players.filter((p) => p.toLowerCase().includes(search.toLowerCase())).map((p) => <tr key={p}><td><strong>{p}</strong></td><td><span className={`pill ${busyPlayers.has(p) ? "ongoing" : "completed"}`}>{busyPlayers.has(p) ? "Assigned" : "Available"}</span></td><td>{completedMatches.filter((m) => [...m.a, ...m.b].includes(p)).length}</td><td><button className="text-button" disabled={busyPlayers.has(p)} onClick={() => removePlayer(p)}>Remove</button></td></tr>)}
        </tbody></table></div>
      </section>
    </>;

    if (page === "matchmaking") return <>
      {heading("MATCH GENERATION", "Random matchmaking", "Create randomized doubles matchups through player distribution.")}
      <div className="notice">Players are shuffled into teams of two. The system prevents duplicate assignments within the same round. Players left over from an incomplete group remain available.</div>
      <div className="dashboard-columns">
        <section className="panel"><div className="panel-heading"><h3>Match generation setup</h3><span>ROUND {round + 1}</span></div><div className="large-number">{availablePlayers.length}</div><p className="muted">Players available for new matches</p><div className="setting-row"><span>Session format</span><strong>Doubles · 2 vs. 2</strong></div><div className="setting-row"><span>Assignment method</span><strong>Random shuffle</strong></div><button className="button button-primary full-button" onClick={generateInitial}>⤨ Generate random matchups</button></section>
        <section className="panel"><div className="panel-heading"><h3>Generation summary</h3></div><InfoRow icon="♙" title={`${availablePlayers.length} available players`} detail="Eligible for new matches" /><InfoRow icon="▤" title={`${Math.floor(availablePlayers.length / 4)} possible matches`} detail="Based on groups of four" /><InfoRow icon="◷" title={`${availablePlayers.length % 4} waiting players`} detail="Remaining after full assignments" /></section>
      </div>
      <section className="panel section-gap"><div className="panel-heading"><h3>Current matchups</h3><span>{activeMatches.length} active</span></div>{activeMatches.length ? activeMatches.map(matchCard) : <Empty>No matchups generated yet.</Empty>}</section>
    </>;

    if (page === "games") return <>
      {heading("COURT OPERATIONS", "Game management", "Monitor match status and record match outcomes.")}
      <div className="stats-grid">{stat("ONGOING", ongoingMatches.length, "Currently playing", "▣")}{stat("QUEUED", queuedMatches.length, "Waiting to start", "◷")}{stat("COMPLETED", completedMatches.length, "Finished matches", "✓")}{stat("AVAILABLE PLAYERS", availablePlayers.length, "Not assigned", "♙")}</div>
      <section className="panel"><div className="panel-heading"><h3>Match board</h3><span>{matches.length} total matches</span></div>{matches.length ? matches.map(matchCard) : <Empty>No games yet. Generate matches to populate the board.</Empty>}</section>
    </>;

    if (page === "queues") return <>
      {heading("AUTOMATED PLAYER ROTATION", "Winner & loser queues", "Review match outcomes and prepare the next round of doubles matchups.")}
      <div className="notice">Queue progression groups players by match outcome. Winners are paired with winners, and losing players are paired with losing players. Incomplete groups wait until four eligible players are available.</div>
      <div className="dashboard-columns">
        <section className="panel"><div className="panel-heading"><h3>🏆 Winner queue</h3><span>{winnerPlayers.length} players</span></div>{winnerPlayers.length ? winnerPlayers.map((p, i) => <InfoRow key={`${p}-${i}`} icon={String(i + 1)} title={p} detail="Winning team" />) : <Empty>Winning players appear here after results are recorded.</Empty>}</section>
        <section className="panel"><div className="panel-heading"><h3>↻ Loser queue</h3><span>{loserPlayers.length} players</span></div>{loserPlayers.length ? loserPlayers.map((p, i) => <InfoRow key={`${p}-${i}`} icon={String(i + 1)} title={p} detail="Opposing team" />) : <Empty>Losing players appear here after results are recorded.</Empty>}</section>
      </div>
      <section className="panel section-gap"><div className="panel-heading"><h3>Next round generation</h3><span>Automatic pairing</span></div><p className="muted">Generate the next round from completed match outcomes. Each outcome group is shuffled independently; players are not duplicated across active matches.</p><button className="button button-primary" onClick={advanceQueues}>Generate next round from results →</button></section>
    </>;

    if (page === "history") return <>
      {heading("SESSION RECORDS", "Match history", "Review completed matches and their recorded outcomes.")}
      <section className="panel"><div className="panel-heading"><h3>Completed matches</h3><span>{completedMatches.length} records</span></div>
        {completedMatches.length ? <div className="table-wrap"><table><thead><tr><th>MATCH</th><th>ROUND</th><th>TEAM A</th><th>TEAM B</th><th>WINNER</th></tr></thead><tbody>{completedMatches.map((m) => <tr key={m.id}><td>#{m.id}</td><td>{m.round}</td><td>{m.a.join(" + ")}</td><td>{m.b.join(" + ")}</td><td><span className="pill completed">{m.winner}</span></td></tr>)}</tbody></table></div> : <Empty>No completed matches to display yet.</Empty>}
      </section>
    </>;

    return <>{heading("PUBLIC DISPLAY", "Live court display", "A presentation-ready view for a TV, monitor, or public screen.", <button className="button button-primary" onClick={() => document.getElementById("live-board")?.requestFullscreen?.()}>⛶ Fullscreen</button>)}
      <section className="live-board" id="live-board">
        <div className="live-header"><div><div className="live-eyebrow">LIVE SESSION</div><h2>COURT FLOW <span>●</span></h2><p>{sessionName} · Doubles Open Play</p></div><span className="live-badge">● LIVE</span></div>
        <div className="live-columns">
          <div className="live-box"><h3>NOW PLAYING</h3>{ongoingMatches.length ? ongoingMatches.map((m) => <div className="live-match" key={m.id}><small>MATCH {m.id} · ROUND {m.round}</small><strong>{m.a.join(" + ")}</strong><span>VS</span><strong>{m.b.join(" + ")}</strong></div>) : <p className="live-empty">No ongoing matches. Check back shortly.</p>}</div>
          <div className="live-box"><h3>UP NEXT</h3>{queuedMatches.length ? queuedMatches.map((m) => <div className="live-match" key={m.id}><small>MATCH {m.id}</small><strong>{m.a.join(" + ")}</strong><span>VS</span><strong>{m.b.join(" + ")}</strong></div>) : <p className="live-empty">No upcoming matches in queue.</p>}</div>
        </div>
        <div className="live-footer"><span>PLAY FAIR. PLAY MORE.</span><span>{players.length} REGISTERED PLAYERS · {completedMatches.length} MATCHES COMPLETED</span></div>
      </section>
      <section className="panel section-gap"><div className="panel-heading"><h3>Display information</h3><span>Public view</span></div><p className="muted">This screen is intended for a dedicated TV or monitor. It reflects match status and queue data recorded by the operator.</p></section>
    </>;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, players, matches, round, newPlayer, search, notice]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P</div><div><strong>COURT FLOW</strong><small>PICKLEBALL MANAGEMENT</small></div></div>
      <div className="sidebar-nav">
        <div className="nav-label">WORKSPACE</div>
        {navItems.filter((item) => item.group === "WORKSPACE").map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "selected" : ""}`} onClick={() => setPage(item.id)}><span>{item.icon}</span>{item.label}</button>)}
        <div className="nav-label display-label">DISPLAY</div>
        {navItems.filter((item) => item.group === "DISPLAY").map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "selected" : ""}`} onClick={() => setPage(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      </div>
      <div className="sidebar-session"><b>● SESSION ACTIVE</b><span>{sessionName}</span><small>Doubles · 2 vs. 2</small></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{pageTitle[page]}</strong></div><div className="admin"><span>DEMO ENVIRONMENT</span><div className="avatar">A</div><b>Administrator</b></div></header>
      <div className="content-area">{content}</div>
      <footer className="footer">COURT FLOW <span>·</span> PICKLEBALL MATCHMAKING PROTOTYPE</footer>
    </main>
    {notice && <div className="toast">{notice}</div>}
    {resultMatch !== null && <div className="modal-backdrop"><div className="modal"><div className="eyebrow">MATCH RESULT</div><h2>Record match result</h2><p className="muted">Choose the winning team for Match #{resultMatch}.</p><label className="field-label" htmlFor="winner">WINNING TEAM</label><select id="winner" value={selectedWinner} onChange={(e) => setSelectedWinner(e.target.value as "Team A" | "Team B")}><option value="Team A">Team A</option><option value="Team B">Team B</option></select><div className="modal-actions"><button className="button button-light" onClick={() => setResultMatch(null)}>Cancel</button><button className="button button-primary" onClick={saveResult}>Save result</button></div></div></div>}
  </div>;
}

function InfoRow({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <div className="info-row"><div className="info-icon">{icon}</div><div><strong>{title}</strong><small>{detail}</small></div></div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
