import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class WaslaMark extends StatelessWidget {
  const WaslaMark({super.key, this.size = 72, this.onDark = false});
  final double size;
  final bool onDark;
  @override
  Widget build(BuildContext context) => Semantics(
      label: 'WASLA | وصلة',
      image: true,
      child: CustomPaint(
          size: Size.square(size), painter: _WaslaMarkPainter(onDark)));
}

class _WaslaMarkPainter extends CustomPainter {
  const _WaslaMarkPainter(this.onDark);
  final bool onDark;
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 48;
    canvas.drawRRect(
        RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(12 * s)),
        Paint()..color = onDark ? Colors.white : AppColors.primary);
    final p = Paint()
      ..color = onDark ? AppColors.primary : Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2 * s
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final path = Path()
      ..moveTo(11 * s, 15 * s)
      ..lineTo(11 * s, 25 * s)
      ..cubicTo(11 * s, 32 * s, 16 * s, 37 * s, 23 * s, 37 * s)
      ..cubicTo(30 * s, 37 * s, 35 * s, 32 * s, 35 * s, 25 * s)
      ..lineTo(35 * s, 15 * s)
      ..moveTo(11 * s, 22 * s)
      ..lineTo(35 * s, 22 * s)
      ..moveTo(17 * s, 15 * s)
      ..lineTo(17 * s, 25 * s)
      ..cubicTo(17 * s, 29 * s, 19 * s, 31 * s, 23 * s, 31 * s)
      ..cubicTo(27 * s, 31 * s, 29 * s, 29 * s, 29 * s, 25 * s)
      ..lineTo(29 * s, 15 * s);
    canvas.drawPath(path, p);
  }

  @override
  bool shouldRepaint(covariant _WaslaMarkPainter oldDelegate) =>
      oldDelegate.onDark != onDark;
}
