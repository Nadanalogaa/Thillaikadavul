class NotificationModel {
  final int id;
  final int userId;
  final String title;
  final String? message;
  final String? type;
  final bool isRead;
  final String? createdAt;

  const NotificationModel({
    required this.id,
    required this.userId,
    required this.title,
    this.message,
    this.type,
    this.isRead = false,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      userId: json['user_id'] is int ? json['user_id'] : int.parse(json['user_id'].toString()),
      title: json['title'] ?? '',
      message: json['message'] as String?,
      type: json['type'] as String?,
      isRead: json['is_read'] == true,
      createdAt: json['created_at'] as String?,
    );
  }
}
