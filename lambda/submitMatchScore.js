const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.MATCH_TABLE || "Match";

const POINTS_PER_RUN = 1;
const POINTS_PER_HOME_RUN = 2;

// Fixed set rather than free text - the tournament bracket needs to
// reliably map a match to a bracket slot, which isn't possible from
// arbitrary round names.
const VALID_ROUNDS = ["Semi-Final 1", "Semi-Final 2", "Final"];

exports.handler = async (event) => {
  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (err) {
    return response(400, { error: "Invalid JSON body" });
  }

  const {
    round,
    teamAId,
    teamBId,
    teamARuns,
    teamAHomeRuns,
    teamAOuts,
    teamBRuns,
    teamBHomeRuns,
    teamBOuts,
  } = body || {};

  if (!round || typeof round !== "string") {
    return response(400, { error: "round is required" });
  }
  if (!VALID_ROUNDS.includes(round)) {
    return response(400, { error: `round must be one of: ${VALID_ROUNDS.join(", ")}` });
  }
  if (!teamAId || typeof teamAId !== "string") {
    return response(400, { error: "teamAId is required" });
  }
  if (!teamBId || typeof teamBId !== "string") {
    return response(400, { error: "teamBId is required" });
  }
  if (teamAId === teamBId) {
    return response(400, { error: "teamAId and teamBId must be different" });
  }

  const counts = { teamARuns, teamAHomeRuns, teamAOuts, teamBRuns, teamBHomeRuns, teamBOuts };
  for (const [field, value] of Object.entries(counts)) {
    if (!Number.isInteger(value) || value < 0) {
      return response(400, { error: `${field} must be a non-negative integer` });
    }
  }

  const teamAScore = teamARuns * POINTS_PER_RUN + teamAHomeRuns * POINTS_PER_HOME_RUN;
  const teamBScore = teamBRuns * POINTS_PER_RUN + teamBHomeRuns * POINTS_PER_HOME_RUN;

  const match = {
    matchId: randomUUID(),
    submittedAt: new Date().toISOString(),
    round,
    teamAId,
    teamBId,
    teamARuns,
    teamAHomeRuns,
    teamAOuts,
    teamAScore,
    teamBRuns,
    teamBHomeRuns,
    teamBOuts,
    teamBScore,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: match,
      })
    );
  } catch (err) {
    console.error(err);
    return response(500, { error: "Failed to save match result" });
  }

  return response(201, match);
};

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
