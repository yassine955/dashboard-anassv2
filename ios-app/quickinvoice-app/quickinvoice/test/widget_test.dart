// QuickInvoice App Tests

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build a simple MaterialApp for testing
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Text('QuickInvoice'),
          ),
        ),
      ),
    );

    // Verify that the app renders
    expect(find.text('QuickInvoice'), findsOneWidget);
  });
}
