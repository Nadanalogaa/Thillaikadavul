import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/user_management/user_management_bloc.dart';
import '../../../bloc/user_management/user_management_event.dart';
import '../../../bloc/user_management/user_management_state.dart';
import '../../../widgets/empty_state_widget.dart';
import '../../../widgets/user_card.dart';

class UserListScreen extends StatelessWidget {
  const UserListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<UserManagementBloc>()..add(const LoadUsers()),
      child: const _UserListView(),
    );
  }
}

class _UserListView extends StatefulWidget {
  const _UserListView();

  @override
  State<_UserListView> createState() => _UserListViewState();
}

class _UserListViewState extends State<_UserListView> {
  final _searchController = TextEditingController();
  String? _selectedRole;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadUsers() {
    context.read<UserManagementBloc>().add(LoadUsers(
          roleFilter: _selectedRole,
          search: _searchController.text.trim().isEmpty
              ? null
              : _searchController.text.trim(),
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Users'),
        automaticallyImplyLeading: false,
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name, email, or ID...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _loadUsers();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) => _loadUsers(),
            ),
          ),

          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _FilterChip(
                  label: 'All',
                  selected: _selectedRole == null,
                  onSelected: () {
                    setState(() => _selectedRole = null);
                    _loadUsers();
                  },
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Students',
                  selected: _selectedRole == 'Student',
                  onSelected: () {
                    setState(() => _selectedRole = 'Student');
                    _loadUsers();
                  },
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Teachers',
                  selected: _selectedRole == 'Teacher',
                  onSelected: () {
                    setState(() => _selectedRole = 'Teacher');
                    _loadUsers();
                  },
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Admins',
                  selected: _selectedRole == 'Admin',
                  onSelected: () {
                    setState(() => _selectedRole = 'Admin');
                    _loadUsers();
                  },
                ),
              ],
            ),
          ),

          // User list
          Expanded(
            child: BlocConsumer<UserManagementBloc, UserManagementState>(
              listener: (context, state) {
                if (state is UserManagementOperationSuccess) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message)),
                  );
                } else if (state is UserManagementError) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(state.message),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              },
              builder: (context, state) {
                if (state is UserManagementLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is UserManagementLoaded) {
                  if (state.users.isEmpty) {
                    return EmptyStateWidget(
                      icon: Icons.people_outline,
                      title: 'No users found',
                      subtitle: _selectedRole != null
                          ? 'No ${_selectedRole}s found.'
                          : 'No users match your search.',
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () async => _loadUsers(),
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: state.users.length,
                      itemBuilder: (context, index) {
                        final user = state.users[index];
                        return UserCard(
                          user: user,
                          onTap: () => context.push('/admin/users/${user.id}'),
                        );
                      },
                    ),
                  );
                }

                if (state is UserManagementError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: AppColors.error),
                        const SizedBox(height: 16),
                        Text(state.message, style: AppTextStyles.bodyMedium),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: _loadUsers,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                return const SizedBox.shrink();
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/admin/users/add'),
        child: const Icon(Icons.person_add),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(),
      showCheckmark: false,
    );
  }
}
