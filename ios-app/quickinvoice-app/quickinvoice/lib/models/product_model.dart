import 'package:cloud_firestore/cloud_firestore.dart';

enum ProductStatus { active, inactive, discontinued }

class ProductModel {
  final String id;
  final String userId;
  final String name;
  final String description;
  final double basePrice;
  final String category;
  final String? deliveryTime;
  final String? fileFormats;
  final int revisionRounds;
  final double vatRate;
  final ProductStatus status;
  final int usageCount;
  final String? imageUrl;
  final double discount; // Percentage 0-100
  final DateTime createdAt;
  final DateTime updatedAt;

  ProductModel({
    required this.id,
    required this.userId,
    required this.name,
    required this.description,
    required this.basePrice,
    required this.category,
    this.deliveryTime,
    this.fileFormats,
    this.revisionRounds = 2,
    this.vatRate = 0.21,
    this.status = ProductStatus.active,
    this.usageCount = 0,
    this.imageUrl,
    this.discount = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProductModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ProductModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      basePrice: (data['basePrice'] ?? 0).toDouble(),
      category: data['category'] ?? '',
      deliveryTime: data['deliveryTime'],
      fileFormats: data['fileFormats'],
      revisionRounds: data['revisionRounds'] ?? 2,
      vatRate: (data['vatRate'] ?? 0.21).toDouble(),
      status: ProductStatus.values.firstWhere(
        (e) => e.toString() == 'ProductStatus.${data['status']}',
        orElse: () => ProductStatus.active,
      ),
      usageCount: data['usageCount'] ?? 0,
      imageUrl: data['imageUrl'],
      discount: (data['discount'] ?? 0).toDouble(),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'name': name,
      'description': description,
      'basePrice': basePrice,
      'category': category,
      'deliveryTime': deliveryTime,
      'fileFormats': fileFormats,
      'revisionRounds': revisionRounds,
      'vatRate': vatRate,
      'status': status.toString().split('.').last,
      'usageCount': usageCount,
      'imageUrl': imageUrl,
      'discount': discount,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  ProductModel copyWith({
    String? id,
    String? userId,
    String? name,
    String? description,
    double? basePrice,
    String? category,
    String? deliveryTime,
    String? fileFormats,
    int? revisionRounds,
    double? vatRate,
    ProductStatus? status,
    int? usageCount,
    String? imageUrl,
    double? discount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ProductModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      description: description ?? this.description,
      basePrice: basePrice ?? this.basePrice,
      category: category ?? this.category,
      deliveryTime: deliveryTime ?? this.deliveryTime,
      fileFormats: fileFormats ?? this.fileFormats,
      revisionRounds: revisionRounds ?? this.revisionRounds,
      vatRate: vatRate ?? this.vatRate,
      status: status ?? this.status,
      usageCount: usageCount ?? this.usageCount,
      imageUrl: imageUrl ?? this.imageUrl,
      discount: discount ?? this.discount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}