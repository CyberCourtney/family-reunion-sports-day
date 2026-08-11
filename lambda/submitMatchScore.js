const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.MATCH_TABLE || "Match";

exports.handler = async (event) => {
  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (err) {
    return response(400, { error: "Invalid JSON body" });
  }

  const { round, teamAId, teamBId, teamAScore, teamBScore } = body || {};

  if (!round || typeof round !== "string") {
    return response(400, { error: "round is required" });
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
  if (!Number.isInteger(teamAScore) || teamAScore < 0) {
    return response(400, { error: "teamAScore must be a non-negative integer" });
  }
  if (!Number.isInteger(teamBScore) || teamBScore < 0) {
    return response(400, { error: "teamBScore must be a non-negative integer" });
  }

  const match = {
    matchId: randomUUID(),
    round,
    teamAId,
    teamBId,
    teamAScore,
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
