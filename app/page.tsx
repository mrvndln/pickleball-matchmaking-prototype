 "use client";

 import { useEffect, useMemo, useState } from "react";

type Status = "Queued" | "Ongoing" | "Completed";
type Team = [string, string];
type Match = {
  id: number;
  round: number;
  a: Team;
  b: Team;
  status: Status;
  scoreA: number;
  scoreB: number;
  startedAt?: number;
  winner?: "Team A" | "Team B";
  bracket?: "Winner" | "Loser" | "Final" | "Reset";
};
type Page = "overview" | "players" | "matchmaking" | "games" | "queues" | "history" | "display";

const initialPlayers = [
  "Alex Morgan", "Jordan Lee", "Taylor Smith", "Chris Walker",
  "Sam Rivera", "Jamie Chen", "Drew Parker", "Casey Brooks",
  "Riley James", "Avery Scott", "Morgan Blake", "Cameron Reed",
  "Quinn Bailey", "Skyler Evans", "Parker Ellis", "Rowan Hayes",
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

function buildOpeningMatches(names: string[], targetRound: number, startId: number) {
  const shuffled = shuffle([...new Set(names)]);
  const created: Match[] = [];
  let id = startId;
  for (let i = 0; i + 3 < shuffled.length; i += 4) {
    created.push({
      id: id++,
      round: targetRound,
      a: [shuffled[i], shuffled[i + 1]],
      b: [shuffled[i + 2], shuffled[i + 3]],
      status: "Queued",
      scoreA: 0,
      scoreB: 0,
    });
  }
  return { created, nextId: id };
}

function buildBracketMatches(teams: Team[], targetRound: number, startId: number, bracket: Match["bracket"]) {
  const created: Match[] = [];
  for (let i = 0; i + 1 < teams.length; i += 2) {
    created.push({
      id: startId++,
      round: targetRound,
      a: teams[i],
      b: teams[i + 1],
      status: "Queued",
      scoreA: 0,
      scoreB: 0,
      bracket,
    });
  }
  return { created, nextId: startId, waiting: teams.slice(created.length * 2) };
}

function formatElapsedTime(startedAt: number, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const clock = [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  return hours ? `${String(hours).padStart(2, "0")}:${clock}` : clock;
}

export default function Home() {
  const [page, setPage] = useState<Page>("overview");
  const [players, setPlayers] = useState(initialPlayers);
  const [matches, setMatches] = useState<Match[]>([]);
  const [nextId, setNextId] = useState(1);
  const [round, setRound] = useState(0);
  const [waitingWinnerTeams, setWaitingWinnerTeams] = useState<Team[]>([]);
  const [waitingLoserTeams, setWaitingLoserTeams] = useState<Team[]>([]);
  const [newPlayer, setNewPlayer] = useState("");
  const [search, setSearch] = useState("");
  const [sessionName] = useState("Saturday Open Play");
  const [notice, setNotice] = useState("");
  const [lastResultMatchId, setLastResultMatchId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const activeMatches = matches.filter((m) => m.status !== "Completed");
  const queuedMatches = matches.filter((m) => m.status === "Queued");
  const ongoingMatches = matches.filter((m) => m.status === "Ongoing");
  const completedMatches = matches.filter((m) => m.status === "Completed");
  const lastResultMatch = matches.find((m) => m.id === lastResultMatchId && m.status === "Completed");
  const busyPlayers = new Set(activeMatches.flatMap((m) => [...m.a, ...m.b]));
  const availablePlayers = players.filter((p) => !busyPlayers.has(p));

  useEffect(() => {
    if (ongoingMatches.length === 0) return;
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [ongoingMatches.length]);

  const currentRoundMatches = matches.filter((m) => m.round === round);
  const roundComplete = currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.status === "Completed");
  const completedBracketMatches = currentRoundMatches.filter((m) => m.status === "Completed" && m.bracket !== "Final" && m.bracket !== "Reset");
  const roundWinnerTeams = completedBracketMatches.filter((m) => m.bracket !== "Loser").flatMap((m) =>
    m.winner === "Team A" ? [m.a] : m.winner === "Team B" ? [m.b] : []
  );
  const roundLoserBracketWinners = completedBracketMatches.filter((m) => m.bracket === "Loser").flatMap((m) =>
    m.winner === "Team A" ? [m.a] : m.winner === "Team B" ? [m.b] : []
  );
  const roundDroppedTeams = completedBracketMatches.filter((m) => m.bracket !== "Loser").flatMap((m) =>
    m.winner === "Team A" ? [m.b] : m.winner === "Team B" ? [m.a] : []
  );
  const winnerTeams = [...waitingWinnerTeams, ...roundWinnerTeams].filter((team) => team.every((p) => players.includes(p)));
  const loserTeams = [...waitingLoserTeams, ...roundLoserBracketWinners, ...roundDroppedTeams].filter((team) => team.every((p) => players.includes(p)));
  const winnerQueue = winnerTeams.flat();
  const loserQueue = loserTeams.flat();
  const grandFinalReady = roundComplete && winnerTeams.length === 1 && loserTeams.length === 1;
  const grandFinalMatch = matches.find((m) => m.bracket === "Final");
  const resetFinalMatch = matches.find((m) => m.bracket === "Reset");
  const tournamentComplete = resetFinalMatch
    ? resetFinalMatch.status === "Completed"
    : grandFinalMatch?.status === "Completed" && grandFinalMatch.winner === "Team A";
  const decidingMatch = resetFinalMatch ?? grandFinalMatch;
  const championTeam = tournamentComplete
    ? decidingMatch?.winner === "Team A" ? decidingMatch.a : decidingMatch?.b
    : null;
  const canAdvanceQueues = roundComplete && !tournamentComplete &&
    (winnerTeams.length >= 2 || loserTeams.length >= 2 || grandFinalReady);

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
    setWaitingWinnerTeams((prev) => prev.filter((team) => !team.includes(name)));
    setWaitingLoserTeams((prev) => prev.filter((team) => !team.includes(name)));
    flash("Player removed.");
  }

  function addMatchPoint(matchId: number, scoringTeam: "Team A" | "Team B") {
    const match = matches.find((item) => item.id === matchId);
    if (!match || match.status !== "Ongoing") return;
    const scoreA = match.scoreA + (scoringTeam === "Team A" ? 1 : 0);
    const scoreB = match.scoreB + (scoringTeam === "Team B" ? 1 : 0);
    const winner = scoreA >= 11 && scoreA - scoreB >= 2
      ? "Team A"
      : scoreB >= 11 && scoreB - scoreA >= 2
        ? "Team B"
        : undefined;
    const updatedMatch: Match = {
      ...match,
      scoreA,
      scoreB,
      status: winner ? "Completed" : match.status,
      winner,
    };

    if (winner) setLastResultMatchId(matchId);

    if (match.bracket === "Final" && winner === "Team B") {
      const resetMatch: Match = {
        id: nextId,
        round: match.round + 1,
        a: match.a,
        b: match.b,
        status: "Queued",
        scoreA: 0,
        scoreB: 0,
        bracket: "Reset",
      };
      setMatches((prev) => [...prev.map((item) => item.id === matchId ? updatedMatch : item), resetMatch]);
      setNextId(nextId + 1);
      setRound(resetMatch.round);
      flash("The loser-bracket champion won the grand final. A reset final is required.");
      return;
    }

    setMatches((prev) => prev.map((item) => item.id === matchId ? updatedMatch : item));
  }

  function startMatch(matchId: number) {
    setMatches((prev) => prev.map((match) =>
      match.id === matchId && match.status === "Queued"
        ? { ...match, status: "Ongoing", startedAt: Date.now() }
        : match
    ));
    setLastResultMatchId(null);
  }

  function generateInitial() {
    if (round > 0) return flash("The opening round has started. Use the winner and loser queues for later rounds.");
    if (availablePlayers.length < 4) return flash("At least four available players are required.");
    const nextRound = round + 1;
    const result = buildOpeningMatches(availablePlayers, nextRound, nextId);
    setNextId(result.nextId);
    setMatches((prev) => [...prev, ...result.created]);
    setRound(nextRound);
    flash(`${result.created.length} random opening match(es) generated. ${availablePlayers.length % 4} player(s) waiting.`);
  }

  function advanceQueues() {
    if (!currentRoundMatches.length) return flash("Generate the random opening round first.");
    if (!roundComplete) return flash("Complete every match in this round before generating the next bracket round.");
    if (tournamentComplete) return flash("The tournament is complete.");
    if (!canAdvanceQueues) return flash("Not enough players in either outcome pool to create a doubles match.");
    const nextRound = round + 1;
    if (grandFinalReady) {
      const finalMatch: Match = {
        id: nextId,
        round: nextRound,
        a: winnerTeams[0],
        b: loserTeams[0],
        status: "Queued",
        scoreA: 0,
        scoreB: 0,
        bracket: "Final",
      };
      setMatches((prev) => [...prev, finalMatch]);
      setNextId(nextId + 1);
      setWaitingWinnerTeams([]);
      setWaitingLoserTeams([]);
      setRound(nextRound);
      flash("Grand final created: winner-bracket champion vs. loser-bracket champion.");
      return;
    }
    const winners = buildBracketMatches(winnerTeams, nextRound, nextId, "Winner");
    const losers = buildBracketMatches(loserTeams, nextRound, winners.nextId, "Loser");
    setMatches((prev) => [...prev, ...winners.created, ...losers.created]);
    setNextId(losers.nextId);
    setWaitingWinnerTeams(winners.waiting);
    setWaitingLoserTeams(losers.waiting);
    setRound(nextRound);
    flash(`Bracket round created: ${winners.created.length} winner match(es), ${losers.created.length} loser match(es). Unmatched players receive a bye.`);
  }

  function stat(label: string, value: number, note: string, icon: string) {
    return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
  }

  function matchCard(match: Match) {
    return <div className="match-card" key={match.id}>
      <div className="match-top"><span>MATCH {String(match.id).padStart(3, "0")} · ROUND {match.round}{match.bracket === "Final" ? " · GRAND FINAL" : match.bracket === "Reset" ? " · GRAND FINAL RESET" : match.bracket ? ` · ${match.bracket.toUpperCase()} BRACKET` : " · RANDOM OPENING"}</span><span className={`pill ${match.status.toLowerCase()}`}>{match.status}</span></div>
      <div className="teams">
        <div className="team"><b>TEAM A</b>{match.a.map((p) => <span key={p}>{p}</span>)}</div>
        <div className="versus">VS</div>
        <div className="team"><b>TEAM B</b>{match.b.map((p) => <span key={p}>{p}</span>)}</div>
      </div>
      <div className="match-score">
        <div><span>TEAM A SCORE</span><strong>{match.scoreA}</strong>{match.status === "Ongoing" && <button className="button button-light button-small" onClick={() => addMatchPoint(match.id, "Team A")} aria-label={`Add point to Team A in match ${match.id}`}>+1 point</button>}</div>
        <b>—</b>
        <div><span>TEAM B SCORE</span><strong>{match.scoreB}</strong>{match.status === "Ongoing" && <button className="button button-light button-small" onClick={() => addMatchPoint(match.id, "Team B")} aria-label={`Add point to Team B in match ${match.id}`}>+1 point</button>}</div>
      </div>
      {match.status === "Ongoing" && match.startedAt !== undefined && <div className="match-elapsed">ELAPSED · {formatElapsedTime(match.startedAt, now)}</div>}
      {match.status === "Completed" && <div className="winner-note">Winner: <strong>{match.winner}</strong> · Final score {match.scoreA}–{match.scoreB}</div>}
      {match.status !== "Completed" && <div className="match-actions">
        {match.status === "Queued" && <button className="button button-light button-small" onClick={() => startMatch(match.id)}>Start match</button>}
      </div>}
    </div>;
  }

  function heading(eyebrow: string, title: string, subtitle: string, action?: React.ReactNode) {
    return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
  }

  const content = useMemo(() => {
    if (page === "overview") return <>
      {heading("SATURDAY OPEN PLAY · SESSION OVERVIEW", "Good game starts here.", "Manage players, create matches, and keep every court moving.", <button className="button button-primary" onClick={generateInitial} disabled={round > 0}>＋ {round ? "Opening round generated" : "Generate matches"}</button>)}
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
      {heading("MATCH GENERATION", "Random opening round", "Start with randomized doubles matchups, then continue through the winner and loser brackets.")}
      <div className="notice">The opening round randomly assigns available players. In the winner bracket, winners advance and losing teams drop to the loser bracket. In the loser bracket, winners advance and losing teams are eliminated. Doubles partners stay together; unpaired teams receive byes.</div>
      <div className="dashboard-columns">
        <section className="panel"><div className="panel-heading"><h3>Match generation setup</h3><span>{round ? `ROUND ${round} · ${roundComplete ? "COMPLETE" : "IN PROGRESS"}` : "ROUND 1"}</span></div><div className="large-number">{availablePlayers.length}</div><p className="muted">Players available for new matches</p><div className="setting-row"><span>Session format</span><strong>Doubles · 2 vs. 2</strong></div><div className="setting-row"><span>Assignment method</span><strong>{round ? "Winner / loser bracket" : "Random shuffle"}</strong></div><button className="button button-primary full-button" onClick={generateInitial} disabled={round > 0}>⤨ {round ? "Opening round generated" : "Generate random matchups"}</button></section>
        <section className="panel"><div className="panel-heading"><h3>Generation summary</h3></div><InfoRow icon="♙" title={`${availablePlayers.length} available players`} detail="Eligible for new matches" /><InfoRow icon="▤" title={`${Math.floor(availablePlayers.length / 4)} possible matches`} detail="Based on groups of four" /><InfoRow icon="◷" title={`${availablePlayers.length % 4} waiting players`} detail="Remaining after full assignments" /></section>
      </div>
      <section className="panel section-gap"><div className="panel-heading"><h3>Current matchups</h3><span>{activeMatches.length} active</span></div>{activeMatches.length ? activeMatches.map(matchCard) : <Empty>No matchups generated yet.</Empty>}</section>
    </>;

    if (page === "games") return <>
      {heading("COURT OPERATIONS", "Game management", "Monitor match status and record match outcomes.")}
      <div className="notice">Award points with the +1 buttons. A game finishes automatically when a team reaches at least 11 points and leads by 2. There is no game timer.</div>
      <div className="stats-grid">{stat("ONGOING", ongoingMatches.length, "Currently playing", "▣")}{stat("QUEUED", queuedMatches.length, "Waiting to start", "◷")}{stat("COMPLETED", completedMatches.length, "Finished matches", "✓")}{stat("AVAILABLE PLAYERS", availablePlayers.length, "Not assigned", "♙")}</div>
      <section className="panel"><div className="panel-heading"><h3>Match board</h3><span>{matches.length} total matches</span></div>{matches.length ? matches.map(matchCard) : <Empty>No games yet. Generate matches to populate the board.</Empty>}</section>
    </>;

    if (page === "queues") return <>
      {heading("AUTOMATED PLAYER ROTATION", "Winner & loser queues", "Review match outcomes and prepare the next round of doubles matchups.")}
      {tournamentComplete && championTeam && <div className="notice"><strong>Tournament complete!</strong> Champion: {championTeam[0]} and {championTeam[1]}.</div>}
      {resetFinalMatch && !tournamentComplete && <div className="notice">The loser-bracket champion won the grand final. Play the reset final to decide the tournament champion.</div>}
      <div className="notice">After the random opening round, winner-bracket teams that lose drop into the loser bracket. Loser-bracket teams that lose are eliminated. Winners advance within their bracket, and unpaired teams receive byes. The two bracket champions meet in the grand final; if the loser-bracket champion wins, a reset final is played.</div>
      <div className="dashboard-columns">
        <section className="panel"><div className="panel-heading"><h3>🏆 Winner queue</h3><span>{winnerQueue.length} players · {winnerTeams.length} teams</span></div>{winnerTeams.length ? winnerTeams.flatMap((team, teamIndex) => team.map((p, playerIndex) => <InfoRow key={`${teamIndex}-${p}`} icon={playerIndex ? "↳" : String(teamIndex + 1)} title={p} detail={waitingWinnerTeams.includes(team) ? "Bye · team carried forward" : `Winner · round ${round}`} />)) : <Empty>Winning teams appear here after round results are recorded.</Empty>}</section>
        <section className="panel"><div className="panel-heading"><h3>↻ Loser queue</h3><span>{loserQueue.length} players · {loserTeams.length} teams</span></div>{loserTeams.length ? loserTeams.flatMap((team, teamIndex) => team.map((p, playerIndex) => <InfoRow key={`${teamIndex}-${p}`} icon={playerIndex ? "↳" : String(teamIndex + 1)} title={p} detail={waitingLoserTeams.includes(team) ? "Bye · team carried forward" : `Loser · round ${round}`} />)) : <Empty>Losing teams appear here after round results are recorded.</Empty>}</section>
      </div>
      <section className="panel section-gap"><div className="panel-heading"><h3>{grandFinalReady ? "Grand final" : resetFinalMatch && !tournamentComplete ? "Grand final reset" : tournamentComplete ? "Tournament complete" : "Next round generation"}</h3><span>{tournamentComplete ? "Champion decided" : roundComplete ? "Current round complete" : "Waiting for results"}</span></div><p className="muted">{grandFinalReady ? "The winner-bracket champion plays the loser-bracket champion. If the loser-bracket champion wins, a reset final will decide the tournament." : resetFinalMatch && !tournamentComplete ? "Play the reset final. The winner of this match is the tournament champion." : tournamentComplete ? "The grand final has been completed." : "Winner-bracket winners advance; their opponents drop to the loser bracket. In the loser bracket, winners advance and losers are eliminated. Teams keep their partners, and unpaired teams receive byes."}</p><button className="button button-primary" onClick={advanceQueues} disabled={!canAdvanceQueues}>{grandFinalReady ? "Create grand final →" : "Generate next bracket round →"}</button>{roundComplete && !canAdvanceQueues && !tournamentComplete && !resetFinalMatch && <p className="muted">No further matches can be formed from these queues.</p>}</section>
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
          <div className="live-box"><h3>NOW PLAYING</h3>{ongoingMatches.length ? ongoingMatches.map((m) => <div className="live-match" key={m.id}><small>MATCH {m.id} · ROUND {m.round}</small><strong>{m.a.join(" + ")}</strong><span>VS</span><strong>{m.b.join(" + ")}</strong><strong className="live-score">{m.scoreA} — {m.scoreB}</strong>{m.startedAt !== undefined && <strong className="live-elapsed">PLAYING FOR · {formatElapsedTime(m.startedAt, now)}</strong>}</div>) : <p className="live-empty">No ongoing matches. Check back shortly.</p>}</div>
          <div className="live-box"><h3>UP NEXT</h3>{queuedMatches.length ? queuedMatches.map((m) => <div className="live-match" key={m.id}><small>MATCH {m.id} · ROUND {m.round}</small><strong>{m.a.join(" + ")}</strong><span>VS</span><strong>{m.b.join(" + ")}</strong><strong className="live-score">0 — 0</strong></div>) : <p className="live-empty">No upcoming matches in queue.</p>}</div>
        </div>
        {lastResultMatch && <div className="live-result">
          <div className="live-result-heading">LAST RESULT · MATCH {lastResultMatch.id}</div>
          <div className="live-result-teams">
            <div className={lastResultMatch.winner === "Team A" ? "live-result-winner" : ""}>
              <strong>{lastResultMatch.a.join(" + ")}</strong>
              <span>Team A · {lastResultMatch.scoreA}</span>
            </div>
            <b>—</b>
            <div className={lastResultMatch.winner === "Team B" ? "live-result-winner" : ""}>
              <strong>{lastResultMatch.b.join(" + ")}</strong>
              <span>Team B · {lastResultMatch.scoreB}</span>
            </div>
          </div>
          <p>Winner: <strong>{lastResultMatch.winner === "Team A" ? lastResultMatch.a.join(" + ") : lastResultMatch.b.join(" + ")}</strong></p>
        </div>}
        <div className="live-footer"><span>PLAY FAIR. PLAY MORE.</span><span>{players.length} REGISTERED PLAYERS · {completedMatches.length} MATCHES COMPLETED</span></div>
      </section>
      <section className="panel section-gap"><div className="panel-heading"><h3>Display information</h3><span>Public view</span></div><p className="muted">This screen is intended for a dedicated TV or monitor. It reflects match status and queue data recorded by the operator.</p></section>
    </>;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, players, matches, round, newPlayer, search, notice, now]);

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
  </div>;
}

function InfoRow({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <div className="info-row"><div className="info-icon">{icon}</div><div><strong>{title}</strong><small>{detail}</small></div></div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
