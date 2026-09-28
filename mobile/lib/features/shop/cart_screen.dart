import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/shop_order.dart';
import '../../data/repositories/shop_repository.dart';
import '../../shared/format.dart';
import '../../shared/snackbars.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/remote_image.dart';
import '../auth/auth_controller.dart';
import '../auth/login_prompt.dart';
import '../auth/login_screen.dart' show validateEmail;
import 'cart_controller.dart';
import 'order_confirmation_screen.dart';
import 'shop_screen.dart';
import 'shop_widgets.dart';

/// "Mon panier": the lines of the app-wide [CartController] (quantity stepper,
/// "Retirer"), the display total, an optional note for the club and the
/// "Commander" button.
///
/// Ordering needs a fan session: anonymous visitors get the login prompt.
/// A signed-in fan confirms their contact details (prefilled from the
/// account, editable, optional) in a bottom sheet, then the order is posted
/// to `POST /api/shop/orders`. The server recomputes every price and creates
/// a `Pending` order that the club confirms later (payment and pick-up at the
/// club). On success the cart is emptied and the screen switches to the
/// [OrderConfirmationScreen]; on failure the cart is kept and the translated
/// error is shown. The button is disabled while the order is in flight so a
/// double tap cannot place two orders.
class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  static const int _noteMaxLength = 500;

  final _noteController = TextEditingController();

  /// True while the order request is in flight (disables the whole cart).
  bool _submitting = false;

  /// True while the checkout sheet is open, so a double tap cannot open two.
  bool _confirming = false;

  /// The order placed from this screen, once the server accepted it.
  ShopOrder? _placed;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _checkout() async {
    if (_submitting || _confirming) return;
    final auth = context.read<AuthController>();
    final token = auth.accessToken;
    if (token == null) {
      showLoginPrompt(context, message: 'Connectez-vous pour passer commande.');
      return;
    }
    final cart = context.read<CartController>();
    if (cart.isEmpty) return;

    _confirming = true;
    final details = await showModalBottomSheet<_CheckoutDetails>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: JsoColors.navy2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(JsoRadius.hero),
        ),
      ),
      builder: (_) => _CheckoutSheet(
        initialName: auth.user?.displayName,
        initialEmail: auth.user?.email,
        itemCount: cart.itemCount,
        total: cart.total,
        currency: cart.currency,
      ),
    );
    _confirming = false;
    if (details == null || !mounted) return;
    await _placeOrder(token: token, details: details);
  }

  Future<void> _placeOrder({
    required String token,
    required _CheckoutDetails details,
  }) async {
    final cart = context.read<CartController>();
    final repository = context.read<ShopRepository>();
    if (cart.isEmpty) return;
    setState(() => _submitting = true);
    try {
      final order = await repository.createOrder(
        token: token,
        lines: cart.lines,
        customerName: details.name,
        customerEmail: details.email,
        note: _noteController.text,
      );
      if (mounted) {
        setState(() {
          _placed = order;
          _submitting = false;
        });
      }
      // The order now exists server-side: always empty the cart, even if the
      // screen went away meanwhile, so it cannot be ordered twice.
      cart.clear();
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showJsoMessage(context, describeApiError(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final placed = _placed;
    if (placed != null) {
      return OrderConfirmationScreen(order: placed);
    }

    final cart = context.watch<CartController>();
    final editable = !_submitting;
    return PopScope(
      canPop: !_submitting,
      child: Scaffold(
        appBar: AppBar(title: const Text('Mon panier')),
        body: cart.isEmpty
            ? const _EmptyCart()
            : Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(JsoSpacing.md),
                      children: [
                        for (final line in cart.lines)
                          _CartLineCard(
                            line: line,
                            onDecrement: editable && line.quantity > 1
                                ? () => cart.decrement(line.productId)
                                : null,
                            onIncrement:
                                editable &&
                                    line.quantity <
                                        CartController.maxQuantityPerLine
                                ? () => cart.increment(line.productId)
                                : null,
                            onRemove: editable
                                ? () => cart.remove(line.productId)
                                : null,
                          ),
                        const SizedBox(height: JsoSpacing.md),
                        TextField(
                          controller: _noteController,
                          enabled: editable,
                          maxLength: _noteMaxLength,
                          minLines: 2,
                          maxLines: 4,
                          textCapitalization: TextCapitalization.sentences,
                          decoration: const InputDecoration(
                            labelText: 'Note pour le club (facultatif)',
                            hintText: 'Taille, précision pour le retrait…',
                            alignLabelWithHint: true,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _CheckoutBar(
                    itemCount: cart.itemCount,
                    total: cart.total,
                    currency: cart.currency,
                    submitting: _submitting,
                    onCheckout: _checkout,
                  ),
                ],
              ),
      ),
    );
  }
}

String _articleCount(int count) => count == 1 ? '1 article' : '$count articles';

class _EmptyCart extends StatelessWidget {
  const _EmptyCart();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const EmptyView(
              message: 'Votre panier est vide.',
              icon: Icons.shopping_bag_outlined,
            ),
            ElevatedButton.icon(
              onPressed: () => ShopScreen.backTo(Navigator.of(context)),
              icon: const Icon(Icons.storefront_outlined),
              label: const Text('Retour à la boutique'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartLineCard extends StatelessWidget {
  const _CartLineCard({
    required this.line,
    required this.onDecrement,
    required this.onIncrement,
    required this.onRemove,
  });

  final CartLine line;
  final VoidCallback? onDecrement;
  final VoidCallback? onIncrement;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(JsoRadius.control),
                  child: RemoteImage(
                    url: line.imageUrl,
                    width: 64,
                    height: 64,
                    placeholderIcon: Icons.checkroom_outlined,
                  ),
                ),
                const SizedBox(width: JsoSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        line.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: JsoColors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: JsoSpacing.xs),
                      Text(
                        '${JsoFormat.money(line.unitPrice, line.currency)} '
                        '/ unité',
                        style: const TextStyle(
                          color: JsoColors.muted,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Retirer',
                  onPressed: onRemove,
                  icon: const Icon(Icons.delete_outline),
                  color: JsoColors.muted,
                ),
              ],
            ),
            const SizedBox(height: JsoSpacing.sm),
            Row(
              children: [
                QuantityStepper(
                  quantity: line.quantity,
                  onDecrement: onDecrement,
                  onIncrement: onIncrement,
                ),
                const Spacer(),
                Text(
                  JsoFormat.money(line.lineTotal, line.currency),
                  style: const TextStyle(
                    color: JsoColors.gold,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Sticky footer with the total and the "Commander" button.
class _CheckoutBar extends StatelessWidget {
  const _CheckoutBar({
    required this.itemCount,
    required this.total,
    required this.currency,
    required this.submitting,
    required this.onCheckout,
  });

  final int itemCount;
  final double total;
  final String currency;
  final bool submitting;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: JsoColors.navy,
        border: Border(top: BorderSide(color: JsoColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(JsoSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Total (${_articleCount(itemCount)})',
                      style: const TextStyle(
                        color: JsoColors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Text(
                    JsoFormat.money(total, currency),
                    style: const TextStyle(
                      color: JsoColors.gold,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: JsoSpacing.md),
              ElevatedButton(
                onPressed: submitting ? null : onCheckout,
                child: submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: JsoColors.gold,
                        ),
                      )
                    : const Text('Commander'),
              ),
              const SizedBox(height: JsoSpacing.sm),
              const Text(
                'Paiement et retrait au club après confirmation de la '
                'commande.',
                textAlign: TextAlign.center,
                style: TextStyle(color: JsoColors.muted2, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Contact details confirmed in the checkout sheet (blank = not sent).
class _CheckoutDetails {
  const _CheckoutDetails({required this.name, required this.email});

  final String name;
  final String email;
}

/// Checkout confirmation: contact details prefilled from the fan account
/// (editable, optional) and a reminder that payment happens at the club.
class _CheckoutSheet extends StatefulWidget {
  const _CheckoutSheet({
    required this.initialName,
    required this.initialEmail,
    required this.itemCount,
    required this.total,
    required this.currency,
  });

  final String? initialName;
  final String? initialEmail;
  final int itemCount;
  final double total;
  final String currency;

  @override
  State<_CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<_CheckoutSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name = TextEditingController(
    text: widget.initialName ?? '',
  );
  late final TextEditingController _email = TextEditingController(
    text: widget.initialEmail ?? '',
  );

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  void _confirm() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.of(
      context,
    ).pop(_CheckoutDetails(name: _name.text.trim(), email: _email.text.trim()));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Vos coordonnées',
                style: TextStyle(
                  color: JsoColors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: JsoSpacing.xs),
              Text(
                '${_articleCount(widget.itemCount)} · '
                '${JsoFormat.money(widget.total, widget.currency)}',
                style: const TextStyle(color: JsoColors.muted),
              ),
              const SizedBox(height: JsoSpacing.lg),
              TextFormField(
                controller: _name,
                maxLength: 120,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.name],
                decoration: const InputDecoration(
                  labelText: 'Nom (facultatif)',
                  counterText: '',
                ),
              ),
              const SizedBox(height: JsoSpacing.md),
              TextFormField(
                controller: _email,
                maxLength: 254,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(
                  labelText: 'E-mail de contact (facultatif)',
                  counterText: '',
                ),
                validator: (value) => (value == null || value.trim().isEmpty)
                    ? null
                    : validateEmail(value),
                onFieldSubmitted: (_) => _confirm(),
              ),
              const SizedBox(height: JsoSpacing.md),
              const ShopInfoNote(
                message:
                    'Aucun paiement dans l\'application : le club confirme '
                    'votre commande, puis le paiement et le retrait se font '
                    'au club.',
              ),
              const SizedBox(height: JsoSpacing.lg),
              ElevatedButton(
                onPressed: _confirm,
                child: const Text('Confirmer la commande'),
              ),
              const SizedBox(height: JsoSpacing.sm),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Annuler'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
