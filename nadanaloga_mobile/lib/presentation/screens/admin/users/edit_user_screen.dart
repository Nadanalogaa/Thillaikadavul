import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/course_model.dart';
import '../../../../data/models/location_model.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/user_management/user_management_bloc.dart';
import '../../../bloc/user_management/user_management_event.dart';
import '../../../bloc/user_management/user_management_state.dart';

class EditUserScreen extends StatefulWidget {
  final int userId;

  const EditUserScreen({super.key, required this.userId});

  @override
  State<EditUserScreen> createState() => _EditUserScreenState();
}

class _EditUserScreenState extends State<EditUserScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _contactController = TextEditingController();
  final _fatherNameController = TextEditingController();
  final _addressController = TextEditingController();

  String _classPreference = 'Hybrid';
  int? _selectedLocationId;
  final Set<String> _selectedCourses = {};
  String? _status;

  List<CourseModel> _courses = [];
  List<LocationModel> _locations = [];
  bool _loading = true;
  UserModel? _user;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final apiClient = sl<ApiClient>();
      final results = await Future.wait([
        apiClient.getUserById(widget.userId),
        apiClient.getCourses(),
        apiClient.getLocations(),
      ]);

      if (results[0].statusCode == 200 && results[0].data != null) {
        _user = UserModel.fromJson(results[0].data);
        _nameController.text = _user!.name;
        _contactController.text = _user!.contactNumber ?? '';
        _fatherNameController.text = _user!.fatherName ?? '';
        _addressController.text = _user!.address ?? '';
        _classPreference = _user!.classPreference ?? 'Hybrid';
        _selectedLocationId = _user!.preferredLocationId;
        _selectedCourses.addAll(_user!.courses);
        _status = _user!.status;
      }

      if (results[1].statusCode == 200) {
        _courses = (results[1].data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
      }
      if (results[2].statusCode == 200) {
        _locations = (results[2].data as List)
            .map((j) => LocationModel.fromJson(j))
            .toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _contactController.dispose();
    _fatherNameController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final userData = <String, dynamic>{
      'name': _nameController.text.trim(),
      'class_preference': _classPreference,
      'contact_number': _contactController.text.trim().isEmpty
          ? null
          : _contactController.text.trim(),
      'father_name': _fatherNameController.text.trim().isEmpty
          ? null
          : _fatherNameController.text.trim(),
      'address': _addressController.text.trim().isEmpty
          ? null
          : _addressController.text.trim(),
      'courses': _selectedCourses.toList(),
      'preferred_location_id': _selectedLocationId,
      'status': _status,
    };

    context
        .read<UserManagementBloc>()
        .add(UpdateUser(userId: widget.userId, userData: userData));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<UserManagementBloc, UserManagementState>(
      listener: (context, state) {
        if (state is UserManagementOperationSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
          context.pop();
        } else if (state is UserManagementError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(title: Text('Edit ${_user?.name ?? 'User'}')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _user == null
                ? const Center(child: Text('User not found'))
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Name
                          TextFormField(
                            controller: _nameController,
                            decoration: const InputDecoration(
                              labelText: 'Full Name *',
                              prefixIcon: Icon(Icons.person),
                            ),
                            validator: (v) => (v == null || v.trim().isEmpty)
                                ? 'Required'
                                : null,
                            textCapitalization: TextCapitalization.words,
                          ),
                          const SizedBox(height: 16),

                          // Email (read-only)
                          TextFormField(
                            initialValue: _user!.email,
                            decoration: const InputDecoration(
                              labelText: 'Email',
                              prefixIcon: Icon(Icons.email),
                            ),
                            readOnly: true,
                            enabled: false,
                          ),
                          const SizedBox(height: 16),

                          // Contact
                          TextFormField(
                            controller: _contactController,
                            decoration: const InputDecoration(
                              labelText: 'Contact Number',
                              prefixIcon: Icon(Icons.phone),
                            ),
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 16),

                          // Father's name
                          TextFormField(
                            controller: _fatherNameController,
                            decoration: const InputDecoration(
                              labelText: "Father's Name",
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                            textCapitalization: TextCapitalization.words,
                          ),
                          const SizedBox(height: 16),

                          // Address
                          TextFormField(
                            controller: _addressController,
                            decoration: const InputDecoration(
                              labelText: 'Address',
                              prefixIcon: Icon(Icons.location_on),
                            ),
                            maxLines: 2,
                          ),
                          const SizedBox(height: 16),

                          // Status
                          DropdownButtonFormField<String>(
                            value: _status,
                            decoration: const InputDecoration(
                              labelText: 'Status',
                              prefixIcon: Icon(Icons.info),
                            ),
                            items: const [
                              DropdownMenuItem(
                                  value: 'active', child: Text('Active')),
                              DropdownMenuItem(
                                  value: 'inactive', child: Text('Inactive')),
                              DropdownMenuItem(
                                  value: 'pending', child: Text('Pending')),
                            ],
                            onChanged: (v) => setState(() => _status = v),
                          ),
                          const SizedBox(height: 16),

                          // Class preference
                          DropdownButtonFormField<String>(
                            value: _classPreference,
                            decoration: const InputDecoration(
                              labelText: 'Class Preference',
                              prefixIcon: Icon(Icons.school),
                            ),
                            items: const [
                              DropdownMenuItem(
                                  value: 'Online', child: Text('Online')),
                              DropdownMenuItem(
                                  value: 'Offline', child: Text('Offline')),
                              DropdownMenuItem(
                                  value: 'Hybrid', child: Text('Hybrid')),
                            ],
                            onChanged: (v) {
                              if (v != null) {
                                setState(() {
                                  _classPreference = v;
                                  if (v == 'Online') {
                                    _selectedLocationId = null;
                                  }
                                });
                              }
                            },
                          ),
                          const SizedBox(height: 16),

                          // Location
                          if (_classPreference != 'Online' &&
                              _locations.isNotEmpty) ...[
                            DropdownButtonFormField<int>(
                              value: _selectedLocationId,
                              decoration: const InputDecoration(
                                labelText: 'Preferred Location',
                                prefixIcon: Icon(Icons.business),
                              ),
                              items: _locations
                                  .map((loc) => DropdownMenuItem(
                                        value: loc.id,
                                        child: Text(loc.name),
                                      ))
                                  .toList(),
                              onChanged: (v) =>
                                  setState(() => _selectedLocationId = v),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Courses
                          if (_courses.isNotEmpty) ...[
                            Text('Courses', style: AppTextStyles.labelLarge),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: _courses.map((course) {
                                final selected =
                                    _selectedCourses.contains(course.name);
                                return FilterChip(
                                  label: Text(course.name),
                                  selected: selected,
                                  onSelected: (v) {
                                    setState(() {
                                      if (v) {
                                        _selectedCourses.add(course.name);
                                      } else {
                                        _selectedCourses.remove(course.name);
                                      }
                                    });
                                  },
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 24),
                          ],

                          // Submit
                          BlocBuilder<UserManagementBloc,
                              UserManagementState>(
                            builder: (context, state) {
                              final isLoading =
                                  state is UserManagementLoading;
                              return FilledButton(
                                onPressed: isLoading ? null : _submit,
                                child: isLoading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2),
                                      )
                                    : const Text('Save Changes'),
                              );
                            },
                          ),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }
}
