import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/go_router_refresh_stream.dart';
import '../../di/injection_container.dart';
import '../../presentation/bloc/auth/auth_bloc.dart';
import '../../presentation/bloc/auth/auth_state.dart';
import '../../presentation/bloc/batch/batch_bloc.dart';
import '../../presentation/bloc/course/course_bloc.dart';
import '../../presentation/bloc/course/course_event.dart';
import '../../presentation/bloc/fee/fee_bloc.dart';
import '../../presentation/bloc/fee/fee_event.dart';
import '../../presentation/bloc/location/location_bloc.dart';
import '../../presentation/bloc/location/location_event.dart';
import '../../presentation/bloc/salary/salary_bloc.dart';
import '../../presentation/bloc/salary/salary_event.dart';
import '../../presentation/bloc/event/event_bloc.dart';
import '../../presentation/bloc/event/event_event.dart';
import '../../presentation/bloc/notice/notice_bloc.dart';
import '../../presentation/bloc/notice/notice_event.dart';
import '../../presentation/bloc/book_material/book_material_bloc.dart';
import '../../presentation/bloc/book_material/book_material_event.dart';
import '../../presentation/bloc/grade_exam/grade_exam_bloc.dart';
import '../../presentation/bloc/grade_exam/grade_exam_event.dart';
import '../../presentation/bloc/demo_booking/demo_booking_bloc.dart';
import '../../presentation/bloc/demo_booking/demo_booking_event.dart';
import '../../presentation/bloc/notification/notification_bloc.dart';
import '../../presentation/bloc/trash/trash_bloc.dart';
import '../../presentation/bloc/trash/trash_event.dart';
import '../../presentation/bloc/user_management/user_management_bloc.dart';
import '../../presentation/bloc/user_management/user_management_event.dart';
import '../../presentation/screens/splash/splash_screen.dart';
import '../../presentation/screens/auth/login_screen.dart';
import '../../presentation/screens/auth/register_screen.dart';
import '../../presentation/screens/admin/admin_shell_screen.dart';
import '../../presentation/screens/admin/users/user_detail_screen.dart';
import '../../presentation/screens/admin/users/add_user_screen.dart';
import '../../presentation/screens/admin/users/edit_user_screen.dart';
import '../../presentation/screens/admin/locations/location_list_screen.dart';
import '../../presentation/screens/admin/locations/location_form_screen.dart';
import '../../presentation/screens/admin/courses/course_list_screen.dart';
import '../../presentation/screens/admin/courses/course_form_screen.dart';
import '../../presentation/screens/admin/batches/batch_detail_screen.dart';
import '../../presentation/screens/admin/batches/batch_form_screen.dart';
import '../../presentation/screens/admin/fees/fee_management_screen.dart';
import '../../presentation/screens/admin/fees/fee_structure_form_screen.dart';
import '../../presentation/screens/admin/fees/discount_management_screen.dart';
import '../../presentation/screens/admin/fees/create_invoice_screen.dart';
import '../../presentation/screens/admin/fees/record_payment_screen.dart';
import '../../presentation/screens/admin/fees/upi_qr_display_screen.dart';
import '../../presentation/screens/admin/fees/payment_proofs_screen.dart';
import '../../presentation/screens/admin/salary/salary_management_screen.dart';
import '../../presentation/screens/admin/salary/salary_config_form_screen.dart';
import '../../presentation/screens/admin/salary/record_salary_payment_screen.dart';
import '../../presentation/screens/admin/events/event_list_screen.dart';
import '../../presentation/screens/admin/events/event_form_screen.dart';
import '../../presentation/screens/admin/notices/notice_list_screen.dart';
import '../../presentation/screens/admin/notices/notice_form_screen.dart';
import '../../presentation/screens/admin/materials/material_list_screen.dart';
import '../../presentation/screens/admin/materials/material_form_screen.dart';
import '../../presentation/screens/admin/exams/exam_list_screen.dart';
import '../../presentation/screens/admin/exams/exam_form_screen.dart';
import '../../presentation/screens/admin/demos/demo_list_screen.dart';
import '../../presentation/screens/admin/demos/demo_detail_screen.dart';
import '../../presentation/screens/admin/notifications/notification_list_screen.dart';
import '../../presentation/screens/admin/notifications/send_notification_screen.dart';
import '../../presentation/screens/admin/trash/trash_screen.dart';
import '../../presentation/screens/admin/settings/admin_settings_screen.dart';
import '../../presentation/screens/admin/drilldown/students_drilldown_screen.dart';
import '../../presentation/screens/admin/drilldown/student_list_by_course_screen.dart';
import '../../presentation/screens/admin/drilldown/student_detail_drilldown_screen.dart';
import '../../presentation/screens/admin/drilldown/teachers_drilldown_screen.dart';
import '../../presentation/screens/admin/drilldown/batches_drilldown_screen.dart';
import '../../presentation/screens/admin/drilldown/pending_fees_drilldown_screen.dart';
import '../../presentation/screens/teacher/teacher_dashboard_screen.dart';
import '../../presentation/screens/student/student_shell_screen.dart';
import '../../presentation/screens/student/student_payment_proof_screen.dart';
import '../../presentation/screens/parent/parent_dashboard_screen.dart';
import '../../presentation/screens/parent/parent_student_detail_screen.dart';
import '../../presentation/bloc/parent/parent_bloc.dart';
import '../../data/models/user_model.dart';

class AppRouter {
  static GoRouter? _router;

  static GoRouter createRouter(AuthBloc authBloc) {
    _router ??= GoRouter(
      initialLocation: '/',
      debugLogDiagnostics: true,
      refreshListenable: GoRouterRefreshStream(authBloc.stream),
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/admin',
          builder: (context, state) => const AdminShellScreen(),
          routes: [
            // User routes
            GoRoute(
              path: 'users/add',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<UserManagementBloc>(),
                child: const AddUserScreen(),
              ),
            ),
            GoRoute(
              path: 'users/:id',
              builder: (context, state) {
                final id = int.parse(state.pathParameters['id']!);
                return BlocProvider(
                  create: (_) => sl<UserManagementBloc>(),
                  child: UserDetailScreen(userId: id),
                );
              },
              routes: [
                GoRoute(
                  path: 'edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<UserManagementBloc>(),
                      child: EditUserScreen(userId: id),
                    );
                  },
                ),
              ],
            ),

            // Location routes
            GoRoute(
              path: 'locations',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<LocationBloc>()..add(LoadLocations()),
                child: const LocationListScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<LocationBloc>(),
                    child: const LocationFormScreen(),
                  ),
                ),
                GoRoute(
                  path: ':id/edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<LocationBloc>(),
                      child: LocationFormScreen(locationId: id),
                    );
                  },
                ),
              ],
            ),

            // Course routes
            GoRoute(
              path: 'courses',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<CourseBloc>()..add(LoadCourses()),
                child: const CourseListScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<CourseBloc>(),
                    child: const CourseFormScreen(),
                  ),
                ),
                GoRoute(
                  path: ':id/edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<CourseBloc>(),
                      child: CourseFormScreen(courseId: id),
                    );
                  },
                ),
              ],
            ),

            // Batch routes
            GoRoute(
              path: 'batches/add',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<BatchBloc>(),
                child: const BatchFormScreen(),
              ),
            ),
            GoRoute(
              path: 'batches/:id',
              builder: (context, state) {
                final id = int.parse(state.pathParameters['id']!);
                return BlocProvider(
                  create: (_) => sl<BatchBloc>(),
                  child: BatchDetailScreen(batchId: id),
                );
              },
              routes: [
                GoRoute(
                  path: 'edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<BatchBloc>(),
                      child: BatchFormScreen(batchId: id),
                    );
                  },
                ),
              ],
            ),

            // Fee routes
            GoRoute(
              path: 'fees',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<FeeBloc>()..add(LoadFeeStructures()),
                child: const FeeManagementScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'structures/add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<FeeBloc>(),
                    child: const FeeStructureFormScreen(),
                  ),
                ),
                GoRoute(
                  path: 'structures/:id/edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<FeeBloc>(),
                      child: FeeStructureFormScreen(structureId: id),
                    );
                  },
                ),
                GoRoute(
                  path: 'invoices/add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<FeeBloc>(),
                    child: const CreateInvoiceScreen(),
                  ),
                ),
                GoRoute(
                  path: 'invoices/:id/pay',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<FeeBloc>(),
                      child: RecordPaymentScreen(invoiceId: id),
                    );
                  },
                ),
                GoRoute(
                  path: 'invoices/:id/upi-qr',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return UpiQrDisplayScreen(invoiceId: id);
                  },
                ),
                GoRoute(
                  path: 'payments',
                  builder: (context, state) => const PaymentProofsScreen(),
                ),
                GoRoute(
                  path: 'discounts',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<FeeBloc>(),
                    child: const DiscountManagementScreen(),
                  ),
                ),
              ],
            ),

            // Salary routes
            GoRoute(
              path: 'salary',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<SalaryBloc>()..add(LoadSalaries()),
                child: const SalaryManagementScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<SalaryBloc>(),
                    child: const SalaryConfigFormScreen(),
                  ),
                ),
                GoRoute(
                  path: ':id/edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<SalaryBloc>(),
                      child: SalaryConfigFormScreen(salaryId: id),
                    );
                  },
                ),
                GoRoute(
                  path: 'pay',
                  builder: (context, state) {
                    final salaryIdStr = state.uri.queryParameters['salaryId'];
                    final salaryId = salaryIdStr != null
                        ? int.tryParse(salaryIdStr)
                        : null;
                    return BlocProvider(
                      create: (_) => sl<SalaryBloc>(),
                      child: RecordSalaryPaymentScreen(
                          preselectedSalaryId: salaryId),
                    );
                  },
                ),
              ],
            ),

            // Event routes
            GoRoute(
              path: 'events',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<EventBloc>()..add(LoadEvents()),
                child: const EventListScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<EventBloc>(),
                    child: const EventFormScreen(),
                  ),
                ),
                GoRoute(
                  path: ':id/edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<EventBloc>(),
                      child: EventFormScreen(eventId: id),
                    );
                  },
                ),
              ],
            ),

            // Notice routes
            GoRoute(
              path: 'notices',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<NoticeBloc>()..add(LoadNotices()),
                child: const NoticeListScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<NoticeBloc>(),
                    child: const NoticeFormScreen(),
                  ),
                ),
                GoRoute(
                  path: ':id/edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<NoticeBloc>(),
                      child: NoticeFormScreen(noticeId: id),
                    );
                  },
                ),
              ],
            ),

            // Book Material routes
            GoRoute(
              path: 'materials',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<BookMaterialBloc>()..add(LoadBookMaterials()),
                child: const MaterialListScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<BookMaterialBloc>(),
                    child: const MaterialFormScreen(),
                  ),
                ),
                GoRoute(
                  path: ':id/edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<BookMaterialBloc>(),
                      child: MaterialFormScreen(materialId: id),
                    );
                  },
                ),
              ],
            ),

            // Grade Exam routes
            GoRoute(
              path: 'exams',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<GradeExamBloc>()..add(LoadGradeExams()),
                child: const ExamListScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'add',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<GradeExamBloc>(),
                    child: const ExamFormScreen(),
                  ),
                ),
                GoRoute(
                  path: ':id/edit',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<GradeExamBloc>(),
                      child: ExamFormScreen(examId: id),
                    );
                  },
                ),
              ],
            ),

            // Demo Booking routes
            GoRoute(
              path: 'demos',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<DemoBookingBloc>()..add(LoadDemoBookings()),
                child: const DemoListScreen(),
              ),
              routes: [
                GoRoute(
                  path: ':id',
                  builder: (context, state) {
                    final id = int.parse(state.pathParameters['id']!);
                    return BlocProvider(
                      create: (_) => sl<DemoBookingBloc>(),
                      child: DemoDetailScreen(bookingId: id),
                    );
                  },
                ),
              ],
            ),

            // Notification routes
            GoRoute(
              path: 'notifications',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<NotificationBloc>(),
                child: const NotificationListScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'send',
                  builder: (context, state) => BlocProvider(
                    create: (_) => sl<NotificationBloc>(),
                    child: const SendNotificationScreen(),
                  ),
                ),
              ],
            ),

            // Trash route
            GoRoute(
              path: 'trash',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<TrashBloc>()..add(LoadTrashedUsers()),
                child: const TrashScreen(),
              ),
            ),

            // Settings route
            GoRoute(
              path: 'settings',
              builder: (context, state) => const AdminSettingsScreen(),
            ),

            // Drilldown routes
            GoRoute(
              path: 'drilldown/students',
              builder: (context, state) => MultiBlocProvider(
                providers: [
                  BlocProvider(create: (_) => sl<UserManagementBloc>()),
                  BlocProvider(create: (_) => sl<CourseBloc>()),
                ],
                child: const StudentsDrilldownScreen(),
              ),
              routes: [
                GoRoute(
                  path: 'course/:courseName',
                  builder: (context, state) {
                    final courseName = Uri.decodeComponent(
                        state.pathParameters['courseName']!);
                    return BlocProvider(
                      create: (_) => sl<UserManagementBloc>(),
                      child: StudentListByCourseScreen(courseName: courseName),
                    );
                  },
                ),
              ],
            ),
            GoRoute(
              path: 'drilldown/student/:id',
              builder: (context, state) {
                final id = int.parse(state.pathParameters['id']!);
                final showFeesOnly =
                    state.uri.queryParameters['fees'] == 'true';
                return MultiBlocProvider(
                  providers: [
                    BlocProvider(create: (_) => sl<UserManagementBloc>()),
                    BlocProvider(create: (_) => sl<FeeBloc>()),
                  ],
                  child: StudentDetailDrilldownScreen(
                    studentId: id,
                    showFeesOnly: showFeesOnly,
                  ),
                );
              },
            ),
            GoRoute(
              path: 'drilldown/teachers',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<UserManagementBloc>(),
                child: const TeachersDrilldownScreen(),
              ),
            ),
            GoRoute(
              path: 'drilldown/batches',
              builder: (context, state) => MultiBlocProvider(
                providers: [
                  BlocProvider(create: (_) => sl<BatchBloc>()),
                  BlocProvider(create: (_) => sl<CourseBloc>()),
                ],
                child: const BatchesDrilldownScreen(),
              ),
            ),
            GoRoute(
              path: 'drilldown/pending-fees',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<FeeBloc>()..add(LoadInvoices()),
                child: const PendingFeesDrilldownScreen(),
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/teacher',
          builder: (context, state) => const TeacherDashboardScreen(),
          routes: [
            GoRoute(
              path: 'notifications',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<NotificationBloc>(),
                child: const NotificationListScreen(),
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/student',
          builder: (context, state) {
            // Handle extra data for parent viewing student
            final extra = state.extra as Map<String, dynamic>?;
            final studentId = extra?['studentId'] as int?;
            final student = extra?['student'] as UserModel?;
            return StudentShellScreen(
              studentId: studentId,
              student: student,
            );
          },
          routes: [
            GoRoute(
              path: 'notifications',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<NotificationBloc>(),
                child: const NotificationListScreen(),
              ),
            ),
            GoRoute(
              path: 'fees/:id/upi',
              builder: (context, state) {
                final id = int.parse(state.pathParameters['id']!);
                return UpiQrDisplayScreen(invoiceId: id);
              },
            ),
            GoRoute(
              path: 'fees/:id/proof',
              builder: (context, state) {
                final id = int.parse(state.pathParameters['id']!);
                return StudentPaymentProofScreen(invoiceId: id);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/parent',
          builder: (context, state) => const ParentDashboardScreen(),
          routes: [
            GoRoute(
              path: 'student/:id',
              builder: (context, state) {
                final id = int.parse(state.pathParameters['id']!);
                // Get student from extra data passed via navigation
                final student = state.extra as UserModel?;
                return BlocProvider(
                  create: (_) => sl<ParentBloc>(),
                  child: ParentStudentDetailScreen(
                    studentId: id,
                    student: student,
                  ),
                );
              },
            ),
            GoRoute(
              path: 'notifications',
              builder: (context, state) => BlocProvider(
                create: (_) => sl<NotificationBloc>(),
                child: const NotificationListScreen(),
              ),
            ),
          ],
        ),
      ],
      redirect: (context, state) {
        final authState = authBloc.state;
        final location = state.matchedLocation;
        final isOnAuthPage = location == '/login' || location == '/register';
        final isOnSplash = location == '/';

        if (isOnSplash) return null;

        // Logged out -> go to login
        if (authState is AuthUnauthenticated && !isOnAuthPage) {
          return '/login';
        }

        // Logged in but on auth page -> go to dashboard
        if (authState is AuthAuthenticated && isOnAuthPage) {
          return _dashboardForRole(authState.user.role);
        }

        return null;
      },
    );
    return _router!;
  }

  static String _dashboardForRole(String role) {
    switch (role) {
      case 'Admin':
        return '/admin';
      case 'Teacher':
        return '/teacher';
      case 'Student':
        return '/student';
      case 'Parent':
        return '/student'; // Parents use the unified student dashboard
      default:
        return '/login';
    }
  }
}
