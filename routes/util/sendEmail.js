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
        <div>
            <img src="cid:logo" style="width: 200px;" alt="Keypass Guard" />
            <div style="font-size: 18px;">
                <br />
                ${message}
            </div>
        </div>
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

module.exports = sendEmail;