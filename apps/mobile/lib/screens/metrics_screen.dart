import 'package:flutter/material.dart';

import '../widgets/reports_view.dart';

class MetricsScreen extends StatelessWidget {
  const MetricsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ReportsView(showTitle: false);
  }
}
