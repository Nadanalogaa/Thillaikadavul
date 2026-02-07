class NoticeModel {
  final int id;
  final String title;
  final String? content;
  final String? category;
  final String? priority;
  final bool isActive;
  final String? createdAt;
  final String? updatedAt;

  const NoticeModel({
    required this.id,
    required this.title,
    this.content,
    this.category,
    this.priority,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  factory NoticeModel.fromJson(Map<String, dynamic> json) {
    return NoticeModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      title: json['title'] ?? '',
      content: json['content'] as String?,
      category: json['category'] as String?,
      priority: json['priority'] as String?,
      isActive: json['is_active'] ?? true,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'content': content,
      'category': category,
      'priority': priority,
      'is_active': isActive,
    };
  }
}
