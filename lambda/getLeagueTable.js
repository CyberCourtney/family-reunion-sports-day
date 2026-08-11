const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TEAM_TABLE = process.env.TEAM_TABLE || "Team";
const MATCH_TABLE = process.env.MATCH_TABLE || "Match";
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || "Players";

const POINTS_WIN = 2;
const POINTS_DRAW = 1;
const POINTS_LOSS = 0;

exports.handler = async () => {
  let teams, matches, players;
  try {
    [teams, matches, players] = await Promise.all([
      scanAll(TEAM_TABLE),
      scanAll(MATCH_TABLE),
      scanAll(PLAYERS_TABLE),
    ]);
  } catch (err) {
    console.error(err);
    return response(500, { error: "Failed to load league data" });
  }

  const playerCounts = new Map();
  for (const player of players) {
    playerCounts.set(player.teamId, (playerCounts.get(player.teamId) ?? 0) + 1);
  }

  const standings = new Map();
  for (const team of teams) {
    standings.set(team.teamId, {
      teamId: team.teamId,
      name: team.name,
      color: team.color,
      playerCount: playerCounts.get(team.teamId) ?? 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      runsFor: 0,
      runsAgainst: 0,
      runDifference: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    const { teamAId, teamBId, teamAScore, teamBScore } = match;
    const teamA = standings.get(teamAId);
    const teamB = standings.get(teamBId);
    if (!teamA || !teamB) continue;

    teamA.played += 1;
    teamB.played += 1;
    teamA.runsFor += teamAScore;
    teamA.runsAgainst += teamBScore;
    teamB.runsFor += teamBScore;
    teamB.runsAgainst += teamAScore;

    if (teamAScore > teamBScore) {
      teamA.won += 1;
      teamA.points += POINTS_WIN;
      teamB.lost += 1;
      teamB.points += POINTS_LOSS;
    } else if (teamBScore > teamAScore) {
      teamB.won += 1;
      teamB.points += POINTS_WIN;
      teamA.lost += 1;
      teamA.points += POINTS_LOSS;
    } else {
      teamA.drawn += 1;
      teamB.drawn += 1;
      teamA.points += POINTS_DRAW;
      teamB.points += POINTS_DRAW;
    }
  }

  const table = [...standings.values()].map((team) => ({
    ...team,
    runDifference: team.runsFor - team.runsAgainst,
  }));

  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.runDifference !== a.runDifference) return b.runDifference - a.runDifference;
    return a.name.localeCompare(b.name);
  });

  return response(200, { table });
};

async function scanAll(tableName) {
  const items = [];
  let lastEvaluatedKey;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
