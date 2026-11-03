import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/theme/app_colors.dart';
import '../../config/theme/app_text_styles.dart';
import '../../core/utils/fee_format.dart';

/// Pay one bill by UPI while online payment is off:
///  1. tap an app (Google Pay, PhonePe, Paytm, CRED, or any UPI app) — it opens
///     with the academy's UPI ID, the amount and the bill number filled in;
///  2. pay there, come back and tap "I've paid — upload screenshot".
/// The QR code and the UPI ID (with Copy) always work, including on iPhone
/// and when an app refuses a pre-filled payment.
/// Returns true when the family chose to upload the screenshot.
Future<bool> showUpiPaySheet(
  BuildContext context, {
  required String upiId,
  required String payeeName,
  required double amount,
  required String note,
  required String forWhat,
  Map<String, String> extra = const {},
  bool prefillAmount = true,
}) async {
  final result = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _UpiPaySheet(
      upiId: upiId,
      payeeName: payeeName,
      amount: amount,
      note: note,
      forWhat: forWhat,
      extra: extra,
      prefillAmount: prefillAmount,
    ),
  );
  return result == true;
}

class _UpiApp {
  final String label;
  final IconData icon;
  final Color color;
  /// Link prefix up to and including '?', e.g. 'tez://upi/pay?'.
  final String android;
  final String ios;
  const _UpiApp(this.label, this.icon, this.color, this.android, this.ios);
}

const _apps = [
  _UpiApp('Google Pay', Icons.g_mobiledata, Color(0xFF1A73E8), 'tez://upi/pay?', 'gpay://upi/pay?'),
  _UpiApp('PhonePe', Icons.phone_android, Color(0xFF5F259F), 'phonepe://pay?', 'phonepe://pay?'),
  _UpiApp('Paytm', Icons.account_balance_wallet_outlined, Color(0xFF00BAF2), 'paytmmp://pay?', 'paytmmp://pay?'),
  _UpiApp('CRED', Icons.credit_card, Color(0xFF111111), 'credpay://upi/pay?', 'credpay://upi/pay?'),
];

class _UpiPaySheet extends StatefulWidget {
  final String upiId;
  final String payeeName;
  final double amount;
  /// Payment note the family's app shows, e.g. "NDA bill 683".
  final String note;
  final String forWhat;
  /// Extra link parameters from the server, e.g. merchant code `mc` and
  /// reference `tr` that a bank merchant ID needs.
  final Map<String, String> extra;
  /// False for a bank's static merchant ID: the link carries no amount or
  /// note (Google Pay rejects an unsigned merchant link with an amount),
  /// and the family types the amount shown here.
  final bool prefillAmount;

  const _UpiPaySheet({
    this.extra = const {},
    this.prefillAmount = true,
    required this.upiId,
    required this.payeeName,
    required this.amount,
    required this.note,
    required this.forWhat,
  });

  @override
  State<_UpiPaySheet> createState() => _UpiPaySheetState();
}

class _UpiPaySheetState extends State<_UpiPaySheet> {
  bool _opened = false;
  // Shown inside the sheet: a SnackBar would sit behind it, unseen.
  String? _hint;
  bool _hintIsError = false;

  String get _note => widget.note;

  String get _query {
    final p = {
      'pa': widget.upiId,
      'pn': widget.payeeName,
      ...widget.extra,
      if (widget.prefillAmount) 'am': widget.amount.toStringAsFixed(2),
      'cu': 'INR',
      if (widget.prefillAmount) 'tn': _note,
    };
    return p.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&');
  }

  String get _upiLink => 'upi://pay?$_query';

  // iPhone (the web app) uses the apps' iOS links; Android uses theirs.
  bool get _isIos => defaultTargetPlatform == TargetPlatform.iOS;

  Future<void> _open(String link, String label) async {
    bool ok = false;
    try {
      ok = await launchUrl(Uri.parse(link),
          mode: LaunchMode.externalApplication, webOnlyWindowName: '_self');
    } catch (_) {
      ok = false;
    }
    if (!mounted) return;
    setState(() {
      if (ok) {
        _opened = true;
        _hint = 'Pay in $label, then come back and upload the screenshot.';
        _hintIsError = false;
      } else {
        _hint = "Couldn't open $label. Copy the UPI ID below and pay from any UPI app, or scan the QR from another phone.";
        _hintIsError = true;
      }
    });
  }

  void _copy(String text, String what) {
    Clipboard.setData(ClipboardData(text: text));
    setState(() { _hint = '$what copied.'; _hintIsError = false; });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Pay ${FeeFormat.rupees(widget.amount)}',
                style: AppTextStyles.h3, textAlign: TextAlign.center),
            const SizedBox(height: 2),
            Text('${widget.forWhat} · to ${widget.payeeName}',
                textAlign: TextAlign.center,
                style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 16),

            if (!widget.prefillAmount) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.edit_note, color: AppColors.warning),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'In your UPI app, enter ${FeeFormat.rupees(widget.amount)} as the amount'
                        ' and "$_note" as the note.',
                        style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            Text('1. Choose your UPI app', style: AppTextStyles.labelLarge),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 3.2,
              children: [
                for (final a in _apps)
                  OutlinedButton.icon(
                    onPressed: () => _open('${_isIos ? a.ios : a.android}$_query', a.label),
                    icon: Icon(a.icon, color: a.color),
                    label: Text(a.label, overflow: TextOverflow.ellipsis),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: BorderSide(color: a.color.withValues(alpha: 0.4)),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => _open(_upiLink, 'a UPI app'),
              icon: const Icon(Icons.apps),
              label: const Text('Other UPI app (BHIM, bank app…)'),
            ),
            const SizedBox(height: 6),
            Text(
              'If Google Pay says “money not debited” or “limit exceeded”, nothing was charged — '
              'tap Google Pay again, or use PhonePe, or pay to the UPI ID below.',
              textAlign: TextAlign.center,
              style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
            ),
            if (_hint != null) ...[
              const SizedBox(height: 8),
              Text(_hint!,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.caption.copyWith(
                      color: _hintIsError ? AppColors.error : AppColors.success)),
            ],
            const SizedBox(height: 16),

            // Always-works fallback: scan from another phone, or pay to the ID.
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.divider),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(4),
                    child: QrImageView(data: _upiLink, size: 110),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Or pay to this UPI ID', style: AppTextStyles.caption),
                        const SizedBox(height: 2),
                        SelectableText(widget.upiId,
                            style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Wrap(spacing: 8, runSpacing: 4, children: [
                          ActionChip(
                            avatar: const Icon(Icons.copy, size: 16),
                            label: const Text('Copy UPI ID'),
                            onPressed: () => _copy(widget.upiId, 'UPI ID'),
                          ),
                          ActionChip(
                            avatar: const Icon(Icons.copy, size: 16),
                            label: Text('Copy ${FeeFormat.rupees(widget.amount)}'),
                            onPressed: () => _copy(widget.amount.toStringAsFixed(0), 'Amount'),
                          ),
                        ]),
                        const SizedBox(height: 4),
                        Text('Add "$_note" as the note.',
                            style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            Text('2. After paying', style: AppTextStyles.labelLarge),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(true),
              icon: const Icon(Icons.upload_file),
              label: Text(_opened ? "I've paid — upload screenshot" : "Already paid? Upload screenshot"),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            ),
            const SizedBox(height: 6),
            Text(
              'The academy checks your screenshot and marks the bill paid. You will see “Being verified” until then.',
              textAlign: TextAlign.center,
              style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
