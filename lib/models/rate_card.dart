/// A purchasable plan from `rate_cards` — see backend/endpoints/rate_cards/list.php.
/// For tier='category_subscription', [planKey] doubles as the RevenueCat/App
/// Service/Play Service product identifier (see backend/lib/revenuecat.php).
class RateCard {
  final int id;
  final String planKey;
  final String tier;
  final String label;
  final int amountPaise;
  final int durationDays;
  final bool isActive;

  const RateCard({
    required this.id,
    required this.planKey,
    required this.tier,
    required this.label,
    required this.amountPaise,
    required this.durationDays,
    required this.isActive,
  });

  factory RateCard.fromJson(Map<String, dynamic> json) => RateCard(
        id: int.parse(json['id'].toString()),
        planKey: json['plan_key'] as String,
        tier: json['tier'] as String,
        label: json['label'] as String,
        amountPaise: int.parse(json['amount'].toString()),
        durationDays: int.parse(json['duration_days'].toString()),
        isActive: json['is_active'].toString() == '1',
      );
}
