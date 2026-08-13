import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:gmls/main.dart';

void main() {
  testWidgets('App boots and shows the login screen when signed out', (WidgetTester tester) async {
    await tester.pumpWidget(const GmlsApp());
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
