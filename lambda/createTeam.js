const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TEAM_TABLE || "Team";

exports.handler = async (event) => {
  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (err) {
    return response(400, { error: "Invalid JSON body" });
  }

  const { teamId, name, color } = body || {};

  if (!teamId || typeof teamId !== "string") {
    return response(400, { error: "teamId is required" });
  }
  if (!name || typeof name !== "string") {
    return response(400, { error: "name is required" });
  }
  if (!color || typeof color !== "string") {
    return response(400, { error: "color is required" });
  }

  const team = { teamId, name, color };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: team,
      })
    );
  } catch (err) {
    console.error(err);
    return response(500, { error: "Failed to save team" });
  }

  return response(201, team);
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
