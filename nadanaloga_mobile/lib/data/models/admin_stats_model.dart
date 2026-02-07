class AdminStatsModel {
  final int students;
  final int teachers;
  final int admins;
  final int batches;
  final int courses;
  final int locations;
  final int pendingInvoices;
  final int pendingDemos;

  const AdminStatsModel({
    this.students = 0,
    this.teachers = 0,
    this.admins = 0,
    this.batches = 0,
    this.courses = 0,
    this.locations = 0,
    this.pendingInvoices = 0,
    this.pendingDemos = 0,
  });

  factory AdminStatsModel.fromJson(Map<String, dynamic> json) {
    return AdminStatsModel(
      students: json['students'] ?? 0,
      teachers: json['teachers'] ?? 0,
      admins: json['admins'] ?? 0,
      batches: json['batches'] ?? 0,
      courses: json['courses'] ?? 0,
      locations: json['locations'] ?? 0,
      pendingInvoices: json['pendingInvoices'] ?? 0,
      pendingDemos: json['pendingDemos'] ?? 0,
    );
  }

  int get totalUsers => students + teachers + admins;
}
