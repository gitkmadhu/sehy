import 'package:flutter/material.dart';

import '../../core/widgets/gradient_app_bar.dart';
import '../../data/faq_data.dart';
import '../profile/contact_us_screen.dart';

class _ChatMessage {
  final String text;
  final bool isUser;
  final bool offerSupport;

  const _ChatMessage({required this.text, required this.isUser, this.offerSupport = false});
}

/// A static, keyword-matched help bot (see lib/data/faq_data.dart) — no
/// external AI provider, so answers are limited to what's in that list.
/// Anything unmatched offers a "Contact Support" button that reuses the
/// existing ContactUsScreen/contact_us/create.php flow instead of building
/// a new channel.
class FaqBotScreen extends StatefulWidget {
  final String role;

  const FaqBotScreen({super.key, required this.role});

  @override
  State<FaqBotScreen> createState() => _FaqBotScreenState();
}

class _FaqBotScreenState extends State<FaqBotScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  late final List<FaqEntry> _pool = faqEntriesForRole(widget.role);
  final List<_ChatMessage> _messages = [];

  static const _fallback =
      "I don't have an answer for that one yet — tap below and our support team will get back to you.";

  @override
  void initState() {
    super.initState();
    _messages.add(const _ChatMessage(
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
    final match = matchFaq(text, _pool);
    setState(() {
      _messages.add(_ChatMessage(text: text.trim(), isUser: true));
      if (match != null) {
        _messages.add(_ChatMessage(text: match.answer, isUser: false, offerSupport: match.answer == _fallback));
      } else {
        _messages.add(const _ChatMessage(text: _fallback, isUser: false, offerSupport: true));
      }
    });
    _input.clear();
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
                        if (m.offerSupport) ...[
                          const SizedBox(height: 8),
                          TextButton(
                            style: TextButton.styleFrom(padding: EdgeInsets.zero),
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const ContactUsScreen()),
                            ),
                            child: const Text('Contact Support'),
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
