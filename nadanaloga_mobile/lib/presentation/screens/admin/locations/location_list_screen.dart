import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/location/location_bloc.dart';
import '../../../bloc/location/location_event.dart';
import '../../../bloc/location/location_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';

class LocationListScreen extends StatelessWidget {
  const LocationListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Locations / Branches')),
      body: BlocConsumer<LocationBloc, LocationState>(
        listener: (context, state) {
          if (state is LocationOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is LocationError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is LocationLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is LocationLoaded) {
            if (state.locations.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.location_off,
                title: 'No locations yet',
                subtitle: 'Add your first branch location.',
                actionLabel: 'Add Location',
                onAction: () async {
                  final created =
                      await context.push<bool>('/admin/locations/add');
                  if (created == true && context.mounted) {
                    context.read<LocationBloc>().add(LoadLocations());
                  }
                },
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<LocationBloc>().add(LoadLocations()),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.locations.length,
                itemBuilder: (context, index) {
                  final loc = state.locations[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.info.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.location_on, color: AppColors.info),
                      ),
                      title: Text(loc.name, style: AppTextStyles.labelLarge),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (loc.displayAddress.isNotEmpty)
                            Text(loc.displayAddress, style: AppTextStyles.caption),
                          if (loc.phone != null)
                            Text(loc.phone!, style: AppTextStyles.caption),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: loc.isActive
                                      ? AppColors.success.withValues(alpha: 0.1)
                                      : AppColors.error.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  loc.isActive ? 'Active' : 'Inactive',
                                  style: AppTextStyles.caption.copyWith(
                                    color: loc.isActive
                                        ? AppColors.success
                                        : AppColors.error,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      trailing: PopupMenuButton<String>(
                        onSelected: (value) async {
                          if (value == 'edit') {
                            final updated = await context
                                .push<bool>('/admin/locations/${loc.id}/edit');
                            if (updated == true && context.mounted) {
                              context.read<LocationBloc>().add(LoadLocations());
                            }
                          } else if (value == 'delete') {
                            final confirmed = await ConfirmDialog.show(
                              context,
                              title: 'Delete Location',
                              message:
                                  'Are you sure you want to delete "${loc.name}"?',
                              confirmLabel: 'Delete',
                              confirmColor: AppColors.error,
                            );
                            if (confirmed == true && context.mounted) {
                              context
                                  .read<LocationBloc>()
                                  .add(DeleteLocation(loc.id));
                            }
                          }
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(value: 'edit', child: Text('Edit')),
                          PopupMenuItem(
                            value: 'delete',
                            child: Text('Delete',
                                style: TextStyle(color: AppColors.error)),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final created = await context.push<bool>('/admin/locations/add');
          if (created == true && context.mounted) {
            context.read<LocationBloc>().add(LoadLocations());
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
