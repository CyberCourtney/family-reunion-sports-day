const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PLAYERS_TABLE = process.env.PLAYERS_TABLE || "Players";

exports.handler = async (event) => {
  const teamId = event.queryStringParameters?.teamId;

  if (!teamId) {
    return response(400, { error: "teamId query parameter is required" });
  }

  let players;
  try {
    players = await queryByTeam(teamId);
  } catch (err) {
    console.error(err);
    return response(500, { error: "Failed to load players" });
  }

  players.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  return response(200, { players });
};

async function queryByTeam(teamId) {
  const items = [];
  let lastEvaluatedKey;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: PLAYERS_TABLE,
        IndexName: "teamId-index",
        KeyConditionExpression: "teamId = :teamId",
        ExpressionAttributeValues: { ":teamId": teamId },
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
