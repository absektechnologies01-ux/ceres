import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/session_provider.dart';
import 'session_screen.dart';

class SessionSummaryScreen extends StatelessWidget {
  const SessionSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>();
    final total = session.sheetCount;
    final flagged = session.flaggedCount;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Success icon
              const Icon(
                Icons.check_circle_outline_rounded,
                size: 80,
                color: Color(0xFF16A34A),
              ),
              const SizedBox(height: 20),
              const Text(
                'Session Complete',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 32),

              // Stats cards
              _StatCard(
                icon: Icons.description_outlined,
                label: 'Total Sheets Scanned',
                value: '$total',
                color: const Color(AppConfig.primaryColor),
              ),
              const SizedBox(height: 12),

              if (flagged > 0) ...[
                _StatCard(
                  icon: Icons.warning_amber_rounded,
                  label: 'Flagged Sheets',
                  value: '$flagged',
                  color: Colors.amber.shade700,
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline,
                          color: Colors.amber.shade800, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '$flagged sheet${flagged != 1 ? 's have' : ' has'} an unclear student ID. '
                          'Open the Ceres web portal to resolve them before teachers can start marking.',
                          style: TextStyle(
                              color: Colors.amber.shade800, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              const Spacer(),

              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: () {
                    context.read<SessionProvider>().clearSession();
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const SessionScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(AppConfig.primaryColor),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Done',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 13,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(value,
                    style: TextStyle(
                        color: color,
                        fontSize: 28,
                        fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
