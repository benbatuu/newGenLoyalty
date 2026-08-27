import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../theme.dart';

/// Full-screen Wallet pass QR scanner. Pops with raw barcode string or null.
class PassQrScanScreen extends StatefulWidget {
  const PassQrScanScreen({super.key});

  @override
  State<PassQrScanScreen> createState() => _PassQrScanScreenState();
}

class _PassQrScanScreenState extends State<PassQrScanScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    formats: const [BarcodeFormat.qrCode],
  );
  bool _handled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final raw = capture.barcodes
        .map((b) => b.rawValue?.trim())
        .whereType<String>()
        .firstWhere((v) => v.isNotEmpty, orElse: () => '');
    if (raw.isEmpty) return;
    _handled = true;
    HapticFeedback.mediumImpact();
    Navigator.of(context).pop(raw);
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
            onDetect: _onDetect,
          ),
          CustomPaint(painter: _ScanFramePainter()),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
                child: Text(
                  'Müşterinin Apple / Google Wallet kartındaki QR kodu çerçeveye getirin. Damga otomatik eklenir.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    height: 1.4,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final overlay = Paint()..color = Colors.black.withValues(alpha: 0.45);
    final holeSize = size.shortestSide * 0.68;
    final left = (size.width - holeSize) / 2;
    final top = (size.height - holeSize) / 2 - 24;
    final hole = RRect.fromRectAndRadius(
      Rect.fromLTWH(left, top, holeSize, holeSize),
      const Radius.circular(20),
    );

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
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
