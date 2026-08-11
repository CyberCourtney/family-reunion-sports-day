const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const MATCH_TABLE = process.env.MATCH_TABLE || "Match";

exports.handler = async () => {
  let matches;
  try {
    matches = await scanAll(MATCH_TABLE);
  } catch (err) {
    console.error(err);
    return response(500, { error: "Failed to load matches" });
  }

  matches.sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));

  return response(200, { matches });
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
