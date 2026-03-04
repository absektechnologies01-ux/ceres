import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_config.dart';
import 'providers/auth_provider.dart';
import 'providers/session_provider.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/session_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CeresApp());
}

class CeresApp extends StatelessWidget {
  const CeresApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(),
        ),
        ChangeNotifierProxyProvider<AuthProvider, SessionProvider>(
          create: (ctx) {
            final auth = ctx.read<AuthProvider>();
            final api = ApiService(
              getAccessToken: () => auth.getAccessToken(),
              getRefreshToken: () => auth.getRefreshToken(),
              doRefresh: (token) => auth.doRefresh(token),
              onTokenRefreshed: (token) => auth.onTokenRefreshed(token),
              onLogout: () => auth.logout(),
            );
            return SessionProvider(api);
          },
          update: (ctx, auth, prev) => prev!,
        ),
      ],
      child: MaterialApp(
        title: 'Ceres Scanner',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(AppConfig.primaryColor),
          ),
          useMaterial3: true,
        ),
        home: const _AppRoot(),
      ),
    );
  }
}

class _AppRoot extends StatefulWidget {
  const _AppRoot();

  @override
  State<_AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<_AppRoot> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await context.read<AuthProvider>().init();
    if (mounted) setState(() => _initialized = true);
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: CircularProgressIndicator(
            color: Color(AppConfig.primaryColor),
          ),
        ),
      );
    }

    final auth = context.watch<AuthProvider>();
    return auth.isLoggedIn ? const SessionScreen() : const LoginScreen();
  }
}
