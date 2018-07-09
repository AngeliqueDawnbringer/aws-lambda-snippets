const https = require('https');
const util = require('util');

function send2Slack(subject, message) {
  const postData = {
    channel: process.env.SLACK_CHANNEL,
    username: 'Security Group Changed',
    attachments: [ { text: `*${message}*` } ],
    icon_emoji: ':slack:',
    link_names: 1,
  };
  
  console.log(postData);

  const severity = 'warning';
  const noticeEmoji = ':white_check_mark:';
  const mention = '';

  postData.attachments = [
    {
      color: severity,
      text: mention + noticeEmoji + message,
    },
  ];

  const options = {
    method: 'POST',
    hostname: 'hooks.slack.com',
    port: 443,
    path: process.env.SLACK_HOOK_PATH,
  };

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      // context.done(null);
    });
  });

  req.on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
  });

  req.write(util.format('%j', postData));
  req.end();
}

exports.handler = function main(event, context) {
  if (!event.Records
        || event.Records.length === 0
        || !event.Records[0].Sns
        || !event.Records[0].Sns.Message) {
    context.done();
    return;
  }

  const message = JSON.parse(event.Records[0].Sns.Message);

  if (!message || !message.configurationItemDiff || !message.configurationItem) {
    console.log("The 'message' format is invalid. Stopping execution...");
    context.done();
    return;
  }

  if (message.configurationItem.resourceType !== 'AWS::EC2::SecurityGroup') {
    console.log('Change notifications are only supported for Security Groups.');
    context.done();
    return;
  }

  const notifyOnChange = message.configurationItem.tags.NotifyOnChange;

  if (!notifyOnChange || notifyOnChange === 'No' || notifyOnChange === 'False') {
    console.log('Notifications are not enabled for the Security Group in question.');
    context.done();
    return;
  }

  const owner = message.configurationItem.tags.Owner;
  const ownerDL = message.configurationItem.tags.OwnerDL;
  const securityGroupId = message.configurationItem.resourceId;
  const securityGroupName = message.configurationItem.tags.Name;

  const emailRegex = /([\w-+.]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)/i;
  if (!ownerDL || ownerDL === '' || !emailRegex.test(ownerDL)) {
    console.log('The email address provided in the OwnerDL tag is either missing or invalid.');
    context.done();
    return;
  }

  console.log(`Owner: ${owner}`);
  console.log(`Owner Distribution List: ${ownerDL}`);
  console.log(`Security Group ID: ${securityGroupId}`);

  const sgIdentifiers = [securityGroupId];
  if (securityGroupName && securityGroupName !== '') {
    sgIdentifiers.push(securityGroupName);
  }

  const subject = `Security Group ${securityGroupId} Was Changed`;

  let emailMessage = `The security group ${sgIdentifiers.join('/')} was changed.\n\nDetails:\n`;
  emailMessage += JSON.stringify(message.configurationItemDiff, null, 2);

  console.log(`Email Body: ${emailMessage}`);

  send2Slack(subject, emailMessage, () => {
    context.done(null, { success: true });
  });
};
