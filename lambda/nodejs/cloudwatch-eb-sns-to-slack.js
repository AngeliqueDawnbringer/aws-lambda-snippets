const https = require('https');
const util = require('util');

exports.handler = function(event, context) {
  console.log(JSON.stringify(event, null, 2));
  console.log('From SNS:', event.Records[0].Sns.Message);

  let postData = {
    "channel": process.env.SLACK_CHANNEL,
    "username": "AWS Elastic Beanstalk Notifier",
    "text": "*" + event.Records[0].Sns.Subject + "*",
    "icon_emoji": ":slack:",
    "link_names": 1
  };

  let message = event.Records[0].Sns.Message;
  let severity = "good";
  let noticeEmoji = ":white_check_mark:";
  let mention = "";

  let dangerMessages = [
    " but with errors",
    " to RED",
    "During an aborted deployment",
    "Failed to deploy application",
    "Failed to deploy configuration",
    "has a dependent object",
    "is not authorized to perform",
    "Pending to Degraded",
    "Stack deletion failed",
    "Unsuccessful command execution",
    "You do not have permission",
    "Your quota allows for 0 more running instance",
    "ELB health is failing",
    "not available",
    "to Severe",
    "to Degraded"
  ];

  let warningMessages = [
    " aborted operation.",
    " to YELLOW",
    "Adding instance ",
    "Degraded to Info",
    "Deleting SNS topic",
    "is currently running under desired capacity",
    "Ok to Info",
    "Ok to Warning",
    "Pending Initialization",
    "Removed instance ",
    "Rollback of environment",
    "to Warning"
  ];

  for(let dangerMessagesItem in dangerMessages) {
    if (message.indexOf(dangerMessages[dangerMessagesItem]) != -1) {
      severity = "danger";
      noticeEmoji = ":bangbang:"
      mention = "@channel "
      break;
    }
  }

  // Only check for warning messages if necessary
  if (severity == "good") {
    for(let warningMessagesItem in warningMessages) {
      if (message.indexOf(warningMessages[warningMessagesItem]) != -1) {
        severity = "warning";
        noticeEmoji = ":warning:"
        break;
      }
    }
  }

  postData.attachments = [
    {
      "color": severity,
      "text": mention + noticeEmoji + message
    }
  ];

  let options = {
    method: 'POST',
    hostname: 'hooks.slack.com',
    port: 443,
    path: process.env.SLACK_HOOK_PATH
  };

  let req = https.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      context.done(null);
    });
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });

  req.write(util.format("%j", postData));
  req.end();
};
