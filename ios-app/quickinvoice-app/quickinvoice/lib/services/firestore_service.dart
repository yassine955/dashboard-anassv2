import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/client_model.dart';
import '../models/product_model.dart';
import '../models/invoice_model.dart';
import '../models/btw_model.dart';

class FirestoreService {
  // Use lazy getter to avoid accessing Firebase before initialization
  FirebaseFirestore get _firestore => FirebaseFirestore.instance;

  // CLIENTS CRUD OPERATIONS

  Future<String> createClient(ClientModel client, String userId) async {
    try {
      final docRef = await _firestore.collection('clients').add(
            client.copyWith(userId: userId, id: '').toMap(),
          );
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create client: $e');
    }
  }

  Stream<List<ClientModel>> streamClients(String userId) {
    return _firestore
        .collection('clients')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => ClientModel.fromFirestore(doc)).toList());
  }

  Future<ClientModel?> getClient(String clientId) async {
    try {
      final doc = await _firestore.collection('clients').doc(clientId).get();
      if (doc.exists) {
        return ClientModel.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      throw Exception('Failed to get client: $e');
    }
  }

  Future<void> updateClient(String clientId, Map<String, dynamic> data) async {
    try {
      data['updatedAt'] = Timestamp.now();
      await _firestore.collection('clients').doc(clientId).update(data);
    } catch (e) {
      throw Exception('Failed to update client: $e');
    }
  }

  Future<void> deleteClient(String clientId) async {
    try {
      await _firestore.collection('clients').doc(clientId).delete();
    } catch (e) {
      throw Exception('Failed to delete client: $e');
    }
  }

  // PRODUCTS CRUD OPERATIONS

  Future<String> createProduct(ProductModel product, String userId) async {
    try {
      final docRef = await _firestore.collection('products').add(
            product.copyWith(userId: userId, id: '').toMap(),
          );
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create product: $e');
    }
  }

  Stream<List<ProductModel>> streamProducts(String userId) {
    return _firestore
        .collection('products')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ProductModel.fromFirestore(doc))
            .toList());
  }

  Future<ProductModel?> getProduct(String productId) async {
    try {
      final doc = await _firestore.collection('products').doc(productId).get();
      if (doc.exists) {
        return ProductModel.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      throw Exception('Failed to get product: $e');
    }
  }

  Future<void> updateProduct(String productId, Map<String, dynamic> data) async {
    try {
      data['updatedAt'] = Timestamp.now();
      await _firestore.collection('products').doc(productId).update(data);
    } catch (e) {
      throw Exception('Failed to update product: $e');
    }
  }

  Future<void> deleteProduct(String productId) async {
    try {
      await _firestore.collection('products').doc(productId).delete();
    } catch (e) {
      throw Exception('Failed to delete product: $e');
    }
  }

  Future<void> incrementProductUsage(String productId) async {
    try {
      await _firestore.collection('products').doc(productId).update({
        'usageCount': FieldValue.increment(1),
        'updatedAt': Timestamp.now(),
      });
    } catch (e) {
      throw Exception('Failed to increment product usage: $e');
    }
  }

  // INVOICES CRUD OPERATIONS

  Future<String> createInvoice(InvoiceModel invoice, String userId) async {
    try {
      final docRef = await _firestore.collection('invoices').add(
            invoice.copyWith(userId: userId, id: '').toMap(),
          );
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create invoice: $e');
    }
  }

  Stream<List<InvoiceModel>> streamInvoices(String userId) {
    return _firestore
        .collection('invoices')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => InvoiceModel.fromFirestore(doc))
            .toList());
  }

  Future<InvoiceModel?> getInvoice(String invoiceId) async {
    try {
      final doc = await _firestore.collection('invoices').doc(invoiceId).get();
      if (doc.exists) {
        return InvoiceModel.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      throw Exception('Failed to get invoice: $e');
    }
  }

  Future<void> updateInvoice(String invoiceId, Map<String, dynamic> data) async {
    try {
      data['updatedAt'] = Timestamp.now();
      await _firestore.collection('invoices').doc(invoiceId).update(data);
    } catch (e) {
      throw Exception('Failed to update invoice: $e');
    }
  }

  Future<void> deleteInvoice(String invoiceId) async {
    try {
      await _firestore.collection('invoices').doc(invoiceId).delete();
    } catch (e) {
      throw Exception('Failed to delete invoice: $e');
    }
  }

  Future<String> generateInvoiceNumber(String userId) async {
    try {
      final querySnapshot = await _firestore
          .collection('invoices')
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .limit(1)
          .get();

      if (querySnapshot.docs.isEmpty) {
        return 'INV-${DateTime.now().year}-0001';
      }

      final lastInvoice = InvoiceModel.fromFirestore(querySnapshot.docs.first);
      final lastNumber = int.tryParse(
              lastInvoice.invoiceNumber.split('-').last) ??
          0;
      final newNumber = lastNumber + 1;

      return 'INV-${DateTime.now().year}-${newNumber.toString().padLeft(4, '0')}';
    } catch (e) {
      return 'INV-${DateTime.now().year}-0001';
    }
  }

  Future<String> duplicateInvoice(InvoiceModel originalInvoice, String userId) async {
    try {
      // Verify ownership
      if (originalInvoice.userId != userId) {
        throw Exception('Access denied: Invoice belongs to another user');
      }

      // Generate new invoice number
      final newInvoiceNumber = await generateInvoiceNumber(userId);

      // Create new invoice items (InvoiceItem doesn't have id parameter)
      final newItems = originalInvoice.items.map((item) {
        return InvoiceItem(
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
        );
      }).toList();

      // Create duplicated invoice
      final duplicatedInvoice = InvoiceModel(
        id: '', // Will be set by Firestore
        userId: userId,
        invoiceNumber: newInvoiceNumber,
        clientId: originalInvoice.clientId,
        invoiceDate: originalInvoice.invoiceDate,
        dueDate: originalInvoice.dueDate,
        subtotal: originalInvoice.subtotal,
        vatAmount: originalInvoice.vatAmount,
        totalAmount: originalInvoice.totalAmount,
        status: InvoiceStatus.draft,
        notes: originalInvoice.notes,
        items: newItems,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        // Omit payment-related fields
        paymentTerms: originalInvoice.paymentTerms,
      );

      // Save to Firestore
      final docRef = await _firestore.collection('invoices').add(
            duplicatedInvoice.toMap(),
          );

      return docRef.id;
    } catch (e) {
      throw Exception('Failed to duplicate invoice: $e');
    }
  }

  // BTW OPERATIONS

  Future<String> createBTWQuarter(BTWQuarter quarter, String userId) async {
    try {
      final docRef = await _firestore.collection('btw_quarters').add(
            {...quarter.toMap(), 'userId': userId},
          );
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create BTW quarter: $e');
    }
  }

  Stream<List<BTWQuarter>> streamBTWQuarters(String userId) {
    return _firestore
        .collection('btw_quarters')
        .where('userId', isEqualTo: userId)
        .orderBy('year', descending: true)
        .orderBy('quarter', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => BTWQuarter.fromFirestore(doc)).toList());
  }

  Future<BTWQuarter?> getBTWQuarter(String quarterId) async {
    try {
      final doc =
          await _firestore.collection('btw_quarters').doc(quarterId).get();
      if (doc.exists) {
        return BTWQuarter.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      throw Exception('Failed to get BTW quarter: $e');
    }
  }

  Future<void> updateBTWQuarter(
      String quarterId, Map<String, dynamic> data) async {
    try {
      data['updatedAt'] = Timestamp.now();
      await _firestore.collection('btw_quarters').doc(quarterId).update(data);
    } catch (e) {
      throw Exception('Failed to update BTW quarter: $e');
    }
  }

  // BUSINESS EXPENSES OPERATIONS

  Future<String> createBusinessExpense(
      BusinessExpense expense, String userId) async {
    try {
      final docRef = await _firestore.collection('business_expenses').add(
            {...expense.toMap(), 'userId': userId},
          );
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create business expense: $e');
    }
  }

  Stream<List<BusinessExpense>> streamBusinessExpenses(String userId) {
    return _firestore
        .collection('business_expenses')
        .where('userId', isEqualTo: userId)
        .orderBy('date', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => BusinessExpense.fromFirestore(doc))
            .toList());
  }

  Future<void> updateBusinessExpense(
      String expenseId, Map<String, dynamic> data) async {
    try {
      data['updatedAt'] = Timestamp.now();
      await _firestore
          .collection('business_expenses')
          .doc(expenseId)
          .update(data);
    } catch (e) {
      throw Exception('Failed to update business expense: $e');
    }
  }

  Future<void> deleteBusinessExpense(String expenseId) async {
    try {
      await _firestore.collection('business_expenses').doc(expenseId).delete();
    } catch (e) {
      throw Exception('Failed to delete business expense: $e');
    }
  }

  // ANALYTICS & REPORTS

  Future<Map<String, dynamic>> getMonthlyAnalytics(
      String userId, int year, int month) async {
    try {
      final startDate = DateTime(year, month, 1);
      final endDate = DateTime(year, month + 1, 0);

      final invoicesSnapshot = await _firestore
          .collection('invoices')
          .where('userId', isEqualTo: userId)
          .where('invoiceDate',
              isGreaterThanOrEqualTo: Timestamp.fromDate(startDate))
          .where('invoiceDate', isLessThanOrEqualTo: Timestamp.fromDate(endDate))
          .get();

      double totalRevenue = 0;
      double totalPaid = 0;
      double totalPending = 0;
      int totalInvoices = invoicesSnapshot.docs.length;
      int paidInvoices = 0;

      for (final doc in invoicesSnapshot.docs) {
        final invoice = InvoiceModel.fromFirestore(doc);
        totalRevenue += invoice.totalAmount;

        if (invoice.status == InvoiceStatus.paid) {
          totalPaid += invoice.totalAmount;
          paidInvoices++;
        } else if (invoice.status == InvoiceStatus.pending ||
            invoice.status == InvoiceStatus.sent) {
          totalPending += invoice.totalAmount;
        }
      }

      return {
        'totalRevenue': totalRevenue,
        'totalPaid': totalPaid,
        'totalPending': totalPending,
        'totalInvoices': totalInvoices,
        'paidInvoices': paidInvoices,
      };
    } catch (e) {
      throw Exception('Failed to get monthly analytics: $e');
    }
  }
}