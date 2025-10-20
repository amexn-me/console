<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login OTP</title>
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
        .otp-box {
            background: #f7f7f7;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #1a1a1a;
            font-family: 'Courier New', monospace;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Console <span class="version">v0.2</span></h1>
        </div>
        
        <div class="content">
            <p>Hello {{ $userName }},</p>
            
            <p>You requested to log in to your Console account. Please use the following One-Time Password (OTP) to complete your login:</p>
            
            <div class="otp-box">
                <div class="otp-code">{{ $otp }}</div>
            </div>
            
            <p style="text-align: center; color: #666;">This OTP will expire in <strong>{{ $expiryMinutes }} minutes</strong></p>
            
            <div class="warning">
                <strong>Security Notice:</strong> Never share this OTP with anyone. Console staff will never ask for your OTP.
            </div>
            
            <p>If you didn't request this login, please ignore this email and ensure your account is secure.</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Console v0.2</p>
            <p>&copy; {{ date('Y') }} Console. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

