import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/book_material/book_material_bloc.dart';
import '../../../bloc/book_material/book_material_event.dart';
import '../../../bloc/book_material/book_material_state.dart';
import '../../../../core/network/api_client.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';
import '../../../widgets/recipient_selection_sheet.dart';

class MaterialListScreen extends StatelessWidget {
  const MaterialListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Study Materials')),
      body: BlocConsumer<BookMaterialBloc, BookMaterialState>(
        listener: (context, state) {
          if (state is BookMaterialOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is BookMaterialError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is BookMaterialLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is BookMaterialsLoaded) {
            if (state.bookMaterials.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.auto_stories_outlined,
                title: 'No materials',
                subtitle: 'Add study materials for students.',
                actionLabel: 'Add Material',
                onAction: () async {
                  final created =
                      await context.push<bool>('/admin/materials/add');
                  if (created == true && context.mounted) {
                    context
                        .read<BookMaterialBloc>()
                        .add(LoadBookMaterials());
                  }
                },
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<BookMaterialBloc>().add(LoadBookMaterials()),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.bookMaterials.length,
                itemBuilder: (context, index) {
                  final material = state.bookMaterials[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primary,
                        child: const Icon(Icons.auto_stories,
                            color: Colors.white),
                      ),
                      title: Text(material.title,
                          style: AppTextStyles.labelLarge),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          if (material.course != null &&
                              material.course!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Chip(
                                label: Text(material.course!,
                                    style: AppTextStyles.caption),
                                padding: EdgeInsets.zero,
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          if (material.fileType != null &&
                              material.fileType!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.primary
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  material.fileType!.toUpperCase(),
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                          if (material.description != null &&
                              material.description!.isNotEmpty)
                            Text(
                              material.description!,
                              style: AppTextStyles.caption,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                      trailing: PopupMenuButton<String>(
                        onSelected: (value) async {
                          if (value == 'edit') {
                            final updated = await context
                                .push<bool>('/admin/materials/${material.id}/edit');
                            if (updated == true && context.mounted) {
                              context
                                  .read<BookMaterialBloc>()
                                  .add(LoadBookMaterials());
                            }
                          } else if (value == 'delete') {
                            final confirmed = await ConfirmDialog.show(
                              context,
                              title: 'Delete Material',
                              message:
                                  'Are you sure you want to delete "${material.title}"?',
                              confirmLabel: 'Delete',
                              confirmColor: AppColors.error,
                            );
                            if (confirmed == true && context.mounted) {
                              context
                                  .read<BookMaterialBloc>()
                                  .add(DeleteBookMaterial(material.id));
                            }
                          } else if (value == 'share') {
                            final result = await showModalBottomSheet<
                                RecipientSelectionResult>(
                              context: context,
                              isScrollControlled: true,
                              builder: (_) => RecipientSelectionSheet(
                                contentTitle: material.title,
                                contentType: 'BookMaterial',
                              ),
                            );
                            if (result != null && context.mounted) {
                              try {
                                await sl<ApiClient>().shareContent(
                                  contentId: material.id,
                                  contentType: 'BookMaterial',
                                  recipientIds: result.recipientIds,
                                  sendEmail: result.sendEmail,
                                );
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context)
                                      .showSnackBar(const SnackBar(
                                          content: Text(
                                              'Shared successfully')));
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context)
                                      .showSnackBar(SnackBar(
                                    content:
                                        Text('Failed to share: $e'),
                                    backgroundColor: AppColors.error,
                                  ));
                                }
                              }
                            }
                          }
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(
                              value: 'share',
                              child: Text('Share')),
                          PopupMenuItem(
                              value: 'edit', child: Text('Edit')),
                          PopupMenuItem(
                            value: 'delete',
                            child: Text('Delete',
                                style:
                                    TextStyle(color: AppColors.error)),
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
          final created = await context.push<bool>('/admin/materials/add');
          if (created == true && context.mounted) {
            context.read<BookMaterialBloc>().add(LoadBookMaterials());
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
