var nodemailer = require('nodemailer');

async function sendEmail(to, subject, message) {
        var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
                user: 'noreplydevapp@gmail.com',
                pass: process.env.EMAIL,
            }
    });

    const mailOptions = {
        from: 'noreply@keypassguard.com', // sender address
        to, // list of receivers
        subject, // Subject line
        html: 
        `
        <body>
        <div>
            <center style="background-color: #0B3246; padding: 20px 30px; border-radius: 10px; width: fit-content; ">
                <img src="cid:logo" style="width: 280px;" alt="Keypass Guard" />
            </center>
            <div style="font-size: 18px;">
                <br />
                ${message}
            </div>
        </div>
        </body>
        `,// plain text body
        attachments: [
            {
              filename: "logo.png",
              path: './client/build/images/logo.png',
              cid: 'logo',
            },
          ],
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch(err) {
        console.error(err);
    }
    

    return;
}

// WELCOME EMAIL TEMPLATE
async function sendWelcomeEmail(to, username, verifyLink) {
    await sendEmail(to, 'Welcome to Keypass Guard', 
    `
            Hi ${username}!
            <br />
            <br />
            Welcome to Keypass Guard! We're delighted you've chosen us to securely retain your passwords and enhance your online security.
            <br />
            <br />
            To get started, please take a moment to verify your email address by clicking on the following link:
            <br />
            <br />
            <a href="${verifyLink}" style="cursor: pointer; pointer-events: none; margin: 20px 20px; padding: 10px 30px; border-radius: 6px; background-color: #0582CA; text-decoration: none; color: white; ">Verify Email</a>
            <br />
            <br />
            This ensures that your Keypass Guard account is fully activated, and you can start enjoying the benefits of our secure password management.
            <br />
            <br />
            At Keypass Guard, we prioritize the privacy and security of your data. Our commitment is to provide you with a seamless and reliable platform to manage your passwords with confidence.
            <br />
            <br />
            The Keypass Guard Team
    `);
    console.log("Email sent.");
}

// CONFIRM EMAIL TEMPLATE
async function sendVerifyNewEmail(to, username, verifyLink) {
    await sendEmail(to, 'Verify email', 
    `
            Hi ${username}!
            <br />
            <br />
            We hope this message finds you well. It appears that you've recently updated your email address for your Keypass Guard account, and we want to ensure the security of your account information.
            <br />
            <br />
            To complete the email change process, please take a moment to verify your new email address by clicking on the following link:
            <br />
            <br />
            <a href="${verifyLink}" style="cursor: pointer; pointer-events: none; margin: 20px 20px; padding: 10px 30px; border-radius: 6px; background-color: #0582CA; text-decoration: none; color: white; ">Verify Email</a>
            <br />
            <br />
            This step is crucial in confirming that the updated email is accurate and belongs to you. Your diligence in this matter ensures the continued security and accessibility of your Keypass Guard account.
            <br />
            If you have any questions or concerns, please don't hesitate to contact our support team.
            <br />
            <br />
            Best regards,
            <br />
            The Keypass Guard Team
    `);
    console.log("Email sent.");
}

// WELCOME EMAIL TEMPLATE
async function send2fa(to, username, code) {
    await sendEmail(to, 'Two Facter Authentication - ' + username, 
    `
            Hi ${username}!
            <br />
            <br />
            We are sending you this email as part of our two-factor authentication process to ensure your account remains secure. As part of this process, we require you to enter a verification code.
            <br />
            <br />
            Your 6-digit verification code is: ${code}
            <br />
            <br />
            Please enter this code in the designated field to access your account. If you have any questions or concerns, please don't hesitate to reach out to us.
            <br />
            <br />
            The Keypass Guard Team
    `);
    console.log("Email sent.");
}

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendVerifyNewEmail,
    send2fa
}