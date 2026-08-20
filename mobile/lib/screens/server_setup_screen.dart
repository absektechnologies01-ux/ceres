import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/app_config.dart';
import '../providers/session_provider.dart';
import '../services/server_config.dart';

/// Shown on first launch (before ServerConfig.isConfigured) and reachable
/// from LoginScreen for re-pairing later. Scans the QR code served by the
/// backend's GET /pair endpoint, or accepts manual entry as a fallback, so
/// each phone points at whatever backend/ESP32 it was paired with instead
/// of a URL baked into the app at compile time.
class ServerSetupScreen extends StatefulWidget {
  const ServerSetupScreen({super.key, required this.onPaired});

  /// Called after the new server config has been validated and saved.
  final VoidCallback onPaired;

  @override
  State<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends State<ServerSetupScreen> {
  final MobileScannerController _scannerController = MobileScannerController();
  final _formKey = GlobalKey<FormState>();
  final _apiUrlCtrl = TextEditingController();
  final _esp32UrlCtrl = TextEditingController();

  bool _manualEntry = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _scannerController.dispose();
    _apiUrlCtrl.dispose();
    _esp32UrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_busy) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null) return;

    Map<String, dynamic> payload;
    try {
      payload = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      setState(() => _error = 'That QR code isn\'t a Ceres pairing code.');
      return;
    }

    final apiUrl = payload['api_base_url'] as String?;
    final esp32Url = payload['esp32_ws_url'] as String?;
    if (apiUrl == null || apiUrl.isEmpty) {
      setState(() => _error = 'That QR code isn\'t a Ceres pairing code.');
      return;
    }

    await _validateAndSave(apiUrl: apiUrl, esp32Url: esp32Url ?? '');
  }

  Future<void> _submitManual() async {
    if (!_formKey.currentState!.validate()) return;
    await _validateAndSave(
      apiUrl: _apiUrlCtrl.text.trim(),
      esp32Url: _esp32UrlCtrl.text.trim(),
    );
  }

  Future<void> _fail(String message) async {
    setState(() {
      _busy = false;
      _error = message;
    });
    if (!_manualEntry) await _scannerController.start();
  }

  /// Attempts to open the ESP32 WebSocket and immediately closes it — just
  /// proves something is actually listening at [url] before we save it,
  /// so a stale/wrong address (the ESP32's DHCP IP changes on every
  /// reconnect) is caught here instead of failing silently during a scan
  /// session.
  Future<bool> _checkEsp32(String url) async {
    WebSocketChannel? channel;
    try {
      channel = WebSocketChannel.connect(Uri.parse(url));
      await channel.ready.timeout(const Duration(seconds: 4));
      return true;
    } catch (_) {
      return false;
    } finally {
      await channel?.sink.close();
    }
  }

  Future<void> _validateAndSave({
    required String apiUrl,
    required String esp32Url,
  }) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    await _scannerController.stop();

    if (esp32Url.isEmpty) {
      await _fail('Missing ESP32 address. Check the pairing page.');
      return;
    }

    try {
      final response = await Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        sendTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      )).get(
        '$apiUrl/health',
      );
      if (response.statusCode != 200) {
        throw Exception('Unexpected response ${response.statusCode}');
      }
    } catch (_) {
      await _fail(
          'Could not reach $apiUrl. Check the address and network, then try again.');
      return;
    }

    if (!await _checkEsp32(esp32Url)) {
      await _fail(
          'Could not reach the ESP32 at $esp32Url. Check it\'s powered on and connected to WiFi.');
      return;
    }

    await ServerConfig.save(apiUrl: apiUrl, esp32Url: esp32Url);
    if (!mounted) return;
    context.read<SessionProvider>().api.updateBaseUrl(apiUrl);
    widget.onPaired();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Pair with Server'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(AppConfig.primaryColor),
        elevation: 0,
        actions: [
          TextButton(
            onPressed: _busy
                ? null
                : () => setState(() {
                      _manualEntry = !_manualEntry;
                      _error = null;
                    }),
            child: Text(_manualEntry ? 'Scan QR' : 'Enter manually'),
          ),
        ],
      ),
      body: SafeArea(
        child: _manualEntry ? _buildManualForm() : _buildScanner(),
      ),
    );
  }

  Widget _buildScanner() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Text(
            'Open the pairing page on your backend computer and scan the QR code shown there.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey, fontSize: 14),
          ),
        ),
        Expanded(
          child: Stack(
            fit: StackFit.expand,
            children: [
              MobileScanner(controller: _scannerController, onDetect: _onDetect),
              if (_busy)
                const ColoredBox(
                  color: Colors.black45,
                  child: Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                ),
            ],
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              _error!,
              style: const TextStyle(color: Colors.red, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ),
      ],
    );
  }

  Widget _buildManualForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Enter the backend and ESP32 addresses shown on the pairing page.',
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _apiUrlCtrl,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'Backend URL',
                hintText: 'http://192.168.1.42:8000',
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Required';
                if (!v.startsWith('http://') && !v.startsWith('https://')) {
                  return 'Must start with http:// or https://';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _esp32UrlCtrl,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'ESP32 WebSocket URL',
                hintText: 'ws://192.168.1.55:81',
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Required';
                if (!v.startsWith('ws://') && !v.startsWith('wss://')) {
                  return 'Must start with ws:// or wss://';
                }
                return null;
              },
            ),
            const SizedBox(height: 8),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _busy ? null : _submitManual,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(AppConfig.primaryColor),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _busy
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Test & Save',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
