/// Builds a deterministic, license-free avatar URL from a name/seed using
/// DiceBear. Used as a fallback avatar for fans (and anywhere a person has no
/// uploaded photo), so the UI shows a friendly illustrated avatar instead of a
/// blank icon. Never renders a real person's face.
class AvatarUrl {
  const AvatarUrl._();

  /// Returns a PNG avatar URL for [seed] (e.g. a display name or email).
  /// Falls back to a neutral seed when [seed] is null/blank.
  static String forSeed(String? seed, {String background = '071a3a'}) {
    final s = (seed == null || seed.trim().isEmpty)
        ? 'JSO Supporter'
        : seed.trim();
    final encoded = Uri.encodeQueryComponent(s);
    return 'https://api.dicebear.com/7.x/avataaars/png'
        '?seed=$encoded&backgroundColor=$background&size=160';
  }
}
