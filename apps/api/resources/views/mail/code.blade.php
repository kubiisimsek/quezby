<!DOCTYPE html>
<html lang="{{ $lang }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $title }}</title>
</head>
<body style="margin:0;padding:0;background:rgb(24,6,58);font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgb(24,6,58);padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:rgb(46,16,98);border:3px solid rgb(10,2,26);border-radius:20px;">
<tr><td style="padding:32px 28px;text-align:center;color:rgb(255,255,255);">
<div style="font-size:28px;font-weight:900;letter-spacing:0.5px;" dir="ltr">Quezby</div>
<div style="font-size:20px;font-weight:800;margin-top:20px;">{{ $title }}</div>
<div style="font-size:15px;line-height:22px;color:rgb(214,200,245);margin-top:10px;">{{ $line }}</div>
<div dir="ltr" style="font-size:40px;font-weight:900;letter-spacing:10px;margin:28px 0 8px;padding:16px 0;background:rgb(24,6,58);border-radius:14px;color:rgb(255,214,64);font-family:Menlo,Consolas,monospace;">{{ $code }}</div>
<div style="font-size:14px;color:rgb(214,200,245);margin-top:12px;">{{ $expires }}</div>
<div style="font-size:13px;color:rgb(160,140,200);margin-top:24px;">{{ $ignore }}</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
