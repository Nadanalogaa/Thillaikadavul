/// Native builds never call this (they use the razorpay_flutter plugin).
Future<void> openWebRazorpay(
  Map<String, dynamic> options, {
  required void Function(String paymentId, String orderId, String signature) onSuccess,
  required void Function(String message) onFailure,
}) async {
  onFailure('Online payment is not available here.');
}
