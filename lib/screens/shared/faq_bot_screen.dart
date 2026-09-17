import 'package:flutter/material.dart';

import '../../core/api/notification_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../data/faq_data.dart';

class _ChatMessage {
  final String text;
  final bool isUser;
  // Non-null on the fallback bubble only — the original unmatched question,
  // offered up as a "Message Admin" action. Mutable so a single instance can
  // track its own sending/sent state across rebuilds.
  final String? pendingQuestion;
  bool sending = false;
  bool sent = false;

  _ChatMessage({required this.text, required this.isUser, this.pendingQuestion});
}

/// A static, keyword-matched help bot (see lib/data/faq_data.dart) — no
/// external AI provider, so answers are limited to what's in that list.
/// Anything unmatched offers to forward the question to admin via
/// user_notifications/message_admin.php — the reply then shows up as a
/// normal notification on the caller's own home screen.
class FaqBotScreen extends StatefulWidget {
  final String role;

  const FaqBotScreen({super.key, required this.role});

  @override
  State<FaqBotScreen> createState() => _FaqBotScreenState();
}

class _FaqBotScreenState extends State<FaqBotScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _notificationService = NotificationService();
  late final List<FaqEntry> _pool = faqEntriesForRole(widget.role);
  final List<_ChatMessage> _messages = [];

  static const _fallback = faqFallbackAnswer;

  @override
  void initState() {
    super.initState();
    _messages.add(_ChatMessage(
      isUser: false,
      text: "Hi! I'm the GLML help bot. Ask me something, or tap one of the suggestions below.",
    ));
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  void _ask(String text) {
    if (text.trim().isEmpty) return;
    final question = text.trim();
    final match = matchFaq(question, _pool);
    setState(() {
      _messages.add(_ChatMessage(text: question, isUser: true));
      // The "contact support" FAQ entry shares the fallback's wording on
      // purpose (see faq_data.dart) — treat it the same way, offering to
      // forward the question straight to admin instead of just talking
      // about it.
      if (match != null && match.answer != _fallback) {
        _messages.add(_ChatMessage(text: match.answer, isUser: false));
      } else {
        _messages.add(_ChatMessage(text: _fallback, isUser: false, pendingQuestion: question));
      }
    });
    _input.clear();
    _scrollToEnd();
  }

  Future<void> _sendToAdmin(_ChatMessage message) async {
    setState(() => message.sending = true);
    try {
      await _notificationService.messageAdmin(message.pendingQuestion!);
      setState(() {
        message.sending = false;
        message.sent = true;
        _messages.add(_ChatMessage(
          isUser: false,
          text: "Your message has been sent — you'll get a reply right here in your notifications.",
        ));
      });
    } catch (_) {
      setState(() {
        message.sending = false;
        _messages.add(_ChatMessage(isUser: false, text: "Sorry, that didn't send — please try again."));
      });
    }
    _scrollToEnd();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: const GradientAppBar(pageName: 'Help'),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final m = _messages[index];
                return Align(
                  alignment: m.isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: m.isUser ? scheme.primary : scheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m.text,
                          style: TextStyle(color: m.isUser ? scheme.onPrimary : scheme.onSurface),
                        ),
                        if (m.pendingQuestion != null && !m.sent) ...[
                          const SizedBox(height: 8),
                          m.sending
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : TextButton(
                                  style: TextButton.styleFrom(padding: EdgeInsets.zero),
                                  onPressed: () => _sendToAdmin(m),
                                  child: const Text('Message Admin'),
                                ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: _pool
                  .map((e) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ActionChip(
                          label: Text(e.question),
                          onPressed: () => _ask(e.question),
                        ),
                      ))
                  .toList(),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      decoration: const InputDecoration(
                        hintText: 'Type a question...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(24))),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onSubmitted: _ask,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    icon: const Icon(Icons.send),
                    onPressed: () => _ask(_input.text),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
