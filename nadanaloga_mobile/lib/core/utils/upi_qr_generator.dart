class UpiQrGenerator {
  static String generateUpiUri({
    required String upiId,
    required String payeeName,
    required double amount,
    String? transactionNote,
    String currency = 'INR',
  }) {
    final params = <String, String>{
      'pa': upiId,
      'pn': payeeName,
      'am': amount.toStringAsFixed(2),
      'cu': currency,
    };
    if (transactionNote != null && transactionNote.isNotEmpty) {
      params['tn'] = transactionNote;
    }
    final query = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');
    return 'upi://pay?$query';
  }
}
