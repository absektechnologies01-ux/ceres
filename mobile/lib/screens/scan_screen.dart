import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/session_provider.dart';
import '../services/imagekit_service.dart';
import '../services/ocr_service.dart';
import 'session_summary_screen.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  bool _cameraReady = false;
  String? _cameraError;

  // Upload state
  XFile? _capturedFile;
  bool _uploading = false;
  bool? _lastFlagged;     // null = no recent result
  bool? _lastSuccess;

  final _imagekitService = ImageKitService();
  final _ocrService = OcrService();

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        setState(() => _cameraError = 'No cameras found on this device.');
        return;
      }
      _controller = CameraController(
        _cameras.first,
        ResolutionPreset.high,
        enableAudio: false,
      );
      await _controller!.initialize();
      if (mounted) setState(() => _cameraReady = true);
    } catch (e) {
      setState(() => _cameraError = 'Camera error: $e');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  // ── Capture ───────────────────────────────────────────────────────────────

  Future<void> _capture() async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    try {
      final file = await _controller!.takePicture();
      setState(() {
        _capturedFile = file;
        _lastFlagged = null;
        _lastSuccess = null;
      });
    } catch (e) {
      _showSnack('Failed to capture: $e', isError: true);
    }
  }

  // ── Confirm / upload ──────────────────────────────────────────────────────

  Future<void> _confirm() async {
    if (_capturedFile == null) return;

    setState(() {
      _uploading = true;
      _lastFlagged = null;
      _lastSuccess = null;
    });

    final sessionProvider = context.read<SessionProvider>();
    final fileName = 'sheet_${DateTime.now().millisecondsSinceEpoch}.jpg';

    try {
      // Step 1 — Upload image to ImageKit
      final imageUrl = await _imagekitService.uploadImage(_capturedFile!, fileName);

      // Step 2 — Call OCR (non-fatal if it fails)
      final ocrResult = await _ocrService.extractOcr(imageUrl);

      // Step 3 — Upload sheet to backend
      final sheet = await sessionProvider.uploadSheet(
        imageUrl: imageUrl,
        ocrText: ocrResult?.text,
        ocrMetadata: ocrResult != null
            ? Map<String, dynamic>.from(ocrResult.metadata)
            : null,
      );

      if (sheet == null) {
        // sessionProvider set error message
        setState(() {
          _uploading = false;
          _lastSuccess = false;
        });
        return;
      }

      setState(() {
        _uploading = false;
        _lastFlagged = sheet.flagged;
        _lastSuccess = true;
        _capturedFile = null; // ready for next sheet
      });
    } catch (e) {
      setState(() {
        _uploading = false;
        _lastSuccess = false;
      });
      _showSnack('Upload failed: $e', isError: true);
    }
  }

  void _retake() => setState(() {
        _capturedFile = null;
        _lastFlagged = null;
        _lastSuccess = null;
      });

  // ── End session ───────────────────────────────────────────────────────────

  Future<void> _endSession() async {
    final session = context.read<SessionProvider>();
    final flagged = session.flaggedCount;

    // Warn if there are flagged sheets
    if (flagged > 0) {
      final confirmed = await _showFlaggedWarning(flagged);
      if (!confirmed) return;
    }

    final ok = await session.endSession();
    if (ok && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const SessionSummaryScreen()),
      );
    }
  }

  Future<bool> _showFlaggedWarning(int count) async {
    return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Flagged Sheets'),
            content: Text(
              '$count sheet${count != 1 ? 's have' : ' has'} unclear student IDs. '
              'You can resolve them later in the web portal. End session anyway?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(AppConfig.primaryColor),
                    foregroundColor: Colors.white),
                child: const Text('End Session'),
              ),
            ],
          ),
        ) ??
        false;
  }

  void _showSnack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? Colors.red : Colors.green,
    ));
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>();

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('Scan Sheets',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          // Sheet counter chip
          Container(
            margin: const EdgeInsets.only(right: 8, top: 8, bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(AppConfig.primaryColor),
              borderRadius: BorderRadius.circular(20),
            ),
            alignment: Alignment.center,
            child: Text(
              '${session.sheetCount} scanned',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600),
            ),
          ),
          if (session.flaggedCount > 0)
            Container(
              margin: const EdgeInsets.only(right: 8, top: 8, bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.amber.shade700,
                borderRadius: BorderRadius.circular(20),
              ),
              alignment: Alignment.center,
              child: Text(
                '${session.flaggedCount} flagged',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Camera or preview area
          Expanded(
            child: _capturedFile != null
                ? _buildPreview()
                : _buildCamera(),
          ),

          // Status feedback banner
          if (_uploading)
            _StatusBanner(
              color: Colors.blue.shade700,
              icon: Icons.upload_rounded,
              text: 'Uploading sheet…',
            )
          else if (_lastSuccess == true && _lastFlagged == true)
            _StatusBanner(
              color: Colors.amber.shade700,
              icon: Icons.warning_amber_rounded,
              text: 'Sheet flagged — student ID unclear',
            )
          else if (_lastSuccess == true)
            _StatusBanner(
              color: Colors.green.shade700,
              icon: Icons.check_circle_outline,
              text: 'Sheet uploaded successfully',
            )
          else if (_lastSuccess == false)
            _StatusBanner(
              color: Colors.red.shade700,
              icon: Icons.error_outline,
              text: 'Upload failed — please try again',
            ),

          // Action bar
          Container(
            color: Colors.black,
            padding:
                const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // End session button
                OutlinedButton.icon(
                  icon: const Icon(Icons.stop_circle_outlined,
                      color: Colors.white),
                  label: const Text('End Session',
                      style: TextStyle(color: Colors.white)),
                  onPressed: _uploading ? null : _endSession,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white54),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                ),

                // Main action: capture or confirm/retake
                if (_capturedFile == null)
                  _CaptureButton(onPressed: _uploading ? null : _capture)
                else
                  Row(
                    children: [
                      OutlinedButton(
                        onPressed: _uploading ? null : _retake,
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white54),
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Retake'),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: _uploading ? null : _confirm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(AppConfig.primaryColor),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 12),
                        ),
                        child: _uploading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Use This'),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCamera() {
    if (_cameraError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(_cameraError!,
              style: const TextStyle(color: Colors.red, fontSize: 15),
              textAlign: TextAlign.center),
        ),
      );
    }
    if (!_cameraReady || _controller == null) {
      return const Center(
          child: CircularProgressIndicator(color: Colors.white));
    }
    return CameraPreview(_controller!);
  }

  Widget _buildPreview() {
    return Image.file(
      File(_capturedFile!.path),
      fit: BoxFit.contain,
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _CaptureButton extends StatelessWidget {
  final VoidCallback? onPressed;
  const _CaptureButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 4),
          color: onPressed == null ? Colors.grey : Colors.white,
        ),
        child: const Icon(Icons.camera_alt, color: Colors.black, size: 32),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String text;

  const _StatusBanner(
      {required this.color, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: color,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Text(text,
              style:
                  const TextStyle(color: Colors.white, fontSize: 14)),
        ],
      ),
    );
  }
}
