import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme_config.dart';

/// Reusable avatar widget with initials fallback and network image support
class AvatarWidget extends StatelessWidget {
  final String? imageUrl;
  final String initials;
  final double size;
  final Color? backgroundColor;
  final Color? textColor;

  const AvatarWidget({
    super.key,
    this.imageUrl,
    required this.initials,
    this.size = 40,
    this.backgroundColor,
    this.textColor,
  });

  /// Generate color from string hash for variety
  static Color colorFromString(String text) {
    final hash = text.hashCode;
    final colors = [
      ThemeConfig.primaryColor,
      ThemeConfig.successColor,
      ThemeConfig.warningColor,
      const Color(0xFF9C27B0), // Purple
      const Color(0xFF00BCD4), // Cyan
      const Color(0xFFFF5722), // Deep Orange
      const Color(0xFF3F51B5), // Indigo
      const Color(0xFF009688), // Teal
    ];
    return colors[hash.abs() % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? colorFromString(initials);
    final txtColor = textColor ?? Colors.white;

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: size / 2,
        backgroundColor: bgColor,
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: imageUrl!,
            width: size,
            height: size,
            fit: BoxFit.cover,
            placeholder: (context, url) => Center(
              child: SizedBox(
                width: size / 2,
                height: size / 2,
                child: const CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            errorWidget: (context, url, error) => _buildInitialsAvatar(
              bgColor,
              txtColor,
            ),
          ),
        ),
      );
    }

    return _buildInitialsAvatar(bgColor, txtColor);
  }

  Widget _buildInitialsAvatar(Color bgColor, Color txtColor) {
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: bgColor,
      child: Text(
        initials.toUpperCase(),
        style: TextStyle(
          color: txtColor,
          fontSize: size / 2.5,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}