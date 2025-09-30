import 'package:cloud_firestore/cloud_firestore.dart';

class Address {
  final String street;
  final String city;
  final String postalCode;
  final String country;

  Address({
    required this.street,
    required this.city,
    required this.postalCode,
    required this.country,
  });

  factory Address.fromMap(Map<String, dynamic> map) {
    return Address(
      street: map['street'] ?? '',
      city: map['city'] ?? '',
      postalCode: map['postalCode'] ?? '',
      country: map['country'] ?? 'Nederland',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'street': street,
      'city': city,
      'postalCode': postalCode,
      'country': country,
    };
  }
}

class BusinessInfo {
  final String companyName;
  final String kvkNumber;
  final String? vatNumber;
  final Address address;
  final String? phone;
  final String? website;

  BusinessInfo({
    required this.companyName,
    required this.kvkNumber,
    this.vatNumber,
    required this.address,
    this.phone,
    this.website,
  });

  factory BusinessInfo.fromMap(Map<String, dynamic> map) {
    return BusinessInfo(
      companyName: map['companyName'] ?? '',
      kvkNumber: map['kvkNumber'] ?? '',
      vatNumber: map['vatNumber'],
      address: Address.fromMap(map['address'] ?? {}),
      phone: map['phone'],
      website: map['website'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'companyName': companyName,
      'kvkNumber': kvkNumber,
      'vatNumber': vatNumber,
      'address': address.toMap(),
      'phone': phone,
      'website': website,
    };
  }
}

class UserPreferences {
  final String currency;
  final String language;
  final String invoiceTemplate;
  final int defaultPaymentTerms;

  UserPreferences({
    this.currency = 'EUR',
    this.language = 'nl',
    this.invoiceTemplate = 'default',
    this.defaultPaymentTerms = 30,
  });

  factory UserPreferences.fromMap(Map<String, dynamic> map) {
    return UserPreferences(
      currency: map['currency'] ?? 'EUR',
      language: map['language'] ?? 'nl',
      invoiceTemplate: map['invoiceTemplate'] ?? 'default',
      defaultPaymentTerms: map['defaultPaymentTerms'] ?? 30,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'currency': currency,
      'language': language,
      'invoiceTemplate': invoiceTemplate,
      'defaultPaymentTerms': defaultPaymentTerms,
    };
  }
}

class EmailTemplate {
  final String subject;
  final String content;
  final bool isCustom;

  EmailTemplate({
    required this.subject,
    required this.content,
    this.isCustom = false,
  });

  factory EmailTemplate.fromMap(Map<String, dynamic> map) {
    return EmailTemplate(
      subject: map['subject'] ?? '',
      content: map['content'] ?? '',
      isCustom: map['isCustom'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'subject': subject,
      'content': content,
      'isCustom': isCustom,
    };
  }
}

class EmailTemplates {
  final EmailTemplate invoiceEmail;
  final EmailTemplate paymentReminder;

  EmailTemplates({
    required this.invoiceEmail,
    required this.paymentReminder,
  });

  factory EmailTemplates.fromMap(Map<String, dynamic>? map) {
    if (map == null) {
      return EmailTemplates(
        invoiceEmail: EmailTemplate(
          subject: 'Nieuwe factuur {{invoice_number}}',
          content: 'Default invoice email content',
        ),
        paymentReminder: EmailTemplate(
          subject: 'Betalingsherinnering factuur {{invoice_number}}',
          content: 'Default reminder email content',
        ),
      );
    }
    return EmailTemplates(
      invoiceEmail: EmailTemplate.fromMap(map['invoiceEmail'] ?? {}),
      paymentReminder: EmailTemplate.fromMap(map['paymentReminder'] ?? {}),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'invoiceEmail': invoiceEmail.toMap(),
      'paymentReminder': paymentReminder.toMap(),
    };
  }
}

// Specific payment provider configs
class StripeConfig {
  final String? accountId;
  final String? accessToken;
  final String? refreshToken;
  final String? publishableKey;
  final bool isActive;

  StripeConfig({
    this.accountId,
    this.accessToken,
    this.refreshToken,
    this.publishableKey,
    this.isActive = false,
  });

  factory StripeConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return StripeConfig();
    return StripeConfig(
      accountId: map['accountId'],
      accessToken: map['accessToken'],
      refreshToken: map['refreshToken'],
      publishableKey: map['publishableKey'],
      isActive: map['isActive'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'accountId': accountId,
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'publishableKey': publishableKey,
      'isActive': isActive,
    };
  }
}

class TikkieConfig {
  final String apiKey;
  final String? appToken;
  final bool sandboxMode;
  final bool isActive;

  TikkieConfig({
    this.apiKey = '',
    this.appToken,
    this.sandboxMode = true,
    this.isActive = false,
  });

  factory TikkieConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return TikkieConfig();
    return TikkieConfig(
      apiKey: map['apiKey'] ?? '',
      appToken: map['appToken'],
      sandboxMode: map['sandboxMode'] ?? true,
      isActive: map['isActive'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'apiKey': apiKey,
      'appToken': appToken,
      'sandboxMode': sandboxMode,
      'isActive': isActive,
    };
  }
}

class PayPalConfig {
  final String clientId;
  final String clientSecret;
  final String? webhookId;
  final bool isActive;

  PayPalConfig({
    this.clientId = '',
    this.clientSecret = '',
    this.webhookId,
    this.isActive = false,
  });

  factory PayPalConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return PayPalConfig();
    return PayPalConfig(
      clientId: map['clientId'] ?? '',
      clientSecret: map['clientSecret'] ?? '',
      webhookId: map['webhookId'],
      isActive: map['isActive'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'clientId': clientId,
      'clientSecret': clientSecret,
      'webhookId': webhookId,
      'isActive': isActive,
    };
  }
}

class MollieConfig {
  final String apiKey;
  final String? profileId;
  final bool isActive;

  MollieConfig({
    this.apiKey = '',
    this.profileId,
    this.isActive = false,
  });

  factory MollieConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return MollieConfig();
    return MollieConfig(
      apiKey: map['apiKey'] ?? '',
      profileId: map['profileId'],
      isActive: map['isActive'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'apiKey': apiKey,
      'profileId': profileId,
      'isActive': isActive,
    };
  }
}

class INGConfig {
  final String clientId;
  final String clientSecret;
  final String creditorIban;
  final bool isActive;

  INGConfig({
    this.clientId = '',
    this.clientSecret = '',
    this.creditorIban = '',
    this.isActive = false,
  });

  factory INGConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return INGConfig();
    return INGConfig(
      clientId: map['clientId'] ?? '',
      clientSecret: map['clientSecret'] ?? '',
      creditorIban: map['creditorIban'] ?? '',
      isActive: map['isActive'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'clientId': clientId,
      'clientSecret': clientSecret,
      'creditorIban': creditorIban,
      'isActive': isActive,
    };
  }
}

class PaymentSettings {
  final StripeConfig? stripe;
  final TikkieConfig? tikkie;
  final PayPalConfig? paypal;
  final MollieConfig? mollie;
  final INGConfig? ing;

  PaymentSettings({
    this.stripe,
    this.tikkie,
    this.paypal,
    this.mollie,
    this.ing,
  });

  factory PaymentSettings.fromMap(Map<String, dynamic>? map) {
    if (map == null) return PaymentSettings();
    return PaymentSettings(
      stripe: StripeConfig.fromMap(map['stripe']),
      tikkie: TikkieConfig.fromMap(map['tikkie']),
      paypal: PayPalConfig.fromMap(map['paypal']),
      mollie: MollieConfig.fromMap(map['mollie']),
      ing: INGConfig.fromMap(map['ing']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'stripe': stripe?.toMap(),
      'tikkie': tikkie?.toMap(),
      'paypal': paypal?.toMap(),
      'mollie': mollie?.toMap(),
      'ing': ing?.toMap(),
    };
  }
}

class UserModel {
  final String uid;
  final String email;
  final String displayName;
  final String? photoURL;
  final BusinessInfo businessInfo;
  final UserPreferences preferences;
  final EmailTemplates? emailTemplates;
  final PaymentSettings? paymentSettings;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserModel({
    required this.uid,
    required this.email,
    required this.displayName,
    this.photoURL,
    required this.businessInfo,
    required this.preferences,
    this.emailTemplates,
    this.paymentSettings,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return UserModel(
      uid: doc.id,
      email: data['email'] ?? '',
      displayName: data['displayName'] ?? '',
      photoURL: data['photoURL'],
      businessInfo: BusinessInfo.fromMap(data['businessInfo'] ?? {}),
      preferences: UserPreferences.fromMap(data['preferences'] ?? {}),
      emailTemplates: EmailTemplates.fromMap(data['emailTemplates']),
      paymentSettings: PaymentSettings.fromMap(data['paymentSettings']),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'displayName': displayName,
      'photoURL': photoURL,
      'businessInfo': businessInfo.toMap(),
      'preferences': preferences.toMap(),
      'emailTemplates': emailTemplates?.toMap(),
      'paymentSettings': paymentSettings?.toMap(),
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }
}