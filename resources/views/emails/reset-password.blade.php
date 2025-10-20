<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1a1a1a;
            margin: 0;
            font-size: 28px;
        }
        .header .version {
            color: #666;
            font-size: 14px;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .reset-button {
            display: inline-block;
            padding: 15px 40px;
            background-color: #1a1a1a;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
        }
        .reset-button:hover {
            background-color: #333;
        }
        .content {
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .alternative-link {
            margin-top: 20px;
            padding: 15px;
            background: #f7f7f7;
            border-radius: 4px;
            word-break: break-all;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Console <span class="version">v0.2</span></h1>
        </div>
        
        <div class="content">
            <p>Hello {{ $userName }},</p>
            
            <p>We received a request to reset your password for your Console account. Click the button below to create a new password:</p>
            
            <div class="button-container">
                <a href="{{ $resetUrl }}" class="reset-button">Reset Password</a>
            </div>
            
            <p style="text-align: center; color: #666;">This link will expire in <strong>60 minutes</strong></p>
            
            <div class="warning">
                <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>
            
            <div class="alternative-link">
                <p style="margin: 0 0 10px 0;"><strong>Alternative:</strong> If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0;">{{ $resetUrl }}</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Console v0.2</p>
            <p>&copy; {{ date('Y') }} Console. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

