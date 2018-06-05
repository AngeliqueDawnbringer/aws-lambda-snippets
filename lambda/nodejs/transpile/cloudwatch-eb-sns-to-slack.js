import { request } from 'https';
import { format } from 'util';

export async function main(event, context) {
  console.log(JSON.stringify(event, null, 2));
  console.log('From SNS:', event.Records[0].Sns.Message);

  const postData = {
    channel: process.env.SLACK_CHANNEL,
    username: 'AWS Elastic Beanstalk Notifier',
    text: `*${event.Records[0].Sns.Subject}*`,
    icon_emoji: ':slack:',
    link_names: 1,
  };

  const message = event.Records[0].Sns.Message;
  // Default settings
  let severity = 'good';
  let noticeEmoji = ':white_check_mark:';
  let mention = '';

  const dangerMessages = [
    ' but with errors',
    ' to RED',
    'During an aborted deployment',
    'Failed to deploy application',
    'Failed to deploy configuration',
    'has a dependent object',
    'is not authorized to perform',
    'Pending to Degraded',
    'Stack deletion failed',
    'Unsuccessful command execution',
    'You do not have permission',
    'Your quota allows for 0 more running instance',
    'ELB health is failing',
    'not available',
    'to Severe',
    'to Degraded',
  ];

  const warningMessages = [
    ' aborted operation.',
    ' to YELLOW',
    'Adding instance ',
    'Degraded to Info',
    'Deleting SNS topic',
    'is currently running under desired capacity',
    'Ok to Info',
    'Ok to Warning',
    'Pending Initialization',
    'Removed instance ',
    'Rollback of environment',
    'to Warning',
  ];

  for (const dangerMessagesItem in dangerMessages) {
    if (message.indexOf(dangerMessages[dangerMessagesItem]) != -1) {
      severity = 'danger';
      noticeEmoji = ':bangbang:';
      mention = '@channel ';
      break;
    }
  }

  // Only check for warning messages if necessary
  if (severity == 'good') {
    for (const warningMessagesItem in warningMessages) {
      if (message.indexOf(warningMessages[warningMessagesItem]) != -1) {
        severity = 'warning';
        noticeEmoji = ':warning:';
        break;
      }
    }
  }

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

  // console.log(options);

  const req = request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      context.done(null);
    });
  });

  req.on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
  });

  req.write(format('%j', postData));
  req.end();
}
