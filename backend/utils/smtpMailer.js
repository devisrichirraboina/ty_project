/**
 * AlphaCare High-Reliability Native SMTP Mailer
 * Uses Node.js native TLS socket with robust Gmail line-buffered parsing.
 */
const tls = require('tls');

function sendEmailViaSmtp({ to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    const user = (process.env.SMTP_EMAIL || 'shivanipandey152007@gmail.com').trim();
    const pass = (process.env.SMTP_PASSWORD || 'yrcr bzri xdfx lrwz').replace(/\s+/g, '');

    if (!to) {
      return reject(new Error('Recipient email is required'));
    }

    const host = 'smtp.gmail.com';
    const port = 465;

    console.log(`[SMTP Mailer] Authenticating with ${user} to send to ${to}...`);

    const socket = tls.connect({ host, port, minVersion: 'TLSv1.2' }, () => {
      console.log('[SMTP Mailer] Secure TLS Connected.');
    });

    socket.setEncoding('utf8');

    let step = 0;
    let buffer = '';

    const sendCmd = (cmd) => {
      socket.write(cmd + '\r\n');
    };

    socket.on('data', (chunk) => {
      buffer += chunk;

      // Split incoming messages into complete lines
      const lines = buffer.split(/\r?\n/);
      // Keep unfinished fragment in buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (!line || line.trim() === '') continue;
        console.log(`[SMTP In]: ${line}`);

        const code = parseInt(line.substring(0, 3), 10);
        const isLastLineOfCode = line.length < 4 || line.charAt(3) === ' ';

        if (code >= 400) {
          console.error(`[SMTP Error]: ${line}`);
          socket.destroy();
          return reject(new Error(`SMTP Error (${code}): ${line}`));
        }

        // Only react when the multi-line response is complete (e.g. "250 ...")
        if (isLastLineOfCode) {
          if (step === 0 && code === 220) {
            step = 1;
            console.log('[SMTP Out]: EHLO alphacare.app');
            sendCmd('EHLO alphacare.app');
          } else if (step === 1 && code === 250) {
            step = 2;
            console.log('[SMTP Out]: AUTH LOGIN');
            sendCmd('AUTH LOGIN');
          } else if (step === 2 && code === 334) {
            step = 3;
            console.log('[SMTP Out]: Username');
            sendCmd(Buffer.from(user).toString('base64'));
          } else if (step === 3 && code === 334) {
            step = 4;
            console.log('[SMTP Out]: Password');
            sendCmd(Buffer.from(pass).toString('base64'));
          } else if (step === 4 && code === 235) {
            step = 5;
            console.log(`[SMTP Out]: MAIL FROM:<${user}>`);
            sendCmd(`MAIL FROM:<${user}>`);
          } else if (step === 5 && code === 250) {
            step = 6;
            console.log(`[SMTP Out]: RCPT TO:<${to}>`);
            sendCmd(`RCPT TO:<${to}>`);
          } else if (step === 6 && code === 250) {
            step = 7;
            console.log('[SMTP Out]: DATA');
            sendCmd('DATA');
          } else if (step === 7 && code === 354) {
            step = 8;
            console.log('[SMTP Out]: Message Payload');
            const boundary = '----=_Part_AlphaCare_' + Date.now();
            const messagePayload = [
              `From: "AlphaCare Team" <${user}>`,
              `To: <${to}>`,
              `Subject: ${subject}`,
              'MIME-Version: 1.0',
              `Content-Type: multipart/alternative; boundary="${boundary}"`,
              '',
              `--${boundary}`,
              'Content-Type: text/plain; charset=UTF-8',
              'Content-Transfer-Encoding: 7bit',
              '',
              text || 'AlphaCare Verification Code',
              '',
              `--${boundary}`,
              'Content-Type: text/html; charset=UTF-8',
              'Content-Transfer-Encoding: 7bit',
              '',
              html || `<p>${text}</p>`,
              '',
              `--${boundary}--`,
              '.'
            ].join('\r\n');

            sendCmd(messagePayload);
          } else if (step === 8 && code === 250) {
            step = 9;
            console.log('[SMTP Mailer] Message accepted! Closing socket.');
            sendCmd('QUIT');
            socket.end();
            return resolve({ success: true, message: 'Delivered to Gmail successfully' });
          }
        }
      }
    });

    socket.on('error', (err) => {
      console.error('[SMTP Socket Error]:', err);
      reject(err);
    });

    socket.setTimeout(18000, () => {
      socket.destroy();
      reject(new Error('SMTP connection timed out'));
    });
  });
}

module.exports = { sendEmailViaSmtp };
