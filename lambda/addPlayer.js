const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PLAYERS_TABLE || "Players";

exports.handler = async (event) => {
  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (err) {
    return response(400, { error: "Invalid JSON body" });
  }

  const { name, teamId, position } = body || {};

  if (!name || typeof name !== "string") {
    return response(400, { error: "name is required" });
  }
  if (!teamId || typeof teamId !== "string") {
    return response(400, { error: "teamId is required" });
  }

  const player = {
    playerId: randomUUID(),
    name,
    teamId,
    position: position || null,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: player,
      })
    );
  } catch (err) {
    console.error(err);
    return response(500, { error: "Failed to save player" });
  }

  return response(201, player);
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
