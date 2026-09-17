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

  testWidgets('Swiping a notification away keeps it in place when the delete fails',
      (tester) async {
    // Same fake-network caveat as above — NotificationsProvider.delete()
    // only removes the item locally once the server confirms, so a 400
    // (the best flutter_test can do here) should leave it right where it
    // was instead of losing the swiped item from the list.
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
        isRead: true,
        createdAt: DateTime(2026, 9, 17, 20, 0),
      ),
    ];
    provider.notifyListeners();
    await tester.pump();

    await tester.drag(find.text('Message from GLML Admin'), const Offset(-500, 0));
    await tester.pumpAndSettle();

    expect(provider.items, hasLength(1), reason: 'failed delete should not remove the item');
    expect(find.text('Message from GLML Admin'), findsOneWidget);
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

  testWidgets('FAQ bot offers to message admin for an unmatched question',
      (tester) async {
    await tester.pumpWidget(_wrap(const FaqBotScreen(role: 'store_owner')));

    await tester.enterText(find.byType(TextField), 'what is the weather today');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(find.textContaining("I don't have an answer for that one yet"), findsOneWidget);
    expect(find.text('Message Admin'), findsOneWidget);
  });

  testWidgets("FAQ bot's contact-support entry also offers to message admin",
      (tester) async {
    await tester.pumpWidget(_wrap(const FaqBotScreen(role: 'store_owner')));

    // The chip row scrolls horizontally, so bring it into view before
    // tapping — otherwise the tap coordinate can land outside the test
    // viewport for later chips.
    await tester.ensureVisible(find.text('How do I contact GLML support?'));
    await tester.tap(find.text('How do I contact GLML support?'));
    await tester.pump();

    expect(find.text('Message Admin'), findsOneWidget);
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
