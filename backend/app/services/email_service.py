import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "weatherguardcommunity@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

FROM_EMAIL = SMTP_USER
APP_NAME = "WeatherGuardTN"


def _send_email(to: str, subject: str, html: str) -> bool:
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD not set — email not sent to %s", to)
        return False
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{APP_NAME} <{FROM_EMAIL}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))
    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info("Email sent to %s — %s", to, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


WELCOME_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#1a73e8;padding:28px 24px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">WeatherGuardTN</h1>
        <p style="color:#ffffffcc;margin:6px 0 0;font-size:13px;">Tunisian Weather Vigilance Network</p>
      </td></tr>
      <tr><td style="padding:28px 24px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:#1e293b;">Welcome aboard{name_suffix}!</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
          Your WeatherGuardTN account has been created. You now have access to real-time weather alerts,
          community updates, route safety checks, and early danger predictions tailored to your region.
        </p>
        <table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;margin-bottom:20px;">
          <tr><td style="padding:14px 18px;font-size:13px;color:#166534;">
            <strong>What's next?</strong><br>
            • Check your personalised weather dashboard<br>
            • Join the community forum to share updates<br>
            • Enable notifications for real-time alerts
          </td></tr>
        </table>
        <p style="margin:0;font-size:12px;color:#94a3b8;">Stay safe,<br><strong>The WeatherGuardTN Team</strong></p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#94a3b8;margin-top:16px;">WeatherGuardTN — AI-powered weather vigilance for Tunisia</p>
  </td></tr></table>
</body>
</html>"""


REPORT_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#dc2626;padding:28px 24px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:20px;">Report Received</h1>
      </td></tr>
      <tr><td style="padding:28px 24px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:#1e293b;">Thank you for reporting</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
          Your report has been submitted successfully. Our moderation team will review it and take
          appropriate action to keep our community safe and reliable.
        </p>
        <p style="margin:0;font-size:12px;color:#94a3b8;">You will not receive further updates on this report.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">The WeatherGuardTN Team</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>"""


DELETE_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#64748b;padding:28px 24px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:20px;">Account Deleted</h1>
      </td></tr>
      <tr><td style="padding:28px 24px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:#1e293b;">We're sorry to see you go</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
          Your WeatherGuardTN account and all associated data have been permanently deleted.
          This action cannot be undone.
        </p>
        <p style="margin:0 0 4px;font-size:13px;color:#475569;">If this was a mistake, you're always welcome to create a new account.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">The WeatherGuardTN Team</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>"""


def send_welcome_email(to: str, name: str = ""):
    name_suffix = f", {name}" if name else ""
    html = WELCOME_TEMPLATE.replace("{name_suffix}", name_suffix)
    return _send_email(to, f"Welcome to {APP_NAME}!", html)


def send_report_confirmation(to: str):
    return _send_email(to, f"Report Confirmed – {APP_NAME}", REPORT_TEMPLATE)


def send_account_deleted(to: str):
    return _send_email(to, f"Account Deleted – {APP_NAME}", DELETE_TEMPLATE)
