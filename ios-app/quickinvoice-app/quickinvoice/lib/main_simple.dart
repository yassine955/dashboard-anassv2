import 'package:flutter/material.dart';

void main() {
  runApp(const SimpleTestApp());
}

class SimpleTestApp extends StatelessWidget {
  const SimpleTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Test',
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Test App'),
        ),
        body: const Center(
          child: Text('If you see this, the app works!'),
        ),
      ),
    );
  }
}