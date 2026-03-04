import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/user.dart';
import '../providers/auth_provider.dart';
import '../providers/session_provider.dart';
import 'scan_screen.dart';
import 'login_screen.dart';

class SessionScreen extends StatefulWidget {
  const SessionScreen({super.key});

  @override
  State<SessionScreen> createState() => _SessionScreenState();
}

class _SessionScreenState extends State<SessionScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SessionProvider>().loadClassesAndCourses();
    });
  }

  Future<void> _startSession() async {
    final sessionProvider = context.read<SessionProvider>();
    final ok = await sessionProvider.startSession();
    if (ok && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const ScanScreen()),
      );
    }
  }

  Future<void> _logout() async {
    await context.read<AuthProvider>().logout();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Ceres Scanner',
            style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white)),
        backgroundColor: const Color(AppConfig.primaryColor),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            tooltip: 'Sign out',
            onPressed: _logout,
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Start a New Session',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF111827)),
              ),
              const SizedBox(height: 6),
              const Text(
                'Select the class and course you are scanning for.',
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
              const SizedBox(height: 24),

              if (session.loading)
                const Center(
                    child: CircularProgressIndicator(
                        color: Color(AppConfig.primaryColor)))
              else if (session.error != null) ...[
                _ErrorCard(
                  message: session.error!,
                  onRetry: () =>
                      context.read<SessionProvider>().loadClassesAndCourses(),
                ),
              ] else ...[
                // Class dropdown
                _Dropdown<ClassItem>(
                  label: 'Class',
                  hint: 'Select class',
                  items: session.classes,
                  value: session.selectedClass,
                  onChanged: context.read<SessionProvider>().selectClass,
                  itemLabel: (c) => '${c.name} (${c.academicYear})',
                ),
                const SizedBox(height: 16),

                // Course dropdown
                _Dropdown<CourseItem>(
                  label: 'Course',
                  hint: 'Select course',
                  items: session.courses,
                  value: session.selectedCourse,
                  onChanged: context.read<SessionProvider>().selectCourse,
                  itemLabel: (c) => '${c.code} — ${c.name}',
                ),

                const Spacer(),

                // Start session button
                SizedBox(
                  height: 52,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.play_circle_outline),
                    label: const Text('Start Session',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                    onPressed: (session.selectedClass != null &&
                            session.selectedCourse != null &&
                            !session.loading)
                        ? _startSession
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(AppConfig.primaryColor),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey.shade300,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Reusable dropdown ─────────────────────────────────────────────────────────

class _Dropdown<T> extends StatelessWidget {
  final String label;
  final String hint;
  final List<T> items;
  final T? value;
  final ValueChanged<T?> onChanged;
  final String Function(T) itemLabel;

  const _Dropdown({
    required this.label,
    required this.hint,
    required this.items,
    required this.value,
    required this.onChanged,
    required this.itemLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF374151))),
        const SizedBox(height: 6),
        DropdownButtonFormField<T>(
          // ignore: deprecated_member_use
          value: value,
          hint: Text(hint, style: const TextStyle(color: Colors.grey)),
          isExpanded: true,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            focusedBorder: OutlineInputBorder(
              borderSide: BorderSide(color: Color(AppConfig.primaryColor), width: 2),
            ),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
          items: items
              .map((item) => DropdownMenuItem<T>(
                    value: item,
                    child: Text(itemLabel(item),
                        overflow: TextOverflow.ellipsis),
                  ))
              .toList(),
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorCard({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        children: [
          Text(message,
              style: const TextStyle(color: Colors.red, fontSize: 14)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
