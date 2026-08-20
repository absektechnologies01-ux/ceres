import 'dart:async';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'server_config.dart';

enum HardwareEvent { paperDetected }

/// Manages the WebSocket connection to the ESP32 conveyor controller.
///
/// ScanScreen owns this object's lifecycle — create in initState, dispose in
/// dispose. The service reconnects automatically using capped exponential
/// backoff (1 s → 2 s → 4 s → 8 s → 16 s) if the connection drops.
class HardwareService {
  Stream<HardwareEvent> get events => _eventController.stream;
  final _eventController = StreamController<HardwareEvent>.broadcast();

  WebSocketChannel? _channel;
  StreamSubscription? _channelSub;
  bool _disposed = false;
  int _reconnectAttempt = 0;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  void connect() {
    _reconnectAttempt = 0;
    _tryConnect();
  }

  void dispose() {
    _disposed = true;
    _channelSub?.cancel();
    _channel?.sink.close();
    _eventController.close();
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  void _tryConnect() {
    if (_disposed) return;
    try {
      _channel = WebSocketChannel.connect(Uri.parse(ServerConfig.esp32WsUrl));
      _channelSub = _channel!.stream.listen(
        _onMessage,
        onError: (_) => _scheduleReconnect(),
        onDone: _scheduleReconnect,
      );
      _reconnectAttempt = 0;
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _channelSub?.cancel();
    _channel = null;
    // Backoff: 1 s, 2 s, 4 s, 8 s, 16 s (capped)
    final delaySecs = (1 << _reconnectAttempt).clamp(1, 16);
    _reconnectAttempt = (_reconnectAttempt + 1).clamp(0, 4);
    Future.delayed(Duration(seconds: delaySecs), _tryConnect);
  }

  void _onMessage(dynamic raw) {
    if (raw.toString().trim() == 'PAPER_DETECTED') {
      _eventController.add(HardwareEvent.paperDetected);
    }
    // Unknown messages are silently ignored — forward-compatible with future ESP32 firmware.
  }

  // ── Outbound signals ────────────────────────────────────────────────────────

  /// Upload succeeded — tell ESP32 to resume the motor.
  void sendScanComplete() => _send('SCAN_COMPLETE');

  /// Upload succeeded but sheet was flagged — tell ESP32 to beep and continue.
  void sendScanFlagged() => _send('SCAN_FLAGGED');

  /// Upload failed — tell ESP32 to activate buzzer and stop.
  void sendScanFailed() => _send('SCAN_FAILED');

  /// Operator pressed Continue after a failed scan — tell ESP32 to resume.
  void sendResume() => _send('RESUME');

  void _send(String msg) {
    try {
      _channel?.sink.add(msg);
    } catch (_) {
      // Channel is dead; reconnect in progress. The caller handles this state
      // (e.g. operator taps Continue once reconnected).
    }
  }
}
