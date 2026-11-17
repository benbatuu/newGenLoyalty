import 'package:flutter/material.dart';

import '../../models/pass_barcode.dart';
import 'counter_controller.dart';

class CounterScanHandler {
  CounterScanHandler._();

  static Future<void> handleScanResult({
    required BuildContext context,
    required CounterController controller,
    required String code,
  }) async {
    final parsed = tryParsePassBarcode(code);
    if (parsed == null) {
      controller.toast('Geçersiz QR kodu. Wallet kartındaki kodu okutun.');
      return;
    }

    if (!parsed.isProgramSpecific) {
      await controller.handleStampScan(code);
      return;
    }

    final program = controller.programById(parsed.programId!);
    if (program == null) {
      controller.toast('Program bulunamadı. Sayfayı yenileyip tekrar deneyin.');
      return;
    }

    controller.focusProgram(program);

    switch (program.type) {
      case 'CASHBACK_CARD':
        await controller.handleCashbackFromScan(context, code, parsed);
      case 'DISCOUNT_CARD':
        await controller.handleDiscountFromScan(code, program, parsed);
      case 'STAMP_CARD':
      case 'MULTI_STAMP':
        await controller.handleStampScan(code);
      default:
        await controller.selectCustomerFromQr(parsed.customerId);
        controller.reloadProgramStates();
        controller.toast(controller.programScanHint(program));
    }
  }
}
