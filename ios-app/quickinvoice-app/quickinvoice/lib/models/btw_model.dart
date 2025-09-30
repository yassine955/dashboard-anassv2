import 'package:cloud_firestore/cloud_firestore.dart';

enum BTWStatus { draft, filed, paid }

enum ExpenseCategory {
  equipment,
  software,
  office,
  travel,
  training,
  other
}

class BTWExpense {
  final String description;
  final double amount;
  final double vatAmount;
  final double vatRate;
  final ExpenseCategory category;
  final DateTime date;
  final String? receiptUrl;

  BTWExpense({
    required this.description,
    required this.amount,
    required this.vatAmount,
    required this.vatRate,
    required this.category,
    required this.date,
    this.receiptUrl,
  });

  factory BTWExpense.fromMap(Map<String, dynamic> map) {
    return BTWExpense(
      description: map['description'] ?? '',
      amount: (map['amount'] ?? 0).toDouble(),
      vatAmount: (map['vatAmount'] ?? 0).toDouble(),
      vatRate: (map['vatRate'] ?? 0).toDouble(),
      category: ExpenseCategory.values.firstWhere(
        (e) => e.toString() == 'ExpenseCategory.${map['category']}',
        orElse: () => ExpenseCategory.other,
      ),
      date: (map['date'] as Timestamp).toDate(),
      receiptUrl: map['receiptUrl'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'description': description,
      'amount': amount,
      'vatAmount': vatAmount,
      'vatRate': vatRate,
      'category': category.toString().split('.').last,
      'date': Timestamp.fromDate(date),
      'receiptUrl': receiptUrl,
    };
  }
}

class BTWQuarter {
  final String id;
  final String userId;
  final int year;
  final int quarter;
  final double totalRevenue;
  final double totalVATCharged;
  final double totalVATOwed;
  final List<BTWExpense> expenses;
  final BTWStatus status;
  final DateTime dueDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  BTWQuarter({
    required this.id,
    required this.userId,
    required this.year,
    required this.quarter,
    required this.totalRevenue,
    required this.totalVATCharged,
    required this.totalVATOwed,
    required this.expenses,
    this.status = BTWStatus.draft,
    required this.dueDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory BTWQuarter.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return BTWQuarter(
      id: doc.id,
      userId: data['userId'] ?? '',
      year: data['year'] ?? 0,
      quarter: data['quarter'] ?? 1,
      totalRevenue: (data['totalRevenue'] ?? 0).toDouble(),
      totalVATCharged: (data['totalVATCharged'] ?? 0).toDouble(),
      totalVATOwed: (data['totalVATOwed'] ?? 0).toDouble(),
      expenses: (data['expenses'] as List<dynamic>?)
              ?.map((item) => BTWExpense.fromMap(item))
              .toList() ??
          [],
      status: BTWStatus.values.firstWhere(
        (e) => e.toString() == 'BTWStatus.${data['status']}',
        orElse: () => BTWStatus.draft,
      ),
      dueDate: (data['dueDate'] as Timestamp).toDate(),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'year': year,
      'quarter': quarter,
      'totalRevenue': totalRevenue,
      'totalVATCharged': totalVATCharged,
      'totalVATOwed': totalVATOwed,
      'expenses': expenses.map((e) => e.toMap()).toList(),
      'status': status.toString().split('.').last,
      'dueDate': Timestamp.fromDate(dueDate),
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }
}

class BusinessExpense {
  final String id;
  final String userId;
  final String description;
  final double amount;
  final double vatAmount;
  final double vatRate;
  final ExpenseCategory category;
  final DateTime date;
  final String? receiptUrl;
  final bool isRecurring;
  final String? recurringFrequency;
  final DateTime createdAt;
  final DateTime updatedAt;

  BusinessExpense({
    required this.id,
    required this.userId,
    required this.description,
    required this.amount,
    required this.vatAmount,
    required this.vatRate,
    required this.category,
    required this.date,
    this.receiptUrl,
    this.isRecurring = false,
    this.recurringFrequency,
    required this.createdAt,
    required this.updatedAt,
  });

  factory BusinessExpense.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return BusinessExpense(
      id: doc.id,
      userId: data['userId'] ?? '',
      description: data['description'] ?? '',
      amount: (data['amount'] ?? 0).toDouble(),
      vatAmount: (data['vatAmount'] ?? 0).toDouble(),
      vatRate: (data['vatRate'] ?? 0).toDouble(),
      category: ExpenseCategory.values.firstWhere(
        (e) => e.toString() == 'ExpenseCategory.${data['category']}',
        orElse: () => ExpenseCategory.other,
      ),
      date: (data['date'] as Timestamp).toDate(),
      receiptUrl: data['receiptUrl'],
      isRecurring: data['isRecurring'] ?? false,
      recurringFrequency: data['recurringFrequency'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'description': description,
      'amount': amount,
      'vatAmount': vatAmount,
      'vatRate': vatRate,
      'category': category.toString().split('.').last,
      'date': Timestamp.fromDate(date),
      'receiptUrl': receiptUrl,
      'isRecurring': isRecurring,
      'recurringFrequency': recurringFrequency,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }
}