import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SigningEmailData {
  to: string
  signerName: string
  documentTitle: string
  signingUrl: string
}

export async function sendSigningEmail({
  to,
  signerName,
  documentTitle,
  signingUrl,
}: SigningEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend API key not configured. Skipping signing email.')
    console.log(`Signing URL for ${signerName}: ${signingUrl}`)
    return Promise.resolve()
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignFast <onboarding@resend.dev>',
      to: [to],
      subject: `eSignature Request: ${documentTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">eSignature Request</h2>
          <p>Hello ${signerName},</p>
          <p>You have been requested to sign the document: <strong>${documentTitle}</strong></p>
          <p>Please click the link below to review and sign the document:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signingUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Sign Document
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:<br>
            <a href="${signingUrl}">${signingUrl}</a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending signing email:', error)
      return Promise.reject(error)
    }

    console.log('Signing email sent successfully:', data)
    return data
  } catch (error) {
    console.error('Error sending signing email:', error)
    return Promise.reject(error)
  }
}

interface CompletionEmailData {
  to: string
  recipientName: string
  documentTitle: string
  documentUrl: string
}

export async function sendCompletionEmail({
  to,
  recipientName,
  documentTitle,
  documentUrl,
}: CompletionEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend API key not configured. Skipping completion email.')
    console.log(`Document download URL for ${recipientName}: ${documentUrl}`)
    return Promise.resolve()
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'SignFast <onboarding@resend.dev>',
      to: [to],
      subject: `Document Signed: ${documentTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Document Successfully Signed</h2>
          <p>Hello ${recipientName},</p>
          <p>The document <strong>${documentTitle}</strong> has been successfully signed.</p>
          <p>You can download the signed document using the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${documentUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Download Signed Document
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:<br>
            <a href="${documentUrl}">${documentUrl}</a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('❌ Error sending completion email:', error)
      return Promise.reject(error)
    }

    console.log('Completion email sent successfully')
    return data
  } catch (error) {
    console.error('❌ Error sending completion email:', error)
    return Promise.reject(error)
  }
}
