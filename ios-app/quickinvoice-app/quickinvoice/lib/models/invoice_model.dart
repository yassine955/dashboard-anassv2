import 'package:cloud_firestore/cloud_firestore.dart';

enum InvoiceStatus { draft, sent, pending, paid, overdue, cancelled }

enum PaymentProvider { stripe, tikkie, mollie, paypal, ing }

class InvoiceItem {
  final String productId;
  final String description;
  final int quantity;
  final double unitPrice;
  final double vatRate;

  InvoiceItem({
    required this.productId,
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.vatRate,
  });

  double get subtotal => quantity * unitPrice;
  double get vatAmount => subtotal * vatRate;
  double get total => subtotal + vatAmount;

  factory InvoiceItem.fromMap(Map<String, dynamic> map) {
    return InvoiceItem(
      productId: map['productId'] ?? '',
      description: map['description'] ?? '',
      quantity: map['quantity'] ?? 1,
      unitPrice: (map['unitPrice'] ?? 0).toDouble(),
      vatRate: (map['vatRate'] ?? 0.21).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'description': description,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'vatRate': vatRate,
    };
  }
}

class InvoiceModel {
  final String id;
  final String userId;
  final String invoiceNumber;
  final String clientId;
  final DateTime invoiceDate;
  final DateTime dueDate;
  final double subtotal;
  final double vatAmount;
  final double totalAmount;
  final InvoiceStatus status;
  final String? notes;
  final String? paymentTerms;
  final String? paymentLink;
  final String? paymentId;
  final PaymentProvider? paymentProvider;
  final DateTime? paidAt;
  final double? paidAmount;
  final List<InvoiceItem> items;
  final DateTime createdAt;
  final DateTime updatedAt;

  InvoiceModel({
    required this.id,
    required this.userId,
    required this.invoiceNumber,
    required this.clientId,
    required this.invoiceDate,
    required this.dueDate,
    required this.subtotal,
    required this.vatAmount,
    required this.totalAmount,
    this.status = InvoiceStatus.draft,
    this.notes,
    this.paymentTerms,
    this.paymentLink,
    this.paymentId,
    this.paymentProvider,
    this.paidAt,
    this.paidAmount,
    required this.items,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isOverdue =>
      status != InvoiceStatus.paid &&
      status != InvoiceStatus.cancelled &&
      DateTime.now().isAfter(dueDate);

  factory InvoiceModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return InvoiceModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      invoiceNumber: data['invoiceNumber'] ?? '',
      clientId: data['clientId'] ?? '',
      invoiceDate: (data['invoiceDate'] as Timestamp).toDate(),
      dueDate: (data['dueDate'] as Timestamp).toDate(),
      subtotal: (data['subtotal'] ?? 0).toDouble(),
      vatAmount: (data['vatAmount'] ?? 0).toDouble(),
      totalAmount: (data['totalAmount'] ?? 0).toDouble(),
      status: InvoiceStatus.values.firstWhere(
        (e) => e.toString() == 'InvoiceStatus.${data['status']}',
        orElse: () => InvoiceStatus.draft,
      ),
      notes: data['notes'],
      paymentTerms: data['paymentTerms'],
      paymentLink: data['paymentLink'],
      paymentId: data['paymentId'],
      paymentProvider: data['paymentProvider'] != null
          ? PaymentProvider.values.firstWhere(
              (e) =>
                  e.toString() == 'PaymentProvider.${data['paymentProvider']}',
              orElse: () => PaymentProvider.stripe,
            )
          : null,
      paidAt:
          data['paidAt'] != null ? (data['paidAt'] as Timestamp).toDate() : null,
      paidAmount:
          data['paidAmount'] != null ? (data['paidAmount']).toDouble() : null,
      items: (data['items'] as List<dynamic>?)
              ?.map((item) => InvoiceItem.fromMap(item))
              .toList() ??
          [],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'invoiceNumber': invoiceNumber,
      'clientId': clientId,
      'invoiceDate': Timestamp.fromDate(invoiceDate),
      'dueDate': Timestamp.fromDate(dueDate),
      'subtotal': subtotal,
      'vatAmount': vatAmount,
      'totalAmount': totalAmount,
      'status': status.toString().split('.').last,
      'notes': notes,
      'paymentTerms': paymentTerms,
      'paymentLink': paymentLink,
      'paymentId': paymentId,
      'paymentProvider': paymentProvider?.toString().split('.').last,
      'paidAt': paidAt != null ? Timestamp.fromDate(paidAt!) : null,
      'paidAmount': paidAmount,
      'items': items.map((item) => item.toMap()).toList(),
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  InvoiceModel copyWith({
    String? id,
    String? userId,
    String? invoiceNumber,
    String? clientId,
    DateTime? invoiceDate,
    DateTime? dueDate,
    double? subtotal,
    double? vatAmount,
    double? totalAmount,
    InvoiceStatus? status,
    String? notes,
    String? paymentTerms,
    String? paymentLink,
    String? paymentId,
    PaymentProvider? paymentProvider,
    DateTime? paidAt,
    double? paidAmount,
    List<InvoiceItem>? items,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return InvoiceModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      clientId: clientId ?? this.clientId,
      invoiceDate: invoiceDate ?? this.invoiceDate,
      dueDate: dueDate ?? this.dueDate,
      subtotal: subtotal ?? this.subtotal,
      vatAmount: vatAmount ?? this.vatAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      paymentTerms: paymentTerms ?? this.paymentTerms,
      paymentLink: paymentLink ?? this.paymentLink,
      paymentId: paymentId ?? this.paymentId,
      paymentProvider: paymentProvider ?? this.paymentProvider,
      paidAt: paidAt ?? this.paidAt,
      paidAmount: paidAmount ?? this.paidAmount,
      items: items ?? this.items,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}