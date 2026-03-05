import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Bon Voyage <noreply@bonvoyage.app>'


export type NotificationType =
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'DRAFT_REMINDER'
  | 'ARCHIVE_WARNING'
  | 'TRIP_UPCOMING'
  | 'TRIP_CONFIRMED'

export interface SendEmailOptions {
  to:                string
  notification_type: NotificationType
  template_data:     Record<string, unknown>
}

export interface SendEmailResult {
  success:   boolean
  messageId?: string
  error?:    string
}


function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bon Voyage</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1B2A4A;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">
                 Bon Voyage
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f6f9;padding:24px 40px;text-align:center;border-top:1px solid #e8ecf0;">
              <p style="margin:0;color:#8896a5;font-size:12px;">
                © 2025 Bon Voyage · Universidad Politécnica de Chiapas<br/>
                <a href="#" style="color:#4ECDC4;text-decoration:none;">Gestionar preferencias de email</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function primaryButton(text: string, url: string): string {
  return `
  <div style="text-align:center;margin:32px 0;">
    <a href="${url}"
       style="background-color:#4ECDC4;color:#ffffff;padding:14px 32px;
              border-radius:6px;text-decoration:none;font-weight:700;
              font-size:15px;display:inline-block;">
      ${text}
    </a>
  </div>`
}


function buildTemplate(type: NotificationType, data: Record<string, unknown>): {
  subject: string
  html:    string
} {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bonvoyage.app'

  switch (type) {

    case 'WELCOME':
      return {
        subject: '¡Bienvenido a Bon Voyage! ',
        html: baseTemplate(`
          <h2 style="color:#1B2A4A;margin-top:0;">
            ¡Hola, ${data.first_name}! 
          </h2>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            Tu cuenta en <strong>Bon Voyage</strong> está lista.
            Ahora puedes planificar tus viajes desde un solo lugar —
            vuelos, restaurantes, puntos de interés y servicios esenciales,
            todo en tu itinerario personalizado.
          </p>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            Empieza explorando el mapa interactivo y crea tu primer viaje.
          </p>
          ${primaryButton('Ir a Bon Voyage', `${APP_URL}/dashboard`)}
          <p style="color:#8896a5;font-size:13px;text-align:center;margin-top:8px;">
            Si no creaste esta cuenta, ignora este mensaje.
          </p>
        `),
      }

    case 'DRAFT_REMINDER':
      return {
        subject: `Tu viaje "${data.trip_name}" te está esperando `,
        html: baseTemplate(`
          <h2 style="color:#1B2A4A;margin-top:0;">
            ¿Sigues planeando tu viaje?
          </h2>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            Tu borrador <strong>"${data.trip_name}"</strong> lleva
            23 días sin cambios. ¡No dejes que tus planes queden a medias!
          </p>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            Tienes 7 días antes de que se archive automáticamente.
          </p>
          ${primaryButton('Continuar planeando', `${APP_URL}/trips/${data.trip_id}`)}
        `),
      }

    case 'ARCHIVE_WARNING':
      return {
        subject: ` Tu viaje "${data.trip_name}" se archivará pronto`,
        html: baseTemplate(`
          <h2 style="color:#e53e3e;margin-top:0;">
            Tu borrador está por archivarse
          </h2>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            El viaje <strong>"${data.trip_name}"</strong> lleva 30 días
            inactivo. En <strong>7 días</strong> se archivará automáticamente.
          </p>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            Ábrelo para evitar que se archive.
          </p>
          ${primaryButton('Continuar planeando', `${APP_URL}/trips/${data.trip_id}`)}
        `),
      }

    case 'TRIP_CONFIRMED':
      return {
        subject: `¡Viaje confirmado! "${data.trip_name}" `,
        html: baseTemplate(`
          <h2 style="color:#1B2A4A;margin-top:0;">
            ¡Tu viaje está confirmado! 
          </h2>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            <strong>"${data.trip_name}"</strong> ha sido confirmado.
            Fecha de salida: <strong>${data.start_date}</strong>.
          </p>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            Te enviaremos recordatorios 30, 7 y 1 día antes de tu viaje.
          </p>
          ${primaryButton('Ver itinerario', `${APP_URL}/trips/${data.trip_id}`)}
        `),
      }

    case 'TRIP_UPCOMING':
      return {
        subject: `Tu viaje "${data.trip_name}" es en ${data.days_until} días`,
        html: baseTemplate(`
          <h2 style="color:#1B2A4A;margin-top:0;">
            ¡Tu viaje se acerca! 
          </h2>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            <strong>"${data.trip_name}"</strong> comienza en
            <strong>${data.days_until} días</strong>
            (${data.start_date}).
          </p>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            Revisa tu itinerario y asegúrate de tener todo listo.
          </p>
          ${primaryButton('Ver itinerario', `${APP_URL}/trips/${data.trip_id}`)}
        `),
      }

    case 'PASSWORD_RESET':
      return {
        subject: 'Restablece tu contraseña de Bon Voyage',
        html: baseTemplate(`
          <h2 style="color:#1B2A4A;margin-top:0;">
            Restablece tu contraseña
          </h2>
          <p style="color:#4a5568;line-height:1.7;font-size:15px;">
            Recibimos una solicitud para restablecer tu contraseña.
            Haz clic en el botón para continuar. El enlace expira en 1 hora.
          </p>
          ${primaryButton('Restablecer contraseña', data.reset_url as string)}
          <p style="color:#8896a5;font-size:13px;text-align:center;margin-top:8px;">
            Si no solicitaste esto, ignora este mensaje.
          </p>
        `),
      }

    default:
      return {
        subject: 'Notificación de Bon Voyage',
        html:    baseTemplate(`<p>Tienes una nueva notificación.</p>`),
      }
  }
}

// ============================================================
//  FUNCIÓN PRINCIPAL DE ENVÍO
// ============================================================

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, notification_type, template_data } = options

  try {
    const { subject, html } = buildTemplate(notification_type, template_data)

    const response = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      [to],
      subject,
      html,
    })

    if (response.error) {
      return { success: false, error: response.error.message }
    }

    return { success: true, messageId: response.data?.id }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[email.service] Failed to send ${notification_type} to ${to}:`, message)
    return { success: false, error: message }
  }
}