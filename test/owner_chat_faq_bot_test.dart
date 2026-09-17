import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:gmls/models/user_notification.dart';
import 'package:gmls/providers/auth_provider.dart';
import 'package:gmls/providers/notifications_provider.dart';
import 'package:gmls/screens/shared/faq_bot_screen.dart';
import 'package:gmls/screens/store_owner/store_owner_home_screen.dart';

// flutter_test's TestWidgetsFlutterBinding fakes HttpClient for the whole
// suite (every real request comes back 400), so these tests exercise
// StoreOwnerHomeScreen/FaqBotScreen's own rendering and matching logic
// directly rather than the network round-trip — NotificationsProvider.load()
// and markRead() against the real backend are already covered by the curl
// checks against local XAMPP earlier this session, and markRead() here is
// the same unmodified mechanism MallManagerHomeScreen already relies on.

Widget _wrap(Widget child) => MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
      ],
      child: MaterialApp(home: child),
    );

void main() {
  testWidgets('StoreOwnerHomeScreen renders unread/read notifications correctly',
      (tester) async {
    await tester.pumpWidget(_wrap(const StoreOwnerHomeScreen()));

    final provider = tester
        .element(find.byType(StoreOwnerHomeScreen))
        .read<NotificationsProvider>();
    provider.items = [
      UserNotification(
        id: 5,
        type: 'admin_message',
        title: 'Message from GLML Admin',
        body: 'Please re-upload your banner image.',
        isRead: false,
        createdAt: DateTime(2026, 9, 17, 20, 0),
      ),
    ];
    provider.notifyListeners();
    await tester.pump();

    expect(find.text('Message from GLML Admin'), findsOneWidget);
    expect(find.text('Please re-upload your banner image.'), findsOneWidget);

    final titleWidget = tester.widget<Text>(find.text('Message from GLML Admin'));
    expect(titleWidget.style?.fontWeight, FontWeight.bold, reason: 'unread should be bold');
  });

  testWidgets('StoreOwnerHomeScreen Help icon opens the FAQ bot', (tester) async {
    await tester.pumpWidget(_wrap(const StoreOwnerHomeScreen()));

    await tester.tap(find.byIcon(Icons.help_outline));
    await tester.pumpAndSettle();

    expect(find.byType(FaqBotScreen), findsOneWidget);
    expect(find.textContaining("Hi! I'm the GLML help bot"), findsOneWidget);
    expect(find.text('How do I manage my store, offers, or banners?'), findsOneWidget);
    expect(find.text('How do I approve a banner request?'), findsNothing,
        reason: 'mall_manager-only FAQ should not appear for store_owner');
  });

  testWidgets('FAQ bot answers a matched quick-reply question', (tester) async {
    await tester.pumpWidget(_wrap(const FaqBotScreen(role: 'store_owner')));

    await tester.tap(find.text('How do I manage my store, offers, or banners?'));
    await tester.pump();

    expect(
      find.textContaining('My Store dashboard on the GLML website'),
      findsOneWidget,
    );
  });

  testWidgets('FAQ bot falls back to Contact Support for an unmatched question',
      (tester) async {
    await tester.pumpWidget(_wrap(const FaqBotScreen(role: 'store_owner')));

    await tester.enterText(find.byType(TextField), 'what is the weather today');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(find.textContaining("I don't have an answer for that one yet"), findsOneWidget);
    expect(find.text('Contact Support'), findsOneWidget);
  });

  testWidgets('FAQ bot free-text matching works via keywords, not just exact chip text',
      (tester) async {
    await tester.pumpWidget(_wrap(const FaqBotScreen(role: 'mall_manager')));

    await tester.enterText(find.byType(TextField), 'how do I renew my subscription plan?');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(find.textContaining('subscription icon'), findsOneWidget);
  });
}
