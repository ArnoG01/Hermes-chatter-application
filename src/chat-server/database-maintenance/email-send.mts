// @author Mathias Brosens
// @date 2023/11/16

import type { UserEntry } from '../../database/database-interfaces.mjs';
import * as nodemailer from 'nodemailer';
import * as google from 'googleapis';
import * as dotenv from 'dotenv';
import { promises } from 'fs';

dotenv.config();

/**
 * Sends an email notification to the specified user regarding account deletion.
 *
 * @param user - A userEntry object who the mail is send to.
 * @remarks This function utilizes an email template to notify the user about an account deletion notice.
 *           It constructs an email with subject 'Account Deletion Notice' and sends it to the user's email address.
 */
export async function sendMailToUser(user: UserEntry) {
  const sender = process.env['MAIL_ADRESS'];
  const emailTemplatePath = 'src/chat-server/database-maintenance/email-template.html';
  const clientID = process.env['clientID'];
  const clientSecret1 = process.env['clientSecret'];
  const refreshToken = process.env['refreshToken'] as string;

  const OAuth2Client = new google.Auth.OAuth2Client(clientID, clientSecret1);
  OAuth2Client.setCredentials({ refresh_token: refreshToken });
  const accessToken = (await OAuth2Client.getAccessToken()).token as string;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: sender,
      clientId: clientID,
      clientSecret: clientSecret1,
      refreshToken: refreshToken,
      accessToken: accessToken,
    },
  });

  const htmlBody = await promises.readFile(emailTemplatePath, 'utf8');

  const emailContent = htmlBody.replace('USER_NICKNAME', 'User ' + user.user_name);

  const mailOptions = {
    from: sender,
    to: user.email_ID,
    subject: 'Account Deletion Notice',
    html: emailContent,
  };
  await transporter.sendMail(mailOptions);
}
