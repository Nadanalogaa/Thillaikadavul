class UserModel {
  final int id;
  final String? userId; // NDA-YYYY-XXXX
  final String name;
  final String email;
  final String role; // Admin, Teacher, Student
  final bool isSuperAdmin;
  final String? classPreference;
  final String? photoUrl;
  final String? dob;
  final String? sex;
  final String? contactNumber;
  final String? address;
  final String? dateOfJoining;
  final List<String> courses;
  final String? fatherName;
  final String? standard;
  final String? schoolName;
  final String? grade;
  final String? notes;
  final List<String> courseExpertise;
  final String? educationalQualifications;
  final String? employmentType;
  final int? preferredLocationId;
  final String? status;
  final bool isDeleted;
  final String? createdAt;
  final String? updatedAt;
  final List<UserModel>? students; // For parent role - list of their children

  const UserModel({
    required this.id,
    this.userId,
    required this.name,
    required this.email,
    required this.role,
    this.isSuperAdmin = false,
    this.classPreference,
    this.photoUrl,
    this.dob,
    this.sex,
    this.contactNumber,
    this.address,
    this.dateOfJoining,
    this.courses = const [],
    this.fatherName,
    this.standard,
    this.schoolName,
    this.grade,
    this.notes,
    this.courseExpertise = const [],
    this.educationalQualifications,
    this.employmentType,
    this.preferredLocationId,
    this.status,
    this.isDeleted = false,
    this.createdAt,
    this.updatedAt,
    this.students,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      userId: json['user_id'] as String?,
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: _normalizeRole(json['role'] as String? ?? 'Student'),
      isSuperAdmin: json['is_super_admin'] == true,
      classPreference: json['class_preference'] as String?,
      photoUrl: json['photo_url'] as String?,
      dob: json['dob'] as String?,
      sex: json['sex'] as String?,
      contactNumber: json['contact_number'] as String?,
      address: json['address'] as String?,
      dateOfJoining: json['date_of_joining'] as String?,
      courses: _parseStringList(json['courses']),
      fatherName: json['father_name'] as String?,
      standard: json['standard'] as String?,
      schoolName: json['school_name'] as String?,
      grade: json['grade'] as String?,
      notes: json['notes'] as String?,
      courseExpertise: _parseStringList(json['course_expertise']),
      educationalQualifications: json['educational_qualifications'] as String?,
      employmentType: json['employment_type'] as String?,
      preferredLocationId: json['preferred_location_id'] as int?,
      status: json['status'] as String?,
      isDeleted: json['is_deleted'] == true,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
      students: json['students'] != null && json['students'] is List
          ? (json['students'] as List).map((s) => UserModel.fromJson(s)).toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'email': email,
      'role': role,
      'is_super_admin': isSuperAdmin,
      'class_preference': classPreference,
      'photo_url': photoUrl,
      'dob': dob,
      'sex': sex,
      'contact_number': contactNumber,
      'address': address,
      'date_of_joining': dateOfJoining,
      'courses': courses,
      'father_name': fatherName,
      'standard': standard,
      'school_name': schoolName,
      'grade': grade,
      'notes': notes,
      'course_expertise': courseExpertise,
      'educational_qualifications': educationalQualifications,
      'employment_type': employmentType,
      'preferred_location_id': preferredLocationId,
      'status': status,
    };
  }

  /// Create a registration request payload
  static Map<String, dynamic> registrationPayload({
    required String name,
    required String email,
    required String password,
    String role = 'Student',
    String? contactNumber,
    String? fatherName,
    String? address,
    List<String>? courses,
    String? classPreference,
    int? preferredLocationId,
  }) {
    final payload = <String, dynamic>{
      'name': name,
      'email': email,
      'password': password,
      'role': role,
      'contact_number': contactNumber,
      'father_name': fatherName,
      'address': address,
      'courses': courses ?? [],
      'class_preference': classPreference ?? 'Hybrid',
    };
    if (preferredLocationId != null) {
      payload['preferred_location_id'] = preferredLocationId;
    }
    return payload;
  }

  /// Normalizes role strings to title case (e.g., 'admin' → 'Admin').
  static String _normalizeRole(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Admin';
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      case 'parent':
        return 'Parent';
      default:
        return role;
    }
  }

  static List<String> _parseStringList(dynamic value) {
    if (value == null) return [];
    if (value is List) return value.map((e) => e.toString()).toList();
    return [];
  }

  UserModel copyWith({
    int? id,
    String? userId,
    String? name,
    String? email,
    String? role,
    bool? isSuperAdmin,
    String? classPreference,
    String? photoUrl,
    String? dob,
    String? sex,
    String? contactNumber,
    String? address,
    String? dateOfJoining,
    List<String>? courses,
    String? fatherName,
    String? standard,
    String? schoolName,
    String? grade,
    String? notes,
    List<String>? courseExpertise,
    String? educationalQualifications,
    String? employmentType,
    int? preferredLocationId,
    String? status,
    bool? isDeleted,
  }) {
    return UserModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      isSuperAdmin: isSuperAdmin ?? this.isSuperAdmin,
      classPreference: classPreference ?? this.classPreference,
      photoUrl: photoUrl ?? this.photoUrl,
      dob: dob ?? this.dob,
      sex: sex ?? this.sex,
      contactNumber: contactNumber ?? this.contactNumber,
      address: address ?? this.address,
      dateOfJoining: dateOfJoining ?? this.dateOfJoining,
      courses: courses ?? this.courses,
      fatherName: fatherName ?? this.fatherName,
      standard: standard ?? this.standard,
      schoolName: schoolName ?? this.schoolName,
      grade: grade ?? this.grade,
      notes: notes ?? this.notes,
      courseExpertise: courseExpertise ?? this.courseExpertise,
      educationalQualifications: educationalQualifications ?? this.educationalQualifications,
      employmentType: employmentType ?? this.employmentType,
      preferredLocationId: preferredLocationId ?? this.preferredLocationId,
      status: status ?? this.status,
      isDeleted: isDeleted ?? this.isDeleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  bool get isAdmin => role == 'Admin' || isSuperAdmin;
  bool get isTeacher => role == 'Teacher';
  bool get isStudent => role == 'Student';
  bool get isParent => role == 'Parent';
}
