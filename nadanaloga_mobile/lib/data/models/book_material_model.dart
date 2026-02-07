class BookMaterialModel {
  final int id;
  final String title;
  final String? description;
  final String? course;
  final String? fileUrl;
  final String? fileType;
  final List<int>? recipientIds;
  final String? createdAt;
  final String? updatedAt;

  const BookMaterialModel({
    required this.id,
    required this.title,
    this.description,
    this.course,
    this.fileUrl,
    this.fileType,
    this.recipientIds,
    this.createdAt,
    this.updatedAt,
  });

  factory BookMaterialModel.fromJson(Map<String, dynamic> json) {
    return BookMaterialModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      title: json['title'] ?? '',
      description: json['description'] as String?,
      course: json['course'] as String?,
      fileUrl: json['file_url'] as String?,
      fileType: json['file_type'] as String?,
      recipientIds: json['recipient_ids'] != null
          ? List<int>.from(json['recipient_ids'])
          : null,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'course': course,
      'file_url': fileUrl,
      'file_type': fileType,
      'recipient_ids': recipientIds,
    };
  }
}
