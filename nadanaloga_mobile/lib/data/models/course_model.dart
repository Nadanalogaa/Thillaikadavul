class CourseModel {
  final int id;
  final String name;
  final String? description;
  final String? icon;
  final String? image;
  final String? createdAt;
  final String? updatedAt;

  const CourseModel({
    required this.id,
    required this.name,
    this.description,
    this.icon,
    this.image,
    this.createdAt,
    this.updatedAt,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    return CourseModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      name: json['name'] ?? '',
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      image: json['image'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'icon': icon,
      'image': image,
    };
  }
}
