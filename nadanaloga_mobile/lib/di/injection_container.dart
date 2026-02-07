import 'package:get_it/get_it.dart';

import '../core/network/api_client.dart';
import '../core/services/fcm_service.dart';
import '../presentation/bloc/auth/auth_bloc.dart';
import '../presentation/bloc/batch/batch_bloc.dart';
import '../presentation/bloc/course/course_bloc.dart';
import '../presentation/bloc/dashboard/dashboard_bloc.dart';
import '../presentation/bloc/location/location_bloc.dart';
import '../presentation/bloc/fee/fee_bloc.dart';
import '../presentation/bloc/salary/salary_bloc.dart';
import '../presentation/bloc/event/event_bloc.dart';
import '../presentation/bloc/notice/notice_bloc.dart';
import '../presentation/bloc/book_material/book_material_bloc.dart';
import '../presentation/bloc/grade_exam/grade_exam_bloc.dart';
import '../presentation/bloc/demo_booking/demo_booking_bloc.dart';
import '../presentation/bloc/notification/notification_bloc.dart';
import '../presentation/bloc/trash/trash_bloc.dart';
import '../presentation/bloc/user_management/user_management_bloc.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // Core - API Client
  final apiClient = ApiClient();
  await apiClient.init();
  sl.registerLazySingleton<ApiClient>(() => apiClient);

  // Services
  sl.registerLazySingleton<FcmService>(
    () => FcmService(apiClient: sl<ApiClient>()),
  );

  // BLoCs
  sl.registerFactory<AuthBloc>(
    () => AuthBloc(
      apiClient: sl<ApiClient>(),
      fcmService: sl<FcmService>(),
    ),
  );

  sl.registerFactory<DashboardBloc>(
    () => DashboardBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<UserManagementBloc>(
    () => UserManagementBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<LocationBloc>(
    () => LocationBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<CourseBloc>(
    () => CourseBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<BatchBloc>(
    () => BatchBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<FeeBloc>(
    () => FeeBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<SalaryBloc>(
    () => SalaryBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<EventBloc>(
    () => EventBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<NoticeBloc>(
    () => NoticeBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<BookMaterialBloc>(
    () => BookMaterialBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<GradeExamBloc>(
    () => GradeExamBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<DemoBookingBloc>(
    () => DemoBookingBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<NotificationBloc>(
    () => NotificationBloc(apiClient: sl<ApiClient>()),
  );

  sl.registerFactory<TrashBloc>(
    () => TrashBloc(apiClient: sl<ApiClient>()),
  );
}
