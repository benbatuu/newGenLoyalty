import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../theme.dart';

/// Full-screen Wallet pass barcode scanner. Pops with raw payload or null.
class PassQrScanScreen extends StatefulWidget {
  const PassQrScanScreen({super.key});

  @override
  State<PassQrScanScreen> createState() => _PassQrScanScreenState();
}

class _PassQrScanScreenState extends State<PassQrScanScreen> {
  late final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    autoStart: true,
  );

  StreamSubscription<Object?>? _subscription;
  bool _handled = false;
  String? _hint;

  @override
  void initState() {
    super.initState();
    // Stream is more reliable than onDetect alone on some iOS/Android builds.
    _subscription = _controller.barcodes.listen(
      _handleCapture,
      onError: (Object e) {
        if (!mounted) return;
        setState(() => _hint = 'Kamera hatası: $e');
      },
    );
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    _controller.dispose();
    super.dispose();
  }

  void _handleCapture(BarcodeCapture capture) {
    if (_handled || !mounted) return;
    for (final b in capture.barcodes) {
      final raw = (b.rawValue ?? b.displayValue)?.trim();
      if (raw == null || raw.isEmpty) continue;
      debugPrint(
        '[pass-scan] format=${b.format} value=$raw',
      );
      _handled = true;
      HapticFeedback.heavyImpact();
      setState(() => _hint = 'Okundu…');
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop(raw);
      });
      return;
    }
  }

  Future<void> _restart() async {
    setState(() {
      _handled = false;
      _hint = 'Yeniden deneniyor…';
    });
    try {
      await _controller.stop();
      await _controller.start();
      if (mounted) setState(() => _hint = null);
    } catch (e) {
      if (mounted) setState(() => _hint = 'Kamera açılamadı: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Pass QR okut'),
        actions: [
          IconButton(
            tooltip: 'Yenile',
            onPressed: _restart,
            icon: const Icon(Icons.refresh_rounded),
          ),
          IconButton(
            tooltip: 'Flaş',
            onPressed: () => _controller.toggleTorch(),
            icon: const Icon(Icons.flash_on_rounded),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _handleCapture,
            errorBuilder: (context, error) {
              return _CameraError(
                error: error,
                onRetry: _restart,
              );
            },
          ),
          IgnorePointer(
            child: CustomPaint(
              painter: _ScanFramePainter(),
              child: const SizedBox.expand(),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_hint != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: kAccent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _hint!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                    Text(
                      'Wallet kartındaki barkodu yeşil çerçeveye getirin. Telefon ekranını parlak tutun; yansımayı azaltın.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.92),
                        height: 1.4,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CameraError extends StatelessWidget {
  const _CameraError({required this.error, required this.onRetry});

  final MobileScannerException error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final msg = switch (error.errorCode) {
      MobileScannerErrorCode.permissionDenied =>
        'Kamera izni kapalı. Ayarlar → Dokun & Kazan → Kamera’yı açın.',
      MobileScannerErrorCode.unsupported =>
        'Bu cihazda barkod tarama desteklenmiyor.',
      _ => 'Kamera açılamadı (${error.errorCode.name}).',
    };
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.videocam_off_rounded, color: Colors.white, size: 48),
              const SizedBox(height: 16),
              Text(
                msg,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, height: 1.4),
              ),
              const SizedBox(height: 18),
              FilledButton(onPressed: onRetry, child: const Text('Tekrar dene')),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScanFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final overlay = Paint()..color = Colors.black.withValues(alpha: 0.5);
    final holeSize = size.shortestSide * 0.72;
    final left = (size.width - holeSize) / 2;
    final top = (size.height - holeSize) / 2 - 24;
    final hole = RRect.fromRectAndRadius(
      Rect.fromLTWH(left, top, holeSize, holeSize),
      const Radius.circular(20),
    );

    final path = Path()
      ..addRect(Offset.zero & size)
      ..addRRect(hole)
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(path, overlay);

    final border = Paint()
      ..color = kAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawRRect(hole, border);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
