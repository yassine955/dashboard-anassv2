import 'package:cloud_firestore/cloud_firestore.dart';
import 'user_model.dart';

enum ClientStatus { active, inactive, archived }

class ClientModel {
  final String id;
  final String userId;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String? companyName;
  final String? kvkNumber;
  final String? vatNumber;
  final Address address;
  final String? notes;
  final ClientStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;

  ClientModel({
    required this.id,
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.phone,
    this.companyName,
    this.kvkNumber,
    this.vatNumber,
    required this.address,
    this.notes,
    this.status = ClientStatus.active,
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullName => '$firstName $lastName';

  factory ClientModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ClientModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      firstName: data['firstName'] ?? '',
      lastName: data['lastName'] ?? '',
      email: data['email'] ?? '',
      phone: data['phone'],
      companyName: data['companyName'],
      kvkNumber: data['kvkNumber'],
      vatNumber: data['vatNumber'],
      address: Address.fromMap(data['address'] ?? {}),
      notes: data['notes'],
      status: ClientStatus.values.firstWhere(
        (e) => e.toString() == 'ClientStatus.${data['status']}',
        orElse: () => ClientStatus.active,
      ),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'phone': phone,
      'companyName': companyName,
      'kvkNumber': kvkNumber,
      'vatNumber': vatNumber,
      'address': address.toMap(),
      'notes': notes,
      'status': status.toString().split('.').last,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  ClientModel copyWith({
    String? id,
    String? userId,
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    String? companyName,
    String? kvkNumber,
    String? vatNumber,
    Address? address,
    String? notes,
    ClientStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ClientModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      companyName: companyName ?? this.companyName,
      kvkNumber: kvkNumber ?? this.kvkNumber,
      vatNumber: vatNumber ?? this.vatNumber,
      address: address ?? this.address,
      notes: notes ?? this.notes,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}