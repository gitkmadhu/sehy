/// One entry in the static FAQ bot's knowledge base — see FaqBotScreen.
/// Matching is a simple keyword-overlap score, not a real LLM, so keep
/// [keywords] generous (synonyms, common misspellings a staff member might
/// actually type).
class FaqEntry {
  final String question;
  final String answer;
  final List<String> keywords;
  final List<String> roles;

  const FaqEntry({
    required this.question,
    required this.answer,
    required this.keywords,
    required this.roles,
  });
}

const List<FaqEntry> faqEntries = [
  FaqEntry(
    question: 'How do I approve a banner request?',
    answer:
        "Open the request from your list and tap it — you'll see the submitted image, and you can approve or reject it right there.",
    keywords: ['approve', 'reject', 'banner', 'request', 'publish', 'review'],
    roles: ['category_manager'],
  ),
  FaqEntry(
    question: "What does 'pending' mean on a banner?",
    answer:
        "Pending means a staff member submitted a banner and it's waiting for your review before it goes live on the app.",
    keywords: ['pending', 'status', 'waiting', 'awaiting'],
    roles: ['category_manager'],
  ),
  FaqEntry(
    question: 'How do I manage my category subscription?',
    answer:
        'Tap the subscription icon at the top right of this screen to view your plan, renewal date, and payment options.',
    keywords: ['subscription', 'renew', 'plan', 'domain', 'expire', 'payment', 'billing'],
    roles: ['category_manager'],
  ),
  FaqEntry(
    question: 'How do I manage my service, offers, or banners?',
    answer:
        'Service details, offers, products, and banner uploads are all managed from the My Service dashboard on the Sehy website — log in there with the same account.',
    keywords: ['manage', 'offer', 'banner', 'ad', 'product', 'service', 'add', 'upload', 'edit'],
    roles: ['service_owner'],
  ),
  FaqEntry(
    question: 'What are these messages/notifications?',
    answer:
        'These are updates sent to you directly by the Sehy team — for example, if something needs your attention like a banner upload issue.',
    keywords: ['message', 'notification', 'admin', 'alert', 'what is this'],
    roles: ['category_manager', 'service_owner'],
  ),
  FaqEntry(
    question: "Why haven't I received a notification?",
    answer:
        'Notifications refresh when you open or resume the app — pull down on the list to refresh manually if you think something is missing.',
    keywords: ['missing', 'notify', "haven't received", 'not getting', 'refresh'],
    roles: ['category_manager', 'service_owner'],
  ),
  FaqEntry(
    question: 'How do I log out?',
    answer: 'Tap the logout icon in the top right corner of this screen.',
    keywords: ['log out', 'logout', 'sign out', 'signout'],
    roles: ['category_manager', 'service_owner'],
  ),
  FaqEntry(
    question: 'How do I contact Sehy support?',
    answer: faqFallbackAnswer,
    keywords: ['support', 'contact', 'help', 'complain', 'issue', 'problem', 'talk to someone', 'human'],
    roles: ['category_manager', 'service_owner'],
  ),
];

/// Shared with FaqBotScreen's true no-match fallback, and with the
/// "contact support" entry above — both cases offer the same "Message
/// Admin" action, so they share the exact same wording (compared by
/// equality in FaqBotScreen._ask) rather than duplicating the string.
const faqFallbackAnswer =
    "I don't have an answer for that one yet — want me to pass your question along to our support team?";

List<FaqEntry> faqEntriesForRole(String role) =>
    faqEntries.where((e) => e.roles.contains(role)).toList();

/// Best keyword-overlap match for [query] among [pool], or null if nothing
/// scores above zero.
FaqEntry? matchFaq(String query, List<FaqEntry> pool) {
  final needle = query.toLowerCase();
  FaqEntry? best;
  var bestScore = 0;
  for (final entry in pool) {
    final score = entry.keywords.where((k) => needle.contains(k.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}
