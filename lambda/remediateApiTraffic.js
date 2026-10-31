const { APIGatewayClient, UpdateStageCommand } = require("@aws-sdk/client-api-gateway");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const apiGateway = new APIGatewayClient({});
const sns = new SNSClient({});

const API_ID = process.env.API_ID;
const STAGE_NAME = process.env.STAGE_NAME;
const ALERTS_TOPIC_ARN = process.env.ALERTS_TOPIC_ARN;

const NORMAL = {
  rate: process.env.NORMAL_RATE_LIMIT,
  burst: process.env.NORMAL_BURST_LIMIT,
};
const CLAMPED = {
  rate: process.env.CLAMPED_RATE_LIMIT,
  burst: process.env.CLAMPED_BURST_LIMIT,
};

// Triggered by an EventBridge rule on the traffic-spike alarm changing
// state. ALARM tightens the stage's throttling, OK puts it back to the
// normal limits, so it heals itself once the spike is over.
exports.handler = async (event) => {
  const newState = event?.detail?.state?.value;
  const alarmName = event?.detail?.alarmName;

  let limits;
  let summary;
  if (newState === "ALARM") {
    limits = CLAMPED;
    summary = `Traffic spike. Clamped ${STAGE_NAME} stage throttling to ${limits.rate} req/s (burst ${limits.burst}).`;
  } else if (newState === "OK") {
    limits = NORMAL;
    summary = `Traffic back to normal. Restored ${STAGE_NAME} stage throttling to ${limits.rate} req/s (burst ${limits.burst}).`;
  } else {
    console.log("Ignoring state", newState);
    return { ignored: true };
  }

  try {
    await apiGateway.send(
      new UpdateStageCommand({
        restApiId: API_ID,
        stageName: STAGE_NAME,
        patchOperations: [
          { op: "replace", path: "/*/*/throttling/rateLimit", value: String(limits.rate) },
          { op: "replace", path: "/*/*/throttling/burstLimit", value: String(limits.burst) },
        ],
      })
    );
  } catch (err) {
    console.error(err);
    await notify(`Remediation FAILED for ${alarmName}: ${err.message}`);
    throw err;
  }

  await notify(summary);
  return { newState, ...limits };
};

async function notify(message) {
  await sns.send(
    new PublishCommand({
      TopicArn: ALERTS_TOPIC_ARN,
      Subject: "Sports Day: automated remediation",
      Message: message,
    })
  );
}
