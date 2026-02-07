class EventModel {
  final int id;
  final String title;
  final String? description;
  final String? eventDate;
  final String? eventTime;
  final String? location;
  final String? image;
  final bool isActive;
  final bool isPublic;
  final String? createdAt;
  final String? updatedAt;

  const EventModel({
    required this.id,
    required this.title,
    this.description,
    this.eventDate,
    this.eventTime,
    this.location,
    this.image,
    this.isActive = true,
    this.isPublic = false,
    this.createdAt,
    this.updatedAt,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    return EventModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      title: json['title'] ?? '',
      description: json['description'] as String?,
      eventDate: json['event_date'] as String?,
      eventTime: json['event_time'] as String?,
      location: json['location'] as String?,
      image: json['image'] as String?,
      isActive: json['is_active'] ?? true,
      isPublic: json['is_public'] ?? false,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'event_date': eventDate,
      'event_time': eventTime,
      'location': location,
      'image': image,
      'is_active': isActive,
      'is_public': isPublic,
    };
  }
}
