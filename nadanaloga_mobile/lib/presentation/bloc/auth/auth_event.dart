import 'package:equatable/equatable.dart';

import '../../../data/models/user_model.dart';
import 'package:image_picker/image_picker.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckSession extends AuthEvent {}

class AuthLoginRequested extends AuthEvent {
  final String identifier; // email or userId (NDA-YYYY-XXXX)
  final String password;

  const AuthLoginRequested({
    required this.identifier,
    required this.password,
  });

  @override
  List<Object?> get props => [identifier, password];
}

class AuthRegisterRequested extends AuthEvent {
  final String name;
  final String email;
  final String password;
  final String? contactNumber;
  final String? fatherName;
  final String? address;
  final List<String>? courses;
  final String? classPreference;
  final int? preferredLocationId;
  final XFile? photoFile;

  const AuthRegisterRequested({
    required this.name,
    required this.email,
    required this.password,
    this.contactNumber,
    this.fatherName,
    this.address,
    this.courses,
    this.classPreference,
    this.preferredLocationId,
    this.photoFile,
  });

  @override
  List<Object?> get props => [name, email, password, photoFile];
}

class AuthLogoutRequested extends AuthEvent {}

/// The user switched to another profile within the same login
/// (teacher <-> student <-> child). Carries the already-switched user
/// returned by /api/switch-profile so the app re-enters as that profile.
class AuthProfileSwitched extends AuthEvent {
  final UserModel user;

  const AuthProfileSwitched(this.user);

  @override
  List<Object?> get props => [user];
}
