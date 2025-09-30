import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

// Payment provider icon widgets for use throughout the app
class PaymentProviderIcon extends StatelessWidget {
  final String provider;
  final double size;

  const PaymentProviderIcon({
    super.key,
    required this.provider,
    this.size = 24,
  });

  @override
  Widget build(BuildContext context) {
    switch (provider.toLowerCase()) {
      case 'stripe':
        return StripeIcon(size: size);
      case 'tikkie':
        return TikkieIcon(size: size);
      case 'paypal':
        return PayPalIcon(size: size);
      case 'mollie':
        return MollieIcon(size: size);
      case 'ing':
        return INGIcon(size: size);
      default:
        return Icon(Icons.payment, size: size);
    }
  }
}

class StripeIcon extends StatelessWidget {
  final double size;

  const StripeIcon({super.key, this.size = 24});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF635BFF),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Center(
        child: Text(
          'S',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: size * 0.6,
          ),
        ),
      ),
    );
  }
}

class TikkieIcon extends StatelessWidget {
  final double size;

  const TikkieIcon({super.key, this.size = 24});

  @override
  Widget build(BuildContext context) {
    return SvgPicture.network(
      'https://images.ctfassets.net/fu85c1tkzk5c/1HEuiBkhUwvJpvLNZVuuOj/6e036455beb23198f4f1c404f2717dbb/favi.svg',
      width: size,
      height: size,
      placeholderBuilder: (context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: const Color(0xFFFF6600),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Center(
          child: Text(
            'T',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: size * 0.6,
            ),
          ),
        ),
      ),
    );
  }
}

class PayPalIcon extends StatelessWidget {
  final double size;

  const PayPalIcon({super.key, this.size = 24});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF0070BA),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Center(
        child: Text(
          'P',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: size * 0.6,
          ),
        ),
      ),
    );
  }
}

class MollieIcon extends StatelessWidget {
  final double size;

  const MollieIcon({super.key, this.size = 24});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF000000),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Center(
        child: Text(
          'M',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: size * 0.6,
          ),
        ),
      ),
    );
  }
}

class INGIcon extends StatelessWidget {
  final double size;

  const INGIcon({super.key, this.size = 24});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFFF6200),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Center(
        child: Text(
          'I',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: size * 0.6,
          ),
        ),
      ),
    );
  }
}

// Invoice status icon helper
class InvoiceStatusIcon extends StatelessWidget {
  final String status;
  final double size;

  const InvoiceStatusIcon({
    super.key,
    required this.status,
    this.size = 18,
  });

  @override
  Widget build(BuildContext context) {
    IconData iconData;
    Color color;

    switch (status.toLowerCase()) {
      case 'paid':
        iconData = Icons.check_circle;
        color = Colors.green;
        break;
      case 'sent':
        iconData = Icons.mail_outline;
        color = Colors.blue;
        break;
      case 'overdue':
        iconData = Icons.warning_amber_rounded;
        color = Colors.red;
        break;
      case 'pending':
        iconData = Icons.access_time;
        color = Colors.orange;
        break;
      case 'draft':
        iconData = Icons.edit_note;
        color = Colors.grey;
        break;
      case 'cancelled':
        iconData = Icons.cancel;
        color = Colors.grey;
        break;
      default:
        iconData = Icons.description;
        color = Colors.grey;
    }

    return Icon(iconData, size: size, color: color);
  }
}