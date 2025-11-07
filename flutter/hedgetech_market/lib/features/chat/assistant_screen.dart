import 'package:flutter/material.dart';

class AssistantScreen extends StatelessWidget {
  const AssistantScreen({super.key, this.initialProductId});

  final String? initialProductId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hedgetech Concierge', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(
                'Chat with our AI to curate products, book services, and close payments. Conversations sync with the web dashboard.',
                style: theme.textTheme.bodyMedium?.copyWith(color: const Color(0xFF475569)),
              ),
              if (initialProductId != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shopping_bag_outlined, color: Color(0xFF15803D)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'We prepped details for product $initialProductId. Ask the concierge to finalise the order.',
                          style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF166534)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: const [
              _AssistantBubble(
                sender: Sender.assistant,
                text:
                    "Hi! I'm Hedgetech's AI concierge. Tell me what you're looking for or share an order number and I'll get everything ready.",
              ),
              _AssistantBubble(
                sender: Sender.user,
                text: 'Show me premium logistics services available next week.',
              ),
              _AssistantBubble(
                sender: Sender.assistant,
                text:
                    'Absolutely. I can line up Amazing Freight and Rapid Dispatch. Once you choose, I will pencil in the slot and prep payment.',
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Type your request...',
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.attach_file_outlined),
                      onPressed: () {},
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: () {},
                style: FilledButton.styleFrom(shape: const CircleBorder(), padding: const EdgeInsets.all(14)),
                child: const Icon(Icons.send_rounded),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

enum Sender { assistant, user }

class _AssistantBubble extends StatelessWidget {
  const _AssistantBubble({required this.sender, required this.text});

  final Sender sender;
  final String text;

  @override
  Widget build(BuildContext context) {
    final alignment = sender == Sender.assistant ? Alignment.centerLeft : Alignment.centerRight;
    final bubbleColor = sender == Sender.assistant ? const Color(0xFFE0F2F1) : const Color(0xFF0F766E);
    final textColor = sender == Sender.assistant ? const Color(0xFF0F172A) : Colors.white;

    return Align(
      alignment: alignment,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: const BoxConstraints(maxWidth: 320),
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(text, style: TextStyle(color: textColor, height: 1.4)),
      ),
    );
  }
}
